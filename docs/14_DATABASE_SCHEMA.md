# Database Schema

## Tujuan

Dokumen ini mendefinisikan schema database Teachery untuk MVP. Database yang digunakan adalah SQLite, sesuai `11_BACKEND_ARCHITECTURE.md`.

Schema harus mendukung:
- Role Admin dan Guru
- User aktif/nonaktif
- Sistem Kredit berbasis ledger transaksi
- Jobs AI asynchronous
- assessment, soal, pilihan jawaban, pembahasan, dan kisi-kisi
- Assessment manual dan assessment dengan AI
- Teks materi pembelajaran hasil ekstraksi Word/PDF tanpa menyimpan file asli
- Link gambar ilustrasi eksternal pada tiap soal
- Export PDF
- Audit log append-only
- Validasi ownership data Guru

## General Rules

Aturan umum:
- Gunakan UUID string untuk primary key agar aman jika nanti migrasi ke database lain
- Semua timestamp memakai format ISO-8601 UTC string atau integer epoch, pilih satu dan konsisten
- Semua foreign key harus aktif di SQLite dengan `PRAGMA foreign_keys = ON`
- Soft delete tidak digunakan pada MVP kecuali disebutkan eksplisit
- User nonaktif tetap disimpan
- Audit log dan credit transaction tidak boleh diedit manual
- Saldo Kredit tidak boleh negatif pada MVP

Recommended timestamp columns:

```text
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT NULL
```

Untuk tabel append-only seperti audit log, `updated_at` tidak wajib.

## Entity Relationship Overview

```text
users
  |- credit_balances
  |- credit_transactions
  |- jobs
  |- assessments
  |- exports
  `- audit_logs as actor/target

jobs
  |- assessments
  `- credit_transactions

assessments
  |- questions
  `- exports

questions
  `- answer_options
```

## Tables

## users

Menyimpan akun Admin dan Guru.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'guru')),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Indexes:

```sql
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role_status ON users(role, status);
```

Rules:
- Email wajib unik
- Role hanya `admin` atau `guru`
- Status hanya `active` atau `inactive`
- Password harus disimpan sebagai hash
- Minimal satu Admin aktif harus dijaga oleh business logic

## credit_balances

Menyimpan saldo Kredit terkini per user.

```sql
CREATE TABLE credit_balances (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

Rules:
- Satu user memiliki satu row balance
- Balance tidak boleh negatif pada MVP
- Update balance wajib dilakukan bersama insert credit transaction dalam database transaction
- Balance dapat dihitung ulang dari ledger jika diperlukan

## credit_transactions

Ledger semua perubahan Kredit.

```sql
CREATE TABLE credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'ai_charge',
    'ai_refund',
    'admin_add',
    'admin_subtract'
  )),
  status TEXT NOT NULL CHECK (status IN (
    'pending',
    'success',
    'failed',
    'refunded'
  )),
  job_id TEXT NULL,
  assessment_id TEXT NULL,
  actor_user_id TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('admin', 'guru', 'system')),
  reason TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (assessment_id) REFERENCES assessments(id),
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);
```

Indexes:

```sql
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_job_id ON credit_transactions(job_id);
CREATE INDEX idx_credit_transactions_assessment_id ON credit_transactions(assessment_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX idx_credit_transactions_status ON credit_transactions(status);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
```

Rules:
- `amount` negatif untuk Kredit keluar
- `amount` positif untuk Kredit masuk atau refund
- `reason` wajib untuk `admin_add` dan `admin_subtract`
- `job_id` wajib untuk AI charge/refund jika transaksi terkait Job
- Transaksi success tidak boleh diedit manual
- Koreksi transaksi dibuat sebagai transaksi baru

Catatan:
SQLite tidak bisa membuat conditional required field sebersih database lain tanpa trigger. Validasi `reason` dan `job_id` wajib ditegakkan di use case layer.

## jobs

Menyimpan proses AI asynchronous.

```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'generate_questions',
    'regenerate_question',
    'improve_question',
    'generate_explanation',
    'generate_blueprint'
  )),
  status TEXT NOT NULL CHECK (status IN (
    'waiting',
    'processing',
    'completed',
    'failed',
    'partially_failed'
  )),
  input_snapshot_json TEXT NOT NULL,
  estimated_credit INTEGER NOT NULL DEFAULT 0 CHECK (estimated_credit >= 0),
  actual_credit INTEGER NOT NULL DEFAULT 0 CHECK (actual_credit >= 0),
  credit_status TEXT NOT NULL CHECK (credit_status IN (
    'not_charged',
    'reserved',
    'charged',
    'partially_charged',
    'refunded'
  )),
  error_message TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);
```

Indexes:

```sql
CREATE INDEX idx_jobs_owner_user_id ON jobs(owner_user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(type);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_owner_status ON jobs(owner_user_id, status);
```

Rules:
- Setiap Job memiliki owner user
- Guru hanya melihat Job miliknya
- Admin dapat melihat semua Job
- Worker hanya mengambil Job berstatus `waiting`
- Job final tidak boleh kembali ke `processing`
- Retry membuat Job baru
- `input_snapshot_json` harus cukup untuk audit dan retry

## assessments

Menyimpan assessment yang dibuat manual atau dengan AI.

```sql
CREATE TABLE assessments (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  source_job_id TEXT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  creation_mode TEXT NOT NULL CHECK (creation_mode IN (
    'manual',
    'ai'
  )),
  material_text TEXT NULL,
  material_source_filename TEXT NULL,
  material_extracted_at TEXT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'draft',
    'generating',
    'needs_review',
    'ready_to_export',
    'exporting',
    'pdf_ready',
    'error'
  )),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id),
  FOREIGN KEY (source_job_id) REFERENCES jobs(id)
);
```

Indexes:

```sql
CREATE INDEX idx_assessments_owner_user_id ON assessments(owner_user_id);
CREATE INDEX idx_assessments_source_job_id ON assessments(source_job_id);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_updated_at ON assessments(updated_at);
```

Rules:
- assessment memiliki owner user
- Guru hanya melihat assessment miliknya
- `creation_mode = manual` tidak memakai Kredit
- `creation_mode = ai` wajib memiliki teks materi pembelajaran yang berhasil diekstrak
- File materi asli Word/PDF tidak disimpan
- assessment hasil AI masuk `needs_review`
- Export PDF tidak boleh mengubah isi assessment tanpa aksi user

## questions

Menyimpan soal dalam assessment.

```sql
CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  number INTEGER NOT NULL CHECK (number > 0),
  type TEXT NOT NULL CHECK (type IN (
    'multiple_choice',
    'essay'
  )),
  difficulty TEXT NOT NULL CHECK (difficulty IN (
    'easy',
    'medium',
    'hard',
    'mixed'
  )),
  prompt TEXT NOT NULL,
  image_url TEXT NULL,
  correct_answer TEXT NULL,
  explanation TEXT NULL,
  blueprint_item TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);
```

Indexes:

```sql
CREATE INDEX idx_questions_assessment_id ON questions(assessment_id);
CREATE UNIQUE INDEX idx_questions_assessment_number ON questions(assessment_id, number);
```

Rules:
- Setiap soal wajib memiliki prompt
- `image_url` opsional untuk link gambar ilustrasi eksternal
- Sistem menyimpan URL gambar, bukan file gambar
- URL gambar harus divalidasi di use case layer
- `number` unik dalam satu assessment
- Soal pilihan ganda wajib memiliki jawaban benar di level question atau answer option
- Pembahasan boleh kosong jika tidak diminta
- Hapus soal tidak mengembalikan Kredit
- Edit manual tidak menggunakan Kredit

## answer_options

Menyimpan pilihan jawaban untuk soal pilihan ganda.

```sql
CREATE TABLE answer_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  label TEXT NOT NULL,
  text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);
```

Indexes:

```sql
CREATE INDEX idx_answer_options_question_id ON answer_options(question_id);
CREATE UNIQUE INDEX idx_answer_options_question_label ON answer_options(question_id, label);
```

Rules:
- Soal pilihan ganda minimal memiliki 2 pilihan
- Satu soal pilihan ganda harus memiliki satu jawaban benar
- Constraint "hanya satu is_correct = 1" ditegakkan di use case layer atau dengan partial unique index jika dipakai

Optional partial unique index SQLite:

```sql
CREATE UNIQUE INDEX idx_answer_options_one_correct
ON answer_options(question_id)
WHERE is_correct = 1;
```

## exports

Menyimpan proses dan hasil export PDF.

```sql
CREATE TABLE exports (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  output_types_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'processing',
    'completed',
    'failed'
  )),
  file_path TEXT NULL,
  error_message TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id),
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);
```

Indexes:

```sql
CREATE INDEX idx_exports_assessment_id ON exports(assessment_id);
CREATE INDEX idx_exports_owner_user_id ON exports(owner_user_id);
CREATE INDEX idx_exports_status ON exports(status);
CREATE INDEX idx_exports_created_at ON exports(created_at);
```

Rules:
- Minimal satu output type wajib dipilih
- Export PDF tanpa AI tambahan tidak menggunakan Kredit
- Export gagal tidak memotong Kredit
- File hanya dapat diakses owner atau Admin jika monitoring diaktifkan

## audit_logs

Menyimpan audit trail append-only.

```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('admin', 'guru', 'system')),
  target_user_id TEXT NULL,
  related_job_id TEXT NULL,
  related_transaction_id TEXT NULL,
  related_assessment_id TEXT NULL,
  metadata_json TEXT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (actor_user_id) REFERENCES users(id),
  FOREIGN KEY (target_user_id) REFERENCES users(id),
  FOREIGN KEY (related_job_id) REFERENCES jobs(id),
  FOREIGN KEY (related_transaction_id) REFERENCES credit_transactions(id),
  FOREIGN KEY (related_assessment_id) REFERENCES assessments(id)
);
```

Indexes:

```sql
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_target_user_id ON audit_logs(target_user_id);
CREATE INDEX idx_audit_logs_related_job_id ON audit_logs(related_job_id);
CREATE INDEX idx_audit_logs_related_transaction_id ON audit_logs(related_transaction_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

Rules:
- Audit log append-only
- Audit log tidak boleh diedit manual
- Audit log tidak boleh menyimpan password, JWT secret, AI API key, atau credential lain
- Metadata harus ringkas dan aman

## Optional Tables

Tabel berikut belum wajib untuk MVP, tetapi dapat dipertimbangkan jika implementasi membutuhkan detail tambahan.

### material_extraction_events

Opsional untuk menyimpan log ekstraksi materi tanpa menyimpan file asli.

```sql
CREATE TABLE material_extraction_events (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  assessment_id TEXT NULL,
  source_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  extracted_text_length INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id),
  FOREIGN KEY (assessment_id) REFERENCES assessments(id)
);
```

Rules:
- Tabel ini hanya menyimpan metadata ekstraksi.
- File Word/PDF asli tidak boleh disimpan.
- Error message harus aman dan tidak berisi path internal sensitif.

### job_events

Untuk menyimpan timeline detail Job.

```sql
CREATE TABLE job_events (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NULL,
  metadata_json TEXT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);
```

## Transaction Requirements

Operasi berikut wajib menggunakan database transaction:
- Admin menambah Kredit
- Admin mengurangi Kredit
- AI charge Kredit
- AI refund Kredit
- Job finalization dengan perubahan Kredit
- Role/status change dengan audit log
- Create user dengan initial credit jika fitur ini dipakai

Rules:
- Insert `credit_transactions` dan update `credit_balances` harus commit bersama
- Final status Job dan transaksi Kredit harus konsisten
- Jika salah satu operasi gagal, rollback semua operasi terkait

## Ownership Query Rules

Untuk role Guru:

```sql
-- Jobs
SELECT * FROM jobs
WHERE id = ? AND owner_user_id = ?;

-- assessments
SELECT * FROM assessments
WHERE id = ? AND owner_user_id = ?;

-- Credit transactions
SELECT * FROM credit_transactions
WHERE user_id = ?;
```

Untuk role Admin:

```sql
-- Admin boleh melihat semua jobs
SELECT * FROM jobs;

-- Admin boleh melihat semua credit transactions
SELECT * FROM credit_transactions;
```

Rules:
- Jangan mengambil data berdasarkan ID saja untuk role Guru
- Selalu sertakan `owner_user_id` atau `user_id` pada query resource milik Guru

## Migration Order

Urutan migration yang direkomendasikan:
1. users
2. credit_balances
3. jobs
4. assessments
5. questions
6. answer_options
7. exports
8. credit_transactions
9. audit_logs
10. optional tables

Catatan:
- `credit_transactions` mereferensikan `jobs` dan `assessments`, sehingga dibuat setelah kedua tabel tersebut
- `audit_logs` mereferensikan beberapa tabel, sehingga dibuat setelah tabel utama

## Seed Data

Minimal seed untuk development:
- 1 Admin aktif
- 1 Guru aktif
- Credit balance awal untuk Guru

Contoh:

```text
Admin:
- email: admin@teachery.local
- role: admin
- status: active

Guru:
- email: guru@teachery.local
- role: guru
- status: active
- credit balance: 100
```

Rules:
- Password seed harus diganti pada environment non-development
- Jangan commit credential production

## Schema Acceptance Checklist

Schema dianggap siap jika:
- Users mendukung role Admin/Guru dan status active/inactive
- Email user unik
- Credit balance tidak bisa negatif
- Semua perubahan Kredit dapat dicatat di credit_transactions
- Jobs menyimpan owner, status, estimated_credit, actual_credit, dan credit_status
- assessments dan questions memiliki ownership melalui owner user
- Assessments mendukung mode manual dan AI
- Assessment AI menyimpan teks materi hasil ekstraksi atau snapshot yang cukup untuk audit/retry
- Questions mendukung `image_url` eksternal opsional
- Answer options mendukung pilihan ganda
- Exports menyimpan output type dan file path
- Audit logs mendukung actor, target, related entity, dan metadata
- Index tersedia untuk query utama dashboard, jobs, transactions, assessments, dan audit
- Query Guru dapat dibatasi berdasarkan owner
- Migration order aman terhadap foreign key
