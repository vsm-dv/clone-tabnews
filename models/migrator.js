import database from "infra/database";
import { ServiceError } from "infra/errors";
import migrationRunner from "node-pg-migrate";
import { resolve } from "node:path";

const defaultMigrationOptions = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  dryRun: true,
  dir: resolve("infra", "migrations"),
  direction: "up",
  migrationsTable: "pgmigrations",
  verbose: true,
};

async function listPendingMigrations() {
  let dbClient;

  try {
    dbClient = await database.getNewClient();

    const pendingMigrations = await migrationRunner({
      ...defaultMigrationOptions,
      dbClient,
    });

    return pendingMigrations;
  } catch (error) {
    const serviceErrorObject = new ServiceError({
      cause: error,
      message:
        "An error occurred when trying to get the migrations or trying to run the migrations",
    });

    console.error(error);

    throw serviceErrorObject;
  } finally {
    await dbClient?.end();
  }
}

async function postHandler() {
  let dbClient;

  try {
    dbClient = await database.getNewClient();

    const migratedMigrations = await migrationRunner({
      ...defaultMigrationOptions,
      dbClient,
      dryRun: false,
    });

    return migratedMigrations;
  } catch (error) {
    const serviceErrorObject = new ServiceError({
      cause: error,
      message:
        "An error occurred when trying to connect to the database or trying to run the migrations",
    });

    console.error(error);

    throw serviceErrorObject;
  } finally {
    await dbClient?.end();
  }
}

const migrator = {
  listPendingMigrations,
  postHandler,
};

export default migrator;
