# Data Dictionary

Dokumen ini mendefinisikan kamus data Teachery berdasarkan `14_DATABASE_SCHEMA.md`, `15_ENTITY_RELATIONSHIP.md`, business rules, dan service boundaries sebelumnya.

Data dictionary ini menjadi rujukan untuk:

- Backend model dan repository.
- API request/response.
- Validasi form frontend.
- Audit dan debugging.
- Konsistensi istilah antar developer.

## General Conventions

Aturan umum:

- Primary key memakai UUID string.
- Timestamp memakai format ISO-8601 UTC string.
- Field berakhiran `_json` disimpan sebagai TEXT berisi JSON valid.
- Field `created_at` diisi saat row dibuat.
- Field `updated_at` diubah setiap row diperbarui.
- Nilai enum harus mengikuti daftar yang didefinisikan di Dokumen ini.
- Data credential seperti password asli, JWT secret, dan AI API key tidak boleh disimpan di tabel aplikasi.
- File materi pembelajaran Word/PDF untuk AI tidak disimpan; sistem hanya memakai teks hasil ekstraksi.
- URL gambar ilustrasi soal disimpan sebagai URL eksternal, bukan file upload.

Notation:

- `PK`: Primary Key.
- `FK`: Foreign Key.
- `Required`: wajib diisi.
- `Nullable`: boleh kosong.
- `Unique`: harus unik.
- `System`: diisi oleh sistem, bukan input langsung dari user.

## Table: users

Menyimpan akun pengguna aplikasi, baik Admin maupun Guru.

| Field | Type | Required | Key | Description | Validation / Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | TEXT | Yes | PK | ID unik user. | UUID string. |
| `name` | TEXT | Yes | - | Nama tampilan user. | 2-100 karakter. |
| `email` | TEXT | Yes | Unique | Email untuk login. | Lowercase, format email valid, unik. |
| `password_hash` | TEXT | Yes | - | Hash password. | Tidak boleh menyimpan plain password. |
| `role` | TEXT | Yes | Index | Role user. | Enum: `admin`, `guru`. |
| `status` | TEXT | Yes | Index | Status akun. | Enum: `active`, `inactive`. |
| `created_at` | TEXT | Yes | - | Waktu user dibuat. | System generated. |
| `updated_at` | TEXT | Yes | - | Waktu terakhir user diperbarui. | System generated. |

Business rules:

- Minimal harus ada satu Admin aktif.
- User inactive tidak boleh login.
- Guru hanya boleh mengakses resource miliknya sendiri.
- Admin boleh mengelola user dan kredit.

Sensitive fields:

- `password_hash` tidak boleh muncul di API response.

## Table: credit_balances

Menyimpan saldo Kredit terkini per user.

| Field | Type | Required | Key | Description | Validation / Notes |
| --- | --- | --- | --- | --- | --- |
| `user_id` | TEXT | Yes | PK, FK | User pemilik saldo. | References `users.id`. |
| `balance` | INTEGER | Yes | - | Saldo Kredit saat ini. | Default `0`, tidak boleh negatif. |
| `updated_at` | TEXT | Yes | - | Waktu saldo terakhir berubah. | System generated. |

Business rules:

- Satu user hanya memiliki satu row balance.
- Perubahan `balance` wajib disertai row baru di `credit_transactions`.
- Update saldo dan insert transaksi harus berada dalam satu database transaction.
- Saldo dapat dihitung ulang dari ledger jika diperlukan.

## Table: credit_transactions

Menyimpan ledger semua perubahan Kredit.

| Field | Type | Required | Key | Description | Validation / Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | TEXT | Yes | PK | ID transaksi kredit. | UUID string. |
| `user_id` | TEXT | Yes | FK, Index | User yang saldonya berubah. | References `users.id`. |
| `amount` | INTEGER | Yes | - | Jumlah perubahan Kredit. | Positif untuk masuk, negatif untuk keluar. |
| `type` | TEXT | Yes | Index | Jenis transaksi. | Enum: `ai_charge`, `ai_refund`, `admin_add`, `admin_subtract`. |
| `status` | TEXT | Yes | Index | Status transaksi. | Enum: `pending`, `success`, `failed`, `refunded`. |
| `job_id` | TEXT | No | FK, Index | Job terkait transaksi. | Required untuk AI charge/refund jika terkait job. |
| `assessment_id` | TEXT | No | FK, Index | assessment terkait transaksi. | Nullable. |
| `actor_user_id` | TEXT | Yes | FK | User yang memicu transaksi. | References `users.id`. |
| `actor_role` | TEXT | Yes | - | Role aktor saat transaksi dibuat. | Enum: `admin`, `guru`, `system`. |
| `reason` | TEXT | No | - | Alasan transaksi. | Wajib untuk `admin_add` dan `admin_subtract`. |
| `created_at` | TEXT | Yes | Index | Waktu transaksi dibuat. | System generated. |
| `updated_at` | TEXT | Yes | - | Waktu transaksi diperbarui. | System generated. |

Business rules:

- `ai_charge` harus memakai `amount` negatif.
- `ai_refund` harus memakai `amount` positif.
- `admin_add` harus memakai `amount` positif.
- `admin_subtract` harus memakai `amount` negatif.
- Transaksi sukses tidak boleh diedit manual.
- Koreksi transaksi harus dibuat sebagai transaksi baru.
- Semua pemakaian AI yang berhasil harus memiliki transaksi kredit.

Notes:

- `actor_role = system` dapat dipakai untuk proses worker, tetapi `actor_user_id` tetap perlu strategi implementasi, misalnya memakai system user internal atau actor user pemilik job.
- Jika `status = refunded`, harus ada transaksi refund terpisah atau referensi audit yang menjelaskan koreksi.

## Table: jobs

Menyimpan proses AI asynchronous.

| Field | Type | Required | Key | Description | Validation / Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | TEXT | Yes | PK | ID job AI. | UUID string. |
| `owner_user_id` | TEXT | Yes | FK, Index | Guru pemilik job. | References `users.id`. |
| `type` | TEXT | Yes | Index | Jenis job AI. | Enum job type. |
| `status` | TEXT | Yes | Index | Status pemrosesan job. | Enum job status. |
| `input_snapshot_json` | TEXT | Yes | - | Snapshot input saat job dibuat. | JSON valid, cukup untuk audit/retry. |
| `estimated_credit` | INTEGER | Yes | - | Estimasi Kredit sebelum job diproses. | Default `0`, tidak boleh negatif. |
| `actual_credit` | INTEGER | Yes | - | Kredit aktual yang dipakai. | Default `0`, tidak boleh negatif. |
| `credit_status` | TEXT | Yes | - | Status billing Kredit untuk job. | Enum credit status. |
| `error_message` | TEXT | No | - | Pesan error jika job gagal. | Jangan simpan credential/provider secret. |
| `created_at` | TEXT | Yes | Index | Waktu job dibuat. | System generated. |
| `updated_at` | TEXT | Yes | - | Waktu job diperbarui. | System generated. |
| `completed_at` | TEXT | No | - | Waktu job selesai. | Diisi saat completed/failed final. |

Job type enum:

- `generate_questions`
- `regenerate_question`
- `improve_question`
- `generate_explanation`
- `generate_blueprint`

Job status enum:

- `waiting`
- `processing`
- `completed`
- `failed`
- `partially_failed`

Credit status enum:

- `not_charged`
- `reserved`
- `charged`
- `partially_charged`
- `refunded`

Business rules:

- Guru hanya boleh melihat job miliknya.
- Admin boleh melihat semua job.
- Worker hanya mengambil job berstatus `waiting`.
- Job final tidak boleh kembali ke `processing`.
- Retry membuat job baru.
- Untuk MVP, biaya dasar dapat memakai 1 soal berhasil dihasilkan AI = 1 Kredit.

## Table: assessments

Menyimpan assessment yang dibuat manual atau dengan AI.

| Field | Type | Required | Key | Description | Validation / Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | TEXT | Yes | PK | ID assessment. | UUID string. |
| `owner_user_id` | TEXT | Yes | FK, Index | Guru pemilik assessment. | References `users.id`. |
| `source_job_id` | TEXT | No | FK, Index | Job AI sumber assessment. | Nullable untuk draft manual. |
| `title` | TEXT | Yes | - | Judul assessment. | 3-150 karakter. |
| `subject` | TEXT | Yes | - | Mata pelajaran. | Contoh: Matematika, IPA. |
| `grade` | TEXT | Yes | - | Kelas/jenjang. | Contoh: `Kelas 7`, `SMA 10`. |
| `creation_mode` | TEXT | Yes | - | Cara assessment dibuat. | Enum: `manual`, `ai`. |
| `material_text` | TEXT | No | - | Teks materi hasil ekstraksi Word/PDF. | Wajib untuk mode `ai`, nullable untuk manual. |
| `material_source_filename` | TEXT | No | - | Nama file sumber materi. | Untuk audit ringan; file asli tidak disimpan. |
| `material_extracted_at` | TEXT | No | - | Waktu teks materi berhasil diekstrak. | Nullable untuk manual. |
| `status` | TEXT | Yes | Index | Status assessment. | Enum Assessment status. |
| `created_at` | TEXT | Yes | - | Waktu assessment dibuat. | System generated. |
| `updated_at` | TEXT | Yes | Index | Waktu assessment diperbarui. | System generated. |

Assessment status enum:

- `draft`
- `generating`
- `needs_review`
- `ready_to_export`
- `exporting`
- `pdf_ready`
- `error`

Business rules:

- assessment wajib memiliki owner.
- Guru hanya boleh melihat assessment miliknya.
- Assessment manual tidak memakai Kredit.
- Assessment AI wajib memiliki materi pembelajaran yang berhasil diekstrak.
- File materi asli tidak boleh disimpan.
- assessment hasil AI masuk status `needs_review`.
- Export PDF tidak boleh mengubah isi assessment tanpa aksi user.
- Edit manual assessment tidak memotong Kredit.

## Table: questions

Menyimpan soal dalam assessment.

| Field | Type | Required | Key | Description | Validation / Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | TEXT | Yes | PK | ID soal. | UUID string. |
| `assessment_id` | TEXT | Yes | FK, Index | assessment pemilik soal. | References `assessments.id`, cascade delete. |
| `number` | INTEGER | Yes | Unique per Assessment | Nomor soal dalam assessment. | Harus lebih dari 0. |
| `type` | TEXT | Yes | - | Jenis soal. | Enum: `multiple_choice`, `essay`. |
| `difficulty` | TEXT | Yes | - | Tingkat kesulitan. | Enum: `easy`, `medium`, `hard`, `mixed`. |
| `prompt` | TEXT | Yes | - | Isi pertanyaan. | Tidak boleh kosong. |
| `image_url` | TEXT | No | - | Link gambar ilustrasi eksternal. | URL valid, opsional. |
| `correct_answer` | TEXT | No | - | Jawaban benar. | Nullable, terutama jika jawaban benar ada di options. |
| `explanation` | TEXT | No | - | Pembahasan jawaban. | Nullable jika tidak diminta. |
| `blueprint_item` | TEXT | No | - | Indikator/kisi-kisi terkait soal. | Nullable. |
| `created_at` | TEXT | Yes | - | Waktu soal dibuat. | System generated. |
| `updated_at` | TEXT | Yes | - | Waktu soal diperbarui. | System generated. |

Business rules:

- `number` harus unik dalam satu assessment.
- `image_url` opsional dan harus berupa URL aman.
- Sistem menyimpan URL gambar, bukan file gambar.
- Soal pilihan ganda wajib memiliki minimal 2 answer options.
- Soal pilihan ganda harus memiliki satu jawaban benar.
- Soal essay dapat memakai `correct_answer` tanpa answer options.
- Hapus soal tidak mengembalikan Kredit.
- Edit manual soal tidak memotong Kredit.

## Table: answer_options

Menyimpan pilihan jawaban untuk soal pilihan ganda.

| Field | Type | Required | Key | Description | Validation / Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | TEXT | Yes | PK | ID opsi jawaban. | UUID string. |
| `question_id` | TEXT | Yes | FK, Index | Soal pemilik opsi. | References `questions.id`, cascade delete. |
| `label` | TEXT | Yes | Unique per question | Label opsi. | Contoh: `A`, `B`, `C`, `D`. |
| `text` | TEXT | Yes | - | Isi opsi jawaban. | Tidak boleh kosong. |
| `is_correct` | INTEGER | Yes | - | Penanda jawaban benar. | `0` false, `1` true. |
| `created_at` | TEXT | Yes | - | Waktu opsi dibuat. | System generated. |
| `updated_at` | TEXT | Yes | - | Waktu opsi diperbarui. | System generated. |

Business rules:

- Label harus unik dalam satu question.
- Multiple choice minimal memiliki 2 opsi.
- Single-answer multiple choice hanya boleh memiliki satu opsi dengan `is_correct = 1`.
- Opsi ikut terhapus jika question dihapus.

## Table: exports

Menyimpan proses dan hasil export assessment.

| Field | Type | Required | Key | Description | Validation / Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | TEXT | Yes | PK | ID export. | UUID string. |
| `assessment_id` | TEXT | Yes | FK, Index | assessment yang diexport. | References `assessments.id`. |
| `owner_user_id` | TEXT | Yes | FK, Index | User pemilik export. | References `users.id`. |
| `output_types_json` | TEXT | Yes | - | Daftar format output. | JSON array, minimal satu item. |
| `status` | TEXT | Yes | Index | Status export. | Enum: `processing`, `completed`, `failed`. |
| `file_path` | TEXT | No | - | Lokasi file hasil export. | Nullable sampai export selesai. |
| `error_message` | TEXT | No | - | Pesan error export. | Diisi jika gagal. |
| `created_at` | TEXT | Yes | Index | Waktu export dibuat. | System generated. |
| `updated_at` | TEXT | Yes | - | Waktu export diperbarui. | System generated. |

Output type examples:

- `pdf`
- `docx`
- `xlsx`
- `csv`

Business rules:

- Minimal satu output type wajib dipilih.
- Export standar tanpa AI tambahan tidak memakai Kredit.
- Export gagal tidak memotong Kredit.
- File hanya dapat diakses owner atau Admin jika monitoring diaktifkan.

## Table: audit_logs

Menyimpan audit trail append-only.

| Field | Type | Required | Key | Description | Validation / Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | TEXT | Yes | PK | ID audit log. | UUID string. |
| `event_type` | TEXT | Yes | Index | Jenis event. | Gunakan nama event yang konsisten. |
| `actor_user_id` | TEXT | Yes | FK, Index | User yang melakukan aksi. | References `users.id`. |
| `actor_role` | TEXT | Yes | - | Role aktor saat event terjadi. | Enum: `admin`, `guru`, `system`. |
| `target_user_id` | TEXT | No | FK, Index | User target aksi. | Nullable. |
| `related_job_id` | TEXT | No | FK, Index | Job terkait event. | Nullable. |
| `related_transaction_id` | TEXT | No | FK, Index | Transaksi kredit terkait event. | Nullable. |
| `related_assessment_id` | TEXT | No | FK | assessment terkait event. | Nullable. |
| `metadata_json` | TEXT | No | - | Metadata tambahan. | JSON valid, tidak boleh berisi secret. |
| `created_at` | TEXT | Yes | Index | Waktu event dicatat. | System generated. |

Recommended event types:

- `user.created`
- `user.updated`
- `user.activated`
- `user.deactivated`
- `credit.admin_added`
- `credit.admin_subtracted`
- `credit.ai_charged`
- `credit.ai_refunded`
- `job.created`
- `job.started`
- `job.completed`
- `job.failed`
- `Assessment.created`
- `Assessment.updated`
- `Assessment.exported`

Business rules:

- Audit log append-only.
- Aktivitas Admin terhadap user dan kredit wajib masuk audit.
- Metadata tidak boleh menyimpan password, token, API key, atau secret.
- Audit log dipakai untuk support, investigasi, dan rekonsiliasi.

## Optional Table: material_extraction_events

Menyimpan log ekstraksi materi tanpa menyimpan file asli.

| Field | Type | Required | Key | Description | Validation / Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | TEXT | Yes | PK | ID event ekstraksi. | UUID string. |
| `owner_user_id` | TEXT | Yes | FK | User yang mengupload materi untuk ekstraksi. | References `users.id`. |
| `assessment_id` | TEXT | No | FK | Assessment terkait jika sudah dibuat. | References `assessments.id`. |
| `source_filename` | TEXT | Yes | - | Nama file materi. | Sanitized untuk display. |
| `mime_type` | TEXT | Yes | - | MIME type file. | Hanya Word/PDF yang didukung. |
| `extracted_text_length` | INTEGER | Yes | - | Panjang teks hasil ekstraksi. | 0 jika gagal. |
| `status` | TEXT | Yes | - | Status ekstraksi. | Enum: `success`, `failed`. |
| `error_message` | TEXT | No | - | Pesan error aman. | Nullable. |
| `created_at` | TEXT | Yes | - | Waktu event dibuat. | System generated. |

Business rules:

- File Word/PDF asli tidak disimpan.
- Tabel ini hanya menyimpan metadata ekstraksi.
- Job AI tidak boleh dibuat jika ekstraksi gagal atau teks kosong.

## Optional Table: job_events

Menyimpan timeline detail untuk job.

| Field | Type | Required | Key | Description | Validation / Notes |
| --- | --- | --- | --- | --- | --- |
| `id` | TEXT | Yes | PK | ID event job. | UUID string. |
| `job_id` | TEXT | Yes | FK | Job terkait. | References `jobs.id`, cascade delete. |
| `event_type` | TEXT | Yes | - | Jenis event job. | Contoh: `queued`, `provider_called`, `retry_scheduled`. |
| `message` | TEXT | No | - | Pesan singkat event. | Nullable. |
| `metadata_json` | TEXT | No | - | Metadata tambahan. | JSON valid, tidak boleh berisi secret. |
| `created_at` | TEXT | Yes | - | Waktu event dicatat. | System generated. |

Business rules:

- Dipakai untuk observability worker dan debugging.
- Tidak wajib muncul di UI MVP.

## Enum Reference

### User Role

| Value | Description |
| --- | --- |
| `admin` | Pengelola user, kredit, monitoring job, dan audit. |
| `guru` | Pengguna utama yang membuat soal dan assessment. |

### User Status

| Value | Description |
| --- | --- |
| `active` | User dapat login dan memakai aplikasi. |
| `inactive` | User tidak dapat login. |

### Credit Transaction Type

| Value | Description |
| --- | --- |
| `ai_charge` | Pemotongan Kredit untuk proses AI yang berhasil. |
| `ai_refund` | Pengembalian Kredit karena kegagalan/koreksi AI. |
| `admin_add` | Penambahan Kredit manual oleh Admin. |
| `admin_subtract` | Pengurangan Kredit manual oleh Admin. |

### Credit Transaction Status

| Value | Description |
| --- | --- |
| `pending` | Transaksi dibuat tapi belum final. |
| `success` | Transaksi berhasil dan sudah memengaruhi saldo. |
| `failed` | Transaksi gagal dan tidak memengaruhi saldo. |
| `refunded` | Transaksi sudah dikoreksi dengan refund. |

### Job Status

| Value | Description |
| --- | --- |
| `waiting` | Job menunggu diproses worker. |
| `processing` | Job sedang diproses. |
| `completed` | Job berhasil selesai. |
| `failed` | Job gagal total. |
| `partially_failed` | Job menghasilkan sebagian output, tetapi ada sebagian yang gagal. |

### Assessment Status

| Value | Description |
| --- | --- |
| `draft` | assessment masih draft. |
| `generating` | assessment sedang dibuat oleh AI. |
| `needs_review` | assessment sudah dibuat dan perlu dicek Guru. |
| `ready_to_export` | assessment siap diexport. |
| `exporting` | assessment sedang diexport. |
| `pdf_ready` | File PDF siap diunduh. |
| `error` | assessment mengalami error proses. |

## JSON Field Guidelines

### `jobs.input_snapshot_json`

Contoh isi:

```json
{
  "subject": "Matematika",
  "grade": "Kelas 7",
  "question_type": "multiple_choice",
  "question_count": 10,
  "difficulty": "medium",
  "include_explanation": true
}
```

Rules:

- Harus cukup untuk memahami input job saat audit.
- Jangan menyimpan prompt rahasia, API key, atau token provider.
- Jika ada file upload, simpan referensi file, bukan isi file besar.

### `exports.output_types_json`

Contoh isi:

```json
["pdf", "docx"]
```

Rules:

- Harus berupa JSON array.
- Minimal satu format.
- Format harus sesuai output type yang didukung.

### `audit_logs.metadata_json`

Contoh isi:

```json
{
  "before": {
    "status": "active"
  },
  "after": {
    "status": "inactive"
  },
  "reason": "User tidak lagi aktif mengajar"
}
```

Rules:

- Simpan data secukupnya untuk audit.
- Jangan menyimpan password, token, API key, atau payload AI penuh jika sensitif.

## API Exposure Rules

Field yang boleh dikirim ke frontend:

- `id`
- `name`
- `email`
- `role`
- `status`
- `balance`
- status job/Assessment/export
- data assessment, soal, dan opsi jawaban yang dimiliki user
- riwayat transaksi kredit yang relevan

Field yang tidak boleh dikirim:

- `password_hash`
- credential provider AI
- JWT secret
- internal file path jika tidak dibutuhkan
- metadata audit yang mengandung data sensitif

Field yang hanya boleh untuk Admin:

- daftar semua user
- transaksi kredit semua user
- audit logs
- job monitoring lintas user
- credit adjustment reason

## Validation Checklist

- Email valid dan unik.
- Role hanya `admin` atau `guru`.
- Status user hanya `active` atau `inactive`.
- Balance tidak negatif.
- AI charge selalu memiliki amount negatif.
- AI refund dan admin add selalu memiliki amount positif.
- Admin subtract selalu memiliki amount negatif.
- Reason wajib untuk adjustment Admin.
- Job AI memiliki estimated credit sebelum diproses.
- Job completed memiliki actual credit.
- assessment memiliki owner.
- Question number unik dalam assessment.
- Multiple choice memiliki minimal 2 opsi dan satu jawaban benar.
- Export memiliki minimal satu output type.
- Audit log tidak menyimpan secret.
