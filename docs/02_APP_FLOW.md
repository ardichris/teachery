# App Flow

## Primary Flow

### Guru Flow

1. Guru login.
2. Sistem membaca role user.
3. Jika role adalah Guru, sistem masuk ke Dashboard Guru.
4. Sistem menampilkan saldo Kredit Guru.
5. Guru membuka menu "Assessment".
6. Sistem menampilkan daftar assessment yang pernah dibuat Guru.
7. Guru klik "Buat Assessment".
8. Sistem membuat draft assessment kosong.
9. Guru mengisi metadata assessment:
   - Nama assessment
   - Jenjang
   - Mata pelajaran
   - Kelas
10. Guru menyimpan draft assessment.
11. Guru klik "Tambah Soal".
12. Guru memilih mode pembuatan soal:
   - Manual
   - Dengan AI

### Tambah Soal Manual

1. Guru memilih mode Manual.
2. Guru memilih jenis soal:
   - Pilihan ganda
   - Uraian
3. Guru mengisi isi soal.
4. Jika pilihan ganda, Guru mengisi:
   - Pilihan jawaban
   - Kunci jawaban
5. Jika uraian, Guru mengisi:
   - Jawaban acuan atau rubrik singkat jika diperlukan
6. Guru dapat menambahkan link gambar ilustrasi eksternal pada soal.
7. Sistem memvalidasi input soal.
8. Guru klik "Simpan Soal".
9. Sistem menyimpan soal ke draft assessment.
10. Guru dapat:
    - Tambah soal manual lagi
    - Generate soal dengan AI
    - Review assessment
    - Export jika assessment sudah siap

Rules:
- Membuat soal manual tidak memakai Kredit.
- Edit manual tidak memakai Kredit.
- Link gambar ilustrasi bersifat opsional.
- Sistem menyimpan URL gambar, bukan file gambar.

### Tambah Soal Dengan AI

1. Guru memilih mode Dengan AI.
2. Sistem meminta Guru mengupload materi pembelajaran yang sudah diberikan kepada siswa.
3. Materi pembelajaran yang didukung:
   - PDF
   - Word/DOCX
4. Sistem mengekstrak teks dari file materi.
5. Sistem tidak menyimpan file asli.
6. Sistem memakai teks hasil ekstraksi sebagai konteks prompt AI.
7. Jika ekstraksi gagal atau teks kosong, sistem tidak membuat Job AI.
8. Setelah teks materi valid, Guru mengisi parameter generate:
   - Jumlah soal
   - Tipe soal
   - Tingkat kesulitan: LOTS, MOTS, HOTS
   - Instruksi tambahan
   - Opsi pembahasan jika tersedia
   - Opsi kisi-kisi jika tersedia
9. Sistem menampilkan estimasi Kredit:
   - Estimasi Kredit untuk generate soal
   - Estimasi Kredit untuk pembahasan jika dipilih
   - Estimasi Kredit untuk kisi-kisi jika memakai AI
   - Sisa Kredit setelah Job berjalan
10. Guru klik "Generate dengan AI".
11. Sistem mengecek saldo Kredit.
12. Jika Kredit cukup, sistem membuat Job AI yang terhubung ke draft assessment tersebut.
13. Sistem redirect ke halaman Jobs atau menampilkan status Job pada assessment.
14. Job menampilkan status:
    - Menunggu
    - Diproses
    - Selesai
    - Gagal
15. Jika Job selesai, sistem menyimpan hasil AI ke draft assessment yang sama.
16. Sistem mencatat Kredit aktual yang benar-benar terpakai.
17. Guru klik "Lihat & Edit".
18. Sistem membuka draft assessment yang berisi hasil Job AI:
    - Soal
    - Kunci jawaban
    - Pembahasan
    - Kisi-kisi
    - Kartu soal
19. Guru review hasil.
20. Guru dapat:
    - Edit soal
    - Hapus soal
    - Menambahkan link gambar ilustrasi eksternal pada soal
    - Buat ulang soal tertentu dengan AI
    - Perbaiki otomatis soal dengan AI
    - Tambah soal manual lagi
    - Generate soal AI tambahan
    - Simpan draft
    - Lanjut export
21. Jika Guru memilih "Buat ulang" atau "Perbaiki otomatis", sistem menampilkan estimasi Kredit tambahan.
22. Guru menyetujui penggunaan Kredit tambahan.
23. Sistem menjalankan Job AI tambahan dan mencatat Kredit yang terpakai jika berhasil.
24. Guru export assessment ke PDF:
    - Soal
    - Kartu soal
    - Kisi-kisi
    - Pembahasan
25. Sistem menampilkan status export berhasil.
26. Guru download PDF atau membuat assessment baru.

Rules:
- Mode AI wajib memakai materi pembelajaran yang berhasil diekstrak.
- File materi asli tidak disimpan.
- Job AI selalu terhubung ke assessment tertentu.
- Hasil Job AI masuk ke draft assessment yang sama.
- Kredit hanya dipotong untuk output AI yang berhasil dibuat.

### Admin Flow

1. Admin login.
2. Sistem membaca role user.
3. Jika role adalah Admin, sistem masuk ke Dashboard Admin.
4. Admin bisa membuka:
   - User Management
   - Credit Management
   - Semua Jobs
   - Riwayat Kredit semua user
5. Admin membuat atau mengubah user.
6. Admin menetapkan role user sebagai Admin atau Guru.
7. Admin menambah atau mengurangi Kredit user.
8. Sistem meminta konfirmasi untuk perubahan Kredit.
9. Sistem mencatat perubahan Kredit sebagai transaksi.
10. Admin dapat memantau penggunaan Kredit per user dan per Job.

## Alternative Flow

### Draft Assessment Belum Lengkap

1. Guru membuat assessment baru.
2. Guru belum mengisi metadata wajib.
3. Sistem menampilkan validasi pada field yang belum lengkap.
4. Guru melengkapi metadata.
5. Guru menyimpan draft kembali.

### Soal Manual Belum Lengkap

1. Guru memilih mode Manual.
2. Guru belum mengisi field soal wajib.
3. Sistem menampilkan validasi.
4. Guru melengkapi field.
5. Guru menyimpan soal kembali.

### Materi Pembelajaran Belum Dilampirkan Untuk AI

1. Guru memilih mode Dengan AI.
2. Guru belum mengupload file Word/PDF materi pembelajaran.
3. Sistem menampilkan validasi bahwa materi wajib untuk generate AI.
4. Guru mengupload file materi.
5. Sistem mengekstrak teks.
6. Estimasi Kredit baru dapat ditampilkan setelah teks materi valid.

### Extract Materi Gagal

1. Guru mengupload file Word/PDF.
2. Sistem gagal mengekstrak teks atau teks kosong.
3. Sistem menampilkan pesan "Materi tidak dapat dibaca".
4. File asli tidak disimpan.
5. Job AI tidak dibuat.
6. Guru dapat upload file lain atau membuat soal manual.

### Kredit Tidak Cukup

1. Guru klik "Generate dengan AI".
2. Sistem membandingkan saldo Kredit dengan estimasi Kredit.
3. Sistem menampilkan pesan "Kredit tidak cukup".
4. Guru bisa:
   - Mengurangi jumlah soal
   - Mematikan opsi AI tambahan seperti pembahasan otomatis
   - Menghubungi Admin untuk penambahan Kredit
   - Kembali ke Dashboard

### Generate Gagal

1. Sistem menampilkan pesan error.
2. Sistem tidak memotong Kredit untuk hasil yang gagal.
3. Jika Kredit sudah sempat direservasi, sistem mengembalikan Kredit yang tidak terpakai.
4. Input sebelumnya tetap tersimpan.
5. Guru dapat mencoba ulang dari draft assessment yang sama.

### Hasil Kurang Sesuai

1. Guru memilih soal yang ingin diperbaiki.
2. Guru klik "Buat ulang" atau edit manual.
3. Jika memakai "Buat ulang", sistem menampilkan estimasi Kredit tambahan.
4. Guru menyetujui penggunaan Kredit.
5. Sistem memperbarui soal setelah Job AI berhasil.
6. Guru review kembali.

### User Keluar Sebelum Selesai

1. Sistem menyimpan draft assessment.
2. Guru bisa melanjutkan dari Dashboard atau halaman Assessment.

### Perbedaan Estimasi dan Kredit Aktual

1. Sistem menampilkan estimasi Kredit sebelum Job dibuat.
2. Setelah Job selesai, sistem menampilkan Kredit aktual yang terpakai.
3. Jika Kredit aktual lebih kecil dari estimasi, sisa Kredit tetap berada di saldo user.
4. Jika Kredit aktual lebih besar dari estimasi, sistem harus meminta persetujuan tambahan sebelum melanjutkan proses tambahan.

### Akses Ditolak Karena Role

1. User membuka halaman yang tidak sesuai role.
2. Sistem menampilkan pesan "Akses tidak tersedia".
3. Sistem mengarahkan user ke dashboard sesuai role.

### Admin Mengubah Kredit User

1. Admin membuka Credit Management.
2. Admin memilih user.
3. Admin memilih aksi tambah atau kurangi Kredit.
4. Admin mengisi jumlah Kredit dan alasan perubahan.
5. Sistem menampilkan konfirmasi.
6. Admin menyetujui perubahan.
7. Sistem memperbarui saldo user.
8. Sistem mencatat transaksi Kredit dengan aktor Admin.

### Admin Menonaktifkan User

1. Admin membuka User Management.
2. Admin memilih user.
3. Admin klik "Nonaktifkan".
4. Sistem menampilkan konfirmasi dan dampaknya.
5. Admin menyetujui.
6. Sistem menonaktifkan akun.
7. User tersebut tidak bisa login sampai diaktifkan kembali.

## Key Screens

- Login
- Dashboard Guru
- Dashboard Admin
- Assessment List
- Buat Assessment
- Draft Assessment
- Tambah Soal Manual
- Tambah Soal Dengan AI
- Material Extraction
- Konfirmasi Penggunaan Kredit
- Jobs
- Review & Edit Assessment
- Preview Assessment
- Export PDF
- Riwayat Kredit
- Riwayat Assessment
- User Management
- Credit Management
- Access Denied

## Important States

- Empty state: belum ada assessment
- Draft state: assessment belum selesai
- Manual question state: soal dibuat tanpa AI
- Material extraction state: sistem sedang membaca materi
- Material extraction success state: materi berhasil dibaca
- Material extraction failed state: materi tidak dapat dibaca
- Loading state: AI sedang membuat soal
- Error state: generate atau export gagal
- Success state: PDF berhasil dibuat
- Insufficient credit state: Kredit tidak cukup untuk membuat Job
- Credit reserved state: Kredit sedang disiapkan untuk Job berjalan
- Credit charged state: Kredit berhasil dipotong
- Credit refunded state: Kredit dikembalikan karena Job gagal atau hanya sebagian berhasil
- Unauthorized state: user membuka halaman di luar role-nya
- User inactive state: akun user dinonaktifkan Admin

## Credit Rules

Kredit digunakan untuk semua proses yang memakai AI.

Aturan awal:
- Generate 1 soal berhasil: 1 Kredit
- Generate pembahasan 1 soal berhasil: 1 Kredit
- Buat ulang 1 soal berhasil: 1 Kredit
- Perbaiki otomatis 1 soal berhasil: 1 Kredit
- Generate kisi-kisi 1 paket berhasil: 1 Kredit
- Export PDF tanpa AI tambahan: 0 Kredit
- Membuat assessment manual: 0 Kredit
- Menambah/edit/hapus soal manual: 0 Kredit

Contoh:
- Generate 10 soal tanpa pembahasan: 10 Kredit
- Generate 10 soal dengan pembahasan: 20 Kredit
- Buat ulang 2 soal: 2 Kredit tambahan

Prinsip:
- Estimasi Kredit tampil sebelum user menjalankan Job AI
- Kredit aktual dihitung berdasarkan hasil AI yang berhasil dibuat
- Job gagal tidak boleh mengurangi Kredit user
- Semua transaksi Kredit harus masuk ke riwayat
- Setiap Job menyimpan estimasi Kredit, Kredit aktual, dan status transaksi
- Perubahan Kredit manual hanya bisa dilakukan Admin
- Setiap perubahan Kredit oleh Admin wajib mencatat alasan dan aktor Admin

## Role Rules

### Guru

Guru hanya dapat mengakses data miliknya sendiri.

Hak akses:
- Dashboard Guru
- Assessment List
- Buat Assessment
- Buat soal manual
- Upload materi pembelajaran untuk AI
- Tambah link gambar ilustrasi eksternal pada soal
- Jobs miliknya
- Review & Edit assessment miliknya
- Export PDF assessment miliknya
- Riwayat assessment miliknya
- Riwayat Kredit miliknya

### Admin

Admin dapat mengelola user dan Kredit.

Hak akses:
- Dashboard Admin
- User Management
- Credit Management
- Jobs semua user
- Riwayat Kredit semua user
- Mengubah role user
- Menonaktifkan atau mengaktifkan user

Prinsip keamanan:
- Guru tidak boleh mengakses halaman Admin
- Admin action sensitif harus memakai konfirmasi
- Semua perubahan Kredit oleh Admin harus tercatat
- Riwayat transaksi Kredit tidak boleh diedit manual

## Output Assessment

- Soal ujian
- Kartu soal
- Kisi-kisi soal
- Pembahasan soal
