import { PDFDocument, rgb } from 'pdf-lib';
import { PDF_FONTS } from './pdfConfig';
import fontkit from '@pdf-lib/fontkit';
import { formatThaiDate } from '../utils';

export const FS = PDF_FONTS.NORMAL;

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
    if (win) {
        win.focus();
        // Auto-print after a short delay
        setTimeout(() => {
            win.print();
        }, 500);
    }
}

export async function buildLoanDocPDF(
    loan: any,
    isReturn: boolean,
    schoolSettings: any,
    todayDate: string
) {
    const pdfDoc = await PDFDocument.create();
    const { font, fontBold } = await loadFonts(pdfDoc);
    const W = 595.28, H = 841.89; // A4 portrait
    const page = pdfDoc.addPage([W, H]);
    const mL = 70, mR = 50; // Standard Thai gov margins
    let y = H - 50;

    const drawT = (text: string, x: number, yy: number, size = 16, bold = false, align: 'left' | 'center' | 'right' = 'left') => {
        const f = bold ? fontBold : font;
        let xPos = x;
        if (align === 'center') {
            const tw = f.widthOfTextAtSize(text, size);
            xPos = x - tw / 2;
        } else if (align === 'right') {
            const tw = f.widthOfTextAtSize(text, size);
            xPos = x - tw;
        }
        page.drawText(text, { x: xPos, y: yy, size, font: f, color: rgb(0, 0, 0) });
    };

    const indent = mL + 30;
    const lineHeight = 20;

    // Header (บันทึกข้อความ)
    drawT('บันทึกข้อความ', W / 2, y, 24, true, 'center');
    y -= 40;

    // ส่วนราชการ
    drawT('ส่วนราชการ', mL, y, 16, true);
    drawT(schoolSettings.schoolNameTH, mL + 60, y, 16, false);
    y -= lineHeight;

    // ที่ / วันที่
    drawT('ที่', mL, y, 16, true);
    drawT('......................................................', mL + 15, y, 16, false);
    drawT('วันที่', W / 2 + 30, y, 16, true);
    drawT(formatThaiDate(todayDate), W / 2 + 60, y, 16, false);
    y -= lineHeight;

    // เรื่อง
    drawT('เรื่อง', mL, y, 16, true);
    let subject = '';
    if (isReturn) {
        subject = `ขอส่งใช้เงินยืม กิจกรรม ${loan.project || loan.toFund || ''}`;
    } else {
        subject = `ขออนุมัติยืมเงินกิจกรรม ${loan.fromFund || ''} เพื่อดำเนินการกิจกรรม ${loan.project || loan.toFund || ''}`;
    }
    drawT(subject, mL + 30, y, 16, false);
    y -= lineHeight * 1.5;

    // เรียน
    drawT('เรียน', mL, y, 16, true);
    drawT(`ผู้อำนวยการ${schoolSettings.schoolNameTH}`, mL + 30, y, 16, false);
    y -= lineHeight * 2;

    // เรื่องเดิม
    drawT('เรื่องเดิม', indent, y, 16, true);
    y -= lineHeight;
    drawT(`ตามที่โรงเรียนได้ดำเนินกิจกรรมการจัดการเรียนการสอนและการบริหารทั่วไปประจำปีการศึกษานั้น`, mL, y, 16, false);
    y -= lineHeight * 2;

    // ข้อเท็จจริง
    drawT('ข้อเท็จจริง', indent, y, 16, true);
    y -= lineHeight;
    let factLine1 = '';
    let factLine2 = '';
    let factLine3 = '';
    let amountStr = loan.amount.toLocaleString(undefined, { minimumFractionDigits: 2 });

    if (isReturn) {
        factLine1 = `บัดนี้ ได้รับจัดสรรเงินงบประมาณครบ จำนวนจึงเห็นควรส่งใช้เงินยืม ที่ได้ยืมมาดำเนินการ`;
        factLine2 = `เพื่อให้ถูกต้องตามหลักการควบคุมทางการเงิน บัญชี หนังสือสั่งการและคู่มือฯ`;
        factLine3 = `โดยมีรายละเอียดส่งคืนเงินยืมดังนี้`;
    } else {
        factLine1 = `เนื่องจากกิจกรรม ${loan.project || loan.toFund || ''} มีเงินไม่เพียงพอ`;
        factLine2 = `จึงเห็นควรยืมเงินกิจกรรม ${loan.fromFund || ''} เพื่อดำเนินการให้แล้วเสร็จ`;
        factLine3 = `โดยมีรายละเอียดดังนี้`;
    }
    drawT(factLine1, mL, y, 16, false); y -= lineHeight;
    drawT(factLine2, mL, y, 16, false); y -= lineHeight;
    drawT(factLine3, mL, y, 16, false); y -= lineHeight * 1.5;

    drawT(`๑. ${loan.project || loan.toFund || 'โครงการ/กิจกรรม'}`, indent + 20, y, 16, false);
    drawT(`จำนวน`, indent + 180, y, 16, false);
    drawT(`${amountStr}`, indent + 220, y, 16, false, 'right');
    drawT(`บาท`, indent + 230, y, 16, false);
    y -= lineHeight * 2;

    // ข้อเสนอแนะ
    drawT('ข้อเสนอแนะเพื่อโปรดพิจารณา', indent, y, 16, true);
    y -= lineHeight;
    drawT('๑. เพื่อโปรดทราบและพิจารณาอนุมัติ', indent, y, 16, false);
    y -= lineHeight;
    drawT('๒. แจ้งงานบัญชีเพื่อทราบเพื่อลงบัญชีต่อไป', indent, y, 16, false);
    y -= lineHeight;
    drawT('จึงเรียนมาเพื่อโปรดทราบและพิจารณาอนุมัติ', indent, y, 16, false);
    y -= lineHeight * 3;

    // ลายเซ็นต์คนทำ
    const sigX1 = W / 2 + 50;
    drawT('ลงชื่อ......................................................เจ้าหน้าที่การเงิน', sigX1, y, 16, false, 'center');
    y -= lineHeight;
    drawT(`(${schoolSettings.financeOfficerName || '......................................................'})`, sigX1, y, 16, false, 'center');
    y -= lineHeight;
    drawT(`วันที่ ${formatThaiDate(todayDate)}`, sigX1, y, 16, false, 'center');
    y -= lineHeight * 3;

    // คำสั่ง ผอ.
    drawT('- ทราบ อนุมัติ', mL + 20, y, 16, false);
    y -= lineHeight;
    drawT('- ดำเนินการตามเสนอ', mL + 20, y, 16, false);
    y -= lineHeight * 3;

    const sigX2 = W / 2 + 50;
    drawT('ลงชื่อ......................................................', sigX2, y, 16, false, 'center');
    y -= lineHeight;
    drawT(`(${schoolSettings.directorName || '......................................................'})`, sigX2, y, 16, false, 'center');
    y -= lineHeight;
    drawT(`ผู้อำนวยการ${schoolSettings.schoolNameTH}`, sigX2, y, 16, false, 'center');
    y -= lineHeight;
    drawT(`วันที่ ${formatThaiDate(todayDate)}`, sigX2, y, 16, false, 'center');

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}
