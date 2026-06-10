# Design System

## Tujuan

Design system Teachery menjadi acuan visual dan komponen agar seluruh layar terasa konsisten, mudah digunakan, dan cepat dikembangkan.

Karakter utama:
- Clear: informasi mudah dipindai
- Fresh: tampilan terang, ringan, dan modern
- Produktif: mendukung guru menyelesaikan pekerjaan tanpa distraksi
- Familiar: tidak membuat pengguna non-teknis merasa asing
- Transparan: penggunaan Kredit untuk AI mudah dipahami
- Role-aware: menu dan aksi mengikuti role Admin atau Guru

## Design Principles

### 1. Functional First

Setiap elemen UI harus punya fungsi yang jelas. Dekorasi boleh digunakan hanya jika membantu hierarki atau kenyamanan visual.

### 2. One Primary Action

Dalam satu area kerja, hanya ada satu aksi utama yang paling menonjol.

Contoh:
- Dashboard: "Buat Assessment"
- Review soal: "Export PDF"
- Editor soal: "Simpan Perubahan"

### 3. Easy to Scan

Gunakan spacing, heading, label, status, dan grouping agar guru cepat memahami isi layar.

### 4. Teacher Friendly

Bahasa, ikon, dan alur harus terasa dekat dengan workflow guru: membuat soal, review, edit, kisi-kisi, pembahasan, dan export.

### 5. Credit Transparency

Setiap proses AI harus menampilkan estimasi Kredit sebelum dijalankan, Kredit aktual setelah selesai, dan riwayat transaksi yang bisa ditelusuri.

### 6. Role-Based Clarity

Komponen dan halaman harus membedakan kebutuhan Guru dan Admin. Guru melihat workflow pembuatan soal, sedangkan Admin melihat manajemen user, Kredit, monitoring jobs, dan audit.

## Design Tokens

### Color

Gunakan neutral sebagai dasar, primary untuk aksi utama, dan semantic color untuk status.

```text
--color-primary-50: #EFF6FF
--color-primary-100: #DBEAFE
--color-primary-500: #2563EB
--color-primary-600: #1D4ED8
--color-primary-700: #1E40AF

--color-success-50: #ECFDF5
--color-success-500: #10B981
--color-success-700: #047857

--color-warning-50: #FFFBEB
--color-warning-500: #F59E0B
--color-warning-700: #B45309

--color-credit-50: #F0FDFA
--color-credit-500: #14B8A6
--color-credit-700: #0F766E

--color-danger-50: #FEF2F2
--color-danger-500: #EF4444
--color-danger-700: #B91C1C

--color-neutral-0: #FFFFFF
--color-neutral-50: #F8FAFC
--color-neutral-100: #F1F5F9
--color-neutral-200: #E2E8F0
--color-neutral-300: #CBD5E1
--color-neutral-500: #64748B
--color-neutral-700: #334155
--color-neutral-900: #0F172A
```

Usage:
- Page background: `neutral-50`
- Surface/card: `neutral-0`
- Border: `neutral-200`
- Main text: `neutral-900`
- Secondary text: `neutral-500`
- Primary action: `primary-500`
- Success state: `success-500`
- Warning state: `warning-500`
- Credit balance and credit usage: `credit-500`
- Error/destructive: `danger-500`

Do:
- Pakai primary hanya untuk aksi utama dan active state
- Pakai warna status secara konsisten
- Pastikan kontras teks tetap jelas

Don't:
- Membuat semua komponen berwarna biru
- Menggunakan warna status untuk dekorasi
- Mengandalkan warna saja untuk menjelaskan status

### Typography

Font utama:
- Inter
- Plus Jakarta Sans
- System sans-serif sebagai fallback

```text
Font family: Inter, Plus Jakarta Sans, system-ui, sans-serif
Letter spacing: 0
Line height body: 1.5
Line height heading: 1.25
```

Scale:

```text
Display: 32px / 40px / 700
Page Title: 28px / 36px / 700
Section Title: 22px / 30px / 700
Card Title: 18px / 26px / 600
Body Large: 16px / 24px / 400
Body: 14px / 22px / 400
Label: 14px / 20px / 600
Caption: 12px / 18px / 400
```

Usage:
- Page title untuk judul halaman utama
- Section title untuk area besar
- Card title untuk item seperti assessment atau soal
- Body untuk konten utama dan teks soal
- Caption untuk helper text, timestamp, dan metadata

### Spacing

Gunakan kelipatan 4px.

```text
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
--space-12: 48px
```

Usage:
- Gap kecil antar ikon dan label: 8px
- Padding input/button: 12px 16px
- Padding card: 16px atau 20px
- Gap antar section: 24px atau 32px
- Page padding desktop: 24px sampai 32px
- Page padding mobile: 16px

### Radius

```text
--radius-sm: 4px
--radius-md: 6px
--radius-lg: 8px
--radius-xl: 12px
--radius-full: 999px
```

Usage:
- Button, input, select: `md`
- Card, modal, dropdown: `lg`
- Badge/pill: `full`

Catatan:
- Card utama maksimal 8px kecuali modal atau empty state khusus.
- Hindari radius terlalu besar agar aplikasi tetap terasa sebagai tool kerja.

### Shadow

Gunakan shadow secara hemat.

```text
--shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06)
--shadow-md: 0 8px 24px rgba(15, 23, 42, 0.08)
--shadow-lg: 0 16px 40px rgba(15, 23, 42, 0.12)
```

Usage:
- Card default: tanpa shadow atau `shadow-sm`
- Dropdown/popover: `shadow-md`
- Modal: `shadow-lg`

### Border

```text
Default border: 1px solid #E2E8F0
Focus border: 1px solid #2563EB
Error border: 1px solid #EF4444
```

Gunakan border halus untuk memisahkan area, bukan shadow tebal.

## Layout System

### App Shell

Desktop:
- Sidebar kiri: 240px
- Header konten: 64px
- Main content max width: 1200px
- Page padding: 24px atau 32px

Tablet:
- Sidebar compact: 72px atau drawer
- Page padding: 20px

Mobile:
- Navigasi drawer atau bottom navigation
- Page padding: 16px
- Form satu kolom
- Aksi utama boleh sticky di bawah jika workflow panjang

### Grid

Gunakan grid untuk layout dashboard dan form.

```text
Desktop dashboard: 12 columns
Tablet: 8 columns
Mobile: 4 columns
Gap: 16px sampai 24px
```

Contoh:
- Summary cards: 3 atau 4 kolom desktop, 1 kolom mobile
- Form generate: 2 kolom desktop, 1 kolom mobile
- Review soal: content utama + side panel desktop, stacked mobile

## Core Components

### Button

Variants:
- Primary
- Secondary
- Ghost
- Danger
- Icon

Sizes:

```text
Small: height 32px, padding 8px 12px
Medium: height 40px, padding 10px 16px
Large: height 48px, padding 12px 20px
Icon medium: 40px x 40px
```

States:
- Default
- Hover
- Focus
- Disabled
- Loading

Rules:
- Gunakan primary untuk aksi utama
- Gunakan secondary untuk aksi pendukung
- Gunakan ghost untuk aksi ringan
- Gunakan danger hanya untuk aksi destructive
- Tombol loading harus mencegah klik ganda

Label examples:
- "Buat Assessment"
- "Simpan Draft"
- "Export PDF"
- "Buat Ulang"
- "Hapus Soal"

### Input

Types:
- Text input
- Textarea
- Select
- Number input
- Checkbox
- Radio
- Toggle

Anatomy:
- Label
- Field
- Helper text
- Error text

States:
- Default
- Hover
- Focus
- Filled
- Disabled
- Error

Rules:
- Label selalu terlihat
- Placeholder bukan pengganti label
- Error muncul dekat field
- Helper text singkat dan spesifik

### Card

Usage:
- assessment terakhir
- Item soal
- Draft
- Riwayat export
- Empty state kecil

Anatomy:
- Header optional
- Title
- Metadata
- Content
- Actions

Rules:
- Jangan menaruh card di dalam card
- Card item soal harus mudah dipindai
- Hindari shadow berlebihan

### Badge

Usage:
- Status assessment
- Tingkat kesulitan
- Tipe soal
- Status export
- Status transaksi Kredit

Variants:
- Neutral
- Primary
- Success
- Warning
- Danger
- Credit

Examples:
- "Draft"
- "Siap Export"
- "Pilihan Ganda"
- "Sedang"
- "PDF Siap"
- "Kredit Cukup"
- "Refund"
- "Admin"
- "Guru"
- "Aktif"
- "Nonaktif"

### Tabs

Usage pada halaman review:
- Soal
- Kisi-kisi
- Kartu Soal
- Pembahasan

Rules:
- Tab aktif harus jelas
- Jangan memakai terlalu banyak tab
- Pada mobile, tab boleh horizontal scroll

### Modal

Usage:
- Konfirmasi hapus
- Preview export
- Edit metadata assessment

Rules:
- Modal harus punya judul jelas
- Tombol primary dan secondary terlihat
- Untuk aksi destructive, jelaskan dampaknya

### Toast / Alert

Toast untuk feedback singkat:
- "Perubahan tersimpan"
- "PDF berhasil dibuat"
- "Soal berhasil dibuat ulang"

Alert untuk informasi yang perlu dibaca:
- Form belum lengkap
- Generate gagal
- Export gagal

Rules:
- Toast tidak menggantikan validasi form
- Error harus menjelaskan langkah berikutnya

### Empty State

Usage:
- Belum ada assessment
- Belum ada draft
- Riwayat export kosong

Anatomy:
- Icon sederhana
- Title
- Description singkat
- Primary action

Example:

```text
Belum ada assessment
Mulai dengan membuat soal pertama untuk kelasmu.
[Buat Assessment]
```

### Loading State

Usage:
- Buat Assessment
- Simpan perubahan
- Export PDF

Rules:
- Tampilkan teks yang spesifik
- Gunakan skeleton untuk daftar atau card
- Jangan biarkan layar kosong saat proses berjalan

Examples:
- "Teachery sedang membuat soal..."
- "Menyimpan perubahan..."
- "Menyiapkan PDF..."

## Product-Specific Components

### Question Card

Anatomy:
- Nomor soal
- Badge tipe soal
- Badge tingkat kesulitan
- Pertanyaan
- Pilihan jawaban
- Jawaban benar
- Pembahasan singkat
- Actions: edit, duplikasi, buat ulang, hapus

Rules:
- Pertanyaan menjadi fokus utama
- Jawaban benar harus mudah ditemukan
- Actions tidak boleh mengganggu pembacaan soal

### Generate Form

Fields:
- Mata pelajaran
- Kelas
- Materi
- Jumlah soal
- Jenis soal
- Tingkat kesulitan
- Bahasa
- Instruksi tambahan

Rules:
- Kelompokkan field dasar dan field lanjutan
- Tampilkan ringkasan sebelum generate jika form panjang
- Simpan input jika generate gagal

### Export Panel

Options:
- Soal ujian
- Kartu soal
- Kisi-kisi
- Pembahasan

Rules:
- User bisa memilih assessment yang ingin diexport
- Status export harus jelas
- Setelah selesai, tampilkan aksi download

### Credit Balance

Anatomy:
- Label "Saldo Kredit"
- Jumlah Kredit
- Optional action untuk isi ulang atau lihat riwayat

Rules:
- Tampil di Dashboard dan area akun
- Gunakan warna credit secara hemat
- Jika saldo rendah, tampilkan warning yang jelas
- Jangan menyembunyikan saldo di menu yang terlalu dalam

### Credit Estimate

Anatomy:
- Estimasi total Kredit
- Breakdown penggunaan
- Saldo saat ini
- Sisa Kredit setelah job berjalan

Rules:
- Tampil sebelum user menjalankan proses AI
- Gunakan bahasa sederhana
- Jika estimasi melebihi saldo, tampilkan state error dan disable aksi generate
- Jelaskan bahwa Kredit aktual dihitung berdasarkan hasil yang berhasil dibuat

### Credit Transaction List

Anatomy:
- Tanggal
- Nama job atau assessment
- Jenis aksi AI
- Jumlah Kredit
- Status transaksi

Rules:
- Kredit keluar dan refund harus mudah dibedakan
- Setiap transaksi bisa ditelusuri ke job terkait jika tersedia
- Gunakan empty state jika belum ada transaksi Kredit

### Job Card

Anatomy:
- Nama job atau assessment
- Status job
- Estimasi Kredit
- Kredit aktual
- Waktu dibuat
- Action utama

Rules:
- Tampilkan status proses dengan jelas
- Jika job selesai, tampilkan aksi "Lihat & Edit"
- Jika job gagal, tampilkan alasan dan status Kredit
- Kredit aktual hanya tampil setelah job selesai atau gagal sebagian

### Role Badge

Anatomy:
- Label role
- Optional icon

Variants:
- Admin
- Guru

Rules:
- Gunakan role badge pada User Management dan account area jika perlu
- Jangan mengandalkan warna saja; label role harus selalu tertulis
- Role Admin harus terlihat jelas saat user berada di area administrasi

### User Row

Anatomy:
- Nama user
- Email
- Role badge
- Status akun
- Saldo Kredit
- Last active optional
- Actions

Rules:
- Digunakan pada User Management
- Actions sensitif seperti nonaktifkan user atau ubah role harus memakai konfirmasi
- User nonaktif tetap tampil di daftar jika filter mengizinkan

### Credit Adjustment Panel

Anatomy:
- User selected
- Saldo Kredit saat ini
- Action type: tambah atau kurangi
- Jumlah Kredit
- Alasan perubahan
- Preview saldo setelah perubahan
- Confirmation action

Rules:
- Hanya untuk Admin
- Alasan perubahan wajib
- Pengurangan Kredit memakai warning state
- Setiap submit menghasilkan transaksi Kredit dengan aktor Admin

### Admin Stat Card

Anatomy:
- Label metric
- Value
- Supporting text
- Optional trend

Usage:
- Jumlah user aktif
- Total Kredit terpakai
- Jobs diproses
- Jobs gagal

Rules:
- Gunakan untuk ringkasan Dashboard Admin
- Jangan menggantikan tabel audit detail

## Iconography

Gunakan ikon outline yang sederhana dan konsisten.

Rekomendasi:
- Lucide icons

Icon usage:
- Generate: Sparkles atau Wand
- Edit: Pencil
- Delete: Trash
- Export/download: Download
- Save: Save
- Preview: Eye
- Warning: Triangle Alert
- Success: Check
- Assessment: FileText
- Credit: Coins atau CircleDollarSign
- History: History
- User management: Users
- Role/Admin: Shield
- Active user: UserCheck
- Inactive user: UserX

Rules:
- Ikon harus punya label atau tooltip jika maknanya tidak umum
- Jangan mencampur banyak gaya ikon
- Ukuran icon default 18px atau 20px

## Motion

Gunakan animasi ringan untuk membantu orientasi.

```text
Fast: 120ms
Default: 180ms
Slow: 240ms
Easing: ease-out
```

Usage:
- Hover button
- Dropdown open/close
- Modal fade
- Toast masuk/keluar
- Loading progress

Avoid:
- Animasi dekoratif berlebihan
- Gerakan yang memperlambat workflow

## Accessibility

Minimum standard:
- Kontras teks memenuhi WCAG AA
- Semua kontrol bisa diakses keyboard
- Focus ring terlihat jelas
- Tombol icon punya accessible label
- Error form tidak hanya memakai warna
- Area klik minimal 40px x 40px
- Modal mengunci fokus saat terbuka

Focus style:

```text
outline: 2px solid #2563EB
outline-offset: 2px
```

## Content Style

Tone:
- Jelas
- Ramah
- Singkat
- Tidak teknis

Rules:
- Pakai kata kerja langsung
- Jelaskan apa yang terjadi
- Hindari istilah internal sistem
- Gunakan "soal", "kisi-kisi", "pembahasan", dan "PDF" secara konsisten
- Gunakan "Kredit" untuk satuan biaya AI secara konsisten
- Bedakan "estimasi Kredit" dan "Kredit terpakai"

Examples:
- Baik: "Materi belum diisi"
- Baik: "PDF berhasil dibuat"
- Baik: "Job ini diperkirakan menggunakan 20 Kredit"
- Baik: "Kredit dikembalikan karena job gagal"
- Hindari: "Request failed"
- Hindari: "Invalid payload"
- Hindari: "Token usage exceeded"

## Page Templates

### Dashboard

Structure:
- Page title dan greeting singkat
- Saldo Kredit
- Primary action: Buat Assessment
- Draft terakhir
- Riwayat assessment
- Riwayat Kredit ringkas atau link ke Riwayat Kredit
- Status atau statistik ringan

### Dashboard Admin

Structure:
- Page title
- Admin stat cards
- User activity summary
- Credit usage summary
- Recent jobs semua user
- Recent credit transactions
- Actions: Kelola User, Kelola Kredit

### Buat Assessment

Structure:
- Page title
- Form pengaturan soal
- Ringkasan pilihan
- Estimasi Kredit
- Primary action
- Helper text atau tips singkat

### Review & Edit

Structure:
- Header assessment
- Status Kredit job
- Tabs output
- List question cards
- Side panel untuk export atau ringkasan

### Export

Structure:
- Pilihan jenis assessment
- Preview status
- Tombol export
- Download setelah berhasil

### Riwayat Kredit

Structure:
- Saldo Kredit saat ini
- Filter transaksi
- Daftar transaksi Kredit
- Empty state jika belum ada transaksi
- Link ke job atau assessment terkait

### User Management

Structure:
- Search dan filter user
- User table/list
- Role badge
- Status akun
- Saldo Kredit
- Actions: tambah user, edit user, ubah role, aktifkan/nonaktifkan

### Credit Management

Structure:
- Search user
- Credit Balance user terpilih
- Credit Adjustment Panel
- Credit Transaction List
- Confirmation modal untuk perubahan Kredit

## Implementation Checklist

Sebelum sebuah layar dianggap selesai:
- Warna memakai design token
- Typography mengikuti scale
- Spacing konsisten
- Primary action hanya satu per area
- Semua form punya label
- Loading, error, empty, dan success state tersedia
- State Kredit cukup, Kredit kurang, Kredit terpakai, dan refund tersedia jika layar memakai AI
- Responsif di desktop dan mobile
- Tombol icon punya label atau tooltip
- Tidak ada card bertumpuk
- Export dan edit mudah ditemukan
- Estimasi Kredit tampil sebelum aksi AI berjalan
- Menu dan aksi sesuai role user
- Aksi Admin sensitif memakai konfirmasi

## Do and Don't

Do:
- Gunakan UI terang dengan neutral background
- Buat hierarchy jelas
- Beri feedback untuk setiap aksi penting
- Pastikan hasil AI mudah direview
- Gunakan komponen yang sama untuk pola yang sama
- Tampilkan saldo dan estimasi Kredit dengan jelas
- Pisahkan navigasi Guru dan Admin sesuai kebutuhan

Don't:
- Membuat halaman terasa seperti landing page
- Menggunakan banyak warna aksen sekaligus
- Menaruh terlalu banyak informasi dalam satu card
- Menggunakan istilah teknis yang tidak dipahami guru
- Menyembunyikan aksi export di menu yang terlalu dalam
- Menjalankan AI tanpa menjelaskan penggunaan Kredit
- Menampilkan menu Admin kepada Guru
- Mengubah Kredit tanpa alasan dan audit trail
## Assessment Manager Design Update

Design system harus mendukung perubahan objek utama menjadi Assessment.

Patterns:

- Gunakan segmented control untuk memilih mode `Manual` atau `Dengan AI`.
- Gunakan upload control yang jelas untuk materi Word/PDF pada mode AI.
- Tampilkan helper text: "File tidak disimpan. Teachery hanya membaca teks materi."
- Gunakan status badge untuk material extraction: `Belum ada materi`, `Membaca materi`, `Materi siap`, `Materi gagal dibaca`.
- Gunakan field URL dengan preview untuk gambar ilustrasi soal.
- Gambar eksternal ditampilkan dalam area yang stabil dan tidak menggeser teks soal secara berlebihan.

Copy:

- "Buat Assessment"
- "Tulis soal manual"
- "Generate dengan AI"
- "Upload materi pembelajaran"
- "Materi berhasil dibaca"
- "File tidak disimpan"
