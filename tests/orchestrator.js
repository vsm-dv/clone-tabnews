import { faker } from "@faker-js/faker/.";
import retry from "async-retry";

import database from "infra/database";
import activation from "models/activation";
import migrator from "models/migrator";
import session from "models/session";
import user from "models/user";

const emailHttpUrl = `http://${process.env.EMAIL_HTTP_HOST}:${process.env.EMAIL_HTTP_PORT}`;

async function clearDatabase() {
  await database.query({
    text: "DROP SCHEMA public CASCADE; CREATE SCHEMA public",
  });
}

async function waitForAllServices() {
  await waitForWebServer();
  await waitForEmailServer();

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

  async function waitForEmailServer() {
    return retry(fetchEmailPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchEmailPage() {
      const response = await fetch(emailHttpUrl);

      if (!response.ok) throw Error();
    }
  }
}

async function runPendingMigrations() {
  await migrator.runPendingMigrations();
}

async function createUser(userObject = {}, shouldActivate = false) {
  let createdUser = await user.create({
    username:
      userObject.username || faker.internet.username().replace(/[_.-]/g, ""),
    email: userObject.email || faker.internet.email(),
    password: userObject.password || "validPassword",
  });

  const userId = createdUser.id;

  if (shouldActivate) {
    createdUser = await activation.activateUserByUserId(userId);
  }

  return createdUser;
}

async function updateUserFeatures(userId, features) {
  await user.setFeatures(userId, features);
}

async function addFeaturesToUser(userId, features) {
  await user.addFeatures(userId, features);
}

async function createSession(userId) {
  return await session.create(userId);
}

async function deleteAllEmails() {
  await fetch(`${emailHttpUrl}/messages`, { method: "DELETE" });
}

async function getLastEmail() {
  const emailListResponse = await fetch(`${emailHttpUrl}/messages`);
  const emailListBody = await emailListResponse.json();
  const lastEmailItem = emailListBody.pop();

  if (!lastEmailItem) return null;

  const emailTextResponse = await fetch(
    `${emailHttpUrl}/messages/${lastEmailItem.id}.plain`,
  );

  const emailTextBody = await emailTextResponse.text();

  return { ...lastEmailItem, text: emailTextBody };
}

function getUUIDFromText(text) {
  const uuidRegex =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}/g;

  return text.match(uuidRegex)[0];
}

async function createActivationToken(userId) {
  const activationToken = await activation.create(userId);
  return activationToken;
}

const orchestrator = {
  waitForAllServices,
  clearDatabase,
  runPendingMigrations,
  createUser,
  createSession,
  deleteAllEmails,
  getLastEmail,
  getUUIDFromText,
  createActivationToken,
  updateUserFeatures,
  addFeaturesToUser,
};

export default orchestrator;
