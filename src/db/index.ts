import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

const poolConnection = mysql.createPool(connectionString);

export const db = drizzle(poolConnection, { schema, mode: "default" });
export type Db = typeof db;
