
import React, { useState } from 'react';
import { useSchoolData } from '../context/SchoolContext';
import { formatThaiDate } from '../utils';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { PDF_FONTS } from './pdfConfig';
import { Receipt } from '../types';

const Revenue: React.FC = () => {
  const { receipts, addReceipt } = useSchoolData();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Receipt>>({
    type: 'tuition',
    paymentMethod: 'cash'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!formData.payer || !formData.amount) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    const newReceipt: Receipt = {
      id: `RC-66-${String(receipts.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString(),
      payer: formData.payer || '',
      type: (formData.type as any) || 'other',
      amount: parseFloat(String(formData.amount)) || 0,
      paymentMethod: (formData.paymentMethod as any) || 'cash',
      status: 'completed'
    };

    addReceipt(newReceipt);
    setShowForm(false);
    setFormData({ type: 'tuition', paymentMethod: 'cash', payer: '', amount: undefined });

    // Auto print logic can be called here if needed
  };

  const handlePrintReceipt = async (receiptId: string) => {
    try {
      const receipt = receipts.find(r => r.id === receiptId);
      if (!receipt) return;

      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);

      const fontUrl = 'https://cdn.jsdelivr.net/gh/watchawin156/font@main/THSarabunNew.ttf';
      const fontBoldUrl = 'https://cdn.jsdelivr.net/gh/watchawin156/font@main/THSarabunNewBold.ttf';
      const [fontBytes, fontBoldBytes] = await Promise.all([
        fetch(fontUrl).then(res => res.arrayBuffer()),
        fetch(fontBoldUrl).then(res => res.arrayBuffer())
      ]);
      const font = await pdfDoc.embedFont(fontBytes);
      const fontBold = await pdfDoc.embedFont(fontBoldBytes);

      const page = pdfDoc.addPage([595.28, 420.94]); // A5 Landscape (half A4)
      const { width, height } = page.getSize();

      // Draw Header
      page.drawText('ใบเสร็จรับเงิน (RECEIPT)', { x: width / 2 - 70, y: height - 50, size: 24, font: fontBold });
      page.drawText('โรงเรียนตัวอย่างวิทยา', { x: width / 2 - 50, y: height - 75, size: PDF_FONTS.NORMAL, font: font });

      // Info Box
      page.drawRectangle({ x: 400, y: height - 120, width: 150, height: 60, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });
      page.drawText(`เลขที่: ${receipt.id}`, { x: 410, y: height - 80, size: PDF_FONTS.TABLE_DATA, font: font });
      page.drawText(`วันที่: ${formatThaiDate(receipt.date)}`, { x: 410, y: height - 100, size: PDF_FONTS.TABLE_DATA, font: font });

      // Content
      let y = height - 150;
      page.drawText(`ได้รับเงินจาก: ${receipt.payer}`, { x: 50, y, size: PDF_FONTS.NORMAL, font: font });
      y -= 30;
      page.drawText(`รายการ: ค่าบำรุงการศึกษา/เงินบริจาค (${receipt.type})`, { x: 50, y, size: PDF_FONTS.NORMAL, font: font });
      y -= 30;
      page.drawText(`จำนวนเงิน: ${receipt.amount.toLocaleString()} บาท`, { x: 50, y, size: PDF_FONTS.NORMAL, font: font });
      y -= 30;
      page.drawText(`ชำระโดย: ${receipt.paymentMethod === 'cash' ? 'เงินสด' : 'โอนเงิน'}`, { x: 50, y, size: PDF_FONTS.NORMAL, font: font });

      // Signature
      y -= 60;
      const dots = "...................................................";
      const role1 = "( เจ้าหน้าที่การเงิน )";
      const role2 = "ผู้รับเงิน";

      const dotW = font.widthOfTextAtSize(dots, PDF_FONTS.NORMAL);
      const startX = width - dotW - 50;

      page.drawText(dots, { x: startX, y, size: PDF_FONTS.NORMAL, font: font });
      y -= 20;
      const cX = startX + dotW / 2;
      const role1W = font.widthOfTextAtSize(role1, PDF_FONTS.NORMAL);
      page.drawText(role1, { x: cX - role1W / 2, y, size: PDF_FONTS.NORMAL, font: font });
      y -= 20;
      const role2W = font.widthOfTextAtSize(role2, PDF_FONTS.NORMAL);
      page.drawText(role2, { x: cX - role2W / 2, y, size: PDF_FONTS.NORMAL, font: font });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (e) {
      console.error(e);
      alert('Cannot generate PDF');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark p-4 md:p-6 scroll-smooth">
      <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-10">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-text dark:text-text-dark flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl">payments</span>
              ระบบรับเงิน (Revenue)
            </h2>
            <p className="text-text-muted dark:text-text-muted-dark text-sm mt-1">ออกใบเสร็จรับเงิน และตรวจสอบประวัติรายรับ</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-lg shadow-blue-500/30 transition-all font-medium"
          >
            <span className="material-symbols-outlined">{showForm ? 'close' : 'add'}</span>
            {showForm ? 'ยกเลิก' : 'ออกใบเสร็จใหม่'}
          </button>
        </div>

        {/* Receipt Form - Collapsible */}
        {showForm && (
          <div className="bg-white dark:bg-surface-dark p-6 rounded-xl shadow-sm border border-blue-100 dark:border-border-dark animate-fade-in-down">
            <h3 className="text-lg font-bold text-navy dark:text-white mb-4 border-b border-border-light dark:border-border-dark pb-2">
              ออกใบเสร็จรับเงิน (Issue Receipt)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted dark:text-text-muted-dark">ชื่อผู้ชำระเงิน (Payer Name)</label>
                <input
                  type="text"
                  name="payer"
                  value={formData.payer || ''}
                  onChange={handleInputChange}
                  className="w-full p-2.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-input-dark text-text dark:text-text-dark focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="ระบุชื่อ-นามสกุล นักเรียน หรือ ผู้บริจาค"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted dark:text-text-muted-dark">ประเภทรายรับ (Category)</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full p-2.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-input-dark text-text dark:text-text-dark focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="tuition">ค่าบำรุงการศึกษา (Tuition)</option>
                  <option value="donation">เงินบริจาค (Donation)</option>
                  <option value="subsidy">เงินอุดหนุน (Subsidy)</option>
                  <option value="other">อื่นๆ (Other)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted dark:text-text-muted-dark">จำนวนเงิน (Amount)</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount || ''}
                  onChange={handleInputChange}
                  className="w-full p-2.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-input-dark text-text dark:text-text-dark focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted dark:text-text-muted-dark">ช่องทางการชำระ (Payment Method)</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-text dark:text-text-dark">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={formData.paymentMethod === 'cash'}
                      onChange={handleInputChange}
                      className="accent-primary"
                    />
                    <span className="text-sm">เงินสด (Cash)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-text dark:text-text-dark">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="transfer"
                      checked={formData.paymentMethod === 'transfer'}
                      onChange={handleInputChange}
                      className="accent-primary"
                    />
                    <span className="text-sm">โอนเงิน (Transfer)</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="px-4 py-2 text-sm text-text-muted dark:text-text-muted-dark hover:text-text dark:hover:text-white" onClick={() => setShowForm(false)}>ยกเลิก</button>
              <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark shadow-md">บันทึกและพิมพ์ใบเสร็จ</button>
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="bg-surface dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark flex flex-col">
          <div className="p-5 border-b border-border-light dark:border-border-dark flex justify-between items-center">
            <h3 className="font-bold text-text dark:text-text-dark">ประวัติการรับเงินล่าสุด (Recent Receipts)</h3>
            <button className="text-sm text-primary hover:underline">ดูทั้งหมด</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background-light dark:bg-slate-800/50 text-text-muted dark:text-text-muted-dark font-medium text-xs uppercase">
                <tr>
                  <th className="px-5 py-3">เลขที่ (No.)</th>
                  <th className="px-5 py-3">วันที่ (Date)</th>
                  <th className="px-5 py-3">ผู้ชำระเงิน (Payer)</th>
                  <th className="px-5 py-3">ประเภท (Type)</th>
                  <th className="px-5 py-3 text-right">จำนวนเงิน (Amount)</th>
                  <th className="px-5 py-3 text-center">สถานะ</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {receipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-5 py-4 font-mono text-xs text-text dark:text-text-dark">{receipt.id}</td>
                    <td className="px-5 py-4 text-text-muted dark:text-text-muted-dark">{formatThaiDate(receipt.date)}</td>
                    <td className="px-5 py-4 font-medium text-text dark:text-text-dark">{receipt.payer}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs border ${receipt.type === 'tuition' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' :
                        receipt.type === 'donation' ? 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800' :
                          'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                        }`}>
                        {receipt.type === 'tuition' ? 'ค่าเทอม' : receipt.type === 'donation' ? 'บริจาค' : 'เงินอุดหนุน'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-text dark:text-text-dark">
                      {receipt.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span> สำเร็จ
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handlePrintReceipt(receipt.id)}
                        className="p-1 text-text-muted dark:text-text-muted-dark hover:text-primary"
                        title="พิมพ์ใบเสร็จ"
                      >
                        <span className="material-symbols-outlined">print</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Revenue;
