# Test Cases

Dokumen ini mendefinisikan test cases untuk MVP Teachery berdasarkan product docs, business rules, API contract, database schema, error codes, roadmap, dan implementation plan.

Tujuan test cases:

- Memastikan role `Admin` dan `Guru` aman.
- Memastikan sistem Kredit tidak bisa dilewati.
- Memastikan Job AI konsisten dari estimasi sampai charge/refund.
- Memastikan Guru hanya mengakses data miliknya.
- Memastikan Admin dapat mengelola user, Kredit, Jobs, dan audit.
- Memastikan API dan UI menangani error secara konsisten.

## Test Scope

In scope:

- Auth.
- Role and ownership.
- User management.
- Assessment manual.
- Material extraction Word/PDF.
- Credit system.
- Credit estimate.
- Jobs AI.
- assessments and questions.
- Regenerate/improve question.
- Export.
- Admin dashboard and monitoring.
- Audit log.
- API error response.
- Frontend critical flows.

## Assessment Manager Test Cases

| ID | Scenario | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- |
| ASM-001 | Guru membuat assessment manual | Guru pilih mode Manual, isi metadata, submit | Assessment draft dibuat, Kredit tidak berubah | Backend, Frontend |
| ASM-002 | Mode AI tanpa materi | Guru pilih mode AI tanpa upload materi | Validasi `MATERIAL_REQUIRED`, Job tidak dibuat | Backend, Frontend |
| ASM-003 | Extract materi PDF berhasil | Upload PDF berisi teks | Teks diekstrak, file asli tidak disimpan | Backend, Frontend |
| ASM-004 | Extract materi Word berhasil | Upload DOCX berisi teks | Teks diekstrak, file asli tidak disimpan | Backend, Frontend |
| ASM-005 | Extract materi gagal | Upload PDF scan kosong/tidak terbaca | Response `MATERIAL_EXTRACTION_FAILED` atau `MATERIAL_TEXT_EMPTY` | Backend, Frontend |
| ASM-006 | Format materi tidak didukung | Upload file selain PDF/Word | Response `MATERIAL_FORMAT_UNSUPPORTED` | Backend |
| ASM-007 | Generate AI memakai material_text | Buat job AI dengan material_text valid | Job dibuat dan input snapshot berisi konteks materi | Backend |
| ASM-008 | Question image URL valid | Simpan soal dengan `image_url` valid | URL tersimpan dan preview tampil | Backend, Frontend |
| ASM-009 | Question image URL invalid | Simpan soal dengan URL invalid | Response `QUESTION_IMAGE_URL_INVALID` atau `INVALID_IMAGE_URL` | Backend, Frontend |
| ASM-010 | Gambar eksternal gagal load | Buka soal dengan URL gambar mati | Teks soal tetap tampil, UI tidak rusak | Frontend |

Out of scope untuk MVP:

- Payment gateway.
- Subscription.
- Multi-tenant school management.
- Online exam.
- Student grading.
- LMS integration.

## Test Data

Gunakan test data dasar berikut:

| User | Email | Role | Status | Credit |
| --- | --- | --- | --- | --- |
| Admin Aktif | `admin@teachery.local` | `admin` | `active` | 0 |
| Guru Aktif | `guru@teachery.local` | `guru` | `active` | 100 |
| Guru Kredit Rendah | `lowcredit@teachery.local` | `guru` | `active` | 2 |
| Guru Nonaktif | `inactive@teachery.local` | `guru` | `inactive` | 100 |
| Admin Kedua | `admin2@teachery.local` | `admin` | `active` | 0 |

## Auth Test Cases

| ID | Scenario | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- |
| AUTH-001 | Login Admin aktif | Login dengan email/password Admin aktif | Login sukses, role `admin`, redirect ke Dashboard Admin | Backend, Frontend |
| AUTH-002 | Login Guru aktif | Login dengan email/password Guru aktif | Login sukses, role `guru`, redirect ke Dashboard Guru | Backend, Frontend |
| AUTH-003 | Login password salah | Login dengan password salah | Response `401 INVALID_CREDENTIALS` | Backend |
| AUTH-004 | Login user inactive | Login sebagai Guru nonaktif | Response `403 INACTIVE_USER` | Backend, Frontend |
| AUTH-005 | Access protected API tanpa token | Call endpoint protected tanpa token | Response `401 UNAUTHENTICATED` | Backend |
| AUTH-006 | Access protected API dengan token invalid | Call endpoint dengan token rusak | Response `401 TOKEN_INVALID` atau `UNAUTHENTICATED` | Backend |
| AUTH-007 | Get current user | Call `GET /auth/me` setelah login | Response user tanpa `password_hash` | Backend |
| AUTH-008 | Logout | Call `POST /auth/logout` | Response success dan frontend menghapus session | Backend, Frontend |

## Role and Ownership Test Cases

| ID | Scenario | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- |
| ROLE-001 | Guru membuka Admin endpoint | Guru call `GET /admin/users` | Response `403 ADMIN_REQUIRED` atau `UNAUTHORIZED` | Backend |
| ROLE-002 | Admin membuka Dashboard Admin | Admin login dan buka dashboard Admin | Dashboard tampil | Frontend |
| ROLE-003 | Guru membuka Dashboard Admin UI | Guru login lalu akses route Admin | Access denied atau redirect Dashboard Guru | Frontend |
| ROLE-004 | Guru melihat job miliknya | Guru call `GET /jobs/:id` miliknya | Response sukses | Backend |
| ROLE-005 | Guru melihat job Guru lain | Guru call `GET /jobs/:id` milik user lain | Response `404 RESOURCE_NOT_FOUND` atau `OWNERSHIP_REQUIRED` | Backend |
| ROLE-006 | Guru melihat assessment Guru lain | Guru call `GET /assessments/:id` milik user lain | Response `404 RESOURCE_NOT_FOUND` | Backend |
| ROLE-007 | Guru melihat transaksi Kredit user lain | Guru call endpoint riwayat Kredit user lain jika tersedia | Ditolak atau tidak ada endpoint | Backend |
| ROLE-008 | User inactive memakai token lama | User inactive call protected endpoint | Response `403 INACTIVE_USER` | Backend |

## User Management Test Cases

| ID | Scenario | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- |
| USER-001 | Admin membuat Guru | `POST /admin/users` role `guru` | User dibuat, credit balance dibuat | Backend, Frontend |
| USER-002 | Admin membuat user email duplikat | Buat user dengan email existing | Response `409 DUPLICATE_EMAIL` | Backend |
| USER-003 | Admin update data user | `PUT /admin/users/:id` | Data berubah, audit tercatat jika aktif | Backend |
| USER-004 | Admin nonaktifkan Guru | `PATCH /admin/users/:id/status` ke inactive | User inactive, tidak bisa login | Backend, Frontend |
| USER-005 | Admin aktifkan Guru | `PATCH /admin/users/:id/status` ke active | User bisa login kembali | Backend |
| USER-006 | Admin ubah role Guru ke Admin | `PATCH /admin/users/:id/role` | Role berubah, audit tercatat | Backend |
| USER-007 | Nonaktifkan Admin terakhir | Nonaktifkan satu-satunya Admin aktif | Response `422 LAST_ACTIVE_ADMIN_REQUIRED` | Backend |
| USER-008 | Role change tanpa reason | Ubah role tanpa reason jika reason diwajibkan | Response `400 ADMIN_REASON_REQUIRED` | Backend |

## Credit System Test Cases

| ID | Scenario | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- |
| CREDIT-001 | Guru melihat saldo Kredit | `GET /me/credit-balance` | Response saldo milik Guru login | Backend, Frontend |
| CREDIT-002 | Guru melihat riwayat Kredit | `GET /me/credit-transactions` | Hanya transaksi milik Guru login | Backend, Frontend |
| CREDIT-003 | Admin tambah Kredit | `POST /admin/users/:id/credits/adjust` type `admin_add` amount positif | Balance naik, transaksi success, audit tercatat | Backend, Frontend |
| CREDIT-004 | Admin kurang Kredit | `POST /admin/users/:id/credits/adjust` type `admin_subtract` amount negatif | Balance turun, transaksi success, audit tercatat | Backend |
| CREDIT-005 | Admin adjustment tanpa reason | Submit adjustment tanpa reason | Response `400 CREDIT_REASON_REQUIRED` | Backend, Frontend |
| CREDIT-006 | Admin subtract melebihi saldo | Kurangi Kredit lebih besar dari saldo | Response `422 NEGATIVE_BALANCE_NOT_ALLOWED`, balance tidak berubah | Backend |
| CREDIT-007 | Guru mengubah saldo sendiri | Guru call admin credit adjustment | Response `403 ADMIN_REQUIRED` | Backend |
| CREDIT-008 | Ledger immutable | Coba update transaksi Kredit success | Ditolak, response `409 CREDIT_TRANSACTION_IMMUTABLE` jika endpoint tersedia | Backend |
| CREDIT-009 | Balance dan ledger konsisten | Lakukan adjustment lalu cek balance dan riwayat | Balance sama dengan akumulasi ledger | Backend |

## Credit Estimate Test Cases

| ID | Scenario | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- |
| EST-001 | Estimasi generate 10 soal | `POST /credit/estimate` question_count 10 | estimated_credit 10 sesuai rule MVP dasar | Backend, Frontend |
| EST-002 | Estimasi Kredit cukup | Guru saldo 100 estimasi 10 | `is_sufficient = true` | Backend |
| EST-003 | Estimasi Kredit kurang | Guru saldo 2 estimasi 10 | `is_sufficient = false` | Backend, Frontend |
| EST-004 | Estimasi input invalid | question_count 0 | Response `400 VALIDATION_ERROR` | Backend |
| EST-005 | Frontend tampilkan estimasi | Isi form generate valid | UI menampilkan saldo, estimasi, dan status cukup/tidak | Frontend |

## Job AI Test Cases

| ID | Scenario | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- |
| JOB-001 | Buat job dengan Kredit cukup | Guru saldo cukup call `POST /jobs` | Job dibuat status `waiting` | Backend |
| JOB-002 | Buat job dengan Kredit kurang | Guru saldo 2 buat job estimasi 10 | Response `422 INSUFFICIENT_CREDIT`, job tidak dibuat | Backend, Frontend |
| JOB-003 | List job Guru | `GET /jobs` | Hanya job milik Guru login | Backend |
| JOB-004 | Admin list semua job | `GET /admin/jobs` | Semua job tampil dengan pagination | Backend, Frontend |
| JOB-005 | Worker proses job waiting | Jalankan processor untuk job waiting | Status berubah processing lalu completed/failed | Backend |
| JOB-006 | Job success charge Kredit | Simulasikan AI success 10 soal | Job completed, actual_credit 10, balance berkurang 10, transaksi `ai_charge` | Backend |
| JOB-007 | Job gagal total | Simulasikan AI provider gagal sebelum output | Job failed, Kredit tidak berkurang | Backend |
| JOB-008 | Job partial success | Simulasikan 10 diminta, 6 berhasil | Job partially_failed, charge 6 Kredit, output 6 soal | Backend |
| JOB-009 | Retry job gagal | `POST /jobs/:id/retry` pada job failed | Job baru dibuat, job lama tetap | Backend |
| JOB-010 | Retry job completed | Retry job completed | Response `422 JOB_RETRY_NOT_ALLOWED` atau `409 INVALID_JOB_STATE` | Backend |
| JOB-011 | Error provider disanitasi | Provider return error teknis | Response/message user aman, tidak ada API key/stack trace | Backend |

## Assessment and Question Test Cases

| ID | Scenario | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- |
| DOC-001 | assessment dibuat dari job success | Job generate sukses | Row Assessment, questions, answer_options tersimpan | Backend |
| DOC-002 | Guru list assessment | `GET /assessments` | Hanya assessment milik Guru login | Backend, Frontend |
| DOC-003 | Guru detail assessment | `GET /assessments/:id` | assessment berisi questions dan answer_options | Backend, Frontend |
| DOC-004 | Edit metadata assessment | `PUT /assessments/:id` | Title/subject/grade/status berubah | Backend, Frontend |
| DOC-005 | Edit soal manual | `PUT /assessments/:id/questions/:questionId` | Soal berubah, Kredit tidak berubah | Backend, Frontend |
| DOC-006 | Nomor soal duplikat | Ubah question number ke nomor existing | Response `409 QUESTION_NUMBER_DUPLICATE` | Backend |
| DOC-007 | Multiple choice tanpa opsi | Submit question multiple_choice tanpa opsi | Response `400 QUESTION_OPTION_REQUIRED` | Backend |
| DOC-008 | Multiple choice tanpa jawaban benar | Submit options semua `is_correct = 0` | Response `400 QUESTION_CORRECT_ANSWER_REQUIRED` | Backend |
| DOC-009 | Hapus soal | `DELETE /assessments/:id/questions/:questionId` | Soal dan options terhapus, Kredit tidak refund | Backend, Frontend |
| DOC-010 | Guru akses assessment user lain | `GET /assessments/:id` user lain | Response `404 Assessment_NOT_FOUND` | Backend |

## Regenerate and Improve Test Cases

| ID | Scenario | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- |
| AIEDIT-001 | Regenerate question | Call `POST /assessments/:id/questions/:questionId/regenerate` | Job baru dibuat type `regenerate_question` | Backend, Frontend |
| AIEDIT-002 | Improve question | Call `POST /assessments/:id/questions/:questionId/improve` | Job baru dibuat type `improve_question` | Backend, Frontend |
| AIEDIT-003 | Regenerate Kredit kurang | Guru saldo kurang regenerate | Response `422 INSUFFICIENT_CREDIT` | Backend, Frontend |
| AIEDIT-004 | Improve success charge Kredit | AI improve sukses | Question update, Kredit terpotong sesuai rule | Backend |
| AIEDIT-005 | Improve gagal | Provider gagal | Question lama tetap, Kredit tidak hilang/refund jika perlu | Backend |

## Export Test Cases

| ID | Scenario | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- |
| EXP-001 | Create export PDF | `POST /assessments/:id/exports` output `pdf` | Export dibuat status processing/completed | Backend, Frontend |
| EXP-002 | Export tanpa output type | Submit output_types kosong | Response `400 EXPORT_OUTPUT_REQUIRED` | Backend, Frontend |
| EXP-003 | Export format unsupported | Submit output type tidak dikenal | Response `400 EXPORT_FORMAT_UNSUPPORTED` | Backend |
| EXP-004 | Download export completed | `GET /exports/:id/download` completed | Binary file response | Backend, Frontend |
| EXP-005 | Download export belum siap | Download saat processing | Response `409 EXPORT_NOT_READY` | Backend |
| EXP-006 | Guru download export user lain | Guru akses export milik user lain | Response `404 EXPORT_NOT_FOUND` | Backend |
| EXP-007 | Export gagal | Simulasikan renderer gagal | Response/status `EXPORT_FAILED`, Kredit tidak terpotong | Backend |
| EXP-008 | Internal file path tidak tampil | Ambil status export | Response tidak expose raw internal `file_path` | Backend |

## Admin Dashboard and Audit Test Cases

| ID | Scenario | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- |
| ADMIN-001 | Admin dashboard summary | `GET /admin/dashboard` | Summary user, job, Kredit tampil | Backend, Frontend |
| ADMIN-002 | Guru akses dashboard Admin API | Guru call `GET /admin/dashboard` | Response `403 ADMIN_REQUIRED` | Backend |
| AUDIT-001 | Audit user created | Admin membuat user | Audit log `user.created` tercatat | Backend |
| AUDIT-002 | Audit credit added | Admin tambah Kredit | Audit log `credit.admin_added` tercatat | Backend |
| AUDIT-003 | Audit AI charge | Job AI success charge Kredit | Audit log `credit.ai_charged` atau event terkait tercatat | Backend |
| AUDIT-004 | Audit read-only | Coba update/delete audit log jika endpoint ada | Ditolak, `AUDIT_LOG_IMMUTABLE` | Backend |
| AUDIT-005 | Audit metadata aman | Cek audit log | Tidak ada password, token, API key, stack trace | Backend |

## API Error Shape Test Cases

| ID | Scenario | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- |
| ERR-001 | Validation error shape | Submit body invalid | Response punya `error.code`, `error.message`, `error.details` | Backend |
| ERR-002 | Field validation details | Submit form dengan beberapa field invalid | `details.fields` berisi error per field | Backend, Frontend |
| ERR-003 | Unauthorized shape | Guru akses Admin endpoint | Error shape konsisten | Backend |
| ERR-004 | Not found shape | Buka resource tidak ada | Error shape konsisten | Backend |
| ERR-005 | AI provider error shape | Simulasi provider error | Error code aman, tidak ada raw provider error | Backend |

## Frontend Flow Test Cases

| ID | Scenario | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- |
| FE-001 | Guru full flow | Login Guru, buat assessment, pilih manual/AI, review, edit, export | Flow selesai tanpa akses Admin | Manual, E2E |
| FE-002 | Admin full flow | Login Admin, create Guru, add Kredit, lihat job/transaksi/audit | Flow selesai | Manual, E2E |
| FE-003 | Insufficient credit UI | Guru Kredit rendah generate 10 soal | Modal/state Kredit kurang tampil | Frontend |
| FE-004 | Loading state | Submit generate/export | Loading tampil dan tombol submit disabled | Frontend |
| FE-005 | Empty state | Guru belum punya assessment/job | Empty state menampilkan CTA relevan | Frontend |
| FE-006 | Error state | API return error | UI menampilkan pesan aman dan next action | Frontend |
| FE-007 | Role navigation | Login Admin/Guru | Menu sesuai role | Frontend |
| FE-008 | Field error rendering | API return `details.fields` | Error tampil di field yang benar | Frontend |

## Security Test Cases

| ID | Scenario | Steps | Expected Result | Type |
| --- | --- | --- | --- | --- |
| SEC-001 | No password hash response | Cek semua response user | Tidak ada `password_hash` | Backend |
| SEC-002 | No provider secret in errors | Simulasi AI error | Tidak ada API key/token/prompt rahasia di response | Backend |
| SEC-003 | Raw file path hidden | Cek export response | Tidak ada raw internal file path | Backend |
| SEC-004 | Backend ownership enforcement | Call API langsung tanpa UI | Backend tetap menolak akses tidak sah | Backend |
| SEC-005 | JWT required | Call protected endpoint tanpa token | Response 401 | Backend |

## Regression Checklist

Jalankan checklist ini sebelum MVP release:

- Auth Admin dan Guru berjalan.
- User inactive ditolak.
- Guru tidak bisa akses Admin API/UI.
- Guru tidak bisa akses job/assessment/export user lain.
- Guru dapat membuat assessment manual tanpa Kredit.
- Mode AI wajib memakai materi pembelajaran yang berhasil diekstrak.
- File materi asli tidak disimpan.
- Admin dapat create/update/activate/deactivate user.
- Admin terakhir tidak bisa dinonaktifkan.
- Admin dapat tambah/kurangi Kredit dengan reason.
- Saldo Kredit tidak bisa negatif.
- Estimasi Kredit tampil sebelum AI.
- Job tidak dibuat jika Kredit kurang.
- Job success charge Kredit.
- Job gagal total tidak charge Kredit.
- Refund tercatat jika perlu.
- assessment hasil AI bisa direview dan diedit.
- Edit manual tidak memakai Kredit.
- Question image URL valid dapat disimpan dan URL invalid ditolak.
- Export standar tidak memakai Kredit.
- Audit log mencatat aksi penting.
- Error response konsisten.
- Tidak ada data sensitif di response.

## MVP Test Acceptance Criteria

Testing dianggap cukup untuk MVP jika:

- Semua test critical auth, role, ownership, dan Kredit lulus.
- Flow Guru dari generate sampai export lulus.
- Flow Admin dari create user sampai adjust Kredit lulus.
- Job AI success/failure/refund behavior lulus.
- API error shape konsisten di semua failure utama.
- Frontend menampilkan loading, empty, error, dan success state.
- Tidak ditemukan kebocoran `password_hash`, API key, token, atau file path internal.
