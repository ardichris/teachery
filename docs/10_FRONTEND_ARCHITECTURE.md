# Frontend Architecture

## Tech Stack
- Framework: Next.js 16
- UI: shadcn/ui
- State: Zustand
- Form: React Hook Form
- Validation: Zod

## App Structure
- `app/(auth)/login`
- `app/(guru)/dashboard`
- `app/(guru)/assessments`
- `app/(guru)/assessments/new`
- `app/(guru)/assessments/[id]`
- `app/(guru)/jobs`
- `app/(admin)/dashboard`
- `app/(admin)/users`
- `app/(admin)/credits`

## Role-Based Routing
- Guru hanya bisa mengakses route `(guru)`
- Admin hanya bisa mengakses route `(admin)`
- Jika role tidak sesuai, redirect ke `/access-denied` atau dashboard sesuai role
- Frontend guard bukan pengganti validasi backend

## Core Modules
- Auth
- Users
- Credits
- Jobs
- Material Extraction
- assessments
- Export

## State Management
- Zustand untuk state global ringan: auth session, user profile, credit balance
- Server data seperti jobs, assessments, transactions sebaiknya dari API/query layer
- Form state tetap di React Hook Form

## Forms & Validation
- React Hook Form untuk form state
- Zod untuk schema validation
- Semua form wajib punya label, error message, dan disabled/loading state
- Form assessment wajib mendukung mode manual dan mode AI
- Mode AI wajib memiliki upload Word/PDF untuk extract text sebelum estimasi Kredit
- Field soal wajib mendukung `image_url` opsional untuk gambar ilustrasi eksternal

## Required Frontend Patterns
- Loading state
- Empty state
- Error state
- Insufficient credit state
- Unauthorized state
- Confirmation modal untuk aksi sensitif
