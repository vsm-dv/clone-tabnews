import database from "infra/database";
import email from "infra/email";
import { NotFoundError } from "infra/errors";
import webserver from "infra/webserver";
import user from "./user";

const EXPIRATION_IN_MILLISECONDS = 60 * 15 * 1000; // 15 minutes

async function findOneValidById(tokenId) {
  const newToken = await runSelectQuery(tokenId);
  return newToken;

  async function runSelectQuery(tokenId) {
    const { rows, rowCount } = await database.query({
      text: `
        SELECT
          *
        FROM
          user_activation_tokens
        WHERE
          id = $1
        AND expires_at > NOW()
        AND used_at IS NULL
        ORDER BY
          created_at DESC
        LIMIT
          1
        ;
      `,
      values: [tokenId],
    });

    if (!rowCount) {
      throw new NotFoundError({
        message: "The activation token was not found or is not valid.",
        action:
          "Try to create your account again to receive a new activation email.",
      });
    }

    return rows[0];
  }
}

async function markTokenAsUsed(tokenId) {
  const usedActivationToken = await runUpdateQuery(tokenId);
  return usedActivationToken;

  async function runUpdateQuery(tokenId) {
    const { rows, rowCount } = await database.query({
      text: `
        UPDATE
          user_activation_tokens
        SET
          used_at = TIMEZONE('UTC', NOW()),
          updated_at = TIMEZONE('UTC', NOW())
        WHERE
          id = $1
        AND expires_at > NOW()
        AND used_at IS NULL
        RETURNING
          *
        ;
      `,
      values: [tokenId],
    });

    if (!rowCount) {
      throw new NotFoundError({
        message: "The activation token was not found or is not valid.",
        action:
          "Try to create your account again to receive a new activation email.",
      });
    }

    return rows[0];
  }
}

async function getUsedTokenAndFeatures(tokenId) {
  const existingToken = await runSelectQuery(tokenId);
  return existingToken;

  async function runSelectQuery(tokenId) {
    const { rows } = await database.query({
      text: `
        SELECT
          user_activation_tokens.*, features
        FROM
          user_activation_tokens
        INNER JOIN 
          users 
        ON 
          users.id = user_activation_tokens.user_id
        WHERE
          user_activation_tokens.id = $1
        AND used_at IS NOT NULL
        ORDER BY
          created_at DESC
        LIMIT
          1
        ;
      `,
      values: [tokenId],
    });

    return rows[0];
  }
}

async function activateUserByUserId(userId) {
  const activatedUser = await user.setFeatures(userId, [
    "create:session",
    "read:session",
    "update:user",
  ]);
  return activatedUser;
}

async function create(userId) {
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  const newToken = await runInsertQuery(userId, expiresAt);
  return newToken;

  async function runInsertQuery(userId, expiresAt) {
    const { rows } = await database.query({
      text: `
        INSERT INTO 
          user_activation_tokens (user_id, expires_at)
        VALUES
          ($1, $2)
        RETURNING
          *
      ;
      `,
      values: [userId, expiresAt],
    });

    return rows[0];
  }
}

async function sendEmailToUser(user, activationToken) {
  await email.send({
    from: "<contact@email.com>",
    to: user.email,
    subject: "Activate your account at FinTab",
    text: `${user.username}, click the link below to activate your account at Fintab:
${webserver.origin}/register/activate/${activationToken.id}

Regards,
Team
`,
  });
}

const activation = {
  sendEmailToUser,
  create,
  findOneValidById,
  markTokenAsUsed,
  activateUserByUserId,
  getUsedTokenAndFeatures,
};

export default activation;
