import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export interface RegisterUserData {
  name: string;
  email: string;
  password: string;
}

function toLocalISOString(date: Date): string {
  const offsetMinutes = date.getTimezoneOffset();
  const tzoffset = offsetMinutes * 60000;
  const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, -1);
  const sign = offsetMinutes > 0 ? "-" : "+";
  const absOffset = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const minutes = String(absOffset % 60).padStart(2, '0');
  return `${localISOTime.split('.')[0]}${sign}${hours}:${minutes}`;
}

export async function registerUser(data: RegisterUserData) {
  // 1. Check if email already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);

  if (existingUser.length > 0) {
    return { success: false, error: "Email already exists" };
  }

  // 2. Hash the password using Bun's built-in bcrypt hasher
  const hashedPassword = await Bun.password.hash(data.password, "bcrypt");

  // 3. Save new user to the database
  const [insertResult] = await db.insert(users).values({
    name: data.name,
    email: data.email,
    password: hashedPassword,
  });

  // 4. Retrieve the newly created user
  const [newUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, insertResult.insertId))
    .limit(1);

  if (!newUser) {
    return { success: false, error: "Failed to retrieve created user" };
  }

  return {
    success: true,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      created_at: newUser.createdAt ? toLocalISOString(newUser.createdAt) : null,
    },
  };
}
