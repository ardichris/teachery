# API Structure

## Tujuan

Dokumen ini menjelaskan struktur endpoint API Teachery. Detail arsitektur backend tetap berada di `11_BACKEND_ARCHITECTURE.md`.

API harus mendukung:
- Auth JWT
- Role Admin dan Guru
- User Management
- Credit Management
- Jobs AI
- assessments
- Export PDF
- Audit log
- Validasi role, ownership, status user, dan saldo Kredit

## Base Path

```text
/api
```

## Auth

```text
POST /auth/login
GET  /auth/me
POST /auth/logout
```

Rules:
- `POST /auth/login` menerima email dan password
- `GET /auth/me` mengembalikan user aktif, role, dan informasi dasar session
- User nonaktif tidak boleh menerima akses API protected
- JWT digunakan pada endpoint protected

## Guru APIs

Endpoint berikut digunakan oleh role Guru untuk data miliknya sendiri.

```text
GET  /me/credit-balance
GET  /me/credit-transactions

POST /materials/extract
POST /credit/estimate

POST /assessments
POST /jobs
GET  /jobs
GET  /jobs/:id
POST /jobs/:id/retry

GET  /assessments
GET  /assessments/:id
PUT  /assessments/:id
PUT  /assessments/:id/questions/:questionId
DELETE /assessments/:id/questions/:questionId

POST /assessments/:id/questions/:questionId/regenerate
POST /assessments/:id/questions/:questionId/improve

POST /assessments/:id/exports
GET  /exports/:id
GET  /exports/:id/download
```

Rules:
- Guru hanya bisa mengakses resource miliknya sendiri
- `POST /materials/extract` hanya mengekstrak teks dari Word/PDF dan tidak menyimpan file asli
- `POST /assessments` membuat assessment manual tanpa Kredit
- `POST /credit/estimate` wajib dipakai sebelum proses AI
- Generate soal dengan AI wajib menyertakan teks materi hasil ekstraksi
- `POST /jobs` harus mengecek saldo Kredit server-side
- `POST /jobs/:id/retry` membuat Job baru, bukan mengubah Job lama
- Edit manual assessment tidak memakai Kredit
- Regenerate/improve question memakai estimasi Kredit dan membuat Job AI baru
- Export PDF tanpa AI tambahan tidak memakai Kredit

## Admin APIs

Endpoint berikut hanya dapat diakses oleh role Admin.

```text
GET  /admin/dashboard

GET  /admin/users
POST /admin/users
GET  /admin/users/:id
PUT  /admin/users/:id
PATCH /admin/users/:id/status
PATCH /admin/users/:id/role

GET  /admin/credits/transactions
GET  /admin/users/:id/credit-balance
POST /admin/users/:id/credits/adjust

GET  /admin/jobs
GET  /admin/jobs/:id

GET  /admin/audit-logs
```

Rules:
- Admin dapat melihat semua user, Jobs, dan transaksi Kredit
- Admin dapat membuat dan mengubah user
- Admin dapat mengubah role user, dengan aturan minimal satu Admin aktif
- Admin dapat mengaktifkan atau menonaktifkan user
- Admin dapat menambah atau mengurangi Kredit user
- Manual credit adjustment wajib memiliki alasan
- Semua perubahan Kredit oleh Admin wajib tercatat sebagai transaksi dan audit log

## Standard Response Shape

Success response:

```json
{
  "data": {},
  "meta": {}
}
```

List response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

Error response:

```json
{
  "error": {
    "code": "INSUFFICIENT_CREDIT",
    "message": "Kredit tidak cukup",
    "details": {}
  }
}
```

## Common Error Codes

```text
VALIDATION_ERROR
UNAUTHENTICATED
UNAUTHORIZED
RESOURCE_NOT_FOUND
DUPLICATE_EMAIL
INSUFFICIENT_CREDIT
INVALID_JOB_STATE
INACTIVE_USER
AI_PROVIDER_ERROR
EXPORT_FAILED
INTERNAL_SERVER_ERROR
```

## HTTP Status Mapping

```text
400 Validation error
401 Unauthenticated
403 Unauthorized or role not allowed
404 Resource not found
409 Conflict, duplicate email, or invalid state transition
422 Business rule violation, such as insufficient credit
500 Unexpected server error
```

## Authorization Rules

Rules:
- All protected endpoints require JWT
- Admin endpoints require role Admin
- Guru endpoints require ownership validation
- Inactive users are rejected even if JWT is valid
- Frontend route guards are not enough; backend must enforce permission
- Access denied should use safe message: "Akses tidak tersedia"

## Pagination & Filtering

List endpoints should support pagination when data can grow.

Recommended query params:

```text
page
limit
search
status
role
date_from
date_to
```

Examples:

```text
GET /admin/users?page=1&limit=20&role=guru&status=active
GET /admin/jobs?page=1&limit=20&status=failed
GET /admin/credits/transactions?page=1&limit=20&date_from=2026-01-01
```

## MVP API Acceptance Checklist

API structure is considered ready if:
- Auth endpoints support login and current user lookup
- Guru can access only their own Jobs, assessments, exports, and Credit transactions
- Admin can manage users and Kredit
- Admin can inspect all Jobs and Credit transactions
- AI actions require credit estimation
- Job creation is blocked when Kredit is insufficient
- Credit adjustment requires Admin and reason
- Export endpoints do not charge Kredit unless AI is triggered
- Error responses use consistent shape
- Backend validates role, ownership, user status, and business rules
