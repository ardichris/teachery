# Service Boundaries

## Tujuan

Dokumen ini menjelaskan batas tanggung jawab antar service/module backend Teachery. Tujuannya agar implementasi Clean Architecture tidak tercampur antara Auth, User, Credit, Jobs, AI, Material Extraction, Assessments, Export, dan Audit.

MVP masih dapat berjalan sebagai monolith Golang Fiber, tetapi secara internal modul harus punya boundary yang jelas.

Prinsip:
- Setiap service memiliki ownership data dan business rule sendiri
- Service lain tidak boleh mengubah data owned service secara langsung
- Komunikasi antar service dilakukan melalui use case/service interface
- Perubahan Kredit selalu melalui Credit Service
- Proses AI selalu melalui Job Service dan AI Service
- Audit event dibuat melalui Audit Service
- Handler tidak boleh berisi business logic lintas service

## Boundary Overview

Service/module utama:
- Auth Service
- User Service
- Credit Service
- Job Service
- Material Extraction Service
- AI Service
- Assessment Service
- Export Service
- Audit Service
- Storage Service

## Dependency Direction

Allowed direction:

```text
Handler -> Use Case / Service -> Repository / Infrastructure
```

Cross-service orchestration dilakukan di use case layer.

Contoh:
- Create AI Job use case boleh memanggil User Service, Credit Service, Material Extraction Service, Job Service, dan Audit Service
- Worker process Job use case boleh memanggil Job Service, AI Service, Assessment Service, Credit Service, dan Audit Service
- Handler tidak boleh langsung memanggil repository banyak domain sekaligus

## Auth Service

### Responsibilities

Auth Service bertanggung jawab untuk:
- Login
- Verifikasi password
- Issue JWT
- Validasi JWT
- Membuat auth context
- Menolak user nonaktif

### Owns

Auth Service tidak memiliki table utama sendiri pada MVP, tetapi memakai:
- users.password_hash
- users.status
- users.role

### May Call

- User Service untuk mengambil user aktif
- Audit Service untuk mencatat event login gagal jika fitur security audit diaktifkan

### Must Not

- Mengubah role user
- Mengubah saldo Kredit
- Membuat Job
- Mengakses assessment

### Key Rules

- Password tidak disimpan plain text
- JWT berisi user ID dan role
- Status user harus dicek dari database, bukan hanya dari token
- User nonaktif tidak boleh mengakses protected API

## User Service

### Responsibilities

User Service bertanggung jawab untuk:
- Create user
- Update user
- Change role
- Activate user
- Deactivate user
- List users
- Get user detail
- Memastikan minimal satu Admin aktif

### Owns

Tables:
- users

Business rules:
- Email unik
- Role hanya Admin atau Guru
- Status hanya active atau inactive
- Admin terakhir tidak boleh dinonaktifkan
- Sistem tidak boleh tanpa Admin aktif

### May Call

- Audit Service untuk mencatat create/update/role/status change

### Must Not

- Mengubah saldo Kredit langsung
- Membuat transaksi Kredit
- Membuat Job AI
- Mengubah assessment

### Integration Notes

Jika Admin membuat user dengan saldo awal, orchestration harus dilakukan oleh use case yang memanggil:
1. User Service create user
2. Credit Service add credit
3. Audit Service record event

User Service sendiri tetap tidak boleh menulis transaksi Kredit.

## Credit Service

### Responsibilities

Credit Service bertanggung jawab untuk:
- Get credit balance
- Estimate credit usage
- Charge credit
- Refund credit
- Admin add credit
- Admin subtract credit
- List credit transactions
- Menjaga saldo tidak negatif

### Owns

Tables:
- credit_balances
- credit_transactions

Business rules:
- Semua perubahan Kredit harus menghasilkan transaksi
- Saldo Kredit tidak boleh negatif pada MVP
- Transaksi success tidak boleh diedit manual
- Manual adjustment wajib memiliki actor Admin dan reason
- AI charge/refund harus terhubung ke Job jika ada

### May Call

- User Service untuk validasi user target aktif jika diperlukan
- Audit Service untuk mencatat perubahan Kredit

### Must Not

- Memanggil AI provider
- Membuat atau memproses Job
- Mengubah assessment
- Mengubah role user

### Public Operations

- `GetBalance(userID)`
- `EstimateCredit(input)`
- `EnsureSufficientBalance(userID, estimatedCredit)`
- `ChargeForJob(userID, jobID, amount)`
- `RefundForJob(userID, jobID, amount)`
- `AdminAdjustCredit(actorAdminID, targetUserID, amount, reason)`

### Transaction Boundary

Operasi berikut wajib database transaction:
- Charge credit
- Refund credit
- Admin adjustment
- Balance update + transaction insert

## Job Service

### Responsibilities

Job Service bertanggung jawab untuk:
- Create Job
- Store input snapshot
- List Jobs
- Get Job detail
- Claim waiting Job for worker
- Update Job status
- Store estimated credit and actual credit
- Store credit status
- Retry Job by creating new Job

### Owns

Tables:
- jobs

Business rules:
- Semua proses AI harus menjadi Job
- Job memiliki owner user
- Guru hanya dapat mengakses Job miliknya
- Admin dapat mengakses semua Job
- Job final tidak boleh kembali ke status processing
- Retry membuat Job baru

### May Call

- Credit Service untuk memastikan saldo cukup sebelum Job dibuat
- Audit Service untuk mencatat Job created/completed/failed

### Must Not

- Memanggil AI provider langsung dari HTTP handler
- Mengubah saldo Kredit langsung
- Menulis credit_transactions langsung
- Mengubah user role/status

### Public Operations

- `CreateJob(ownerUserID, jobInput)`
- `ListJobs(viewer)`
- `GetJob(viewer, jobID)`
- `ClaimNextJob()`
- `MarkProcessing(jobID)`
- `MarkCompleted(jobID, actualCredit)`
- `MarkFailed(jobID, safeError)`
- `MarkPartiallyFailed(jobID, actualCredit, safeError)`
- `RetryJob(ownerUserID, sourceJobID)`

## Material Extraction Service

### Responsibilities

Material Extraction Service bertanggung jawab untuk:

- Menerima file materi pembelajaran Word/PDF dari request.
- Mengekstrak teks dari file.
- Mengembalikan teks hasil ekstraksi ke use case.
- Menolak file yang tidak didukung, terlalu besar, atau tidak menghasilkan teks.
- Mencatat metadata ekstraksi jika `material_extraction_events` dipakai.

### Owns

- Tidak menyimpan file asli.
- Optional: `material_extraction_events`.

### May Call

- Audit Service jika ekstraksi gagal berulang atau perlu investigasi.

### Must Not

- Menyimpan file Word/PDF asli.
- Mengubah Kredit.
- Membuat Job langsung.
- Mengirim prompt ke AI provider.

### Key Rules

- File materi wajib untuk assessment mode AI.
- File asli harus dibuang setelah teks berhasil/gagal diekstrak.
- Teks hasil ekstraksi boleh disimpan di assessment/job snapshot jika dibutuhkan untuk audit, retry, dan regenerate.

## AI Service

### Responsibilities

AI Service bertanggung jawab untuk:
- Build prompt/input AI
- Call AI provider melalui adapter
- Parse response AI
- Normalize output menjadi struktur domain
- Map provider error menjadi safe error

### Owns

AI Service tidak memiliki table domain utama.

External dependency:
- AI provider, misalnya OpenAI/ChatGPT

### May Call

- AI provider adapter

### Must Not

- Mengubah saldo Kredit
- Membuat transaksi Kredit
- Membuat Job
- Mengubah status Job
- Menyimpan assessment langsung
- Menentukan permission user

### Key Rules

- Provider API key hanya berada di server-side config
- Error provider tidak boleh dibocorkan mentah ke user
- Output AI harus dikembalikan ke orchestrator/worker untuk disimpan oleh Assessment Service

## Assessment Service

### Responsibilities

Assessment Service bertanggung jawab untuk:
- Create Assessment from Job output
- Get Assessment
- List assessments
- Update Assessment metadata
- Update question
- Delete question
- Save draft
- Update Assessment status
- Validate Assessment ownership

### Owns

Tables:
- assessments
- questions
- answer_options

Business rules:
- assessment memiliki owner user
- Guru hanya mengakses assessment miliknya
- Edit manual tidak menggunakan Kredit
- Hapus soal tidak mengembalikan Kredit
- assessment hasil AI masuk status needs_review
- Minimal output valid diperlukan sebelum ready_to_export

### May Call

- Audit Service untuk perubahan penting jika diperlukan

### Must Not

- Memanggil AI provider
- Mengubah saldo Kredit
- Membuat transaksi Kredit
- Membuat Job AI untuk regenerate/improve secara langsung

### Integration Notes

Aksi "Buat Ulang" atau "Perbaiki Otomatis" tidak langsung dilakukan oleh Assessment Service.

Flow yang benar:
1. Assessment Service validasi ownership soal/assessment
2. Credit Service estimate/check Kredit
3. Job Service create Job AI baru
4. Worker memanggil AI Service
5. Assessment Service menyimpan hasil baru jika Job berhasil

## Export Service

### Responsibilities

Export Service bertanggung jawab untuk:
- Validate selected output types
- Generate PDF
- Store PDF result
- Return download metadata
- Track export status
- Enforce file access permission

### Owns

Tables:
- exports

Storage:
- Generated PDF files

### May Call

- Assessment Service untuk mengambil data assessment
- Storage Service untuk menyimpan/mengambil file
- Audit Service jika export event perlu dicatat

### Must Not

- Mengubah saldo Kredit untuk export tanpa AI
- Memanggil AI provider langsung
- Mengubah isi soal tanpa aksi user
- Mengabaikan ownership file

### Key Rules

- Export PDF tanpa AI tambahan tidak memakai Kredit
- Minimal satu output dipilih
- Export gagal tidak memotong Kredit
- File hanya dapat diakses owner atau Admin jika monitoring diaktifkan

## Audit Service

### Responsibilities

Audit Service bertanggung jawab untuk:
- Record audit event
- Store actor, target, related entity, timestamp, and metadata
- Menjaga audit append-only

### Owns

Tables:
- audit_logs

### May Be Called By

- Auth Service
- User Service
- Credit Service
- Job Service
- Assessment Service
- Export Service

### Must Not

- Mengubah business entity
- Mengubah saldo Kredit
- Mengubah role user
- Menghapus audit log

### Key Rules

- Audit log tidak boleh diedit manual
- Audit log tidak boleh menampilkan password, JWT secret, AI API key, atau credential lain
- Metadata harus ringkas dan aman

## Storage Service

### Responsibilities

Storage Service bertanggung jawab untuk:
- Store uploaded teaching materials
- Store exported PDF files
- Return file metadata
- Enforce file path safety

### Owns

Storage location:
- Uploaded materials
- Generated exports

### May Call

Tidak perlu memanggil domain service lain kecuali melalui orchestrator.

### Must Not

- Menentukan role permission sendiri tanpa context dari use case
- Mengubah assessment
- Mengubah transaksi Kredit
- Memanggil AI provider

### Key Rules

- File upload harus divalidasi tipe dan ukuran
- File download harus dicek owner atau Admin permission di use case/handler sebelum file dikirim
- Path traversal harus dicegah

## Worker Boundary

Worker bukan domain service terpisah, tetapi orchestrator background untuk Job.

Responsibilities:
- Claim waiting Job
- Mark Job processing
- Call AI Service
- Call Assessment Service to store output
- Call Credit Service to charge/refund
- Call Job Service to finalize status
- Call Audit Service to record event

Must Not:
- Bypass Credit Service untuk update saldo
- Bypass Assessment Service untuk simpan output
- Process same Job twice
- Expose raw AI provider error to user

Transaction rules:
- Job finalization, credit transaction, and balance update should be consistent
- Credit mutation must be database-transactional
- If finalization fails, worker should retry safely or mark safe failure state

## Cross-Service Flows

### Login Flow

1. Handler receives login request
2. Auth Service verifies email/password
3. Auth Service checks user status through User data
4. Auth Service issues JWT
5. Audit Service may record failed login if needed

### Buat Assessment Flow

1. Handler receives generate request
2. Use case validates active Guru
3. Credit Service estimates Kredit
4. Credit Service checks balance
5. Job Service creates Job
6. Audit Service records Job created
7. Worker processes Job asynchronously

### Process AI Job Flow

1. Worker claims Job through Job Service
2. Worker calls AI Service
3. AI Service returns normalized output
4. Assessment Service stores Assessment/questions
5. Credit Service charges actual Kredit
6. Job Service marks Job completed
7. Audit Service records Job completed and Kredit charged

### Job Failure Flow

1. Worker catches provider/system error
2. Job Service marks Job failed or partially failed
3. Credit Service does not charge or refunds unused Kredit
4. Audit Service records failure/refund

### Admin Credit Adjustment Flow

1. Admin sends adjustment request
2. User Service validates target user exists
3. Credit Service validates amount and reason
4. Credit Service updates balance and inserts transaction
5. Audit Service records Admin adjustment

### Export PDF Flow

1. Handler receives export request
2. Assessment Service validates ownership and Assessment state
3. Export Service generates PDF
4. Storage Service stores file
5. Export Service returns download metadata
6. Export does not call Credit Service unless AI is explicitly needed before export

## Anti-Patterns

Avoid:
- Handler writes directly to multiple repositories
- Assessment Service changes Kredit
- Credit Service calls AI provider
- AI Service writes assessments
- Job Service inserts credit transaction directly
- Admin adjustment edits credit balance without transaction
- Audit log contains secrets
- Frontend-only role protection without backend validation
- Retry mutates old Job instead of creating a new Job

## Boundary Acceptance Checklist

Service boundaries are acceptable if:
- Auth only handles authentication/session concerns
- User Service owns role and status changes
- Credit Service is the only module that mutates Kredit
- Job Service owns Job lifecycle
- AI Service only talks to AI provider and returns normalized output
- Assessment Service owns assessments/questions
- Export Service owns PDF generation/export records
- Audit Service owns append-only audit records
- Worker orchestrates services without bypassing their boundaries
- Guru ownership is enforced before reading or mutating resources
- Admin actions are validated and audited
