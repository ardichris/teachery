# Acceptance Criteria

## Tujuan

Dokumen ini menjadi checklist kelulusan MVP Teachery. Acceptance criteria di sini merangkum kebutuhan dari product vision, app flow, business rules, page spec, dan user stories.

MVP dianggap layak dirilis jika:
- Guru dapat membuat soal dengan AI menggunakan sistem Kredit
- Admin dapat mengelola user dan Kredit
- Semua proses AI berjalan sebagai Job
- Kredit transparan, tercatat, dan tidak terpotong saat proses gagal
- Role dan ownership data aman
- assessment dapat direview, diedit, dan diexport ke PDF

## 1. Authentication & Role Access

### Login

Acceptance Criteria:
- User dapat login menggunakan email dan password
- Sistem membaca role user setelah login berhasil
- Guru diarahkan ke Dashboard Guru
- Admin diarahkan ke Dashboard Admin
- User nonaktif tidak dapat login
- Error login ditampilkan dengan pesan yang mudah dipahami
- Session aktif mengarahkan user ke dashboard sesuai role

### Role-Based Navigation

Acceptance Criteria:
- Guru hanya melihat menu Dashboard, Buat Assessment, Jobs, Draft, Riwayat assessment, Riwayat Kredit, dan Pengaturan
- Admin hanya melihat menu Dashboard Admin, User Management, Credit Management, Jobs, Riwayat Kredit, dan Pengaturan
- Menu Admin tidak tampil untuk Guru
- Halaman Guru tidak menampilkan data user lain
- Jika user membuka halaman di luar role-nya, sistem menampilkan Access Denied atau redirect ke dashboard sesuai role
- Backend memvalidasi role untuk semua endpoint sensitif

## 2. User Management

### Create User

Acceptance Criteria:
- Hanya Admin yang dapat membuat user
- Admin dapat mengisi nama, email, dan role
- Email user wajib unik
- Role wajib dipilih
- Role default disarankan Guru
- User baru muncul di daftar user setelah berhasil dibuat
- Error validasi ditampilkan dekat field terkait

### Update User

Acceptance Criteria:
- Hanya Admin yang dapat mengubah data user lain
- Admin dapat mengubah nama user
- Admin dapat mengubah role user
- Perubahan role memakai konfirmasi
- Sistem tidak mengizinkan kondisi tanpa minimal satu Admin aktif
- User tidak dapat mengubah role dirinya sendiri

### Activate / Deactivate User

Acceptance Criteria:
- Admin dapat menonaktifkan user aktif
- Admin dapat mengaktifkan kembali user nonaktif
- Menonaktifkan user memakai konfirmasi
- User nonaktif tidak dapat login
- Menonaktifkan user tidak menghapus assessment, Jobs, atau transaksi Kredit
- Sistem tidak mengizinkan Admin terakhir yang aktif dinonaktifkan

## 3. Credit System

### Credit Balance

Acceptance Criteria:
- Setiap user memiliki saldo Kredit
- Guru hanya dapat melihat saldo Kredit miliknya
- Admin dapat melihat saldo Kredit semua user
- Saldo Kredit tampil di Dashboard Guru
- Saldo Kredit tampil di halaman Buat Assessment
- Saldo Kredit tidak boleh negatif pada MVP
- Saldo Kredit hanya berubah melalui transaksi Kredit

### Credit Estimate

Acceptance Criteria:
- Estimasi Kredit tampil sebelum semua proses AI berjalan
- Estimasi Kredit menampilkan total Kredit
- Estimasi Kredit menampilkan breakdown penggunaan
- Estimasi berubah saat jumlah soal atau opsi AI berubah
- Sistem menampilkan sisa Kredit setelah Job berjalan
- Jika estimasi gagal dihitung, proses AI tidak boleh berjalan

### Insufficient Credit

Acceptance Criteria:
- Sistem membandingkan saldo Kredit dengan estimasi Kredit sebelum membuat Job
- Jika Kredit tidak cukup, Job tidak dibuat
- Sistem menampilkan saldo saat ini dan Kredit yang dibutuhkan
- User dapat kembali mengubah pengaturan generate
- Primary action AI disabled atau menampilkan Insufficient Credit Modal

### Credit Charging

Acceptance Criteria:
- Kredit hanya dipotong untuk output AI yang berhasil dibuat
- Kredit aktual dihitung setelah Job selesai
- Kredit aktual tidak boleh lebih besar dari estimasi tanpa persetujuan tambahan
- Setiap pemotongan Kredit menghasilkan transaksi Kredit
- Transaksi AI charge tampil di Riwayat Kredit

### Credit Refund

Acceptance Criteria:
- Job gagal total tidak mengurangi Kredit
- Job gagal sebagian hanya memotong Kredit untuk output yang berhasil
- Kredit tidak terpakai dikembalikan sebagai refund
- Refund tercatat di Riwayat Kredit
- Refund terhubung ke Job terkait

### Manual Credit Adjustment

Acceptance Criteria:
- Hanya Admin yang dapat menambah atau mengurangi Kredit user
- Admin wajib memilih user target
- Admin wajib mengisi jumlah Kredit
- Admin wajib mengisi alasan perubahan
- Sistem menampilkan preview saldo akhir
- Pengurangan Kredit memakai konfirmasi
- Saldo akhir tidak boleh negatif pada MVP
- Transaksi manual menyimpan aktor Admin dan alasan

## 4. Credit Transaction Ledger

Acceptance Criteria:
- Semua perubahan Kredit tercatat sebagai transaksi
- Transaksi menyimpan user target, amount, type, status, timestamp, dan actor
- Transaksi AI menyimpan related Job jika ada
- Transaksi manual Admin menyimpan reason
- Kredit keluar tampil sebagai angka negatif
- Kredit masuk dan refund tampil sebagai angka positif
- Guru hanya melihat transaksi miliknya
- Admin dapat melihat transaksi semua user
- Transaksi success tidak dapat diedit manual
- Jika perlu koreksi, sistem membuat transaksi penyesuaian baru

## 5. Jobs AI

### Create Job

Acceptance Criteria:
- Semua proses AI dibuat sebagai Job
- Job hanya dibuat jika estimasi Kredit valid
- Job hanya dibuat jika saldo Kredit cukup
- Job menyimpan owner user
- Job menyimpan input ringkas
- Job menyimpan estimated credit
- Job memiliki status awal Menunggu atau Diproses

### Job Status

Acceptance Criteria:
- Job memiliki status Menunggu, Diproses, Selesai, Gagal, atau Gagal Sebagian
- Job selesai jika semua output yang diminta berhasil dibuat
- Job gagal jika tidak ada output berhasil dibuat
- Job gagal sebagian jika sebagian output berhasil dibuat
- Job final tidak kembali ke status proses
- Retry membuat Job baru

### Job Visibility

Acceptance Criteria:
- Guru hanya melihat Jobs miliknya
- Admin dapat melihat semua Jobs
- Admin melihat owner user pada daftar Jobs
- Job detail menampilkan estimasi Kredit dan Kredit aktual
- Job gagal menampilkan error reason yang aman untuk user

### Job Failure & Retry

Acceptance Criteria:
- Job gagal tidak memotong Kredit
- Job gagal sebagian memotong Kredit hanya untuk output berhasil
- Retry menghitung estimasi Kredit baru
- Retry membutuhkan saldo Kredit cukup
- Job lama tetap disimpan untuk audit

## 6. Buat Assessment

Acceptance Criteria:
- Guru dapat membuka halaman Buat Assessment
- Guru dapat mengisi mata pelajaran, kelas, Materi pembelajaran Word/PDF untuk mode AI, jumlah soal, jenis soal, tingkat kesulitan, bahasa, dan instruksi tambahan
- Field wajib divalidasi
- Error validasi tampil dekat field terkait
- Input user tetap tersimpan jika proses gagal
- Estimasi Kredit tampil sebelum generate
- Tombol generate tidak dapat diklik ganda saat proses berjalan
- Setelah Job dibuat, Guru diarahkan ke halaman Jobs

## 7. Review & Edit assessment

Acceptance Criteria:
- Guru dapat membuka hasil dari Job selesai
- assessment hasil AI masuk status Perlu Review
- Hasil menampilkan soal, jawaban benar, pembahasan, kisi-kisi, dan kartu soal jika tersedia
- Guru hanya dapat membuka assessment miliknya
- Guru dapat mengedit soal secara manual
- Edit manual tidak memotong Kredit
- Guru dapat menyimpan perubahan
- Simpan berhasil menampilkan feedback sukses
- Error simpan tidak menghilangkan input user

## 8. AI Actions in Review

### Buat Ulang Soal

Acceptance Criteria:
- Guru dapat memilih soal untuk dibuat ulang
- Sistem menampilkan estimasi Kredit tambahan
- Guru menyetujui penggunaan Kredit sebelum proses berjalan
- Sistem membuat Job AI baru untuk soal terkait
- Jika berhasil, soal diperbarui
- Jika gagal, Kredit tidak dipotong

### Perbaiki Otomatis

Acceptance Criteria:
- Guru dapat menjalankan perbaiki otomatis pada soal miliknya
- Sistem menampilkan estimasi Kredit tambahan
- Guru menyetujui penggunaan Kredit sebelum proses berjalan
- Hasil perbaikan dapat direview
- Kredit hanya dipotong jika hasil berhasil dibuat

### Hapus Soal

Acceptance Criteria:
- Guru dapat menghapus soal dari assessment miliknya
- Sistem menampilkan konfirmasi hapus
- Hapus soal tidak mengembalikan Kredit
- assessment tetap valid setelah soal dihapus

## 9. Preview & Export PDF

### Preview

Acceptance Criteria:
- Guru dapat preview soal ujian, kartu soal, kisi-kisi, dan pembahasan
- Preview mengikuti data hasil edit terbaru
- Preview tidak memotong Kredit jika tidak memanggil AI tambahan
- Jika preview membutuhkan AI tambahan, sistem menampilkan estimasi Kredit terlebih dahulu

### Export PDF

Acceptance Criteria:
- Guru dapat memilih output yang ingin diexport
- Minimal satu output harus dipilih
- Output tersedia: soal ujian, kartu soal, kisi-kisi, dan pembahasan
- Export PDF tanpa AI tambahan tidak memakai Kredit
- Export gagal tidak memotong Kredit
- Export berhasil menampilkan link download
- File PDF hanya dapat diakses owner atau Admin jika monitoring diaktifkan

## 10. Assessment History

Acceptance Criteria:
- Guru dapat melihat riwayat assessment miliknya
- Riwayat assessment menampilkan judul, mata pelajaran, kelas, status, dan terakhir diubah
- Guru dapat membuka assessment lama
- Guru dapat melanjutkan draft
- Guru tidak dapat melihat assessment milik user lain
- Admin dapat melihat assessment semua user hanya jika fitur monitoring assessment diaktifkan

## 11. Admin Dashboard & Monitoring

Acceptance Criteria:
- Admin dapat melihat Dashboard Admin
- Dashboard Admin menampilkan jumlah user aktif
- Dashboard Admin menampilkan total Guru
- Dashboard Admin menampilkan ringkasan Kredit terpakai
- Dashboard Admin menampilkan Jobs terbaru semua user
- Admin dapat membuka User Management dari dashboard
- Admin dapat membuka Credit Management dari dashboard
- Admin dapat melihat Jobs gagal untuk investigasi

## 12. Audit & Security

### Audit

Acceptance Criteria:
- Sistem mencatat user dibuat
- Sistem mencatat user diubah
- Sistem mencatat role diubah
- Sistem mencatat user dinonaktifkan atau diaktifkan
- Sistem mencatat Kredit ditambah Admin
- Sistem mencatat Kredit dikurangi Admin
- Sistem mencatat Job AI dibuat
- Sistem mencatat Job AI selesai
- Sistem mencatat Job AI gagal
- Sistem mencatat Kredit dipotong
- Sistem mencatat Kredit direfund
- Audit log tidak menampilkan credential atau API key
- Audit log tidak dapat diedit manual

### Security

Acceptance Criteria:
- Password tidak disimpan dalam bentuk plain text
- Backend memvalidasi role untuk endpoint Admin
- Backend memvalidasi ownership untuk resource Guru
- Guru tidak dapat mengakses data user lain melalui URL atau API
- User nonaktif tidak dapat memakai session untuk akses aplikasi
- API key AI provider tidak muncul di frontend, response user, atau logs publik
- Upload materi divalidasi sebelum diproses

## 13. UX States

Acceptance Criteria:
- Setiap halaman utama memiliki loading state
- Empty state tersedia untuk belum ada assessment, belum ada Job, dan belum ada transaksi Kredit
- Error state menjelaskan masalah dan tindakan berikutnya
- Insufficient credit state menampilkan saldo dan Kredit yang dibutuhkan
- Credit refund state menampilkan jumlah Kredit yang dikembalikan
- Unauthorized state menampilkan pesan "Akses tidak tersedia"
- Aksi destructive memakai confirmation modal
- Tombol loading mencegah klik ganda

## 14. Accessibility & Responsive

Acceptance Criteria:
- Semua form field memiliki label
- Error form tidak hanya memakai warna
- Tombol icon-only memiliki accessible label
- Focus indicator terlihat
- Komponen dapat digunakan dengan keyboard untuk alur utama
- Mobile layout tidak membutuhkan horizontal scroll
- Teks panjang tidak merusak layout
- Area klik utama minimal nyaman digunakan pada mobile

## 15. MVP Exit Criteria

MVP dianggap selesai jika seluruh kriteria berikut terpenuhi:

- Guru bisa login, melihat saldo Kredit, membuat assessment manual, membuat Job AI untuk menambahkan soal, review hasil, edit manual, dan export PDF
- Admin bisa login, membuat user, mengubah role, menonaktifkan user, menambah Kredit, dan mengurangi Kredit
- Guru tidak bisa mengakses data user lain
- Guru tidak bisa membuka halaman Admin
- Semua proses AI memiliki estimasi Kredit sebelum berjalan
- Job tidak dibuat saat Kredit tidak cukup
- Kredit hanya dipotong untuk output AI yang berhasil
- Job gagal tidak mengurangi Kredit
- Refund tercatat saat Job gagal atau gagal sebagian
- Semua perubahan Kredit manual memiliki aktor Admin dan alasan
- Riwayat Kredit tidak dapat diedit manual
- Export PDF tanpa AI tambahan tidak memakai Kredit
- Backend memvalidasi role, ownership, saldo Kredit, dan status user
## Assessment Manager Update Acceptance Criteria

MVP harus memenuhi kriteria tambahan berikut:

- Guru dapat membuat assessment manual tanpa AI dan tanpa Kredit.
- Guru dapat memilih mode pembuatan assessment: Manual atau Dengan AI.
- Mode AI mewajibkan materi pembelajaran Word/PDF.
- Sistem mengekstrak teks dari materi pembelajaran.
- File materi asli tidak disimpan.
- Jika ekstraksi materi gagal atau teks kosong, Job AI tidak dibuat.
- Estimasi Kredit hanya tampil untuk mode AI.
- Prompt AI memakai teks materi sebagai acuan generate soal.
- Setiap soal dapat menyimpan `image_url` opsional.
- Sistem menyimpan link gambar eksternal, bukan file gambar.
- URL gambar yang tidak valid ditolak.
- Export assessment tetap berjalan walaupun gambar eksternal gagal dimuat, selama teks soal tersedia.
