import { db } from "../db";
import { users, session } from "../db/schema";
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

export interface LoginUserData {
  email: string;
  password: string;
}

export async function loginUser(data: LoginUserData) {
  // 1. Find user by email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);

  if (!user) {
    return { success: false, error: "User not found" };
  }

  // 2. Verify password using Bun's built-in password verify
  const isPasswordCorrect = await Bun.password.verify(data.password, user.password);
  if (!isPasswordCorrect) {
    return { success: false, error: "User not found" };
  }

  // 3. Generate token (UUID)
  const token = crypto.randomUUID();

  // 4. Save session to db
  await db.insert(session).values({
    token: token,
    userId: user.id,
  });

  return {
    success: true,
    session: {
      token: token,
    },
  };
}

export async function getCurrentUser(token: string) {
  if (!token) {
    return { success: false, error: "Unauthorized" };
  }

  const [result] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(session)
    .innerJoin(users, eq(session.userId, users.id))
    .where(eq(session.token, token))
    .limit(1);

  if (!result) {
    return { success: false, error: "Unauthorized" };
  }

  return {
    success: true,
    user: {
      id: result.id,
      name: result.name,
      email: result.email,
      created_at: result.createdAt ? toLocalISOString(result.createdAt) : null,
    },
  };
}
