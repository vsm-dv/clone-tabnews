import database from "infra/database";
import { ValidationError } from "infra/errors";

async function create(userInputValues) {
  await validateUniqueEmail(userInputValues.email);
  await validateUniqueUsername(userInputValues.username);

  const newUser = await runInsertQuery({ ...userInputValues });
  return newUser;

  async function validateUniqueEmail(email) {
    const { rowCount } = await database.query({
      text: `
            SELECT 
              email
            FROM
              users 
            WHERE
              LOWER(email) = LOWER($1)
            ;`,
      values: [email],
    });

    if (rowCount) {
      throw new ValidationError({
        message: "O email informado já está sendo utilizado.",
        action: "Utilize outro email para realizar o cadastro",
      });
    }
  }

  async function validateUniqueUsername(username) {
    const { rowCount } = await database.query({
      text: `
            SELECT 
              username
            FROM
              users 
            WHERE
              LOWER(username) = LOWER($1)
            ;`,
      values: [username],
    });

    if (rowCount) {
      throw new ValidationError({
        message: "O nome de usuário informado já está sendo utilizado.",
        action: "Utilize outro nome de usuário para realizar o cadastro",
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

const user = { create };

export default user;
