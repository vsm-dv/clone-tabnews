import user from "models/user";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/activations/[token_id]", () => {
  test("With no active account", async () => {
    const newUser = await orchestrator.createUser({});
    const { id: activationTokenId } = await orchestrator.createActivationToken(
      newUser.id,
    );

    const activationResponse = await fetch(
      `http://localhost:3000/api/v1/activations/${activationTokenId}`,
      {
        method: "PATCH",
      },
    );

    expect(activationResponse.status).toBe(200);

    const activationResponseBody = await activationResponse.json();

    expect(Date.parse(activationResponseBody.used_at)).not.toBeNaN();

    const activatedUser = await user.findOneByUsername(newUser.username);
    expect(activatedUser.features).toEqual([
      "create:session",
      "read:session",
      "update:user",
    ]);
  });

  test("With active account and no active session", async () => {
    const newUser = await orchestrator.createUser({});
    const { id: activationTokenId } = await orchestrator.createActivationToken(
      newUser.id,
    );

    const firstActivationResponse = await fetch(
      `http://localhost:3000/api/v1/activations/${activationTokenId}`,
      {
        method: "PATCH",
      },
    );

    expect(firstActivationResponse.status).toBe(200);

    const secondActivationResponse = await fetch(
      `http://localhost:3000/api/v1/activations/${activationTokenId}`,
      {
        method: "PATCH",
      },
    );

    expect(secondActivationResponse.status).toBe(403);

    const responseBody = await secondActivationResponse.json();
    expect(responseBody).toEqual({
      name: "ForbiddenError",
      message: "Your account is already activated.",
      action: "You are allowed to access your account.",
      status_code: 403,
    });
  });

  test("With active account and active session", async () => {
    const userWithActiveSession = await orchestrator.createUser({}, true);

    const sessionObject = await orchestrator.createSession(
      userWithActiveSession.id,
    );

    const { id: activationTokenId } = await orchestrator.createActivationToken(
      userWithActiveSession.id,
    );

    const activationResponse = await fetch(
      `http://localhost:3000/api/v1/activations/${activationTokenId}`,
      {
        method: "PATCH",
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      },
    );

    expect(activationResponse.status).toBe(403);

    const responseBody = await activationResponse.json();
    expect(responseBody).toEqual({
      name: "ForbiddenError",
      message: "Your account is already activated.",
      action: "You are allowed to access your account.",
      status_code: 403,
    });
  });

  test("With banned account", async () => {
    const newUser = await orchestrator.createUser({});
    const { id: activationTokenId } = await orchestrator.createActivationToken(
      newUser.id,
    );

    const firstActivationResponse = await fetch(
      `http://localhost:3000/api/v1/activations/${activationTokenId}`,
      {
        method: "PATCH",
      },
    );

    expect(firstActivationResponse.status).toBe(200);

    await orchestrator.updateUserFeatures(newUser.id, []);

    const secondActivationResponse = await fetch(
      `http://localhost:3000/api/v1/activations/${activationTokenId}`,
      {
        method: "PATCH",
      },
    );

    expect(secondActivationResponse.status).toBe(403);

    const responseBody = await secondActivationResponse.json();
    expect(responseBody).toEqual({
      name: "ForbiddenError",
      message: "You no longer have access to the system.",
      action: "If you think this is a mistake, contact the support team.",
      status_code: 403,
    });
  });
});
