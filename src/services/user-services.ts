import { db } from "../db";
import { users, session } from "../db/schema";
import { eq } from "drizzle-orm";

export interface RegisterUserData {
  name: string;
  email: string;
  password: string;
}

/**
 * Mengonversi objek Date menjadi string format ISO lokal (YYYY-MM-DDTHH:mm:ss±hh:mm).
 * Fungsi ini memperhitungkan offset zona waktu lokal agar sesuai dengan waktu setempat,
 * bukan waktu UTC standar.
 * 
 * @param date - Objek Date yang akan dikonversi.
 * @returns String representasi waktu lokal dalam format ISO.
 */
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

/**
 * Mendaftarkan pengguna baru ke dalam database.
 * Proses meliputi pengecekan duplikasi email, proses hashing kata sandi (password), 
 * dan penyimpanan data user baru ke database.
 * 
 * @param data - Objek yang berisi name, email, dan password dari pengguna baru.
 * @returns Objek yang menandakan status keberhasilan (success) dan data user (jika sukses) 
 *          atau pesan error (jika gagal).
 */
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

/**
 * Melakukan proses otentikasi (login) pengguna.
 * Mencari email di database, memverifikasi kecocokan password dengan hash yang tersimpan,
 * dan menghasilkan serta menyimpan token sesi (session) jika berhasil.
 * 
 * @param data - Objek yang berisi email dan password.
 * @returns Objek yang menandakan keberhasilan (success) dan token sesi (jika sukses)
 *          atau pesan error "User not found" (jika email/password salah).
 */
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

/**
 * Mengambil profil pengguna yang saat ini sedang login berdasarkan token sesi.
 * Melakukan validasi apakah token ada dan masih valid dengan melakukan query 
 * gabungan (JOIN) antara tabel session dan users.
 * 
 * @param token - String token sesi dari header Authorization.
 * @returns Objek keberhasilan beserta data user (jika token valid) 
 *          atau pesan error "Unauthorized" (jika token tidak valid).
 */
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

/**
 * Melakukan proses logout pengguna dengan menghapus token sesi terkait dari database.
 * Mencegah token tersebut digunakan kembali di kemudian waktu.
 * 
 * @param token - String token sesi dari header Authorization yang ingin dihapus.
 * @returns Objek keberhasilan beserta nilai token yang dihapus (jika sukses)
 *          atau pesan error "Unauthorized" (jika token tidak valid/sudah dihapus).
 */
export async function logoutUser(token: string) {
  if (!token) {
    return { success: false, error: "Unauthorized" };
  }

  const [existingSession] = await db
    .select()
    .from(session)
    .where(eq(session.token, token))
    .limit(1);

  if (!existingSession) {
    return { success: false, error: "Unauthorized" };
  }

  await db
    .delete(session)
    .where(eq(session.token, token));

  return {
    success: true,
    token: token,
  };
}
