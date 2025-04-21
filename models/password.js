import bcryptjs from "bcryptjs";

async function hash(password) {
  const rounds = getNumberOfRounds();

  return await bcryptjs.hash(password, rounds);
}

function getNumberOfRounds() {
  return process.env.NODE_ENV === "production" ? 14 : 1;
}

export async function compare(providedPassowrd, storedPassword) {
  return await bcryptjs.compare(providedPassowrd, storedPassword);
}

const password = {
  hash,
  compare,
};

export default password;
