import database from "infra/database";
import password from "models/password";
import { NotFoundError, ValidationError } from "infra/errors";

async function validateUniqueEmailAndUsername(email, username) {
  const { rows, rowCount } = await database.query({
    text: `
      SELECT
        email, username
      FROM
        users
      WHERE
        ($1::TEXT IS NOT NULL AND LOWER(email) = LOWER($2::TEXT))
      OR 
        ($3::TEXT IS NOT NULL AND LOWER(username) = LOWER($4::TEXT));
      `,
    values: [email, email, username, username],
  });

  if (rowCount) {
    const duplicatedInfo =
      email && rows.find((item) => item.email === email.toLowerCase())
        ? "email"
        : "nome de usuário";

    throw new ValidationError({
      message: `O ${duplicatedInfo} informado já está sendo utilizado.`,
      action: `Utilize outro ${duplicatedInfo} para realizar esta operação.`,
    });
  }
}

async function hashPasswordInObject(userInputValues) {
  const hashedPassword = await password.hash(userInputValues.password);
  userInputValues.password = hashedPassword;
}

async function create(userInputValues) {
  await validateUniqueEmailAndUsername(
    userInputValues.email,
    userInputValues.username,
  );

  await hashPasswordInObject(userInputValues);

  const newUser = await runInsertQuery({ ...userInputValues });
  return newUser;

  async function runInsertQuery(userInputValues) {
    const { username, email, password } = userInputValues;

    const { rows } = await database.query({
      text: `
            INSERT INTO
              users (username, email, password)
            VALUES
              ($1, $2, $3)
            RETURNING
              *
            ;`,
      values: [username, email, password],
    });
    return rows[0];
  }
}

async function findOneByUsername(username) {
  const userFound = await runSelectQuery(username);

  return userFound;

  async function runSelectQuery(username) {
    const { rows, rowCount } = await database.query({
      text: `
            SELECT 
              *
            FROM
              users 
            WHERE
              LOWER(username) = LOWER($1)
            LIMIT
              1
            ;`,
      values: [username],
    });

    if (!rowCount) {
      throw new NotFoundError({
        message: "The informed username was not found.",
        action: "Check if the username is correct.",
      });
    }

    return rows[0];
  }
}

async function update(username, userInputValues) {
  const currentUser = await findOneByUsername(username);

  if (userInputValues.username) {
    await validateUniqueEmailAndUsername(null, userInputValues.username);
  }

  if (userInputValues.email) {
    await validateUniqueEmailAndUsername(userInputValues.email, null);
  }

  if (userInputValues.password) {
    await hashPasswordInObject(userInputValues);
  }

  const userWithNewValues = { ...currentUser, ...userInputValues };
  const updatedUser = await runUpdateQuery(userWithNewValues);

  async function runUpdateQuery(userWithNewValues) {
    const { rows } = await database.query({
      text: `
        UPDATE
          users
        SET
          username = $2,
          email = $3,
          password = $4,
          updated_at = timezone('utc', now())
        WHERE id = $1
        RETURNING 
          *;
      `,
      values: [
        userWithNewValues.id,
        userWithNewValues.username,
        userWithNewValues.email,
        userWithNewValues.password,
      ],
    });

    return rows[0];
  }

  return updatedUser;
}

const user = { create, findOneByUsername, update };

export default user;
