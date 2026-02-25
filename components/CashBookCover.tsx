
import React, { useMemo, useRef } from 'react';
import { useSchoolData } from '../context/SchoolContext';
import * as XLSX from 'xlsx';
import { buildCoverPDF, openBlob } from './exportReportBuilders';

const FONT_CDN = {
    regular: 'https://cdn.jsdelivr.net/gh/watchawin156/font@main/THSarabunNew.ttf',
    bold: 'https://cdn.jsdelivr.net/gh/watchawin156/font@main/THSarabunNewBold.ttf',
    italic: 'https://cdn.jsdelivr.net/gh/watchawin156/font@main/THSarabunIT%E0%B9%99.ttf',
    italicBold: 'https://cdn.jsdelivr.net/gh/watchawin156/font@main/THSarabunIT%E0%B9%99%20Bold.ttf',
};

// ============================================================
// ประเภทเงินทั้งหมดในระบบ (ตรงกับ PDF ต้นฉบับ)
// ============================================================
const FUND_ROWS: { label: string; debitKey: string; creditKey: string }[] = [
    { label: 'เงินสด (ภาษีหัก ณ ที่จ่าย)', debitKey: 'cash_tax', creditKey: '' },
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

// ฟังก์ชันแปลงปี พ.ศ. จากปี ค.ศ.
const toBE = (y: number) => y + 543;

// หาปีงบประมาณ (เริ่ม ต.ค.)
const getFiscalYear = (date: Date) => {
    const m = date.getMonth() + 1; // 1-12
    const y = date.getFullYear();
    return m >= 10 ? y + 1 : y;
};

const getFiscalYearStart = (fy: number) => new Date(`${fy - 1}-10-01`);

const formatMoney = (n: number | null | undefined): string => {
    if (n === null || n === undefined || n === 0) return '0';
    return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ============================================================
// Component หลัก
// ============================================================
const CashBookCover: React.FC = () => {
    const { transactions, schoolSettings } = useSchoolData();
    const printRef = useRef<HTMLDivElement>(null);

    const today = new Date();
    const fiscalYear = getFiscalYear(today);    // ค.ศ.
    const fiscalYearBE = toBE(fiscalYear);       // พ.ศ.
    const fyStart = getFiscalYearStart(fiscalYear);
    const fyStartDateStr = `1 ตุลาคม ${toBE(fyStart.getFullYear())}`;

    // ============================================================
    // คำนวณยอด Debit / Credit แต่ละประเภทเงิน
    // จากข้อมูล transactions ในระบบ ณ วันเปิดปีงบประมาณ
    // ============================================================
    const fundBalances = useMemo(() => {
        // รวมยอดคงเหลือต้นปีงบ = รายรับ - รายจ่าย ก่อนถึงวันเปิดบัญชี
        const balances: Record<string, number> = {};

        // transactions ทั้งหมดก่อนเปิดปีงบประมาณนี้ = "ยอดยกมา" ของแต่ละกองทุน
        const prevTxs = transactions.filter(t => t.date < fyStart.toISOString().slice(0, 10));
        prevTxs.forEach(t => {
            const key = t.fundType;
            if (!balances[key]) balances[key] = 0;
            balances[key] += (t.income || 0) - (t.expense || 0);
        });

        return balances;
    }, [transactions, fyStart]);

    // ============================================================
    // สร้างแถวข้อมูล
    // ============================================================
    const rows = FUND_ROWS.map(row => {
        const debit = row.debitKey ? (fundBalances[row.debitKey] ?? 0) : null;
        const credit = row.creditKey ? (fundBalances[row.creditKey] ?? 0) : null;
        return { label: row.label, debit, credit };
    });

    // ยอดรวม
    const totalDebit = rows.reduce((s, r) => s + (r.debit ?? 0), 0);
    const totalCredit = rows.reduce((s, r) => s + (r.credit ?? 0), 0);

    const handlePDF = async () => {
        try {
            const bytes = await buildCoverPDF(
                fiscalYearBE,
                fyStartDateStr,
                rows,
                totalDebit,
                totalCredit,
                schoolSettings.financeOfficerName || '',
                schoolSettings.directorName || ''
            );
            openBlob(bytes);
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการสร้าง PDF');
        }
    };

    const handleExcel = () => {
        const wsData: (string | number)[][] = [
            [`ปีงบประมาณ ${fiscalYearBE}`],
            [`รายการเปิดบัญชี ณ วันที่ ${fyStartDateStr}`],
            [],
            ['รายการ', 'เดบิต', 'เครดิต'],
            ...rows.map(r => [r.label, r.debit ?? '', r.credit ?? '']),
            [],
            ['รวมทั้งสิ้น', totalDebit, totalCredit],
        ];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'หน้าปกสมุดเงินสด');
        XLSX.writeFile(wb, `หน้าปกสมุดเงินสด_ปีงบ${fiscalYearBE}.xlsx`);
    };

    // ============================================================
    // UI
    // ============================================================
    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark p-4 md:p-6 flex flex-col gap-4">
            {/* Toolbar */}
            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between">
                <div>
                    <h2 className="font-bold text-lg text-slate-800 dark:text-white">หน้าปกสมุดเงินสด</h2>
                    <p className="text-sm text-slate-500 dark:text-text-muted-dark mt-0.5">
                        ปีงบประมาณ {fiscalYearBE} &nbsp;·&nbsp; รายการเปิดบัญชี ณ วันที่ {fyStartDateStr}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handlePDF}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors">
                        <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                        PDF
                    </button>
                    <button onClick={handleExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors">
                        <span className="material-symbols-outlined text-base">table_view</span>
                        Excel
                    </button>
                </div>
            </div>

            {/* Preview กระดาษ A4 */}
            <div className="flex justify-center">
                <div
                    ref={printRef}
                    id="cash-book-cover-print"
                    style={{
                        width: '210mm',
                        minHeight: '297mm',
                        background: '#fff',
                        padding: '20mm 18mm 20mm 18mm',
                        boxShadow: '0 4px 32px rgba(0,0,0,0.12)',
                        fontFamily: "'Sarabun', sans-serif",
                        fontSize: '14pt',
                        color: '#000',
                        position: 'relative',
                    }}
                >
                    {/* เอกสารหมายเลข 1 – มุมขวาบน */}
                    <div style={{
                        position: 'absolute', top: '14mm', right: '14mm',
                        border: '1px solid #000', padding: '1px 8px', fontSize: '11pt',
                        fontWeight: 'bold',
                    }}>
                        เอกสารหมายเลข 1
                    </div>

                    {/* ตาราง */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8mm' }}>
                        <thead>
                            {/* Row 1: ปีงบประมาณ */}
                            <tr>
                                <th colSpan={3} style={{
                                    border: '1px solid #000', textAlign: 'center',
                                    padding: '4px', fontSize: '14pt', fontWeight: 'bold',
                                }}>
                                    ปีงบประมาณ {fiscalYearBE}
                                </th>
                            </tr>
                            {/* Row 2: รายการเปิดบัญชี */}
                            <tr>
                                <th colSpan={3} style={{
                                    border: '1px solid #000', textAlign: 'center',
                                    padding: '4px', fontSize: '13pt',
                                }}>
                                    รายการเปิดบัญชี ณ วันที่ {fyStartDateStr}
                                </th>
                            </tr>
                            {/* Row 3: หัวคอลัมน์ */}
                            <tr>
                                <th style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 8px', width: '62%', fontSize: '13pt' }}>
                                    รายการ
                                </th>
                                <th style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 8px', width: '19%', fontSize: '13pt' }}>
                                    เดบิต
                                </th>
                                <th style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 8px', width: '19%', fontSize: '13pt' }}>
                                    เครดิต
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => (
                                <tr key={i}>
                                    <td style={{
                                        border: '1px solid #000', padding: '2px 8px', fontSize: '12pt',
                                        whiteSpace: 'pre',
                                    }}>
                                        {row.label}
                                    </td>
                                    <td style={{
                                        border: '1px solid #000', padding: '2px 8px', fontSize: '12pt',
                                        textAlign: 'right',
                                    }}>
                                        {row.debit !== null ? formatMoney(row.debit) : ''}
                                    </td>
                                    <td style={{
                                        border: '1px solid #000', padding: '2px 8px', fontSize: '12pt',
                                        textAlign: 'right',
                                    }}>
                                        {row.credit !== null ? formatMoney(row.credit) : ''}
                                    </td>
                                </tr>
                            ))}
                            {/* แถวว่าง 1 แถว */}
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '2px 8px' }}>&nbsp;</td>
                                <td style={{ border: '1px solid #000' }}></td>
                                <td style={{ border: '1px solid #000' }}></td>
                            </tr>
                            {/* รวมทั้งสิ้น */}
                            <tr>
                                <td style={{
                                    border: '1px solid #000', padding: '4px 8px',
                                    fontWeight: 'bold', fontSize: '13pt',
                                }}>
                                    รวมทั้งสิ้น
                                </td>
                                <td style={{
                                    border: '1px solid #000', padding: '4px 8px',
                                    textAlign: 'right', fontWeight: 'bold', fontSize: '13pt',
                                }}>
                                    {formatMoney(totalDebit)}
                                </td>
                                <td style={{
                                    border: '1px solid #000', padding: '4px 8px',
                                    textAlign: 'right', fontWeight: 'bold', fontSize: '13pt',
                                }}>
                                    {formatMoney(totalCredit)}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* ลายเซ็น */}
                    <div style={{ marginTop: '14mm', display: 'flex', flexDirection: 'column', gap: '10mm', paddingLeft: '10mm' }}>
                        {/* ผู้สรุป */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4mm' }}>
                            <span style={{ fontSize: '13pt', whiteSpace: 'nowrap' }}>ลงชื่อ</span>
                            <span style={{
                                borderBottom: '1px solid #000', flex: 1, maxWidth: '70mm', marginBottom: '2px',
                            }}></span>
                            <span style={{ fontSize: '13pt', whiteSpace: 'nowrap' }}>ผู้สรุป</span>
                            <div style={{ flex: 1 }}></div>
                        </div>
                        <div style={{ paddingLeft: '20mm', fontSize: '12pt', marginTop: '-8mm' }}>
                            ({schoolSettings.financeOfficerName || 'นางสาวทิพาธร ศิริเม'})
                        </div>

                        {/* หัวหน้าหน่วยงานย่อย */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4mm', marginTop: '4mm' }}>
                            <span style={{ fontSize: '13pt', whiteSpace: 'nowrap' }}>ลงชื่อ</span>
                            <span style={{
                                borderBottom: '1px solid #000', flex: 1, maxWidth: '70mm', marginBottom: '2px',
                            }}></span>
                            <span style={{ fontSize: '13pt', whiteSpace: 'nowrap' }}>หัวหน้าหน่วยงานย่อย</span>
                            <div style={{ flex: 1 }}></div>
                        </div>
                        <div style={{ paddingLeft: '20mm', fontSize: '12pt', marginTop: '-8mm' }}>
                            ({schoolSettings.directorName || 'นายจีราพัชร์ สารคร'})
                        </div>
                    </div>
                </div>
            </div>

            {/* Print CSS */}
            <style>{`
        @media print {
          body > * { display: none !important; }
          #cash-book-cover-print { display: block !important; }
          #cash-book-cover-print {
            position: fixed; top: 0; left: 0;
            width: 210mm; padding: 14mm 14mm;
            box-shadow: none;
          }
        }
      `}</style>
        </div>
    );
};

export default CashBookCover;
