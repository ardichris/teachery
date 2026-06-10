# Page Specification

## Tujuan

Dokumen ini menjelaskan spesifikasi halaman Teachery berdasarkan product vision, persona, app flow, UI/UX guidelines, design system, dan component spec.

Setiap halaman harus:
- Mendukung workflow guru membuat perangkat soal dengan cepat
- Menampilkan informasi Kredit secara transparan untuk semua proses AI
- Menampilkan menu dan aksi sesuai role Admin atau Guru
- Memiliki loading, empty, error, success, dan insufficient credit state jika relevan
- Menggunakan komponen dari `05_COMPONENT_SPEC.md`
- Konsisten dengan design system di `04_DESIGN_SYSTEM.md`

## Global App Structure

### App Shell

Digunakan pada semua halaman setelah login.

Layout desktop:
- Sidebar kiri
- Top bar
- Main content
- Optional right panel

Layout mobile:
- Navigation drawer atau bottom navigation
- Top bar ringkas
- Main content satu kolom

Sidebar items:

Guru:
- Dashboard
- Buat Assessment
- Jobs
- Draft
- Riwayat assessment
- Riwayat Kredit
- Pengaturan

Admin:
- Dashboard Admin
- User Management
- Credit Management
- Jobs
- Riwayat Kredit
- Pengaturan

Top bar:
- Page title
- Saldo Kredit ringkas
- User/account menu
- Optional page action

Global rules:
- Saldo Kredit harus mudah ditemukan
- Primary action hanya satu per area utama
- Semua aksi AI harus menampilkan estimasi Kredit sebelum berjalan
- Export PDF tanpa proses AI tambahan tidak menggunakan Kredit
- Guru tidak boleh melihat halaman Admin
- Admin action sensitif harus memakai konfirmasi dan audit trail

## Page Inventory

MVP pages:
- Login
- Dashboard
- Dashboard Admin
- Buat Assessment
- Draft Assessment
- Tambah Soal Manual
- Tambah Soal Dengan AI
- Material Extraction
- Konfirmasi Penggunaan Kredit
- Jobs
- Job Detail
- Review & Edit Assessment
- Preview assessment
- Export PDF
- Riwayat assessment
- Riwayat Kredit
- User Management
- Credit Management
- Pengaturan Akun
- Access Denied

## Public Pages

### Login

Purpose:
Memungkinkan user masuk ke aplikasi.

Main components:
- Login form
- Button
- Alert

Content:
- Brand name: Teachery
- Email
- Password
- Login button
- Error message jika login gagal

Primary action:
- "Masuk"

States:
- Default
- Loading
- Error

Rules:
- Setelah login berhasil, sistem membaca role user
- Guru diarahkan ke Dashboard
- Admin diarahkan ke Dashboard Admin
- Jika session masih aktif, user diarahkan langsung ke dashboard sesuai role
- Tidak perlu menampilkan informasi Kredit di halaman login

Acceptance criteria:
- User bisa login dengan jelas
- Error login mudah dipahami
- Form bisa digunakan dengan keyboard

## Authenticated Pages

### Dashboard

Purpose:
Memberi ringkasan pekerjaan dan akses cepat untuk membuat soal.

Role:
- Guru

Main components:
- Credit Balance
- Button
- Recent Assessment List
- Job List ringkas
- Draft Card
- Empty State

Content sections:
- Greeting singkat
- Saldo Kredit
- Primary action "Buat Assessment"
- Jobs terbaru
- Draft terakhir
- assessment terakhir
- Link ke Riwayat Kredit

Primary action:
- "Buat Assessment"

Secondary actions:
- "Lihat Jobs"
- "Lihat Riwayat assessment"
- "Lihat Riwayat Kredit"

Data needed:
- User profile
- Saldo Kredit
- Draft terbaru
- Jobs terbaru
- assessment terakhir
- Transaksi Kredit terbaru optional

States:
- Loading dashboard
- Empty assessments
- Empty jobs
- Low credit
- Error loading data

Credit behavior:
- Saldo Kredit tampil di area yang mudah terlihat
- Jika Kredit rendah, tampilkan warning ringan
- Jika Kredit habis, CTA tetap boleh menuju Buat Assessment, tetapi halaman Generate akan menjelaskan batasan

Acceptance criteria:
- User langsung tahu saldo Kredit dan aksi utama
- User bisa melanjutkan draft atau job terakhir
- Empty state mengarahkan user membuat soal pertama

### Dashboard Admin

Purpose:
Memberi Admin ringkasan operasional user, Kredit, dan Jobs.

Role:
- Admin

Main components:
- Admin Stat Card
- Credit Transaction List ringkas
- Job List ringkas
- Button
- Alert

Content sections:
- Total user aktif
- Total Guru
- Total Kredit terpakai
- Jobs berjalan
- Jobs gagal
- Transaksi Kredit terbaru
- Jobs terbaru semua user

Primary actions:
- "Kelola User"
- "Kelola Kredit"

Secondary actions:
- "Lihat Semua Jobs"
- "Lihat Riwayat Kredit"

Data needed:
- Summary user
- Summary Kredit
- Recent jobs semua user
- Recent credit transactions

States:
- Loading dashboard
- Empty activity
- Error loading data

Credit behavior:
- Admin melihat penggunaan Kredit agregat
- Admin bisa menuju Credit Management untuk perubahan saldo
- Dashboard tidak langsung mengubah Kredit tanpa halaman detail atau konfirmasi

Acceptance criteria:
- Admin bisa memahami kondisi penggunaan aplikasi
- Admin bisa menuju user dan credit management dengan cepat
- Data agregat tidak menampilkan detail berlebihan

### Buat Assessment

Purpose:
Membuat assessment draft, lalu memberi pilihan kepada Guru untuk menambahkan soal secara manual atau melalui AI berdasarkan materi pembelajaran.

Role:
- Guru

Main components:
- Generate Form
- Credit Balance
- Credit Estimate
- Credit Usage Breakdown
- Button
- Alert
- Insufficient Credit Modal

Form fields:
- Mata pelajaran
- Kelas
- Materi pembelajaran Word/PDF untuk mode AI
- Jumlah soal
- Jenis soal
- Tingkat kesulitan
- Bahasa
- Opsi pembahasan otomatis
- Opsi kisi-kisi dengan AI
- Instruksi tambahan

Primary action:
- "Generate dengan AI"

Secondary actions:
- "Simpan Draft"
- "Batal"

Data needed:
- Saldo Kredit
- Credit rules
- Draft form jika ada
- Available options untuk kelas, tipe soal, dan tingkat kesulitan

Credit behavior:
- Estimasi Kredit diperbarui saat user mengubah jumlah soal atau opsi AI
- Tampilkan breakdown biaya Kredit
- Tampilkan sisa Kredit setelah job berjalan
- Jika Kredit tidak cukup, disable primary action dan tampilkan pesan jelas
- Jika user tetap mencoba generate saat Kredit tidak cukup, tampilkan Insufficient Credit Modal

Validation:
- Mata pelajaran wajib
- Kelas wajib
- Materi wajib
- Jumlah soal wajib dan lebih dari 0
- Jenis soal wajib
- Tingkat kesulitan wajib

States:
- Default
- Estimating credit
- Form invalid
- Insufficient credit
- Creating job
- Error creating job

Success behavior:
- Setelah job berhasil dibuat, user diarahkan ke halaman Jobs
- Tampilkan toast: "Job berhasil dibuat"

Acceptance criteria:
- User tahu Kredit yang dibutuhkan sebelum job dibuat
- Job tidak dibuat jika saldo Kredit tidak cukup
- Input user tetap tersimpan jika generate gagal

### Konfirmasi Penggunaan Kredit

Purpose:
Memberi konfirmasi akhir sebelum proses AI yang memakai Kredit berjalan.

Role:
- Guru untuk aksi AI miliknya
- Admin hanya jika menjalankan aksi AI atas namanya sendiri, bukan untuk mengubah saldo user

Main components:
- Modal atau confirmation page
- Credit Estimate
- Credit Usage Breakdown
- Button

Used for:
- Buat Assessment
- Buat ulang soal
- Perbaiki otomatis soal
- Generate pembahasan tambahan
- Generate kisi-kisi tambahan

Content:
- Ringkasan aksi AI
- Estimasi Kredit
- Saldo Kredit saat ini
- Sisa Kredit setelah proses
- Catatan bahwa Kredit aktual mengikuti hasil yang berhasil dibuat

Primary action:
- "Setujui dan Jalankan"

Secondary action:
- "Ubah Pengaturan"

States:
- Sufficient credit
- Insufficient credit
- Estimating
- Error

Acceptance criteria:
- User memberi persetujuan sebelum Kredit digunakan
- User bisa kembali mengubah pengaturan
- Tidak ada proses AI berjalan tanpa estimasi valid

### Jobs

Purpose:
Menampilkan daftar job AI dan status pemrosesan.

Role:
- Guru melihat job miliknya
- Admin melihat semua job

Main components:
- Job List
- Job Card
- Badge
- Filter
- Search optional
- Empty State
- Credit Balance

Content:
- Page title "Jobs"
- Filter status: Semua, Menunggu, Diproses, Selesai, Gagal
- Daftar job
- Estimasi Kredit dan Kredit aktual per job

Primary action:
- "Buat Assessment"

Job card actions:
- "Lihat Detail"
- "Lihat & Edit" jika selesai
- "Coba Lagi" jika gagal
- "Lihat Transaksi Kredit"

Data needed:
- List jobs
- Owner user untuk Admin
- Status jobs
- Estimasi Kredit
- Kredit aktual
- Waktu dibuat
- assessment terkait

States:
- Loading jobs
- Empty jobs
- Job waiting
- Job processing
- Job completed
- Job failed
- Job partially failed

Credit behavior:
- Job selesai menampilkan Kredit aktual
- Job gagal menampilkan "Kredit tidak dipotong" atau "Kredit dikembalikan"
- Job gagal sebagian menampilkan Kredit yang terpakai dan Kredit yang direfund
- Untuk Admin, tampilkan owner job agar monitoring jelas

Acceptance criteria:
- User bisa memahami status job tanpa membuka detail
- User bisa menuju hasil job yang selesai
- Status Kredit konsisten dengan Riwayat Kredit

### Job Detail

Purpose:
Menampilkan detail satu job AI.

Role:
- Guru hanya untuk job miliknya
- Admin untuk semua job

Main components:
- Job Card detail
- Credit Usage Breakdown
- Alert
- Button
- Timeline/status list optional

Content:
- Nama job
- Owner user jika Admin
- Status job
- Input ringkas
- Estimasi Kredit
- Kredit aktual
- Hasil berhasil dan gagal jika ada
- Transaksi Kredit terkait
- Error message jika gagal

Primary action:
- "Lihat & Edit" jika selesai

Secondary actions:
- "Coba Lagi"
- "Lihat Riwayat Kredit"
- "Kembali ke Jobs"

States:
- Loading
- Waiting
- Processing
- Completed
- Failed
- Partially failed

Credit behavior:
- Jika job gagal, jelaskan apakah Kredit tidak dipotong atau direfund
- Jika job selesai sebagian, tampilkan hasil yang berhasil dibuat dan Kredit yang dikembalikan
- Action "Coba Lagi" harus meminta konfirmasi Kredit baru

Acceptance criteria:
- User memahami status job dan penggunaan Kredit
- User punya langkah berikutnya yang jelas

### Review & Edit Soal

Purpose:
Memungkinkan user memeriksa, mengedit, dan memperbaiki hasil AI sebelum export.

Role:
- Guru untuk assessment miliknya
- Admin hanya read/monitor jika fitur monitoring diperlukan; edit assessment guru lain tidak termasuk MVP kecuali diberi izin eksplisit

Main components:
- Tabs
- Question Card
- Question Editor
- Answer Options Editor
- Assessment Status Badge
- Credit Estimate
- Export Panel
- Toast
- Modal

Tabs:
- Soal
- Kisi-kisi
- Kartu Soal
- Pembahasan

Primary action:
- "Export PDF"

Secondary actions:
- "Simpan Draft"
- "Buat Ulang"
- "Perbaiki Otomatis"
- "Hapus Soal"

Data needed:
- assessment
- Daftar soal
- Jawaban benar
- Pembahasan
- Kisi-kisi
- Kartu soal
- Saldo Kredit
- Status assessment

Credit behavior:
- Edit manual tidak memakai Kredit
- Buat ulang soal memakai Kredit
- Perbaiki otomatis memakai Kredit
- Generate pembahasan tambahan memakai Kredit
- Setiap aksi AI tambahan menampilkan estimasi Kredit dan butuh persetujuan

States:
- Loading Assessment
- Empty result
- Editing
- Saving
- Save success
- Save error
- Insufficient credit for AI action
- Regenerating question

Acceptance criteria:
- Guru bisa review hasil AI dengan mudah
- Semua aksi AI tambahan transparan soal Kredit
- Export mudah ditemukan setelah review selesai

### Preview assessment

Purpose:
Memberi gambaran assessment sebelum export PDF.

Main components:
- Assessment Preview
- Tabs
- Button
- Alert

Preview types:
- Soal ujian
- Kartu soal
- Kisi-kisi
- Pembahasan

Primary action:
- "Lanjut Export"

Secondary actions:
- "Kembali Edit"

Data needed:
- assessment terbaru
- Pilihan output
- Status assessment

Credit behavior:
- Preview tidak memakai Kredit selama tidak memanggil AI tambahan
- Jika preview memicu proses AI tambahan, harus tampil estimasi Kredit lebih dulu

States:
- Loading preview
- Preview ready
- Preview error
- Empty content

Acceptance criteria:
- User bisa mengecek isi sebelum export
- Preview mengikuti data hasil edit terbaru
- Tidak ada pemotongan Kredit hanya untuk melihat preview

### Export PDF

Purpose:
Memungkinkan user memilih output dan membuat file PDF.

Main components:
- Export Panel
- Checkbox
- Button
- Toast
- Alert
- Download links

Output options:
- Soal ujian
- Kartu soal
- Kisi-kisi
- Pembahasan

Primary action:
- "Export PDF"

Secondary actions:
- "Kembali Edit"

Data needed:
- assessment final
- Output selected
- Export status
- Download URL setelah berhasil

Credit behavior:
- Export PDF tidak memakai Kredit jika tidak ada proses AI tambahan
- Jika output belum tersedia dan perlu dibuat dengan AI, tampilkan estimasi Kredit sebelum export

States:
- Default
- No output selected
- Exporting
- Export success
- Export failed

Acceptance criteria:
- Minimal satu output dipilih
- User tahu assessment apa yang akan dibuat
- Download link muncul setelah export berhasil

### Riwayat assessment

Purpose:
Menampilkan assessment yang pernah dibuat atau masih berupa draft.

Role:
- Guru melihat assessment miliknya
- Admin dapat melihat daftar assessment semua user jika fitur monitoring diaktifkan

Main components:
- Table/List
- Draft Card
- Badge
- Filter
- Empty State

Content:
- Judul assessment
- Mata pelajaran
- Kelas
- Status
- Terakhir diubah
- Actions

Primary action:
- "Buat Assessment"

Actions per item:
- "Buka"
- "Lanjutkan"
- "Export"
- "Hapus"

States:
- Loading
- Empty
- Error
- Has assessments

Credit behavior:
- Riwayat assessment tidak memotong Kredit
- Jika user menjalankan aksi AI dari assessment, tampilkan estimasi Kredit

Acceptance criteria:
- User bisa menemukan assessment lama
- Draft mudah dilanjutkan
- Mobile memakai card list, bukan tabel lebar

### Riwayat Kredit

Purpose:
Menampilkan semua transaksi Kredit user.

Role:
- Guru melihat transaksi Kredit miliknya
- Admin melihat transaksi Kredit semua user

Main components:
- Credit Balance
- Credit Transaction List
- Filter
- Empty State

Content:
- Saldo Kredit saat ini
- Tanggal transaksi
- Job atau assessment terkait
- User terkait untuk Admin
- Aktor perubahan untuk transaksi manual Admin
- Alasan perubahan untuk transaksi manual Admin
- Aktivitas
- Jumlah Kredit
- Status transaksi

Filter:
- Semua
- Kredit keluar
- Kredit masuk
- Refund
- Gagal

Primary action:
- "Buat Assessment" jika user belum punya transaksi

Secondary actions:
- "Lihat Job"
- "Lihat assessment"

Data needed:
- Saldo Kredit
- Daftar transaksi
- Job atau assessment terkait

States:
- Loading
- Empty transaction
- Has transactions
- Error loading transactions

Credit behavior:
- Kredit keluar tampil sebagai angka negatif
- Kredit masuk/refund tampil sebagai angka positif
- Setiap transaksi AI harus bisa ditelusuri ke job jika tersedia
- Transaksi manual Admin harus menampilkan aktor dan alasan
- Jangan menampilkan token AI provider ke user

Acceptance criteria:
- User bisa memahami kenapa Kredit bertambah atau berkurang
- Refund terlihat jelas
- Status transaksi konsisten dengan job terkait
- Admin bisa mengaudit perubahan Kredit manual

### User Management

Purpose:
Memungkinkan Admin mengelola user dan role.

Role:
- Admin

Main components:
- User Table
- User Form
- Role Badge
- Role Selector
- User Status Toggle
- Modal
- Alert

Content:
- Search user
- Filter role
- Filter status
- Daftar user
- Role user
- Status akun
- Saldo Kredit
- Actions

Primary action:
- "Tambah User"

Actions per user:
- "Edit"
- "Ubah Role"
- "Kelola Kredit"
- "Nonaktifkan" atau "Aktifkan"

Data needed:
- List users
- Role
- Status akun
- Saldo Kredit
- Last active optional

States:
- Loading users
- Empty users
- Error loading users
- Saving user
- User saved
- Unauthorized

Rules:
- Hanya Admin yang bisa membuka halaman ini
- Perubahan role harus memakai konfirmasi
- Tidak boleh menonaktifkan Admin terakhir yang aktif
- User nonaktif tidak bisa login

Acceptance criteria:
- Admin bisa membuat dan mengubah user
- Admin bisa membedakan Admin dan Guru
- Aksi sensitif memakai konfirmasi

### Credit Management

Purpose:
Memungkinkan Admin mengelola saldo Kredit user.

Role:
- Admin

Main components:
- User search/select
- Credit Balance
- Credit Adjustment Panel
- Credit Transaction List
- Modal
- Alert

Content:
- Pilih user
- Saldo Kredit saat ini
- Aksi tambah atau kurangi Kredit
- Jumlah Kredit
- Alasan perubahan
- Preview saldo akhir
- Riwayat Kredit user terpilih

Primary action:
- "Simpan Perubahan Kredit"

Data needed:
- List users
- Saldo Kredit user
- Credit transactions user

Validation:
- User wajib dipilih
- Jumlah Kredit wajib lebih dari 0
- Alasan perubahan wajib
- Saldo akhir tidak boleh negatif kecuali aturan bisnis mengizinkan

Credit behavior:
- Perubahan Kredit manual hanya bisa dilakukan Admin
- Setiap perubahan menghasilkan transaksi Kredit
- Transaksi menyimpan user target, aktor Admin, jumlah Kredit, alasan, dan waktu
- Pengurangan Kredit harus memakai confirmation modal

States:
- Loading
- User selected
- No user selected
- Saving adjustment
- Adjustment success
- Adjustment error
- Unauthorized

Acceptance criteria:
- Admin tahu saldo sebelum dan sesudah perubahan
- Tidak ada perubahan Kredit tanpa alasan
- Riwayat transaksi langsung mencatat perubahan

### Pengaturan Akun

Purpose:
Mengelola informasi akun dan preferensi dasar.

Main components:
- Form fields
- Button
- Credit Balance
- Alert

Content:
- Nama user
- Email
- Role saat ini
- Preferensi bahasa
- Saldo Kredit
- Link Riwayat Kredit

Optional future content:
- Paket Kredit
- Billing
- Top up Kredit

Primary action:
- "Simpan Perubahan"

States:
- Loading
- Saving
- Save success
- Save error

Credit behavior:
- Pengaturan akun hanya menampilkan saldo dan link riwayat
- Top up Kredit masuk future scope jika payment belum tersedia di MVP
- User tidak bisa mengubah role sendiri

Acceptance criteria:
- User bisa melihat informasi akun
- User bisa menuju Riwayat Kredit dari halaman ini

### Access Denied

Purpose:
Menjelaskan bahwa halaman tidak tersedia untuk role user saat ini.

Main components:
- Alert atau Empty State
- Button

Content:
- Title: "Akses tidak tersedia"
- Description singkat
- Action kembali ke dashboard sesuai role

Primary action:
- "Kembali ke Dashboard"

Rules:
- Jangan membocorkan data halaman yang ditolak
- Redirect boleh digunakan jika lebih sederhana
- Backend tetap wajib memvalidasi role dan permission

Acceptance criteria:
- Guru tidak bisa mengakses halaman Admin
- User mendapat arah kembali yang jelas

## Cross-Page States

### Loading

Gunakan skeleton untuk daftar, card, dan preview. Untuk proses AI panjang, gunakan status teks spesifik seperti:

```text
Teachery sedang membuat soal...
Menghitung estimasi Kredit...
Menyiapkan PDF...
```

### Empty

Empty state harus menjelaskan kondisi dan memberi next action.

Examples:
- Belum ada assessment
- Belum ada job
- Belum ada transaksi Kredit

### Error

Error harus menjelaskan masalah dan langkah berikutnya.

Examples:
- Generate gagal
- Export gagal
- Gagal memuat saldo Kredit
- Gagal menghitung estimasi Kredit
- Akses tidak tersedia untuk role saat ini

### Insufficient Credit

State ini muncul saat saldo Kredit lebih kecil dari estimasi Kredit.

Required content:
- Saldo Kredit saat ini
- Kredit yang dibutuhkan
- Saran mengurangi opsi atau mengisi Kredit
- Action untuk kembali mengubah pengaturan

### Credit Refund

State ini muncul jika job gagal atau hanya sebagian berhasil.

Required content:
- Jumlah Kredit yang dikembalikan
- Alasan refund
- Link ke job atau transaksi terkait

### Unauthorized

State ini muncul jika user membuka halaman di luar role-nya.

Required content:
- Pesan "Akses tidak tersedia"
- Action kembali ke dashboard sesuai role
- Tidak menampilkan data halaman yang ditolak

## Page Acceptance Checklist

Sebelum sebuah halaman dianggap siap:
- Menggunakan App Shell setelah login
- Primary action jelas
- Saldo Kredit tampil pada halaman yang menjalankan AI
- Estimasi Kredit tampil sebelum proses AI
- Insufficient credit state tersedia jika halaman menjalankan AI
- Loading, error, empty, dan success state tersedia
- Mobile layout tidak memerlukan scroll horizontal
- Text panjang tidak merusak layout
- Semua form punya label dan validasi
- Semua icon-only action punya accessible label
- Status job dan transaksi Kredit konsisten
- Halaman Admin hanya tersedia untuk Admin
- Halaman Guru hanya menampilkan data milik Guru tersebut
- Aksi perubahan Kredit manual mencatat aktor Admin dan alasan
## Assessment Manager Page Update

Halaman utama Guru harus memakai konsep Assessment Manager.

### Buat Assessment

Purpose:

Membuat assessment baru dengan mode Manual atau Dengan AI.

Required sections:

- Assessment metadata: judul, mata pelajaran, kelas.
- Mode selector: Manual atau Dengan AI.
- Jika Manual:
  - Buat assessment draft.
  - Tambahkan soal manual.
  - Tidak ada estimasi Kredit.
- Jika Dengan AI:
  - Upload materi pembelajaran Word/PDF.
  - Extract text dari materi.
  - Tampilkan status ekstraksi.
  - Tampilkan pengaturan jumlah soal, tipe soal, kesulitan, instruksi tambahan.
  - Tampilkan estimasi Kredit setelah input valid.

Rules:

- File materi asli tidak disimpan.
- Job AI tidak dapat dibuat jika materi gagal diekstrak.
- Guru dapat beralih ke mode Manual jika tidak ingin memakai AI.

### Assessment Detail

Tambahan requirement:

- Question editor mendukung `image_url` opsional.
- Question card menampilkan preview gambar eksternal jika URL valid.
- Gambar gagal load tidak boleh menutupi teks soal.
