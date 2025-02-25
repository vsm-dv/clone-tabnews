import useSWR from "swr";

async function fetchAPI(key) {
  const response = await fetch(key);
  const responseBody = await response.json();

  return responseBody;
}

export default function StatusPage() {
  return (
    <>
      <h1>Status</h1>
      <UpdatedAt />
    </>
  );
}

function UpdatedAt() {
  const { isLoading, data } = useSWR("/api/v1/status", fetchAPI, {
    refreshInterval: 2000,
  });

  let updatedAtText = "Loading...";

  let hasCompleteData = false;
  let openConnections = null;
  let version = null;
  let maxConnections = null;

  if (!isLoading && data) {
    hasCompleteData = true;
    updatedAtText = new Date(data.updated_at).toLocaleString("pt-BR");
    maxConnections = data.dependencies.database.max_connections;
    openConnections = data.dependencies.database.open_connections;
    version = data.dependencies.database.version;
  }

  return (
    <div>
      <p>Last update: {updatedAtText}</p>
      <p>Last update: {maxConnections}</p>

      {hasCompleteData && (
        <>
          <p>Open connections: {openConnections} </p>
          <p>Max connections: {maxConnections} </p>
          <p>version: {version} </p>
        </>
      )}
    </div>
  );
}
