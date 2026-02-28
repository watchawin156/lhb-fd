import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { PDF_FONTS } from './pdfConfig';
import * as XLSX from 'xlsx';
import { formatThaiDate, getFiscalYear, numToThaiText } from '../utils';
import { Transaction } from '../types';

const getCleanTitle = (t: string) => {
    return t.replace(/^[\d\.]+\s*/, '');
};

const getFilteredData = (
    transactions: Transaction[],
    pageTransactions: Transaction[],
    pageId: string,
    exportStartDate: string,
    exportEndDate: string
) => {
    const start = new Date(exportStartDate).getTime();
    const end = new Date(exportEndDate).getTime();
    const previousTransactions = transactions.filter(t => t.fundType === pageId && new Date(t.date).getTime() < start);
    const broughtForward = previousTransactions.reduce((acc, t) => acc + (t.income || 0) - (t.expense || 0), 0);
    const periodTransactions = pageTransactions.filter(t => {
        const tTime = new Date(t.date).getTime();
        return tTime >= start && tTime <= end;
    });
    const totalIncome = periodTransactions.reduce((acc, t) => acc + (t.income || 0), 0);
    const totalExpense = periodTransactions.reduce((acc, t) => acc + (t.expense || 0), 0);
    const carriedForward = broughtForward + totalIncome - totalExpense;
    return { broughtForward, periodTransactions, totalIncome, totalExpense, carriedForward };
};

export const handleExportExcel = (
    pageId: string,
    title: string,
    exportStartDate: string,
    exportEndDate: string,
    transactions: Transaction[],
    pageTransactions: Transaction[]
) => {
    const { broughtForward, periodTransactions, totalIncome, totalExpense, carriedForward } = getFilteredData(
        transactions, pageTransactions, pageId, exportStartDate, exportEndDate
    );
    const fiscalYear = getFiscalYear(exportEndDate);
    const cleanTitle = getCleanTitle(title);
    const wsData = [
        ["ทะเบียนคุมเงินนอกงบประมาณ"],
        [`ประเภท ${cleanTitle} (ปีงบประมาณ ${fiscalYear})`],
        ["วันที่/เดือน/ปี", "ที่เอกสาร", "รายการ", "รับจาก/จ่ายให้", "รายรับ", "รายจ่าย", "คงเหลือ"],
        [formatThaiDate(exportStartDate), "", "ยอดยกมา", "", "", "", broughtForward]
    ];
    let runningBalance = broughtForward;
    const reportSortedTransactions = [...periodTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    reportSortedTransactions.forEach(t => {
        runningBalance = runningBalance + (t.income || 0) - (t.expense || 0);
        wsData.push([formatThaiDate(t.date), t.docNo || "", t.description || "", t.income > 0 ? (t.payer || '-') : (t.payee || '-'), t.income || "", t.expense || "", runningBalance]);
    });
    wsData.push(["", "", "รวมรับ-จ่าย", "", totalIncome, totalExpense, ""]);
    wsData.push(["", "", "ยอดยกไป", "", "", "", carriedForward]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "รายงาน");
    XLSX.writeFile(wb, `${cleanTitle}_${exportStartDate}_${exportEndDate}.xlsx`);
};

export const handleExportPDF = async (
    pageId: string,
    title: string,
    exportStartDate: string,
    exportEndDate: string,
    transactions: Transaction[],
    pageTransactions: Transaction[],
    schoolSettings: any
) => {
    const { broughtForward, periodTransactions, totalIncome, totalExpense, carriedForward } = getFilteredData(
        transactions, pageTransactions, pageId, exportStartDate, exportEndDate
    );
    const fiscalYear = getFiscalYear(exportEndDate);
    const cleanTitle = getCleanTitle(title);

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const [fReg, fBold] = await Promise.all([
        fetch('https://cdn.jsdelivr.net/gh/watchawin156/font@main/THSarabunNew.ttf').then(r => r.arrayBuffer()),
        fetch('https://cdn.jsdelivr.net/gh/watchawin156/font@main/THSarabunNewBold.ttf').then(r => r.arrayBuffer()),
    ]);
    const font = await pdfDoc.embedFont(fReg);
    const fontBold = await pdfDoc.embedFont(fBold);

    const FS = PDF_FONTS.NORMAL;
    const FS_TABLE = PDF_FONTS.TABLE_DATA;
    const BLK = rgb(0, 0, 0);
    const PW = 595.28, PH = 841.89;
    const mL = 36, mR = 36;
    const tableW = PW - mL - mR;

    const fmtDate = (dateStr: string) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = String(d.getFullYear() + 543);
        return `${dd}/${mm}/${yyyy}`;
    };

    const cDate = 76;
    const cDoc = 80;
    const cAmt = 80;
    const cDesc = tableW - cDate - cDoc - cAmt * 3;

    const cols = [cDate, cDoc, cDesc, cAmt, cAmt, cAmt];
    const hdrs = ['วันที่', 'ที่เอกสาร', 'รายการ', 'รายรับ', 'รายจ่าย', 'คงเหลือ'];
    const aln = ['c', 'c', 'l', 'r', 'r', 'r'] as const;

    const RH = FS + 6;

    if (pageId === 'fund-safekeeping') {
        let sPage = pdfDoc.addPage([PW, PH]);
        let sy = PH - 60;

        const dc = (t: string, yy: number, b = false) => {
            const f = b ? fontBold : font;
            const tw = f.widthOfTextAtSize(t, FS);
            sPage.drawText(t, { x: (PW - tw) / 2, y: yy, size: FS, font: f, color: BLK });
        };

        dc(`บันทึกการรับเงินเพื่อเก็บรักษา (ปีงบประมาณ ${fiscalYear})`, sy, true);
        sy -= 24;
        const addr = schoolSettings.schoolNameTH ? `โรงเรียน${schoolSettings.schoolNameTH.replace('โรงเรียน', '')}` : '';
        dc(`สถานศึกษา ${addr} ${schoolSettings.address || ''}`, sy, true);

        sy -= 24;
        const dateParts = new Date(exportEndDate);
        const thaiM = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        dc(`วันที่ ${dateParts.getDate()} เดือน${thaiM[dateParts.getMonth()]} พ.ศ.${dateParts.getFullYear() + 543}`, sy, false);

        sy -= 30;
        sPage.drawText('ข้าพเจ้าได้รับเงินงบประมาณคงเหลือตามรายงานดังต่อไปนี้', { x: mL + 36, y: sy, size: FS, font, color: BLK });

        sy -= 20;
        const hH = 20, rH = 20;
        const cW1 = PW - mL - mR - 100 - 100;
        const cW2 = 100;
        const cW3 = 100;

        sPage.drawRectangle({ x: mL, y: sy - hH, width: PW - mL - mR, height: hH, borderColor: BLK, borderWidth: 0.8 });
        sPage.drawLine({ start: { x: mL + cW1, y: sy }, end: { x: mL + cW1, y: sy - hH }, thickness: 0.6, color: BLK });
        sPage.drawLine({ start: { x: mL + cW1 + cW2, y: sy }, end: { x: mL + cW1 + cW2, y: sy - hH }, thickness: 0.6, color: BLK });

        const ct = (t: string, w: number, x: number, yy: number) => {
            const tw = font.widthOfTextAtSize(t, FS_TABLE);
            sPage.drawText(t, { x: x + (w - tw) / 2, y: yy, size: FS_TABLE, font, color: BLK });
        };
        ct('รายการ', cW1, mL, sy - 14);
        ct('จำนวนเงิน', cW2, mL + cW1, sy - 14);
        ct('หมายเหตุ', cW3, mL + cW1 + cW2, sy - 14);

        sy -= hH;
        const sorted = [...periodTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let total = 0;

        const dr = (t1: string, t2: string, t3: string) => {
            sPage.drawRectangle({ x: mL, y: sy - rH, width: PW - mL - mR, height: rH, borderColor: BLK, borderWidth: 0.4 });
            sPage.drawLine({ start: { x: mL + cW1, y: sy }, end: { x: mL + cW1, y: sy - rH }, thickness: 0.4, color: BLK });
            sPage.drawLine({ start: { x: mL + cW1 + cW2, y: sy }, end: { x: mL + cW1 + cW2, y: sy - rH }, thickness: 0.4, color: BLK });
            sPage.drawText(t1, { x: mL + 8, y: sy - 14, size: FS_TABLE, font, color: BLK });
            const tw2 = font.widthOfTextAtSize(t2, FS_TABLE);
            sPage.drawText(t2, { x: mL + cW1 + cW2 - tw2 - 8, y: sy - 14, size: FS_TABLE, font, color: BLK });
            sPage.drawText(t3, { x: mL + cW1 + cW2 + 8, y: sy - 14, size: FS_TABLE, font, color: BLK });
            sy -= rH;
        };

        for (const t of sorted) {
            if (t.income > 0) {
                dr(t.description || '', t.income.toLocaleString('th-TH', { minimumFractionDigits: 2 }), '');
                total += t.income;
            }
        }

        const curRows = sorted.filter(t => t.income > 0).length;
        for (let i = 0; i < 7 - curRows; i++) dr('', '', '');

        sPage.drawRectangle({ x: mL, y: sy - rH, width: PW - mL - mR, height: rH, borderColor: BLK, borderWidth: 0.8 });
        sPage.drawLine({ start: { x: mL + cW1, y: sy }, end: { x: mL + cW1, y: sy - rH }, thickness: 0.6, color: BLK });
        sPage.drawLine({ start: { x: mL + cW1 + cW2, y: sy }, end: { x: mL + cW1 + cW2, y: sy - rH }, thickness: 0.6, color: BLK });

        const twR = fontBold.widthOfTextAtSize('รวม', FS_TABLE);
        sPage.drawText('รวม', { x: mL + cW1 - twR - 8, y: sy - 14, size: FS_TABLE, font: fontBold, color: BLK });
        const fTotal = total.toLocaleString('th-TH', { minimumFractionDigits: 2 });
        const twA = font.widthOfTextAtSize(fTotal, FS_TABLE);
        sPage.drawText(fTotal, { x: mL + cW1 + cW2 - twA - 8, y: sy - 14, size: FS_TABLE, font, color: BLK });
        sy -= rH;

        sPage.drawRectangle({ x: mL, y: sy - rH, width: PW - mL - mR, height: rH, borderColor: BLK, borderWidth: 0.8 });
        sPage.drawText('จำนวนเงิน (ตัวอักษร)   ' + numToThaiText(total), { x: mL + 8, y: sy - 14, size: FS_TABLE, font, color: BLK });
        sy -= rH;

        sy -= 30;
        sPage.drawText('ข้าพเจ้าจะรับผิดชอบในการเก็บรักษาเงินดังกล่าว และจะส่งคืนให้เจ้าหน้าที่การเงินเพื่อจ่ายในวันทำการถัดไป', { x: (PW - font.widthOfTextAtSize('ข้าพเจ้าจะรับผิดชอบในการเก็บรักษาเงินดังกล่าว และจะส่งคืนให้เจ้าหน้าที่การเงินเพื่อจ่ายในวันทำการถัดไป', FS)) / 2, y: sy, size: FS, font, color: BLK });

        sy -= 40;
        const sigT1 = 'ลงชื่อ.......................................................หัวหน้าสถานศึกษา';
        const sigT2 = `(${schoolSettings?.directorName || '                                     '})`;
        const sw1 = font.widthOfTextAtSize(sigT1, FS);
        const sw2 = font.widthOfTextAtSize(sigT2, FS);
        sPage.drawText(sigT1, { x: PW - mR - sw1 - 20, y: sy, size: FS, font, color: BLK });
        sPage.drawText(sigT2, { x: PW - mR - 20 - sw1 + (sw1 - sw2) / 2, y: sy - 20, size: FS, font, color: BLK });

        const bytes = await pdfDoc.save();
        window.open(URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })), '_blank');
        return;
    }

    if (pageId === 'fund-state' || pageId === 'fund-state-subsidy-interest' || pageId === 'fund-state-lunch-interest') {
        const isLandscape = false;

        const targetFunds = ['fund-state', 'fund-state-subsidy-interest', 'fund-state-lunch-interest'];
        const combinedTxs = transactions
            .filter(t => targetFunds.includes(t.fundType) && t.date >= exportStartDate && t.date <= exportEndDate)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const uniqueDates = Array.from(new Set(combinedTxs.map(t => t.date)));
        if (uniqueDates.length === 0) uniqueDates.push(exportEndDate);

        for (const currentDate of uniqueDates) {
            let sPage = pdfDoc.addPage(isLandscape ? [PH, PW] : [PW, PH]);
            const W = isLandscape ? PH : PW;
            const H = isLandscape ? PW : PH;
            let sy = H - 36;

            const dc = (t: string, yy: number, b = false, c = BLK) => {
                const f = b ? fontBold : font;
                const tw = f.widthOfTextAtSize(t, FS);
                sPage.drawText(t, { x: (W - tw) / 2, y: yy, size: FS, font: f, color: c });
            };

            if (!isLandscape) {
                dc('ทะเบียนคุมเงินนอกงบประมาณ', sy, true); sy -= 20;
                dc(`เงินรายได้แผ่นดิน (ปีงบประมาณ ${fiscalYear})`, sy, true); sy -= 24;
            } else {
                sPage.drawText('กระดาษทำการหมายเลข 7', { x: W - mR - 120, y: sy, size: FS, font, color: BLK });
                dc(`ทะเบียนคุมเงินรายได้แผ่นดิน ปีงบประมาณ ${fiscalYear}`, sy, true); sy -= 24;
            }

            const dayStartMs = new Date(currentDate).getTime();
            const bfTxs = transactions.filter(t => targetFunds.includes(t.fundType) && new Date(t.date).getTime() < dayStartMs);
            const bf = bfTxs.reduce((acc, t) => acc + (t.income || 0) - (t.expense || 0), 0);

            let runBal = bf;

            const cDate = 70, cDoc = 70, cAmt = 60, cType = 60;
            let customCols: number[] = []; let customHdrs: string[] = [];
            if (isLandscape) {
                const cDesc = W - mL - mR - cDate - cDoc - (cType * 4) - cAmt;
                customCols = [cDate, cDoc, cDesc, cType, cType, cType, cType, cAmt];
                customHdrs = ['วันที่', 'ที่เอกสาร', 'รายการ', 'ดบ.อุดหนุน', 'ดบ.อาหารฯ', 'กสศ', 'พระราชทาน', 'รวม'];
            } else {
                const cDesc = W - mL - mR - cDate - cDoc - (cType * 2) - (cAmt * 3);
                customCols = [cDate, cDoc, cDesc, cType, cType, cAmt, cAmt, cAmt];
                customHdrs = ['วันที่', 'ที่เอกสาร', 'รายการ', 'เงินอุดหนุน', 'อาหารกลางวัน', 'รายรับ', 'รายจ่าย', 'คงเหลือ'];
            }
            const customAln = customCols.map((_, i) => (i < 2 ? 'c' : i === 2 ? 'l' : 'r'));

            const dr = (yy: number, cells: string[], b = false) => {
                const h = FS_TABLE + 6;
                sPage.drawRectangle({ x: mL, y: yy - h, width: W - mL - mR, height: h, borderColor: BLK, borderWidth: 0.4 });
                let cx = mL;
                customCols.forEach((cw, i) => {
                    if (i > 0) sPage.drawLine({ start: { x: cx, y: yy }, end: { x: cx, y: yy - h }, thickness: 0.4, color: BLK });
                    let t = cells[i] || '';
                    const f = b ? fontBold : font;
                    const PAD = 4;
                    let currentSize = FS_TABLE;
                    const fullW = f.widthOfTextAtSize(t, FS_TABLE);
                    if (fullW > cw - PAD * 2) {
                        const scale = (cw - PAD * 2) / fullW;
                        currentSize = Math.max(8, FS_TABLE * scale);
                        if (currentSize === 8) {
                            while (t.length > 0 && f.widthOfTextAtSize(t, 8) > cw - PAD * 2) t = t.slice(0, -1);
                        }
                    }
                    const tw = f.widthOfTextAtSize(t, currentSize);
                    let xPos = cx + PAD;
                    if (customAln[i] === 'c') xPos = cx + (cw - tw) / 2;
                    if (customAln[i] === 'r') xPos = cx + cw - tw - PAD;

                    const yAdjust = (FS_TABLE - currentSize) / 2;
                    sPage.drawText(t, { x: xPos, y: yy - h + 5 + yAdjust, size: currentSize, font: f, color: BLK });
                    cx += cw;
                });
                return yy - h;
            };

            const hHead = FS_TABLE + 6;
            sPage.drawRectangle({ x: mL, y: sy - hHead * 2, width: W - mL - mR, height: hHead * 2, borderColor: BLK, borderWidth: 0.8 });
            let cxH = mL;
            customCols.forEach((cw, i) => {
                if (i > 0) {
                    const isInsideMerged = isLandscape ? (i >= 4 && i <= 6) : (i === 4);
                    const lineTopY = isInsideMerged ? sy - hHead : sy;
                    sPage.drawLine({ start: { x: cxH, y: lineTopY }, end: { x: cxH, y: sy - hHead * 2 }, thickness: 0.6, color: BLK });
                }
                if (!isLandscape && i >= 3 && i <= 4) {
                    if (i === 3) {
                        const th = 'ประเภทของบัญชี';
                        const tw = fontBold.widthOfTextAtSize(th, FS_TABLE);
                        sPage.drawText(th, { x: cxH + (cw * 2 - tw) / 2, y: sy - hHead + 5, size: FS_TABLE, font: fontBold, color: BLK });
                        sPage.drawLine({ start: { x: cxH, y: sy - hHead }, end: { x: cxH + cw * 2, y: sy - hHead }, thickness: 0.6 });
                    }
                    const th2 = customHdrs[i];
                    const tw2 = fontBold.widthOfTextAtSize(th2, FS_TABLE);
                    sPage.drawText(th2, { x: cxH + (cw - tw2) / 2, y: sy - hHead * 2 + 5, size: FS_TABLE, font: fontBold, color: BLK });
                } else if (isLandscape && i >= 3 && i <= 6) {
                    if (i === 3) {
                        const th = 'ประเภทเงินรายได้แผ่นดิน';
                        const tw = fontBold.widthOfTextAtSize(th, FS_TABLE);
                        sPage.drawText(th, { x: cxH + (cw * 4 - tw) / 2, y: sy - hHead + 5, size: FS_TABLE, font: fontBold, color: BLK });
                        sPage.drawLine({ start: { x: cxH, y: sy - hHead }, end: { x: cxH + cw * 4, y: sy - hHead }, thickness: 0.6 });
                    }
                    const th2 = customHdrs[i];
                    const tw2 = fontBold.widthOfTextAtSize(th2, FS_TABLE);
                    sPage.drawText(th2, { x: cxH + (cw - tw2) / 2, y: sy - hHead * 2 + 5, size: FS_TABLE, font: fontBold, color: BLK });
                } else {
                    const th = customHdrs[i];
                    const tw = fontBold.widthOfTextAtSize(th, FS_TABLE);
                    sPage.drawText(th, { x: cxH + (cw - tw) / 2, y: sy - hHead - (hHead - FS_TABLE) / 2, size: FS_TABLE, font: fontBold, color: BLK });
                }
                cxH += cw;
            });
            sy -= hHead * 2;

            const fmtAmt = (n: number) => n === 0 ? '-' : n.toLocaleString('th-TH', { minimumFractionDigits: 2 });

            sy = dr(sy, [fmtDate(currentDate), '', 'ยอดยกมา', '', '', '', '', fmtAmt(bf)], true);

            const txsToday = combinedTxs.filter(t => t.date === currentDate);

            txsToday.forEach(t => {
                if (sy < 100) {
                    sPage = pdfDoc.addPage(isLandscape ? [PH, PW] : [PW, PH]);
                    sy = (isLandscape ? PW : PH) - 36;
                    sy -= RH * 2;
                }
                const n = (t.income || 0) - (t.expense || 0);
                runBal += n;

                let row: string[] = [];
                if (isLandscape) {
                    row = [
                        fmtDate(t.date), t.docNo || '', t.description || '',
                        t.fundType === 'fund-state-subsidy-interest' || t.fundType === 'fund-state' ? fmtAmt(t.income || 0) : '',
                        t.fundType === 'fund-state-lunch-interest' ? fmtAmt(t.income || 0) : '',
                        '', '', fmtAmt(runBal)
                    ];
                } else {
                    row = [
                        fmtDate(t.date), t.docNo || '', t.description || '',
                        t.fundType === 'fund-state-subsidy-interest' || t.fundType === 'fund-state' ? fmtAmt(t.income || 0) : '',
                        t.fundType === 'fund-state-lunch-interest' ? fmtAmt(t.income || 0) : '',
                        fmtAmt(t.income || 0), fmtAmt(t.expense || 0), fmtAmt(runBal)
                    ];
                }
                sy = dr(sy, row);
            });

            if (sy < 80) { sPage = pdfDoc.addPage(isLandscape ? [PH, PW] : [PW, PH]); sy = (isLandscape ? PW : PH) - 36; }
            if (!isLandscape) sy = dr(sy, ['', '', 'ยอดยกไป', '', '', '', '', fmtAmt(runBal)], true);

            sy -= 30;
            const sigsArr = ['เจ้าหน้าที่บัญชี', 'ผู้ตรวจบัญชี', 'ผู้อำนวยการโรงเรียน'];
            const DOTS = '........................................';
            const roleWidthMax = font.widthOfTextAtSize('ผู้อำนวยการโรงเรียน', FS) + 10;
            const sigStartX = W - mR - roleWidthMax - font.widthOfTextAtSize(DOTS, FS);

            const dotW = font.widthOfTextAtSize(DOTS, FS);

            sigsArr.forEach((role) => {
                sPage.drawText(DOTS, { x: sigStartX, y: sy, size: FS, font, color: BLK });
                sPage.drawText(role, { x: sigStartX + dotW + 5, y: sy, size: FS, font, color: BLK });
                sy -= 24;
            });
        }

        const bytes = await pdfDoc.save();
        window.open(URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })), '_blank');
        return;
    }

    const drawText = (
        pg: ReturnType<typeof pdfDoc.addPage>,
        txt: string,
        x: number, y: number,
        opts: { bold?: boolean; maxW?: number; align?: 'l' | 'c' | 'r' } = {}
    ) => {
        const f = opts.bold ? fontBold : font;
        const PAD = 8;
        let s = txt;
        let currentSize = FS_TABLE;
        if (opts.maxW) {
            const fullW = f.widthOfTextAtSize(s, FS_TABLE);
            if (fullW > opts.maxW - PAD * 2) {
                const scale = (opts.maxW - PAD * 2) / fullW;
                currentSize = Math.max(8, FS_TABLE * scale); // limit minimum font size to 8

                if (currentSize === 8) {
                    while (s.length > 0 && f.widthOfTextAtSize(s, 8) > opts.maxW - PAD * 2) {
                        s = s.slice(0, -1);
                    }
                }
            }
        }
        const tw = f.widthOfTextAtSize(s, currentSize);
        let xPos = x + PAD;
        if (opts.align === 'c' && opts.maxW) xPos = x + (opts.maxW - tw) / 2;
        if (opts.align === 'r' && opts.maxW) xPos = x + opts.maxW - tw - PAD;

        const yAdjust = (FS_TABLE - currentSize) / 2;
        pg.drawText(s, { x: xPos, y: y + yAdjust, size: currentSize, font: f, color: BLK });
    };

    const drawHeader = (pg: ReturnType<typeof pdfDoc.addPage>, yy: number) => {
        const rH_table = FS_TABLE + 6;
        pg.drawRectangle({ x: mL, y: yy - rH_table, width: tableW, height: rH_table, borderColor: BLK, borderWidth: 0.8 });
        let cx = mL;
        cols.forEach((cw, i) => {
            if (i > 0) pg.drawLine({ start: { x: cx, y: yy }, end: { x: cx, y: yy - rH_table }, thickness: 0.6, color: BLK });
            drawText(pg, hdrs[i], cx, yy - rH_table + 5, { bold: true, maxW: cw, align: aln[i] });
            cx += cw;
        });
        return yy - rH_table;
    };

    const drawRow = (
        pg: ReturnType<typeof pdfDoc.addPage>,
        yy: number,
        cells: string[],
        bold = false,
        overrideAligns?: ('l' | 'c' | 'r')[]
    ) => {
        const rH_table = FS_TABLE + 6;
        pg.drawRectangle({ x: mL, y: yy - rH_table, width: tableW, height: rH_table, borderColor: BLK, borderWidth: 0.4 });
        let cx = mL;
        cols.forEach((cw, i) => {
            if (i > 0) pg.drawLine({ start: { x: cx, y: yy }, end: { x: cx, y: yy - rH_table }, thickness: 0.4, color: BLK });
            const cellAlign = overrideAligns?.[i] ?? aln[i];
            drawText(pg, cells[i] ?? '', cx, yy - rH_table + 5, { bold, maxW: cw, align: cellAlign });
            cx += cw;
        });
        return yy - rH_table;
    };

    const sortedTxsForDates = [...periodTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const uniqueDates = Array.from(new Set(sortedTxsForDates.map(t => t.date)));
    if (uniqueDates.length === 0) {
        uniqueDates.push(exportEndDate); // fallback if no txs
    }

    let isFirstDay = true;

    for (const currentDate of uniqueDates) {
        if (!isFirstDay) {
            // New page for each distinct day
            // (Page is added automatically in the loop start. We just don't add one BEFORE the very first day)
        }

        let page = pdfDoc.addPage([PW, PH]);
        let y = PH - 36;

        const t1 = 'ทะเบียนคุมเงินนอกงบประมาณ';
        drawText(page, t1, (PW - fontBold.widthOfTextAtSize(t1, FS)) / 2, y, { bold: true });
        y -= FS + 4;
        const t2 = `ประเภท ${cleanTitle} (ปีงบประมาณ ${fiscalYear})`;
        drawText(page, t2, (PW - font.widthOfTextAtSize(t2, FS)) / 2, y, { bold: false });
        y -= FS + 8;

        y = drawHeader(page, y);

        // Compute balances for THIS day
        const dayStartMs = new Date(currentDate).getTime();
        const prevTxs = transactions.filter(t => t.fundType === pageId && new Date(t.date).getTime() < dayStartMs);
        const dayBroughtForward = prevTxs.reduce((acc, t) => acc + (t.income || 0) - (t.expense || 0), 0);

        const txsToday = periodTransactions.filter(t => t.date === currentDate);
        const dayIncome = txsToday.reduce((acc, t) => acc + (t.income || 0), 0);
        const dayExpense = txsToday.reduce((acc, t) => acc + (t.expense || 0), 0);
        const dayCarriedForward = dayBroughtForward + dayIncome - dayExpense;

        const fmtAmt = (n: number | null | undefined) => {
            if (n == null || n === 0) return '-';
            return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };
        const SUM_ALN: ('l' | 'c' | 'r')[] = ['c', 'c', 'r', 'r', 'r', 'r'];

        let runBal = dayBroughtForward;
        y = drawRow(page, y,
            [fmtDate(currentDate), '', 'ยอดยกมา', fmtAmt(dayBroughtForward), '-', fmtAmt(dayBroughtForward)],
            true, SUM_ALN
        );

        for (const t of txsToday) {
            if (y < 120) {
                page = pdfDoc.addPage([PW, PH]);
                y = PH - 36;
                y = drawHeader(page, y);
            }
            runBal += (t.income || 0) - (t.expense || 0);
            y = drawRow(page, y, [
                fmtDate(t.date),
                t.docNo || '',
                t.description || '',
                t.income > 0 ? fmtAmt(t.income) : '-',
                t.expense > 0 ? fmtAmt(t.expense) : '-',
                fmtAmt(runBal),
            ]);
        }

        if (y < 120) {
            page = pdfDoc.addPage([PW, PH]);
            y = PH - 36;
            y = drawHeader(page, y);
        }

        y = drawRow(page, y,
            ['', '', 'รวมรับ-จ่าย', fmtAmt(dayIncome), fmtAmt(dayExpense), '-'],
            true, SUM_ALN
        );
        y = drawRow(page, y,
            ['', '', 'ยอดยกไป', '-', '-', fmtAmt(dayCarriedForward)],
            true, SUM_ALN
        );
        y = drawRow(page, y, ['', '', '', '', '', '']);

        y -= 24;
        const sigs = ['เจ้าหน้าที่บัญชี', 'ผู้ตรวจบัญชี', 'ผู้อำนวยการโรงเรียน'];
        const DOTS = '........................................';
        const roleWidthMax = font.widthOfTextAtSize('ผู้อำนวยการโรงเรียน', FS) + 10;
        const sigStartX = PW - mR - roleWidthMax - font.widthOfTextAtSize(DOTS, FS);
        const dotW = font.widthOfTextAtSize(DOTS, FS);

        sigs.forEach((role) => {
            page.drawText(DOTS, { x: sigStartX, y, size: FS, font, color: BLK });
            page.drawText(role, { x: sigStartX + dotW + 5, y, size: FS, font, color: BLK });
            y -= 24;
        });

        isFirstDay = false;
    }

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    window.open(URL.createObjectURL(blob), '_blank');
};
