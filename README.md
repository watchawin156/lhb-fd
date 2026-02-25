# 🏫 ระบบการเงินโรงเรียน (LHB Finance Dashboard)

ระบบบริหารการเงินโรงเรียนบ้านละหอกตะแบง ออกแบบมาสำหรับการบันทึก ติดตาม และรายงานการเงินของโรงเรียน

**Live:** https://lhb-fd.pages.dev

---

## ✨ ฟีเจอร์หลัก

- 📒 **สมุดเงินสด (Cash Book)** — บันทึกรายรับ/รายจ่ายแยกตามหมวดเงิน
- 📊 **Dashboard** — ภาพรวมการเงินทั้งปี
- 🧾 **ส่งออก PDF** — สมุดเงินสด, รายงานประจำวัน, หน้าปก
- 🏦 **บัญชีเงินฝาก** — ติดตามยอดเงินแยกบัญชีธนาคาร
- 📋 **รายงานประจำปี** — สรุปรับ-จ่ายตลอดปีงบประมาณ
- 💾 **เก็บข้อมูลใน localStorage** — ไม่ต้องมี backend

## 🗂️ หมวดเงินที่รองรับ

| หมวด | รหัส |
|------|------|
| เงินอุดหนุนรายหัว | fund-subsidy |
| เงินเรียนฟรี 15 ปี (4 ประเภท) | fund-15y-* |
| เงินปัจจัยพื้นฐานนักเรียนยากจน | fund-poor |
| เงินอาหารกลางวัน | fund-lunch |
| เงิน กสศ. | fund-eef |
| เงินรายได้สถานศึกษา | fund-school-income |
| เงินภาษี 1% | fund-tax |
| เงินรายได้แผ่นดิน(ดอกเบี้ย) | fund-state |

---

## 🚀 การติดตั้งและ Deploy

### รันในเครื่อง
\`\`\`bash
npm install
npm run dev
# เปิด http://localhost:4173
\`\`\`

### Build
\`\`\`bash
npm run build
\`\`\`

### Deploy ไป Cloudflare Pages (ครั้งแรก)
\`\`\`bash
# 1. Login Cloudflare
npx wrangler login

# 2. Create GitHub repo ชื่อ lhb-fd แล้ว push
git init
git remote add origin https://github.com/YOUR_USERNAME/lhb-fd.git
git add -A
git commit -m "initial commit"
git push -u origin main

# 3. Deploy
npx wrangler pages deploy dist --project-name lhb-fd
\`\`\`

### Deploy ครั้งต่อไป (ใช้ script)
\`\`\`powershell
.\deploy.ps1
\`\`\`

---

## 🔐 ล็อกอินทดสอบ

| ชื่อผู้ใช้ | รหัสผ่าน | บทบาท |
|-----------|---------|-------|
| admin | 1234 | ผู้ดูแลระบบ |
| finance | 1234 | เจ้าหน้าที่การเงิน |

---

## 🛠️ Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **PDF:** pdf-lib + fontkit
- **Charts:** Recharts
- **Hosting:** Cloudflare Pages
- **Storage:** localStorage

---

## 📁 โครงสร้างโปรเจค

\`\`\`
school-finance-dashboard/
├── components/          # React components
│   ├── CashBookReport.tsx   # สมุดเงินสด (หลัก)
│   ├── exportReportBuilders.ts  # PDF generation
│   ├── Sidebar.tsx
│   └── ...
├── context/
│   └── SchoolContext.tsx    # Global state + localStorage
├── utils.ts            # FUND_TYPE_OPTIONS, formatters
├── types.ts            # TypeScript interfaces
└── deploy.ps1          # Deploy script
\`\`\`
