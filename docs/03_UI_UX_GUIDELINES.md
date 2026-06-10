# UI/UX Guidelines

## Arah Desain

Teachery harus terasa clear, fresh, dan membantu guru bekerja lebih cepat tanpa banyak distraksi.

Kesan utama:
- Bersih dan mudah dipindai
- Terasa modern, tetapi tetap familiar untuk pengguna non-teknis
- Fokus pada produktivitas guru
- Ringan, ramah, dan tidak kaku
- Mengutamakan isi soal, kisi-kisi, pembahasan, dan proses export
- Transparan tentang penggunaan Kredit untuk fitur AI
- Jelas membedakan pengalaman Guru dan Admin

## Prinsip UX

### 1. Fokus pada tugas utama

Setiap layar harus membantu pengguna menyelesaikan satu langkah utama.

Contoh:
- Dashboard menonjolkan aksi "Buat Assessment"
- Dashboard menampilkan saldo Kredit
- Halaman review assessment menonjolkan edit, review, dan export
- Form Buat Assessment tidak terlalu panjang dalam satu tampilan

Hindari:
- Terlalu banyak menu di layar awal
- Informasi dekoratif yang tidak membantu pengambilan keputusan
- CTA yang saling bersaing

### 2. Bahasa sederhana

Gunakan bahasa yang dekat dengan guru.

Contoh label:
- "Buat Soal"
- "Edit Soal"
- "Export PDF"
- "Kisi-kisi"
- "Pembahasan"
- "Tingkat Kesulitan"
- "Saldo Kredit"
- "Estimasi Kredit"
- "Kredit Terpakai"
- "Riwayat Kredit"
- "Kelola User"
- "Kelola Kredit"
- "Role"
- "Admin"
- "Guru"

Hindari istilah teknis seperti:
- "Prompt"
- "AI pipeline"
- "Regenerate payload"
- "Assessment object"

Jika tetap perlu memakai istilah AI, gunakan secara natural:
- "Generate dengan AI"
- "Buat ulang hasil"
- "Perbaiki otomatis"

### 3. Alur bertahap

Proses membuat soal sebaiknya dibagi menjadi langkah-langkah kecil.

Contoh flow:
1. Pilih mata pelajaran, kelas, materi, dan jumlah soal
2. Pilih jenis soal (pilihan ganda, uraian)
3. Tentukan tingkat kesulitan dan tipe soal
4. Lihat estimasi Kredit
5. Buat Assessment
6. Review dan edit hasil
7. Export PDF

Gunakan indikator langkah agar pengguna tahu posisi mereka.

### 4. Mudah diedit

Karena hasil AI perlu direview guru, pengalaman edit harus jelas dan cepat.

Prioritaskan:
- Setiap soal tampil dalam blok yang rapi
- Tombol edit terlihat jelas
- Jawaban benar dan pembahasan mudah ditemukan
- Kisi-kisi bisa diperiksa berdampingan dengan soal jika memungkinkan
- Perubahan tersimpan dengan feedback yang jelas

### 5. Feedback selalu terlihat

Setiap aksi penting harus punya respon visual.

Contoh:
- Saat generate: tampilkan loading state dengan teks singkat
- Saat simpan: tampilkan status "Tersimpan"
- Saat export: tampilkan progress atau status "PDF siap diunduh"
- Saat error: jelaskan masalah dan tindakan berikutnya

Pesan error harus membantu, bukan menyalahkan.

Contoh:
- Baik: "Materi pelajaran belum diisi. Tambahkan materi agar soal bisa dibuat."
- Hindari: "Invalid input."

### 6. Kredit harus transparan

Karena fitur AI memiliki biaya, user harus selalu memahami saldo Kredit dan estimasi penggunaan sebelum job berjalan.

Prioritaskan:
- Saldo Kredit terlihat di Dashboard dan area akun
- Estimasi Kredit tampil sebelum user klik generate
- Job menampilkan Kredit estimasi dan Kredit aktual
- Pemotongan Kredit hanya terlihat setelah hasil berhasil dibuat
- Riwayat Kredit mudah ditemukan

Hindari:
- Memotong Kredit tanpa konfirmasi atau riwayat
- Menyembunyikan biaya Kredit di teks kecil
- Menggunakan istilah billing teknis yang tidak familiar
- Membuat user merasa takut mencoba AI karena informasi biaya tidak jelas

### 7. Role harus jelas

Teachery memiliki dua role utama: Guru dan Admin. UI harus menampilkan menu, aksi, dan data sesuai role.

Untuk Guru:
- Fokus pada Buat Assessment, review, export, jobs, dan saldo Kredit pribadi
- Jangan tampilkan menu manajemen user
- Jangan tampilkan data guru lain

Untuk Admin:
- Fokus pada user management, credit management, monitoring jobs, dan audit Kredit
- Aksi sensitif seperti mengurangi Kredit atau menonaktifkan user harus memakai konfirmasi
- Tampilkan aktor, alasan, dan waktu pada riwayat perubahan Kredit

Hindari:
- Menu Admin muncul untuk Guru
- Guru bisa melihat saldo atau assessment guru lain
- Perubahan Kredit dilakukan tanpa alasan

## Visual Style

### Look and Feel

Gunakan tampilan yang terang, lapang, dan profesional.

Karakter visual:
- Background terang
- Banyak ruang putih
- Garis pemisah halus
- Komponen dengan radius kecil sampai sedang
- Shadow sangat lembut, hanya untuk elemen yang perlu naik dari permukaan
- Warna aksen segar untuk aksi utama

Hindari tampilan yang terlalu ramai, terlalu gelap, atau terlalu dekoratif.

### Color Palette

Rekomendasi warna:

- Primary: biru segar atau teal untuk aksi utama
- Secondary: hijau lembut untuk status berhasil
- Accent: kuning lembut untuk highlight atau perhatian ringan
- Neutral: abu-abu terang untuk background dan border
- Danger: merah lembut untuk error atau aksi berisiko

Contoh token warna:

```text
Primary: #2563EB
Primary Hover: #1D4ED8
Secondary: #10B981
Accent: #F59E0B
Background: #F8FAFC
Surface: #FFFFFF
Text Primary: #0F172A
Text Secondary: #64748B
Border: #E2E8F0
Danger: #EF4444
```

Catatan:
- Jangan membuat seluruh UI hanya biru.
- Gunakan warna netral sebagai dasar.
- Warna primary hanya untuk aksi utama dan elemen aktif.

### Typography

Gunakan font sans-serif yang bersih dan mudah dibaca.

Rekomendasi:
- Inter
- Plus Jakarta Sans
- Manrope
- System font jika ingin ringan

Ukuran teks:
- Page title: 28-32px
- Section title: 20-24px
- Card title: 16-18px
- Body: 14-16px
- Helper text: 12-14px

Prinsip:
- Jangan terlalu banyak variasi ukuran font
- Gunakan font weight untuk hierarki, bukan dekorasi berlebihan
- Pastikan teks soal panjang tetap nyaman dibaca

### Layout

Gunakan layout yang mendukung kerja berulang.

Rekomendasi:
- Sidebar sederhana untuk navigasi utama
- Header ringkas untuk judul halaman dan aksi penting
- Area konten utama lebar dan mudah dibaca
- Panel kanan opsional untuk ringkasan, pengaturan, atau preview

Contoh struktur halaman desktop:

```text
Sidebar | Header
Sidebar | Main Content
Sidebar | Main Content + Optional Preview Panel
```

Untuk mobile:
- Sidebar berubah menjadi bottom navigation atau drawer
- Form menjadi satu kolom
- Tombol aksi utama tetap mudah dijangkau

## Komponen Utama

### Button

Jenis tombol:
- Primary: aksi utama seperti "Buat Assessment" atau "Export PDF"
- Secondary: aksi pendukung seperti "Simpan Draft"
- Ghost: aksi ringan seperti "Batal"
- Danger: aksi berisiko seperti "Hapus Soal"

Aturan:
- Satu primary button utama per area
- Gunakan ikon untuk aksi umum seperti export, edit, delete, save
- Label tombol harus spesifik

Contoh:
- Baik: "Export Soal PDF"
- Hindari: "Submit"

### Card

Gunakan card untuk item berulang seperti daftar soal, template, atau histori export.

Aturan:
- Radius 8px atau kurang
- Border halus
- Shadow minimal
- Jangan menumpuk card di dalam card

### Form

Form Buat Assessment harus terasa ringan.

Field penting:
- Mata pelajaran
- Kelas
- Materi
- Jumlah soal
- Tipe soal
- Tingkat kesulitan
- Bahasa

Aturan:
- Kelompokkan field berdasarkan konteks
- Beri placeholder yang membantu
- Validasi muncul dekat field terkait
- Gunakan dropdown untuk pilihan tetap
- Gunakan textarea untuk materi atau instruksi tambahan

### Table/List

Gunakan list atau table untuk:
- Riwayat assessment
- Daftar assessment
- Daftar export PDF

Aturan:
- Baris mudah dipindai
- Status terlihat jelas
- Aksi per item tidak terlalu banyak
- Gunakan filter sederhana jika data mulai banyak

### Editor Soal

Editor adalah bagian terpenting setelah generate.

Setiap item soal sebaiknya menampilkan:
- Nomor soal
- Tipe soal
- Pertanyaan
- Pilihan jawaban jika ada
- Jawaban benar
- Pembahasan
- Kisi-kisi terkait
- Tombol edit, duplikasi, hapus, dan buat ulang

Prioritaskan keterbacaan teks soal.

## Contoh Halaman

### Dashboard

Tujuan:
Memberi akses cepat ke pekerjaan utama.

Isi:
- Greeting singkat
- Saldo Kredit
- Tombol "Buat Assessment"
- Draft terakhir
- Riwayat export
- Riwayat Kredit ringkas atau link ke halaman Riwayat Kredit
- Statistik ringan seperti jumlah assessment dibuat

Nuansa:
Ringkas, tidak seperti landing page.

### Dashboard Admin

Tujuan:
Memberi Admin ringkasan kontrol user, Kredit, dan penggunaan AI.

Isi:
- Jumlah user aktif
- Total Kredit terpakai
- Jobs terbaru dari semua user
- Transaksi Kredit terbaru
- Tombol "Kelola User"
- Tombol "Kelola Kredit"

UX penting:
- Tampilkan data agregat tanpa membuat halaman terasa terlalu padat
- Aksi sensitif harus masuk halaman detail, bukan langsung dari ringkasan
- Admin harus bisa menelusuri perubahan Kredit ke user dan job terkait

### Buat Assessment

Tujuan:
Mengumpulkan input yang dibutuhkan AI.

Struktur:
- Header: "Buat Assessment"
- Form pengaturan soal
- Ringkasan pilihan
- Estimasi Kredit
- Sisa Kredit setelah generate
- Tombol "Generate dengan AI"

UX penting:
- Jika form belum lengkap, jelaskan field mana yang perlu diisi
- Jika Kredit tidak cukup, jelaskan estimasi Kredit dan saldo saat ini
- Setelah generate dimulai, tampilkan loading state yang menenangkan

### Hasil Generate

Tujuan:
Review, edit, dan export.

Struktur:
- Header dengan status assessment
- Informasi Kredit job: estimasi dan aktual
- Daftar soal
- Panel aksi export
- Tab untuk "Soal", "Kisi-kisi", dan "Pembahasan"

UX penting:
- Guru bisa memperbaiki hasil AI dengan cepat
- Jangan menyembunyikan jawaban benar terlalu dalam
- Jika user memakai AI tambahan seperti "Buat ulang", tampilkan estimasi Kredit tambahan
- Export PDF selalu mudah ditemukan setelah review selesai

### Riwayat Kredit

Tujuan:
Membantu user memahami penggunaan Kredit.

Isi:
- Saldo Kredit saat ini
- Daftar transaksi Kredit
- Tanggal transaksi
- Nama job atau assessment
- Jenis aksi AI
- Kredit masuk atau keluar
- Status: berhasil, gagal, refund

UX penting:
- Gunakan bahasa sederhana seperti "Generate 10 soal"
- Tampilkan refund dengan jelas jika job gagal
- Beri link dari job ke detail transaksi Kredit terkait
- Untuk Admin, tampilkan user terkait, aktor perubahan, dan alasan perubahan Kredit

### Kelola User

Tujuan:
Memungkinkan Admin mengelola akses Guru dan Admin lain.

Isi:
- Daftar user
- Nama dan email
- Role
- Status akun
- Saldo Kredit
- Actions: edit, aktifkan/nonaktifkan, ubah role

UX penting:
- Perubahan role harus memakai konfirmasi
- User nonaktif harus terlihat berbeda tetapi tetap bisa ditelusuri
- Jangan tampilkan halaman ini untuk role Guru

### Kelola Kredit

Tujuan:
Memungkinkan Admin mengatur saldo Kredit user.

Isi:
- Pilih user
- Saldo Kredit saat ini
- Tambah atau kurangi Kredit
- Jumlah Kredit
- Alasan perubahan
- Riwayat transaksi user

UX penting:
- Alasan perubahan wajib diisi
- Pengurangan Kredit harus memakai konfirmasi
- Setelah perubahan berhasil, tampilkan transaksi baru di riwayat

## Microcopy

Gunakan teks pendek, jelas, dan membantu.

Contoh:

```text
Buat Assessment
Buat soal berdasarkan materi dan tingkat kesulitan yang kamu pilih.

Tersimpan
Perubahan terakhir sudah disimpan.

PDF siap
assessment berhasil dibuat dan siap diunduh.

Materi belum diisi
Tambahkan materi agar Teachery bisa membuat soal yang sesuai.

Estimasi Kredit
Job ini diperkirakan menggunakan 20 Kredit.

Kredit tidak cukup
Saldo kamu 8 Kredit, sedangkan job ini membutuhkan 20 Kredit.

Kredit terpakai
20 Kredit digunakan untuk generate 20 soal.

Kredit dikembalikan
5 Kredit dikembalikan karena sebagian soal gagal dibuat.
```

## Accessibility

Minimal yang harus dipenuhi:
- Kontras teks cukup jelas
- Semua tombol punya label yang jelas
- Form bisa digunakan dengan keyboard
- Error tidak hanya ditandai warna
- Fokus input terlihat
- Ukuran klik tombol nyaman, minimal 40px tinggi

## Responsive Behavior

Desktop:
- Gunakan sidebar dan area kerja luas
- Bisa memakai preview panel

Tablet:
- Sidebar boleh dipadatkan
- Konten utama tetap satu fokus

Mobile:
- Navigasi sederhana
- Form satu kolom
- Tombol utama sticky di bawah jika membantu
- Hindari tabel lebar; ubah menjadi list card

## Do and Don't

Do:
- Buat layar mudah dipindai
- Tonjolkan aksi utama
- Gunakan warna secara hemat
- Tampilkan feedback setelah aksi
- Buat hasil AI mudah direview dan diedit
- Tampilkan estimasi Kredit sebelum menjalankan AI
- Catat penggunaan Kredit di riwayat

Don't:
- Membuat UI seperti landing page marketing
- Menaruh terlalu banyak card dekoratif
- Menggunakan istilah teknis yang tidak perlu
- Menyembunyikan fitur export
- Membuat warna terlalu ramai
- Membuat form terlalu panjang tanpa pembagian langkah
- Menyembunyikan biaya Kredit atau membuat user menebak-nebak

## Referensi Rasa Visual

Teachery sebaiknya terasa seperti:
- Google Workspace yang sederhana
- Notion yang rapi
- Canva Docs yang ringan
- Linear yang fokus, tetapi lebih ramah untuk guru

Bukan seperti:
- Dashboard enterprise yang penuh tabel
- Landing page SaaS yang terlalu promosi
- Aplikasi ujian yang kaku dan menegangkan
## Assessment Manager Update

UX harus mencerminkan perubahan Teachery dari generator soal menjadi Assessment Manager.

Rules:

- Assessment adalah objek utama yang dibuat dan dikelola Guru.
- Saat membuat assessment, Guru harus memilih mode: Manual atau Dengan AI.
- Mode Manual tidak menampilkan estimasi Kredit karena tidak memakai AI.
- Mode Dengan AI wajib meminta file materi pembelajaran Word/PDF.
- UI upload materi harus menjelaskan bahwa file asli tidak disimpan; sistem hanya mengekstrak teks.
- Tampilkan state saat sistem membaca materi: loading, berhasil, gagal, dan teks kosong.
- Estimasi Kredit baru ditampilkan setelah input AI dan teks materi valid.
- Question card/editor harus menyediakan field opsional untuk link gambar ilustrasi eksternal.
- Jika gambar eksternal gagal dimuat, soal tetap harus mudah dibaca.
