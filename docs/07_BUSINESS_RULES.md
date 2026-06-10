# Business Rules

## Tujuan

Dokumen ini menjelaskan aturan bisnis Teachery agar implementasi produk konsisten dengan product vision, app flow, page spec, component spec, role system, Jobs AI, dan sistem Kredit.

Aturan utama:
- Teachery memiliki dua role MVP: Admin dan Guru
- Semua proses AI berjalan sebagai Job
- Semua proses AI yang berhasil menggunakan Kredit
- Semua perubahan Kredit harus tercatat sebagai transaksi
- Guru hanya dapat mengakses data miliknya sendiri
- Admin mengelola user, role, Kredit, dan monitoring Jobs

## Role & Permission Rules

### Role

Role yang tersedia pada MVP:
- Admin
- Guru

Tidak ada role lain pada MVP.

### Guru

Guru adalah user utama yang menggunakan Teachery untuk membuat perangkat soal.

Guru boleh:
- Login ke aplikasi
- Melihat Dashboard Guru
- Melihat saldo Kredit miliknya
- Membuat assessment manual tanpa AI
- Membuat Job AI untuk menambahkan soal ke assessment berdasarkan materi pembelajaran
- Mengupload file Word/PDF untuk diekstrak teksnya saat memakai AI
- Melihat estimasi Kredit sebelum Job dibuat
- Melihat Jobs miliknya
- Melihat detail Job miliknya
- Review dan edit assessment miliknya
- Menambahkan link gambar ilustrasi eksternal pada soal
- Buat ulang soal miliknya dengan AI
- Perbaiki otomatis soal miliknya dengan AI
- Export assessment miliknya ke PDF
- Melihat riwayat assessment miliknya
- Melihat riwayat Kredit miliknya
- Mengubah data profil dasar miliknya

Guru tidak boleh:
- Mengakses Dashboard Admin
- Mengakses User Management
- Mengakses Credit Management
- Melihat data guru lain
- Melihat Jobs guru lain
- Melihat assessment guru lain
- Melihat transaksi Kredit guru lain
- Mengubah saldo Kredit miliknya sendiri
- Mengubah role user
- Menonaktifkan atau mengaktifkan user

### Admin

Admin adalah user yang mengelola akses user dan kendali Kredit.

Admin boleh:
- Login ke aplikasi
- Melihat Dashboard Admin
- Membuat user
- Mengubah data user
- Mengubah role user
- Mengaktifkan atau menonaktifkan user
- Melihat semua user
- Melihat semua Jobs
- Melihat semua transaksi Kredit
- Menambah Kredit user
- Mengurangi Kredit user
- Melihat penggunaan Kredit per user dan per Job
- Melihat assessment user untuk kebutuhan monitoring jika fitur ini diaktifkan

Admin tidak boleh:
- Menghapus riwayat transaksi Kredit
- Mengubah transaksi Kredit yang sudah tercatat
- Menonaktifkan Admin terakhir yang aktif
- Mengubah role dirinya sendiri jika perubahan itu membuat sistem tidak memiliki Admin aktif
- Mengubah Kredit tanpa alasan

### Access Control

Aturan akses:
- Backend wajib memvalidasi role untuk setiap endpoint sensitif
- Frontend boleh menyembunyikan menu berdasarkan role, tetapi tidak boleh menjadi satu-satunya lapisan keamanan
- Jika user membuka halaman di luar role-nya, sistem menampilkan Access Denied atau redirect ke dashboard sesuai role
- Data query harus dibatasi berdasarkan owner untuk role Guru
- Admin dapat mengakses data lintas user hanya untuk kebutuhan manajemen dan monitoring

## User Rules

### User Status

Status user:
- Aktif
- Nonaktif

Aturan:
- User aktif dapat login sesuai role
- User nonaktif tidak dapat login
- User nonaktif tetap disimpan untuk audit dan riwayat
- Menonaktifkan user tidak menghapus assessment, Jobs, atau transaksi Kredit
- Aktivasi ulang user tidak mengubah saldo Kredit

### User Creation

Aturan:
- Hanya Admin yang dapat membuat user
- User baru wajib memiliki nama, email, dan role
- Email user harus unik
- Role default sebaiknya Guru
- Jika sistem membuat password awal, user sebaiknya diminta mengganti password setelah login pertama

### User Update

Aturan:
- Hanya Admin yang dapat mengubah data user lain
- User boleh mengubah data profil dasar miliknya sendiri jika fitur tersedia
- Perubahan role harus memakai konfirmasi
- Perubahan status user harus memakai konfirmasi
- Tidak boleh ada kondisi sistem tanpa minimal satu Admin aktif

## Credit Rules

### Definisi Kredit

Kredit adalah satuan internal untuk mengontrol penggunaan fitur yang memakai AI.

Kredit digunakan untuk:
- Generate soal dengan AI pada assessment
- Generate pembahasan dengan AI
- Generate kisi-kisi dengan AI
- Buat ulang soal dengan AI
- Perbaiki otomatis soal dengan AI

Kredit tidak digunakan untuk:
- Login
- Edit manual
- Membuat assessment manual
- Simpan draft
- Melihat Jobs
- Melihat assessment
- Preview assessment tanpa AI tambahan
- Export PDF tanpa AI tambahan
- Melihat riwayat Kredit

### Credit Balance

Aturan:
- Setiap user memiliki saldo Kredit
- Saldo Kredit tidak boleh negatif pada MVP
- Guru hanya dapat melihat saldo Kredit miliknya
- Admin dapat melihat saldo Kredit semua user
- Saldo Kredit hanya berubah melalui transaksi Kredit
- Sistem tidak boleh mengubah saldo tanpa membuat transaksi

### Credit Estimate

Aturan:
- Estimasi Kredit wajib tampil sebelum proses AI berjalan
- Estimasi Kredit harus dihitung dari opsi yang dipilih user
- Estimasi Kredit harus menampilkan total dan breakdown
- Jika saldo Kredit kurang dari estimasi, Job tidak boleh dibuat
- Jika estimasi gagal dihitung, proses AI tidak boleh berjalan

Contoh estimasi:
- Generate 10 soal tanpa pembahasan: 10 Kredit
- Generate 10 soal dengan pembahasan: 20 Kredit
- Generate kisi-kisi 1 paket: 1 Kredit
- Buat ulang 2 soal: 2 Kredit

### Credit Charging

Aturan:
- Kredit hanya dipotong untuk hasil AI yang berhasil dibuat
- Kredit aktual dihitung setelah Job selesai
- Kredit aktual boleh lebih kecil dari estimasi jika hasil hanya sebagian berhasil
- Kredit aktual tidak boleh lebih besar dari estimasi tanpa persetujuan tambahan user
- Setiap pemotongan Kredit harus memiliki transaksi Kredit

### Credit Refund

Refund terjadi jika:
- Job gagal total setelah Kredit sempat direservasi
- Job hanya berhasil sebagian
- Proses AI gagal karena sistem atau AI provider

Aturan refund:
- Kredit yang tidak terpakai harus dikembalikan
- Refund harus tercatat sebagai transaksi Kredit
- Refund harus terhubung ke Job terkait
- User harus dapat melihat refund di Riwayat Kredit

### Manual Credit Adjustment

Manual adjustment adalah perubahan Kredit oleh Admin.

Aturan:
- Hanya Admin yang dapat melakukan manual adjustment
- Admin wajib memilih user target
- Admin wajib memilih tipe: tambah atau kurangi
- Admin wajib mengisi jumlah Kredit
- Admin wajib mengisi alasan perubahan
- Sistem wajib menampilkan preview saldo akhir
- Pengurangan Kredit wajib memakai konfirmasi
- Saldo akhir tidak boleh negatif pada MVP
- Setiap adjustment harus menghasilkan transaksi Kredit
- Transaksi adjustment harus menyimpan aktor Admin

## Credit Transaction Rules

### Transaction Types

Jenis transaksi Kredit:
- AI charge
- AI refund
- Admin add credit
- Admin subtract credit

### Transaction Status

Status transaksi:
- Pending
- Success
- Failed
- Refunded

### Required Transaction Fields

Setiap transaksi Kredit wajib menyimpan:
- Transaction ID
- User target
- Amount Kredit
- Type
- Status
- Created at
- Updated at
- Related Job ID jika ada
- Related Assessment ID jika ada
- Actor user ID
- Actor role
- Reason untuk transaksi manual Admin

Aturan:
- Amount Kredit keluar ditampilkan sebagai negatif
- Amount Kredit masuk atau refund ditampilkan sebagai positif
- Transaksi yang sudah success tidak boleh diedit manual
- Jika perlu koreksi, buat transaksi baru sebagai penyesuaian

## Job Rules

### Job Definition

Job adalah proses async yang menjalankan AI atau proses terkait assessment.

Job digunakan untuk:
- Generate soal dengan AI pada assessment
- Buat ulang soal
- Perbaiki otomatis soal
- Generate pembahasan
- Generate kisi-kisi

### Job Ownership

Aturan:
- Setiap Job memiliki owner user
- Guru hanya dapat melihat Job miliknya
- Admin dapat melihat semua Job
- Job harus menyimpan input ringkas yang cukup untuk audit dan retry

### Job Status

Status Job:
- Menunggu
- Diproses
- Selesai
- Gagal
- Gagal Sebagian

Aturan status:
- Job baru dimulai dari Menunggu atau Diproses
- Job selesai jika semua output yang diminta berhasil dibuat
- Job gagal jika tidak ada output berhasil dibuat
- Job gagal sebagian jika sebagian output berhasil dibuat
- Job final tidak boleh kembali ke status proses kecuali dibuat Job retry baru

### Job Credit Fields

Setiap Job AI wajib menyimpan:
- Estimated credit
- Actual credit
- Reserved credit jika sistem memakai reservasi
- Credit status
- Related credit transaction IDs

Credit status:
- Not charged
- Reserved
- Charged
- Partially charged
- Refunded

### Job Failure

Aturan:
- Job gagal harus menyimpan error reason yang aman ditampilkan ke user
- Error internal tidak boleh membocorkan detail provider atau credential
- Jika Job gagal total, Kredit tidak boleh dipotong
- Jika Job gagal sebagian, Kredit hanya dipotong untuk output yang berhasil
- User dapat mencoba ulang jika input masih valid dan Kredit cukup

### Job Retry

Aturan:
- Retry membuat Job baru
- Retry harus menghitung estimasi Kredit baru
- Retry membutuhkan saldo Kredit cukup
- Retry harus memiliki transaksi Kredit sendiri jika berhasil
- Job lama tetap disimpan untuk audit

## AI Usage Rules

Aturan:
- Semua panggilan AI harus melalui Job
- Semua Job AI harus memiliki estimasi Kredit
- Generate soal dengan AI wajib memakai materi pembelajaran yang sudah diberikan kepada siswa
- Materi pembelajaran untuk AI wajib berupa file Word/PDF yang teksnya dapat diekstrak
- File materi pembelajaran tidak disimpan oleh sistem
- Sistem hanya memakai teks hasil ekstraksi sebagai konteks prompt AI dan boleh menyimpannya di assessment/job snapshot jika diperlukan untuk audit, retry, atau regenerate
- Jika teks materi gagal diekstrak atau kosong, Job AI tidak boleh dibuat
- Semua output AI harus dapat direview oleh Guru sebelum export
- AI tidak boleh langsung mengubah assessment final tanpa user mengetahui hasilnya
- Edit manual tidak menggunakan AI dan tidak memotong Kredit
- Proses AI tambahan dari halaman Review & Edit harus meminta konfirmasi Kredit

Output AI yang perlu disimpan:
- Soal
- Jawaban benar
- Pembahasan
- Kisi-kisi
- Metadata tingkat kesulitan
- Metadata tipe soal

## Assessment Creation Rules

Mode pembuatan assessment:

- Manual
- Dengan AI

Aturan mode Manual:

- Guru dapat membuat assessment tanpa Kredit.
- Guru dapat menambahkan soal satu per satu.
- Materi pembelajaran bersifat opsional.
- Edit, hapus, dan reorder soal manual tidak memakai Kredit.

Aturan mode Dengan AI:

- Guru wajib melampirkan materi pembelajaran Word/PDF.
- Sistem wajib extract text dari file materi.
- File asli tidak disimpan.
- Teks materi menjadi acuan prompt AI.
- Estimasi Kredit ditampilkan sebelum Job dibuat.
- Job tidak boleh dibuat jika Kredit kurang.

## Assessment Rules

### Assessment Ownership

Aturan:
- Setiap assessment memiliki owner user
- Guru hanya dapat melihat dan mengedit assessment miliknya
- Admin dapat melihat assessment untuk monitoring jika fitur ini diaktifkan
- Admin tidak mengedit assessment guru lain pada MVP kecuali diberi izin eksplisit

### Assessment Status

Status assessment:
- Draft
- Generating
- Perlu Review
- Siap Export
- Exporting
- PDF Siap
- Error

Aturan:
- assessment hasil AI harus masuk status Perlu Review sebelum export
- assessment dapat disimpan sebagai Draft
- assessment Siap Export jika minimal ada satu output yang valid
- Error assessment harus menampilkan tindakan berikutnya

### Question Rules

Aturan:
- Setiap soal harus memiliki pertanyaan
- Setiap soal dapat memiliki `image_url` untuk gambar ilustrasi eksternal
- `image_url` harus berupa URL valid dan aman
- Sistem menyimpan URL gambar, bukan file gambar
- Soal pilihan ganda harus memiliki minimal 2 pilihan jawaban
- Soal pilihan ganda harus memiliki satu jawaban benar
- Pembahasan dapat kosong jika user tidak memilih pembahasan otomatis
- Tingkat kesulitan harus mengikuti opsi yang tersedia
- Hapus soal tidak mengembalikan Kredit karena output sudah berhasil dibuat
- Edit manual tidak memotong Kredit
- Buat ulang soal membuat Job AI baru dan memakai Kredit jika berhasil

## Export Rules

Output PDF:
- Soal ujian
- Kartu soal
- Kisi-kisi soal
- Pembahasan soal

Aturan:
- Export PDF tidak menggunakan Kredit jika semua output sudah tersedia
- Minimal satu output harus dipilih sebelum export
- Export gagal tidak memotong Kredit
- Jika output belum tersedia dan membutuhkan AI tambahan, sistem harus menampilkan estimasi Kredit sebelum proses
- File PDF yang berhasil dibuat harus dapat diunduh
- Export tidak boleh mengubah isi soal tanpa aksi user

## Admin Management Rules

### User Management

Aturan:
- Hanya Admin yang dapat mengakses User Management
- Admin dapat membuat user baru
- Admin dapat mengubah role user
- Admin dapat mengaktifkan atau menonaktifkan user
- Admin tidak boleh menonaktifkan Admin terakhir yang aktif
- Perubahan role dan status harus memakai konfirmasi

### Credit Management

Aturan:
- Hanya Admin yang dapat mengakses Credit Management
- Admin dapat menambah Kredit user
- Admin dapat mengurangi Kredit user
- Admin wajib mengisi alasan perubahan
- Admin wajib melihat preview saldo akhir sebelum submit
- Semua perubahan Kredit manual masuk Riwayat Kredit

### Monitoring

Aturan:
- Admin dapat melihat semua Jobs
- Admin dapat melihat riwayat Kredit semua user
- Admin dapat melihat penggunaan Kredit per user
- Admin dapat melihat Job gagal untuk investigasi
- Admin tidak boleh menghapus audit trail

## Audit Rules

Audit wajib untuk:
- Login gagal berulang jika fitur keamanan tersedia
- User dibuat
- User diubah
- Role diubah
- User dinonaktifkan atau diaktifkan
- Kredit ditambah Admin
- Kredit dikurangi Admin
- Job AI dibuat
- Job AI selesai
- Job AI gagal
- Kredit dipotong
- Kredit direfund

Minimal audit fields:
- Event ID
- Event type
- Actor user ID
- Actor role
- Target user ID jika ada
- Related Job ID jika ada
- Related transaction ID jika ada
- Timestamp
- Metadata ringkas

Aturan:
- Audit log tidak boleh diedit manual
- Audit log tidak boleh menampilkan credential atau API key
- Error detail internal harus disimpan aman dan tidak selalu ditampilkan ke user

## Security Rules

Aturan:
- Password tidak boleh disimpan dalam bentuk plain text
- Backend wajib memvalidasi role dan ownership
- Guru hanya boleh mengakses resource miliknya
- Admin endpoint harus membutuhkan role Admin
- Token/session user nonaktif harus ditolak atau dicabut saat memungkinkan
- Input upload materi harus divalidasi
- File export hanya boleh diakses owner atau Admin jika monitoring diaktifkan
- Data AI provider seperti API key tidak boleh muncul di frontend, logs publik, atau response user

## Validation Rules

Buat Assessment:
- Mata pelajaran wajib
- Kelas wajib
- Mode pembuatan wajib: manual atau AI
- Materi pembelajaran Word/PDF wajib jika mode AI
- Teks materi harus berhasil diekstrak jika mode AI
- File materi asli tidak boleh disimpan
- Jumlah soal wajib dan lebih dari 0
- Jenis soal wajib
- Tingkat kesulitan wajib
- Estimasi Kredit harus valid untuk mode AI
- Saldo Kredit harus cukup untuk mode AI

User Management:
- Nama wajib
- Email wajib dan unik
- Role wajib
- Status akun wajib

Credit Management:
- User target wajib
- Jumlah Kredit wajib lebih dari 0
- Alasan wajib
- Saldo akhir tidak boleh negatif

Export:
- Minimal satu output dipilih
- assessment harus valid
- User harus memiliki akses ke assessment

## Error Handling Rules

Aturan:
- Error harus memberi pesan yang dapat dipahami user
- Input user harus tetap tersimpan jika proses gagal
- Job gagal tidak boleh memotong Kredit
- Jika Kredit sudah direservasi, sistem harus melepas reservasi atau membuat refund
- Error provider AI tidak boleh menampilkan detail teknis mentah
- Error permission harus memakai pesan "Akses tidak tersedia"

Contoh pesan:

```text
Kredit tidak cukup
Saldo kamu 8 Kredit, sedangkan job ini membutuhkan 20 Kredit.

Generate gagal
Koneksi sedang tidak stabil. Coba lagi tanpa mengisi ulang form.

Akses tidak tersedia
Halaman ini hanya tersedia untuk role yang sesuai.
```

## MVP Business Constraints

MVP belum mencakup:
- Payment gateway kompleks
- Subscription plan multi-tier
- Marketplace pembelian Kredit
- Pelaksanaan ujian online
- Koreksi jawaban ujian
- Analisis nilai siswa
- Integrasi LMS
- Role permission granular selain Admin dan Guru

## Acceptance Checklist

Business rules dianggap terpenuhi jika:
- Guru tidak bisa mengakses data user lain
- Guru tidak bisa mengakses halaman Admin
- Admin dapat mengelola user
- Admin dapat mengelola Kredit user
- Semua proses AI memiliki estimasi Kredit
- Job tidak dibuat jika Kredit tidak cukup
- Kredit hanya dipotong untuk output AI yang berhasil
- Job gagal tidak mengurangi Kredit
- Refund tercatat di Riwayat Kredit
- Semua perubahan Kredit manual memiliki alasan dan aktor Admin
- Riwayat Kredit tidak dapat diedit manual
- Export PDF tanpa AI tambahan tidak memakai Kredit
- Backend memvalidasi role, ownership, dan saldo Kredit
