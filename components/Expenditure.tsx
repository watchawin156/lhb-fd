
import React, { useState } from 'react';
import { useSchoolData } from '../context/SchoolContext';
import { PRItem } from '../types';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { PDF_FONTS } from './pdfConfig';
import ConfirmModal from './ConfirmModal';

const Expenditure: React.FC = () => {
  const { createPR, budgetItems } = useSchoolData();
  const [items, setItems] = useState<PRItem[]>([
    { id: '1', name: '', qty: 1, unitPrice: 0 }
  ]);
  const [requester, setRequester] = useState('ครูสมศรี ใจดี');
  const [department, setDepartment] = useState('ฝ่ายวิชาการ');
  const [title, setTitle] = useState('');

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info', onConfirm?: () => void) => {
    setModalConfig({ isOpen: true, title, message, type, onConfirm });
  };

  const updateItem = (id: string, field: keyof PRItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', qty: 1, unitPrice: 0 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  const vat = subtotal * 0.07;
  const total = subtotal + vat;

  const handleCreatePR = async () => {
    if (!title || total === 0) {
      showAlert("ข้อมูลไม่ครบถ้วน", "กรุณาระบุหัวข้อรายการและเพิ่มสินค้าอย่างน้อย 1 รายการ", "warning");
      return;
    }

    // 1. Create Data Entry in Context (Mock DB)
    const newPRId = `PR-66-${Math.floor(Math.random() * 1000)}`;
    createPR({
      id: newPRId,
      title: title,
      requester: requester,
      department: department,
      amount: total,
      date: new Date().toISOString(),
      status: 'pending',
      type: 'purchase'
    });

    showAlert("สำเร็จ", "บันทึกใบขอซื้อเรียบร้อย! รายการถูกส่งไปรออนุมัติที่หน้า Dashboard", "success");

    // 2. Generate PDF
    await generatePDF(newPRId);

    // Reset Form
    setItems([{ id: Date.now().toString(), name: '', qty: 1, unitPrice: 0 }]);
    setTitle('');
  };

  const generatePDF = async (prId: string) => {
    try {
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

      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      let y = height - 50;

      page.drawText('บันทึกข้อความ (Memo)', { x: width / 2 - 60, y, size: 24, font: fontBold });
      y -= 40;
      page.drawText('ส่วนราชการ: โรงเรียนตัวอย่างวิทยา', { x: 50, y, size: PDF_FONTS.NORMAL, font: font });
      page.drawText(`เลขที่: ${prId}`, { x: width - 150, y, size: PDF_FONTS.NORMAL, font: font });
      y -= 25;
      page.drawText(`เรื่อง: ขออนุมัติจัดซื้อ/จัดจ้าง`, { x: 50, y, size: PDF_FONTS.NORMAL, font: font });
      y -= 25;
      page.drawText('เรียน ผู้อำนวยการโรงเรียน', { x: 50, y, size: PDF_FONTS.NORMAL, font: font });

      y -= 40;
      page.drawText(`ด้วย ${department} มีความประสงค์จะขอจัดซื้อวัสดุ ดังรายการต่อไปนี้:`, { x: 50, y, size: PDF_FONTS.NORMAL, font: font });

      y -= 30;
      // Table Header
      page.drawText('รายการ', { x: 60, y, size: PDF_FONTS.TABLE_HEADER, font: fontBold });
      page.drawText('จำนวน', { x: 300, y, size: PDF_FONTS.TABLE_HEADER, font: fontBold });
      page.drawText('ราคา/หน่วย', { x: 380, y, size: PDF_FONTS.TABLE_HEADER, font: fontBold });
      page.drawText('รวมเงิน', { x: 480, y, size: PDF_FONTS.TABLE_HEADER, font: fontBold });

      y -= 20;
      items.forEach((item, index) => {
        if (item.name) {
          page.drawText(`${index + 1}. ${item.name}`, { x: 60, y, size: PDF_FONTS.TABLE_DATA, font: font });
          page.drawText(`${item.qty}`, { x: 310, y, size: PDF_FONTS.TABLE_DATA, font: font });
          page.drawText(`${item.unitPrice.toLocaleString()}`, { x: 400, y, size: PDF_FONTS.TABLE_DATA, font: font });
          page.drawText(`${(item.qty * item.unitPrice).toLocaleString()}`, { x: 500, y, size: PDF_FONTS.TABLE_DATA, font: font });
          y -= 20;
        }
      });

      y -= 20;
      page.drawText(`รวมเป็นเงินทั้งสิ้น: ${total.toLocaleString()} บาท`, { x: 350, y, size: PDF_FONTS.NORMAL, font: fontBold });

      y -= 60;
      const dots = "...................................................";
      const role = "ผู้ขอเบิก";
      const dotW = font.widthOfTextAtSize(dots, PDF_FONTS.NORMAL);
      const startX = Math.min(300, width - dotW - 50);
      page.drawText(dots, { x: startX, y, size: PDF_FONTS.NORMAL, font: font });
      page.drawText(` ${role}`, { x: startX + dotW, y, size: PDF_FONTS.NORMAL, font: font });
      y -= 20;
      const cX = startX + dotW / 2;
      const reqTw = font.widthOfTextAtSize(`( ${requester} )`, PDF_FONTS.NORMAL);
      page.drawText(`( ${requester} )`, { x: cX - reqTw / 2, y, size: PDF_FONTS.NORMAL, font: font });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      window.open(URL.createObjectURL(blob), '_blank');

    } catch (e) {
      console.error(e);
      showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการสร้างเอกสาร PDF', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark p-4 md:p-6 scroll-smooth">
      <div className="max-w-5xl mx-auto flex flex-col gap-6 pb-10">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text dark:text-text-dark flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-500 text-3xl">shopping_cart</span>
              ระบบเบิกจ่าย (Expenditure)
            </h2>
            <p className="text-text-muted dark:text-text-muted-dark text-sm mt-1">สร้างใบขอซื้อ/จ้าง (PR) และติดตามสถานะ</p>
          </div>
        </div>

        {/* PR Builder */}
        <div className="bg-surface dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
          <div className="p-6 border-b border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-navy dark:text-white">สร้างใบขอซื้อ (Purchase Request)</h3>
              <div className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full text-xs font-medium border border-green-200 dark:border-green-800">
                งบประมาณคงเหลือ: ฿150,000 (Simulated)
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-muted dark:text-text-muted-dark mb-1">หัวข้อรายการ</label>
                <input
                  type="text"
                  className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-input-dark text-text dark:text-text-dark focus:border-primary outline-none"
                  placeholder="เช่น ขอซื้อวัสดุสำนักงานประจำเดือน..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-muted dark:text-text-muted-dark mb-1">ผู้เบิก</label>
                  <input
                    type="text"
                    className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-input-dark text-text dark:text-text-dark focus:border-primary outline-none"
                    value={requester}
                    onChange={(e) => setRequester(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted dark:text-text-muted-dark mb-1">แผนก/ฝ่าย</label>
                  <select
                    className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-input-dark text-text dark:text-text-dark focus:border-primary outline-none"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="ฝ่ายวิชาการ">ฝ่ายวิชาการ</option>
                    <option value="ฝ่ายบริหารทั่วไป">ฝ่ายบริหารทั่วไป</option>
                    <option value="ฝ่ายกิจการนักเรียน">ฝ่ายกิจการนักเรียน</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="text-left text-text-muted dark:text-text-muted-dark border-b border-border-light dark:border-border-dark">
                  <th className="py-2 w-[40%]">รายการสินค้า (Item)</th>
                  <th className="py-2 w-[15%] text-center">จำนวน</th>
                  <th className="py-2 w-[20%] text-right">ราคา/หน่วย</th>
                  <th className="py-2 w-[20%] text-right">รวม</th>
                  <th className="py-2 w-[5%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2">
                      <input
                        type="text"
                        className="w-full p-1.5 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded bg-transparent focus:bg-background-light dark:focus:bg-slate-800 focus:border-primary outline-none text-text dark:text-text-dark"
                        placeholder="ระบุชื่อสินค้า..."
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        className="w-full p-1.5 text-center border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded bg-transparent focus:bg-background-light dark:focus:bg-slate-800 focus:border-primary outline-none text-text dark:text-text-dark"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        className="w-full p-1.5 text-right border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded bg-transparent focus:bg-background-light dark:focus:bg-slate-800 focus:border-primary outline-none text-text dark:text-text-dark"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-2 text-right font-medium text-text dark:text-text-dark">
                      {(item.qty * item.unitPrice).toLocaleString()}
                    </td>
                    <td className="py-2 text-center">
                      {items.length > 1 && (
                        <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button onClick={addItem} className="flex items-center gap-1 text-primary text-sm font-medium hover:underline mb-6">
              <span className="material-symbols-outlined text-[18px]">add_circle</span> เพิ่มรายการ
            </button>

            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm text-text-muted dark:text-text-muted-dark">
                  <span>รวมเป็นเงิน</span>
                  <span>{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm text-text-muted dark:text-text-muted-dark">
                  <span>ภาษีมูลค่าเพิ่ม 7%</span>
                  <span>{vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-primary pt-2 border-t border-border-light dark:border-border-dark">
                  <span>ยอดสุทธิ</span>
                  <span>{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-border-light dark:border-border-dark flex justify-end gap-3">
            <button className="px-5 py-2 rounded-lg text-sm font-medium text-text-muted hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">บันทึกร่าง</button>
            <button
              onClick={handleCreatePR}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-dark shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">send</span> ส่งขออนุมัติ
            </button>
          </div>
        </div>

      </div>

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        onConfirm={() => {
          if (modalConfig.onConfirm) modalConfig.onConfirm();
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        showCancel={!!modalConfig.onConfirm}
      />
    </div>
  );
};

export default Expenditure;
