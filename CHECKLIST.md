# Checklist ระบบการเงินโรงเรียนครบวงจร (School Finance System)

รายการสิ่งที่ต้องทำ (To-Do List) เพื่อพัฒนาต่อยอดจาก Dashboard ต้นแบบ ให้กลายเป็นระบบที่สมบูรณ์ตาม Concept: **Paperless, Real-time, Transparent**

## 1. Frontend Development (React Web)
ส่วนติดต่อผู้ใช้ที่กำลังพัฒนาอยู่ (Current Stack: React + Tailwind + Recharts)

### 1.1 Core System & Navigation
- [x] **Project Setup:** สร้างโปรเจกต์, ตั้งค่า Tailwind, Font (thSarabunnew).
- [x] **Layout:** Sidebar, Header, Responsive Design.
- [ ] **Authentication UI:** หน้า Login สำหรับครู/เจ้าหน้าที่/ผอ.
- [ ] **Role-Based Access Control (RBAC):** ซ่อน/แสดง เมนูตามสิทธิ์ (Admin, Finance, Teacher, Director).

### 1.2 Dashboard (หน้าภาพรวม)
- [x] **KPI Cards:** แสดงยอดเงินสด, เงินฝาก, งบฯคงเหลือ.
- [x] **Charts:** กราฟเปรียบเทียบรายรับ-รายจ่าย.
- [x] **Approval List:** ตารางรายการรออนุมัติ.
- [x] **Financial Table:** ตารางรายงานเงินคงเหลือประจำวัน (Daily Cash Flow).
- [ ] **Real-time Data Integration:** เชื่อมต่อ API เพื่อดึงข้อมูลจริงแทน Mock Data.

### 1.3 ระบบรับเงิน (Revenue Module)
- [ ] **Receipt Form:** ฟอร์มกรอกรับเงิน (ค่าเทอม, เงินบริจาค, เงินอุดหนุน).
- [ ] **Payment Methods:** รองรับการเลือก เงินสด / โอนเงิน (แนบสลิป).
- [ ] **Receipt Preview:** แสดงตัวอย่างใบเสร็จก่อนบันทึก.
- [ ] **Auto Print/PDF:** ปุ่มกดพิมพ์ใบเสร็จ หรือ Save เป็น PDF ทันที.

### 1.4 ระบบเบิกจ่าย (Expenditure Module)
- [ ] **PR Creation (ขอซื้อ):** ฟอร์มสร้างใบขอซื้อ (Purchase Request) คำนวณภาษีอัตโนมัติ.
- [ ] **Budget Check:** ระบบตรวจสอบงบประมาณคงเหลือทันทีขณะกรอก (แจ้งเตือนถ้างบหมด).
- [ ] **PO Generation:** แปลงจาก PR เป็นใบสั่งซื้อ (Purchase Order) อัตโนมัติเมื่ออนุมัติ.
- [ ] **Expense Categories:** ตัวเลือกหมวดหมู่ค่าใช้จ่าย (วัสดุ, ครุภัณฑ์, จ้างเหมา).

### 1.5 ระบบยืมเงินราชการ (Loan Module)
- [ ] **Loan Request Form:** แบบฟอร์มสัญญายืมเงิน.
- [ ] **Tracking System:** หน้าติดตามสถานะลูกหนี้เงินยืม.
- [ ] **Overdue Alert:** แสดง Highlight สีแดงสำหรับรายการเกินกำหนด (เหมือนใน Dashboard).

---

## 2. Backend & Database (API)
ส่วนประมวลผลและจัดเก็บข้อมูล

### 2.1 Database Design (SQL Recommended)
- [ ] **Users Table:** เก็บข้อมูลผู้ใช้และสิทธิ์.
- [ ] **Budget Table:** ผังงบประมาณ, รหัสงบ, ยอดตั้งต้น, ยอดคงเหลือ.
- [ ] **Transactions Table:** บันทึกทุกการรับ-จ่าย (Ledger).
- [ ] **Documents Table:** เก็บ Path ไฟล์ PDF, เลขที่เอกสาร (Running Number).

### 2.2 API Development
- [ ] **Auth API:** Login/Logout (JWT Token).
- [ ] **Dashboard API:** Aggregation queries สำหรับสรุปยอด KPI (Real-time).
- [ ] **CRUD Operations:** Create, Read, Update, Delete สำหรับ ใบเสร็จ, PR, สัญญายืม.
- [ ] **Approval Workflow API:** Endpoint สำหรับ ผอ. กด Approve/Reject.

---

## 3. Features "Paperless & Transparent"
ฟีเจอร์สำคัญที่ตอบโจทย์ Concept หลัก

### 3.1 Digital Document Processing
- [ ] **PDF Generator:** ระบบสร้าง PDF ฝั่ง Server (หรือ Client) สำหรับ ใบเสร็จ, PR, PO, รายงาน.
- [ ] **Digital Signature:** รองรับการเก็บลายเซ็นอิเล็กทรอนิกส์ หรือ e-Stamp ของโรงเรียน.
- [ ] **Document Archive:** ระบบจัดเก็บเอกสารย้อนหลัง (ไม่ต้องปริ้นท์เก็บแฟ้ม).

### 3.2 Real-time & Notifications
- [ ] **Line Notify / Email:** แจ้งเตือนเมื่อมีรายการขออนุมัติใหม่ถึง ผอ.
- [ ] **WebSocket / Polling:** อัปเดตหน้า Dashboard ทันทีที่มีการบันทึกข้อมูล (ไม่ต้องกด Refresh).

### 3.3 Reporting (รายงาน)
- [ ] **Daily Report:** รายงานเงินคงเหลือประจำวัน (Auto-generated).
- [ ] **Monthly Report:** รายงานงบทดลอง / รายรับจ่ายจริงประจำเดือน.
- [ ] **Export:** ส่งออกข้อมูลเป็น Excel (.xlsx) เพื่อส่งหน่วยงานต้นสังกัด.

---

## 4. Mobile Support (React Native / Responsive Web)
เพื่อให้ ผอ. สามารถอนุมัติงานได้ทุกที่

- [x] **Responsive Layout:** ตรวจสอบการแสดงผลบนมือถือ (Sidebar ย่อ/ขยาย).
- [ ] **Mobile Touch Actions:** ปรับปุ่มกดให้เหมาะสมกับนิ้วมือ.
- [ ] **(Optional) Mobile App:** พัฒนาแยกด้วย React Native หากต้องการ Notification แบบ Native.

---

## 5. Security & Deployment
- [ ] **SSL/TLS:** เข้ารหัสการรับส่งข้อมูล (HTTPS).
- [ ] **Audit Logs:** บันทึกประวัติการแก้ไขข้อมูล (ใคร, ทำอะไร, เมื่อไหร่) เพื่อความโปร่งใส.
- [ ] **Backup System:** ระบบสำรองข้อมูลรายวัน.