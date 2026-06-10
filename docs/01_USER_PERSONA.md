# User Persona

## Persona A: Beni, Guru

### Profil
Nama: Beni  
Umur: 35 tahun  
Profesi: Guru SMP  
Role Aplikasi: Guru  
Mata Pelajaran: Matematika  
Pengalaman Mengajar: 15 tahun  

### Konteks Kerja
Beni mengajar beberapa kelas dengan jumlah siswa yang cukup banyak. Ia sering harus membuat soal ulangan, kisi-kisi, kartu soal, dan pembahasan dalam waktu terbatas, terutama menjelang ujian sekolah atau penilaian harian.

### Pain Points
- Membuat soal dengan variasi tingkat kesulitan membutuhkan waktu lama
- Menyusun kisi-kisi dan pembahasan terasa repetitif
- Format assessment harus rapi agar siap dicetak atau dibagikan
- Sulit menjaga kualitas soal ketika sedang terburu-buru
- Harus sering menyesuaikan soal dengan materi dan kurikulum
- Khawatir memakai fitur AI tanpa tahu berapa biaya atau Kredit yang akan terpakai

### Goals
- Membuat paket soal lengkap dengan cepat
- Mendapatkan soal yang sesuai materi dan tingkat kesulitan
- Tetap bisa mengedit hasil AI sebelum digunakan
- Menghasilkan assessment PDF yang rapi
- Mengurangi waktu administrasi mengajar
- Mengontrol penggunaan Kredit agar tidak habis tanpa disadari

### Current Behavior
Saat ini Beni biasanya membuat soal secara manual menggunakan Word, mengambil referensi dari buku pelajaran, soal tahun sebelumnya, atau internet. Setelah soal selesai, ia masih harus menyusun kisi-kisi dan pembahasan secara terpisah.

### Needs
- Form Buat Assessment yang sederhana
- Pilihan jelas antara membuat soal manual atau memakai AI
- Upload materi Word/PDF untuk mode AI dengan jaminan file asli tidak disimpan
- Hasil soal yang mudah diedit
- Pembahasan otomatis untuk setiap soal
- Kisi-kisi otomatis sesuai soal
- Export PDF yang rapi dan siap pakai
- Field link gambar ilustrasi eksternal pada soal jika diperlukan
- Informasi saldo Kredit yang mudah ditemukan
- Estimasi Kredit sebelum generate dimulai
- Riwayat penggunaan Kredit per job
- Pesan yang jelas jika Kredit tidak cukup

### Tech Comfort
Beni cukup terbiasa memakai laptop, browser, Microsoft Word, dan Google Drive. Ia tertarik menggunakan AI jika hasilnya mudah dicek, biaya Kreditnya jelas, dan tidak membuat proses jadi rumit.

### Scenario
Menjelang penilaian harian, Beni membuka Teachery dan membuat assessment draft. Untuk beberapa soal ia menulis secara manual tanpa memakai Kredit. Untuk bagian lain, ia memilih mode AI, mengupload materi ajar Word/PDF yang sudah diberikan kepada siswa, lalu Teachery mengekstrak teksnya tanpa menyimpan file asli. Sebelum generate, Teachery menampilkan estimasi Kredit yang akan digunakan. Setelah Beni menyetujui, AI menambahkan soal ke assessment berdasarkan materi tersebut dan sistem mencatat Kredit sesuai hasil yang berhasil dibuat. Beni mengecek hasilnya, menambahkan link gambar ilustrasi pada soal tertentu, mengedit beberapa bagian, lalu export soal, kisi-kisi, kartu soal, dan pembahasan ke PDF.

### Quote
"Saya butuh cara cepat membuat soal yang tetap bisa saya periksa sendiri, dan saya ingin tahu Kredit yang terpakai sebelum mulai generate."

## Persona B: Rina, Admin

### Profil
Nama: Rina  
Umur: 40 tahun  
Profesi: Koordinator Kurikulum  
Role Aplikasi: Admin  
Pengalaman: 12 tahun di administrasi akademik  

### Konteks Kerja
Rina membantu beberapa guru menggunakan Teachery di sekolah. Ia perlu memastikan guru yang berhak bisa memakai aplikasi, penggunaan Kredit terkendali, dan tidak ada saldo Kredit yang habis tanpa diketahui.

### Pain Points
- Sulit memantau penggunaan AI jika setiap guru memakai tools sendiri-sendiri
- Perlu membagi Kredit secara adil antar guru
- Perlu mengetahui siapa yang memakai Kredit paling banyak
- Perlu menonaktifkan akun guru yang sudah tidak aktif
- Tidak ingin ada perubahan Kredit tanpa catatan audit

### Goals
- Mengelola user Guru dengan mudah
- Menambah atau mengurangi Kredit user sesuai kebutuhan
- Memantau penggunaan Kredit per user dan per job
- Melihat riwayat transaksi Kredit dengan jelas
- Menjaga penggunaan AI tetap terkendali secara biaya

### Needs
- Dashboard Admin
- User Management
- Credit Management
- Riwayat transaksi Kredit seluruh user
- Filter penggunaan Kredit berdasarkan user, tanggal, dan status
- Konfirmasi untuk aksi sensitif seperti mengurangi Kredit atau menonaktifkan user

### Scenario
Rina login sebagai Admin, membuka halaman User Management, lalu menambahkan akun Guru baru. Setelah itu ia memberikan alokasi Kredit awal. Beberapa minggu kemudian, ia membuka Credit Management untuk melihat penggunaan Kredit tiap guru, memeriksa job yang gagal, dan memastikan refund tercatat dengan benar.

### Quote
"Saya perlu memastikan guru bisa memakai AI dengan lancar, tapi penggunaan Kredit tetap terkontrol dan tercatat."
## Product Vision Update

Teachery sekarang diposisikan sebagai Assessment Manager.

Implikasi persona Guru:

- Guru tidak selalu ingin AI membuat semua soal; kadang Guru ingin membuat assessment manual.
- Guru membutuhkan pilihan jelas antara menulis soal sendiri atau generate dengan AI.
- Jika memakai AI, Guru ingin soal yang sesuai dengan materi yang benar-benar sudah diajarkan.
- Guru perlu mengupload materi Word/PDF untuk diekstrak teksnya, tetapi tidak ingin file materi tersimpan permanen.
- Guru dapat menambahkan link gambar ilustrasi eksternal pada soal tertentu.

Implikasi persona Admin:

- Admin tetap fokus pada user, Kredit, monitoring AI usage, dan audit.
- Admin perlu memastikan penggunaan AI terkendali karena hanya mode AI yang memakai Kredit.
