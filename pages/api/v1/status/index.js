import database from "infra/database";
import { createRouter } from "next-connect";
import controller from "infra/controller";

const router = createRouter();

router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const updatedAt = new Date().toISOString();

  const databaseVersion = (
    await database.query({ text: "SHOW server_version;" })
  )?.rows[0].server_version;

  const max_connections = (
    await database.query({ text: "SHOW max_connections;" })
  )?.rows[0].max_connections;

  const databaseName = process.env.POSTGRES_DB;

  const open_connections = (
    await database.query({
      text: `SELECT count(*)::INT FROM pg_stat_activity WHERE datname = $1;`,
      values: [databaseName],
    })
  )?.rows[0].count;

  return response.status(200).json({
    updated_at: updatedAt,
    dependencies: {
      database: {
        version: databaseVersion,
        max_connections: Number(max_connections),
        open_connections,
      },
    },
  });
}
