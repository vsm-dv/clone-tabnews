import retry from "async-retry";
import database from "infra/database";

async function clearDatabase() {
  await database.query({
    text: "DROP SCHEMA public CASCADE; CREATE SCHEMA public",
  });
}

async function waitForAllServices() {
  await waitForWebServer();

  async function waitForWebServer() {
    return retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage() {
      const response = await fetch("http://localhost:3000/api/v1/status");

      if (!response.ok) throw Error();
    }
  }
}

const orchestrator = {
  waitForAllServices,
  clearDatabase,
};

export default orchestrator;
