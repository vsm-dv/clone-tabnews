import email from "infra/email";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("infra/email.ts", () => {
  test("send()", async () => {
    await orchestrator.deleteAllEmails();

    await email.send({
      from: "FinTab <contato@fintab.com.br>",
      to: "contato@email.com",
      subject: "subject test",
      text: "body test",
    });

    await email.send({
      from: "FinTab <contato@fintab.com.br>",
      to: "contato@email.com",
      subject: "last email",
      text: "last email body",
    });

    const lastEmail = await orchestrator.getLastEmail();

    expect(lastEmail.sender).toBe("<contato@fintab.com.br>");
    expect(lastEmail.recipients[0]).toBe("<contato@email.com>");
    expect(lastEmail.subject).toBe("last email");
    expect(lastEmail.text).toBe("last email body\n");
  });
});
