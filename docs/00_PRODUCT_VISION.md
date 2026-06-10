# Product Vision

## Nama Produk
Teachery

## Vision Statement
Membantu guru mengelola assessment dari perencanaan, pembuatan soal, review, hingga export assessment dengan cepat, rapi, dan siap digunakan, sehingga waktu administrasi berkurang dan guru bisa lebih fokus pada proses mengajar.

## Problem
Guru sering menghabiskan banyak waktu untuk membuat soal, kisi-kisi, kartu soal, dan pembahasan. Proses ini berulang, memakan waktu, dan sering harus disesuaikan dengan tingkat kesulitan serta materi pembelajaran.

Karena Teachery menggunakan AI provider berbayar, setiap proses AI juga memiliki biaya operasional. Produk perlu mengatur penggunaan AI dengan sistem Kredit agar biaya tetap terkendali, transparan untuk user, dan bisa menjadi dasar monetisasi.

## Target User
- Guru SD
- Guru SMP
- Guru SMA/SMK
- Pengajar atau tutor
- Admin sekolah/lembaga atau admin platform

## Value Proposition
Teachery adalah Assessment Manager untuk guru. Guru dapat membuat assessment secara manual atau memakai AI untuk generate soal berdasarkan materi pembelajaran yang sudah diberikan kepada siswa. Jika memakai AI, guru wajib melampirkan materi pembelajaran dalam bentuk Word atau PDF. Sistem hanya mengekstrak teks dari file tersebut dan memakai teksnya sebagai konteks prompt AI agar soal tidak melenceng dari materi. File asli tidak disimpan.

Setelah soal dibuat, guru tetap memegang kontrol untuk review, edit, menambahkan link gambar ilustrasi eksternal pada tiap soal, menyusun kisi-kisi/kartu soal/pembahasan, lalu export assessment ke PDF. Setiap penggunaan AI ditampilkan dengan estimasi Kredit agar user tahu biaya sebelum membuat job.

## MVP Scope
- Login
- Role user: Admin dan Guru
- Manajemen user oleh Admin
- Manajemen Kredit oleh Admin
- Saldo Kredit user
- Estimasi Kredit sebelum menjalankan job AI
- Daftar Jobs dan status pemrosesan AI
- Buat Assessment secara manual
- Tambah/generate soal dengan bantuan AI pada assessment
- Lampirkan materi pembelajaran Word/PDF untuk generate AI
- Extract text dari materi pembelajaran tanpa menyimpan file asli
- Edit soal manual dan hasil AI
- Link gambar ilustrasi eksternal per soal
- Generate kartu soal
- Generate kisi-kisi soal
- Generate pembahasan soal
- Pencatatan penggunaan Kredit per job
- Riwayat transaksi Kredit
- Export assessment ke PDF

## Out of Scope
- Pelaksanaan assessment online
- Koreksi jawaban assessment
- Analisis nilai siswa
- Bank soal publik
- Integrasi LMS
- Payment gateway kompleks
- Subscription plan multi-tier
- Marketplace pembelian Kredit dari pihak ketiga
- Role permission yang terlalu granular di luar Admin dan Guru

## Role System

Teachery memiliki dua role utama pada MVP:

### Guru

Guru adalah user utama yang membuat dan mengelola assessment. Guru dapat membuat soal secara manual atau memakai AI jika ingin mempercepat proses.

Hak akses Guru:
- Melihat saldo Kredit miliknya
- Membuat assessment manual tanpa AI
- Membuat Job AI untuk menambahkan soal ke assessment berdasarkan materi pembelajaran
- Melampirkan materi pembelajaran Word/PDF saat memakai AI
- Melihat estimasi Kredit sebelum job berjalan
- Melihat Jobs miliknya sendiri
- Review dan edit assessment
- Export assessment ke PDF
- Melihat riwayat assessment miliknya
- Melihat riwayat transaksi Kredit miliknya

Batasan Guru:
- Tidak bisa melihat data guru lain
- Tidak bisa mengubah saldo Kredit sendiri secara manual
- Tidak bisa membuat, mengubah, atau menonaktifkan user lain

### Admin

Admin bertugas mengelola akses user dan kendali Kredit.

Hak akses Admin:
- Melihat dashboard admin
- Membuat, mengubah, menonaktifkan, dan mengaktifkan user
- Menetapkan role user sebagai Admin atau Guru
- Melihat daftar user
- Melihat penggunaan Kredit per user
- Menambah atau mengurangi Kredit user
- Melihat riwayat transaksi Kredit seluruh user
- Melihat Jobs seluruh user untuk kebutuhan monitoring

Batasan Admin:
- Perubahan Kredit harus tercatat sebagai transaksi
- Admin tidak boleh mengubah riwayat Kredit yang sudah tercatat
- Admin action penting seperti mengurangi Kredit atau menonaktifkan user harus memakai konfirmasi

## Credit System

Kredit adalah satuan internal untuk mengontrol penggunaan fitur yang memakai AI.

Prinsip:
- Semua proses yang memanggil AI harus memiliki biaya Kredit
- User harus melihat estimasi Kredit sebelum job dibuat
- Kredit hanya dipotong untuk hasil AI yang berhasil dibuat
- Jika job gagal karena sistem atau AI provider, Kredit tidak dipotong atau dikembalikan
- Setiap pemotongan Kredit harus tercatat di riwayat transaksi
- Export PDF tanpa proses AI tambahan tidak menggunakan Kredit

Contoh aturan awal:
- Generate 1 soal: 1 Kredit
- Generate pembahasan untuk 1 soal: 1 Kredit
- Generate kisi-kisi dari hasil soal: 1 Kredit per paket assessment
- Buat ulang 1 soal dengan AI: 1 Kredit
- Perbaiki otomatis 1 soal dengan AI: 1 Kredit

Contoh:
Jika user membuat 20 soal pilihan ganda dan setiap soal berhasil dibuat, maka job menggunakan 20 Kredit. Jika user juga meminta pembahasan otomatis untuk 20 soal, maka total estimasi menjadi 40 Kredit.

Catatan:
Aturan Kredit dapat berubah sesuai biaya AI provider, kompleksitas prompt, panjang materi, model AI yang digunakan, dan strategi bisnis.

## Core Flow
User login, melihat saldo Kredit, membuat assessment, lalu memilih mode pembuatan soal:

- Manual: Guru membuat assessment dan menulis soal sendiri. Mode ini tidak memakai Kredit.
- AI: Guru wajib melampirkan materi pembelajaran Word/PDF yang sudah diberikan kepada siswa. Sistem mengekstrak teks dari file, tidak menyimpan file asli, menampilkan estimasi Kredit, lalu membuat Job AI untuk generate soal berdasarkan teks materi tersebut.

Setelah assessment berisi soal, Guru melakukan review dan edit, dapat menambahkan link gambar ilustrasi eksternal pada tiap soal, lalu export assessment ke PDF.

## Learning Material Rules

Aturan materi pembelajaran:

- Materi pembelajaran wajib jika Guru memilih generate soal dengan AI.
- Materi dapat berupa file Word atau PDF.
- Sistem mengekstrak teks dari file materi.
- File asli tidak disimpan.
- Teks hasil ekstraksi dipakai sebagai konteks prompt AI.
- Teks hasil ekstraksi boleh disimpan sebagai bagian dari assessment/job snapshot jika dibutuhkan untuk audit, retry, dan regenerate.
- Jika teks tidak berhasil diekstrak, Job AI tidak boleh dibuat.
- Jika Guru membuat soal manual, materi pembelajaran bersifat opsional.

## Question Illustration Rules

Aturan gambar ilustrasi:

- Setiap soal dapat memiliki link gambar ilustrasi dari sumber luar.
- Sistem menyimpan URL gambar, bukan file gambar.
- URL harus divalidasi sebagai URL aman.
- Gambar eksternal bersifat opsional.
- Jika gambar gagal dimuat, soal tetap dapat dibaca tanpa gambar.

## Success Metrics
- Guru bisa membuat paket soal lengkap dalam waktu kurang dari 10 menit
- Minimal 80% soal hasil AI bisa digunakan setelah sedikit edit
- Pengguna berhasil export PDF tanpa bantuan teknis
- Pengguna kembali menggunakan Teachery untuk membuat assessment berikutnya
- User memahami estimasi Kredit sebelum menjalankan job
- Selisih estimasi Kredit dan Kredit aktual mudah dijelaskan
- Tidak ada pemotongan Kredit tanpa riwayat transaksi
- Persentase refund karena job gagal tetap rendah

## Product Principles
- Cepat digunakan
- Mudah diedit
- Hasil harus rapi dan siap export
- Bahasa UI sederhana dan familiar untuk guru
- AI membantu, tetapi guru tetap memegang kontrol
- Penggunaan Kredit harus transparan, adil, dan mudah dipahami
