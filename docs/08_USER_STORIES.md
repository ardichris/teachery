# User Stories

## Tujuan

Dokumen ini berisi user stories Teachery untuk MVP berdasarkan product vision, persona, app flow, business rules, page spec, dan component spec.

Format:

```text
Sebagai [role], saya ingin [tujuan], sehingga [manfaat].
```

Priority:
- P0: Wajib untuk MVP
- P1: Penting setelah core flow stabil
- P2: Nice to have atau future improvement

## Epic 1: Authentication & Role Access

### US-001 Login sesuai role

Priority: P0

Story:
Sebagai user, saya ingin login ke Teachery, sehingga saya bisa masuk ke dashboard sesuai role saya.

Acceptance Criteria:
- User bisa login menggunakan email dan password
- Sistem membaca role setelah login berhasil
- Guru diarahkan ke Dashboard Guru
- Admin diarahkan ke Dashboard Admin
- User nonaktif tidak bisa login
- Error login ditampilkan dengan pesan yang mudah dipahami

### US-002 Akses dibatasi berdasarkan role

Priority: P0

Story:
Sebagai user, saya ingin hanya melihat menu yang sesuai role saya, sehingga aplikasi tidak membingungkan dan data tetap aman.

Acceptance Criteria:
- Guru tidak melihat menu User Management dan Credit Management
- Admin melihat menu Dashboard Admin, User Management, Credit Management, Jobs, Riwayat Kredit, dan Pengaturan
- Jika Guru membuka URL halaman Admin, sistem menampilkan Access Denied atau redirect ke Dashboard Guru
- Backend tetap memvalidasi role untuk endpoint sensitif

### US-003 Melihat profil akun

Priority: P1

Story:
Sebagai user, saya ingin melihat informasi akun saya, sehingga saya tahu email, role, dan saldo Kredit saya.

Acceptance Criteria:
- User bisa melihat nama, email, role, dan saldo Kredit
- User tidak bisa mengubah role sendiri
- User bisa membuka Riwayat Kredit dari halaman pengaturan

## Epic 2: Dashboard

### US-004 Dashboard Guru

Priority: P0

Story:
Sebagai Guru, saya ingin melihat dashboard pribadi, sehingga saya bisa cepat membuat soal atau melanjutkan pekerjaan terakhir.

Acceptance Criteria:
- Dashboard menampilkan saldo Kredit Guru
- Dashboard menampilkan tombol "Buat Assessment"
- Dashboard menampilkan Jobs terbaru milik Guru
- Dashboard menampilkan draft atau assessment terakhir milik Guru
- Jika belum ada assessment, sistem menampilkan empty state dengan CTA "Buat Assessment"

### US-005 Dashboard Admin

Priority: P0

Story:
Sebagai Admin, saya ingin melihat ringkasan operasional, sehingga saya bisa memantau user, Kredit, dan Jobs.

Acceptance Criteria:
- Dashboard Admin menampilkan jumlah user aktif
- Dashboard Admin menampilkan total Guru
- Dashboard Admin menampilkan ringkasan Kredit terpakai
- Dashboard Admin menampilkan Jobs terbaru semua user
- Dashboard Admin menyediakan tombol "Kelola User" dan "Kelola Kredit"

## Epic 3: User Management

### US-006 Admin membuat user Guru

Priority: P0

Story:
Sebagai Admin, saya ingin membuat akun Guru, sehingga guru dapat menggunakan Teachery.

Acceptance Criteria:
- Admin dapat membuka User Management
- Admin dapat mengisi nama, email, dan role
- Email wajib unik
- Role default disarankan Guru
- Setelah user dibuat, user muncul di daftar user

### US-007 Admin mengubah data user

Priority: P1

Story:
Sebagai Admin, saya ingin mengubah data user, sehingga informasi akun tetap akurat.

Acceptance Criteria:
- Admin dapat mengubah nama user
- Admin dapat melihat email user
- Perubahan tersimpan dengan feedback sukses
- Error validasi ditampilkan dekat field terkait

### US-008 Admin mengubah role user

Priority: P0

Story:
Sebagai Admin, saya ingin mengubah role user, sehingga saya dapat menentukan siapa yang menjadi Admin atau Guru.

Acceptance Criteria:
- Admin dapat memilih role Admin atau Guru
- Sistem menampilkan konfirmasi sebelum role diubah
- Sistem tidak mengizinkan kondisi tanpa minimal satu Admin aktif
- Perubahan role tercatat di audit log

### US-009 Admin menonaktifkan user

Priority: P0

Story:
Sebagai Admin, saya ingin menonaktifkan user, sehingga akun yang tidak digunakan tidak bisa login.

Acceptance Criteria:
- Admin dapat menonaktifkan user aktif
- Sistem menampilkan konfirmasi dan dampaknya
- User nonaktif tidak bisa login
- Menonaktifkan user tidak menghapus assessment, Jobs, atau transaksi Kredit
- Sistem tidak mengizinkan Admin terakhir yang aktif dinonaktifkan

### US-010 Admin mengaktifkan kembali user

Priority: P1

Story:
Sebagai Admin, saya ingin mengaktifkan kembali user, sehingga user dapat memakai Teachery lagi.

Acceptance Criteria:
- Admin dapat mengaktifkan user nonaktif
- Saldo Kredit user tidak berubah karena aktivasi ulang
- User aktif dapat login kembali

## Epic 4: Credit Management

### US-011 Guru melihat saldo Kredit

Priority: P0

Story:
Sebagai Guru, saya ingin melihat saldo Kredit saya, sehingga saya tahu apakah bisa menjalankan proses AI.

Acceptance Criteria:
- Saldo Kredit tampil di Dashboard Guru
- Saldo Kredit tampil di halaman Buat Assessment
- Jika saldo rendah, sistem menampilkan warning ringan
- Guru tidak dapat mengubah saldo Kredit sendiri

### US-012 Sistem menghitung estimasi Kredit

Priority: P0

Story:
Sebagai Guru, saya ingin melihat estimasi Kredit sebelum generate, sehingga saya tahu biaya AI sebelum Job dibuat.

Acceptance Criteria:
- Estimasi Kredit tampil sebelum tombol generate dijalankan
- Estimasi berubah saat jumlah soal atau opsi AI berubah
- Estimasi menampilkan breakdown biaya
- Estimasi menampilkan sisa Kredit setelah Job berjalan
- Jika estimasi gagal dihitung, Job tidak boleh dibuat

### US-013 Kredit tidak cukup

Priority: P0

Story:
Sebagai Guru, saya ingin mendapat informasi saat Kredit tidak cukup, sehingga saya tahu cara menyesuaikan permintaan.

Acceptance Criteria:
- Sistem membandingkan saldo Kredit dengan estimasi Kredit
- Jika Kredit kurang, tombol generate disabled atau menampilkan Insufficient Credit Modal
- Pesan menampilkan saldo saat ini dan Kredit yang dibutuhkan
- Guru dapat mengurangi jumlah soal atau mematikan opsi AI tambahan
- Job tidak dibuat jika Kredit tidak cukup

### US-014 Admin menambah Kredit user

Priority: P0

Story:
Sebagai Admin, saya ingin menambah Kredit user, sehingga Guru dapat menggunakan fitur AI.

Acceptance Criteria:
- Admin memilih user target
- Admin mengisi jumlah Kredit
- Admin wajib mengisi alasan perubahan
- Sistem menampilkan preview saldo akhir
- Setelah disimpan, saldo user bertambah
- Transaksi tercatat dengan aktor Admin dan alasan

### US-015 Admin mengurangi Kredit user

Priority: P0

Story:
Sebagai Admin, saya ingin mengurangi Kredit user, sehingga saya dapat mengoreksi atau mengontrol alokasi Kredit.

Acceptance Criteria:
- Admin memilih user target
- Admin mengisi jumlah Kredit
- Admin wajib mengisi alasan perubahan
- Sistem menampilkan konfirmasi sebelum pengurangan
- Saldo akhir tidak boleh negatif pada MVP
- Transaksi tercatat dengan aktor Admin dan alasan

### US-016 Melihat riwayat Kredit

Priority: P0

Story:
Sebagai user, saya ingin melihat riwayat Kredit, sehingga saya memahami kenapa saldo Kredit berubah.

Acceptance Criteria:
- Guru hanya melihat transaksi miliknya
- Admin dapat melihat transaksi semua user
- Transaksi menampilkan tanggal, aktivitas, jumlah Kredit, status, dan Job terkait jika ada
- Transaksi manual Admin menampilkan aktor dan alasan
- Kredit keluar tampil sebagai negatif
- Kredit masuk atau refund tampil sebagai positif

## Epic 5: Buat Assessment & Jobs AI

### US-017 Guru mengisi form Buat Assessment

Priority: P0

Story:
Sebagai Guru, saya ingin mengisi metadata assessment dan kebutuhan soal, sehingga saya bisa membuat soal manual atau meminta AI membuat soal sesuai materi.

Acceptance Criteria:
- Guru dapat mengisi mata pelajaran, kelas, mode pembuatan, materi untuk mode AI, jumlah soal, jenis soal, tingkat kesulitan, bahasa, dan instruksi tambahan
- Field wajib divalidasi
- Error validasi tampil dekat field terkait
- Input tetap tersimpan jika proses gagal

### US-018 Guru membuat Job AI untuk menambahkan soal

Priority: P0

Story:
Sebagai Guru, saya ingin membuat Job AI dari assessment draft dan materi pembelajaran, sehingga saya bisa mendapatkan soal lebih cepat tanpa keluar dari konteks materi yang sudah diajarkan.

Acceptance Criteria:
- Sistem menampilkan estimasi Kredit sebelum Job dibuat
- Sistem mengecek saldo Kredit
- Jika Kredit cukup, sistem membuat Job
- Setelah Job dibuat, Guru diarahkan ke halaman Jobs
- Job menyimpan estimated credit, owner user, input ringkas, dan status

### US-019 Guru melihat daftar Jobs

Priority: P0

Story:
Sebagai Guru, saya ingin melihat daftar Jobs saya, sehingga saya tahu proses AI sudah selesai atau belum.

Acceptance Criteria:
- Guru hanya melihat Jobs miliknya
- Jobs menampilkan status Menunggu, Diproses, Selesai, Gagal, atau Gagal Sebagian
- Job selesai menampilkan aksi "Lihat & Edit"
- Job gagal menampilkan alasan aman dan aksi "Coba Lagi"
- Job menampilkan estimasi Kredit dan Kredit aktual jika sudah final

### US-020 Admin melihat semua Jobs

Priority: P1

Story:
Sebagai Admin, saya ingin melihat semua Jobs, sehingga saya dapat memantau penggunaan AI.

Acceptance Criteria:
- Admin dapat melihat Jobs semua user
- Setiap Job menampilkan owner user
- Admin dapat filter berdasarkan status
- Admin dapat membuka detail Job untuk monitoring
- Admin tidak menghapus audit trail Job

### US-021 Job selesai dan Kredit dipotong

Priority: P0

Story:
Sebagai Guru, saya ingin Kredit dipotong hanya untuk hasil AI yang berhasil, sehingga penggunaan Kredit terasa adil.

Acceptance Criteria:
- Kredit aktual dihitung setelah Job selesai
- Kredit hanya dipotong untuk output AI yang berhasil dibuat
- Sistem membuat transaksi AI charge
- Riwayat Kredit menampilkan transaksi tersebut
- Job menampilkan Kredit aktual

### US-022 Job gagal dan Kredit tidak dipotong

Priority: P0

Story:
Sebagai Guru, saya ingin Kredit tidak berkurang jika Job gagal, sehingga saya tidak rugi karena error sistem.

Acceptance Criteria:
- Job gagal tidak memotong Kredit
- Jika ada Kredit yang direservasi, sistem mengembalikannya
- Sistem menampilkan status gagal dan pesan aman
- Guru dapat mencoba ulang jika input valid dan Kredit cukup

### US-023 Job gagal sebagian dan Kredit direfund

Priority: P1

Story:
Sebagai Guru, saya ingin Kredit yang tidak terpakai dikembalikan jika Job hanya berhasil sebagian, sehingga saldo saya tetap adil.

Acceptance Criteria:
- Sistem menghitung output yang berhasil
- Sistem memotong Kredit hanya untuk output berhasil
- Kredit tidak terpakai dikembalikan sebagai refund
- Refund tercatat di Riwayat Kredit
- Job menampilkan status Gagal Sebagian

## Epic 6: Review & Edit assessment

### US-024 Guru melihat hasil assessment

Priority: P0

Story:
Sebagai Guru, saya ingin melihat hasil assessment, sehingga saya bisa memeriksa kualitas soal sebelum digunakan.

Acceptance Criteria:
- Guru dapat membuka hasil dari Job selesai
- Hasil menampilkan soal, jawaban benar, pembahasan, kisi-kisi, dan kartu soal jika tersedia
- assessment masuk status Perlu Review
- Guru hanya dapat membuka assessment miliknya

### US-025 Guru mengedit soal manual

Priority: P0

Story:
Sebagai Guru, saya ingin mengedit soal manual, sehingga saya bisa memperbaiki hasil AI sesuai kebutuhan.

Acceptance Criteria:
- Guru dapat mengedit pertanyaan
- Guru dapat mengedit pilihan jawaban
- Guru dapat mengubah jawaban benar
- Guru dapat mengedit pembahasan dan kisi-kisi jika tersedia
- Edit manual tidak memotong Kredit
- Perubahan tersimpan dengan feedback sukses

### US-026 Guru menghapus soal

Priority: P1

Story:
Sebagai Guru, saya ingin menghapus soal yang tidak diperlukan, sehingga assessment final lebih rapi.

Acceptance Criteria:
- Guru dapat menghapus soal dari assessment miliknya
- Sistem menampilkan konfirmasi hapus
- Hapus soal tidak mengembalikan Kredit
- Nomor soal dapat disesuaikan ulang jika diperlukan

### US-027 Guru membuat ulang soal dengan AI

Priority: P0

Story:
Sebagai Guru, saya ingin membuat ulang soal tertentu dengan AI, sehingga saya bisa memperbaiki soal yang kurang sesuai.

Acceptance Criteria:
- Sistem menampilkan estimasi Kredit tambahan
- Guru menyetujui penggunaan Kredit
- Sistem membuat Job AI baru untuk soal terkait
- Jika berhasil, soal diperbarui
- Jika gagal, Kredit tidak dipotong

### US-028 Guru memperbaiki otomatis soal dengan AI

Priority: P1

Story:
Sebagai Guru, saya ingin memperbaiki otomatis soal dengan AI, sehingga saya bisa menyempurnakan soal lebih cepat.

Acceptance Criteria:
- Sistem menampilkan estimasi Kredit tambahan
- Guru menyetujui penggunaan Kredit
- Sistem menjalankan Job AI tambahan
- Hasil perbaikan dapat direview sebelum disimpan final
- Kredit hanya dipotong jika hasil berhasil dibuat

## Epic 7: Preview & Export PDF

### US-029 Guru preview assessment

Priority: P1

Story:
Sebagai Guru, saya ingin preview assessment, sehingga saya bisa mengecek isi sebelum export PDF.

Acceptance Criteria:
- Guru dapat preview soal ujian, kartu soal, kisi-kisi, dan pembahasan
- Preview mengikuti data hasil edit terbaru
- Preview tidak memotong Kredit jika tidak memanggil AI tambahan
- Jika preview membutuhkan AI tambahan, sistem menampilkan estimasi Kredit lebih dulu

### US-030 Guru export PDF

Priority: P0

Story:
Sebagai Guru, saya ingin export assessment ke PDF, sehingga assessment siap dicetak atau dibagikan.

Acceptance Criteria:
- Guru dapat memilih minimal satu output
- Output tersedia: soal ujian, kartu soal, kisi-kisi, pembahasan
- Export PDF tanpa AI tambahan tidak memakai Kredit
- Setelah berhasil, sistem menampilkan link download
- Export gagal tidak memotong Kredit

### US-031 Guru melihat riwayat assessment

Priority: P0

Story:
Sebagai Guru, saya ingin melihat riwayat assessment, sehingga saya bisa membuka kembali assessment lama.

Acceptance Criteria:
- Guru hanya melihat assessment miliknya
- assessment menampilkan judul, mata pelajaran, kelas, status, dan terakhir diubah
- Guru dapat membuka assessment
- Guru dapat melanjutkan draft

## Epic 8: Audit, Security & Error Handling

### US-032 Sistem mencatat audit perubahan penting

Priority: P0

Story:
Sebagai Admin, saya ingin perubahan penting tercatat, sehingga aktivitas user dan Kredit bisa diaudit.

Acceptance Criteria:
- Sistem mencatat user dibuat
- Sistem mencatat role diubah
- Sistem mencatat user dinonaktifkan atau diaktifkan
- Sistem mencatat Kredit ditambah atau dikurangi Admin
- Sistem mencatat Job dibuat, selesai, dan gagal
- Audit log tidak menampilkan credential atau API key

### US-033 Sistem menjaga ownership data Guru

Priority: P0

Story:
Sebagai Guru, saya ingin data saya aman, sehingga guru lain tidak bisa melihat assessment, Jobs, atau Kredit saya.

Acceptance Criteria:
- Guru hanya bisa mengakses assessment miliknya
- Guru hanya bisa mengakses Jobs miliknya
- Guru hanya bisa mengakses Riwayat Kredit miliknya
- Backend menolak akses lintas owner
- Error akses memakai pesan "Akses tidak tersedia"

### US-034 Sistem menangani error AI dengan aman

Priority: P0

Story:
Sebagai user, saya ingin mendapat pesan yang jelas saat AI gagal, sehingga saya tahu langkah berikutnya.

Acceptance Criteria:
- Error AI tidak menampilkan detail teknis provider mentah
- Input user tetap tersimpan
- Kredit tidak dipotong untuk Job gagal
- User dapat mencoba ulang jika input valid dan Kredit cukup
- Error message menjelaskan tindakan berikutnya

## MVP Release Checklist

MVP user stories dianggap siap jika:
- Guru bisa login, melihat Kredit, membuat assessment manual atau berbantuan AI, review, edit, dan export PDF
- Admin bisa login, mengelola user, mengelola Kredit, dan melihat monitoring Jobs
- Semua proses AI memakai Job
- Semua proses AI menampilkan estimasi Kredit
- Kredit hanya dipotong untuk output berhasil
- Refund tercatat saat Job gagal atau gagal sebagian
- Guru tidak bisa mengakses data user lain
- Admin action sensitif memakai konfirmasi
- Riwayat Kredit tidak bisa diedit manual
## Assessment Manager Update Stories

### US-AM-001 Guru membuat assessment manual

Sebagai Guru, saya ingin membuat assessment secara manual, sehingga saya dapat menulis soal sendiri tanpa memakai Kredit.

Acceptance criteria:

- Guru dapat memilih mode Manual saat membuat assessment.
- Assessment manual dibuat sebagai draft.
- Guru dapat menambahkan soal manual.
- Tidak ada estimasi atau pemotongan Kredit.

### US-AM-002 Guru generate soal berdasarkan materi pembelajaran

Sebagai Guru, saya ingin mengupload materi pembelajaran Word/PDF sebelum generate soal dengan AI, sehingga soal yang dibuat sesuai dengan materi yang sudah diberikan kepada siswa.

Acceptance criteria:

- Mode AI mewajibkan upload materi Word/PDF.
- Sistem mengekstrak teks dari file.
- File asli tidak disimpan.
- Job AI hanya dapat dibuat jika teks berhasil diekstrak.
- Prompt AI memakai teks materi sebagai konteks.

### US-AM-003 Guru menambahkan gambar ilustrasi eksternal pada soal

Sebagai Guru, saya ingin menambahkan link gambar ilustrasi pada soal, sehingga soal dapat memiliki konteks visual tanpa harus upload file gambar.

Acceptance criteria:

- Setiap soal dapat memiliki `image_url` opsional.
- URL divalidasi.
- Sistem menyimpan URL, bukan file gambar.
- Jika gambar gagal dimuat, teks soal tetap tampil.
