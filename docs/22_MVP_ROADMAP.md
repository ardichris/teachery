# MVP Roadmap

Dokumen ini mendefinisikan roadmap MVP Teachery berdasarkan product vision, business rules, app flow, page spec, backend/frontend architecture, database schema, API contract, error codes, dan AI implementation rules.

Tujuan roadmap:

- Menentukan urutan implementasi yang aman.
- Menghindari fitur penting tertinggal, terutama role dan Kredit.
- Membantu AI coding assistant dan developer memahami prioritas.
- Menjadi dasar untuk `23_IMPLEMENTATION_PLAN.md` dan `24_TEST_CASES.md`.

## MVP Goal

MVP Teachery harus memungkinkan:

- Admin login dan mengelola user Guru.
- Admin mengelola saldo Kredit Guru.
- Guru login dan melihat saldo Kredit.
- Guru membuat assessment manual tanpa AI.
- Guru membuat Job AI untuk menambahkan/generate soal pada assessment berdasarkan materi pembelajaran.
- Sistem mengekstrak teks dari materi Word/PDF tanpa menyimpan file asli.
- Sistem menghitung estimasi Kredit sebelum job dibuat.
- Sistem memotong Kredit hanya untuk hasil AI yang berhasil.
- Guru mereview, mengedit, dan export assessment.
- Admin memonitor Jobs, transaksi Kredit, dan audit log.

## MVP Scope

In scope:

- Auth JWT.
- Role `Admin` dan `Guru`.
- User management oleh Admin.
- Credit balance dan credit transactions.
- AI Job untuk generate soal pada assessment.
- Assessment manual.
- Material extraction Word/PDF untuk AI.
- Link gambar ilustrasi eksternal per soal.
- Review dan edit assessment.
- Export assessment.
- Dashboard Admin dan Guru.
- Audit log untuk aksi penting.
- Error handling standar.

Out of scope untuk MVP:

- Payment gateway.
- Subscription plan.
- Marketplace pembelian Kredit.
- Role granular selain Admin/Guru.
- Ujian online.
- Koreksi jawaban siswa.
- Analisis nilai siswa.
- Integrasi LMS.
- Multi-tenant school management kompleks.

## Milestone 0: Project Foundation

Goal:

Menyiapkan fondasi frontend, backend, database, environment, dan workflow development.

Deliverables:

- Struktur project frontend dan backend siap.
- Environment config dasar tersedia.
- Database SQLite aktif.
- Migration awal tersedia.
- Code style dan linting dasar siap.
- API response helper tersedia.
- Error helper mengikuti `18_ERROR_CODES.md`.

Dependencies:

- `10_FRONTEND_ARCHITECTURE.md`
- `11_BACKEND_ARCHITECTURE.md`
- `14_DATABASE_SCHEMA.md`
- `18_ERROR_CODES.md`
- `19_AI_RULES.md`
- `20_CODE_STYLE.md`

Definition of Done:

- Aplikasi bisa dijalankan lokal.
- Backend health endpoint tersedia.
- Database migration bisa dijalankan ulang dari kosong.
- Tidak ada credential hardcoded.

## Milestone 1: Auth, Role, and User Foundation

Goal:

Membuat sistem login dan role sebagai fondasi semua fitur.

Deliverables:

- Login.
- Current user endpoint.
- JWT auth middleware.
- Role middleware.
- Active/inactive user validation.
- Seed Admin dan Guru development.
- Admin dapat melihat daftar user.
- Admin dapat membuat dan mengubah user.
- Admin dapat mengubah status dan role user.

Dependencies:

- `07_BUSINESS_RULES.md`
- `12_API_STRUCTURE.md`
- `16_DATA_DICTIONARY.md`
- `17_API_CONTRACT.md`

Definition of Done:

- User inactive tidak bisa login.
- Guru tidak bisa membuka endpoint Admin.
- Admin terakhir tidak bisa dinonaktifkan.
- `password_hash` tidak pernah muncul di response.
- Perubahan user penting masuk audit log jika audit sudah tersedia; jika audit belum tersedia, tambahkan saat milestone audit.

## Milestone 2: Credit System

Goal:

Membuat sistem Kredit yang aman, transparan, dan siap dipakai oleh Job AI.

Deliverables:

- Credit balance per user.
- Credit transaction ledger.
- Guru dapat melihat saldo Kredit.
- Guru dapat melihat riwayat Kredit miliknya.
- Admin dapat melihat saldo Kredit user.
- Admin dapat menambah/mengurangi Kredit user.
- Admin adjustment wajib reason.
- Saldo tidak boleh negatif.
- Database transaction untuk perubahan Kredit.

Dependencies:

- `07_BUSINESS_RULES.md`
- `14_DATABASE_SCHEMA.md`
- `15_ENTITY_RELATIONSHIP.md`
- `16_DATA_DICTIONARY.md`
- `17_API_CONTRACT.md`

Definition of Done:

- Saldo hanya berubah melalui transaksi Kredit.
- Credit adjustment menghasilkan ledger.
- Admin subtract tidak bisa membuat saldo negatif.
- Guru tidak bisa mengubah saldo Kredit sendiri.
- Riwayat Kredit Guru hanya menampilkan data miliknya.

## Milestone 3: Job and AI Workflow Foundation

Goal:

Membuat workflow Job AI tanpa harus sempurna secara kualitas AI terlebih dahulu.

Deliverables:

- Credit estimate endpoint.
- Create job endpoint.
- Job list dan detail untuk Guru.
- Job monitoring untuk Admin.
- Worker atau processor sederhana untuk job `waiting`.
- Job status lifecycle.
- Job retry membuat job baru.
- Error handling untuk AI provider.
- Input snapshot tersimpan.

Dependencies:

- Milestone 1.
- Milestone 2.
- `07_BUSINESS_RULES.md`
- `17_API_CONTRACT.md`
- `18_ERROR_CODES.md`

Definition of Done:

- Job tidak dibuat jika Kredit kurang.
- Job AI memiliki estimated credit.
- Job final tidak kembali ke processing.
- Retry membuat job baru.
- Job gagal total tidak memotong Kredit.
- Error provider AI tidak tampil mentah ke user.

## Milestone 4: Assessment Creation and AI Question Generation

Goal:

Menghasilkan assessment dari job AI dan menyimpannya ke struktur data yang bisa direview.

Deliverables:

- Create assessment manual.
- Material extraction Word/PDF.
- Generate soal pilihan ganda dengan AI.
- Generate soal essay dengan AI jika masuk MVP implementasi awal.
- Simpan assessment.
- Simpan questions.
- Simpan answer options.
- Validasi output AI sebelum insert database.
- Charge Kredit berdasarkan output yang berhasil.
- Refund jika job gagal setelah charge/reserve.

Dependencies:

- Milestone 3.
- `14_DATABASE_SCHEMA.md`
- `16_DATA_DICTIONARY.md`
- `17_API_CONTRACT.md`

Definition of Done:

- Assessment manual dapat dibuat tanpa Kredit.
- Job AI tidak dapat dibuat tanpa materi yang berhasil diekstrak.
- File materi asli tidak disimpan.
- 1 soal berhasil dihasilkan AI = 1 Kredit pada rule MVP dasar.
- assessment hasil AI masuk status review.
- Guru hanya bisa melihat assessment miliknya.
- Multiple choice memiliki minimal 2 opsi dan 1 jawaban benar.
- Jika output AI invalid, job gagal aman dan Kredit tidak hilang.

## Milestone 5: Guru Assessment Review and Edit

Goal:

Membuat Guru bisa mereview dan mengedit hasil AI sebelum export.

Deliverables:

- Daftar assessment Guru.
- Detail assessment dengan questions dan answer options.
- Edit metadata assessment.
- Edit soal manual.
- Edit opsi jawaban manual.
- Hapus soal.
- Regenerate question dengan AI.
- Improve question dengan AI.

Dependencies:

- Milestone 4.
- `05_COMPONENT_SPEC.md`
- `06_PAGE_SPEC.md`
- `17_API_CONTRACT.md`

Definition of Done:

- Edit manual tidak memakai Kredit.
- Hapus soal tidak mengembalikan Kredit.
- Regenerate/improve membuat job baru dan memakai estimasi Kredit.
- UI menampilkan loading, empty, error, dan success state.

## Milestone 6: Export

Goal:

Membuat Guru bisa export assessment yang sudah direview.

Deliverables:

- Create export endpoint.
- Export status endpoint.
- Download export endpoint.
- Export PDF minimal.
- Output options seperti soal, kunci jawaban, dan pembahasan jika tersedia.
- Riwayat export.

Dependencies:

- Milestone 5.
- `06_PAGE_SPEC.md`
- `17_API_CONTRACT.md`
- `18_ERROR_CODES.md`

Definition of Done:

- Export standar tidak memakai Kredit.
- Export gagal tidak memotong Kredit.
- Export hanya bisa diakses owner atau Admin sesuai rule.
- Internal file path tidak diekspos mentah.
- Download hanya tersedia jika export completed.

## Milestone 7: Admin Dashboard and Monitoring

Goal:

Memberi Admin kontrol operasional terhadap user, Kredit, Jobs, dan audit.

Deliverables:

- Admin dashboard summary.
- User management page.
- Credit management page.
- Credit transaction list.
- Job monitoring list/detail.
- Audit log list.
- Filter dan pagination.

Dependencies:

- Milestone 1.
- Milestone 2.
- Milestone 3.
- Milestone 4.
- `06_PAGE_SPEC.md`
- `17_API_CONTRACT.md`

Definition of Done:

- Admin dapat melihat semua user.
- Admin dapat melihat semua transaksi Kredit.
- Admin dapat melihat semua Jobs.
- Admin adjustment Kredit masuk audit.
- Admin UI tidak mengubah assessment Guru kecuali fitur eksplisit tersedia.

## Milestone 8: UI Polish and Role-Based UX

Goal:

Membuat pengalaman frontend terasa clear, fresh, dan mudah dipakai.

Deliverables:

- Dashboard Guru rapi.
- Dashboard Admin rapi.
- Navigasi berbasis role.
- Credit indicator jelas.
- Credit estimate card.
- Insufficient credit modal/state.
- Job progress state.
- Assessment review UX.
- Mode selector Manual/AI.
- Material extraction UX.
- Question image URL preview.
- Export UX.
- Empty/error/success states.

Dependencies:

- `03_UI_UX_GUIDELINES.md`
- `04_DESIGN_SYSTEM.md`
- `05_COMPONENT_SPEC.md`
- `06_PAGE_SPEC.md`

Definition of Done:

- User selalu tahu kapan Kredit akan dipakai.
- Guru tidak bingung langkah berikutnya setelah generate.
- Admin dapat menjalankan tugas management tanpa banyak klik tidak perlu.
- UI tidak menampilkan fitur yang tidak tersedia untuk role user.

## Milestone 9: Testing and Hardening

Goal:

Memastikan MVP aman untuk dipakai banyak Guru dengan biaya AI yang terkendali.

Deliverables:

- Backend tests untuk auth, role, ownership.
- Backend tests untuk Kredit.
- Backend tests untuk Job AI.
- Backend tests untuk error codes.
- Frontend tests untuk flow utama.
- Manual QA checklist.
- Basic logging.
- Basic audit verification.
- Edge case handling.

Dependencies:

- Semua milestone fitur utama.
- `09_ACCEPTANCE_CRITERIA.md`
- `18_ERROR_CODES.md`
- `24_TEST_CASES.md`

Definition of Done:

- Guru tidak bisa akses data Guru lain.
- Admin endpoint aman.
- Kredit tidak bisa minus.
- Job gagal tidak mengurangi Kredit.
- Refund tercatat jika dibutuhkan.
- API error shape konsisten.
- Flow utama Guru selesai dari generate sampai export.
- Flow utama Admin selesai dari create user sampai adjust Kredit.

## Recommended Build Order

Urutan implementasi yang direkomendasikan:

1. Project Foundation.
2. Auth, Role, and User Foundation.
3. Credit System.
4. Job and AI Workflow Foundation.
5. Assessment Creation and AI Question Generation.
6. Guru Assessment Review and Edit.
7. Export.
8. Admin Dashboard and Monitoring.
9. UI Polish and Role-Based UX.
10. Testing and Hardening.

## MVP Release Criteria

MVP dapat dianggap siap jika:

- Admin dapat membuat Guru dan memberi Kredit.
- Guru dapat login dan melihat saldo Kredit.
- Guru dapat membuat assessment manual tanpa Kredit.
- Guru dapat upload materi Word/PDF dan sistem mengekstrak teks tanpa menyimpan file asli.
- Guru dapat melihat estimasi Kredit sebelum generate.
- Guru dapat menambahkan/generate soal dengan AI pada assessment.
- Kredit terpotong sesuai output AI yang berhasil.
- Job gagal tidak menghilangkan Kredit.
- Guru dapat review dan edit assessment.
- Guru dapat export assessment.
- Admin dapat memonitor Jobs dan transaksi Kredit.
- Role dan ownership aman di backend.
- Error response konsisten.
- Dokumentasi API, schema, dan rules sesuai implementasi.

## Post-MVP Candidates

Fitur kandidat setelah MVP:

- Payment gateway untuk pembelian Kredit.
- Paket Kredit atau subscription.
- Upload materi ajar.
- Template assessment sekolah.
- Export DOCX/XLSX yang lebih lengkap.
- Bank soal.
- Sharing assessment antar Guru.
- Multi-school tenant.
- Analytics penggunaan Kredit.
- Integrasi LMS.
- Role tambahan seperti Kepala Sekolah atau Reviewer.
