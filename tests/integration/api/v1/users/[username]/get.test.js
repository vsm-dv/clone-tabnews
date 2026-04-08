import orchestrator from "tests/orchestrator";
import webserver from "infra/webserver";
import { version as uuidVersion } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/users/[username]", () => {
  describe("Anonymous user", () => {
    test("With exact case match", async () => {
      await orchestrator.createUser({
        username: "SameCase",
        email: "same.case@email.com",
        password: "pass",
      });

      const response2 = await fetch(
        `${webserver.origin}/api/v1/users/SameCase`,
      );

      expect(response2.status).toBe(200);

      const response2Body = await response2.json();
      expect(response2Body).toEqual({
        id: response2Body.id,
        username: "SameCase",
        features: ["read:activation_token"],
        created_at: response2Body.created_at,
        updated_at: response2Body.updated_at,
      });

      expect(uuidVersion(response2Body.id)).toBe(4);
      expect(Date.parse(response2Body.created_at)).not.toBeNaN();
      expect(Date.parse(response2Body.updated_at)).not.toBeNaN();
    });

    test("With case mismatch", async () => {
      await orchestrator.createUser({
        username: "DifferentCase",
        email: "different.case@email.com",
        password: "pass",
      });

      const response2 = await fetch(
        `${webserver.origin}/api/v1/users/differentcase`,
      );

      expect(response2.status).toBe(200);

      const response2Body = await response2.json();
      expect(response2Body).toEqual({
        id: response2Body.id,
        username: "DifferentCase",
        features: ["read:activation_token"],
        created_at: response2Body.created_at,
        updated_at: response2Body.updated_at,
      });

      expect(uuidVersion(response2Body.id)).toBe(4);
      expect(Date.parse(response2Body.created_at)).not.toBeNaN();
      expect(Date.parse(response2Body.updated_at)).not.toBeNaN();
    });

    test("With nonexistent username", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/users/NotFoundUser`,
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
  });
});
