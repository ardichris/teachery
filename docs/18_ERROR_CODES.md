# Error Codes

Dokumen ini mendefinisikan error code Teachery berdasarkan API contract, business rules, data dictionary, dan sistem Kredit.

Tujuan error code:

- Membuat response API konsisten.
- Membantu frontend menampilkan pesan yang jelas.
- Mencegah detail sensitif bocor ke user.
- Membantu backend logging, audit, dan debugging.
- Menyamakan behavior untuk role `Admin` dan `Guru`.

## Standard Error Response

Semua error API harus memakai format berikut:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data tidak valid",
    "details": {}
  }
}
```

Field:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `error.code` | string | Yes | Kode error stabil untuk frontend dan logging. |
| `error.message` | string | Yes | Pesan aman yang boleh ditampilkan ke user. |
| `error.details` | object | No | Detail field atau konteks aman. Jangan isi credential atau provider secret. |

Rules:

- `code` memakai uppercase snake case.
- `message` harus aman untuk user.
- `details` hanya berisi informasi yang membantu UI memperbaiki input.
- Error internal/provider tidak boleh membocorkan API key, token, prompt rahasia, stack trace, atau query SQL mentah.

## HTTP Status Mapping

| HTTP Status | Usage |
| --- | --- |
| `400` | Request body/query/path invalid secara format. |
| `401` | User belum login, token invalid, atau token expired. |
| `403` | Role tidak sesuai, user inactive, atau akses ditolak. |
| `404` | Resource tidak ditemukan atau sengaja disamarkan karena ownership gagal. |
| `409` | Conflict data atau state transition tidak valid. |
| `422` | Business rule gagal, misalnya Kredit kurang. |
| `429` | Rate limit atau terlalu banyak request. |
| `500` | Error server tak terduga. |
| `502` | Provider eksternal gagal atau response tidak valid. |
| `503` | Service sementara tidak tersedia. |

## Auth Error Codes

| Code | HTTP | User Message | Trigger | Frontend Action |
| --- | --- | --- | --- | --- |
| `UNAUTHENTICATED` | 401 | Sesi tidak valid. Silakan login ulang. | Token tidak ada, invalid, atau expired. | Redirect ke login. |
| `INVALID_CREDENTIALS` | 401 | Email atau password tidak sesuai. | Login gagal. | Tampilkan error di form login. |
| `INACTIVE_USER` | 403 | Akun kamu sedang nonaktif. Hubungi Admin. | User status `inactive`. | Logout session dan tampilkan pesan. |
| `TOKEN_EXPIRED` | 401 | Sesi sudah berakhir. Silakan login ulang. | JWT expired. | Refresh token jika ada, atau redirect login. |
| `TOKEN_INVALID` | 401 | Sesi tidak valid. Silakan login ulang. | JWT rusak/signature invalid. | Hapus token lokal dan redirect login. |

Backend notes:

- Login gagal tidak boleh memberi tahu apakah email terdaftar atau tidak.
- User inactive harus ditolak pada semua endpoint protected.
- `password_hash` tidak boleh pernah masuk response.

## Authorization Error Codes

| Code | HTTP | User Message | Trigger | Frontend Action |
| --- | --- | --- | --- | --- |
| `UNAUTHORIZED` | 403 | Akses tidak tersedia. | Role tidak punya izin endpoint. | Tampilkan access denied atau redirect dashboard. |
| `ADMIN_REQUIRED` | 403 | Akses hanya tersedia untuk Admin. | Non-Admin membuka endpoint Admin. | Redirect ke dashboard Guru. |
| `GURU_REQUIRED` | 403 | Akses hanya tersedia untuk Guru. | Admin atau role lain membuka endpoint khusus Guru. | Redirect sesuai role. |
| `OWNERSHIP_REQUIRED` | 404 | Data tidak ditemukan. | Guru membuka data milik user lain. | Tampilkan not found. |
| `LAST_ACTIVE_ADMIN_REQUIRED` | 422 | Minimal harus ada satu Admin aktif. | Admin terakhir dinonaktifkan atau role-nya diubah. | Tampilkan pesan di form Admin. |

Backend notes:

- Untuk resource milik Guru, gunakan `404 RESOURCE_NOT_FOUND` atau `OWNERSHIP_REQUIRED` yang dipetakan ke 404 jika ingin menyamarkan keberadaan data.
- Frontend guard bukan pengganti validasi backend.

## Validation Error Codes

| Code | HTTP | User Message | Trigger | Frontend Action |
| --- | --- | --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Data tidak valid. | Field wajib kosong, tipe salah, format salah. | Tampilkan error per field. |
| `INVALID_EMAIL_FORMAT` | 400 | Format email tidak valid. | Email tidak sesuai format. | Fokus ke field email. |
| `DUPLICATE_EMAIL` | 409 | Email sudah digunakan. | Email user sudah terdaftar. | Tampilkan error di field email. |
| `INVALID_ENUM_VALUE` | 400 | Pilihan tidak valid. | Role/status/type/status tidak sesuai enum. | Reset pilihan ke nilai valid. |
| `INVALID_DATE_RANGE` | 400 | Rentang tanggal tidak valid. | `date_from` lebih besar dari `date_to`. | Minta user memperbaiki filter. |
| `INVALID_PAGINATION` | 400 | Pagination tidak valid. | `page < 1`, `limit < 1`, atau `limit > 100`. | Reset ke default pagination. |
| `INVALID_JSON_FIELD` | 400 | Format data tidak valid. | Field `_json` tidak bisa diparse. | Tampilkan pesan umum. |
| `INVALID_IMAGE_URL` | 400 | Link gambar tidak valid. | `image_url` bukan URL valid/aman. | Tampilkan error field image URL. |

## Material Extraction Error Codes

| Code | HTTP | User Message | Trigger | Frontend Action |
| --- | --- | --- | --- | --- |
| `MATERIAL_REQUIRED` | 400 | Materi pembelajaran wajib untuk generate AI. | Mode AI tanpa materi. | Minta user upload Word/PDF. |
| `MATERIAL_FORMAT_UNSUPPORTED` | 415 | Format materi tidak didukung. Gunakan PDF atau Word. | File bukan PDF/DOC/DOCX. | Tampilkan format yang didukung. |
| `MATERIAL_EXTRACTION_FAILED` | 422 | Materi tidak dapat dibaca. Upload file lain atau buat soal manual. | Extract text gagal. | Tawarkan upload ulang/manual. |
| `MATERIAL_TEXT_EMPTY` | 422 | Materi tidak memiliki teks yang dapat dibaca. | Extract berhasil tapi teks kosong. | Minta file lain. |
| `MATERIAL_FILE_TOO_LARGE` | 413 | Ukuran materi terlalu besar. | File melebihi limit. | Minta file lebih kecil. |

Recommended `details` untuk validation:

```json
{
  "fields": {
    "email": "Email wajib diisi",
    "question_count": "Jumlah soal harus lebih dari 0"
  }
}
```

## Credit Error Codes

| Code | HTTP | User Message | Trigger | Frontend Action |
| --- | --- | --- | --- | --- |
| `INSUFFICIENT_CREDIT` | 422 | Kredit tidak cukup. | Saldo kurang dari estimasi job. | Tampilkan saldo, estimasi, dan arahan hubungi Admin. |
| `CREDIT_ESTIMATE_FAILED` | 422 | Estimasi Kredit gagal dihitung. | Input AI tidak cukup atau rule estimasi gagal. | Minta user cek form generate. |
| `INVALID_CREDIT_AMOUNT` | 400 | Jumlah Kredit tidak valid. | Amount 0, tanda salah, atau bukan integer. | Tampilkan error field amount. |
| `NEGATIVE_BALANCE_NOT_ALLOWED` | 422 | Saldo akhir tidak boleh negatif. | Admin subtract melebihi saldo user. | Tampilkan preview saldo akhir. |
| `CREDIT_REASON_REQUIRED` | 400 | Alasan perubahan Kredit wajib diisi. | Admin adjustment tanpa reason. | Fokus ke field reason. |
| `CREDIT_TRANSACTION_FAILED` | 500 | Transaksi Kredit gagal diproses. | Insert ledger atau update balance gagal. | Tampilkan pesan gagal dan retry aman. |
| `CREDIT_TRANSACTION_IMMUTABLE` | 409 | Transaksi Kredit tidak dapat diubah. | Ada upaya edit transaksi success. | Tampilkan pesan immutable. |
| `CREDIT_REFUND_FAILED` | 500 | Refund Kredit gagal diproses. | Refund untuk job gagal tidak bisa dibuat. | Tampilkan pesan support; backend alert. |

Backend notes:

- Perubahan saldo harus selalu bersama `credit_transactions`.
- Admin adjustment wajib masuk audit log.
- AI charge sukses harus terkait job jika transaksi berasal dari job.
- Koreksi transaksi dibuat sebagai transaksi baru, bukan edit transaksi lama.

Example:

```json
{
  "error": {
    "code": "INSUFFICIENT_CREDIT",
    "message": "Kredit tidak cukup.",
    "details": {
      "available_credit": 8,
      "required_credit": 20
    }
  }
}
```

## Job Error Codes

| Code | HTTP | User Message | Trigger | Frontend Action |
| --- | --- | --- | --- | --- |
| `JOB_NOT_FOUND` | 404 | Job tidak ditemukan. | Job tidak ada atau bukan milik user. | Tampilkan not found. |
| `INVALID_JOB_STATE` | 409 | Status job tidak valid untuk aksi ini. | Retry job yang belum final, transition tidak sah. | Refresh data job. |
| `JOB_ALREADY_PROCESSING` | 409 | Job sedang diproses. | Aksi konflik saat status `processing`. | Disable aksi dan polling status. |
| `JOB_ALREADY_COMPLETED` | 409 | Job sudah selesai. | Retry atau cancel job completed. | Arahkan ke hasil assessment. |
| `JOB_RETRY_NOT_ALLOWED` | 422 | Job ini tidak dapat dicoba ulang. | Retry status selain `failed`/`partially_failed`. | Sembunyikan tombol retry. |
| `JOB_INPUT_INVALID` | 400 | Input job tidak valid. | Snapshot/input generate tidak lengkap. | Tampilkan error form. |
| `JOB_FINALIZATION_FAILED` | 500 | Job selesai tetapi gagal disimpan. | Output/credit/Assessment finalization gagal. | Backend rollback/alert; UI tampilkan retry support. |

Backend notes:

- Job final tidak boleh kembali ke `processing`.
- Retry harus membuat job baru.
- Job gagal total tidak boleh memotong Kredit.
- Job gagal sebagian hanya memotong Kredit output yang berhasil.

## AI Provider Error Codes

| Code | HTTP | User Message | Trigger | Frontend Action |
| --- | --- | --- | --- | --- |
| `AI_PROVIDER_ERROR` | 502 | Generate gagal. Coba lagi beberapa saat. | Provider AI mengembalikan error umum. | Tampilkan retry. |
| `AI_PROVIDER_TIMEOUT` | 503 | Generate terlalu lama. Coba lagi. | Timeout request provider. | Tampilkan retry. |
| `AI_PROVIDER_RATE_LIMITED` | 429 | Layanan sedang sibuk. Coba lagi nanti. | Provider rate limit. | Tampilkan cooldown. |
| `AI_RESPONSE_INVALID` | 502 | Hasil AI tidak dapat diproses. | Response AI tidak sesuai schema. | Tampilkan retry; backend log payload aman. |
| `AI_CONTENT_REJECTED` | 422 | Konten tidak dapat diproses oleh AI. | Input ditolak policy/provider. | Minta user ubah materi/instruksi. |

Backend notes:

- Jangan kirim error mentah provider ke frontend.
- Jangan simpan API key, token, atau credential di error details.
- Jika Kredit sudah di-charge sebelum error final, buat refund.

## Assessment Error Codes

| Code | HTTP | User Message | Trigger | Frontend Action |
| --- | --- | --- | --- | --- |
| `Assessment_NOT_FOUND` | 404 | assessment tidak ditemukan. | assessment tidak ada atau bukan milik user. | Tampilkan not found. |
| `INVALID_Assessment_STATE` | 409 | Status assessment tidak valid untuk aksi ini. | Export saat assessment belum siap. | Refresh assessment dan tampilkan state. |
| `Assessment_UPDATE_FAILED` | 500 | assessment gagal diperbarui. | Update DB gagal. | Tampilkan retry. |
| `QUESTION_NOT_FOUND` | 404 | Soal tidak ditemukan. | Question tidak ada di assessment. | Refresh assessment. |
| `QUESTION_NUMBER_DUPLICATE` | 409 | Nomor soal sudah digunakan. | `number` duplikat dalam assessment. | Tampilkan error field number. |
| `QUESTION_OPTION_REQUIRED` | 400 | Pilihan jawaban wajib diisi. | Multiple choice tanpa minimal 2 opsi. | Tampilkan error di editor opsi. |
| `QUESTION_CORRECT_ANSWER_REQUIRED` | 400 | Jawaban benar wajib dipilih. | Multiple choice tanpa opsi benar. | Fokus ke pilihan jawaban. |
| `QUESTION_IMAGE_URL_INVALID` | 400 | Link gambar ilustrasi tidak valid. | `image_url` tidak valid atau tidak aman. | Fokus ke field gambar. |
| `QUESTION_DELETE_FAILED` | 500 | Soal gagal dihapus. | Delete question/options gagal. | Tampilkan retry. |

Backend notes:

- Edit manual assessment/soal tidak memakai Kredit.
- Hapus soal tidak mengembalikan Kredit.
- Guru hanya dapat mengubah assessment miliknya.

## Export Error Codes

| Code | HTTP | User Message | Trigger | Frontend Action |
| --- | --- | --- | --- | --- |
| `EXPORT_NOT_FOUND` | 404 | Export tidak ditemukan. | Export tidak ada atau bukan milik user. | Tampilkan not found. |
| `EXPORT_FAILED` | 500 | Export gagal dibuat. | Renderer/file generation gagal. | Tampilkan retry. |
| `EXPORT_NOT_READY` | 409 | File belum siap diunduh. | Download saat status belum completed. | Polling status export. |
| `EXPORT_FORMAT_UNSUPPORTED` | 400 | Format export tidak didukung. | Output type bukan `pdf`, `docx`, `xlsx`, atau `csv`. | Tampilkan error output type. |
| `EXPORT_OUTPUT_REQUIRED` | 400 | Minimal satu output harus dipilih. | `output_types` kosong. | Fokus ke pilihan output. |
| `EXPORT_FILE_MISSING` | 500 | File export tidak ditemukan. | DB completed tapi file fisik hilang. | Tampilkan pesan support; backend alert. |

Backend notes:

- Export standar tidak memakai Kredit.
- Export dengan AI tambahan harus lewat job dan estimasi Kredit.
- Internal `file_path` tidak boleh diekspos mentah.

## Admin Error Codes

| Code | HTTP | User Message | Trigger | Frontend Action |
| --- | --- | --- | --- | --- |
| `USER_NOT_FOUND` | 404 | User tidak ditemukan. | Admin membuka user yang tidak ada. | Tampilkan not found. |
| `USER_CREATE_FAILED` | 500 | User gagal dibuat. | Insert user/balance gagal. | Tampilkan retry. |
| `USER_UPDATE_FAILED` | 500 | User gagal diperbarui. | Update user gagal. | Tampilkan retry. |
| `USER_STATUS_CHANGE_FAILED` | 500 | Status user gagal diubah. | Update status/audit gagal. | Tampilkan retry. |
| `USER_ROLE_CHANGE_FAILED` | 500 | Role user gagal diubah. | Update role/audit gagal. | Tampilkan retry. |
| `ADMIN_REASON_REQUIRED` | 400 | Alasan wajib diisi. | Perubahan role/status/kredit tanpa reason. | Fokus ke field reason. |

Backend notes:

- Perubahan role/status penting wajib audit.
- Tidak boleh ada kondisi tanpa Admin aktif.
- User inactive tetap disimpan untuk audit.

## Audit Error Codes

| Code | HTTP | User Message | Trigger | Frontend Action |
| --- | --- | --- | --- | --- |
| `AUDIT_LOG_NOT_FOUND` | 404 | Audit log tidak ditemukan. | Admin membuka audit id yang tidak ada. | Tampilkan not found. |
| `AUDIT_WRITE_FAILED` | 500 | Audit gagal dicatat. | Insert audit log gagal. | Tampilkan error; backend alert. |
| `AUDIT_LOG_IMMUTABLE` | 409 | Audit log tidak dapat diubah. | Upaya update/delete audit log. | Tampilkan pesan immutable. |

Backend notes:

- Audit log append-only.
- Jika audit wajib gagal pada operasi sensitif, operasi utama sebaiknya rollback.
- Metadata audit tidak boleh menyimpan secret.

## System Error Codes

| Code | HTTP | User Message | Trigger | Frontend Action |
| --- | --- | --- | --- | --- |
| `INTERNAL_SERVER_ERROR` | 500 | Terjadi kendala pada server. Coba lagi. | Error tak terduga. | Tampilkan retry atau pesan umum. |
| `SERVICE_UNAVAILABLE` | 503 | Layanan sedang tidak tersedia. Coba lagi nanti. | Maintenance/dependency down. | Tampilkan state sementara. |
| `DATABASE_ERROR` | 500 | Data gagal diproses. Coba lagi. | Query/transaction DB gagal. | Tampilkan retry; backend alert. |
| `FOREIGN_KEY_CONSTRAINT_FAILED` | 409 | Data terkait tidak valid. | FK tidak terpenuhi. | Refresh data dan validasi ulang. |
| `RATE_LIMITED` | 429 | Terlalu banyak request. Coba lagi nanti. | Rate limit aplikasi. | Disable submit sementara. |
| `REQUEST_TOO_LARGE` | 413 | Ukuran request terlalu besar. | Upload/payload melebihi limit. | Minta user kecilkan file/input. |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Format file tidak didukung. | Upload file MIME tidak valid. | Tampilkan daftar format yang didukung. |

Backend notes:

- Stack trace hanya masuk server log internal.
- Pesan user harus tetap pendek dan aman.
- Gunakan correlation id/request id di log jika tersedia.

## Field-Level Validation Details

Untuk error validasi, response boleh menyertakan field-level errors:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data tidak valid",
    "details": {
      "fields": {
        "email": "Email wajib diisi",
        "role": "Role harus admin atau guru",
        "input.question_count": "Jumlah soal harus lebih dari 0"
      }
    }
  }
}
```

Rules:

- Key field mengikuti nama request body.
- Pesan field boleh menggunakan Bahasa Indonesia.
- Jangan kirim value sensitif kembali dalam details.

## Safe User Messages

Gunakan pesan aman berikut untuk UI:

| Situation | Message |
| --- | --- |
| Permission denied | Akses tidak tersedia. |
| Not found | Data tidak ditemukan. |
| Invalid form | Data tidak valid. Periksa kembali isianmu. |
| Insufficient credit | Kredit tidak cukup. |
| AI failed | Generate gagal. Coba lagi beberapa saat. |
| Export failed | Export gagal dibuat. Coba lagi. |
| Server error | Terjadi kendala pada server. Coba lagi. |

## Logging and Audit Rules

Error yang wajib masuk log backend:

- `INTERNAL_SERVER_ERROR`
- `DATABASE_ERROR`
- `AI_PROVIDER_ERROR`
- `AI_RESPONSE_INVALID`
- `JOB_FINALIZATION_FAILED`
- `CREDIT_TRANSACTION_FAILED`
- `CREDIT_REFUND_FAILED`
- `AUDIT_WRITE_FAILED`
- `EXPORT_FILE_MISSING`

Error yang wajib dipertimbangkan untuk audit:

- Login gagal berulang.
- User dibuat/diubah/dinonaktifkan.
- Role user berubah.
- Kredit ditambah atau dikurangi Admin.
- AI charge dan AI refund.
- Job selesai/gagal.
- Akses Admin ditolak berulang jika fitur keamanan diaktifkan.

Rules:

- Log internal boleh menyimpan stack trace, tetapi tidak boleh menyimpan secret.
- Audit log menyimpan metadata ringkas dan aman.
- Error details untuk frontend harus lebih sedikit daripada log internal.

## Frontend Handling Guidelines

Frontend sebaiknya:

- Menggunakan `error.code` untuk menentukan behavior.
- Menggunakan `error.message` untuk toast atau inline message.
- Menggunakan `error.details.fields` untuk field-level form error.
- Redirect login untuk `UNAUTHENTICATED`, `TOKEN_EXPIRED`, dan `TOKEN_INVALID`.
- Menampilkan access denied untuk `UNAUTHORIZED` dan `ADMIN_REQUIRED`.
- Menampilkan modal Kredit kurang untuk `INSUFFICIENT_CREDIT`.
- Polling ulang untuk `EXPORT_NOT_READY`.
- Refresh data untuk `INVALID_JOB_STATE` dan `INVALID_Assessment_STATE`.

Frontend tidak boleh:

- Mengandalkan teks `message` sebagai logic utama.
- Menampilkan raw `details` tanpa filtering.
- Menganggap hidden menu sebagai security control.

## Backend Handling Guidelines

Backend sebaiknya:

- Membuat error helper agar semua response konsisten.
- Mapping domain error ke HTTP status dan error code secara eksplisit.
- Menyembunyikan resource milik user lain dengan 404 jika strategi keamanan dipilih.
- Melakukan rollback transaction jika operasi kredit, job finalization, atau audit wajib gagal.
- Mengubah error provider AI menjadi error aman.
- Menulis log internal dengan context aman.

## Error Code Acceptance Checklist

Error handling dianggap siap jika:

- Semua error response memakai shape standar.
- Error code stabil dan tidak berubah tanpa alasan.
- Auth, role, ownership, Kredit, job, assessment, export, admin, audit, dan system error tercakup.
- Pesan user aman dan tidak membocorkan detail internal.
- Field validation dapat ditampilkan di form frontend.
- Kredit kurang memiliki detail saldo dan kebutuhan Kredit.
- Job gagal tidak memotong Kredit, atau membuat refund jika perlu.
- Admin action yang gagal tidak meninggalkan ledger/audit tidak konsisten.
- Error provider AI disanitasi.
- Backend log menyimpan detail cukup untuk debugging tanpa secret.
