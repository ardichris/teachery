# API Contract

Dokumen ini mendefinisikan kontrak API Teachery berdasarkan assessment sebelumnya:

- `12_API_STRUCTURE.md`
- `14_DATABASE_SCHEMA.md`
- `15_ENTITY_RELATIONSHIP.md`
- `16_DATA_DICTIONARY.md`
- `07_BUSINESS_RULES.md`

API contract ini menjadi acuan implementasi backend, frontend integration, validasi request, response shape, dan error handling.

## Base URL

```text
/api
```

Semua endpoint protected memakai JWT access token.

Header:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Standard Response

Success object:

```json
{
  "data": {},
  "meta": {}
}
```

Success list:

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

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data tidak valid",
    "details": {}
  }
}
```

## Common HTTP Status

| Status | Meaning | Usage |
| --- | --- | --- |
| `200` | OK | Request berhasil. |
| `201` | Created | Resource berhasil dibuat. |
| `400` | Bad Request | Format request salah. |
| `401` | Unauthenticated | Token tidak ada, invalid, atau expired. |
| `403` | Unauthorized | Role tidak sesuai atau ownership gagal. |
| `404` | Not Found | Resource tidak ditemukan atau tidak boleh diakses. |
| `409` | Conflict | Duplicate email atau state transition tidak valid. |
| `422` | Business Rule Error | Kredit tidak cukup atau rule domain gagal. |
| `500` | Internal Server Error | Error tak terduga. |

## Common Error Codes

| Code | Description |
| --- | --- |
| `VALIDATION_ERROR` | Request gagal validasi field. |
| `UNAUTHENTICATED` | User belum login atau token tidak valid. |
| `UNAUTHORIZED` | User tidak punya akses. |
| `RESOURCE_NOT_FOUND` | Resource tidak ditemukan. |
| `DUPLICATE_EMAIL` | Email sudah dipakai. |
| `INACTIVE_USER` | User inactive mencoba memakai API. |
| `INSUFFICIENT_CREDIT` | Kredit tidak cukup untuk proses AI. |
| `INVALID_JOB_STATE` | Job tidak berada pada state yang valid. |
| `INVALID_Assessment_STATE` | assessment tidak berada pada state yang valid. |
| `AI_PROVIDER_ERROR` | Provider AI gagal. |
| `EXPORT_FAILED` | Export assessment gagal. |
| `INTERNAL_SERVER_ERROR` | Error server tidak terduga. |

## Auth Contract

### POST /auth/login

Login user.

Access: Public.

Request:

```json
{
  "email": "guru@teachery.local",
  "password": "password"
}
```

Validation:

- `email` wajib, format email.
- `password` wajib.
- User harus `active`.

Response `200`:

```json
{
  "data": {
    "access_token": "jwt-token",
    "token_type": "Bearer",
    "user": {
      "id": "usr_123",
      "name": "Budi Santoso",
      "email": "guru@teachery.local",
      "role": "guru",
      "status": "active"
    }
  },
  "meta": {}
}
```

Errors:

- `401 UNAUTHENTICATED`
- `403 INACTIVE_USER`

### GET /auth/me

Mengambil user session saat ini.

Access: Admin, Guru.

Response `200`:

```json
{
  "data": {
    "id": "usr_123",
    "name": "Budi Santoso",
    "email": "guru@teachery.local",
    "role": "guru",
    "status": "active",
    "credit_balance": 100
  },
  "meta": {}
}
```

Rules:

- `password_hash` tidak boleh dikirim.
- User inactive ditolak walaupun token masih valid.

### POST /auth/logout

Logout user.

Access: Admin, Guru.

Response `200`:

```json
{
  "data": {
    "success": true
  },
  "meta": {}
}
```

## Material Extraction Contract

### POST /materials/extract

Mengekstrak teks dari file materi pembelajaran Word/PDF untuk dipakai sebagai konteks AI.

Access: Guru.

Request:

```text
multipart/form-data
file: materi.pdf | materi.docx
```

Response `200`:

```json
{
  "data": {
    "source_filename": "materi-bilangan-bulat.pdf",
    "mime_type": "application/pdf",
    "extracted_text": "Bilangan bulat adalah ...",
    "extracted_text_length": 2430
  },
  "meta": {}
}
```

Rules:

- Endpoint ini tidak menyimpan file asli.
- File yang didukung: PDF dan Word/DOCX.
- Jika teks kosong atau gagal diekstrak, response error `MATERIAL_EXTRACTION_FAILED`.
- `extracted_text` dipakai untuk membuat assessment AI dan prompt AI.

## Credit Contract

### GET /me/credit-balance

Mengambil saldo Kredit user login.

Access: Guru.

Response `200`:

```json
{
  "data": {
    "user_id": "usr_123",
    "balance": 100,
    "updated_at": "2026-06-01T10:00:00Z"
  },
  "meta": {}
}
```

### GET /me/credit-transactions

Mengambil riwayat Kredit user login.

Access: Guru.

Query:

```text
page
limit
type
status
date_from
date_to
```

Response `200`:

```json
{
  "data": [
    {
      "id": "ctx_123",
      "amount": -10,
      "type": "ai_charge",
      "status": "success",
      "job_id": "job_123",
      "assessment_id": "asm_123",
      "reason": "Generate 10 soal",
      "created_at": "2026-06-01T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

Rules:

- Guru hanya melihat transaksi dengan `user_id` miliknya.

### POST /credit/estimate

Menghitung estimasi Kredit sebelum proses AI.

Access: Guru.

Request:

```json
{
  "type": "generate_questions",
  "input": {
    "creation_mode": "ai",
    "subject": "Matematika",
    "grade": "Kelas 7",
    "material_text": "Bilangan bulat adalah ...",
    "material_source_filename": "materi-bilangan-bulat.pdf",
    "question_type": "multiple_choice",
    "question_count": 10,
    "difficulty": "medium",
    "include_explanation": true
  }
}
```

Response `200`:

```json
{
  "data": {
    "type": "generate_questions",
    "estimated_credit": 10,
    "available_credit": 100,
    "is_sufficient": true,
    "calculation": {
      "base_rule": "1 generated question = 1 credit",
      "question_count": 10
    }
  },
  "meta": {}
}
```

Rules:

- Estimasi dihitung server-side.
- `material_text` wajib untuk generate soal dengan AI.
- Frontend boleh menampilkan estimasi, tetapi backend tetap wajib validasi ulang saat membuat job.
- Untuk MVP, 1 soal berhasil dihasilkan AI = 1 Kredit.

## Jobs Contract

### POST /jobs

Membuat job AI baru.

Access: Guru.

Request:

```json
{
  "type": "generate_questions",
  "input": {
    "creation_mode": "ai",
    "subject": "Matematika",
    "grade": "Kelas 7",
    "material_text": "Bilangan bulat adalah ...",
    "material_source_filename": "materi-bilangan-bulat.pdf",
    "question_type": "multiple_choice",
    "question_count": 10,
    "difficulty": "medium",
    "include_explanation": true,
    "blueprint": "Bilangan bulat dan operasi dasar"
  }
}
```

Validation:

- `type` wajib dan harus enum job type.
- `input.subject` wajib.
- `input.grade` wajib.
- `input.creation_mode` wajib: `manual` atau `ai`.
- `input.material_text` wajib untuk mode `ai`.
- File materi asli tidak boleh disimpan.
- `input.question_count` wajib, integer lebih dari 0.
- Kredit user harus cukup berdasarkan estimasi server.

Response `201`:

```json
{
  "data": {
    "id": "job_123",
    "owner_user_id": "usr_123",
    "type": "generate_questions",
    "status": "waiting",
    "estimated_credit": 10,
    "actual_credit": 0,
    "credit_status": "not_charged",
    "created_at": "2026-06-01T10:00:00Z"
  },
  "meta": {}
}
```

Errors:

- `422 INSUFFICIENT_CREDIT`
- `400 VALIDATION_ERROR`

Rules:

- Backend membuat `jobs.input_snapshot_json`.
- Job baru dimulai dengan status `waiting`.
- Kredit belum dianggap terpakai sampai AI menghasilkan output sukses.
- Jika memakai reserved credit, `credit_status` boleh menjadi `reserved`.

### POST /assessments

Membuat assessment manual tanpa AI.

Access: Guru.

Request:

```json
{
  "title": "Penilaian Harian Bilangan Bulat",
  "subject": "Matematika",
  "grade": "Kelas 7",
  "creation_mode": "manual"
}
```

Response `201`:

```json
{
  "data": {
    "id": "asm_123",
    "title": "Penilaian Harian Bilangan Bulat",
    "subject": "Matematika",
    "grade": "Kelas 7",
    "creation_mode": "manual",
    "status": "draft"
  },
  "meta": {}
}
```

Rules:

- Membuat assessment manual tidak memakai Kredit.
- Guru dapat menambahkan soal manual setelah assessment dibuat.

### GET /jobs

Mengambil daftar job milik user login.

Access: Guru.

Query:

```text
page
limit
status
type
date_from
date_to
```

Response `200`:

```json
{
  "data": [
    {
      "id": "job_123",
      "type": "generate_questions",
      "status": "completed",
      "estimated_credit": 10,
      "actual_credit": 10,
      "credit_status": "charged",
      "created_at": "2026-06-01T10:00:00Z",
      "completed_at": "2026-06-01T10:01:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### GET /jobs/:id

Mengambil detail job.

Access: Guru owner.

Response `200`:

```json
{
  "data": {
    "id": "job_123",
    "type": "generate_questions",
    "status": "completed",
    "estimated_credit": 10,
    "actual_credit": 10,
    "credit_status": "charged",
    "error_message": null,
    "assessment_id": "asm_123",
    "created_at": "2026-06-01T10:00:00Z",
    "completed_at": "2026-06-01T10:01:00Z"
  },
  "meta": {}
}
```

Rules:

- Guru hanya boleh membuka job miliknya.
- Jika tidak punya akses, response boleh `404 RESOURCE_NOT_FOUND` agar tidak membocorkan data.

### POST /jobs/:id/retry

Membuat job baru dari input job lama.

Access: Guru owner.

Response `201`:

```json
{
  "data": {
    "id": "job_456",
    "source_job_id": "job_123",
    "status": "waiting",
    "estimated_credit": 10,
    "credit_status": "not_charged"
  },
  "meta": {}
}
```

Rules:

- Retry membuat job baru, bukan mengubah job lama.
- Kredit dicek ulang.
- Hanya job `failed` atau `partially_failed` yang boleh diretry.

## assessments Contract

### GET /assessments

Mengambil daftar assessment milik user login.

Access: Guru.

Query:

```text
page
limit
search
status
subject
grade
date_from
date_to
```

Response `200`:

```json
{
  "data": [
    {
      "id": "asm_123",
      "title": "Latihan Matematika Kelas 7",
      "subject": "Matematika",
      "grade": "Kelas 7",
      "status": "needs_review",
      "question_count": 10,
      "created_at": "2026-06-01T10:01:00Z",
      "updated_at": "2026-06-01T10:01:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### GET /assessments/:id

Mengambil detail assessment beserta soal dan opsi jawaban.

Access: Guru owner.

Response `200`:

```json
{
  "data": {
    "id": "asm_123",
    "title": "Latihan Matematika Kelas 7",
    "subject": "Matematika",
    "grade": "Kelas 7",
    "creation_mode": "ai",
    "status": "needs_review",
    "source_job_id": "job_123",
    "questions": [
      {
        "id": "q_001",
        "number": 1,
        "type": "multiple_choice",
        "difficulty": "medium",
        "prompt": "Hasil dari 12 + (-5) adalah ...",
        "image_url": "https://example.com/ilustrasi-bilangan.png",
        "correct_answer": null,
        "explanation": "12 + (-5) = 7.",
        "blueprint_item": "Operasi bilangan bulat",
        "answer_options": [
          {
            "id": "opt_001",
            "label": "A",
            "text": "7",
            "is_correct": 1
          }
        ]
      }
    ],
    "created_at": "2026-06-01T10:01:00Z",
    "updated_at": "2026-06-01T10:01:00Z"
  },
  "meta": {}
}
```

Rules:

- Guru hanya boleh membuka assessment miliknya.
- `password_hash`, internal prompt provider, dan credential AI tidak boleh muncul.

### PUT /assessments/:id

Mengubah metadata assessment.

Access: Guru owner.

Request:

```json
{
  "title": "Latihan Operasi Bilangan Bulat",
  "subject": "Matematika",
  "grade": "Kelas 7",
  "status": "ready_to_export"
}
```

Response `200`:

```json
{
  "data": {
    "id": "asm_123",
    "title": "Latihan Operasi Bilangan Bulat",
    "subject": "Matematika",
    "grade": "Kelas 7",
    "status": "ready_to_export",
    "updated_at": "2026-06-01T10:10:00Z"
  },
  "meta": {}
}
```

Rules:

- Edit manual assessment tidak memakai Kredit.
- Status transition harus valid.

### PUT /assessments/:id/questions/:questionId

Mengubah isi soal secara manual.

Access: Guru owner.

Request:

```json
{
  "number": 1,
  "type": "multiple_choice",
  "difficulty": "medium",
  "prompt": "Hasil dari 12 + (-5) adalah ...",
  "image_url": "https://example.com/ilustrasi-bilangan.png",
  "correct_answer": null,
  "explanation": "12 + (-5) = 7.",
  "blueprint_item": "Operasi bilangan bulat",
  "answer_options": [
    {
      "label": "A",
      "text": "7",
      "is_correct": 1
    },
    {
      "label": "B",
      "text": "8",
      "is_correct": 0
    }
  ]
}
```

Response `200`:

```json
{
  "data": {
    "id": "q_001",
    "number": 1,
    "updated_at": "2026-06-01T10:12:00Z"
  },
  "meta": {}
}
```

Rules:

- Edit manual soal tidak memakai Kredit.
- `image_url` opsional dan harus berupa URL valid jika diisi.
- `number` harus unik dalam assessment.
- Multiple choice harus memiliki minimal 2 opsi dan satu jawaban benar.

### DELETE /assessments/:id/questions/:questionId

Menghapus soal dari assessment.

Access: Guru owner.

Response `200`:

```json
{
  "data": {
    "success": true
  },
  "meta": {}
}
```

Rules:

- Hapus soal tidak mengembalikan Kredit.
- Answer options ikut terhapus.

### POST /assessments/:id/questions/:questionId/regenerate

Membuat ulang satu soal memakai AI.

Access: Guru owner.

Request:

```json
{
  "instruction": "Buat soal dengan konteks sehari-hari",
  "difficulty": "medium"
}
```

Response `201`:

```json
{
  "data": {
    "job_id": "job_789",
    "estimated_credit": 1,
    "status": "waiting"
  },
  "meta": {}
}
```

Rules:

- Memakai Kredit karena memanggil AI.
- Backend membuat job baru dengan type `regenerate_question`.
- Kredit dicek server-side.

### POST /assessments/:id/questions/:questionId/improve

Memperbaiki kualitas satu soal memakai AI.

Access: Guru owner.

Request:

```json
{
  "instruction": "Perjelas kalimat soal dan buat distraktor lebih masuk akal"
}
```

Response `201`:

```json
{
  "data": {
    "job_id": "job_790",
    "estimated_credit": 1,
    "status": "waiting"
  },
  "meta": {}
}
```

Rules:

- Memakai Kredit karena memanggil AI.
- Backend membuat job baru dengan type `improve_question`.

## Export Contract

### POST /assessments/:id/exports

Membuat export assessment.

Access: Guru owner.

Request:

```json
{
  "output_types": ["pdf"],
  "include_answer_key": true,
  "include_explanation": true
}
```

Validation:

- `output_types` wajib, array minimal 1.
- Format yang didukung: `pdf`, `docx`, `xlsx`, `csv`.

Response `201`:

```json
{
  "data": {
    "id": "exp_123",
    "assessment_id": "asm_123",
    "status": "processing",
    "output_types": ["pdf"],
    "created_at": "2026-06-01T10:20:00Z"
  },
  "meta": {}
}
```

Rules:

- Export standar tidak memakai Kredit.
- Jika export memanggil AI tambahan, harus memakai flow estimate dan job AI.
- assessment harus berada pada status yang boleh diexport.

### GET /exports/:id

Mengambil status export.

Access: Guru owner.

Response `200`:

```json
{
  "data": {
    "id": "exp_123",
    "assessment_id": "asm_123",
    "status": "completed",
    "output_types": ["pdf"],
    "download_url": "/api/exports/exp_123/download",
    "created_at": "2026-06-01T10:20:00Z",
    "updated_at": "2026-06-01T10:21:00Z"
  },
  "meta": {}
}
```

### GET /exports/:id/download

Mengunduh file export.

Access: Guru owner.

Response:

```text
Binary file response
```

Rules:

- Export harus `completed`.
- User harus owner assessment/export.
- Internal `file_path` tidak boleh diekspos sebagai path lokal mentah.

## Admin Contract

### GET /admin/dashboard

Mengambil ringkasan admin.

Access: Admin.

Response `200`:

```json
{
  "data": {
    "total_users": 25,
    "active_guru": 20,
    "total_credit_balance": 1500,
    "jobs_today": 35,
    "failed_jobs_today": 2,
    "credits_used_today": 120
  },
  "meta": {}
}
```

### GET /admin/users

Mengambil daftar user.

Access: Admin.

Query:

```text
page
limit
search
role
status
```

Response `200`:

```json
{
  "data": [
    {
      "id": "usr_123",
      "name": "Budi Santoso",
      "email": "guru@teachery.local",
      "role": "guru",
      "status": "active",
      "credit_balance": 100,
      "created_at": "2026-06-01T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### POST /admin/users

Membuat user baru.

Access: Admin.

Request:

```json
{
  "name": "Budi Santoso",
  "email": "guru@teachery.local",
  "password": "temporary-password",
  "role": "guru",
  "status": "active",
  "initial_credit": 100
}
```

Response `201`:

```json
{
  "data": {
    "id": "usr_123",
    "name": "Budi Santoso",
    "email": "guru@teachery.local",
    "role": "guru",
    "status": "active",
    "credit_balance": 100
  },
  "meta": {}
}
```

Rules:

- Email harus unik.
- Password disimpan sebagai hash.
- Jika `initial_credit > 0`, harus membuat credit transaction dan audit log.
- `password_hash` tidak boleh dikirim ke response.

### GET /admin/users/:id

Mengambil detail user.

Access: Admin.

Response `200`:

```json
{
  "data": {
    "id": "usr_123",
    "name": "Budi Santoso",
    "email": "guru@teachery.local",
    "role": "guru",
    "status": "active",
    "credit_balance": 100,
    "created_at": "2026-06-01T10:00:00Z",
    "updated_at": "2026-06-01T10:00:00Z"
  },
  "meta": {}
}
```

### PUT /admin/users/:id

Mengubah data user.

Access: Admin.

Request:

```json
{
  "name": "Budi Santoso",
  "email": "budi@teachery.local"
}
```

Response `200`:

```json
{
  "data": {
    "id": "usr_123",
    "name": "Budi Santoso",
    "email": "budi@teachery.local",
    "updated_at": "2026-06-01T10:30:00Z"
  },
  "meta": {}
}
```

Rules:

- Email baru harus unik.
- Perubahan penting harus masuk audit log.

### PATCH /admin/users/:id/status

Mengubah status user.

Access: Admin.

Request:

```json
{
  "status": "inactive",
  "reason": "User tidak lagi aktif mengajar"
}
```

Response `200`:

```json
{
  "data": {
    "id": "usr_123",
    "status": "inactive",
    "updated_at": "2026-06-01T10:35:00Z"
  },
  "meta": {}
}
```

Rules:

- Reason wajib.
- Sistem harus menjaga minimal satu Admin aktif.
- User inactive tidak boleh login.
- Perubahan status wajib masuk audit log.

### PATCH /admin/users/:id/role

Mengubah role user.

Access: Admin.

Request:

```json
{
  "role": "admin",
  "reason": "Ditunjuk sebagai pengelola aplikasi"
}
```

Response `200`:

```json
{
  "data": {
    "id": "usr_123",
    "role": "admin",
    "updated_at": "2026-06-01T10:40:00Z"
  },
  "meta": {}
}
```

Rules:

- Reason wajib.
- Sistem harus menjaga minimal satu Admin aktif.
- Perubahan role wajib masuk audit log.

### GET /admin/users/:id/credit-balance

Mengambil saldo Kredit user tertentu.

Access: Admin.

Response `200`:

```json
{
  "data": {
    "user_id": "usr_123",
    "balance": 100,
    "updated_at": "2026-06-01T10:00:00Z"
  },
  "meta": {}
}
```

### POST /admin/users/:id/credits/adjust

Menambah atau mengurangi Kredit user.

Access: Admin.

Request:

```json
{
  "amount": 50,
  "type": "admin_add",
  "reason": "Top up bulanan"
}
```

Validation:

- `amount` wajib dan tidak boleh `0`.
- `type` wajib: `admin_add` atau `admin_subtract`.
- `reason` wajib.
- Untuk `admin_add`, `amount` harus positif.
- Untuk `admin_subtract`, `amount` harus negatif.
- Saldo akhir tidak boleh negatif.

Response `201`:

```json
{
  "data": {
    "transaction": {
      "id": "ctx_123",
      "user_id": "usr_123",
      "amount": 50,
      "type": "admin_add",
      "status": "success",
      "reason": "Top up bulanan",
      "created_at": "2026-06-01T10:45:00Z"
    },
    "balance": {
      "user_id": "usr_123",
      "balance": 150,
      "updated_at": "2026-06-01T10:45:00Z"
    }
  },
  "meta": {}
}
```

Rules:

- Insert `credit_transactions`, update `credit_balances`, dan insert `audit_logs` harus dalam satu database transaction.
- Semua adjustment Admin wajib masuk audit log.

### GET /admin/credits/transactions

Mengambil semua transaksi Kredit.

Access: Admin.

Query:

```text
page
limit
user_id
type
status
date_from
date_to
```

Response `200`:

```json
{
  "data": [
    {
      "id": "ctx_123",
      "user_id": "usr_123",
      "user_name": "Budi Santoso",
      "amount": -10,
      "type": "ai_charge",
      "status": "success",
      "job_id": "job_123",
      "assessment_id": "asm_123",
      "actor_user_id": "usr_123",
      "actor_role": "guru",
      "reason": "Generate 10 soal",
      "created_at": "2026-06-01T10:01:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### GET /admin/jobs

Mengambil semua job untuk monitoring.

Access: Admin.

Query:

```text
page
limit
user_id
status
type
date_from
date_to
```

Response `200`:

```json
{
  "data": [
    {
      "id": "job_123",
      "owner_user_id": "usr_123",
      "owner_name": "Budi Santoso",
      "type": "generate_questions",
      "status": "completed",
      "estimated_credit": 10,
      "actual_credit": 10,
      "credit_status": "charged",
      "created_at": "2026-06-01T10:00:00Z",
      "completed_at": "2026-06-01T10:01:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### GET /admin/jobs/:id

Mengambil detail job untuk monitoring.

Access: Admin.

Response `200`:

```json
{
  "data": {
    "id": "job_123",
    "owner_user_id": "usr_123",
    "owner_name": "Budi Santoso",
    "type": "generate_questions",
    "status": "completed",
    "input_snapshot": {
      "subject": "Matematika",
      "grade": "Kelas 7",
      "question_count": 10
    },
    "estimated_credit": 10,
    "actual_credit": 10,
    "credit_status": "charged",
    "error_message": null,
    "created_at": "2026-06-01T10:00:00Z",
    "completed_at": "2026-06-01T10:01:00Z"
  },
  "meta": {}
}
```

Rules:

- Jangan tampilkan credential AI.
- Prompt internal boleh disamarkan jika mengandung data sensitif.

### GET /admin/audit-logs

Mengambil audit log.

Access: Admin.

Query:

```text
page
limit
event_type
actor_user_id
target_user_id
date_from
date_to
```

Response `200`:

```json
{
  "data": [
    {
      "id": "aud_123",
      "event_type": "credit.admin_added",
      "actor_user_id": "adm_001",
      "actor_role": "admin",
      "target_user_id": "usr_123",
      "related_transaction_id": "ctx_123",
      "metadata": {
        "reason": "Top up bulanan",
        "amount": 50
      },
      "created_at": "2026-06-01T10:45:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

Rules:

- Audit log read-only.
- Metadata tidak boleh berisi password, token, API key, atau secret.

## Authorization Matrix

| Endpoint Group | Public | Guru | Admin | Ownership Required |
| --- | --- | --- | --- | --- |
| `/auth/login` | Yes | Yes | Yes | No |
| `/auth/me` | No | Yes | Yes | No |
| `/me/*` | No | Yes | No | Current user only |
| `/credit/estimate` | No | Yes | No | Current user only |
| `/jobs/*` | No | Yes | No | Yes |
| `/assessments/*` | No | Yes | No | Yes |
| `/exports/*` | No | Yes | No | Yes |
| `/admin/*` | No | No | Yes | No |

Rules:

- Backend wajib enforce role dan ownership.
- Frontend route guard hanya lapisan UX, bukan security boundary.
- Guru yang mencoba membuka data user lain harus menerima `404` atau `403` sesuai strategi keamanan API.

## Credit Flow Contract

AI generate success:

1. `POST /credit/estimate` mengembalikan estimasi.
2. `POST /jobs` mengecek saldo dan membuat job.
3. Worker memproses AI.
4. Jika output berhasil, backend membuat Assessment/questions/options.
5. Backend membuat `credit_transactions` type `ai_charge`.
6. Backend update `credit_balances`.
7. Backend update job menjadi `completed` dan `credit_status = charged`.

AI generate failed:

1. Job menjadi `failed`.
2. Jika belum ada output sukses, Kredit tidak dipotong.
3. Jika Kredit sudah terpotong, backend membuat `ai_refund`.
4. Error disimpan di `jobs.error_message`.

Admin adjustment:

1. Admin memanggil `POST /admin/users/:id/credits/adjust`.
2. Backend validasi role Admin dan reason.
3. Backend insert `credit_transactions`.
4. Backend update `credit_balances`.
5. Backend insert `audit_logs`.

## Pagination Contract

Default:

```text
page=1
limit=20
```

Rules:

- `page` minimum `1`.
- `limit` minimum `1`, maksimum `100`.
- Response list wajib memiliki `meta.page`, `meta.limit`, dan `meta.total`.

## Date Filter Contract

Format tanggal:

```text
YYYY-MM-DD
```

Contoh:

```text
GET /admin/jobs?date_from=2026-06-01&date_to=2026-06-30
```

Rules:

- `date_from` dan `date_to` memakai timezone server atau UTC sesuai implementasi backend.
- Jika memakai timestamp ISO di database, backend bertanggung jawab melakukan konversi yang konsisten.

## Security Rules

- `password_hash` tidak boleh pernah dikirim ke response.
- JWT secret, AI API key, dan credential provider tidak boleh masuk response, log, audit metadata, atau error message.
- Error provider AI harus disanitasi sebelum dikirim ke frontend.
- Semua endpoint protected wajib menolak user inactive.
- Admin action terhadap user dan Kredit wajib masuk audit log.
- Guru query harus selalu memfilter `owner_user_id` atau `user_id`.

## Contract Acceptance Checklist

API contract dianggap siap jika:

- Semua endpoint memiliki role access yang jelas.
- Request dan response utama sudah terdokumentasi.
- Error shape konsisten.
- Auth tidak mengekspos password hash.
- Guru hanya dapat mengakses data miliknya.
- Admin dapat mengelola user dan Kredit.
- Semua proses AI memakai estimasi Kredit.
- Job creation mengecek saldo server-side.
- AI charge/refund tercatat di credit transactions.
- Admin credit adjustment wajib reason dan audit log.
- Export standar tidak memakai Kredit.
- Pagination dan filtering tersedia untuk list endpoint.
