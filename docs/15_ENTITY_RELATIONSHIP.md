# Entity Relationship

Dokumen ini menjelaskan hubungan antar entitas utama Teachery berdasarkan product vision, business rules, service boundaries, API structure, dan database schema sebelumnya.

Fokus ERD ini adalah memastikan relasi data mendukung:

- Role `Admin` dan `Guru`.
- Sistem kredit untuk semua proses yang memakai AI.
- Pembuatan Job AI untuk generate soal pada assessment.
- Pembuatan assessment manual tanpa AI.
- Generate soal AI berdasarkan teks materi pembelajaran hasil ekstraksi.
- Penyimpanan assessment, soal, opsi jawaban, dan export.
- Link gambar ilustrasi eksternal per soal.
- Audit trail untuk aktivitas penting.

## Entity Relationship Overview

```txt
users
  |- credit_balances (1:1)
  |- credit_transactions (1:N as target user)
  |- credit_transactions (1:N as actor user)
  |- jobs (1:N)
  |- assessments (1:N)
  |- exports (1:N)
  `- audit_logs (1:N as actor/target)

jobs
  |- assessments (1:N, usually 1:1 for generate job)
  |- credit_transactions (1:N)
  `- audit_logs (0:N)

assessments
  |- questions (1:N)
  |- exports (1:N)
  |- credit_transactions (0:N)
  `- audit_logs (0:N)

questions
  `- answer_options (0:N)
```

## Entity Groups

### 1. User and Role

Mengatur identitas pengguna, role, status akun, dan hak akses.

Entitas utama:

- `users`

Role yang didukung:

- `admin`
- `guru`

Admin memiliki akses untuk mengelola user dan kredit. Guru hanya dapat mengakses data miliknya sendiri, kecuali data referensi umum yang memang dibuka untuk semua pengguna.

### 2. Credit and Transaction Ledger

Mengatur saldo kredit dan semua mutasi kredit.

Entitas utama:

- `credit_balances`
- `credit_transactions`

Semua proses yang memakai AI harus menghasilkan transaksi kredit, baik transaksi pemotongan, refund, maupun adjustment manual oleh Admin.

### 3. Job and AI Processing

Mengatur proses generate, status job, estimasi kredit, hasil penggunaan kredit, dan error jika AI gagal.

Entitas utama:

- `jobs`

Job menjadi penghubung antara permintaan Guru, pemakaian AI, pemotongan kredit, dan assessment yang menerima soal hasil AI.

### 4. Assessment and Question

Mengatur assessment, daftar pertanyaan, opsi jawaban, kunci jawaban, dan metadata.

Entitas utama:

- `assessments`
- `questions`
- `answer_options`

assessment dimiliki oleh Guru. Admin dapat melihat semua assessment untuk kebutuhan monitoring dan support.

### 5. Export

Mengatur riwayat export assessment ke format file tertentu.

Entitas utama:

- `exports`

Export standar tidak memotong kredit kecuali proses export tersebut memanggil AI tambahan, misalnya untuk rewriting, formatting otomatis berbasis AI, atau enrichment konten.

### 6. Audit

Mengatur catatan aktivitas penting untuk kebutuhan keamanan, support, dan investigasi.

Entitas utama:

- `audit_logs`

Audit log harus append-only dan tidak boleh diedit dari UI biasa.

## Relationship Matrix

| Source Entity | Relationship | Target Entity | Cardinality | Notes |
| --- | --- | --- | --- | --- |
| `users` | owns | `credit_balances` | 1:1 | Setiap user memiliki satu saldo kredit aktif. |
| `users` | is target of | `credit_transactions` | 1:N | User yang saldonya bertambah atau berkurang. |
| `users` | is actor of | `credit_transactions` | 1:N | User yang menyebabkan transaksi, misalnya Admin saat adjustment. |
| `users` | owns | `jobs` | 1:N | Guru dapat memiliki banyak job generate. |
| `users` | owns | `assessments` | 1:N | Guru dapat memiliki banyak assessment manual maupun berbantuan AI. |
| `users` | owns | `exports` | 1:N | Guru dapat melakukan banyak export. |
| `users` | is actor/target of | `audit_logs` | 1:N | Aktivitas Admin dan Guru dicatat sebagai audit. |
| `jobs` | creates/source of | `assessments` | 1:N | MVP umumnya satu job menghasilkan satu assessment. Regenerate dapat membuat job baru untuk assessment yang sama. |
| `jobs` | is billed by | `credit_transactions` | 1:N | Job AI memiliki transaksi kredit terkait charge atau refund. |
| `jobs` | is tracked by | `audit_logs` | 0:N | Perubahan status penting dapat dicatat. |
| `assessments` | contains | `questions` | 1:N | Satu assessment berisi banyak soal. |
| `questions` | has | `answer_options` | 0:N | Soal essay dapat memiliki 0 opsi; pilihan ganda harus memiliki minimal 2 opsi. |
| `assessments` | has | `exports` | 1:N | Satu assessment dapat diexport berkali-kali. |
| `assessments` | referenced by | `credit_transactions` | 0:N | Dipakai jika transaksi kredit terkait edit/generate berbasis assessment. |
| `assessments` | referenced by | `audit_logs` | 0:N | Aktivitas assessment dapat masuk audit. |
| `credit_transactions` | referenced by | `audit_logs` | 0:N | Adjustment atau refund penting perlu bisa dilacak. |

## Entity Detail

### users

Menyimpan data pengguna aplikasi.

Field penting:

- `id`
- `name`
- `email`
- `password_hash`
- `role`
- `status`
- `last_login_at`
- `created_at`
- `updated_at`

Relasi:

- `users.id` ke `credit_balances.user_id`
- `users.id` ke `credit_transactions.user_id`
- `users.id` ke `credit_transactions.actor_user_id`
- `users.id` ke `jobs.owner_user_id`
- `users.id` ke `assessments.owner_user_id`
- `users.id` ke `exports.owner_user_id`
- `users.id` ke `audit_logs.actor_user_id`
- `users.id` ke `audit_logs.target_user_id`

Rules:

- `email` harus unik.
- `role` hanya boleh `admin` atau `guru`.
- `status` minimal mendukung `active`, `inactive`, dan `invited`.
- Guru hanya dapat mengakses data miliknya sendiri.
- Admin dapat mengakses dan mengelola user serta kredit.
- Sistem sebaiknya mencegah kondisi tanpa Admin aktif.

### credit_balances

Menyimpan saldo kredit terakhir per user.

Field penting:

- `id`
- `user_id`
- `balance`
- `reserved_balance`
- `updated_at`

Relasi:

- `credit_balances.user_id` mengarah ke `users.id`

Rules:

- Satu user hanya boleh memiliki satu row balance.
- `balance` tidak boleh negatif.
- `reserved_balance` dipakai jika sistem ingin menahan kredit saat job mulai diproses.
- Update balance harus selalu dilakukan bersama insert `credit_transactions` dalam satu database transaction.

### credit_transactions

Menyimpan semua mutasi kredit.

Field penting:

- `id`
- `user_id`
- `actor_user_id`
- `job_id`
- `assessment_id`
- `type`
- `amount`
- `balance_before`
- `balance_after`
- `reason`
- `metadata_json`
- `created_at`

Relasi:

- `credit_transactions.user_id` mengarah ke `users.id`
- `credit_transactions.actor_user_id` mengarah ke `users.id`
- `credit_transactions.job_id` mengarah ke `jobs.id`
- `credit_transactions.assessment_id` mengarah ke `assessments.id`

Transaction type:

- `topup`
- `charge`
- `refund`
- `adjustment`
- `bonus`

Rules:

- `charge` memakai amount negatif.
- `topup`, `refund`, `adjustment positif`, dan `bonus` memakai amount positif.
- Setiap pemakaian AI yang berhasil harus memiliki transaksi `charge`.
- Job yang gagal sebelum menghasilkan output tidak boleh memotong kredit.
- Jika kredit sudah terpotong tetapi job gagal, sistem harus membuat transaksi `refund`.
- Adjustment manual harus dilakukan oleh Admin dan wajib memiliki reason.

### jobs

Menyimpan permintaan proses AI dan status pemrosesan.

Field penting:

- `id`
- `owner_user_id`
- `type`
- `status`
- `prompt_snapshot`
- `input_json`
- `credit_estimate`
- `credit_actual`
- `ai_provider`
- `ai_model`
- `error_message`
- `started_at`
- `finished_at`
- `created_at`
- `updated_at`

Relasi:

- `jobs.owner_user_id` mengarah ke `users.id`
- `assessments.source_job_id` mengarah ke `jobs.id`
- `credit_transactions.job_id` mengarah ke `jobs.id`
- `audit_logs.job_id` mengarah ke `jobs.id`

Job type:

- `generate_questions`
- `regenerate_questions`
- `improve_question`
- `summarize_material`

Job status:

- `draft`
- `queued`
- `processing`
- `succeeded`
- `failed`
- `cancelled`

Rules:

- Job harus menyimpan estimasi kredit sebelum diproses.
- Job hanya boleh diproses jika user memiliki kredit cukup.
- Job AI sukses harus memiliki `credit_actual`.
- Untuk MVP, biaya dasar dapat memakai aturan 1 soal berhasil dihasilkan AI = 1 kredit.
- Jika ada proses AI tambahan, biaya harus dihitung sesuai business rules kredit.

### assessments

Menyimpan assessment yang dibuat manual atau dari proses AI.

Field penting:

- `id`
- `owner_user_id`
- `source_job_id`
- `title`
- `subject`
- `grade_level`
- `curriculum`
- `question_type`
- `creation_mode`
- `material_text`
- `material_source_filename`
- `material_extracted_at`
- `status`
- `metadata_json`
- `created_at`
- `updated_at`

Relasi:

- `assessments.owner_user_id` mengarah ke `users.id`
- `assessments.source_job_id` mengarah ke `jobs.id`
- `questions.assessment_id` mengarah ke `assessments.id`
- `exports.assessment_id` mengarah ke `assessments.id`
- `credit_transactions.assessment_id` mengarah ke `assessments.id`
- `audit_logs.assessment_id` mengarah ke `assessments.id`

Assessment status:

- `draft`
- `ready`
- `archived`

Rules:

- assessment harus memiliki owner.
- `creation_mode` menentukan apakah assessment dibuat manual atau dengan AI.
- Assessment manual tidak memakai Kredit.
- Assessment AI wajib memiliki teks materi pembelajaran hasil ekstraksi.
- File Word/PDF materi tidak disimpan.
- assessment hasil AI harus menyimpan referensi ke job sumber jika tersedia.
- Edit manual assessment tidak memotong kredit.
- Regenerate berbasis AI dapat membuat job baru dan transaksi kredit baru.

### questions

Menyimpan soal dalam assessment.

Field penting:

- `id`
- `assessment_id`
- `number`
- `type`
- `content`
- `image_url`
- `difficulty`
- `answer_key`
- `explanation`
- `metadata_json`
- `created_at`
- `updated_at`

Relasi:

- `questions.assessment_id` mengarah ke `assessments.id`
- `answer_options.question_id` mengarah ke `questions.id`

Question type:

- `multiple_choice`
- `essay`
- `true_false`
- `short_answer`

Rules:

- Nomor soal harus unik dalam satu assessment.
- `image_url` opsional untuk gambar ilustrasi eksternal.
- Sistem menyimpan URL gambar, bukan file gambar.
- Soal pilihan ganda harus memiliki opsi jawaban.
- Soal essay boleh tidak memiliki `answer_options`.
- `answer_key` dapat disimpan di question untuk essay atau short answer.
- Untuk multiple choice, kunci jawaban dapat ditentukan lewat `answer_options.is_correct`.

### answer_options

Menyimpan opsi jawaban untuk soal objektif.

Field penting:

- `id`
- `question_id`
- `label`
- `content`
- `is_correct`
- `created_at`
- `updated_at`

Relasi:

- `answer_options.question_id` mengarah ke `questions.id`

Rules:

- Label opsi harus unik dalam satu question.
- Untuk multiple choice, minimal satu opsi harus benar.
- Untuk single-answer multiple choice, hanya satu opsi boleh `is_correct = true`.
- Opsi akan ikut terhapus jika question dihapus.

### exports

Menyimpan riwayat file export.

Field penting:

- `id`
- `assessment_id`
- `owner_user_id`
- `format`
- `file_path`
- `file_name`
- `status`
- `created_at`

Relasi:

- `exports.assessment_id` mengarah ke `assessments.id`
- `exports.owner_user_id` mengarah ke `users.id`

Export format:

- `pdf`
- `docx`
- `xlsx`
- `csv`

Rules:

- Export harus terkait dengan assessment.
- Export harus dimiliki user yang sama dengan owner assessment, kecuali Admin melakukan export untuk kebutuhan support.
- Export standar tidak memotong kredit.

### audit_logs

Menyimpan catatan aktivitas penting.

Field penting:

- `id`
- `actor_user_id`
- `target_user_id`
- `job_id`
- `assessment_id`
- `credit_transaction_id`
- `action`
- `entity_type`
- `entity_id`
- `metadata_json`
- `created_at`

Relasi:

- `audit_logs.actor_user_id` mengarah ke `users.id`
- `audit_logs.target_user_id` mengarah ke `users.id`
- `audit_logs.job_id` mengarah ke `jobs.id`
- `audit_logs.assessment_id` mengarah ke `assessments.id`
- `audit_logs.credit_transaction_id` mengarah ke `credit_transactions.id`

Rules:

- Audit log append-only.
- Aktivitas Admin yang mengubah user atau kredit wajib masuk audit.
- Aktivitas kredit penting seperti topup, adjustment, charge, dan refund sebaiknya masuk audit.
- Error AI yang berdampak ke kredit perlu bisa dilacak dari job dan transaksi terkait.

## Ownership Model

Ownership utama memakai `owner_user_id` atau `user_id`.

Untuk Guru:

- Hanya boleh melihat `jobs` miliknya.
- Hanya boleh melihat `assessments` miliknya.
- Hanya boleh melihat `exports` miliknya.
- Hanya boleh melihat `credit_transactions` dengan `user_id` miliknya.
- Tidak boleh melihat user lain.
- Tidak boleh melakukan adjustment kredit.

Untuk Admin:

- Boleh melihat semua user.
- Boleh melihat semua job untuk monitoring.
- Boleh melihat semua transaksi kredit.
- Boleh melakukan topup, refund, bonus, atau adjustment kredit sesuai business rules.
- Boleh menonaktifkan user, tetapi tidak boleh membuat sistem tanpa Admin aktif.

## Credit Billing Relationship

Alur relasi saat Guru menambahkan soal dengan AI pada assessment:

1. Guru sudah memiliki `assessments` draft.
2. Guru mengirim teks materi hasil ekstraksi dan konfigurasi soal.
3. Sistem membuat `jobs` dengan status `queued`.
4. Sistem menghitung `credit_estimate`.
5. Sistem memastikan `credit_balances.balance` mencukupi.
6. AI memproses job.
7. Jika sukses, sistem menambahkan `questions` dan `answer_options` ke assessment terkait.
8. Sistem membuat `credit_transactions` dengan type `charge`.
9. Sistem memperbarui `credit_balances.balance`.
10. Sistem mengubah `jobs.status` menjadi `succeeded`.
11. Sistem mencatat audit jika diperlukan.

Jika job gagal:

1. `jobs.status` menjadi `failed`.
2. `error_message` disimpan.
3. Kredit tidak dipotong jika belum ada output sukses.
4. Jika kredit sudah sempat dipotong, sistem membuat `credit_transactions` dengan type `refund`.

## Cardinality Rules

- `users` ke `credit_balances` adalah 1:1.
- `users` ke `jobs` adalah 1:N.
- `users` ke `assessments` adalah 1:N.
- `users` ke `credit_transactions` adalah 1:N.
- `jobs` ke `assessments` adalah 1:N, tetapi MVP dapat memperlakukan sebagai 1:1 untuk job generate awal.
- `assessments` ke `questions` adalah 1:N.
- `questions` ke `answer_options` adalah 0:N.
- `assessments` ke `exports` adalah 1:N.
- `users` ke `audit_logs` adalah 0:N atau 1:N tergantung aktivitas user.

## Delete and Archive Policy

- User sebaiknya tidak dihapus secara fisik jika sudah memiliki transaksi, job, atau assessment.
- User dinonaktifkan memakai `status = inactive`.
- assessment sebaiknya diarsipkan memakai `status = archived`.
- Question dan answer option boleh cascade delete saat assessment draft dihapus.
- Credit transaction dan audit log tidak boleh dihapus dari flow aplikasi normal.
- Export record dapat disimpan sebagai riwayat meskipun file fisik sudah dibersihkan oleh retention policy.

## Query Implications

Query untuk Guru harus selalu memiliki filter ownership:

```sql
WHERE owner_user_id = :current_user_id
```

atau:

```sql
WHERE user_id = :current_user_id
```

Query Admin boleh lintas user, tetapi tetap harus mendukung filter:

- user
- role
- status
- tanggal
- job status
- transaction type

## ERD Checklist

- Setiap user memiliki satu credit balance.
- Setiap transaksi kredit menyimpan balance before dan balance after.
- Setiap job AI memiliki owner.
- Setiap job AI memiliki estimasi kredit sebelum diproses.
- Setiap assessment memiliki owner.
- Setiap assessment memiliki daftar question.
- Setiap question objective memiliki answer option.
- Setiap export terhubung ke Assessment dan owner.
- Aktivitas Admin terhadap user dan kredit masuk audit log.
- Guru tidak dapat mengakses data milik Guru lain.
- Admin dapat mengelola user dan kredit tanpa bypass audit.
