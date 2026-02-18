# PloiBib | ปล่อยบิบ — Deployment Guide

## ขั้นตอนที่ 1: รัน SQL Migration ใน Supabase

เปิด Supabase Dashboard → SQL Editor → New Query แล้ว paste เนื้อหาจากไฟล์ `supabase-migration.sql` แล้วกด Run

สิ่งที่ migration จะทำ:
- เพิ่มคอลัมน์ `email` ใน users table
- ทำให้ `phone` ไม่บังคับ (เราใช้ email auth)
- สร้าง trigger auto-create user เมื่อ sign up
- เพิ่มคอลัมน์ `bib_gender`, `shirt_size`, `finisher_shirt_size` ใน listings
- เพิ่ม RLS policy สำหรับ events

## ขั้นตอนที่ 2: ตั้งค่า Supabase Auth

ใน Supabase Dashboard → Authentication → Settings:
- ปิด **Confirm email** (สำหรับ MVP ทดสอบ)
- Site URL: `https://your-vercel-domain.vercel.app`
- Redirect URLs เพิ่ม: `https://your-vercel-domain.vercel.app/auth/callback`

## ขั้นตอนที่ 3: Push ขึ้น GitHub

```bash
# Unzip ไฟล์
unzip ploibib-deploy.zip
cd ploibib

# Init git
git init
git add .
git commit -m "PloiBib v1 - real Supabase integration"

# Push to GitHub (สร้าง repo ก่อนที่ github.com)
git remote add origin https://github.com/YOUR_USERNAME/ploibib.git
git branch -M main
git push -u origin main
```

## ขั้นตอนที่ 4: Deploy บน Vercel

1. ไปที่ vercel.com → New Project → Import จาก GitHub
2. เลือก repo `ploibib`
3. เพิ่ม Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://osxbovdfqmyvgikxoxlq.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (key เต็ม)
4. กด Deploy!

## ขั้นตอนที่ 5: อัปเดต Supabase Redirect URL

หลัง deploy สำเร็จ ไปอัปเดตใน Supabase:
- Site URL: `https://ploibib.vercel.app` (หรือ domain ที่ได้)
- Redirect URLs: `https://ploibib.vercel.app/auth/callback`

---

## โครงสร้างไฟล์

```
ploibib/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout + BottomNav
│   │   ├── globals.css         # Tailwind CSS
│   │   ├── page.tsx            # หน้าแรก (Server Component → อ่านจาก Supabase)
│   │   ├── login/page.tsx      # เข้าสู่ระบบ (Client → Supabase Auth)
│   │   ├── search/page.tsx     # หาบิบ (Server → อ่าน listings จาก DB)
│   │   ├── create/page.tsx     # ลงบิบ (Client → insert listing เข้า DB)
│   │   ├── event/page.tsx      # รายละเอียดงาน (Server → อ่านจาก DB)
│   │   ├── matches/page.tsx    # แมทช์ของฉัน (Server → อ่าน user listings)
│   │   ├── profile/page.tsx    # โปรไฟล์ (Client → อ่าน user data)
│   │   └── auth/callback/route.ts  # OAuth callback
│   ├── components/
│   │   ├── BottomNav.tsx
│   │   └── Header.tsx
│   ├── lib/
│   │   ├── supabase-client.ts  # Browser client
│   │   └── supabase-server.ts  # Server client
│   └── middleware.ts           # Session refresh + protected routes
├── supabase-migration.sql      # รัน SQL นี้ก่อน deploy
└── package.json
```

## ฟีเจอร์ที่ทำงานได้จริง

✅ สมัคร/เข้าสู่ระบบด้วย email+password (Supabase Auth)
✅ ดูงานวิ่งจาก database จริง
✅ ลงบิบขาย/ซื้อ → insert เข้า Supabase จริง
✅ ดูประกาศทั้งหมดจาก database
✅ ดูงานวิ่งแต่ละงาน + ประกาศในงาน
✅ ดูประกาศของตัวเองในหน้าแมทช์
✅ ดูโปรไฟล์ + สถิติ + reputation score
✅ Protected routes (ต้อง login ก่อนลงบิบ/ดูแมทช์/โปรไฟล์)
✅ เลือกเพศบิบ (ชาย/หญิง) + ไซส์เสื้อวิ่ง/Finisher
