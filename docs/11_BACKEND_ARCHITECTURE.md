# Backend Architecture

## Tujuan

Dokumen ini menjelaskan arsitektur backend Teachery berdasarkan product vision, business rules, user stories, acceptance criteria, dan page spec.

Backend harus mendukung:
- Role Admin dan Guru
- Auth dengan JWT
- Manajemen user
- Sistem Kredit berbasis ledger transaksi
- Jobs AI asynchronous
- Buat Assessment, pembahasan, kisi-kisi, dan kartu soal
- Assessment manual tanpa AI
- Extract text dari materi Word/PDF tanpa menyimpan file asli
- Review/edit assessment
- Export PDF
- Audit trail
- Validasi role, ownership, saldo Kredit, dan status user

## Tech Stack

Framework:
- Golang Fiber

Pattern:
- Clean Architecture

Auth:
- JWT

Database:
- SQLite untuk MVP

Background processing:
- Worker internal berbasis database queue untuk MVP

AI provider:
- Adapter interface agar provider seperti OpenAI/ChatGPT dapat diganti tanpa mengubah business logic

PDF generation:
- Service terpisah di layer application/infrastructure

## Architecture Principles

Prinsip utama:
- Business rules berada di use case layer, bukan handler
- Handler hanya menerima request, validasi dasar, memanggil use case, dan mengembalikan response
- Repository hanya bertanggung jawab pada persistence
- Semua endpoint sensitif wajib memvalidasi auth, role, dan ownership
- Semua proses AI dibuat sebagai Job
- Generate soal dengan AI wajib memakai teks materi hasil ekstraksi
- Semua perubahan Kredit dibuat sebagai transaksi ledger
- Riwayat transaksi dan audit log tidak boleh diedit manual
- Error internal tidak boleh membocorkan API key, prompt mentah sensitif, atau detail provider

## Suggested Folder Structure

```text
cmd/
  api/
    main.go

internal/
  app/
    server.go
    router.go
    middleware.go

  domain/
    user.go
    credit.go
    job.go
    Assessment.go
    question.go
    audit.go

  usecase/
    auth/
    users/
    credits/
    jobs/
    assessments/
    materials/
    ai/
    export/
    audit/

  handler/
    http/
      auth_handler.go
      user_handler.go
      credit_handler.go
      job_handler.go
      Assessment_handler.go
      export_handler.go
      admin_handler.go

  repository/
    sqlite/
      user_repository.go
      credit_repository.go
      job_repository.go
      Assessment_repository.go
      audit_repository.go

  infrastructure/
    jwt/
    password/
    ai/
      provider.go
      openai_provider.go
    extraction/
      material_extractor.go
    pdf/
    storage/
    worker/

  dto/
    request/
    response/

  validation/

  errors/

migrations/

docs/
```

## Clean Architecture Layers

### Domain Layer

Berisi entity, enum, dan aturan dasar domain.

Contoh:
- User
- CreditBalance
- CreditTransaction
- Job
- Assessment
- Question
- AuditLog

Domain tidak boleh bergantung pada Fiber, SQLite, JWT, atau AI provider.

### Use Case Layer

Berisi business logic aplikasi.

Contoh:
- Login user
- Create user
- Change user role
- Adjust credit
- Estimate credit
- Extract learning material text
- Create AI job
- Process AI job
- Charge credit
- Refund credit
- Update Assessment
- Export PDF

Use case bertanggung jawab memastikan:
- Role valid
- Ownership valid
- User aktif
- Saldo Kredit cukup
- Transaksi Kredit tercatat
- Audit log dibuat

### Handler Layer

Berisi HTTP handler Fiber.

Tugas:
- Parse request
- Validasi request shape
- Ambil auth context
- Panggil use case
- Mapping response
- Mapping error ke HTTP status

Handler tidak boleh:
- Menghitung saldo Kredit langsung
- Mengubah status Job langsung
- Memanggil AI provider langsung
- Menulis audit log langsung kecuali melalui use case

### Repository Layer

Berisi persistence ke SQLite.

Tugas:
- Query database
- Transaction handling
- Mapping row ke domain model

Repository tidak boleh:
- Menentukan permission
- Menghitung biaya Kredit bisnis
- Memanggil provider eksternal

### Infrastructure Layer

Berisi implementasi teknis:
- JWT signer/verifier
- Password hashing
- AI provider client
- PDF generator
- File storage
- Background worker

## Core Modules

### Auth Module

Responsibilities:
- Login
- JWT issue
- JWT verification
- Current user context
- Reject inactive user

Rules:
- Password tidak boleh disimpan plain text
- JWT harus menyimpan user ID dan role
- Backend tetap harus membaca user terbaru dari database untuk memastikan status aktif
- User nonaktif tidak boleh mengakses API meskipun token masih valid

### User Module

Responsibilities:
- Create user
- Update user
- Change role
- Activate/deactivate user
- List users
- Get user detail

Rules:
- Hanya Admin yang dapat membuat dan mengubah user lain
- Email harus unik
- Role hanya Admin atau Guru
- Tidak boleh menonaktifkan Admin terakhir yang aktif
- Tidak boleh membuat sistem tanpa Admin aktif
- Perubahan role dan status harus masuk audit log

### Credit Module

Responsibilities:
- Get balance
- Estimate credit usage
- Charge credit
- Refund credit
- Admin add credit
- Admin subtract credit
- List transactions

Rules:
- Saldo Kredit berasal dari ledger transaksi atau balance yang diperbarui dalam transaction database
- Saldo tidak boleh negatif pada MVP
- Semua perubahan Kredit wajib memiliki transaksi
- Transaksi success tidak boleh diedit manual
- Koreksi dilakukan dengan transaksi baru
- Manual adjustment wajib menyimpan actor Admin dan reason

### Job Module

Responsibilities:
- Create Job
- List Jobs
- Get Job detail
- Process Job
- Retry Job
- Update Job status

Rules:
- Semua proses AI harus berjalan sebagai Job
- Job memiliki owner user
- Guru hanya melihat Job miliknya
- Admin melihat semua Job
- Job menyimpan estimated credit dan actual credit
- Job gagal tidak memotong Kredit
- Job gagal sebagian hanya memotong Kredit untuk output berhasil
- Retry membuat Job baru

### AI Module

Responsibilities:
- Build prompt/input untuk AI provider
- Call AI provider through adapter
- Parse AI response
- Normalize AI output menjadi domain model

Rules:
- Use case tidak bergantung langsung pada provider tertentu
- Prompt generate soal harus memakai teks materi pembelajaran hasil ekstraksi
- Provider error harus diterjemahkan menjadi error aman
- API key tidak boleh muncul di response atau log publik
- Output AI harus direview Guru sebelum export

### Material Extraction Module

Responsibilities:
- Extract text dari file Word/PDF.
- Validasi tipe dan ukuran file.
- Mengembalikan teks hasil ekstraksi ke use case.
- Tidak menyimpan file asli.

Rules:
- File materi wajib untuk assessment mode AI.
- Jika ekstraksi gagal atau teks kosong, Job AI tidak boleh dibuat.
- Teks hasil ekstraksi boleh disimpan di assessment/job snapshot jika dibutuhkan untuk audit, retry, dan regenerate.

### Assessment Module

Responsibilities:
- Create Assessment from Job result
- Create manual Assessment
- Get Assessment
- List assessments
- Update question
- Delete question
- Save draft
- Update Assessment status

Rules:
- assessment memiliki owner user
- Assessment memiliki `creation_mode`: manual atau ai
- Assessment manual tidak memakai Kredit
- Assessment AI wajib memiliki teks materi hasil ekstraksi
- Guru hanya mengakses assessment miliknya
- Edit manual tidak memakai Kredit
- Hapus soal tidak mengembalikan Kredit
- assessment hasil AI masuk status Perlu Review
- Admin read/monitor assessment semua user hanya jika fitur monitoring diaktifkan

### Export Module

Responsibilities:
- Generate PDF
- Store PDF file
- Return download link
- Track export status

Rules:
- Export PDF tanpa AI tambahan tidak memakai Kredit
- Minimal satu output harus dipilih
- Export gagal tidak memotong Kredit
- File hanya dapat diakses owner atau Admin jika monitoring diaktifkan

### Audit Module

Responsibilities:
- Record important events
- Store actor, target, related entity, timestamp, and metadata

Events:
- User created
- User updated
- Role changed
- User activated/deactivated
- Credit added/subtracted by Admin
- AI Job created
- AI Job completed
- AI Job failed
- Credit charged
- Credit refunded

Rules:
- Audit log append-only
- Audit log tidak menampilkan credential atau API key
- Audit log tidak boleh diedit manual

## Data Model

### users

Fields:
- id
- name
- email
- password_hash
- role: admin | guru
- status: active | inactive
- created_at
- updated_at

Constraints:
- email unique
- role required
- status required

### credit_balances

Fields:
- user_id
- balance
- updated_at

Rules:
- balance >= 0 untuk MVP
- update harus dilakukan bersama transaksi Kredit

### credit_transactions

Fields:
- id
- user_id
- amount
- type: ai_charge | ai_refund | admin_add | admin_subtract
- status: pending | success | failed | refunded
- job_id nullable
- assessment_id nullable
- actor_user_id
- actor_role
- reason nullable
- created_at
- updated_at

Rules:
- amount negatif untuk Kredit keluar
- amount positif untuk Kredit masuk/refund
- reason wajib untuk admin_add dan admin_subtract

### jobs

Fields:
- id
- owner_user_id
- type: generate_questions | regenerate_question | improve_question | generate_explanation | generate_blueprint
- status: waiting | processing | completed | failed | partially_failed
- input_snapshot_json
- estimated_credit
- actual_credit
- credit_status: not_charged | reserved | charged | partially_charged | refunded
- error_message nullable
- created_at
- updated_at
- completed_at nullable

### assessments

Fields:
- id
- owner_user_id
- source_job_id nullable
- title
- subject
- grade
- creation_mode: manual | ai
- material_text nullable
- material_source_filename nullable
- material_extracted_at nullable
- status: draft | generating | needs_review | ready_to_export | exporting | pdf_ready | error
- created_at
- updated_at

### questions

Fields:
- id
- assessment_id
- number
- type
- difficulty
- prompt
- image_url nullable
- correct_answer
- explanation nullable
- blueprint_item nullable
- created_at
- updated_at

### answer_options

Fields:
- id
- question_id
- label
- text
- is_correct
- created_at
- updated_at

### exports

Fields:
- id
- assessment_id
- owner_user_id
- output_types_json
- status: processing | completed | failed
- file_path nullable
- error_message nullable
- created_at
- updated_at

### audit_logs

Fields:
- id
- event_type
- actor_user_id
- actor_role
- target_user_id nullable
- related_job_id nullable
- related_transaction_id nullable
- related_assessment_id nullable
- metadata_json
- created_at

## API Design

API endpoint structure is documented separately in `docs/12_API_STRUCTURE.md`.

## Request Validation

Validation rules:
- Use DTO request structs
- Validate required fields before calling use case
- Validate enums for role, status, job type, question type, difficulty, transaction type
- Validate amount Kredit > 0 for manual adjustment
- Validate reason required for manual adjustment
- Validate jumlah soal > 0
- Validate material_text required for AI assessment
- Validate image_url if provided
- Validate user ownership in use case layer

## Authorization Rules

Middleware:
- `RequireAuth`
- `RequireRole(Admin)`
- `RequireActiveUser`

Use case checks:
- `CanAccessUser`
- `CanAccessJob`
- `CanAccessAssessment`
- `CanManageCredit`
- `CanManageUser`

Rules:
- Admin endpoint requires Admin role
- Guru endpoint filters by current user ID
- Ownership checks happen even if route already appears role-scoped
- Access denied returns safe error message

## Credit Flow

### Estimate

1. User submits generate options
2. Backend validates request and material_text
3. Backend calculates estimated credit
4. Backend returns total and breakdown

### Create AI Job

1. User submits request with options
2. Backend validates ownership and active status
3. Backend validates extracted material text for AI mode
4. Backend recalculates estimated credit server-side
5. Backend checks user balance
6. If balance is insufficient, return insufficient credit error
7. Backend creates Job
8. Worker processes Job

### Charge

1. Worker receives AI result
2. Worker counts successful outputs
3. Worker calculates actual credit
4. Worker creates credit transaction
5. Worker updates balance
6. Worker updates Job actual_credit and credit_status
7. Worker writes audit log

### Refund

1. Worker detects failed or partially failed Job
2. Worker calculates unused credit if reservation exists
3. Worker creates refund transaction
4. Worker updates balance
5. Worker updates Job credit_status
6. Worker writes audit log

## Job Worker Design

MVP approach:
- Jobs are stored in SQLite
- Worker polls Jobs with status waiting
- Worker marks Job as processing
- Worker calls AI provider through adapter
- Worker writes result into assessments/questions
- Worker updates Job status
- Worker charges or refunds Kredit

Concurrency rules:
- Worker must lock or atomically claim a Job before processing
- Same Job must not be processed twice
- Credit transaction and balance update must be database-transactional
- Job final state should be idempotent

Failure rules:
- Provider error marks Job failed
- Partial output marks Job partially_failed
- Unexpected panic/error should be captured as failed with safe message
- Input snapshot remains stored for retry

## AI Provider Adapter

Interface responsibilities:
- Generate questions
- Regenerate question
- Improve question
- Generate explanation
- Generate blueprint/kisi-kisi

Adapter rules:
- No provider-specific logic in use cases
- Provider API key loaded from environment/config
- Provider raw error mapped to safe domain error
- Prompt/input can be logged only if safe and sanitized

## Error Handling

HTTP status mapping:
- 400: validation error
- 401: unauthenticated
- 403: unauthorized / role not allowed
- 404: resource not found
- 409: conflict, such as duplicate email or invalid state transition
- 422: business rule violation, such as insufficient credit
- 500: unexpected server error

Error response shape:

```json
{
  "error": {
    "code": "INSUFFICIENT_CREDIT",
    "message": "Kredit tidak cukup",
    "details": {}
  }
}
```

Rules:
- Error message should be user-safe
- Internal error details go to logs, not response
- Validation errors should identify fields
- AI provider errors should not expose provider internals

## Security

Rules:
- Hash passwords with a secure algorithm
- Never log plain password
- Never expose JWT secret
- Never expose AI provider API key
- Validate JWT on protected endpoints
- Reject inactive users
- Validate file uploads
- Limit upload file type and size
- Do not store uploaded material Word/PDF files
- Ensure file download checks owner or Admin permission
- Use server-side validation for all credit and role operations

## Configuration

Environment variables:

```text
APP_ENV
APP_PORT
DATABASE_PATH
JWT_SECRET
JWT_EXPIRES_IN
AI_PROVIDER
AI_API_KEY
EXPORT_STORAGE_PATH
MAX_UPLOAD_SIZE
```

Rules:
- Secrets must not be committed
- Production config must use strong JWT secret
- AI provider key loaded only server-side

## Database Transaction Requirements

Use database transaction for:
- Manual credit adjustment
- AI credit charge
- AI refund
- Job finalization with credit update
- Create user with initial credit if supported
- Role/status change with audit log

Rules:
- Balance update and transaction insert must commit together
- Job final status and credit transaction should be consistent
- If any part fails, rollback

## Testing Strategy

Unit tests:
- Credit estimate calculation
- Credit charge and refund rules
- Role permission rules
- Job status transition
- User status rules
- Validation rules

Integration tests:
- Login as Guru and Admin
- Guru cannot access Admin endpoints
- Guru cannot access another Guru Assessment
- Admin can create user
- Admin can adjust credit
- Insufficient credit blocks Job creation
- Job success charges credit
- Job failure does not charge credit
- Job partial failure refunds unused credit
- Export PDF does not charge credit

Worker tests:
- Worker claims waiting Job
- Worker does not process same Job twice
- Worker handles provider failure
- Worker writes Assessment output
- Worker writes credit transaction

## Observability

Logs should include:
- Request ID
- User ID when available
- Job ID when processing Job
- Transaction ID for credit mutation
- Safe error code

Logs must not include:
- Password
- JWT secret
- AI API key
- Raw sensitive upload contents

Metrics optional for MVP:
- Job success count
- Job failure count
- Credit charged total
- Credit refund total
- AI provider error count

## MVP Backend Acceptance Checklist

Backend architecture is considered ready if:
- Auth supports Admin and Guru
- Inactive users cannot access protected APIs
- Backend enforces role and ownership
- Admin can manage users
- Admin can adjust Kredit with reason
- Credit ledger records all credit changes
- AI Jobs have estimated and actual credit
- Insufficient credit blocks Job creation
- Successful AI output charges Kredit
- Failed Job does not charge Kredit
- Partial Job failure refunds unused Kredit
- Export PDF without AI does not charge Kredit
- Audit logs are append-only
- Provider secrets are never exposed
- Database transaction protects balance and transaction consistency
