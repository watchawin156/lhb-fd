import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { formatThaiDate } from '../utils';

const FONT_CDN = {
    regular: 'https://cdn.jsdelivr.net/gh/watchawin156/font@main/THSarabunNew.ttf',
    bold: 'https://cdn.jsdelivr.net/gh/watchawin156/font@main/THSarabunNewBold.ttf',
};

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
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) win.focus();
}

function wrapText(text: string, maxWidth: number, font: any, size: number): string[] {
    if (!text) return [''];
    const lines: string[] = [];
    let current = '';

    for (const ch of text) {
        const test = current + ch;
        if (!current || font.widthOfTextAtSize(test, size) <= maxWidth) {
            current = test;
        } else {
            lines.push(current);
            current = ch;
        }
    }
    if (current) lines.push(current);
    return lines;
}

export async function buildLoanDocPDF(
    loan: any,
    isReturn: boolean,
    schoolSettings: any,
    todayDate: string
) {
    const pdfDoc = await PDFDocument.create();
    const { font, fontBold } = await loadFonts(pdfDoc);

    const W = 595.28;
    const H = 841.89;
    const mL = 56;
    const mR = 56;
    const contentWidth = W - mL - mR;

    let page = pdfDoc.addPage([W, H]);
    let y = H - 56;

    const ensureSpace = (minY: number) => {
        if (y < minY) {
            page = pdfDoc.addPage([W, H]);
            y = H - 56;
        }
    };

    const drawText = (
        text: string,
        x: number,
        yy: number,
        size = 16,
        bold = false,
        align: 'left' | 'center' | 'right' = 'left'
    ) => {
        const f = bold ? fontBold : font;
        let xPos = x;
        if (align === 'center') xPos = x - f.widthOfTextAtSize(text, size) / 2;
        if (align === 'right') xPos = x - f.widthOfTextAtSize(text, size);
        page.drawText(text, { x: xPos, y: yy, size, font: f, color: rgb(0, 0, 0) });
    };

    const drawParagraph = (
        text: string,
        x: number,
        yy: number,
        width: number,
        size = 16,
        bold = false,
        lineGap = 4
    ) => {
        const f = bold ? fontBold : font;
        const lh = size + lineGap;
        const lines = wrapText(text, width, f, size);
        let currentY = yy;
        lines.forEach(line => {
            ensureSpace(80);
            drawText(line, x, currentY, size, bold, 'left');
            currentY -= lh;
            y = currentY;
        });
        return currentY;
    };

    const moneyText = Number(loan.amount || 0).toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const project = String(loan.project || loan.toFund || '-');
    const fromFund = String(loan.fromFund || '-');
    const schoolName = String(schoolSettings.schoolNameTH || 'โรงเรียน');

    drawText('บันทึกข้อความ', W / 2, y, 26, true, 'center');
    y -= 44;

    drawText('ส่วนราชการ', mL, y, 16, true);
    y = drawParagraph(schoolName, mL + 62, y, contentWidth - 62, 16, false);

    drawText('ที่', mL, y, 16, true);
    drawText('....................................................', mL + 18, y, 16, false);
    drawText('วันที่', W - 180, y, 16, true);
    drawText(formatThaiDate(todayDate), W - 118, y, 16, false);
    y -= 24;

    const subject = isReturn
        ? `ขอส่งใช้เงินยืม กิจกรรม ${project}`
        : `ขออนุมัติยืมเงินจาก ${fromFund} เพื่อดำเนินการกิจกรรม ${project}`;
    drawText('เรื่อง', mL, y, 16, true);
    y = drawParagraph(subject, mL + 36, y, contentWidth - 36, 16, false);

    drawText('เรียน', mL, y, 16, true);
    y = drawParagraph(`ผู้อำนวยการ${schoolName}`, mL + 36, y, contentWidth - 36, 16, false);
    y -= 6;

    drawText('เรื่องเดิม', mL + 28, y, 16, true);
    y -= 24;
    y = drawParagraph(
        'ตามที่โรงเรียนได้ดำเนินกิจกรรมการจัดการเรียนการสอนและการบริหารทั่วไปประจำปีการศึกษานั้น',
        mL,
        y,
        contentWidth,
        16,
        false
    );
    y -= 8;

    drawText('ข้อเท็จจริง', mL + 28, y, 16, true);
    y -= 24;
    const fact1 = isReturn
        ? 'บัดนี้มีการคืนเงินยืมตามขั้นตอนทางการเงินและบัญชี เพื่อให้ถูกต้องตามระเบียบของทางราชการ'
        : `เนื่องจากกิจกรรม ${project} มีเงินไม่เพียงพอ จึงจำเป็นต้องยืมเงินจาก ${fromFund}`;
    const fact2 = isReturn
        ? 'โดยมีรายละเอียดการคืนเงินยืมดังนี้'
        : 'โดยมีรายละเอียดเงินยืมดังนี้';

    y = drawParagraph(fact1, mL, y, contentWidth, 16, false);
    y = drawParagraph(fact2, mL, y, contentWidth, 16, false);
    y -= 4;

    y = drawParagraph(`๑. ${project}`, mL + 18, y, contentWidth - 200, 16, false);
    drawText('จำนวน', W - 180, y + 20, 16, false);
    drawText(moneyText, W - 120, y + 20, 16, true, 'right');
    drawText('บาท', W - 92, y + 20, 16, false);
    y -= 24;

    drawText('ข้อเสนอแนะเพื่อโปรดพิจารณา', mL + 28, y, 16, true);
    y -= 24;
    y = drawParagraph('๑. เพื่อโปรดทราบและพิจารณาอนุมัติ', mL + 12, y, contentWidth - 12, 16, false);
    y = drawParagraph('๒. แจ้งงานบัญชีเพื่อทราบและลงบัญชีต่อไป', mL + 12, y, contentWidth - 12, 16, false);
    y = drawParagraph('จึงเรียนมาเพื่อโปรดทราบและพิจารณาอนุมัติ', mL + 12, y, contentWidth - 12, 16, false);

    ensureSpace(280);
    y -= 26;
    const signX = W - 170;
    drawText('ลงชื่อ......................................................เจ้าหน้าที่การเงิน', signX, y, 16, false, 'center');
    y -= 20;
    drawText(`(${schoolSettings.financeOfficerName || '-'})`, signX, y, 16, false, 'center');
    y -= 20;
    drawText(`วันที่ ${formatThaiDate(todayDate)}`, signX, y, 16, false, 'center');

    y -= 56;
    drawText('- ทราบ อนุมัติ', mL + 18, y, 16, false);
    y -= 22;
    drawText('- ดำเนินการตามเสนอ', mL + 18, y, 16, false);

    y -= 44;
    drawText('ลงชื่อ......................................................', signX, y, 16, false, 'center');
    y -= 20;
    drawText(`(${schoolSettings.directorName || '-'})`, signX, y, 16, false, 'center');
    y -= 20;
    drawText(`ผู้อำนวยการ${schoolName}`, signX, y, 16, false, 'center');
    y -= 20;
    drawText(`วันที่ ${formatThaiDate(todayDate)}`, signX, y, 16, false, 'center');

    return pdfDoc.save();
}
