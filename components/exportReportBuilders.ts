import { PDFDocument, rgb } from 'pdf-lib';
import { PDF_FONTS } from './pdfConfig';
import fontkit from '@pdf-lib/fontkit';
import { formatThaiDate, bahtText } from '../utils';

export const FS = PDF_FONTS.NORMAL;
export const FS_TABLE = PDF_FONTS.TABLE_DATA;

const FONT_CDN = {
    regular: 'https://cdn.jsdelivr.net/gh/watchawin156/font@main/THSarabunNew.ttf',
    bold: 'https://cdn.jsdelivr.net/gh/watchawin156/font@main/THSarabunNewBold.ttf',
};

const fmtMoney = (n: number) =>
    n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function loadFonts(pdfDoc: PDFDocument) {
    pdfDoc.registerFontkit(fontkit);
    const [fReg, fBold] = await Promise.all([
        fetch(FONT_CDN.regular).then(r => r.arrayBuffer()),
        fetch(FONT_CDN.bold).then(r => r.arrayBuffer()),
    ]);
    return {
        font: await pdfDoc.embedFont(fReg),
        fontBold: await pdfDoc.embedFont(fBold),
    };
}

export function openBlob(bytes: Uint8Array) {
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    window.open(URL.createObjectURL(blob), '_blank');
}

export async function buildDailyPDF(
    reportDate: string,
    schoolName: string,
    officerName: string,
    data: { item: string; amount: number | null; note?: string; indent?: number; isDetail?: boolean }[],
    totalAmount: number
) {
    const pdfDoc = await PDFDocument.create();
    const { font, fontBold } = await loadFonts(pdfDoc);
    const W = 595.28, H = 841.89;
    const page = pdfDoc.addPage([W, H]);
    const mL = 40, mR = 40;
    let y = H - 40;

    const center = (text: string, yy: number, size = FS, bold = false) => {
        const f = bold ? fontBold : font;
        const tw = f.widthOfTextAtSize(text, size);
        page.drawText(text, { x: (W - tw) / 2, y: yy, size, font: f });
    };

    center(`รายงานเงินคงเหลือประจำวัน`, y, FS + 2, true); y -= FS + 6;
    center(`ส่วนราชการ ${schoolName}`, y, FS); y -= FS + 4;
    center(`ประจำวันที่ ${formatThaiDate(reportDate)}`, y, FS); y -= FS + 8;

    const col1W = W - mL - mR - 110 - 30 - 80;
    const x1 = mL, x2 = x1 + col1W, x3 = x2 + 110, x4 = x3 + 30, x5 = W - mR;
    const rH = FS_TABLE + 8;
    const hdrH = rH + 4;

    page.drawRectangle({ x: x1, y: y - hdrH, width: x5 - x1, height: hdrH, borderColor: rgb(0, 0, 0), borderWidth: 0.8 });
    page.drawLine({ start: { x: x2, y }, end: { x: x2, y: y - hdrH }, thickness: 0.8, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: x4, y }, end: { x: x4, y: y - hdrH }, thickness: 0.8, color: rgb(0, 0, 0) });
    const cx = (a: number, b: number) => a + (b - a) / 2;
    const drawHdrText = (t: string, cx2: number) => {
        const tw = fontBold.widthOfTextAtSize(t, FS_TABLE);
        page.drawText(t, { x: cx2 - tw / 2, y: y - hdrH + 4, size: FS_TABLE, font: fontBold });
    };
    drawHdrText('รายการ', cx(x1, x2));
    drawHdrText('จำนวนเงิน', cx(x2, x4));
    drawHdrText('หมายเหตุ', cx(x4, x5));
    y -= hdrH;

    data.forEach(row => {
        page.drawLine({ start: { x: x1, y }, end: { x: x5, y }, thickness: 0.5, color: rgb(0, 0, 0) });
        page.drawLine({ start: { x: x1, y }, end: { x: x1, y: y - rH }, thickness: 0.5, color: rgb(0, 0, 0) });
        page.drawLine({ start: { x: x2, y }, end: { x: x2, y: y - rH }, thickness: 0.5, color: rgb(0, 0, 0) });
        page.drawLine({ start: { x: x3, y }, end: { x: x3, y: y - rH }, thickness: 0.5, color: rgb(0, 0, 0) });
        page.drawLine({ start: { x: x4, y }, end: { x: x4, y: y - rH }, thickness: 0.5, color: rgb(0, 0, 0) });
        page.drawLine({ start: { x: x5, y }, end: { x: x5, y: y - rH }, thickness: 0.5, color: rgb(0, 0, 0) });
        const ix = x1 + 4 + (row.indent ?? 0) * 14;
        page.drawText(row.item, { x: ix, y: y - rH + 4, size: FS_TABLE, font });
        if (row.amount != null && !row.note) {
            const [baht, satang] = fmtMoney(row.amount).split('.');
            const bw = font.widthOfTextAtSize(baht, FS_TABLE);
            page.drawText(baht, { x: x3 - bw - 4, y: y - rH + 4, size: FS_TABLE, font });
            const sw = font.widthOfTextAtSize(satang, FS_TABLE);
            page.drawText(satang, { x: x4 - sw - 4, y: y - rH + 4, size: FS_TABLE, font });
        }
        if (row.note) page.drawText(row.note, { x: x4 + 4, y: y - rH + 4, size: FS_TABLE, font });
        y -= rH;
    });

    page.drawLine({ start: { x: x1, y }, end: { x: x5, y }, thickness: 0.8, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: x1, y }, end: { x: x1, y: y - rH }, thickness: 0.5, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: x2, y }, end: { x: x2, y: y - rH }, thickness: 0.5, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: x3, y }, end: { x: x3, y: y - rH }, thickness: 0.5, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: x4, y }, end: { x: x4, y: y - rH }, thickness: 0.5, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: x5, y }, end: { x: x5, y: y - rH }, thickness: 0.5, color: rgb(0, 0, 0) });
    const tw = fontBold.widthOfTextAtSize('รวม', FS_TABLE);
    page.drawText('รวม', { x: x2 - tw - 4, y: y - rH + 4, size: FS_TABLE, font: fontBold });
    const [tb, ts] = fmtMoney(totalAmount).split('.');
    const tbw = fontBold.widthOfTextAtSize(tb, FS_TABLE);
    page.drawText(tb, { x: x3 - tbw - 4, y: y - rH + 4, size: FS_TABLE, font: fontBold });
    const tsw = fontBold.widthOfTextAtSize(ts, FS_TABLE);
    page.drawText(ts, { x: x4 - tsw - 4, y: y - rH + 4, size: FS_TABLE, font: fontBold });
    y -= rH;
    page.drawLine({ start: { x: x1, y }, end: { x: x5, y }, thickness: 0.8, color: rgb(0, 0, 0) });

    y -= 10;
    page.drawText(`จำนวนเงิน (ตัวอักษร) ${bahtText(totalAmount)}`, { x: x1, y, size: FS, font }); y -= 30;
    center(`ลงชื่อ......................................................`, y, FS); y -= FS + 4;
    center(officerName ? `(${officerName})` : '(......................................................)', y, FS); y -= FS + 2;
    center('หัวหน้าหน่วยงานย่อย', y, FS);

    return pdfDoc.save();
}

export async function buildCoverPDF(
    fiscalYearBE: number,
    fyStartDateStr: string,
    rows: { label: string; debit: number | null; credit: number | null }[],
    totalDebit: number, totalCredit: number,
    officerName: string, directorName: string
) {
    const pdfDoc = await PDFDocument.create();
    const { font, fontBold } = await loadFonts(pdfDoc);
    const W = 595.28, H = 841.89;
    const page = pdfDoc.addPage([W, H]);
    const mL = 50, mR = 50;
    let y = H - 40;

    const tableW = W - mL - mR;
    const col1 = tableW * 0.60;
    const col2 = tableW * 0.20;
    const col3 = tableW * 0.20;
    const rH = FS_TABLE + 6;

    const docLabel = 'เอกสารหมายเลข 1';
    const dlW = fontBold.widthOfTextAtSize(docLabel, FS) + 12;
    const dlH = FS + 6;
    page.drawRectangle({ x: W - mR - dlW, y: y - dlH, width: dlW, height: dlH, borderColor: rgb(0, 0, 0), borderWidth: 0.75 });
    page.drawText(docLabel, { x: W - mR - dlW + 6, y: y - dlH + 4, size: FS, font: fontBold });
    y -= dlH + 4;

    const tableTop = y;

    const drawRow = (text: string, yy: number, h: number, bold = false) => {
        page.drawRectangle({ x: mL, y: yy, width: tableW, height: h, borderColor: rgb(0, 0, 0), borderWidth: 0.75 });
        const f = bold ? fontBold : font;
        const tw = f.widthOfTextAtSize(text, FS_TABLE);
        page.drawText(text, { x: mL + tableW / 2 - tw / 2, y: yy + 4, size: FS_TABLE, font: f });
    };

    drawRow(`ปีงบประมาณ ${fiscalYearBE}`, tableTop - rH, rH, true);
    drawRow(`รายการเปิดบัญชี ณ วันที่ ${fyStartDateStr}`, tableTop - rH * 2, rH, false);

    const r3Y = tableTop - rH * 3;
    [[mL, col1, 'รายการ'], [mL + col1, col2, 'เดบิต'], [mL + col1 + col2, col3, 'เครดิต']].forEach(([x, w, t]) => {
        page.drawRectangle({ x: x as number, y: r3Y, width: w as number, height: rH, borderColor: rgb(0, 0, 0), borderWidth: 0.75 });
        const tw = fontBold.widthOfTextAtSize(t as string, FS_TABLE);
        page.drawText(t as string, { x: (x as number) + (w as number) / 2 - tw / 2, y: r3Y + 4, size: FS_TABLE, font: fontBold });
    });

    let curY = r3Y;
    rows.forEach(row => {
        curY -= rH;
        page.drawRectangle({ x: mL, y: curY, width: col1, height: rH, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });
        page.drawText(row.label, { x: mL + 4, y: curY + 4, size: FS_TABLE, font });
        page.drawRectangle({ x: mL + col1, y: curY, width: col2, height: rH, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });
        if (row.debit != null) {
            const s = fmtMoney(row.debit);
            const sw = font.widthOfTextAtSize(s, FS_TABLE);
            page.drawText(s, { x: mL + col1 + col2 - sw - 4, y: curY + 4, size: FS_TABLE, font });
        }
        page.drawRectangle({ x: mL + col1 + col2, y: curY, width: col3, height: rH, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });
        if (row.credit != null) {
            const s = fmtMoney(row.credit);
            const sw = font.widthOfTextAtSize(s, FS_TABLE);
            page.drawText(s, { x: mL + col1 + col2 + col3 - sw - 4, y: curY + 4, size: FS_TABLE, font });
        }
    });

    curY -= rH;
    [[mL, col1, 'รวมทั้งสิ้น', null], [mL + col1, col2, fmtMoney(totalDebit), 1], [mL + col1 + col2, col3, fmtMoney(totalCredit), 1]].forEach(([x, w, t, right]) => {
        page.drawRectangle({ x: x as number, y: curY, width: w as number, height: rH, borderColor: rgb(0, 0, 0), borderWidth: 0.75 });
        const tw = fontBold.widthOfTextAtSize(t as string, FS_TABLE);
        const xPos = right ? (x as number) + (w as number) - tw - 4 : (x as number) + 4;
        page.drawText(t as string, { x: xPos, y: curY + 4, size: FS_TABLE, font: fontBold });
    });

    curY -= 40;
    const sigX = mL + tableW * 0.30;
    const drawSig = (x: number, name: string, role: string, yy: number) => {
        page.drawText('ลงชื่อ', { x: x - 50, y: yy + FS, size: FS, font });
        page.drawLine({ start: { x: x - 20, y: yy + FS - 2 }, end: { x: x + 100, y: yy + FS - 2 }, thickness: 0.5, color: rgb(0, 0, 0) });
        page.drawText(role, { x: x + 106, y: yy + FS, size: FS, font });
        if (name) page.drawText(`(${name})`, { x: x - 20, y: yy + 2, size: FS - 2, font });
    };
    drawSig(sigX, officerName, 'ผู้สรุป', curY);
    curY -= 45;
    drawSig(sigX, directorName, 'หัวหน้าหน่วยงานย่อย', curY);

    return pdfDoc.save();
}

export async function buildCashBookPDF(
    bookNo: number, fyBE: number,
    dailyData: any[],
    officerName: string, auditorName: string, directorName: string
) {
    const pdfDoc = await PDFDocument.create();
    const { font, fontBold } = await loadFonts(pdfDoc);
    const PW = 841.89, PH = 595.28;

    const mL = 12, mR = 12, mTop = 16;
    const SW = (PW - mL - mR) / 2;

    // Use 14pt for all data
    const FSZ = 14;
    const FSZ_HDR = 11;

    const cDate = 38, cDoc = 44, cDesc = 120, cCash = 48, cBudg = 48, cRev = 48;
    const cNon = SW - cDate - cDoc - cDesc - cCash - cBudg - cRev;
    const xL = mL, xR = mL + SW;
    const H1 = 28, H2 = 20, H3 = 22, RH = 20;

    const drawLine = (page: any, x1: number, y1: number, x2: number, y2: number, lw = 0.5) =>
        page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: lw, color: rgb(0, 0, 0) });

    const drawT = (page: any, text: string, x: number, y: number, size = FSZ, bold = false,
        align: 'left' | 'center' | 'right' = 'left', maxW?: number) => {
        const f = bold ? fontBold : font;
        let t = text;
        if (maxW) while (t.length > 0 && f.widthOfTextAtSize(t, size) > maxW) t = t.slice(0, -1);
        const tw = f.widthOfTextAtSize(t, size);
        let xPos = x;
        if (align === 'center') xPos = x - tw / 2;
        if (align === 'right') xPos = x - tw;
        page.drawText(t, { x: xPos, y, size, font: f, color: rgb(0, 0, 0) });
    };

    // Thai-aware word wrap using Intl.Segmenter
    const segmenter = typeof Intl !== 'undefined' && (Intl as any).Segmenter
        ? new (Intl as any).Segmenter('th', { granularity: 'word' })
        : null;

    const segmentText = (text: string): string[] => {
        if (!segmenter) {
            // Fallback: split by spaces and individual characters for Thai
            const parts: string[] = [];
            let buf = '';
            for (const ch of text) {
                if (ch === ' ') {
                    if (buf) parts.push(buf);
                    parts.push(' ');
                    buf = '';
                } else {
                    buf += ch;
                }
            }
            if (buf) parts.push(buf);
            return parts;
        }
        const segments: string[] = [];
        for (const seg of segmenter.segment(text)) {
            segments.push(seg.segment);
        }
        return segments;
    };

    const wrapText = (text: string, maxW: number, size: number, bold = false): string[] => {
        const f = bold ? fontBold : font;
        if (!text || f.widthOfTextAtSize(text, size) <= maxW) return [text || ''];

        const segments = segmentText(text);
        const lines: string[] = [];
        let currentLine = '';

        for (const seg of segments) {
            const testLine = currentLine + seg;
            if (f.widthOfTextAtSize(testLine, size) <= maxW) {
                currentLine = testLine;
            } else {
                // Current segment doesn't fit
                if (currentLine) {
                    lines.push(currentLine.trimEnd());
                    currentLine = seg.trimStart();
                } else {
                    // Single segment wider than maxW - force split by character
                    let remaining = seg;
                    while (remaining.length > 0) {
                        let end = remaining.length;
                        while (end > 0 && f.widthOfTextAtSize(remaining.slice(0, end), size) > maxW) end--;
                        if (end === 0) end = 1;
                        lines.push(remaining.slice(0, end));
                        remaining = remaining.slice(end);
                    }
                }
            }
        }
        if (currentLine.trim()) lines.push(currentLine.trimEnd());
        return lines.length > 0 ? lines : [''];
    };

    const drawHdr = (page: any, curY: number, px: number, isRec: boolean) => {
        const amtX = px + cDate + cDoc + cDesc;
        page.drawRectangle({ x: px, y: curY - H2 - H3, width: SW, height: H2 + H3, borderColor: rgb(0, 0, 0), borderWidth: 0.8 });

        [cDate, cDoc, cDesc, cCash].reduce((cx, cw) => {
            drawLine(page, px + cx + cw, curY, px + cx + cw, curY - H2 - H3);
            return cx + cw;
        }, 0);

        drawLine(page, amtX + cCash + cBudg, curY - H2, amtX + cCash + cBudg, curY - H2 - H3);
        drawLine(page, amtX + cCash + cBudg + cRev, curY - H2, amtX + cCash + cBudg + cRev, curY - H2 - H3);

        // รายการรับ: เดบิตเงินสด (คอลัมน์แรก), เครดิตกองทุน (คอลัมน์หลัง)
        // รายการจ่าย: เครดิตเงินสด (คอลัมน์แรก), เดบิตกองทุน (คอลัมน์หลัง)
        if (isRec) {
            drawT(page, 'เดบิต', amtX + cCash / 2, curY - H2 + 5, FSZ, true, 'center');
            drawT(page, 'เครดิต', amtX + cCash + (cBudg + cRev + cNon) / 2, curY - H2 + 5, FSZ, true, 'center');
        } else {
            drawT(page, 'เครดิต', amtX + cCash / 2, curY - H2 + 5, FSZ, true, 'center');
            drawT(page, 'เดบิต', amtX + cCash + (cBudg + cRev + cNon) / 2, curY - H2 + 5, FSZ, true, 'center');
        }
        drawLine(page, px, curY - H2, px + cDate, curY - H2);
        drawLine(page, amtX, curY - H2, px + SW, curY - H2);

        const mergeY = curY - (H2 + H3) / 2 - FSZ / 2 + 5;
        drawT(page, `พ.ศ.${fyBE}`, px + cDate / 2, curY - H2 + 5, FSZ, true, 'center');
        drawT(page, 'วันที่', px + cDate / 2, curY - H2 - H3 + 5, FSZ, true, 'center');
        drawT(page, 'ที่เอกสาร', px + cDate + cDoc / 2, mergeY, FSZ, true, 'center');
        drawT(page, isRec ? 'รายการรับ' : 'รายการจ่าย', px + cDate + cDoc + cDesc / 2, mergeY, FSZ, true, 'center');

        const r2y = curY - H2 - H3 + 6;
        drawT(page, 'เงินสด', amtX + cCash / 2, r2y, FSZ_HDR, true, 'center');
        drawT(page, 'เงิน', amtX + cCash + cBudg / 2, r2y + 7, FSZ_HDR, true, 'center');
        drawT(page, 'งบประมาณ', amtX + cCash + cBudg / 2, r2y - 3, FSZ_HDR, true, 'center');
        drawT(page, 'เงินรายได้', amtX + cCash + cBudg + cRev / 2, r2y + 7, FSZ_HDR, true, 'center');
        drawT(page, 'แผ่นดิน', amtX + cCash + cBudg + cRev / 2, r2y - 3, FSZ_HDR, true, 'center');
        drawT(page, 'เงินนอก', amtX + cCash + cBudg + cRev + cNon / 2, r2y + 7, FSZ_HDR, true, 'center');
        drawT(page, 'งบประมาณ', amtX + cCash + cBudg + cRev + cNon / 2, r2y - 3, FSZ_HDR, true, 'center');
    };

    const fmt = (n: number | null | undefined) => (n == null || n === 0) ? '-' : fmtMoney(n);

    // Calculate how many lines a data row needs (for text wrapping)
    const calcRowLines = (opts: any = {}): number => {
        let lines = 1;
        if (opts.desc) {
            const descLines = wrapText(opts.desc, cDesc - 6, FSZ);
            lines = Math.max(lines, descLines.length);
        }
        if (opts.docNo) {
            const docLines = wrapText(opts.docNo, cDoc - 6, FSZ);
            lines = Math.max(lines, docLines.length);
        }
        return lines;
    };

    const drawDataRow = (page: any, px: number, rowY: number, rowH: number, opts: any = {}) => {
        const cols = [cDate, cDoc, cDesc, cCash, cBudg, cRev, cNon];
        let cx = px;
        drawLine(page, cx, rowY, cx, rowY + rowH);
        cols.forEach(cw => { cx += cw; drawLine(page, cx, rowY, cx, rowY + rowH); });
        drawLine(page, px, rowY, px + SW, rowY);

        const ty = rowY + rowH - RH + 4; const b = opts.bold ?? false;
        const amX = px + cDate + cDoc + cDesc;

        if (opts.dateStr) {
            let dStr = opts.dateStr;
            const parts = dStr.split(' ');
            if (parts.length >= 2) {
                // เอาแค่ วัน กับ เดือน (ซ่อนปี)
                dStr = `${parts[0]} ${parts[1]}`;
            }
            drawT(page, dStr, px + 2, ty, FSZ, false, 'left', cDate - 4);
        }

        if (opts.labelOnly != null) {
            drawT(page, opts.labelOnly, px + cDate + cDoc + 2, ty, FSZ, b, 'left', cDesc - 4);
        } else {
            // Doc number with wrapping
            if (opts.docNo) {
                const docLines = wrapText(opts.docNo, cDoc - 6, FSZ);
                for (let li = 0; li < docLines.length; li++) {
                    const lineY = rowY + rowH - RH * (li + 1) + 4;
                    page.drawText(docLines[li], { x: px + cDate + 2, y: lineY, size: FSZ, font: font, color: rgb(0, 0, 0) });
                }
            }
            // Description with wrapping
            if (opts.desc) {
                const descLines = wrapText(opts.desc, cDesc - 6, FSZ);
                for (let li = 0; li < descLines.length; li++) {
                    const lineY = rowY + rowH - RH * (li + 1) + 4;
                    page.drawText(descLines[li], { x: px + cDate + cDoc + 2, y: lineY, size: FSZ, font: font, color: rgb(0, 0, 0) });
                }
            }
        }
        if (opts.cash != null) drawT(page, fmt(opts.cash), amX + cCash - 2, ty, FSZ, b, 'right');
        if (opts.budget != null) drawT(page, fmt(opts.budget), amX + cCash + cBudg - 2, ty, FSZ, b, 'right');
        if (opts.revenue != null) drawT(page, fmt(opts.revenue), amX + cCash + cBudg + cRev - 2, ty, FSZ, b, 'right');
        if (opts.nonBudget != null) drawT(page, fmt(opts.nonBudget), amX + cCash + cBudg + cRev + cNon - 2, ty, FSZ, b, 'right');
    };


    // Helper: expand items with headerTitle grouping + conditional numbering
    const expandWithHeaders = (items: any[]): any[] => {
        const result: any[] = [];
        let lastHeader = '';
        let groupItems: any[] = [];

        const flushGroup = () => {
            if (groupItems.length === 0) return;
            const useNumbers = groupItems.length > 1;
            groupItems.forEach((gi, idx) => {
                result.push({
                    desc: useNumbers ? `${idx + 1}. ${gi.desc}` : gi.desc,
                    docNo: gi.docNo, // Ensure docNo is propagated
                    cash: gi.cash, budget: gi.budget, revenue: gi.revenue, nonBudget: gi.nonBudget
                });
            });
            groupItems = [];
        };

        items.forEach(item => {
            const hdr = item.headerTitle || '';
            if (hdr && hdr !== lastHeader) {
                // Flush previous group
                flushGroup();
                // Insert header row
                result.push({ docNo: item.docNo, desc: hdr });
                groupItems.push(item);
                lastHeader = hdr;
            } else if (hdr && hdr === lastHeader) {
                groupItems.push(item);
            } else {
                // No header - flush any pending group + add normal row
                flushGroup();
                result.push({ docNo: item.docNo, desc: item.desc, cash: item.cash, budget: item.budget, revenue: item.revenue, nonBudget: item.nonBudget });
                lastHeader = '';
            }
        });
        flushGroup(); // flush remaining
        return result;
    };

    // === จัดกลุ่มตามวัน ===
    interface DayGroup {
        leftRows: any[];
        rightRows: any[];
    }
    const dayGroups: DayGroup[] = [];

    dailyData.forEach((day: any) => {
        const dayLeft: any[] = [];
        const dayRight: any[] = [];

        if (day.isCarryForwardDay) {
            // === วันยกยอดมาจากปีก่อน ===
            // แทนที่ "ยอดยกมา" ด้วย "ยอดยกมาจากปี xxxx" + รายการแยกประเภท
            const prevYr = day.prevYearBE || (fyBE - 1);
            dayLeft.push({ dateStr: day.dateStr, labelOnly: `ยอดยกมาจากปี ${prevYr}`, bold: true });
            dayRight.push({ dateStr: day.dateStr, labelOnly: `ยอดยกมาจากปี ${prevYr}`, bold: true });

            // รายการยกยอดแต่ละประเภท (numbered) — ดึงแค่ชื่อในวงเล็บ
            const recs = day.receipts;
            const pays = day.payments;
            const maxData = Math.max(recs.length, pays.length, 1);
            for (let i = 0; i < maxData; i++) {
                const rec = recs[i];
                if (rec) {
                    // "ยกยอดมา (เงินอุดหนุนรายหัว) จากปี 2568" → "เงินอุดหนุนรายหัว"
                    const mMatch = rec.desc.match(/\(([^)]+)\)/);
                    const shortLabel = mMatch ? mMatch[1] : rec.desc;
                    dayLeft.push({
                        desc: `${i + 1}. ${shortLabel}`,
                        cash: rec.cash,
                        budget: rec.budget,
                        revenue: rec.revenue,
                        nonBudget: rec.nonBudget,
                    });
                } else {
                    dayLeft.push({});
                }
                dayRight.push(pays[i] || {});
            }
        } else {
            // === วันปกติ ===
            // Opening balance for the day
            dayLeft.push({ dateStr: day.dateStr, labelOnly: 'ยอดยกมา', bold: true, cash: day.prevCash, budget: null, revenue: null, nonBudget: day.prevCash });
            // NOTE: Right side opening balance logic is matched with left side spacer alignment
            dayRight.push({ dateStr: day.dateStr, labelOnly: 'ยอดยกมา', bold: true, cash: null, budget: null, revenue: null, nonBudget: null });

            const expandedRec = expandWithHeaders(day.receipts);
            const expandedPay = expandWithHeaders(day.payments);
            const maxData = Math.max(expandedRec.length, expandedPay.length, 1); // at least 1 empty row

            for (let i = 0; i < maxData; i++) {
                dayLeft.push(expandedRec[i] || {});
                dayRight.push(expandedPay[i] || {});
            }
        }

        // Summary Rows
        dayLeft.push({}); // Spacer for total
        dayLeft.push({ labelOnly: 'รวมรับ', bold: true, cash: day.totalRec.cash, budget: day.totalRec.budget, revenue: day.totalRec.revenue, nonBudget: day.totalRec.nonBudget });
        dayLeft.push({ labelOnly: 'รวมตั้งแต่ต้นปี', bold: true, cash: day.accRec.cash, budget: day.accRec.budget, revenue: day.accRec.revenue, nonBudget: day.accRec.nonBudget });

        dayRight.push({ labelOnly: 'ยอดยกไป', bold: true, cash: day.yodYokPai, budget: null, revenue: null, nonBudget: day.yodYokPai });
        dayRight.push({ labelOnly: 'รวมจ่าย', bold: true, cash: day.totalPay.cash, budget: day.totalPay.budget, revenue: day.totalPay.revenue, nonBudget: day.totalPay.nonBudget });
        dayRight.push({ labelOnly: 'รวมตั้งแต่ต้นปี', bold: true, cash: day.accPay.cash, budget: day.accPay.budget, revenue: day.accPay.revenue, nonBudget: day.accPay.nonBudget });

        dayGroups.push({ leftRows: dayLeft, rightRows: dayRight });
    });

    // === Render ===
    let pageNum = 1;
    let dayIdx = 0;
    let rowIdx = 0; // index within dayGroups[dayIdx].leftRows

    while (dayIdx < dayGroups.length) {
        const page = pdfDoc.addPage([PW, PH]);
        let curY = PH - mTop;

        // Header
        drawT(page, `สมุดเงินสด แผ่นที่ ${pageNum}`, PW / 2, curY - H1 + 8, FSZ + 2, true, 'center');
        drawT(page, `ปีงบประมาณ ${fyBE}`, PW - mR, curY - H1 + 8, FSZ, false, 'right');
        curY -= H1;

        // Table header
        drawHdr(page, curY, xL, true);
        drawHdr(page, curY, xR, false);
        curY -= H2 + H3;

        // คำนวณพื้นที่ signature (เผื่อทุกหน้า: 3 ลายเซ็น × ~30pt + ระยะห่าง)
        const sigAreaH = (H2 + 16) * 3 + 40;
        const minBottom = 35 + sigAreaH;
        let pageFull = false;

        // Loop render by row to properly break pages
        while (dayIdx < dayGroups.length && !pageFull) {
            const day = dayGroups[dayIdx];

            while (rowIdx < day.leftRows.length) {
                const lr = day.leftRows[rowIdx];
                const rr = day.rightRows[rowIdx];
                const leftLines = calcRowLines(lr);
                const rightLines = calcRowLines(rr);
                const rowH = RH * Math.max(leftLines, rightLines, 1);

                // ถ้าระยะไม่พอ ให้ตัดขึ้นหน้าใหม่
                if (curY - rowH < minBottom) {
                    pageFull = true;
                    break;
                }

                curY -= rowH;
                drawDataRow(page, xL, curY, rowH, lr);
                drawDataRow(page, xR, curY, rowH, rr);

                rowIdx++;
            }

            if (pageFull) {
                break;
            } else {
                // Done with this day
                dayIdx++;
                rowIdx = 0;
            }
        }

        // เส้นปิดตาราง
        drawLine(page, xL, curY, xL + SW, curY);
        drawLine(page, xR, curY, xR + SW, curY);

        // ลายเซ็น — แสดงทุกหน้า (ใต้เส้นปิดตาราง)
        {
            const sigs = [
                { role: 'เจ้าหน้าที่บัญชี', name: officerName },
                { role: 'ผู้ตรวจบัญชี', name: auditorName },
                { role: 'ผู้อำนวยการโรงเรียน', name: directorName },
            ];
            const DOTS = '........................................';
            const roleWidthMax = font.widthOfTextAtSize('ผู้อำนวยการโรงเรียน', FSZ) + 10;
            const dotW = font.widthOfTextAtSize(DOTS, FSZ);
            const sigStartX = xR + SW - dotW - roleWidthMax;
            let sy = curY - 30;

            sigs.forEach(s => {
                drawT(page, DOTS, sigStartX, sy + 8, FSZ);
                drawT(page, s.role, sigStartX + dotW + 5, sy + 8, FSZ, false, 'left');
                const centerOverDots = sigStartX + dotW / 2;
                if (s.name) drawT(page, `(${s.name})`, centerOverDots, sy - 12, FSZ, false, 'center');
                sy -= H2 + (s.name ? 16 : 0);
            });
        }

        pageNum++;
    }

    return pdfDoc.save();
}
