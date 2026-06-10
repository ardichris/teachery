# Component Specification

## Tujuan

Dokumen ini menjelaskan spesifikasi komponen UI Teachery agar desain dan implementasi konsisten. Komponen harus mengikuti `04_DESIGN_SYSTEM.md` untuk warna, typography, spacing, radius, shadow, motion, dan accessibility.

Standar setiap komponen:
- Punya fungsi yang jelas
- Mendukung state utama: default, hover, focus, disabled, loading, error jika relevan
- Bisa digunakan di desktop dan mobile
- Mudah dipahami guru
- Tidak bergantung pada warna saja untuk menyampaikan informasi

## Component Inventory

Core components:
- App Shell
- Sidebar Navigation
- Top Bar
- Button
- Icon Button
- Text Input
- Textarea
- Select
- Checkbox
- Radio Group
- Toggle
- Card
- Badge
- Tabs
- Modal
- Toast
- Alert
- Empty State
- Skeleton Loader
- Table/List

Product components:
- Generate Form
- Question Card
- Question Editor
- Answer Options Editor
- Difficulty Selector
- Assessment Status Badge
- Export Panel
- Assessment Preview
- Draft Card
- Recent Assessment List
- Job Card
- Job List
- Credit Balance
- Credit Estimate
- Credit Usage Breakdown
- Credit Transaction List
- Insufficient Credit Modal
- Role Badge
- User Table
- User Form
- Role Selector
- User Status Toggle
- Credit Adjustment Panel
- Admin Stat Card
- Access Guard

## Core Components

### App Shell

Purpose:
Menjadi struktur utama aplikasi setelah user login.

Anatomy:
- Sidebar navigation
- Top bar
- Main content
- Optional right panel

Layout:
- Desktop sidebar width: 240px
- Compact sidebar width: 72px
- Top bar height: 64px
- Main padding desktop: 24px sampai 32px
- Main padding mobile: 16px

Behavior:
- Sidebar tetap terlihat di desktop
- Sidebar berubah menjadi drawer atau bottom navigation di mobile
- Main content tidak boleh tertutup navigation
- Optional right panel hanya muncul jika layar cukup lebar

Acceptance criteria:
- Layout tetap rapi pada desktop, tablet, dan mobile
- Scroll hanya terjadi pada area yang tepat
- Primary action halaman mudah ditemukan

### Sidebar Navigation

Purpose:
Memberi akses ke area utama aplikasi.

Items awal:
- Dashboard
- Buat Assessment
- Draft
- Riwayat assessment
- Riwayat Kredit
- User Management
- Credit Management
- Pengaturan

Role behavior:
- Guru melihat menu Dashboard, Buat Assessment, Jobs, Draft, Riwayat assessment, Riwayat Kredit, Pengaturan
- Admin melihat menu Dashboard Admin, User Management, Credit Management, Jobs, Riwayat Kredit, Pengaturan
- Menu yang tidak sesuai role tidak ditampilkan

Anatomy:
- Logo/brand Teachery
- Navigation item
- Active indicator
- User/account area optional

States:
- Default
- Hover
- Active
- Disabled

Behavior:
- Item aktif harus terlihat jelas
- Label boleh disembunyikan pada compact mode, tetapi icon tetap punya tooltip
- Mobile memakai drawer atau bottom navigation

Accessibility:
- Navigation memakai landmark `nav`
- Item aktif memakai `aria-current="page"`
- Icon-only item punya accessible label

### Top Bar

Purpose:
Menampilkan konteks halaman dan aksi cepat.

Anatomy:
- Page title
- Optional breadcrumb
- Optional status
- Credit balance summary
- Action area

Rules:
- Jangan menaruh terlalu banyak aksi di top bar
- Aksi utama tetap mengikuti konteks halaman
- Pada mobile, action area boleh masuk menu overflow
- Saldo Kredit boleh tampil ringkas di kanan atas atau area akun

### Button

Purpose:
Menjalankan aksi eksplisit.

Variants:
- Primary: aksi utama
- Secondary: aksi pendukung
- Ghost: aksi ringan
- Danger: aksi berisiko

Sizes:
- Small: 32px height
- Medium: 40px height
- Large: 48px height

Anatomy:
- Optional left icon
- Label
- Optional right icon
- Loading spinner jika sedang memproses

States:
- Default
- Hover
- Focus
- Active
- Disabled
- Loading

Behavior:
- Loading button tidak bisa diklik ulang
- Disabled button tidak memicu aksi
- Label harus menjelaskan hasil aksi

Content rules:
- Gunakan label spesifik
- Hindari label generik seperti "Submit" atau "OK" jika konteks tidak jelas

Examples:
- "Buat Assessment"
- "Simpan Draft"
- "Export PDF"
- "Buat Ulang"
- "Hapus Soal"

Acceptance criteria:
- Tinggi klik minimal 40px untuk medium
- Focus ring terlihat
- Button icon dan text sejajar
- Teks tidak terpotong di mobile

### Icon Button

Purpose:
Menjalankan aksi umum dengan icon.

Usage:
- Edit
- Hapus
- Duplikasi
- Preview
- Download
- Tutup modal

Anatomy:
- Icon 18px atau 20px
- Tooltip atau accessible label

Sizes:
- Small: 32px x 32px
- Medium: 40px x 40px

Rules:
- Gunakan icon dari library yang sama
- Jangan memakai icon-only untuk aksi yang tidak familiar tanpa tooltip
- Aksi destructive memakai warna danger pada hover/focus atau modal konfirmasi

Accessibility:
- Wajib punya `aria-label`
- Tooltip tidak menggantikan accessible label

### Text Input

Purpose:
Mengisi teks pendek.

Usage:
- Judul assessment
- Nama materi
- Kelas
- Mata pelajaran jika tidak memakai select

Anatomy:
- Label
- Input field
- Optional helper text
- Optional error text

States:
- Default
- Hover
- Focus
- Filled
- Disabled
- Error

Behavior:
- Label selalu terlihat
- Placeholder hanya memberi contoh format
- Error muncul di bawah field

Example:

```text
Label: Materi
Placeholder: Contoh: Sistem Pencernaan Manusia
Error: Materi belum diisi.
```

### Textarea

Purpose:
Mengisi teks panjang.

Usage:
- Materi pelajaran
- Instruksi tambahan
- Pembahasan soal

Behavior:
- Minimal height 120px
- Bisa auto-resize sampai batas wajar
- Menampilkan character count jika ada batas maksimum

Rules:
- Jangan terlalu kecil untuk teks materi
- Simpan input user ketika generate gagal

### Select

Purpose:
Memilih satu opsi dari daftar tetap.

Usage:
- Kelas
- Jenis soal
- Bahasa
- Mata pelajaran jika opsinya sudah tersedia

Anatomy:
- Label
- Trigger
- Option list
- Helper/error text

Behavior:
- Bisa dicari jika pilihan lebih dari 8 item
- Option aktif dan selected harus jelas
- Menutup saat user memilih option atau klik di luar

Accessibility:
- Bisa digunakan dengan keyboard
- State expanded harus terbaca screen reader

### Checkbox

Purpose:
Memilih satu atau banyak opsi independen.

Usage:
- Pilih assessment yang ingin diexport
- Include pembahasan
- Include kisi-kisi

States:
- Unchecked
- Checked
- Indeterminate
- Disabled

Rules:
- Label bisa diklik
- Jangan memakai checkbox untuk pilihan tunggal yang saling eksklusif

### Radio Group

Purpose:
Memilih satu opsi dari beberapa pilihan eksklusif.

Usage:
- Tingkat kesulitan
- Format output utama
- Mode generate

Behavior:
- Selalu ada satu pilihan default jika aman
- Label dan deskripsi singkat boleh ditampilkan

### Toggle

Purpose:
Mengaktifkan atau menonaktifkan setting langsung.

Usage:
- Simpan otomatis
- Tampilkan jawaban benar
- Tampilkan pembahasan

Rules:
- Gunakan toggle hanya untuk setting yang efeknya langsung jelas
- Untuk aksi besar, gunakan button atau checkbox

### Card

Purpose:
Mengelompokkan item atau informasi berulang.

Usage:
- Draft card
- Recent Assessment card
- Question card
- Empty state kecil

Anatomy:
- Optional header
- Title
- Metadata
- Content
- Optional footer/actions

Style:
- Background `neutral-0`
- Border `neutral-200`
- Radius `lg`
- Shadow tidak wajib

Rules:
- Jangan menaruh card di dalam card
- Gunakan padding 16px atau 20px
- Actions tidak boleh menutupi konten utama

### Badge

Purpose:
Menampilkan status atau kategori singkat.

Variants:
- Neutral
- Primary
- Success
- Warning
- Danger

Usage:
- Draft
- Siap Export
- PDF Siap
- Pilihan Ganda
- Mudah
- Sedang
- Sulit

Rules:
- Teks maksimal 1-3 kata
- Badge status harus konsisten warnanya
- Jangan memakai badge untuk tombol

### Tabs

Purpose:
Memisahkan konten satu konteks ke beberapa view.

Usage:
- Soal
- Kisi-kisi
- Kartu Soal
- Pembahasan

Anatomy:
- Tab list
- Tab item
- Active indicator
- Tab panel

Behavior:
- Tab aktif terlihat jelas
- Konten tab tidak hilang ketika user kembali, kecuali sengaja reload
- Pada mobile, tab list boleh horizontal scroll

Accessibility:
- Gunakan role tablist, tab, dan tabpanel jika implementasi custom
- Bisa dinavigasi dengan keyboard

### Modal

Purpose:
Meminta keputusan user atau menampilkan dialog fokus.

Usage:
- Konfirmasi hapus soal
- Preview export
- Edit metadata assessment

Anatomy:
- Title
- Description
- Content
- Footer actions
- Close button

Behavior:
- Fokus terkunci di modal
- Escape menutup modal jika tidak ada proses penting
- Klik backdrop boleh menutup untuk modal ringan
- Modal destructive harus butuh aksi eksplisit

Acceptance criteria:
- Title jelas
- Tombol utama dan batal tersedia
- Destructive action memakai warna danger

### Toast

Purpose:
Memberi feedback singkat setelah aksi.

Variants:
- Success
- Info
- Warning
- Error

Examples:
- "Perubahan tersimpan."
- "PDF berhasil dibuat."
- "Soal berhasil dibuat ulang."

Behavior:
- Muncul 3-5 detik
- Bisa ditutup manual
- Tidak dipakai untuk validasi form yang butuh tindakan

### Alert

Purpose:
Menampilkan pesan penting yang perlu dibaca.

Usage:
- Generate gagal
- Export gagal
- Form belum lengkap
- Informasi kuota atau batas sistem

Anatomy:
- Icon
- Title
- Description
- Optional action

Rules:
- Error harus menjelaskan tindakan berikutnya
- Jangan hanya menulis "Terjadi kesalahan"

### Empty State

Purpose:
Menjelaskan kondisi kosong dan memberi langkah berikutnya.

Usage:
- Belum ada assessment
- Belum ada draft
- Riwayat export kosong

Anatomy:
- Icon
- Title
- Description
- Primary action

Example:

```text
Belum ada assessment
Mulai dengan membuat soal pertama untuk kelasmu.
[Buat Assessment]
```

### Skeleton Loader

Purpose:
Menampilkan placeholder saat konten sedang dimuat.

Usage:
- Daftar assessment
- Question card
- Preview assessment

Rules:
- Bentuk skeleton mengikuti layout konten asli
- Jangan menampilkan skeleton terlalu lama tanpa status tambahan
- Untuk proses AI yang lama, gabungkan dengan teks progress

### Table/List

Purpose:
Menampilkan kumpulan data yang bisa dipindai.

Usage:
- Riwayat assessment
- Riwayat export
- Draft

Columns rekomendasi:
- Judul
- Mata pelajaran
- Kelas
- Status
- Terakhir diubah
- Actions

Mobile behavior:
- Table berubah menjadi list item/card
- Actions masuk menu overflow jika ruang terbatas

## Product Components

### Generate Form

Purpose:
Mengumpulkan input agar AI bisa membuat soal yang sesuai kebutuhan guru.

Fields:
- Mata pelajaran
- Kelas
- Materi
- Jumlah soal
- Jenis soal
- Tingkat kesulitan
- Bahasa
- Instruksi tambahan

Anatomy:
- Section "Informasi Dasar"
- Section "Pengaturan Soal"
- Section "Instruksi Tambahan"
- Credit Estimate
- Summary optional
- Primary button "Buat Assessment"

Validation:
- Mata pelajaran wajib
- Kelas wajib
- Materi wajib
- Jumlah soal wajib dan harus lebih dari 0
- Jenis soal wajib
- Tingkat kesulitan wajib

Behavior:
- Input tetap tersimpan jika generate gagal
- Field error muncul dekat field terkait
- Estimasi Kredit diperbarui saat jumlah soal atau opsi AI berubah
- Button generate disabled saat proses berjalan
- Button generate disabled jika Kredit tidak cukup
- Jika form panjang, tampilkan ringkasan sebelum generate

Acceptance criteria:
- User paham field mana yang wajib
- Error message membantu
- Generate tidak bisa diklik ganda
- User tahu estimasi Kredit sebelum job dibuat

### Difficulty Selector

Purpose:
Memilih tingkat kesulitan soal.

Options:
- Mudah
- Sedang
- Sulit
- Campuran

Display:
- Radio group atau segmented control
- Boleh memakai deskripsi singkat

Rules:
- Default boleh "Sedang" atau "Campuran"
- Warna tidak boleh menjadi satu-satunya pembeda

### Question Card

Purpose:
Menampilkan satu soal hasil AI atau manual untuk review cepat.

Anatomy:
- Nomor soal
- Badge jenis soal
- Badge tingkat kesulitan
- Pertanyaan
- Pilihan jawaban jika ada
- Jawaban benar
- Pembahasan singkat
- Kisi-kisi terkait optional
- Action buttons

Actions:
- Edit
- Duplikasi
- Buat ulang
- Hapus

States:
- Default
- Hover
- Editing
- Saving
- Error

Behavior:
- Pertanyaan menjadi fokus utama
- Jawaban benar mudah ditemukan
- Actions tampil jelas tetapi tidak mengganggu membaca
- Hapus soal memakai konfirmasi
- Buat ulang hanya memproses soal terkait

Acceptance criteria:
- Soal panjang tetap terbaca
- Mobile layout tidak pecah
- Status saving/error terlihat pada card terkait

### Question Editor

Purpose:
Mengedit konten soal hasil AI.

Fields:
- Pertanyaan
- Jenis soal
- Tingkat kesulitan
- Pilihan jawaban
- Jawaban benar
- Pembahasan
- Kisi-kisi

Behavior:
- Bisa dibuka inline atau modal
- Perubahan bisa disimpan atau dibatalkan
- Validasi jawaban benar sesuai jenis soal
- Autosave boleh dipakai jika statusnya jelas

Rules:
- Jangan menghilangkan konten asli sebelum user menyimpan
- Tampilkan feedback "Tersimpan" setelah save berhasil

### Answer Options Editor

Purpose:
Mengedit pilihan jawaban pada soal pilihan ganda.

Anatomy:
- List pilihan A, B, C, D
- Text input tiap pilihan
- Radio untuk jawaban benar
- Add/remove option jika didukung

Behavior:
- Minimal 2 pilihan
- Satu jawaban benar wajib dipilih
- Label pilihan tetap berurutan setelah item dihapus

Validation:
- Pilihan jawaban tidak boleh kosong
- Jawaban benar wajib ada

### Assessment Status Badge

Purpose:
Menjelaskan status assessment.

Statuses:
- Draft
- Generating
- Perlu Review
- Siap Export
- Exporting
- PDF Siap
- Error
- Kredit Kurang
- Kredit Direfund

Mapping warna:
- Draft: neutral
- Generating: primary
- Perlu Review: warning
- Siap Export: success
- Exporting: primary
- PDF Siap: success
- Error: danger
- Kredit Kurang: danger
- Kredit Direfund: warning

Rules:
- Status harus memakai label bahasa Indonesia
- Untuk status proses, tambahkan loading indicator jika perlu

### Export Panel

Purpose:
Memilih dan membuat file PDF.

Options:
- Soal ujian
- Kartu soal
- Kisi-kisi
- Pembahasan

Anatomy:
- Checkbox output
- Preview summary
- Button "Export PDF"
- Export status
- Download links setelah berhasil

Behavior:
- Minimal satu output harus dipilih
- Button disabled jika tidak ada output dipilih
- Saat export berjalan, tampilkan progress/status
- Jika export gagal, pilihan user tetap tersimpan

Acceptance criteria:
- User tahu assessment apa yang akan diexport
- Status berhasil/gagal jelas
- Link download muncul setelah export selesai

### Assessment Preview

Purpose:
Menampilkan gambaran assessment sebelum export.

Content:
- Judul assessment
- Mata pelajaran
- Kelas
- Daftar soal
- Kisi-kisi atau pembahasan sesuai tab

Behavior:
- Preview mengikuti data terbaru
- Jika layar kecil, preview bisa menjadi halaman terpisah atau modal
- Loading state tersedia saat preview diproses

Rules:
- Preview tidak harus pixel-perfect seperti PDF final, tetapi harus cukup membantu review

### Draft Card

Purpose:
Menampilkan assessment yang belum selesai.

Anatomy:
- Judul
- Mata pelajaran dan kelas
- Status badge
- Terakhir diubah
- Actions: lanjutkan, hapus

Behavior:
- Klik utama membuka draft
- Hapus memakai konfirmasi

### Recent Assessment List

Purpose:
Menampilkan assessment terakhir di dashboard.

Anatomy:
- Judul assessment
- Metadata
- Status
- Last updated
- Quick actions

Empty state:
- Tampilkan ajakan membuat soal pertama

### Job Card

Purpose:
Menampilkan satu job AI dan status pemrosesannya.

Anatomy:
- Nama job atau assessment
- Status job
- Tanggal dibuat
- Estimasi Kredit
- Kredit aktual jika sudah selesai
- Progress atau status message
- Actions

Statuses:
- Menunggu
- Diproses
- Selesai
- Gagal
- Gagal Sebagian

Actions:
- Lihat detail
- Lihat & Edit jika selesai
- Coba lagi jika gagal
- Lihat transaksi Kredit

Behavior:
- Job selesai menampilkan Kredit aktual yang terpakai
- Job gagal menampilkan apakah Kredit tidak dipotong atau direfund
- Job gagal sebagian menampilkan jumlah hasil berhasil dan Kredit yang dikembalikan
- Action "Coba lagi" harus menampilkan estimasi Kredit baru sebelum berjalan

Acceptance criteria:
- User bisa memahami status job tanpa membuka detail
- Estimasi dan Kredit aktual tidak membingungkan
- Status Kredit selalu konsisten dengan riwayat transaksi

### Job List

Purpose:
Menampilkan daftar job AI yang pernah dibuat user.

Anatomy:
- Filter status
- Search optional
- List of Job Card
- Empty state

Behavior:
- Default sort dari job terbaru
- Bisa filter berdasarkan Menunggu, Diproses, Selesai, Gagal
- Job yang sedang diproses harus bisa refresh otomatis atau manual

Mobile behavior:
- Gunakan card list, bukan tabel lebar
- Status job dan Kredit tetap terlihat di baris utama

### Credit Balance

Purpose:
Menampilkan saldo Kredit user.

Anatomy:
- Label "Saldo Kredit"
- Jumlah Kredit
- Optional low balance indicator
- Optional action: "Lihat Riwayat" atau "Isi Kredit"

Usage:
- Dashboard
- Top bar
- Halaman Buat Assessment
- Halaman Riwayat Kredit

States:
- Normal
- Low balance
- Empty balance
- Loading

Behavior:
- Saldo diperbarui setelah job selesai, refund, atau top up
- Jika saldo rendah, tampilkan warning singkat
- Klik "Lihat Riwayat" membuka daftar transaksi Kredit

Accessibility:
- Jumlah Kredit harus terbaca sebagai teks, bukan hanya icon
- Warning saldo rendah tidak hanya memakai warna

### Credit Estimate

Purpose:
Menampilkan estimasi Kredit sebelum proses AI dijalankan.

Anatomy:
- Title "Estimasi Kredit"
- Total estimasi Kredit
- Current balance
- Remaining balance after job
- Credit Usage Breakdown
- Optional note: Kredit aktual mengikuti hasil yang berhasil dibuat

Inputs:
- Jumlah soal
- Opsi pembahasan
- Opsi kisi-kisi AI
- Opsi perbaiki otomatis atau buat ulang

States:
- Estimating
- Sufficient credit
- Insufficient credit
- Error calculating estimate

Behavior:
- Recalculate saat field generate berubah
- Jika Kredit cukup, tampilkan sisa Kredit setelah job
- Jika Kredit tidak cukup, tampilkan pesan jelas dan disable primary action
- Tidak boleh menjalankan AI tanpa estimasi yang valid

Acceptance criteria:
- User tahu total Kredit sebelum klik generate
- User tahu alasan jika tidak bisa melanjutkan
- Estimasi tetap mudah dibaca di mobile

### Credit Usage Breakdown

Purpose:
Menjelaskan komponen biaya Kredit.

Example rows:
- Generate 20 soal: 20 Kredit
- Pembahasan 20 soal: 20 Kredit
- Kisi-kisi 1 paket: 1 Kredit

Anatomy:
- Item name
- Quantity
- Credit per item
- Subtotal Kredit

Rules:
- Gunakan angka yang mudah dipahami
- Jangan menampilkan detail token AI provider kepada user
- Jika aturan Kredit berubah, label harus tetap menjelaskan hasil yang dibayar

### Credit Transaction List

Purpose:
Menampilkan riwayat Kredit user.

Columns:
- Tanggal
- Job/assessment
- Aktivitas
- Kredit
- Status

Statuses:
- Berhasil
- Diproses
- Gagal
- Refund

Behavior:
- Kredit keluar memakai tanda minus
- Refund atau Kredit masuk memakai tanda plus
- User bisa membuka job terkait jika tersedia
- Empty state muncul jika belum ada transaksi

Mobile behavior:
- Table berubah menjadi transaction cards
- Kredit dan status tetap terlihat tanpa scroll horizontal

### Insufficient Credit Modal

Purpose:
Menjelaskan bahwa user tidak memiliki Kredit cukup untuk menjalankan job AI.

Anatomy:
- Title "Kredit tidak cukup"
- Current balance
- Required credit
- Short explanation
- Actions

Actions:
- "Ubah Pengaturan"
- "Isi Kredit" jika top up tersedia
- "Batal"

Behavior:
- Muncul saat user mencoba menjalankan AI dengan saldo kurang
- Tidak menjalankan job sampai Kredit cukup
- Pengaturan form user tetap tersimpan

Acceptance criteria:
- User tahu saldo saat ini dan Kredit yang dibutuhkan
- User punya langkah berikutnya yang jelas

### Role Badge

Purpose:
Menampilkan role user dengan jelas.

Variants:
- Admin
- Guru

Usage:
- User Management
- Account menu
- User detail

Rules:
- Label role harus selalu terlihat
- Jangan hanya memakai warna untuk membedakan role

### User Table

Purpose:
Menampilkan daftar user untuk Admin.

Columns:
- Nama
- Email
- Role
- Status akun
- Saldo Kredit
- Terakhir aktif optional
- Actions

Actions:
- Edit user
- Ubah role
- Aktifkan/nonaktifkan user
- Kelola Kredit

Behavior:
- Hanya bisa diakses Admin
- Bisa filter berdasarkan role dan status
- User nonaktif tetap bisa ditampilkan lewat filter
- Actions sensitif membuka confirmation modal

Mobile behavior:
- Table berubah menjadi user cards
- Role, status, dan saldo Kredit tetap terlihat di ringkasan card

### User Form

Purpose:
Membuat atau mengubah user.

Fields:
- Nama
- Email
- Role
- Status akun
- Password awal optional untuk create

Validation:
- Nama wajib
- Email wajib dan valid
- Role wajib

Rules:
- Hanya Admin yang bisa submit
- Perubahan role harus memakai konfirmasi
- Email user sebaiknya tidak berubah sembarangan setelah dibuat

### Role Selector

Purpose:
Memilih role user.

Options:
- Admin
- Guru

Behavior:
- Hanya tersedia untuk Admin
- Saat mengubah role, tampilkan ringkasan dampak akses
- Tidak boleh membuat sistem tanpa minimal satu Admin aktif

### User Status Toggle

Purpose:
Mengaktifkan atau menonaktifkan akun user.

States:
- Aktif
- Nonaktif

Behavior:
- Menonaktifkan user membutuhkan konfirmasi
- User nonaktif tidak bisa login
- Aktivasi ulang membutuhkan konfirmasi ringan

### Credit Adjustment Panel

Purpose:
Memungkinkan Admin menambah atau mengurangi Kredit user.

Fields:
- User
- Saldo Kredit saat ini
- Aksi: tambah atau kurangi
- Jumlah Kredit
- Alasan perubahan
- Preview saldo akhir

Validation:
- User wajib dipilih
- Jumlah Kredit wajib lebih dari 0
- Alasan wajib
- Pengurangan tidak boleh membuat saldo negatif kecuali aturan bisnis mengizinkan

Behavior:
- Hanya Admin yang bisa submit
- Semua perubahan menghasilkan transaksi Kredit
- Transaksi menyimpan actor Admin, user target, jumlah, alasan, dan waktu
- Pengurangan Kredit memakai confirmation modal

Acceptance criteria:
- Admin tahu saldo sebelum dan sesudah perubahan
- Tidak ada perubahan Kredit tanpa alasan
- Riwayat Kredit langsung menampilkan transaksi baru

### Admin Stat Card

Purpose:
Menampilkan ringkasan operasional untuk Admin.

Usage:
- Total user aktif
- Total Kredit terpakai
- Jobs berjalan
- Jobs gagal

Rules:
- Angka harus mudah dipindai
- Link ke detail boleh ditambahkan jika relevan

### Access Guard

Purpose:
Mencegah user mengakses halaman atau aksi di luar role-nya.

Inputs:
- Required role
- Current user role
- Fallback behavior

Behavior:
- Jika role sesuai, render konten
- Jika role tidak sesuai, tampilkan Access Denied atau redirect ke dashboard sesuai role
- Jangan hanya menyembunyikan tombol di frontend; backend tetap harus validasi permission

Acceptance criteria:
- Guru tidak bisa membuka halaman Admin
- Admin tidak menjalankan aksi tanpa permission yang sesuai
- Access denied message jelas dan tidak membocorkan data

## State Standards

### Loading

Gunakan untuk:
- Buat Assessment
- Simpan perubahan
- Export PDF
- Load daftar assessment
- Hitung estimasi Kredit
- Load saldo Kredit

Required:
- Visual loading indicator
- Teks proses yang spesifik untuk proses panjang
- Disable aksi yang bisa menyebabkan duplikasi
- Jangan memotong Kredit sebelum hasil AI berhasil dibuat

### Error

Required:
- Pesan jelas
- Penyebab jika bisa diketahui
- Aksi berikutnya
- Data input user tetap aman
- Status Kredit jelas: tidak dipotong, dipotong sebagian, atau direfund

Example:

```text
Generate gagal
Koneksi sedang tidak stabil. Coba lagi tanpa mengisi ulang form.
[Coba Lagi]
```

### Empty

Required:
- Menjelaskan kondisi kosong
- Memberi aksi berikutnya
- Tidak menyalahkan user

### Success

Required:
- Feedback singkat
- Aksi lanjutan jika relevan
- Jumlah Kredit terpakai jika aksi memakai AI

Example:

```text
PDF berhasil dibuat.
[Download PDF]
```

### Insufficient Credit

Required:
- Saldo Kredit saat ini
- Kredit yang dibutuhkan
- Saran tindakan berikutnya
- Primary action tidak menjalankan job AI

Example:

```text
Kredit tidak cukup
Saldo kamu 8 Kredit, sedangkan job ini membutuhkan 20 Kredit.
[Ubah Pengaturan]
```

### Unauthorized

Required:
- Pesan akses tidak tersedia
- Role yang dibutuhkan tidak perlu dijelaskan terlalu detail
- Action kembali ke dashboard sesuai role

Example:

```text
Akses tidak tersedia
Halaman ini hanya tersedia untuk role yang sesuai.
[Kembali ke Dashboard]
```

### Credit Refunded

Required:
- Jumlah Kredit yang dikembalikan
- Alasan refund
- Link ke job terkait jika tersedia

Example:

```text
5 Kredit dikembalikan
Sebagian soal gagal dibuat, jadi Kredit yang tidak terpakai sudah dikembalikan.
```

## Accessibility Requirements

Semua komponen wajib:
- Bisa digunakan dengan keyboard
- Memiliki focus indicator
- Memiliki label yang jelas
- Tidak bergantung hanya pada warna
- Memiliki ukuran target klik minimal 40px x 40px

Komponen icon-only wajib:
- `aria-label`
- Tooltip jika makna tidak umum

Form wajib:
- Label terlihat
- Error terhubung dengan field terkait
- Required field ditandai jelas
- Informasi Kredit tidak hanya ditampilkan sebagai warna atau icon

Modal wajib:
- Focus trap
- Close control
- Escape behavior yang konsisten

## Responsive Requirements

Desktop:
- Sidebar penuh
- Content dan side panel boleh berdampingan
- Table boleh digunakan

Tablet:
- Sidebar compact atau drawer
- Grid maksimal 2 kolom untuk form

Mobile:
- Form satu kolom
- Table berubah menjadi list/card
- Actions penting tetap mudah dijangkau
- Tab boleh horizontal scroll
- Modal bisa menjadi bottom sheet jika lebih nyaman

## Component Acceptance Checklist

Sebelum komponen dianggap siap:
- Mengikuti design token
- Punya semua state relevan
- Responsif
- Accessible dengan keyboard
- Label dan microcopy jelas
- Error dan loading state tersedia
- Tidak merusak layout dengan teks panjang
- Tidak memakai card bertumpuk
- Dapat digunakan ulang tanpa styling khusus berlebihan

## Naming Recommendation

Gunakan nama komponen yang jelas dan sesuai domain.

Core:
- `Button`
- `IconButton`
- `TextField`
- `TextareaField`
- `SelectField`
- `Checkbox`
- `RadioGroup`
- `Tabs`
- `Modal`
- `Toast`
- `Alert`
- `EmptyState`
- `Skeleton`

Product:
- `GenerateQuestionForm`
- `QuestionCard`
- `QuestionEditor`
- `AnswerOptionsEditor`
- `DifficultySelector`
- `assessmentstatusBadge`
- `ExportPanel`
- `AssessmentPreview`
- `DraftCard`
- `RecentAssessmentList`
- `JobCard`
- `JobList`
- `CreditBalance`
- `CreditEstimate`
- `CreditUsageBreakdown`
- `CreditTransactionList`
- `InsufficientCreditModal`
- `RoleBadge`
- `UserTable`
- `UserForm`
- `RoleSelector`
- `UserStatusToggle`
- `CreditAdjustmentPanel`
- `AdminStatCard`
- `AccessGuard`

## Implementation Notes

Prioritas implementasi MVP:
1. App Shell
2. Button dan form fields
3. Credit Balance dan Credit Estimate
4. Generate Form
5. Question Card
6. Question Editor
7. Tabs untuk hasil assessment
8. Job Card dan Job List
9. Role Badge dan Access Guard
10. Export Panel
11. Credit Transaction List
12. User Management components
13. Credit Adjustment Panel
14. Toast, Alert, Empty State, Skeleton

Komponen harus dibuat reusable, tetapi jangan membuat abstraksi terlalu rumit sebelum pola pemakaiannya jelas.
## Assessment Manager Component Update

Komponen tambahan yang wajib dipertimbangkan setelah product vision bergeser ke Assessment Manager:

### AssessmentModeSelector

Purpose:

Memilih cara membuat assessment.

Options:

- Manual
- Dengan AI

Rules:

- Manual tidak memakai Kredit.
- Dengan AI menampilkan kebutuhan upload materi dan estimasi Kredit.

### LearningMaterialUploader

Purpose:

Mengupload file Word/PDF untuk diekstrak teksnya sebelum generate AI.

States:

- Empty
- Uploading
- Extracting
- Extracted
- Failed

Rules:

- File asli tidak disimpan.
- Tampilkan nama file dan panjang teks hasil ekstraksi.
- Jika ekstraksi gagal, tampilkan CTA upload ulang atau buat manual.

### ExtractedMaterialPreview

Purpose:

Menampilkan ringkasan teks materi yang akan menjadi acuan AI.

Rules:

- Preview boleh ringkas/collapsed.
- Jangan tampilkan sebagai editor utama jika teks panjang.

### QuestionImageUrlField

Purpose:

Mengisi link gambar ilustrasi eksternal pada soal.

Rules:

- URL opsional.
- Validasi URL.
- Preview gambar jika URL valid.
- Jika gambar gagal dimuat, tampilkan fallback tanpa merusak layout soal.
