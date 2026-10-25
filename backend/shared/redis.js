import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

redis.on("connect", () => {
    console.log("Connected to Redis");
})

redis.on("error", (error) => {
    console.log("Redis connection error", error);
})

export default redis;

