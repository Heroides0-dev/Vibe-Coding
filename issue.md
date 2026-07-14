# Issue: Implementasi Fitur Logout User

## Deskripsi Tugas
Tugas ini bertujuan untuk membuat endpoint API yang berfungsi untuk melakukan logout user. Proses logout dilakukan dengan cara menghapus token sesi (session token) yang aktif dari database berdasarkan token yang dikirimkan melalui HTTP Header `Authorization`.

## Detail Kebutuhan

### 1. API Endpoint
Buat API untuk menangani proses logout user.

- **Endpoint**: `DELETE /api/users/logout`
- **Method**: `DELETE`
- **Header**: 
  - `Authorization: Bearer <Token>`
  *(Keterangan: `<Token>` adalah token sesi yang tersimpan di dalam tabel `session`).*

#### Response Body (Success)
```json
{
    "message": "User logout successfully",
    "session": {
        "token": "token_disini"
    }
}
```
*(Catatan: Token yang dihapus harus dikembalikan di dalam response body `session.token`)*.

#### Response Body (Failed)
```json
{
    "error": "Unauthorized",
    "user": null
}
```

### 2. Aturan Bisnis
- Jika token valid dan ada di database, baris data pada tabel `session` dengan token tersebut **harus dihapus**.
- Jika token tidak valid, kosong, atau tidak ditemukan di tabel `session`, kembalikan response Failed (Unauthorized).

### 3. Struktur Folder dan File
Implementasi harus melanjutkan standar struktur folder yang sudah ada di direktori `src`:
- **Folder `src/routes`**: Menangani routing. File: `user-routes.ts`.
- **Folder `src/services`**: Menangani logika bisnis (penghapusan sesi di database). File: `user-services.ts`.

---

## Tahapan Implementasi

Untuk mengimplementasikan fitur ini, ikuti langkah-langkah berikut secara berurutan. Panduan ini dirancang untuk junior programmer atau agen AI.

### Langkah 1: Pembaruan Service (`src/services/user-services.ts`)
1. Buka file `src/services/user-services.ts`.
2. Buat fungsi baru, misalnya `logoutUser(token: string)`.
3. Di dalam fungsi tersebut:
   - Lakukan validasi awal: jika `token` kosong, kembalikan respons `{ success: false, error: "Unauthorized" }`.
   - Lakukan *query* ke database untuk mengecek apakah `token` tersebut ada di dalam tabel `session`.
   - Jika token tidak ditemukan, kembalikan objek `{ success: false, error: "Unauthorized" }`.
   - Jika token ditemukan, jalankan perintah *delete* ke tabel `session` berdasarkan `token` tersebut (misalnya `await db.delete(session).where(eq(session.token, token))`).
   - Kembalikan token yang berhasil dihapus menggunakan struktur balikan `{ success: true, token: token }`.

### Langkah 2: Pembaruan Route (`src/routes/user-routes.ts`)
1. Buka file `src/routes/user-routes.ts`.
2. Tambahkan rute baru dengan metode `.delete()` untuk path `/users/logout`.
3. Akses header `authorization` dari properti `headers` yang disediakan oleh request konteks Elysia.
4. Ekstrak token dari string header (sama seperti saat implementasi *get current user*):
   - Pisahkan kata `"Bearer "` dari token untuk mendapatkan string UUID murni.
5. Panggil fungsi `logoutUser(token)` dari `user-services.ts`.
6. Tangani hasil balikan dari service:
   - Jika tidak sukses (mengalami error `"Unauthorized"`), atur status HTTP ke `401` dan kembalikan response JSON gagal (`{"error": "Unauthorized", "user": null}`).
   - Jika sukses, atur status HTTP ke `200` (atau biarkan default) dan kembalikan JSON sukses (`{"message": "User logout successfully", "session": {"token": "<token_yang_dihapus>"}}`).

### Langkah 3: Pengujian
1. Jalankan aplikasi (contoh: `bun run dev`).
2. Gunakan REST Client (Postman / Insomnia / `curl`).
3. Lakukan proses login (`POST /api/users/login`) dengan akun yang valid untuk mendapatkan `token` baru.
4. **Pengujian Sukses**: Lakukan request `DELETE /api/users/logout` dengan menyematkan header `Authorization: Bearer <TOKEN>`. Pastikan response yang muncul menyatakan sukses dan memuat token yang dihapus.
5. **Verifikasi Database**: Coba gunakan endpoint `GET /api/users/current` dengan token yang sama. Pastikan kini hasilnya adalah `"Unauthorized"` karena sesi sudah dihapus.
6. **Pengujian Gagal**: Coba panggil kembali `DELETE /api/users/logout` dengan token yang sudah terhapus atau token yang diacak/kosong. Pastikan responsenya adalah `"Unauthorized"`.
