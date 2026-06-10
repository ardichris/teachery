# AI Implementation Rules

Dokumen ini berisi aturan untuk AI coding assistant saat membantu membuat frontend dan backend Teachery.

Tujuan Dokumen ini bukan mengatur fitur AI provider di aplikasi, tetapi mengatur cara AI assistant menulis kode agar konsisten dengan product docs, business rules, API contract, database schema, dan UX yang sudah dibuat.

## Source of Truth

Sebelum membuat atau mengubah kode, AI assistant wajib mengikuti assessment berikut:

- `00_PRODUCT_VISION.md`
- `02_APP_FLOW.md`
- `04_DESIGN_SYSTEM.md`
- `05_COMPONENT_SPEC.md`
- `06_PAGE_SPEC.md`
- `07_BUSINESS_RULES.md`
- `10_FRONTEND_ARCHITECTURE.md`
- `11_BACKEND_ARCHITECTURE.md`
- `12_API_STRUCTURE.md`
- `14_DATABASE_SCHEMA.md`
- `16_DATA_DICTIONARY.md`
- `17_API_CONTRACT.md`
- `18_ERROR_CODES.md`

Jika ada konflik antar assessment, gunakan urutan prioritas:

1. Business rules.
2. API contract.
3. Database schema dan data dictionary.
4. Page/component spec.
5. Design system.

## General Coding Rules

Rules:

- Gunakan TypeScript untuk frontend.
- Jangan gunakan `any` kecuali benar-benar tidak bisa dihindari dan harus diberi alasan.
- Gunakan type/interface eksplisit untuk request, response, form state, dan API model.
- Hindari duplicate code.
- Ikuti struktur folder dan pattern yang sudah ada di project.
- Jangan membuat abstraction baru jika helper/pattern existing sudah cukup.
- Jangan hardcode credential, API key, JWT secret, atau provider secret.
- Jangan mengubah behavior bisnis tanpa memperbarui docs terkait.

## Frontend Rules

Rules:

- Gunakan Next.js sesuai `10_FRONTEND_ARCHITECTURE.md`.
- Gunakan Shadcn untuk UI component jika tersedia.
- Gunakan React Hook Form untuk form.
- Gunakan Zod untuk validasi form.
- Gunakan Zustand untuk state global jika memang perlu state lintas halaman.
- Gunakan Server Actions jika sesuai arsitektur project.
- UI harus mengikuti `03_UI_UX_GUIDELINES.md` dan `04_DESIGN_SYSTEM.md`.
- Component harus mengikuti `05_COMPONENT_SPEC.md`.
- Page harus mengikuti `06_PAGE_SPEC.md`.

Frontend wajib mendukung:

- Role-aware navigation untuk `Admin` dan `Guru`.
- Dashboard berbeda untuk Admin dan Guru.
- Credit balance yang mudah terlihat.
- Credit estimate sebelum proses AI/job dibuat.
- Error handling berdasarkan `18_ERROR_CODES.md`.
- Field-level validation dari API.
- Loading, empty, error, and success states.

Frontend tidak boleh:

- Mengandalkan hidden menu sebagai security.
- Mengizinkan Guru melihat data Guru lain.
- Menampilkan `password_hash`.
- Menampilkan internal `file_path` mentah.
- Menampilkan error provider AI mentah.
- Membuat proses AI tanpa estimasi Kredit.

## Backend Rules

Rules:

- Ikuti `11_BACKEND_ARCHITECTURE.md`.
- Gunakan Repository Pattern untuk akses data.
- Pisahkan handler/controller, service/use case, repository, dan provider adapter.
- Business logic utama berada di service/use case, bukan di handler.
- Handler hanya bertanggung jawab parsing request, auth context, validasi awal, dan response.
- Repository tidak boleh berisi logic role, Kredit, atau workflow AI.
- Gunakan database transaction untuk operasi Kredit, job finalization, dan audit wajib.

Backend wajib enforce:

- JWT auth untuk endpoint protected.
- Role Admin/Guru.
- Status user active/inactive.
- Ownership data untuk Guru.
- Saldo Kredit cukup sebelum Job AI dibuat.
- Error response sesuai `18_ERROR_CODES.md`.
- API shape sesuai `17_API_CONTRACT.md`.

Backend tidak boleh:

- Mengandalkan frontend untuk permission.
- Mengubah saldo Kredit tanpa `credit_transactions`.
- Menghapus atau mengedit transaksi Kredit success.
- Menghapus atau mengedit audit log.
- Mengirim stack trace atau provider secret ke frontend.

## API Rules

Rules:

- Semua endpoint harus mengikuti `17_API_CONTRACT.md`.
- Response sukses memakai shape:

```json
{
  "data": {},
  "meta": {}
}
```

- Response error memakai shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data tidak valid",
    "details": {}
  }
}
```

- List endpoint wajib mendukung pagination jika data bisa bertambah banyak.
- Endpoint Admin harus memakai prefix `/admin`.
- Endpoint Guru harus selalu memvalidasi ownership.
- Jangan mengekspos field sensitif dari data dictionary.

## Role and Permission Rules

Rules:

- Role MVP hanya `admin` dan `guru`.
- Admin dapat mengelola user dan Kredit.
- Guru hanya dapat memakai aplikasi untuk data miliknya.
- Admin endpoint hanya boleh diakses role `admin`.
- Guru endpoint hanya boleh diakses role `guru`, kecuali endpoint umum seperti auth/me.
- User inactive tidak boleh memakai endpoint protected.
- Sistem harus menjaga minimal satu Admin aktif.

Saat membuat query untuk Guru, selalu filter dengan:

```sql
owner_user_id = current_user_id
```

atau:

```sql
user_id = current_user_id
```

sesuai resource.

## Credit System Rules

Rules:

- Semua proses yang memakai AI harus memakai Kredit.
- Estimasi Kredit wajib dihitung sebelum Job dibuat.
- Job tidak boleh dibuat jika saldo Kredit tidak cukup.
- Kredit hanya dipotong untuk output AI yang berhasil.
- Job gagal total tidak boleh memotong Kredit.
- Jika Kredit sudah terpotong tetapi Job gagal, buat refund.
- Semua perubahan Kredit harus masuk `credit_transactions`.
- Admin adjustment Kredit wajib memiliki reason.
- Saldo akhir tidak boleh negatif pada MVP.

Saat membuat kode terkait Kredit, gunakan transaction database untuk:

- Insert `credit_transactions`.
- Update `credit_balances`.
- Insert `audit_logs` jika wajib.
- Update final status `jobs` jika terkait Job.

## Job and AI Feature Rules

Rules:

- Semua proses AI aplikasi harus berjalan sebagai `Job`.
- Generate soal dengan AI wajib memakai teks materi pembelajaran hasil ekstraksi Word/PDF.
- AI assistant saat coding tidak boleh menyimpan file materi asli.
- AI assistant harus menyediakan flow extract text sebelum create job AI.
- Job baru dimulai dari status `waiting`.
- Worker hanya mengambil job `waiting`.
- Job final tidak boleh kembali ke `processing`.
- Retry membuat Job baru.
- Regenerate/improve question membuat Job baru.
- Job harus menyimpan input snapshot yang cukup untuk audit dan retry.
- Output AI harus divalidasi sebelum disimpan ke database.
- Output AI harus masuk review Guru sebelum export.

AI feature yang memakai Kredit:

- Generate soal dengan AI pada assessment.
- Regenerate soal.
- Improve soal.
- Generate pembahasan.
- Generate kisi-kisi.

AI feature tidak boleh:

- Langsung mengubah assessment final tanpa review.
- Memakai provider tanpa error sanitization.
- Menyimpan credential provider di DB, response, audit, atau log publik.
- Mengirim prompt generate soal tanpa konteks materi pembelajaran.
- Menyimpan file Word/PDF materi pembelajaran.

## Database Rules

Rules:

- Ikuti `14_DATABASE_SCHEMA.md`.
- Field dan enum harus sesuai `16_DATA_DICTIONARY.md`.
- Gunakan UUID string untuk primary key.
- Timestamp konsisten memakai ISO-8601 UTC.
- Aktifkan foreign key SQLite.
- Jangan membuat kolom baru tanpa alasan dan update docs.
- Jangan menyimpan data sensitif seperti password plain text, token, API key, atau JWT secret.
- Jangan menyimpan file materi pembelajaran; simpan teks hasil ekstraksi hanya jika diperlukan oleh schema/rules.
- Questions harus mendukung `image_url` opsional.

Data yang tidak boleh diubah manual:

- `credit_transactions` yang sudah success.
- `audit_logs`.
- Job final kecuali untuk koreksi administratif yang terdokumentasi.

## Error Handling Rules

Rules:

- Gunakan error code dari `18_ERROR_CODES.md`.
- Jangan membuat error code baru jika existing sudah sesuai.
- Error user harus aman, jelas, dan singkat.
- Error provider AI harus disanitasi.
- Stack trace hanya boleh masuk log internal.
- Field-level validation harus masuk `error.details.fields`.
- Permission denied menggunakan pesan aman `Akses tidak tersedia.`

Untuk Kredit kurang, response harus menyertakan detail aman:

```json
{
  "available_credit": 8,
  "required_credit": 20
}
```

## Security Rules

Rules:

- Password harus disimpan sebagai hash.
- Jangan commit credential.
- Jangan tampilkan `password_hash` di response.
- Jangan tampilkan path file internal mentah.
- Jangan tampilkan API key, token, prompt rahasia, atau provider secret.
- Validate file upload jika fitur upload dibuat.
- File export hanya boleh diakses owner atau Admin sesuai rule.
- Backend selalu menjadi sumber kebenaran permission.

## UI/UX Implementation Rules

Rules:

- UI harus terasa clear, fresh, dan mudah dipahami Guru.
- Kredit harus transparan sebelum proses AI berjalan.
- Tampilkan estimasi Kredit, saldo tersedia, dan konsekuensi aksi.
- Jangan membuat user bingung apakah proses memakai Kredit atau tidak.
- Error state harus memberi next action.
- Empty state harus membantu user lanjut ke aksi berikutnya.
- Admin UI harus fokus ke management user, Kredit, Jobs, dan audit.
- Guru UI harus fokus ke generate, review, edit, export, dan riwayat Kredit.

## Testing Rules

Minimal test untuk backend:

- Auth login active/inactive user.
- Role Admin/Guru.
- Ownership Guru.
- Kredit cukup/tidak cukup.
- Admin credit adjustment.
- Job success charge Kredit.
- Job failed tidak charge atau refund.
- Validation error shape.
- Error code mapping.

Minimal test untuk frontend:

- Route guard Admin/Guru.
- Form validation pembuatan assessment dan Job AI.
- Credit estimate display.
- Insufficient credit state.
- Assessment review/edit flow.
- Export flow.
- API error rendering.

## Assessmentation Update Rules

Jika implementasi mengubah kontrak, AI assistant wajib memperbarui docs terkait:

- API berubah: update `17_API_CONTRACT.md`.
- Error code berubah: update `18_ERROR_CODES.md`.
- Schema berubah: update `14_DATABASE_SCHEMA.md`, `15_ENTITY_RELATIONSHIP.md`, dan `16_DATA_DICTIONARY.md`.
- Business rule berubah: update `07_BUSINESS_RULES.md`.
- Page/component berubah: update `05_COMPONENT_SPEC.md` dan `06_PAGE_SPEC.md`.

## Implementation Checklist

Sebelum menganggap task selesai, AI assistant harus memastikan:

- Kode mengikuti docs yang relevan.
- Role Admin/Guru diterapkan.
- Ownership Guru diterapkan.
- Sistem Kredit tidak bisa dilewati.
- Proses AI lewat Job.
- Error response konsisten.
- Tidak ada field sensitif di response.
- Tidak ada `any` tanpa alasan.
- Tidak ada duplicate logic besar.
- Operasi Kredit memakai transaction.
- UI menampilkan state loading/error/empty/success yang jelas.
- Docs diperbarui jika behavior berubah.
