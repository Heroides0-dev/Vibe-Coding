# User Management API

Aplikasi RESTful API sederhana untuk manajemen pengguna yang mendukung fitur registrasi, login, pengambilan profil pengguna saat ini, dan logout menggunakan *session token*.

## 🚀 Teknologi & Library

- **Runtime**: [Bun](https://bun.sh/)
- **Framework Web**: [Elysia.js](https://elysiajs.com/)
- **Database**: MySQL
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Testing**: `bun test` (Bawaan Bun)
- **Keamanan**: Hashing password menggunakan algoritma *bcrypt* dari modul standar Bun.

---

## 📂 Arsitektur & Struktur Folder

Aplikasi ini memisahkan antara konfigurasi utama, *routing*, logika bisnis, dan interaksi *database* untuk menjaga kebersihan dan skalabilitas kode. Penamaan *file* di dalam kode utama ditekankan menggunakan format *kebab-case*.

```text
.
├── src/
│   ├── index.ts              # Entry point aplikasi (Inisialisasi server Elysia)
│   ├── db/
│   │   ├── index.ts          # Konfigurasi koneksi MySQL menggunakan poolConnection
│   │   └── schema.ts         # Definisi skema tabel database (Drizzle)
│   ├── routes/
│   │   └── user-routes.ts    # Definisi API Endpoint & validasi input (Elysia)
│   └── services/
│       └── user-services.ts  # Logika bisnis (proses hash, operasi CRUD database)
├── test/
│   └── user.test.ts          # Unit test komprehensif untuk seluruh endpoint API
├── drizzle.config.ts         # Konfigurasi Drizzle ORM
└── package.json
```

---

## 🗄️ Skema Database

Aplikasi menggunakan 2 tabel utama, dikelola dengan *Drizzle ORM*:

### 1. Tabel `users`
Menyimpan data pengguna yang telah mendaftar.
- `id` (INT, Primary Key, Auto Increment)
- `name` (VARCHAR 255, Not Null)
- `email` (VARCHAR 255, Not Null, Unique)
- `password` (VARCHAR 255, Not Null) - *Disimpan dalam bentuk hash*
- `created_at` (TIMESTAMP, Default Current Timestamp)

### 2. Tabel `session`
Menyimpan *token* sesi otentikasi dari pengguna yang sedang dalam status login.
- `id` (INT, Primary Key, Auto Increment)
- `token` (VARCHAR 255, Not Null) - *Dalam bentuk UUID murni*
- `user_id` (INT, Not Null) - *Foreign Key yang merujuk ke tabel `users.id`*
- `created_at` (TIMESTAMP, Default Current Timestamp)

---

## 🌐 API Endpoint

*Base URL*: `http://localhost:3000`

### 1. Registrasi User
- **Method**: `POST`
- **Endpoint**: `/api/users`
- **Body JSON**: 
  ```json
  { 
    "name": "John Doe", 
    "email": "john@example.com", 
    "password": "secretpassword" 
  }
  ```
- **Response Sukses**: `201 Created`

### 2. Login User
- **Method**: `POST`
- **Endpoint**: `/api/users/login`
- **Body JSON**: 
  ```json
  { 
    "email": "john@example.com", 
    "password": "secretpassword" 
  }
  ```
- **Response Sukses**: `200 OK` (Mengembalikan struktur data yang berisi `session.token`)

### 3. Get Current User
- **Method**: `GET`
- **Endpoint**: `/api/users/current`
- **Headers**: `Authorization: Bearer <token>`
- **Response Sukses**: `200 OK` (Mengembalikan profil user yang sedang aktif/login)

### 4. Logout User
- **Method**: `DELETE`
- **Endpoint**: `/api/users/logout`
- **Headers**: `Authorization: Bearer <token>`
- **Response Sukses**: `200 OK` (Data sesi terkait di-*delete* dari database)

---

## 🛠️ Cara Setup Project

1. **Clone repository** dan masuk ke direktori proyek lokal Anda.
2. **Install dependencies** menggunakan package manager Bun:
   ```bash
   bun install
   ```
3. **Konfigurasi Environment Variables**:
   Buat file `.env` di *root* proyek dan tambahkan URL koneksi database MySQL Anda:
   ```env
   DATABASE_URL=mysql://username:password@localhost:3306/nama_database
   ```
4. **Jalankan Migrasi / Sinkronisasi Skema Database**:
   Anda dapat mendorong skema Drizzle langsung ke database menggunakan fitur push Drizzle Kit:
   ```bash
   bunx drizzle-kit push
   ```

---

## 🏃 Cara Menjalankan Aplikasi

Jalankan aplikasi dalam mode *development* (dilengkapi mode *watch* yang otomatis me-*restart* *server* jika ada perubahan *file*):
```bash
bun run dev
```
Aplikasi akan secara otomatis mendengarkan permintaan di rute `http://localhost:3000`.

---

## 🧪 Cara Menjalankan Unit Test

Aplikasi ini sudah dipasangkan dengan mekanisme pengujian (*testing*) komprehensif menggunakan *test runner* bawaan Bun (`bun test`). Skrip pengujian berjalan mandiri (tanpa perlu menghidupkan *server HTTP* secara terpisah) dan dikonfigurasi untuk menghapus data *users* dan *sessions* sebelum menjalankan setiap *test case* demi menjaga kemurnian (*clean state*) tiap skenario.

Jalankan seluruh *suite unit test* dengan perintah berikut:
```bash
bun test
```
