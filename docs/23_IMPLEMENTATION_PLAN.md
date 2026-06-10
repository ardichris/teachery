# Implementation Plan

Dokumen ini menjelaskan rencana implementasi Teachery berdasarkan seluruh dokumen produk dan teknis yang sudah dibuat.

Implementation plan ini adalah turunan praktis dari:

- `22_MVP_ROADMAP.md`
- `17_API_CONTRACT.md`
- `14_DATABASE_SCHEMA.md`
- `16_DATA_DICTIONARY.md`
- `07_BUSINESS_RULES.md`
- `18_ERROR_CODES.md`
- `19_AI_RULES.md`
- `06_PAGE_SPEC.md`
- `05_COMPONENT_SPEC.md`

## Implementation Principles

Rules:

- Implementasi harus mengikuti roadmap MVP.
- Jangan membuat endpoint di luar `17_API_CONTRACT.md` tanpa update docs.
- Backend wajib enforce auth, role, ownership, status user, dan Kredit.
- Frontend harus role-aware, tetapi security tetap di backend.
- Semua proses AI harus lewat Job.
- Assessment manual tidak memakai Job AI dan tidak memakai Kredit.
- Generate soal dengan AI wajib didahului extract text dari materi Word/PDF.
- File materi asli tidak boleh disimpan.
- Semua proses AI harus memiliki estimasi Kredit.
- Semua perubahan Kredit harus tercatat di ledger.
- Error response harus mengikuti `18_ERROR_CODES.md`.
- Schema dan field harus mengikuti `14_DATABASE_SCHEMA.md` dan `16_DATA_DICTIONARY.md`.

## Phase 0: Project Setup

Goal:

Menyiapkan fondasi project agar backend, frontend, database, dan environment siap dikembangkan.

Backend tasks:

- Setup project backend sesuai `11_BACKEND_ARCHITECTURE.md`.
- Setup config environment.
- Setup SQLite connection.
- Setup migration runner.
- Setup base router `/api`.
- Setup health endpoint.
- Setup response helper untuk success/error.
- Setup error mapping helper berdasarkan `18_ERROR_CODES.md`.

Frontend tasks:

- Setup Next.js sesuai `10_FRONTEND_ARCHITECTURE.md`.
- Setup Shadcn jika digunakan.
- Setup global layout.
- Setup route groups untuk auth, Guru, dan Admin.
- Setup API client.
- Setup auth/session state dasar.
- Setup design token dasar dari `04_DESIGN_SYSTEM.md`.

Database tasks:

- Buat migration awal untuk tabel:
  - `users`
  - `credit_balances`
  - `jobs`
  - `assessments`
  - `questions`
  - `answer_options`
  - `exports`
  - `credit_transactions`
  - `audit_logs`

Done when:

- Backend bisa jalan lokal.
- Frontend bisa jalan lokal.
- Migration bisa dijalankan dari database kosong.
- Health endpoint mengembalikan response sukses.
- Tidak ada credential hardcoded.

## Phase 1: Auth and Role Foundation

Goal:

Membuat fondasi akses user, role Admin/Guru, dan proteksi endpoint.

Backend tasks:

- Implement password hashing.
- Implement `POST /auth/login`.
- Implement `GET /auth/me`.
- Implement `POST /auth/logout`.
- Implement JWT middleware.
- Implement active user middleware.
- Implement role middleware.
- Implement seed user development:
  - Admin aktif.
  - Guru aktif.
- Pastikan `password_hash` tidak pernah dikirim di response.

Frontend tasks:

- Buat halaman login.
- Simpan access token/session sesuai arsitektur.
- Buat route guard dasar.
- Redirect user berdasarkan role:
  - Admin ke dashboard Admin.
  - Guru ke dashboard Guru.
- Buat access denied state.

Done when:

- Admin dan Guru bisa login.
- User inactive tidak bisa login.
- Token invalid ditolak.
- Admin tidak diarahkan ke UI Guru utama.
- Guru tidak bisa membuka route Admin.

## Phase 2: Admin User Management

Goal:

Admin dapat membuat, melihat, dan mengelola user.

Backend tasks:

- Implement `GET /admin/users`.
- Implement `POST /admin/users`.
- Implement `GET /admin/users/:id`.
- Implement `PUT /admin/users/:id`.
- Implement `PATCH /admin/users/:id/status`.
- Implement `PATCH /admin/users/:id/role`.
- Validasi duplicate email.
- Validasi minimal satu Admin aktif.
- Buat credit balance saat user dibuat.
- Tambahkan audit log untuk perubahan user jika audit module sudah aktif.

Frontend tasks:

- Buat Admin User Management page.
- Buat User Table.
- Buat User Form.
- Buat Role Selector.
- Buat Status Toggle dengan konfirmasi.
- Tampilkan field-level validation.
- Tampilkan empty/error/loading state.

Done when:

- Admin dapat membuat Guru.
- Admin dapat mengubah data user.
- Admin dapat mengubah role dan status.
- Sistem mencegah Admin terakhir dinonaktifkan.
- Guru tidak dapat mengakses endpoint user management.

## Phase 3: Credit System

Goal:

Membuat sistem Kredit yang aman sebelum fitur AI dibuat.

Backend tasks:

- Implement `GET /me/credit-balance`.
- Implement `GET /me/credit-transactions`.
- Implement `GET /admin/users/:id/credit-balance`.
- Implement `POST /admin/users/:id/credits/adjust`.
- Implement `GET /admin/credits/transactions`.
- Buat credit service dengan database transaction.
- Pastikan perubahan balance selalu membuat `credit_transactions`.
- Validasi amount dan reason.
- Pastikan saldo akhir tidak negatif.
- Insert audit log untuk credit adjustment.

Frontend tasks:

- Buat Credit Balance component.
- Buat Credit Transaction List.
- Buat Admin Credit Management page.
- Buat Credit Adjustment Panel.
- Tampilkan preview saldo akhir sebelum submit.
- Tampilkan insufficient/negative balance validation.

Done when:

- Guru dapat melihat saldo dan transaksi miliknya.
- Admin dapat melihat dan adjust Kredit user.
- Admin adjustment wajib reason.
- Saldo tidak bisa negatif.
- Ledger dan balance selalu konsisten.

## Phase 4: Job and Credit Estimate

Goal:

Membuat dasar Job AI, estimasi Kredit, dan lifecycle job.

Backend tasks:

- Implement `POST /materials/extract`.
- Implement `POST /assessments` untuk assessment manual.
- Implement `POST /credit/estimate`.
- Implement `POST /jobs`.
- Implement `GET /jobs`.
- Implement `GET /jobs/:id`.
- Implement `POST /jobs/:id/retry`.
- Implement `GET /admin/jobs`.
- Implement `GET /admin/jobs/:id`.
- Buat job service.
- Buat credit estimation service.
- Buat material extraction service untuk Word/PDF.
- Validasi saldo Kredit sebelum job dibuat.
- Validasi `material_text` wajib untuk mode AI.
- Simpan `input_snapshot_json`.
- Implement state transition Job.
- Implement worker/processor sederhana untuk job `waiting`.

Frontend tasks:

- Buat Buat Assessment page skeleton.
- Buat mode selector Manual/AI.
- Buat material uploader dan extraction state.
- Buat Credit Estimate card.
- Buat Job List.
- Buat Job Detail.
- Buat Job progress state.
- Buat insufficient credit modal/state.
- Buat Admin Job Monitoring page.

Done when:

- Guru dapat membuat assessment manual tanpa Kredit.
- Guru dapat extract text dari materi Word/PDF.
- Guru dapat melihat estimasi Kredit.
- Estimasi AI tidak muncul jika materi belum valid.
- Job tidak dibuat jika Kredit kurang.
- Job tidak dibuat jika materi gagal diekstrak.
- Job tersimpan dengan status `waiting`.
- Admin dapat melihat semua job.
- Guru hanya melihat job miliknya.
- Retry membuat job baru.

## Phase 5: AI Question Generation

Goal:

Menghubungkan Job AI dengan assessment draft, pertanyaan, opsi jawaban, dan charging Kredit.

Backend tasks:

- Buat AI provider adapter.
- Buat prompt builder untuk generate soal pada assessment.
- Prompt builder wajib memakai `material_text`.
- Buat response parser dan validator.
- Implement generate multiple choice.
- Simpan `assessments`.
- Simpan `questions`.
- Simpan `answer_options`.
- Finalisasi job sebagai `completed`, `failed`, atau `partially_failed`.
- Charge Kredit berdasarkan output berhasil.
- Refund jika diperlukan.
- Sanitasi error provider AI.

Frontend tasks:

- Lengkapi Buat Assessment form.
- Mode AI mewajibkan materi hasil ekstraksi.
- Tampilkan estimasi sebelum submit.
- Tampilkan status job setelah submit.
- Redirect/CTA ke assessment jika job selesai.
- Tampilkan error aman jika job gagal.

Done when:

- Guru dapat membuat assessment dan menambahkan soal dengan AI.
- Output AI tersimpan sebagai soal pada assessment.
- Output AI mengacu pada materi pembelajaran.
- assessment masuk status review.
- Kredit terpotong sesuai output berhasil.
- Job gagal total tidak memotong Kredit.
- Error provider AI tidak tampil mentah.

## Phase 6: Assessment Review and Manual Editing

Goal:

Guru dapat mereview dan mengedit output AI sebelum export.

Backend tasks:

- Implement `GET /assessments`.
- Implement `GET /assessments/:id`.
- Implement `PUT /assessments/:id`.
- Implement `PUT /assessments/:id/questions/:questionId`.
- Implement `DELETE /assessments/:id/questions/:questionId`.
- Validasi ownership assessment.
- Validasi nomor soal unik.
- Validasi multiple choice memiliki opsi dan jawaban benar.

Frontend tasks:

- Buat Assessment List page.
- Buat Assessment Detail page.
- Buat Question Editor.
- Tambahkan field `image_url`.
- Tambahkan preview gambar eksternal.
- Buat Answer Option Editor.
- Buat Assessment Metadata form.
- Buat delete question confirmation.
- Buat save success/error state.

Done when:

- Guru dapat membuka assessment miliknya.
- Guru tidak dapat membuka assessment Guru lain.
- Edit manual tidak memakai Kredit.
- Hapus soal tidak mengembalikan Kredit.
- Validasi soal berjalan di frontend dan backend.
- `image_url` valid jika diisi dan tidak menyimpan file gambar.

## Phase 7: Regenerate and Improve Question

Goal:

Guru dapat memakai AI tambahan dari halaman review untuk regenerate/improve soal.

Backend tasks:

- Implement `POST /assessments/:id/questions/:questionId/regenerate`.
- Implement `POST /assessments/:id/questions/:questionId/improve`.
- Buat job type `regenerate_question`.
- Buat job type `improve_question`.
- Hitung estimasi Kredit untuk setiap aksi.
- Validasi saldo Kredit.
- Update question setelah job berhasil.
- Charge/refund Kredit sesuai hasil.

Frontend tasks:

- Tambahkan tombol regenerate question.
- Tambahkan tombol improve question.
- Tampilkan estimasi Kredit sebelum submit.
- Tampilkan status job per question.
- Tampilkan hasil update setelah job selesai.

Done when:

- Regenerate/improve membuat job baru.
- Aksi AI tambahan memakai Kredit.
- Guru melihat estimasi sebelum menjalankan AI.
- Question terupdate hanya setelah output valid.

## Phase 8: Export

Goal:

Guru dapat export assessment yang sudah siap.

Backend tasks:

- Implement `POST /assessments/:id/exports`.
- Implement `GET /exports/:id`.
- Implement `GET /exports/:id/download`.
- Buat export service.
- Buat PDF generator minimal.
- Simpan record `exports`.
- Validasi ownership.
- Validasi status assessment.
- Jangan expose internal file path.

Frontend tasks:

- Buat Export panel.
- Buat output type selector.
- Buat export status state.
- Buat download button.
- Tampilkan error export.

Done when:

- Guru dapat export PDF.
- Export standar tidak memakai Kredit.
- Download hanya aktif saat export completed.
- Export hanya bisa diakses owner.
- Export gagal tidak memotong Kredit.

## Phase 9: Admin Dashboard, Audit, and Monitoring

Goal:

Admin memiliki kontrol operasional untuk user, Kredit, Jobs, dan audit.

Backend tasks:

- Implement `GET /admin/dashboard`.
- Implement `GET /admin/audit-logs`.
- Pastikan audit log dibuat untuk:
  - user created/updated/status/role changed.
  - credit admin added/subtracted.
  - AI charged/refunded.
  - job completed/failed.
- Tambahkan filter dan pagination.

Frontend tasks:

- Buat Admin Dashboard.
- Buat Admin stat cards.
- Buat Audit Log page.
- Lengkapi Job Monitoring page.
- Lengkapi Credit Transaction page.

Done when:

- Admin melihat ringkasan user, job, dan Kredit.
- Admin dapat filter transaksi dan job.
- Admin dapat melihat audit log.
- Audit log read-only.

## Phase 10: UI Polish and UX Hardening

Goal:

Merapikan pengalaman pengguna agar siap dipakai Guru dan Admin.

Frontend tasks:

- Rapikan dashboard Guru.
- Rapikan dashboard Admin.
- Pastikan navigation berbasis role.
- Pastikan Kredit terlihat jelas.
- Pastikan generate flow jelas dari form sampai assessment.
- Pastikan all states:
  - loading
  - empty
  - error
  - success
  - disabled
- Pastikan responsive layout.
- Pastikan copywriting jelas dan pendek.

Backend tasks:

- Review error messages.
- Review access denied behavior.
- Review logging.
- Review transaction consistency.

Done when:

- Guru selalu tahu kapan Kredit dipakai.
- Admin dapat mengelola user/Kredit tanpa kebingungan.
- Tidak ada UI yang menampilkan aksi di luar role.
- Error memberi next action yang jelas.

## Phase 11: Testing and Stabilization

Goal:

Memastikan MVP aman, stabil, dan sesuai acceptance criteria.

Backend tests:

- Login user active.
- Reject user inactive.
- Reject invalid token.
- Admin endpoint rejects Guru.
- Guru cannot access other Guru resources.
- Admin create/update user.
- Prevent last active Admin removal.
- Credit adjustment success.
- Credit adjustment rejects negative final balance.
- Credit estimate success.
- Job creation rejects insufficient Credit.
- Job success charges Credit.
- Job failed does not charge Credit.
- Refund is recorded if needed.
- Assessment ownership validation.
- Export ownership validation.
- Error response shape.

Frontend tests:

- Login flow.
- Role redirect.
- Admin user management flow.
- Admin credit adjustment flow.
- Guru generate flow.
- Insufficient Credit state.
- Job progress state.
- Assessment review/edit flow.
- Export flow.
- API error rendering.

Manual QA:

- Run full Guru flow: login, estimate, generate, review, edit, export.
- Run full Admin flow: login, create Guru, add Kredit, monitor Job, inspect transaction.
- Verify no `password_hash` appears in frontend/API.
- Verify Guru cannot open Admin pages.
- Verify Guru cannot access another Guru Assessment/job.

Done when:

- Critical backend tests pass.
- Main frontend flows pass.
- MVP release criteria in `22_MVP_ROADMAP.md` are satisfied.

## Implementation Execution Checklist

Gunakan checklist ini sebagai pagar eksekusi. Kerjakan dari atas ke bawah. Jangan lanjut ke fase berikutnya jika gate verifikasi fase berjalan belum terpenuhi.

Legend:

- `[ ]` belum dikerjakan.
- `[~]` sedang dikerjakan.
- `[x]` selesai dan sudah diverifikasi.

### Gate 0: Project Setup

Dokumen acuan:

- `10_FRONTEND_ARCHITECTURE.md`
- `11_BACKEND_ARCHITECTURE.md`
- `14_DATABASE_SCHEMA.md`
- `18_ERROR_CODES.md`
- `20_CODE_STYLE.md`

Checklist:

- [x] Buat struktur folder backend sesuai arsitektur.
- [x] Buat struktur folder frontend sesuai arsitektur.
- [x] Setup environment config backend dan frontend.
- [x] Setup koneksi SQLite.
- [x] Setup migration runner.
- [x] Buat migration awal semua tabel MVP.
- [x] Buat base router `/api`.
- [x] Buat health endpoint.
- [x] Buat response helper success/error.
- [x] Buat error mapping helper dari `18_ERROR_CODES.md`.
- [x] Setup API client frontend.
- [x] Setup design tokens dasar.
- [x] Pastikan tidak ada credential hardcoded.

Verification gate:

- [x] Backend berjalan lokal.
- [x] Frontend berjalan lokal.
- [x] Migration bisa berjalan dari database kosong.
- [x] Health endpoint mengembalikan response sukses.

### Gate 1: Auth, Session, and Role

Dokumen acuan:

- `07_BUSINESS_RULES.md`
- `12_API_STRUCTURE.md`
- `17_API_CONTRACT.md`
- `24_TEST_CASES.md`

Checklist:

- [x] Implement password hashing.
- [x] Implement seed Admin aktif dan Guru aktif.
- [x] Implement `POST /auth/login`.
- [x] Implement `GET /auth/me`.
- [x] Implement `POST /auth/logout`.
- [x] Implement JWT middleware.
- [x] Implement active user middleware.
- [x] Implement role middleware Admin/Guru.
- [x] Buat halaman login.
- [x] Buat session/token handling frontend.
- [x] Buat route guard berdasarkan role.
- [x] Buat access denied state.

Verification gate:

- [x] Admin bisa login dan masuk Dashboard Admin.
- [x] Guru bisa login dan masuk Dashboard Guru.
- [x] User inactive ditolak.
- [x] Token invalid ditolak.
- [x] `password_hash` tidak muncul di response.
- [x] Guru tidak bisa membuka route atau endpoint Admin.

### Gate 2: Admin User Management

Dokumen acuan:

- `01_USER_PERSONA.md`
- `07_BUSINESS_RULES.md`
- `17_API_CONTRACT.md`
- `24_TEST_CASES.md`

Checklist:

- [x] Implement `GET /admin/users`.
- [x] Implement `POST /admin/users`.
- [x] Implement `GET /admin/users/:id`.
- [x] Implement `PUT /admin/users/:id`.
- [x] Implement `PATCH /admin/users/:id/status`.
- [x] Implement `PATCH /admin/users/:id/role`.
- [x] Validasi duplicate email.
- [x] Validasi sistem tidak boleh tanpa Admin aktif.
- [x] Buat `credit_balances` otomatis saat user dibuat.
- [x] Buat Admin User Management page.
- [x] Buat User Table.
- [x] Buat User Form.
- [x] Buat Role Selector.
- [x] Buat Status Toggle dengan confirmation.

Verification gate:

- [x] Admin dapat membuat Guru.
- [x] Admin dapat mengubah data user.
- [x] Admin dapat mengubah role dan status.
- [x] Admin terakhir tidak bisa dinonaktifkan.
- [x] Guru tidak bisa mengakses user management.

### Gate 3: Credit Ledger

Dokumen acuan:

- `07_BUSINESS_RULES.md`
- `14_DATABASE_SCHEMA.md`
- `16_DATA_DICTIONARY.md`
- `17_API_CONTRACT.md`

Checklist:

- [x] Implement `GET /me/credit-balance`.
- [x] Implement `GET /me/credit-transactions`.
- [x] Implement `GET /admin/users/:id/credit-balance`.
- [x] Implement `POST /admin/users/:id/credits/adjust`.
- [x] Implement `GET /admin/credits/transactions`.
- [x] Buat credit service dengan database transaction.
- [x] Pastikan setiap perubahan saldo membuat `credit_transactions`.
- [x] Validasi amount, reason, dan saldo akhir.
- [x] Buat Credit Balance component.
- [x] Buat Credit Transaction List.
- [x] Buat Admin Credit Management page.
- [x] Buat Credit Adjustment Panel.

Verification gate:

- [x] Guru dapat melihat saldo dan transaksi miliknya.
- [x] Admin dapat adjust Kredit user.
- [x] Adjustment wajib reason.
- [x] Saldo tidak bisa negatif.
- [x] Balance dan ledger selalu konsisten.

### Gate 4: Assessment Draft, Material Extraction, and Job Shell

Dokumen acuan:

- `02_APP_FLOW.md`
- `06_PAGE_SPEC.md`
- `07_BUSINESS_RULES.md`
- `17_API_CONTRACT.md`
- `18_ERROR_CODES.md`

Checklist:

- [x] Implement `POST /assessments` untuk assessment manual/draft.
- [x] Implement `POST /materials/extract`.
- [x] Implement `POST /credit/estimate`.
- [x] Implement `POST /jobs`.
- [x] Implement `GET /jobs`.
- [x] Implement `GET /jobs/:id`.
- [x] Implement `POST /jobs/:id/retry`.
- [x] Implement `GET /admin/jobs`.
- [x] Implement `GET /admin/jobs/:id`.
- [x] Buat material extraction service untuk PDF/DOCX.
- [x] Pastikan file materi asli tidak disimpan.
- [x] Validasi `material_text` wajib untuk mode AI.
- [x] Simpan `input_snapshot_json`.
- [x] Buat mode selector Manual/AI.
- [x] Buat material uploader dan extraction state.
- [x] Buat Credit Estimate card.
- [x] Buat Job List dan Job Detail.
- [x] Buat insufficient credit state.

Verification gate:

- [x] Guru dapat membuat assessment manual tanpa Kredit.
- [x] Guru dapat extract text dari Word/PDF.
- [x] File materi asli tidak tersimpan.
- [x] Estimasi AI tidak muncul jika materi belum valid.
- [x] Job tidak dibuat jika Kredit kurang.
- [x] Job tidak dibuat jika ekstraksi materi gagal.
- [x] Guru hanya melihat job miliknya.
- [x] Admin dapat melihat semua job.

### Gate 5: AI Question Generation

Dokumen acuan:

- `07_BUSINESS_RULES.md`
- `17_API_CONTRACT.md`
- `18_ERROR_CODES.md`
- `19_AI_RULES.md`
- `24_TEST_CASES.md`

Checklist:

- [x] Buat AI provider adapter.
- [x] Buat prompt builder yang wajib memakai `material_text`.
- [x] Buat response parser dan validator.
- [x] Implement generate soal pilihan ganda.
- [x] Simpan `questions` ke assessment terkait.
- [x] Simpan `answer_options`.
- [x] Finalisasi job sebagai `completed`, `failed`, atau `partially_failed`.
- [x] Charge Kredit berdasarkan soal AI yang berhasil dibuat.
- [x] Buat refund jika diperlukan.
- [x] Sanitasi error provider AI.
- [x] Lengkapi form AI di frontend.
- [x] Tampilkan estimasi sebelum submit.
- [x] Tampilkan status job setelah submit.
- [x] Buat CTA ke assessment setelah job selesai.

Verification gate:

- [x] AI tidak bisa dijalankan tanpa `material_text`.
- [x] Output AI masuk sebagai soal pada assessment draft.
- [x] Output AI mengacu pada materi pembelajaran.
- [x] Kredit hanya dipotong untuk soal yang berhasil dibuat.
- [x] Job gagal total tidak memotong Kredit.
- [x] Error provider tidak tampil mentah ke user.

### Gate 6: Assessment Review and Manual Editing

Dokumen acuan:

- `05_COMPONENT_SPEC.md`
- `06_PAGE_SPEC.md`
- `14_DATABASE_SCHEMA.md`
- `16_DATA_DICTIONARY.md`
- `17_API_CONTRACT.md`

Checklist:

- [x] Implement `GET /assessments`.
- [x] Implement `GET /assessments/:id`.
- [x] Implement `PUT /assessments/:id`.
- [x] Implement `PUT /assessments/:id/questions/:questionId`.
- [x] Implement `DELETE /assessments/:id/questions/:questionId`.
- [x] Validasi ownership assessment.
- [x] Validasi nomor soal unik.
- [x] Validasi opsi dan jawaban benar.
- [x] Validasi `image_url` jika diisi.
- [x] Buat Assessment List page.
- [x] Buat Assessment Detail page.
- [x] Buat Question Editor.
- [x] Buat Answer Option Editor.
- [x] Buat image URL field dan preview eksternal.
- [x] Buat delete confirmation.

Verification gate:

- [x] Guru dapat membuka assessment miliknya.
- [x] Guru tidak dapat membuka assessment Guru lain.
- [x] Edit manual tidak memakai Kredit.
- [x] Hapus soal tidak mengembalikan Kredit.
- [x] `image_url` valid tersimpan.
- [x] Gambar eksternal gagal load tidak merusak UI.

### Gate 7: Regenerate and Improve Question

Dokumen acuan:

- `07_BUSINESS_RULES.md`
- `17_API_CONTRACT.md`
- `19_AI_RULES.md`

Checklist:

- [x] Implement `POST /assessments/:id/questions/:questionId/regenerate`.
- [x] Implement `POST /assessments/:id/questions/:questionId/improve`.
- [x] Buat job type `regenerate_question`.
- [x] Buat job type `improve_question`.
- [x] Hitung estimasi Kredit per aksi.
- [x] Validasi saldo Kredit.
- [x] Update question hanya setelah output valid.
- [x] Charge/refund Kredit sesuai hasil.
- [x] Buat tombol regenerate question.
- [x] Buat tombol improve question.
- [x] Tampilkan estimasi sebelum submit.
- [x] Tampilkan status job per question.

Verification gate:

- [x] Regenerate/improve membuat job baru.
- [x] Aksi AI tambahan memakai Kredit.
- [x] Guru melihat estimasi sebelum menjalankan AI.
- [x] Question tidak berubah jika output AI gagal.

### Gate 8: Export

Dokumen acuan:

- `06_PAGE_SPEC.md`
- `12_API_STRUCTURE.md`
- `17_API_CONTRACT.md`

Checklist:

- [x] Implement `POST /assessments/:id/exports`.
- [x] Implement `GET /exports/:id`.
- [x] Implement `GET /exports/:id/download`.
- [x] Buat export service.
- [x] Buat PDF generator minimal.
- [x] Simpan record `exports`.
- [x] Validasi ownership export.
- [x] Validasi status assessment.
- [x] Buat Export panel.
- [x] Buat output type selector.
- [x] Buat export status state.
- [x] Buat download button.

Verification gate:

- [x] Guru dapat export PDF.
- [x] Export standar tidak memakai Kredit.
- [x] Download hanya aktif saat export completed.
- [x] Export hanya dapat diakses owner.
- [x] Internal file path tidak tampil di response.

### Gate 9: Admin Dashboard, Audit, and Monitoring

Dokumen acuan:

- `06_PAGE_SPEC.md`
- `07_BUSINESS_RULES.md`
- `13_SERVICE_BOUNDARIES.md`
- `17_API_CONTRACT.md`

Checklist:

- [x] Implement `GET /admin/dashboard`.
- [x] Implement `GET /admin/audit-logs`.
- [x] Audit user created/updated/status/role changed.
- [x] Audit credit admin added/subtracted.
- [x] Audit AI charged/refunded.
- [x] Audit job completed/failed.
- [x] Tambahkan filter dan pagination.
- [x] Buat Admin Dashboard.
- [x] Buat Admin stat cards.
- [x] Buat Audit Log page.
- [x] Lengkapi Job Monitoring page.
- [x] Lengkapi Credit Transaction page.

Verification gate:

- [x] Admin melihat ringkasan user, job, dan Kredit.
- [x] Admin dapat filter transaksi dan job.
- [x] Admin dapat melihat audit log.
- [x] Audit log read-only.

### Gate 10: UI Polish and UX Hardening

Dokumen acuan:

- `03_UI_UX_GUIDELINES.md`
- `04_DESIGN_SYSTEM.md`
- `05_COMPONENT_SPEC.md`
- `06_PAGE_SPEC.md`

Checklist:

- [x] Rapikan dashboard Guru.
- [x] Rapikan dashboard Admin.
- [x] Pastikan navigation berbasis role.
- [x] Pastikan saldo Kredit mudah terlihat.
- [x] Pastikan flow manual dan AI terlihat berbeda jelas.
- [x] Pastikan semua aksi AI menampilkan estimasi Kredit.
- [x] Pastikan loading state tersedia.
- [x] Pastikan empty state tersedia.
- [x] Pastikan error state tersedia.
- [x] Pastikan success state tersedia.
- [x] Pastikan disabled state tersedia.
- [x] Pastikan responsive layout.
- [x] Pastikan copywriting jelas dan pendek.

Verification gate:

- [x] Guru selalu tahu kapan Kredit dipakai.
- [x] Admin dapat mengelola user/Kredit tanpa kebingungan.
- [x] Tidak ada UI yang menampilkan aksi di luar role.
- [x] Error memberi next action yang jelas.

### Gate 11: Testing and Release Stabilization

Dokumen acuan:

- `09_ACCEPTANCE_CRITERIA.md`
- `22_MVP_ROADMAP.md`
- `24_TEST_CASES.md`
- `25_E2E_SCENARIOS.md`

Checklist:

- [x] Jalankan backend tests auth.
- [x] Jalankan backend tests role dan ownership.
- [x] Jalankan backend tests credit ledger.
- [x] Jalankan backend tests material extraction.
- [x] Jalankan backend tests AI job lifecycle.
- [x] Jalankan backend tests assessment editing.
- [x] Jalankan backend tests export ownership.
- [x] Jalankan frontend tests login dan role redirect.
- [x] Jalankan frontend tests Admin user management.
- [x] Jalankan frontend tests Admin credit adjustment.
- [x] Jalankan frontend tests Guru manual assessment.
- [x] Jalankan frontend tests Guru AI assessment.
- [x] Jalankan frontend tests job progress.
- [x] Jalankan frontend tests assessment review/edit.
- [x] Jalankan frontend tests export.
- [x] Jalankan E2E Guru: login, manual assessment, edit, export.
- [x] Jalankan E2E Guru: login, AI assessment, material extract, job, review, export.
- [x] Jalankan E2E Admin: login, create Guru, add Kredit, monitor Job, inspect transaction.
- [x] Verifikasi tidak ada `password_hash`, API key, atau file path internal di response.

Verification gate:

- [x] Critical backend tests pass.
- [x] Main frontend flows pass.
- [x] E2E utama pass.
- [x] MVP release criteria di `22_MVP_ROADMAP.md` terpenuhi.

## Module Build Order

Recommended backend module order:

1. Shared response/error.
2. Config and database.
3. Auth.
4. Users.
5. Audit.
6. Credits.
7. Jobs.
8. AI provider.
9. assessments.
10. Questions and answer options.
11. Exports.
12. Admin dashboard.

Recommended frontend module order:

1. App shell and layout.
2. Auth pages.
3. Role-based navigation.
4. Shared API client and error handling.
5. Admin user management.
6. Credit components.
7. Buat Assessment page.
8. Jobs pages.
9. assessments pages.
10. Export UI.
11. Admin monitoring pages.
12. Polish and responsive states.

## Cross-Cutting Requirements

Authentication:

- All protected APIs require JWT.
- User inactive is always rejected.

Authorization:

- Backend validates role and ownership.
- Frontend only improves UX; it is not security.

Credit:

- Estimate before AI.
- Charge only successful AI output.
- Refund if needed.
- Ledger is immutable.

AI:

- All AI actions run as Job.
- Output must be validated.
- Provider errors must be sanitized.

Audit:

- Admin actions are audited.
- Credit changes are audited.
- Important job events are audited.

Security:

- Never expose password hash.
- Never expose provider secrets.
- Never expose raw internal file path.

## Implementation Acceptance Checklist

Implementation is ready for MVP when:

- Auth and role flow works.
- Admin can manage users.
- Admin can manage Kredit.
- Guru can see balance and transaction history.
- Credit estimate works before AI job.
- Job creation blocks insufficient Kredit.
- Generate question job creates Assessment.
- Successful AI output charges Kredit.
- Failed AI output does not lose Kredit.
- Guru can review and edit Assessment.
- Guru can export Assessment.
- Admin can monitor jobs and transactions.
- Audit log records sensitive actions.
- API response and error shapes are consistent.
- Frontend handles loading, empty, error, success states.
- No sensitive fields are exposed.
