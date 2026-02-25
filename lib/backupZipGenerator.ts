// lib/backupZipGenerator.ts
// สร้าง ZIP backup รวม JSON + SQL + PDF + Excel แต่ละปีงบประมาณ
// ทำงานบน frontend เพราะใช้ pdf-lib และ xlsx

import * as XLSX from 'xlsx';
import { buildCashBookPDF, buildCoverPDF } from '../components/exportReportBuilders';
import { FUND_TYPE_OPTIONS } from '../utils';

// ─── CRC32 + ZIP builder (เหมือน backend แต่ frontend) ───────────────────────
const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[i] = c;
    }
    return t;
})();

function crc32(data: Uint8Array): number {
    let c = 0xffffffff;
    for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function buildZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
    const enc = new TextEncoder();
    const now = new Date();
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);

    const parts: Uint8Array[] = [];
    const cds: Uint8Array[] = [];
    let offset = 0;

    for (const { name, data } of files) {
        const nb = enc.encode(name);
        const crc = crc32(data);
        const sz = data.length;
        const lh = new Uint8Array(30 + nb.length);
        const lv = new DataView(lh.buffer);
        lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true);
        lv.setUint16(6, 0, true); lv.setUint16(8, 0, true);
        lv.setUint16(10, dosTime, true); lv.setUint16(12, dosDate, true);
        lv.setUint32(14, crc, true); lv.setUint32(18, sz, true); lv.setUint32(22, sz, true);
        lv.setUint16(26, nb.length, true); lv.setUint16(28, 0, true);
        lh.set(nb, 30);

        const cd = new Uint8Array(46 + nb.length);
        const cv = new DataView(cd.buffer);
        cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
        cv.setUint16(8, 0, true); cv.setUint16(10, 0, true);
        cv.setUint16(12, dosTime, true); cv.setUint16(14, dosDate, true);
        cv.setUint32(16, crc, true); cv.setUint32(20, sz, true); cv.setUint32(24, sz, true);
        cv.setUint16(28, nb.length, true); cv.setUint16(30, 0, true); cv.setUint16(32, 0, true);
        cv.setUint16(34, 0, true); cv.setUint16(36, 0, true);
        cv.setUint32(38, 0, true); cv.setUint32(42, offset, true);
        cd.set(nb, 46);

        offset += lh.length + data.length;
        parts.push(lh, data);
        cds.push(cd);
    }

    const cdOff = offset;
    const cdSz = cds.reduce((s, e) => s + e.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(4, 0, true); ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
    ev.setUint32(12, cdSz, true); ev.setUint32(16, cdOff, true); ev.setUint16(20, 0, true);

    const all = [...parts, ...cds, eocd];
    const total = all.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const p of all) { out.set(p, pos); pos += p.length; }
    return out;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function getFY(dateStr: string): number | null {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const m = d.getMonth() + 1, y = d.getFullYear();
    return (m >= 10 ? y + 1 : y) + 543;
}

function fmtShort(dateStr: string): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const THAI_M = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return `${d.getDate()} ${THAI_M[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function getFundCategory(ft: string): string {
    const opt = FUND_TYPE_OPTIONS.find(o => o.value === ft);
    return opt ? opt.group : 'เงินนอกงบประมาณ';
}

function getAmounts(amount: number, fundType: string) {
    const g = getFundCategory(fundType);
    return {
        cash: amount,
        budget: g === 'เงินงบประมาณ' ? amount : 0,
        revenue: g === 'เงินรายได้แผ่นดิน' ? amount : 0,
        nonBudget: g === 'เงินนอกงบประมาณ' ? amount : 0,
    };
}

const ZERO_SUM = { cash: 0, budget: 0, revenue: 0, nonBudget: 0 };
function sumArr(arr: any[]) {
    return arr.reduce((a, r) => ({
        cash: a.cash + r.cash, budget: a.budget + r.budget,
        revenue: a.revenue + r.revenue, nonBudget: a.nonBudget + r.nonBudget,
    }), { ...ZERO_SUM });
}

/** สร้าง dailyData ต่อปีงบ (เหมือน useMemo ใน CashBookReport) */
function buildDailyData(transactions: any[], fyBE: number): any[] {
    const fyCE = fyBE - 543;
    const fyStart = `${fyCE - 1}-10-01`;
    const fyEnd = `${fyCE}-09-30`;

    const prevTxs = transactions.filter(t => t.date < fyStart);
    let prevCash = prevTxs.reduce((a, t) => a + (t.income || 0) - (t.expense || 0), 0);
    let runAccRec = sumArr(prevTxs.filter(t => (t.income || 0) > 0).map(t => getAmounts(t.income, t.fundType)));
    let runAccPay = sumArr(prevTxs.filter(t => (t.expense || 0) > 0).map(t => getAmounts(t.expense, t.fundType)));

    const curTxs = transactions
        .filter(t => t.date >= fyStart && t.date <= fyEnd)
        .sort((a, b) => a.date.localeCompare(b.date));

    const uniqueDays = Array.from(new Set(curTxs.map(t => t.date)));
    const dailyData: any[] = [];

    if (uniqueDays.length === 0) {
        dailyData.push({
            date: fyEnd, dateStr: fmtShort(fyEnd),
            receipts: [], payments: [],
            prevCash, yodYokPai: prevCash,
            totalRec: { ...ZERO_SUM }, totalPay: { ...ZERO_SUM },
            accRec: { ...runAccRec }, accPay: { ...runAccPay },
        });
    } else {
        for (const date of uniqueDays) {
            const txsToday = curTxs.filter(t => t.date === date);
            const receipts: any[] = [], payments: any[] = [];
            txsToday.forEach(t => {
                if ((t.income || 0) > 0) {
                    receipts.push({ date: t.date, dateStr: fmtShort(t.date as string), docNo: t.docNo || '', desc: t.description || '', headerTitle: t.payer || '', ...getAmounts(t.income, t.fundType) });
                }
                if ((t.expense || 0) > 0) {
                    payments.push({ date: t.date, dateStr: fmtShort(t.date as string), docNo: t.docNo || '', desc: t.description || '', headerTitle: t.payee || '', ...getAmounts(t.expense, t.fundType) });
                }
            });
            const dayRev = sumArr(receipts), dayPay = sumArr(payments);
            const dayPrevCash = prevCash;
            const yodYokPai = prevCash + dayRev.cash - dayPay.cash;
            prevCash = yodYokPai;
            runAccRec = { cash: runAccRec.cash + dayRev.cash, budget: runAccRec.budget + dayRev.budget, revenue: runAccRec.revenue + dayRev.revenue, nonBudget: runAccRec.nonBudget + dayRev.nonBudget };
            runAccPay = { cash: runAccPay.cash + dayPay.cash, budget: runAccPay.budget + dayPay.budget, revenue: runAccPay.revenue + dayPay.revenue, nonBudget: runAccPay.nonBudget + dayPay.nonBudget };
            const isCarryForwardDay = receipts.length > 0 && receipts.every((r: any) => r.desc.includes('ยกยอดมา'));
            dailyData.push({
                date, dateStr: fmtShort(date as string),
                receipts, payments,
                prevCash: dayPrevCash, yodYokPai,
                totalRec: dayRev, totalPay: dayPay,
                accRec: { ...runAccRec }, accPay: { ...runAccPay },
                isCarryForwardDay, prevYearBE: fyBE - 1,
            });
        }
    }
    return dailyData;
}

/** สร้าง FUND_ROWS สำหรับหน้าปก */
const FUND_ROWS = [
    { label: 'เงินสด (ภาษีหัก ณ ที่จ่าย)', debitKey: 'fund-tax', creditKey: '' },
    { label: 'เงินฝากธนาคาร', debitKey: '', creditKey: '' },
    { label: '   - เงินอุดหนุนรายหัว', debitKey: 'fund-subsidy', creditKey: '' },
    { label: '   - เงินเรียนฟรี 15 ปี – หนังสือเรียน', debitKey: 'fund-15y-book', creditKey: '' },
    { label: '   - เงินเรียนฟรี 15 ปี – อุปกรณ์การเรียน', debitKey: 'fund-15y-supply', creditKey: '' },
    { label: '   - เงินเรียนฟรี 15 ปี – เครื่องแบบนักเรียน', debitKey: 'fund-15y-uniform', creditKey: '' },
    { label: '   - เงินเรียนฟรี 15 ปี – กิจกรรมพัฒนาคุณภาพผู้เรียน', debitKey: 'fund-15y-activity', creditKey: '' },
    { label: '   - เงินปัจจัยพื้นฐานนักเรียนยากจน', debitKey: 'fund-poor', creditKey: '' },
    { label: '   - เงินอาหารกลางวัน', debitKey: 'fund-lunch', creditKey: '' },
    { label: '   - เงิน กสศ.', debitKey: 'fund-eef', creditKey: '' },
    { label: '   - เงินรายได้สถานศึกษา', debitKey: 'fund-school-income', creditKey: 'fund-school-income' },
    { label: 'เงินอุดหนุนรายหัว', debitKey: '', creditKey: 'fund-subsidy' },
    { label: 'เงินเรียนฟรี 15 ปี – หนังสือเรียน', debitKey: '', creditKey: 'fund-15y-book' },
    { label: 'เงินเรียนฟรี 15 ปี – อุปกรณ์การเรียน', debitKey: '', creditKey: 'fund-15y-supply' },
    { label: 'เงินเรียนฟรี 15 ปี – เครื่องแบบนักเรียน', debitKey: '', creditKey: 'fund-15y-uniform' },
    { label: 'เงินเรียนฟรี 15 ปี – กิจกรรมพัฒนาคุณภาพผู้เรียน', debitKey: '', creditKey: 'fund-15y-activity' },
    { label: 'เงินปัจจัยพื้นฐานนักเรียนยากจน', debitKey: '', creditKey: 'fund-poor' },
    { label: 'เงิน กสศ.', debitKey: '', creditKey: 'fund-eef' },
    { label: 'เงินอาหารกลางวัน', debitKey: '', creditKey: 'fund-lunch' },
    { label: 'เงินภาษี 1 %', debitKey: '', creditKey: 'fund-tax' },
    { label: 'เงินรายได้แผ่นดิน', debitKey: '', creditKey: 'fund-state' },
];

// ─── Main: สร้าง ZIP ─────────────────────────────────────────────────────────
export interface BackupProgress {
    step: string;
    total: number;
    current: number;
}

export async function generateFullBackupZip(
    transactions: any[],
    settings: any,
    onProgress?: (p: BackupProgress) => void
): Promise<Uint8Array> {
    const enc = new TextEncoder();
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const folder = `backup-${stamp}`;
    const schoolName = settings?.schoolNameTH || 'โรงเรียน';

    // หาปีงบทั้งหมด
    const fySet = new Set<number>();
    transactions.forEach(t => { const fy = getFY(t.date); if (fy) fySet.add(fy); });
    const fyList = Array.from(fySet).sort();

    const zipFiles: { name: string; data: Uint8Array }[] = [];
    const STEPS = 2 + fyList.length * 3; // JSON/SQL + (PDF cashbook + PDF cover + Excel) ต่อปี
    let currentStep = 0;

    const prog = (step: string) => { currentStep++; onProgress?.({ step, total: STEPS, current: currentStep }); };

    // ── 1. JSON backup ─────────────────────────────────────────────────────────
    prog('สร้างไฟล์ JSON backup...');
    const jsonStr = JSON.stringify({ version: '1.0', exportedAt: new Date().toISOString(), school: schoolName, transactions }, null, 2);
    zipFiles.push({ name: `${folder}/backup.json`, data: enc.encode(jsonStr) });

    // ── 2. SQL dump ────────────────────────────────────────────────────────────
    prog('สร้างไฟล์ SQL dump...');
    let sql = `-- LHB Backup SQL\n-- ${new Date().toISOString()}\nBEGIN TRANSACTION;\nDELETE FROM transactions;\n`;
    transactions.forEach(tx => {
        const cols = ['id', 'date', 'doc_no', 'description', 'fund_type', 'income', 'expense', 'payer', 'payee', 'payee_type', 'bank_id', 'income_ref_id', 'extra_json'];
        const vals = cols.map(c => {
            const v = (tx as any)[c] ?? null;
            if (v === null) return 'NULL';
            if (typeof v === 'number') return v;
            return `'${String(v).replace(/'/g, "''")}'`;
        }).join(', ');
        sql += `INSERT INTO transactions (${cols.join(',')}) VALUES (${vals});\n`;
    });
    sql += 'COMMIT;\n';
    zipFiles.push({ name: `${folder}/backup.sql`, data: enc.encode(sql) });

    // ── 3. แต่ละปีงบ: PDF + Excel ─────────────────────────────────────────────
    for (const fyBE of fyList) {
        const fyFolder = `${folder}/ปีงบ-${fyBE}`;
        const dailyData = buildDailyData(transactions, fyBE);

        // PDF สมุดเงินสด
        prog(`สร้าง PDF สมุดเงินสด ปี ${fyBE}...`);
        try {
            const pdfBytes = await buildCashBookPDF(
                1, fyBE, dailyData,
                settings?.financeOfficerName || '',
                settings?.auditorName || '',
                settings?.directorName || ''
            );
            zipFiles.push({ name: `${fyFolder}/pdf/สมุดเงินสด-ปีงบ-${fyBE}.pdf`, data: pdfBytes });
        } catch (e) {
            console.warn(`PDF cashbook ปี ${fyBE} error:`, e);
        }

        // PDF หน้าปก
        prog(`สร้าง PDF หน้าปก ปี ${fyBE}...`);
        try {
            const fyCE = fyBE - 543;
            const fyStart = `${fyCE - 1}-10-01`;
            const prevTxs = transactions.filter(t => t.date < fyStart);
            const balances: Record<string, number> = {};
            prevTxs.forEach(t => { balances[t.fundType] = (balances[t.fundType] || 0) + (t.income || 0) - (t.expense || 0); });
            const rows = FUND_ROWS.map(r => ({
                label: r.label,
                debit: r.debitKey ? (balances[r.debitKey] ?? 0) : null,
                credit: r.creditKey ? (balances[r.creditKey] ?? 0) : null,
            }));
            const totalDebit = rows.reduce((s, r) => s + (r.debit ?? 0), 0);
            const totalCredit = rows.reduce((s, r) => s + (r.credit ?? 0), 0);
            const coverBytes = await buildCoverPDF(
                fyBE, `1 ตุลาคม ${fyCE - 1 + 543}`, rows, totalDebit, totalCredit,
                settings?.financeOfficerName || '', settings?.directorName || ''
            );
            zipFiles.push({ name: `${fyFolder}/pdf/หน้าปกสมุดเงินสด-ปีงบ-${fyBE}.pdf`, data: coverBytes });
        } catch (e) {
            console.warn(`PDF cover ปี ${fyBE} error:`, e);
        }

        // Excel
        prog(`สร้าง Excel ปี ${fyBE}...`);
        try {
            const fyTxs = transactions.filter(t => getFY(t.date) === fyBE);
            const wb = XLSX.utils.book_new();

            // Sheet: รายรับ-รายจ่าย
            const allRows = fyTxs.map(t => ({
                วันที่: t.date,
                เลขที่เอกสาร: t.doc_no || t.docNo || '',
                รายการ: t.description || '',
                หมวดเงิน: FUND_TYPE_OPTIONS.find(o => o.value === t.fundType)?.label || t.fundType || '',
                รับ: t.income ? Number(t.income).toFixed(2) : '',
                จ่าย: t.expense ? Number(t.expense).toFixed(2) : '',
                ผู้จ่ายผู้รับ: t.payer || t.payee || '',
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allRows), 'รายการทั้งหมด');

            // แยก sheet ต่อ fund type
            const fundGroups: Record<string, any[]> = {};
            fyTxs.forEach(t => {
                const label = FUND_TYPE_OPTIONS.find(o => o.value === t.fundType)?.label || t.fundType || 'อื่นๆ';
                if (!fundGroups[label]) fundGroups[label] = [];
                fundGroups[label].push(t);
            });
            Object.entries(fundGroups).forEach(([label, rows]) => {
                const sheetName = label.slice(0, 31); // Excel sheet name max 31 chars
                const sheetRows = rows.map(t => ({
                    วันที่: t.date,
                    เลขที่เอกสาร: t.doc_no || t.docNo || '',
                    รายการ: t.description || '',
                    รับ: t.income ? Number(t.income).toFixed(2) : '',
                    จ่าย: t.expense ? Number(t.expense).toFixed(2) : '',
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetRows), sheetName);
            });

            const xlsxBuf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
            zipFiles.push({ name: `${fyFolder}/excel/รายงานการเงิน-ปีงบ-${fyBE}.xlsx`, data: new Uint8Array(xlsxBuf) });
        } catch (e) {
            console.warn(`Excel ปี ${fyBE} error:`, e);
        }
    }

    // สร้าง ZIP
    return buildZip(zipFiles);
}
