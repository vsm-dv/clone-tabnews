import orchestrator from "tests/orchestrator";
import webserver from "infra/webserver";
import { version as uuidVersion } from "uuid";
import password from "models/password";
import user from "models/user";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/users/[username]", () => {
  describe("Anonymous user", () => {
    test("With unique 'username'", async () => {
      const user = await orchestrator.createUser();

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${user.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "uniqueUser2",
          }),
        },
      );

      expect(response.status).toBe(403);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        action: 'Check if your user has the "update:user" feature.',
        message: "You do not have permission to perform this action.",
        name: "ForbiddenError",
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("With nonexistent 'username'", async () => {
      const createdUser = await orchestrator.createUser({}, true);
      const sessionObject = await orchestrator.createSession(createdUser.id);

      const response = await fetch(
        `${webserver.origin}/api/v1/users/NotFoundUser`,
        {
          method: "PATCH",
          headers: { Cookie: `session_id=${sessionObject.token}` },
        },
      );

      expect(response.status).toBe(404);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "The informed username was not found.",
        action: "Check if the username is correct.",
        status_code: 404,
      });
    });

    test("With duplicated 'username'", async () => {
      await orchestrator.createUser({
        username: "user1",
      });

      const createdUser2 = await orchestrator.createUser(
        {
          username: "user2",
        },
        true,
      );

      const sessionObject2 = await orchestrator.createSession(createdUser2.id);

      const response = await fetch(`${webserver.origin}/api/v1/users/user2`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject2.token}`,
        },
        body: JSON.stringify({
          username: "user1",
        }),
      });

      expect(response.status).toBe(400);

      const response2Body = await response.json();
      expect(response2Body).toEqual({
        name: "ValidationError",
        message: "O nome de usuário informado já está sendo utilizado.",
        action: "Utilize outro nome de usuário para realizar esta operação.",
        status_code: 400,
      });
    });

    test("With `userB` targeting `userA`", async () => {
      await orchestrator.createUser({
        username: "userA",
      });

      const createdUserB = await orchestrator.createUser(
        {
          username: "userB",
        },
        true,
      );

      const sessionObject2 = await orchestrator.createSession(createdUserB.id);

      const response = await fetch(`${webserver.origin}/api/v1/users/userA`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject2.token}`,
        },
        body: JSON.stringify({
          username: "userC",
        }),
      });

      expect(response.status).toBe(403);

      const response2Body = await response.json();
      expect(response2Body).toEqual({
        action:
          "Check if you have the necessary feature to update another user.",
        message: "You do not have permission to update other user.",
        name: "ForbiddenError",
        status_code: 403,
      });
    });

    test("With duplicated 'email'", async () => {
      await orchestrator.createUser({
        email: "email1@email.com",
      });

      const secondUser = await orchestrator.createUser(
        {
          email: "email2@email.com",
        },
        true,
      );

      const sessionObject2 = await orchestrator.createSession(secondUser.id);

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${secondUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject2.token}`,
          },
          body: JSON.stringify({
            email: "email1@email.com",
          }),
        },
      );

      expect(response.status).toBe(400);

      const response2Body = await response.json();
      expect(response2Body).toEqual({
        name: "ValidationError",
        message: "O email informado já está sendo utilizado.",
        action: "Utilize outro email para realizar esta operação.",
        status_code: 400,
      });
    });

    test("With unique 'username'", async () => {
      const user = await orchestrator.createUser(
        {
          username: "uniqueUser1",
        },
        true,
      );

      const sessionObject = await orchestrator.createSession(user.id);

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${user.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: "uniqueUser2",
          }),
        },
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "uniqueUser2",
        features: ["create:session", "read:session", "update:user"],
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(responseBody.created_at).not.toBeNaN();
      expect(responseBody.updated_at).not.toBeNaN();

      expect(responseBody.updated_at > responseBody.created_at).toBe(true);
    });

    test("With unique 'email'", async () => {
      const user = await orchestrator.createUser({}, true);

      const sessionObject = await orchestrator.createSession(user.id);

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${user.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            email: "uniqueEmail2@email.com",
          }),
        },
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: user.username,
        features: ["create:session", "read:session", "update:user"],
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(responseBody.created_at).not.toBeNaN();
      expect(responseBody.updated_at).not.toBeNaN();

      expect(responseBody.updated_at > responseBody.created_at).toBe(true);
    });

    test("With new 'password'", async () => {
      const newUser = await orchestrator.createUser({}, true);
      const sessionObject = await orchestrator.createSession(newUser.id);

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${newUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            password: "newPassword2",
          }),
        },
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: newUser.username,
        features: ["create:session", "read:session", "update:user"],
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(responseBody.created_at).not.toBeNaN();
      expect(responseBody.updated_at).not.toBeNaN();

      expect(responseBody.updated_at > responseBody.created_at).toBe(true);

      const dbUser = await user.findOneByUsername(newUser.username);

      const correctPasswordMatch = await password.compare(
        "newPassword2",
        dbUser.password,
      );
      const incorrectPasswordMatch = await password.compare(
        "wrongpass",
        dbUser.password,
      );

      expect(correctPasswordMatch).toBe(true);
      expect(incorrectPasswordMatch).toBe(false);
    });
  });

  describe("Privileged user", () => {
    test("With `update:user:others` targeting `defaultUser`", async () => {
      const privilegedUser = await orchestrator.createUser({}, true);
      const privilegedUserSession = await orchestrator.createSession(
        privilegedUser.id,
      );
      await orchestrator.addFeaturesToUser(privilegedUser.id, [
        "update:user:others",
      ]);

      const defaultUser = await orchestrator.createUser();

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${defaultUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${privilegedUserSession.token}`,
          },
          body: JSON.stringify({
            username: "AlteredByPrivileged",
          }),
        },
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: defaultUser.id,
        username: "AlteredByPrivileged",
        features: defaultUser.features,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(responseBody.created_at).not.toBeNaN();
      expect(responseBody.updated_at).not.toBeNaN();

      expect(responseBody.updated_at > responseBody.created_at).toBe(true);
    });
  });
});
