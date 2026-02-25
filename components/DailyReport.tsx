
import React, { useState, useMemo } from 'react';
import { useSchoolData } from '../context/SchoolContext';
import { formatThaiDate, bahtText, formatThaiDateShort } from '../utils';
import ThaiDatePicker from './ThaiDatePicker';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { PDF_FONTS } from './pdfConfig';

interface DailyReportProps {
    initialDate?: string;
}

export const generateDailyReportPDF = async (reportDate: string, schoolSettings: any, transactions: any[]) => {
    const getBalance = (fundTypes: string[]) => {
        return transactions
            .filter(t => fundTypes.includes(t.fundType) && t.date <= reportDate)
            .reduce((acc, t) => acc + (t.income || 0) - (t.expense || 0), 0);
    };

    const taxBalance = getBalance(['fund-tax']);
    const eefBalance = getBalance(['fund-eef']);
    const lunchFundBalance = getBalance(['fund-lunch']);
    const lunchInterestBalance = getBalance(['fund-state-lunch-interest']);
    const totalLunchAccount = lunchFundBalance + lunchInterestBalance;

    const subsidyHeadBalance = getBalance(['fund-subsidy']);
    const bookBalance = getBalance(['fund-15y-book']);
    const supplyBalance = getBalance(['fund-15y-supply']);
    const uniformBalance = getBalance(['fund-15y-uniform']);
    const activityBalance = getBalance(['fund-15y-activity']);
    const poorBalance = getBalance(['fund-poor']);
    const subsidyInterestBalance = getBalance(['fund-state-subsidy-interest']);
    const totalSubsidyAccount = subsidyHeadBalance + bookBalance + supplyBalance + uniformBalance + activityBalance + poorBalance + subsidyInterestBalance;
    const schoolIncomeBalance = getBalance(['fund-school-income']);

    const reportData = [
        { id: 1, item: "เงินสดในมือ (ภาษีหัก ณ ที่จ่าย 1%)", amount: taxBalance, isHeader: false },
        { id: 2, item: "เช็ค", note: "ฉบับ", amount: 0, isHeader: false },
        { id: 3, item: "ธนาณัติ", note: "ฉบับ", amount: 0, isHeader: false },
        { id: 4, item: "ใบสำคัญรองจ่าย", note: "ฉบับ", amount: 0, isHeader: false },
        { id: 5, item: "ใบสำคัญรองจ่าย (รอเบิก)", note: "ฉบับ", amount: 0, isHeader: false },
        { id: 6, item: "สัญญารับรองการยืมเงิน", note: "ฉบับ", amount: 0, isHeader: false },
        { id: 7, item: "ใบเบิกเงินเพื่อจ่ายใช้ในราชการ", note: "ฉบับ", amount: 0, isHeader: false },
        { id: 8, item: "สมุดคู่ฝาก 4 เล่ม", amount: null, isHeader: true },
        { id: 9, item: "1. บช.เงิน กสศ.เพื่อโรงเรียน (นร.ยากจนพิเศษ)", amount: eefBalance, isHeader: false, indent: 1 },
        { id: 10, item: "2. บช.เงินอาหารกลางวันนักเรียน", amount: totalLunchAccount, isHeader: false, indent: 1, isAccountTotal: true },
        { id: 11, item: "    - เงินอาหารกลางวัน", amount: lunchFundBalance > 0 ? lunchFundBalance : null, isHeader: false, indent: 2, isDetail: true },
        { id: 11.1, item: "    - รายได้แผ่นดิน (ดอกเบี้ย)", amount: lunchInterestBalance > 0 ? lunchInterestBalance : null, isHeader: false, indent: 2, isDetail: true },
        { id: 12, item: "3. บช.เงินอุดหนุนอื่น (บัญชี ธกส.)", amount: totalSubsidyAccount, isHeader: false, indent: 1, isAccountTotal: true },
        { id: 13, item: "    - เงินค่ารายหัว (ค่าจัดการเรียนการสอน)", amount: subsidyHeadBalance > 0 ? subsidyHeadBalance : null, isHeader: false, indent: 2, isDetail: true },
        { id: 14, item: "    - เงินค่าหนังสือเรียน", amount: bookBalance > 0 ? bookBalance : null, isHeader: false, indent: 2, isDetail: true },
        { id: 15, item: "    - เงินค่าเครื่องแบบนักเรียน", amount: uniformBalance > 0 ? uniformBalance : null, isHeader: false, indent: 2, isDetail: true },
        { id: 16, item: "    - เงินอุปกรณ์การเรียน", amount: supplyBalance > 0 ? supplyBalance : null, isHeader: false, indent: 2, isDetail: true },
        { id: 17, item: "    - เงินค่ากิจกรรมพัฒนาคุณภาพผู้เรียน", amount: activityBalance > 0 ? activityBalance : null, isHeader: false, indent: 2, isDetail: true },
        { id: 18, item: "    - เงินปัจจัยพื้นฐานนักเรียนยากจน", amount: poorBalance > 0 ? poorBalance : null, isHeader: false, indent: 2, isDetail: true },
        { id: 19, item: "    - รายได้แผ่นดิน (ดอกเบี้ย)", amount: subsidyInterestBalance > 0 ? subsidyInterestBalance : null, isHeader: false, indent: 2, isDetail: true },
        { id: 20, item: "4. บช.เงินรายได้สถานศึกษา", amount: schoolIncomeBalance, isHeader: false, indent: 1 },
    ];

    const totalAmount = reportData.reduce((acc, curr) => {
        // @ts-ignore
        if (curr.isDetail || curr.amount === null) return acc;
        return acc + (curr.amount || 0);
    }, 0);

    const formatMoneyParts = (amount: number | null | undefined) => {
        if (amount === null || amount === undefined) return { baht: "", satang: "" };
        if (amount === 0) return { baht: "-", satang: "-" };
        const parts = amount.toFixed(2).split('.');
        return { baht: parseInt(parts[0]).toLocaleString(), satang: parts[1] };
    };

    try {
        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);
        const fontUrl = 'https://cdn.jsdelivr.net/gh/watchawin156/font@main/THSarabunNew.ttf';
        const fontBoldUrl = 'https://cdn.jsdelivr.net/gh/watchawin156/font@main/THSarabunNewBold.ttf';
        const [fontBytes, fontBoldBytes] = await Promise.all([fetch(fontUrl).then(res => res.arrayBuffer()), fetch(fontBoldUrl).then(res => res.arrayBuffer())]);
        const font = await pdfDoc.embedFont(fontBytes);
        const fontBold = await pdfDoc.embedFont(fontBoldBytes);
        const A4_WIDTH = 595.28;
        const A4_HEIGHT = 841.89;
        const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
        const margin = 30; // Reduce margin to fit all text
        let y = A4_HEIGHT - margin - 10;
        const drawCenterText = (text: string, yPos: number, size: number, isBold: boolean = false) => {
            const f = isBold ? fontBold : font;
            const textWidth = f.widthOfTextAtSize(text, size);
            page.drawText(text, { x: (A4_WIDTH - textWidth) / 2, y: yPos, size, font: f });
        };
        const drawCenterInBox = (text: string, x: number, w: number, yPos: number, size: number, isBold: boolean = false) => {
            const f = isBold ? fontBold : font;
            const textWidth = f.widthOfTextAtSize(text, size);
            page.drawText(text, { x: x + (w - textWidth) / 2, y: yPos, size, font: f });
        };
        drawCenterText("รายงานเงินคงเหลือประจำวัน (ปีงบประมาณ 2568)", y, PDF_FONTS.NORMAL, true);
        y -= 20;
        drawCenterText(`ส่วนราชการ ${schoolSettings.schoolNameTH}`, y, PDF_FONTS.NORMAL, false);
        y -= 20;
        drawCenterText(`ประจำวันที่ ${formatThaiDate(reportDate)}`, y, PDF_FONTS.NORMAL, false);
        y -= 10;
        const tableTop = y;
        const col1W = 340;
        const colBahtW = 100;
        const colSatangW = 30;
        const colNoteW = A4_WIDTH - margin * 2 - col1W - colBahtW - colSatangW;
        const rowHeight = 16;
        const x1 = margin;
        const x2 = x1 + col1W;
        const x3 = x2 + colBahtW;
        const x4 = x3 + colSatangW;
        const x5 = A4_WIDTH - margin;
        page.drawLine({ start: { x: x1, y: y }, end: { x: x5, y: y }, thickness: 1 });
        page.drawLine({ start: { x: x1, y: y - 25 }, end: { x: x5, y: y - 25 }, thickness: 1 });
        page.drawLine({ start: { x: x1, y: y }, end: { x: x1, y: y - 25 }, thickness: 1 });
        page.drawLine({ start: { x: x2, y: y }, end: { x: x2, y: y - 25 }, thickness: 1 });
        page.drawLine({ start: { x: x4, y: y }, end: { x: x4, y: y - 25 }, thickness: 1 });
        page.drawLine({ start: { x: x5, y: y }, end: { x: x5, y: y - 25 }, thickness: 1 });

        drawCenterInBox("รายการ", x1, col1W, y - 18, PDF_FONTS.TABLE_HEADER, true);
        drawCenterInBox("จำนวนเงิน", x2, colBahtW + colSatangW, y - 18, PDF_FONTS.TABLE_HEADER, true);
        drawCenterInBox("หมายเหตุ", x4, colNoteW, y - 18, PDF_FONTS.TABLE_HEADER, true);

        y -= 25;
        reportData.forEach((row) => {
            page.drawLine({ start: { x: x1, y: y }, end: { x: x1, y: y - rowHeight }, thickness: 1 });
            page.drawLine({ start: { x: x2, y: y }, end: { x: x2, y: y - rowHeight }, thickness: 1 });
            page.drawLine({ start: { x: x3, y: y }, end: { x: x3, y: y - rowHeight }, thickness: 1 });
            page.drawLine({ start: { x: x4, y: y }, end: { x: x4, y: y - rowHeight }, thickness: 1 });
            page.drawLine({ start: { x: x5, y: y }, end: { x: x5, y: y - rowHeight }, thickness: 1 });
            let itemX = x1 + 5;
            if (row.indent === 1) itemX += 15;
            if (row.indent === 2) itemX += 30;

            // @ts-ignore
            if (row.isAccountTotal && row.amount != null && row.amount > 0) {
                // แสดงยอดรวมต่อท้ายชื่อบัญชี เช่น "2. บช.เงินอาหารกลางวัน รวม 3,695.00 บาท"
                const amtStr = row.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const fullText = `${row.item} รวม ${amtStr} บาท`;
                page.drawText(fullText, { x: itemX, y: y - 12, size: PDF_FONTS.TABLE_DATA, font: font });
                // ไม่แสดงตัวเลขในคอลัมน์จำนวนเงิน
            } else {
                page.drawText(row.item, { x: itemX, y: y - 12, size: PDF_FONTS.TABLE_DATA, font: font });
                if (row.note) {
                    const tW = font.widthOfTextAtSize("-", PDF_FONTS.TABLE_DATA);
                    page.drawText("-", { x: x2 + (colBahtW / 2) - (tW / 2), y: y - 12, size: PDF_FONTS.TABLE_DATA, font: font });
                    page.drawText(row.note, { x: x4 + 5, y: y - 12, size: PDF_FONTS.TABLE_DATA, font: font });
                } else {
                    const { baht, satang } = formatMoneyParts(row.amount);
                    if (baht) {
                        const bW = font.widthOfTextAtSize(baht, PDF_FONTS.TABLE_DATA);
                        page.drawText(baht, { x: x3 - bW - 5, y: y - 12, size: PDF_FONTS.TABLE_DATA, font: font });
                        const sW = font.widthOfTextAtSize(satang, PDF_FONTS.TABLE_DATA);
                        page.drawText(satang, { x: x4 - sW - 5, y: y - 12, size: PDF_FONTS.TABLE_DATA, font: font });
                    }
                }
            }
            y -= rowHeight;
        });
        page.drawLine({ start: { x: x1, y: y }, end: { x: x5, y: y }, thickness: 1 });
        const totalHeight = 22;
        page.drawLine({ start: { x: x1, y: y - totalHeight }, end: { x: x5, y: y - totalHeight }, thickness: 1 });
        page.drawLine({ start: { x: x1, y: y }, end: { x: x1, y: y - totalHeight }, thickness: 1 });
        page.drawLine({ start: { x: x2, y: y }, end: { x: x2, y: y - totalHeight }, thickness: 1 });
        page.drawLine({ start: { x: x3, y: y }, end: { x: x3, y: y - totalHeight }, thickness: 1 });
        page.drawLine({ start: { x: x4, y: y }, end: { x: x4, y: y - totalHeight }, thickness: 1 });
        page.drawLine({ start: { x: x5, y: y }, end: { x: x5, y: y - totalHeight }, thickness: 1 });

        drawCenterInBox("รวม", x1, col1W, y - 16, PDF_FONTS.TABLE_HEADER, true);

        const totalParts = formatMoneyParts(totalAmount);
        const tBahtW = font.widthOfTextAtSize(totalParts.baht, PDF_FONTS.TABLE_DATA);
        page.drawText(totalParts.baht, { x: x3 - tBahtW - 5, y: y - 16, size: PDF_FONTS.TABLE_DATA, font: fontBold });
        const tSatangW = font.widthOfTextAtSize(totalParts.satang, PDF_FONTS.TABLE_DATA);
        page.drawText(totalParts.satang, { x: x4 - tSatangW - 5, y: y - 16, size: PDF_FONTS.TABLE_DATA, font: fontBold });
        y -= totalHeight;
        y -= 25;
        const thaiBahtStr = bahtText(totalAmount);
        page.drawText(`จำนวนเงิน (ตัวอักษร) ${thaiBahtStr}`, { x: x1 + 5, y: y, size: PDF_FONTS.NORMAL, font: font });
        y -= 20;

        // Single person signature block
        drawCenterText("ลงชื่อ......................................................", y, PDF_FONTS.NORMAL);
        y -= 16;
        drawCenterText(schoolSettings.financeOfficerName || "(......................................................)", y, PDF_FONTS.NORMAL);
        y -= 14;
        drawCenterText("หัวหน้าหน่วยงานย่อย", y, PDF_FONTS.NORMAL);
        y -= 10;

        page.drawLine({ start: { x: x1, y: y }, end: { x: x5, y: y }, thickness: 1 });
        y -= 16;
        page.drawText("คณะกรรมการการเก็บรักษาเงิน ได้ตรวจนับเงินและหลักฐานแทนตัวเงินถูกต้อง ตามรายการข้างต้นแล้ว จึงได้รับมอบ", { x: x1, y: y, size: PDF_FONTS.NORMAL, font: font });
        y -= 16;
        page.drawText("รักษาไว้ในลักษณะหีบห่อ", { x: x1, y: y, size: PDF_FONTS.NORMAL, font: font });
        y -= 25;

        // Committee Signatures
        const dots = ".............................................";
        drawCenterText(dots, y, PDF_FONTS.NORMAL);
        page.drawText(dots, { x: margin + 10, y: y, size: PDF_FONTS.NORMAL, font: font });
        page.drawText(dots, { x: A4_WIDTH - margin - font.widthOfTextAtSize(dots, PDF_FONTS.NORMAL) - 10, y: y, size: PDF_FONTS.NORMAL, font: font });
        y -= 16;
        drawCenterText("กรรมการ", y, PDF_FONTS.NORMAL);
        const c1x = margin + 10 + font.widthOfTextAtSize(dots, PDF_FONTS.NORMAL) / 2 - font.widthOfTextAtSize("กรรมการ", PDF_FONTS.NORMAL) / 2;
        page.drawText("กรรมการ", { x: c1x, y: y, size: PDF_FONTS.NORMAL, font: font });
        const c3x = (A4_WIDTH - margin - font.widthOfTextAtSize(dots, PDF_FONTS.NORMAL) - 10) + font.widthOfTextAtSize(dots, PDF_FONTS.NORMAL) / 2 - font.widthOfTextAtSize("กรรมการ", PDF_FONTS.NORMAL) / 2;
        page.drawText("กรรมการ", { x: c3x, y: y, size: PDF_FONTS.NORMAL, font: font });

        y -= 15;
        page.drawLine({ start: { x: x1, y: y }, end: { x: x5, y: y }, thickness: 1 });
        y -= 20;
        page.drawText(`ข้าพเจ้าผู้ได้รับมอบหมายได้รับเงินและเอกสารตัวเงินตามรายละเอียดข้างต้นนี้ไปแล้ว เมื่อวันที่.......เดือน.......................พ.ศ..........`, { x: x1, y: y, size: PDF_FONTS.NORMAL, font: font });
        y -= 20;

        // Final Signatures
        const role2 = "ผู้รับเงิน";
        const role3 = "หัวหน้าหน่วยงานย่อย";
        const dots2 = "ลงชื่อ......................................................";
        const d2w = font.widthOfTextAtSize(dots2, PDF_FONTS.NORMAL);

        // Align by the dots text, left-aligned starting point rather than center of varying total length
        const startX_sig = A4_WIDTH / 2 - (d2w + font.widthOfTextAtSize(' ' + role3, PDF_FONTS.NORMAL)) / 2;

        page.drawText(dots2, { x: startX_sig, y: y, size: PDF_FONTS.NORMAL, font: font });
        page.drawText(` ${role2}`, { x: startX_sig + d2w, y: y, size: PDF_FONTS.NORMAL, font: font });
        y -= 20;

        page.drawText(dots2, { x: startX_sig, y: y, size: PDF_FONTS.NORMAL, font: font });
        page.drawText(` ${role3}`, { x: startX_sig + d2w, y: y, size: PDF_FONTS.NORMAL, font: font });
        y -= 10;

        page.drawLine({ start: { x: x1, y: y }, end: { x: x5, y: y }, thickness: 1 });
        y -= 16;
        page.drawText(`หมายเหตุ วันที่ ${formatThaiDate(new Date(new Date().setDate(new Date().getDate() - 2)))} - วันที่ ${formatThaiDate(new Date(new Date().setDate(new Date().getDate() - 1)))} ไม่มีรายการรับจ่ายเงิน`, { x: x1, y: y, size: PDF_FONTS.NORMAL, font: font });
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
        window.open(URL.createObjectURL(blob), '_blank');
    } catch (error) {
        console.error("PDF Error", error);
        alert("ไม่สามารถสร้าง PDF ได้");
    }
};

const DailyReport: React.FC<DailyReportProps> = ({ initialDate }) => {
    const [reportDate, setReportDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
    const { schoolSettings, transactions } = useSchoolData();

    // Get active dates (dates with transactions)
    const activeDates = useMemo(() => {
        const dates = new Set(transactions.map((t) => t.date));
        return Array.from(dates).sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());
    }, [transactions]);

    // Helper to calculate balance for specific funds up to the report date
    const getBalance = (fundTypes: string[]) => {
        return transactions
            .filter(t => fundTypes.includes(t.fundType) && t.date <= reportDate)
            .reduce((acc, t) => acc + (t.income || 0) - (t.expense || 0), 0);
    };

    // --- Calculate Real-time Balances ---
    const taxBalance = getBalance(['fund-tax']);
    const eefBalance = getBalance(['fund-eef']);
    const lunchFundBalance = getBalance(['fund-lunch']);
    const lunchInterestBalance = getBalance(['fund-state-lunch-interest']);
    const totalLunchAccount = lunchFundBalance + lunchInterestBalance;

    const subsidyHeadBalance = getBalance(['fund-subsidy']);
    const bookBalance = getBalance(['fund-15y-book']);
    const supplyBalance = getBalance(['fund-15y-supply']);
    const uniformBalance = getBalance(['fund-15y-uniform']);
    const activityBalance = getBalance(['fund-15y-activity']);
    const poorBalance = getBalance(['fund-poor']);
    const subsidyInterestBalance = getBalance(['fund-state-subsidy-interest']);
    const totalSubsidyAccount = subsidyHeadBalance + bookBalance + supplyBalance + uniformBalance + activityBalance + poorBalance + subsidyInterestBalance;
    const schoolIncomeBalance = getBalance(['fund-school-income']);

    const reportData = [
        { id: 1, item: "เงินสดในมือ (ภาษีหัก ณ ที่จ่าย 1%)", amount: taxBalance, isHeader: false },
        { id: 2, item: "เช็ค", note: "ฉบับ", amount: 0, isHeader: false },
        { id: 3, item: "ธนาณัติ", note: "ฉบับ", amount: 0, isHeader: false },
        { id: 4, item: "ใบสำคัญรองจ่าย", note: "ฉบับ", amount: 0, isHeader: false },
        { id: 5, item: "ใบสำคัญรองจ่าย (รอเบิก)", note: "ฉบับ", amount: 0, isHeader: false },
        { id: 6, item: "สัญญารับรองการยืมเงิน", note: "ฉบับ", amount: 0, isHeader: false },
        { id: 7, item: "ใบเบิกเงินเพื่อจ่ายใช้ในราชการ", note: "ฉบับ", amount: 0, isHeader: false },
        { id: 8, item: "สมุดคู่ฝาก 4 เล่ม", amount: null, isHeader: true },
        { id: 9, item: "1. บช.เงิน กสศ.เพื่อโรงเรียน (นร.ยากจนพิเศษ)", amount: eefBalance, isHeader: false, indent: 1 },
        { id: 10, item: "2. บช.เงินอาหารกลางวันนักเรียน", amount: totalLunchAccount, isHeader: false, indent: 1 },
        { id: 11, item: "    - เงินอาหารกลางวัน", amount: lunchFundBalance > 0 ? lunchFundBalance : null, isHeader: false, indent: 2, isDetail: true },
        { id: 11.1, item: "    - รายได้แผ่นดิน (ดอกเบี้ย)", amount: lunchInterestBalance > 0 ? lunchInterestBalance : null, isHeader: false, indent: 2, isDetail: true },
        { id: 12, item: "3. บช.เงินอุดหนุนอื่น (บัญชี ธกส.)", amount: totalSubsidyAccount, isHeader: false, indent: 1 },
        { id: 13, item: "    - เงินค่ารายหัว (ค่าจัดการเรียนการสอน)", amount: subsidyHeadBalance > 0 ? subsidyHeadBalance : null, isHeader: false, indent: 2, isDetail: true },
        { id: 14, item: "    - เงินค่าหนังสือเรียน", amount: bookBalance > 0 ? bookBalance : null, isHeader: false, indent: 2, isDetail: true },
        { id: 15, item: "    - เงินค่าเครื่องแบบนักเรียน", amount: uniformBalance > 0 ? uniformBalance : null, isHeader: false, indent: 2, isDetail: true },
        { id: 16, item: "    - เงินอุปกรณ์การเรียน", amount: supplyBalance > 0 ? supplyBalance : null, isHeader: false, indent: 2, isDetail: true },
        { id: 17, item: "    - เงินค่ากิจกรรมพัฒนาคุณภาพผู้เรียน", amount: activityBalance > 0 ? activityBalance : null, isHeader: false, indent: 2, isDetail: true },
        { id: 18, item: "    - เงินปัจจัยพื้นฐานนักเรียนยากจน", amount: poorBalance > 0 ? poorBalance : null, isHeader: false, indent: 2, isDetail: true },
        { id: 19, item: "    - รายได้แผ่นดิน (ดอกเบี้ย)", amount: subsidyInterestBalance > 0 ? subsidyInterestBalance : null, isHeader: false, indent: 2, isDetail: true },
        { id: 20, item: "4. บช.เงินรายได้สถานศึกษา", amount: schoolIncomeBalance, isHeader: false, indent: 1 },
    ];

    const totalAmount = reportData.reduce((acc, curr) => {
        // @ts-ignore
        if (curr.isDetail || curr.amount === null) return acc;
        return acc + (curr.amount || 0);
    }, 0);

    const formatMoneyParts = (amount: number | null | undefined) => {
        if (amount === null || amount === undefined) return { baht: "", satang: "" };
        if (amount === 0) return { baht: "-", satang: "-" };
        const parts = amount.toFixed(2).split('.');
        return { baht: parseInt(parts[0]).toLocaleString(), satang: parts[1] };
    };

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark p-4 md:p-8 flex gap-6">

            {/* Main Report Area - Center (Moved Left) */}
            <div className="flex-1 flex justify-center items-start">
                <div
                    className="bg-white dark:bg-surface-dark shadow-lg p-[15mm] relative print:shadow-none print:m-0 print:w-full transition-all min-h-[297mm] w-[210mm] box-border"
                >
                    {/* Content */}
                    <div className="text-center space-y-2 mb-6 text-black">
                        <h1 className="text-xl font-bold leading-tight">รายงานเงินคงเหลือประจำวัน (ปีงบประมาณ 2568)</h1>
                        <h2 className="text-base font-normal leading-tight">ส่วนราชการ {schoolSettings.schoolNameTH}</h2>
                        <h3 className="text-base font-normal leading-tight">ประจำวันที่ {formatThaiDate(reportDate)}</h3>
                    </div>

                    <div className="border border-black text-sm text-black">
                        <div className="flex border-b border-black font-bold bg-gray-100 print:bg-transparent">
                            <div className="flex-1 p-2 text-center border-r border-black">รายการ</div>
                            <div className="w-32 text-center border-r border-black">
                                <div className="border-b border-black p-1">จำนวนเงิน</div>
                                <div className="flex h-full">
                                    <div className="w-[70%] border-r border-black"></div>
                                    <div className="w-[30%]"></div>
                                </div>
                            </div>
                            <div className="w-20 p-2 text-center">หมายเหตุ</div>
                        </div>
                        {reportData.map((row) => {
                            const { baht, satang } = formatMoneyParts(row.amount);
                            return (
                                <div key={row.id} className="flex border-b border-black last:border-0 h-8 items-center">
                                    <div className="flex-1 px-2 border-r border-black h-full flex items-center whitespace-nowrap overflow-hidden text-ellipsis">
                                        <span style={{ paddingLeft: `${row.indent ? row.indent * 1.5 : 0}rem` }}>
                                            {row.item}
                                        </span>
                                    </div>
                                    <div className="w-32 flex border-r border-black h-full">
                                        <div className="w-[70%] border-r border-black h-full flex items-center justify-end px-1 font-mono">
                                            {row.note ? '-' : baht}
                                        </div>
                                        <div className="w-[30%] h-full flex items-center justify-center font-mono">
                                            {satang}
                                        </div>
                                    </div>
                                    <div className="w-20 px-1 text-center h-full flex items-center justify-center text-xs">
                                        {row.note || ''}
                                    </div>
                                </div>
                            );
                        })}
                        <div className="flex border-t border-black font-bold bg-gray-50 print:bg-transparent h-8 items-center">
                            <div className="flex-1 px-2 text-right border-r border-black h-full flex items-center justify-end">รวม</div>
                            <div className="w-32 flex border-r border-black h-full">
                                <div className="w-[70%] border-r border-black h-full flex items-center justify-end px-1 font-mono">
                                    {formatMoneyParts(totalAmount).baht}
                                </div>
                                <div className="w-[30%] h-full flex items-center justify-center font-mono">
                                    {formatMoneyParts(totalAmount).satang}
                                </div>
                            </div>
                            <div className="w-20 border-black h-full"></div>
                        </div>
                    </div>
                    <div className="mt-2 text-sm text-black border-b border-black pb-4">
                        จำนวนเงิน (ตัวอักษร) {bahtText(totalAmount)}
                    </div>
                    <div className="mt-8 text-center space-y-6 text-sm text-black border-b border-black pb-6">
                        <div>
                            <p>ลงชื่อ......................................................</p>
                            <p>{schoolSettings.financeOfficerName || "( เจ้าหน้าที่การเงิน )"}</p>
                            <p className="mt-1">หัวหน้าหน่วยงานย่อย</p>
                        </div>
                    </div>

                    <div className="mt-4 text-xs text-center text-gray-400">...ส่วนท้ายรายงาน...</div>
                </div>
            </div>

            {/* Activity Dates Sidebar - Right (Moved from Left) */}
            <div className="w-72 shrink-0 flex flex-col gap-4">
                <div className="bg-white dark:bg-surface-dark p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 sticky top-6">
                    {/* Controls Area */}
                    <div className="mb-6 space-y-4">
                        <div>
                            <ThaiDatePicker value={reportDate} onChange={setReportDate} />
                        </div>
                        <button
                            onClick={handlePrintPDF}
                            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all font-bold flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">picture_as_pdf</span>
                            พิมพ์รายงาน (PDF)
                        </button>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                        <h3 className="font-bold text-text dark:text-text-dark mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <span className="material-symbols-outlined text-primary text-lg">calendar_month</span>
                            วันที่เคลื่อนไหวล่าสุด
                        </h3>
                        <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                            {activeDates.map(date => (
                                <button
                                    key={date}
                                    onClick={() => setReportDate(date)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex justify-between items-center group ${reportDate === date
                                        ? 'bg-primary text-white font-bold shadow-md shadow-blue-500/20'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-text-muted hover:text-text'
                                        }`}
                                >
                                    <span>{formatThaiDateShort(date)}</span>
                                    {reportDate === date && <span className="material-symbols-outlined text-sm bg-white/20 rounded-full p-0.5">check</span>}
                                </button>
                            ))}
                            {activeDates.length === 0 && (
                                <div className="text-center text-xs text-text-muted py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    ไม่มีรายการเคลื่อนไหว
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default DailyReport;
