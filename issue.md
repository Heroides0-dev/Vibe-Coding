# Issue: Fix Bug - Validasi Panjang Karakter pada Registrasi User

## Deskripsi Bug
Saat ini, terdapat *bug* pada fitur registrasi user (`POST /api/users`). Jika seorang user mendaftar dengan nama (`name`) yang memiliki lebih dari 255 karakter, sistem tidak menolak *request* tersebut. Sebaliknya, database secara otomatis memotong (*truncate*) nama tersebut menjadi tepat 255 karakter karena batasan skema pada kolom `name` adalah `varchar(255)`. 

Hal ini dapat menyebabkan inkonsistensi data antara apa yang diinputkan user dengan apa yang sebenarnya tersimpan di database.

## Detail Kebutuhan
Kita perlu menambahkan validasi pada level API *routing* (menggunakan skema validasi bawaan Elysia.js) untuk memastikan bahwa panjang maksimal dari atribut `name` yang dikirim dalam *request body* tidak melebihi 255 karakter. Jika melebihi batas tersebut, server harus otomatis menolak *request* sebelum sampai ke pemrosesan *database*.

## File yang Terdampak
- **File**: `src/routes/user-routes.ts`

---

## Tahapan Implementasi

Untuk memperbaiki *bug* ini, ikuti langkah-langkah berikut secara berurutan. Panduan ini dirancang agar mudah diikuti oleh junior programmer atau agen AI.

### Langkah 1: Buka File Routing User
1. Buka file `src/routes/user-routes.ts` di *code editor*.

### Langkah 2: Cari Endpoint Registrasi
1. Temukan definisi rute untuk registrasi, yaitu kode yang menggunakan `.post("/users", ...)`.
2. Di bagian bawah dari rute tersebut (setelah fungsi `async ({ body, set }) => { ... }`), Anda akan menemukan objek konfigurasi untuk memvalidasi *body request*.

### Langkah 3: Tambahkan Validasi `maxLength`
1. Pada konfigurasi tipe skema, ubah `t.String()` untuk *field* `name` menjadi `t.String({ maxLength: 255 })`.

**Contoh Sebelum Perubahan:**
```typescript
{
  body: t.Object({
    name: t.String(),
    email: t.String({ format: "email" }),
    password: t.String(),
  }),
}
```

**Contoh Sesudah Perubahan:**
```typescript
{
  body: t.Object({
    name: t.String({ maxLength: 255 }), // <-- Batasi maksimal 255 karakter
    email: t.String({ format: "email" }),
    password: t.String(),
  }),
}
```

### Langkah 4: Pengujian (Verifikasi Perbaikan)
1. Pastikan server lokal berjalan (contoh: `bun run dev`).
2. Siapkan *request* `POST /api/users` menggunakan *HTTP Client* (Postman, Insomnia, atau script *fetch*).
3. **Pengujian Normal:** Coba kirim data dengan nama kurang dari 255 karakter. Pastikan proses registrasi berhasil (`201 Created`).
4. **Pengujian Batas Maksimal:** Coba kirim data dengan isi `name` yang memiliki **lebih dari 255 karakter** (misalnya 300 huruf "a").
5. **Ekspektasi:** Permintaan harus ditolak oleh *server* sebelum sampai ke tahap penyimpanan *database*. Elysia akan mengembalikan *HTTP Status Error* (seperti `400 Bad Request` atau `422 Unprocessable Entity`) disertai pesan bahwa validasi *string* gagal.
