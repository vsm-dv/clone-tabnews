import { faker } from "@faker-js/faker/.";
import retry from "async-retry";

import database from "infra/database";
import migrator from "models/migrator";
import user from "models/user";
import session from "models/session";

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

async function runPendingMigrations() {
  await migrator.runPendingMigrations();
}

async function createUser(userObject = {}) {
  return await user.create({
    username:
      userObject.username || faker.internet.username().replace(/[_.-]/g, ""),
    email: userObject.email || faker.internet.email(),
    password: userObject.password || "validPassword",
  });
}

async function createSession(userId) {
  return await session.create(userId);
}

const orchestrator = {
  waitForAllServices,
  clearDatabase,
  runPendingMigrations,
  createUser,
  createSession,
};

export default orchestrator;
