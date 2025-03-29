import database from "infra/database";
import { NotFoundError, ValidationError } from "infra/errors";

async function create(userInputValues) {
  await validateUniqueEmailAndUsername(
    userInputValues.email,
    userInputValues.username,
  );

  const newUser = await runInsertQuery({ ...userInputValues });
  return newUser;

  async function validateUniqueEmailAndUsername(email, username) {
    const { rows, rowCount } = await database.query({
      text: `
            SELECT 
              email, username
            FROM
              users 
            WHERE
              LOWER(email) = LOWER($1)
            OR
              LOWER(username) = LOWER($2)
            ;`,
      values: [email, username],
    });

    if (rowCount) {
      const duplicatedInfo = rows.find(
        (item) => item.email === email.toLowerCase(),
      )
        ? "email"
        : "nome de usuário";

      throw new ValidationError({
        message: `O ${duplicatedInfo} informado já está sendo utilizado.`,
        action: `Utilize outro ${duplicatedInfo} para realizar o cadastro`,
      });
    }
  }

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

export async function findOneByUsername(username) {
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

const user = { create, findOneByUsername };

export default user;
