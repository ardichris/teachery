# E2E Scenarios

Dokumen ini mendefinisikan skenario end-to-end untuk MVP Teachery berdasarkan roadmap, implementation plan, test cases, API contract, business rules, dan sistem Kredit.

E2E scenarios ini dapat digunakan untuk:

- Manual QA.
- Playwright/Cypress automation.
- Regression test sebelum release.
- Validasi flow lintas frontend, backend, database, Job AI, Kredit, dan export.

## E2E Test Principles

Rules:

- Fokus pada flow user nyata, bukan hanya endpoint.
- Selalu validasi role `Admin` dan `Guru`.
- Selalu validasi ownership data Guru.
- Selalu validasi perubahan Kredit setelah aksi AI.
- Selalu validasi error state untuk Kredit kurang dan Job gagal.
- Jangan bergantung pada data production.
- Gunakan seed data khusus test.

## Test Users

Gunakan test users berikut:

| User | Email | Role | Status | Credit | Purpose |
| --- | --- | --- | --- | --- | --- |
| Admin | `admin@teachery.local` | `admin` | `active` | 0 | User management, Credit management, monitoring |
| Guru A | `guru-a@teachery.local` | `guru` | `active` | 100 | Flow utama generate sampai export |
| Guru B | `guru-b@teachery.local` | `guru` | `active` | 100 | Ownership test |
| Guru Low Credit | `lowcredit@teachery.local` | `guru` | `active` | 2 | Insufficient Credit test |
| Guru Inactive | `inactive@teachery.local` | `guru` | `inactive` | 100 | Inactive user test |

## Priority Levels

| Priority | Meaning |
| --- | --- |
| `P0` | Wajib lulus sebelum MVP release. |
| `P1` | Penting untuk stabilitas MVP, boleh setelah P0 jika waktu terbatas. |
| `P2` | Nice to have untuk regression lebih lengkap. |

## E2E-001: Guru AI Assessment to Export

Priority: P0

Goal:

Memastikan Guru dapat membuat soal dengan AI, Kredit terpotong, assessment bisa direview, diedit, dan diexport.

Preconditions:

- Guru A aktif.
- Guru A memiliki minimal 100 Kredit.
- AI provider test/mock tersedia.
- Materi pembelajaran Word/PDF test tersedia dan dapat diekstrak.
- Mock AI menghasilkan 10 soal pilihan ganda valid.

Steps:

1. Login sebagai Guru A.
2. Pastikan Dashboard Guru tampil.
3. Pastikan saldo Kredit tampil 100.
4. Buka halaman Buat Assessment.
5. Pilih mode Dengan AI.
6. Upload materi pembelajaran Word/PDF.
7. Tunggu extract text berhasil.
8. Isi form:
   - Subject: Matematika.
   - Grade: Kelas 7.
   - Question type: Multiple choice.
   - Question count: 10.
   - Difficulty: Medium.
   - Include explanation: true.
9. Lihat estimasi Kredit.
10. Submit generate.
11. Tunggu Job selesai.
9. Buka assessment yang sudah berisi soal hasil AI.
10. Verifikasi assessment berisi 10 soal.
11. Edit satu soal secara manual.
12. Simpan perubahan.
13. Buka panel export.
14. Pilih output PDF.
15. Submit export.
16. Tunggu export completed.
17. Download file export.
18. Buka riwayat Kredit.

Expected results:

- Estimasi Kredit tampil sebelum submit.
- File materi asli tidak disimpan.
- Job AI memakai teks materi hasil ekstraksi.
- Job dibuat dengan status `waiting` lalu `completed`.
- assessment dibuat dengan status review/ready sesuai implementasi.
- assessment memiliki 10 soal.
- Edit manual berhasil dan tidak mengubah Kredit.
- Export berhasil dan file dapat diunduh.
- Riwayat Kredit memiliki transaksi `ai_charge`.
- Saldo Kredit berkurang sesuai output berhasil.
- Tidak ada error provider mentah tampil di UI.

## E2E-002: Guru Insufficient Credit

Priority: P0

Goal:

Memastikan Guru tidak dapat membuat Job AI jika Kredit tidak cukup.

Preconditions:

- Guru Low Credit aktif.
- Guru Low Credit memiliki 2 Kredit.

Steps:

1. Login sebagai Guru Low Credit.
2. Buka halaman Buat Assessment.
3. Pilih mode Dengan AI.
4. Upload materi Word/PDF dan tunggu extract berhasil.
5. Isi form generate 10 soal.
6. Lihat estimasi Kredit.
7. Submit generate.

Expected results:

- Estimasi menunjukkan required credit lebih besar dari available credit.
- UI menampilkan state/modal Kredit tidak cukup.
- `POST /jobs` tidak membuat Job.
- Tidak ada assessment dibuat.
- Saldo Kredit tetap 2.
- Riwayat Kredit tidak memiliki transaksi charge baru.

## E2E-002A: Guru Creates Manual Assessment

Priority: P0

Goal:

Memastikan Guru dapat membuat assessment manual tanpa AI dan tanpa Kredit.

Preconditions:

- Guru A aktif.

Steps:

1. Login sebagai Guru A.
2. Catat saldo Kredit awal.
3. Buka halaman Buat Assessment.
4. Pilih mode Manual.
5. Isi metadata assessment.
6. Submit.
7. Tambahkan satu soal manual.
8. Simpan assessment.
9. Buka riwayat Kredit.

Expected results:

- Assessment draft/manual dibuat.
- Soal manual tersimpan.
- Tidak ada estimasi Kredit.
- Saldo Kredit tidak berubah.
- Tidak ada transaksi Kredit baru.

## E2E-002B: AI Requires Learning Material

Priority: P0

Goal:

Memastikan mode AI tidak dapat berjalan tanpa materi pembelajaran.

Preconditions:

- Guru A aktif.

Steps:

1. Login sebagai Guru A.
2. Buka halaman Buat Assessment.
3. Pilih mode Dengan AI.
4. Isi pengaturan soal tanpa upload materi.
5. Coba submit.

Expected results:

- Submit ditolak.
- UI menampilkan materi pembelajaran wajib.
- Job AI tidak dibuat.
- Saldo Kredit tidak berubah.

## E2E-002C: Material Extraction Failed

Priority: P0

Goal:

Memastikan file materi yang tidak dapat dibaca tidak membuat Job AI.

Preconditions:

- Guru A aktif.
- File PDF/Word test tidak memiliki teks yang dapat diekstrak.

Steps:

1. Login sebagai Guru A.
2. Buka halaman Buat Assessment.
3. Pilih mode Dengan AI.
4. Upload file materi tidak terbaca.
5. Tunggu proses extract.

Expected results:

- UI menampilkan materi tidak dapat dibaca.
- File asli tidak disimpan.
- Estimasi Kredit tidak ditampilkan.
- Job AI tidak dibuat.

## E2E-003: Admin Create Guru and Add Credit

Priority: P0

Goal:

Memastikan Admin dapat membuat Guru baru dan memberi Kredit awal/manual.

Preconditions:

- Admin aktif.
- Email user baru belum terdaftar.

Steps:

1. Login sebagai Admin.
2. Buka Admin Dashboard.
3. Buka User Management.
4. Buat user Guru baru:
   - Name: Guru Baru.
   - Email: guru-baru@teachery.local.
   - Role: guru.
   - Status: active.
   - Initial credit: 0.
5. Buka detail user Guru Baru.
6. Buka Credit Management atau panel adjustment.
7. Tambahkan 50 Kredit dengan reason "Top up awal".
8. Buka riwayat Kredit user tersebut.
9. Logout.
10. Login sebagai Guru Baru.
11. Buka Dashboard Guru.

Expected results:

- User Guru Baru berhasil dibuat.
- Credit balance row dibuat.
- Admin dapat menambah Kredit.
- Transaksi `admin_add` tercatat.
- Audit log mencatat user created dan credit added.
- Guru Baru dapat login.
- Dashboard Guru Baru menampilkan saldo 50 Kredit.

## E2E-004: Admin Prevent Last Active Admin Removal

Priority: P0

Goal:

Memastikan sistem tidak bisa kehilangan Admin aktif terakhir.

Preconditions:

- Hanya ada satu Admin aktif, atau test environment disiapkan dengan satu Admin aktif.

Steps:

1. Login sebagai Admin.
2. Buka User Management.
3. Buka detail Admin aktif terakhir.
4. Coba ubah status menjadi inactive.
5. Konfirmasi aksi.

Expected results:

- Sistem menolak aksi.
- UI menampilkan pesan minimal harus ada satu Admin aktif.
- Response menggunakan `LAST_ACTIVE_ADMIN_REQUIRED`.
- Status Admin tetap active.
- Admin tetap dapat memakai aplikasi.

## E2E-005: Guru Cannot Access Admin Area

Priority: P0

Goal:

Memastikan Guru tidak bisa mengakses UI/API Admin.

Preconditions:

- Guru A aktif.

Steps:

1. Login sebagai Guru A.
2. Coba buka route Admin Dashboard langsung.
3. Coba buka User Management route langsung.
4. Coba call endpoint Admin lewat UI action atau dev request jika automation mendukung.

Expected results:

- UI menampilkan access denied atau redirect ke Dashboard Guru.
- Menu Admin tidak tampil di navigation Guru.
- API Admin mengembalikan `403 ADMIN_REQUIRED` atau `UNAUTHORIZED`.
- Tidak ada data user lain tampil.

## E2E-006: Guru Cannot Access Other Guru Assessment

Priority: P0

Goal:

Memastikan ownership assessment aman.

Preconditions:

- Guru A aktif dan memiliki assessment A.
- Guru B aktif.

Steps:

1. Login sebagai Guru A.
2. Buat atau pastikan ada assessment A.
3. Simpan URL detail assessment A.
4. Logout.
5. Login sebagai Guru B.
6. Buka URL detail assessment A.

Expected results:

- Guru B tidak dapat membuka assessment A.
- UI menampilkan not found atau access denied sesuai implementasi.
- API mengembalikan `404 Assessment_NOT_FOUND` atau `RESOURCE_NOT_FOUND`.
- assessment A tidak muncul di daftar assessment Guru B.

## E2E-007: Job Failed Does Not Charge Credit

Priority: P0

Goal:

Memastikan Job AI gagal total tidak memotong Kredit.

Preconditions:

- Guru A aktif.
- Guru A memiliki 100 Kredit.
- AI provider mock diset untuk gagal sebelum menghasilkan output.

Steps:

1. Login sebagai Guru A.
2. Catat saldo Kredit awal.
3. Buka Buat Assessment.
4. Isi form generate 10 soal.
5. Submit generate.
6. Tunggu Job berakhir sebagai failed.
7. Buka riwayat Kredit.

Expected results:

- Job status `failed`.
- UI menampilkan pesan generate gagal yang aman.
- Saldo Kredit sama dengan saldo awal.
- Tidak ada transaksi `ai_charge` success.
- Jika ada reserve/charge sementara, ada transaksi refund yang mengembalikan Kredit.
- Error provider tidak tampil mentah.

## E2E-008: Partial Job Charges Only Successful Output

Priority: P1

Goal:

Memastikan Job partial success hanya memotong Kredit untuk output berhasil.

Preconditions:

- Guru A aktif.
- Guru A memiliki 100 Kredit.
- AI provider mock diminta 10 soal tetapi hanya mengembalikan 6 soal valid.

Steps:

1. Login sebagai Guru A.
2. Catat saldo Kredit awal.
3. Generate 10 soal.
4. Tunggu Job selesai partial.
5. Buka assessment hasil.
6. Buka riwayat Kredit.

Expected results:

- Job status `partially_failed` atau equivalent.
- assessment berisi 6 soal valid.
- Saldo Kredit berkurang 6.
- Transaksi Kredit mencatat actual charge 6.
- UI memberi tahu bahwa sebagian output gagal.

## E2E-009: Regenerate Question Uses Credit

Priority: P1

Goal:

Memastikan regenerate satu soal dari halaman review membuat Job baru dan memakai Kredit.

Preconditions:

- Guru A aktif.
- Guru A memiliki assessment dengan minimal 1 soal.
- Guru A memiliki Kredit cukup.
- AI provider mock menghasilkan soal pengganti valid.

Steps:

1. Login sebagai Guru A.
2. Buka detail assessment.
3. Pilih satu soal.
4. Klik regenerate.
5. Lihat estimasi Kredit.
6. Konfirmasi regenerate.
7. Tunggu Job selesai.
8. Verifikasi soal berubah.
9. Cek riwayat Kredit.

Expected results:

- Estimasi Kredit tampil sebelum regenerate.
- Job baru dibuat dengan type `regenerate_question`.
- Soal hanya berubah setelah output valid.
- Kredit terpotong sesuai rule.
- Riwayat Kredit mencatat charge terkait Job.

## E2E-010: Improve Question Failure Keeps Original Question

Priority: P1

Goal:

Memastikan improve question yang gagal tidak merusak soal lama dan tidak menghilangkan Kredit.

Preconditions:

- Guru A aktif.
- Guru A memiliki assessment dengan minimal 1 soal.
- AI provider mock diset gagal.

Steps:

1. Login sebagai Guru A.
2. Buka detail assessment.
3. Catat isi soal awal.
4. Klik improve question.
5. Konfirmasi setelah estimasi Kredit.
6. Tunggu Job gagal.
7. Refresh detail assessment.
8. Cek riwayat Kredit.

Expected results:

- Job improve gagal.
- Soal awal tetap sama.
- Kredit tidak berkurang, atau refund dibuat jika sempat terpotong.
- UI menampilkan error aman dan opsi coba lagi.

## E2E-011: Manual Edit Does Not Use Credit

Priority: P0

Goal:

Memastikan edit manual assessment/soal tidak memakai Kredit.

Preconditions:

- Guru A aktif.
- Guru A memiliki assessment.

Steps:

1. Login sebagai Guru A.
2. Catat saldo Kredit awal.
3. Buka detail assessment.
4. Edit judul assessment.
5. Edit isi satu soal.
6. Tambahkan link gambar ilustrasi eksternal pada soal.
7. Simpan perubahan.
8. Buka riwayat Kredit.

Expected results:

- Perubahan tersimpan.
- Link gambar tersimpan sebagai URL.
- Saldo Kredit tidak berubah.
- Tidak ada transaksi Kredit baru.
- UI tidak menampilkan estimasi Kredit untuk edit manual.

## E2E-012: Export Does Not Use Credit

Priority: P0

Goal:

Memastikan export standar tidak memakai Kredit.

Preconditions:

- Guru A aktif.
- Guru A memiliki assessment siap export.

Steps:

1. Login sebagai Guru A.
2. Catat saldo Kredit awal.
3. Buka detail assessment.
4. Export PDF.
5. Download file.
6. Buka riwayat Kredit.

Expected results:

- Export berhasil.
- File dapat diunduh.
- Saldo Kredit tidak berubah.
- Tidak ada transaksi Kredit baru.

## E2E-013: Inactive User Cannot Use App

Priority: P0

Goal:

Memastikan user inactive tidak dapat login atau memakai session lama.

Preconditions:

- Guru Inactive status inactive.

Steps:

1. Coba login sebagai Guru Inactive.
2. Jika automation mendukung, gunakan token lama milik user inactive untuk call endpoint protected.

Expected results:

- Login ditolak.
- Endpoint protected ditolak.
- Response `INACTIVE_USER`.
- UI menampilkan pesan hubungi Admin.

## E2E-014: Admin Credit Subtract Cannot Make Negative Balance

Priority: P0

Goal:

Memastikan Admin tidak dapat mengurangi Kredit hingga saldo negatif.

Preconditions:

- Guru Low Credit memiliki 2 Kredit.
- Admin aktif.

Steps:

1. Login sebagai Admin.
2. Buka Credit Management Guru Low Credit.
3. Coba kurangi 10 Kredit.
4. Isi reason.
5. Submit.

Expected results:

- Submit ditolak.
- UI menampilkan saldo akhir tidak boleh negatif.
- Response `NEGATIVE_BALANCE_NOT_ALLOWED`.
- Saldo tetap 2.
- Tidak ada transaksi success baru.

## E2E-015: Admin Monitoring Job and Credit Transaction

Priority: P1

Goal:

Memastikan Admin dapat memonitor Job dan transaksi Kredit dari flow Guru.

Preconditions:

- Guru A sudah pernah Buat Assessment sukses.
- Admin aktif.

Steps:

1. Login sebagai Admin.
2. Buka Admin Dashboard.
3. Buka Job Monitoring.
4. Filter by Guru A atau status completed.
5. Buka detail Job.
6. Buka Credit Transactions.
7. Filter by Guru A.

Expected results:

- Job Guru A tampil di monitoring.
- Detail Job menampilkan status, estimated credit, actual credit, dan credit status.
- Transaksi AI charge Guru A tampil.
- Admin dapat melihat data lintas user.
- Tidak ada credential AI tampil.

## E2E-016: Audit Log for Sensitive Actions

Priority: P1

Goal:

Memastikan audit log mencatat aksi penting.

Preconditions:

- Admin aktif.
- Guru A aktif.

Steps:

1. Login sebagai Admin.
2. Tambah Kredit Guru A.
3. Ubah status Guru A menjadi inactive lalu active kembali.
4. Buka Audit Log.
5. Filter event terkait Guru A.

Expected results:

- Audit log mencatat credit adjustment.
- Audit log mencatat status change.
- Metadata audit berisi reason aman.
- Audit log tidak berisi password, token, API key, atau stack trace.
- Audit log read-only.

## E2E-017: API Error Rendering in UI

Priority: P1

Goal:

Memastikan frontend merender error API dengan benar.

Preconditions:

- Backend dapat mengembalikan validation error.

Steps:

1. Login sebagai Guru A.
2. Buka Buat Assessment.
3. Submit form kosong atau invalid.
4. Amati field error.
5. Submit dengan Kredit kurang jika memakai Guru Low Credit.

Expected results:

- Field error tampil di field yang sesuai.
- Toast/inline message memakai pesan aman.
- UI tidak menampilkan raw JSON details secara mentah.
- Insufficient Credit menampilkan saldo tersedia dan Kredit dibutuhkan.

## E2E-018: Duplicate Email in Admin User Form

Priority: P1

Goal:

Memastikan Admin mendapat feedback jelas saat membuat user dengan email duplikat.

Preconditions:

- Admin aktif.
- Email `guru-a@teachery.local` sudah terdaftar.

Steps:

1. Login sebagai Admin.
2. Buka User Management.
3. Buat user baru dengan email `guru-a@teachery.local`.
4. Submit form.

Expected results:

- Submit ditolak.
- Field email menampilkan error.
- Response `DUPLICATE_EMAIL`.
- Tidak ada user baru dibuat.

## E2E-019: Export Not Ready Download

Priority: P2

Goal:

Memastikan user tidak bisa download file sebelum export selesai.

Preconditions:

- Guru A aktif.
- Ada assessment siap export.
- Export service dapat dibuat delay.

Steps:

1. Login sebagai Guru A.
2. Submit export PDF.
3. Segera klik download sebelum status completed.

Expected results:

- Download ditolak atau tombol disabled.
- API mengembalikan `EXPORT_NOT_READY` jika dipanggil langsung.
- UI menampilkan status processing.

## E2E-020: Responsive Core Flow

Priority: P2

Goal:

Memastikan flow utama tetap dapat dipakai di viewport mobile.

Preconditions:

- Guru A aktif.

Steps:

1. Buka app di viewport mobile.
2. Login sebagai Guru A.
3. Buka Dashboard Guru.
4. Buka Buat Assessment.
5. Isi form minimal.
6. Lihat estimasi Kredit.
7. Buka daftar assessment.
8. Buka detail assessment.

Expected results:

- Layout tidak overlap.
- Form bisa digunakan.
- Credit indicator tetap terlihat.
- Navigasi role tetap dapat diakses.
- Button text tidak keluar dari container.

## Recommended Automation Order

Urutan automation yang disarankan:

1. `E2E-001` Guru AI Assessment to Export.
2. `E2E-002` Guru Insufficient Credit.
3. `E2E-003` Admin Create Guru and Add Credit.
4. `E2E-005` Guru Cannot Access Admin Area.
5. `E2E-006` Guru Cannot Access Other Guru Assessment.
6. `E2E-007` Job Failed Does Not Charge Credit.
7. `E2E-011` Manual Edit Does Not Use Credit.
8. `E2E-012` Export Does Not Use Credit.
9. `E2E-014` Admin Credit Subtract Cannot Make Negative Balance.
10. `E2E-015` Admin Monitoring Job and Credit Transaction.

## E2E Acceptance Criteria

E2E testing dianggap cukup untuk MVP jika:

- Semua skenario P0 lulus.
- Minimal skenario P1 untuk Admin monitoring dan audit lulus.
- Flow assessment manual tanpa Kredit lulus.
- Flow material extraction Word/PDF untuk AI lulus.
- Flow Guru dari membuat assessment sampai export lulus.
- Flow Admin dari create user sampai credit adjustment lulus.
- Insufficient Credit tidak membuat Job.
- Job gagal tidak mengurangi Kredit.
- Ownership Guru aman.
- Export standar tidak memakai Kredit.
- File materi asli tidak disimpan.
- Link gambar eksternal pada soal tidak merusak UI.
- UI menampilkan error/loading/success state yang jelas.
- Tidak ada data sensitif seperti `password_hash`, API key, token, atau internal file path tampil di UI/API.
