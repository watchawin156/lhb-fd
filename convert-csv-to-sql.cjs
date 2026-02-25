// convert-csv-to-sql.js
// แปลงไฟล์ CSV สมุดเงินสดเป็น SQL INSERT สำหรับ D1

const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'New folder', 'ข้อมูลสมุดเงินสด.csv');
const content = fs.readFileSync(csvPath, 'utf8');

// แปลงวันที่ไทย D/M/YYYY(BE) → YYYY-MM-DD(CE)
function thaiDateToISO(dateStr) {
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return null;
    let [d, m, y] = parts.map(Number);
    const ce = y - 543; // แปลง พ.ศ. → ค.ศ.
    return `${ce}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// กำหนด fund_type จาก description + column
function getFundType(desc, stateColVal) {
    if (stateColVal && parseFloat(stateColVal) > 0) return 'fund-state';

    const d = desc.toLowerCase();

    // เรียงจากเฉพาะเจาะจง → ทั่วไป
    if (d.includes('กสศ') || d.includes('กองทุนเสมอภาค') || d.includes('ทุน กสศ')) return 'fund-eef';
    if (d.includes('ปัจจัยพื้นฐาน') || d.includes('นักเรียนยากจน') || d.includes('ยากจน') && !d.includes('กสศ')) return 'fund-poor';
    if (d.includes('อาหารกลางวัน') || d.includes('อาหาร กลางวัน')) return 'fund-lunch';
    if (d.includes('ภาษี 1%') || d.includes('ภาษี1%')) return 'fund-tax';
    if (d.includes('ดอกเบี้ย')) return 'fund-state';
    if (d.includes('รายได้แผ่นดิน')) return 'fund-state';
    if (d.includes('รายได้สถานศึกษา') || d.includes('บริจาค') || d.includes('ขายยาง') || d.includes('กรีดยาง') || d.includes('ถนนคอนกรีต') || d.includes('โรงจอดรถ') || d.includes('จอดรถ') || d.includes('ว่ายน้ำ')) return 'fund-school-income';
    if (d.includes('ค่าหนังสือเรียน') || d.includes('หนังสือเรียน')) return 'fund-15y-book';
    if (d.includes('ค่าอุปกรณ์การเรียน') || d.includes('อุปกรณ์การเรียน')) return 'fund-15y-supply';
    if (d.includes('ค่าเครื่องแบบ') || d.includes('เครื่องแบบนักเรียน')) return 'fund-15y-uniform';
    if (d.includes('กิจกรรมพัฒนาคุณภาพผู้เรียน') || d.includes('พัฒนาคุณภาพ')) return 'fund-15y-activity';
    if (d.includes('ค่าจัดการเรียนการสอน') || d.includes('จัดการเรียนการสอน')) return 'fund-subsidy';
    if (d.includes('อุดหนุน') && !d.includes('อาหาร') && !d.includes('ยากจน')) return 'fund-subsidy';

    // หมวด numbered items (2., 3., 4., 5.) จาก context ก่อนหน้า
    if (/^[2-5][\.\s]/.test(desc.trim())) {
        if (d.includes('หนังสือ')) return 'fund-15y-book';
        if (d.includes('อุปกรณ์')) return 'fund-15y-supply';
        if (d.includes('เครื่องแบบ')) return 'fund-15y-uniform';
        if (d.includes('กิจกรรม')) return 'fund-15y-activity';
        return 'fund-subsidy'; // default for numbered items
    }

    // กิจกรรมต่างๆ จากเงินอุดหนุน
    if (d.includes('ค่าย') || d.includes('ทัศนศึกษา') || d.includes('แข่งขัน') || d.includes('โครงการ')) return 'fund-15y-activity';
    if (d.includes('วัสดุการศึกษา') || d.includes('วัสดุสำนักงาน')) return 'fund-subsidy';
    if (d.includes('ค่าไฟ') || d.includes('ค่าน้ำ') || d.includes('ไฟฟ้า') || d.includes('น้ำประปา')) return 'fund-school-income';
    if (d.includes('กล้องวงจรปิด')) return 'fund-school-income';

    return 'fund-school-income'; // default
}

function escape(str) {
    if (!str) return 'NULL';
    return "'" + String(str).replace(/'/g, "''") + "'";
}

const lines = content.split('\n').filter(l => l.trim());
const rows = lines.slice(1); // skip header

const inserts = [];
let skipped = 0;

for (const line of rows) {
    // parse CSV (comma separated, handle thai text)
    const cols = line.trim().split(',');
    if (cols.length < 7) { skipped++; continue; }

    const [pageNo, fyBE, dateTH, type, docNo, desc, cashAmt, budgetAmt, stateAmt, nonBudgetAmt] = cols;

    const isoDate = thaiDateToISO(dateTH);
    if (!isoDate) { skipped++; continue; }

    const isIncome = type.trim() === 'รับ';
    const amount = parseFloat(cashAmt) || 0;
    if (amount <= 0) { skipped++; continue; }

    const fundType = getFundType(desc, stateAmt);
    const docNoClean = docNo?.trim() === '-' || !docNo?.trim() ? null : docNo.trim();
    const descClean = desc?.trim() || '';

    const income = isIncome ? amount : 0;
    const expense = isIncome ? 0 : amount;

    inserts.push(
        `(${escape(isoDate)}, ${escape(docNoClean)}, ${escape(descClean)}, ${escape(fundType)}, ${income}, ${expense}, NULL, NULL, NULL, NULL, NULL, NULL)`
    );
}

const sql = `-- นำเข้าข้อมูลสมุดเงินสด (${inserts.length} รายการ)
-- Generated: ${new Date().toISOString()}

INSERT INTO transactions (date, doc_no, description, fund_type, income, expense, payer, payee, payee_type, bank_id, income_ref_id, extra_json)
VALUES
${inserts.join(',\n')};
`;

const outPath = path.join(__dirname, 'seed-cashbook.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log(`✅ สร้างไฟล์ seed-cashbook.sql สำเร็จ: ${inserts.length} รายการ (ข้าม ${skipped} รายการ)`);
