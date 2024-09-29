import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;

export async function initilizeRedisClient() {
  if (!client) {
    client = createClient({ url: "redis://localhost:6380" });
    client.on("error", (error) => {
      console.error(error);
    });

    client.on("connect", () => {
      console.log("Redis is connected");
    });

    await client.connect();
  }

  return client;
}
