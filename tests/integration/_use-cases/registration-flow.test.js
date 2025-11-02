import webserver from "infra/webserver";
import activation from "models/activation";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("Use case: Registration flow (all successful)", () => {
  let createUserResponseBody;

  test("Create user account", async () => {
    const createUserResponse = await fetch(
      "http://localhost:3000/api/v1/users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "registrationFlow",
          email: "registration.flow@email.com",
          password: "pass",
        }),
      },
    );

    expect(createUserResponse.status).toBe(201);

    createUserResponseBody = await createUserResponse.json();
    expect(createUserResponseBody).toEqual({
      id: createUserResponseBody.id,
      username: "registrationFlow",
      email: "registration.flow@email.com",
      features: ["read:activation_token"],
      password: createUserResponseBody.password,
      created_at: createUserResponseBody.created_at,
      updated_at: createUserResponseBody.updated_at,
    });
  });

  test("Receive activation email", async () => {
    const lastEmail = await orchestrator.getLastEmail();

    expect(lastEmail).toBeTruthy();
    expect(lastEmail?.sender).toBe("<contact@email.com>");
    expect(lastEmail?.recipients[0]).toBe("<registration.flow@email.com>");
    expect(lastEmail?.subject).toBe("Activate your account at FinTab");
    expect(lastEmail?.text).toContain("registrationFlow");

    const extractedTokenId = orchestrator.getUUIDFromText(lastEmail.text);

    expect(lastEmail.text).toContain(
      `${webserver.origin}/register/activate/${extractedTokenId}`,
    );

    const activationToken = await activation.findOneValidById(extractedTokenId);

    expect(createUserResponseBody.id).toBe(activationToken.user_id);
    expect(activationToken.used_at).toBeNull();
  });

  test("Activate account", async () => {});

  test("Login", async () => {});

  test("Get user information", async () => {});
});
