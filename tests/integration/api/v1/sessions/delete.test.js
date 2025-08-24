import { EXPIRATION_IN_MILLISECONDS } from "models/session";
import setCookieParser from "set-cookie-parser";
import orchestrator from "tests/orchestrator";

import { version as uuidVersion } from "uuid";

beforeAll(async () => {
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/user", () => {
  describe("Default user", () => {
    test("With nonexistent session", async () => {
      const nonexistentToken =
        "f9c224444b066f2163c6fcb9883685ba6b60014dbd44e1b6ffc300d341cd62dbd372d167b76699fc505992e70f3ca608";

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${nonexistentToken}`,
        },
      });

      expect(response.status).toBe(401);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "User does not have an active session.",
        action: "Check if this user is logged and try again",
        status_code: 401,
      });
    });

    test("With expired session", async () => {
      jest.useFakeTimers({ now: Date.now() - EXPIRATION_IN_MILLISECONDS });

      const createdUser = await orchestrator.createUser({});

      const sessionObject = await orchestrator.createSession(createdUser.id);

      jest.useRealTimers();

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      });

      expect(response.status).toBe(401);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "User does not have an active session.",
        action: "Check if this user is logged and try again",
        status_code: 401,
      });
    });

    test("With valid session", async () => {
      const createdUser = await orchestrator.createUser({});

      const sessionObject = await orchestrator.createSession(createdUser.id);

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      });

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: sessionObject.id,
        token: sessionObject.token,
        user_id: sessionObject.user_id,
        expires_at: responseBody.expires_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(responseBody.created_at).not.toBeNaN();
      expect(responseBody.updated_at).not.toBeNaN();
      expect(responseBody.expires_at).not.toBeNaN();

      expect(
        responseBody.expires_at < sessionObject.expires_at.toISOString(),
      ).toEqual(true);
      expect(
        responseBody.updated_at > sessionObject.updated_at.toISOString(),
      ).toEqual(true);

      // set cookie assertions
      const parsedSetCookie = setCookieParser(response.headers.getSetCookie(), {
        map: true,
      });

      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: "invalid",
        maxAge: -1,
        path: "/",
        httpOnly: true,
      });

      // Double-check assertions

      const doubleCheckResponse = await fetch(
        "http://localhost:3000/api/v1/user",
        {
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(doubleCheckResponse.status).toBe(401);

      const doubleCheckResponseBody = await doubleCheckResponse.json();

      expect(doubleCheckResponseBody).toEqual({
        name: "UnauthorizedError",
        message: "User does not have an active session.",
        action: "Check if this user is logged and try again",
        status_code: 401,
      });
    });
  });
});
