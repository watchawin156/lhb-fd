
import React, { useState, useEffect } from 'react';
import { useSchoolData } from '../context/SchoolContext';
import { FUND_TYPE_OPTIONS } from '../utils';
import ConfirmModal from './ConfirmModal';
import DeleteConfirmModal from './DeleteConfirmModal';

const SchoolSettings: React.FC = () => {
  const { schoolSettings, updateSchoolSettings } = useSchoolData();
  const [formData, setFormData] = useState(schoolSettings);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    setFormData(schoolSettings);
  }, [schoolSettings]);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    onConfirm?: () => void;
    showCancel?: boolean;
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (reason: string) => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });

  const showAlert = (title: string, message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info', onConfirm?: () => void) => {
    setModalConfig({ isOpen: true, title, message, type, onConfirm, showCancel: !!onConfirm });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showAlert('ไฟล์มีขนาดใหญ่เกินไป', 'ขนาดไฟล์โลโก้ต้องไม่เกิน 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const currentAccounts = formData.bankAccounts || [];

  const addAccount = () => {
    const newAcc = {
      id: 'ba-' + Date.now(),
      name: 'บัญชีใหม่',
      bankName: 'ระบุธนาคาร',
      accountNo: '',
      fundTypes: [],
      color: 'gray'
    };
    setFormData(prev => ({ ...prev, bankAccounts: [...(prev.bankAccounts || []), newAcc] }));
  };

  const updateAccount = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      bankAccounts: (prev.bankAccounts || []).map(acc =>
        acc.id === id ? { ...acc, [field]: value } : acc
      )
    }));
  };

  const toggleFundType = (accId: string, fundTypeValue: string) => {
    setFormData(prev => ({
      ...prev,
      bankAccounts: (prev.bankAccounts || []).map(acc => {
        if (acc.id !== accId) return acc;
        const currentTypes = acc.fundTypes || [];
        if (currentTypes.includes(fundTypeValue)) {
          return { ...acc, fundTypes: currentTypes.filter(t => t !== fundTypeValue) };
        } else {
          return { ...acc, fundTypes: [...currentTypes, fundTypeValue] };
        }
      })
    }));
  };

  const deleteAccount = (id: string) => {
    const acc = formData.bankAccounts?.find(a => a.id === id);
    setDeleteModalConfig({
      isOpen: true,
      title: 'ยืนยันการลบบัญชีธนาคาร',
      message: `คุณยืนยันที่จะลบบัญชีธนาคาร "${acc?.name}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      onConfirm: (reason: string) => {
        setFormData(prev => ({
          ...prev,
          bankAccounts: (prev.bankAccounts || []).filter(a => a.id !== id)
        }));
        setDeleteModalConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSave = () => {
    updateSchoolSettings(formData);
    showAlert('บันทึกสำเร็จ', 'ข้อมูลโรงเรียนได้รับการอัปเดตเรียบร้อยแล้ว', 'success');
    setIsUnlocked(false);
  };

  const handleUnlock = () => {
    // สำหรับการปลดล็อค เราอาจจะใช้ Prompt Modal ในอนาคต
    // แต่ปัจจุบันขอใช้ prompt เดิมไปก่อนหรือเปลี่ยนเป็น modal พิเศษ
    const pwd = prompt('กรุณาป้อนรหัสผ่านเพื่อแก้ไขข้อมูล (รหัสจำลอง: 1234)');
    if (pwd === '1234') {
      setIsUnlocked(true);
    } else if (pwd !== null) {
      showAlert('รหัสผ่านไม่ถูกต้อง', 'รหัสผ่านที่คุณป้อนไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-10">

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-text dark:text-text-dark flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">school</span>
            ข้อมูลทั่วไปของโรงเรียน
          </h2>
          {!isUnlocked ? (
            <button
              onClick={handleUnlock}
              className="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 shadow-md transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">lock</span> ปลดล็อคเพื่อแก้ไข
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark shadow-md transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">save</span> บันทึกข้อมูล
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20">
            <h3 className="font-bold text-lg text-navy dark:text-white">รายละเอียดสถานศึกษา</h3>
            <p className="text-xs text-text-muted">ข้อมูลนี้จะถูกนำไปแสดงบนหัวกระดาษรายงานและเอกสารทางการเงิน</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Logo Upload */}
            <div className="flex items-center gap-6">
              <label className="cursor-pointer group flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-500 flex items-center justify-center text-text-muted overflow-hidden relative hover:bg-gray-50 hover:border-primary transition-colors">
                  {formData.logo ? (
                    <img src={formData.logo} alt="School Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                      <p className="text-[10px] mt-1">โลโก้โรงเรียน</p>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text dark:text-text-dark group-hover:text-primary transition-colors">ตราสัญลักษณ์โรงเรียน</h4>
                  <p className="text-xs text-text-muted mb-2">รองรับไฟล์ .png, .jpg ขนาดไม่เกิน 2MB</p>
                  {isUnlocked && (
                    <>
                      <span className="text-xs text-primary group-hover:underline font-medium cursor-pointer">อัปโหลดรูปภาพ</span>
                      <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleLogoUpload} disabled={!isUnlocked} />
                    </>
                  )}
                </div>
              </label>
              {formData.logo && isUnlocked && (
                <button onClick={() => setFormData(prev => ({ ...prev, logo: undefined }))} className="text-xs text-red-500 hover:underline">
                  ลบรูปภาพ
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted">ชื่อโรงเรียน (ภาษาไทย)</label>
                <input
                  type="text" name="schoolNameTH" value={formData.schoolNameTH} onChange={handleChange} disabled={!isUnlocked}
                  className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted">School Name (English)</label>
                <input
                  type="text" name="schoolNameEN" value={formData.schoolNameEN} onChange={handleChange} disabled={!isUnlocked}
                  className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">ที่อยู่</label>
              <textarea
                name="address" rows={3} value={formData.address} onChange={handleChange} disabled={!isUnlocked}
                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">สังกัด</label>
              <input
                type="text" name="affiliation" value={formData.affiliation} onChange={handleChange} disabled={!isUnlocked}
                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted">ชื่อผู้อำนวยการ</label>
                <input
                  type="text" name="directorName" value={formData.directorName} onChange={handleChange} disabled={!isUnlocked}
                  className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-600">ชื่อเจ้าหน้าที่การเงิน</label>
                <input
                  type="text" name="financeOfficerName" value={formData.financeOfficerName} onChange={handleChange} disabled={!isUnlocked}
                  className="w-full p-2.5 rounded-lg border border-blue-200 bg-blue-50/20 focus:ring-2 focus:ring-blue-500/20 outline-none disabled:opacity-50"
                  placeholder="ระบุชื่อเจ้าหน้าที่การเงิน"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-green-600">ชื่อผู้ตรวจบัญชี</label>
                <input
                  type="text" name="auditorName" value={formData.auditorName} onChange={handleChange} disabled={!isUnlocked}
                  className="w-full p-2.5 rounded-lg border border-green-200 bg-green-50/20 focus:ring-2 focus:ring-green-500/20 outline-none disabled:opacity-50"
                  placeholder="ระบุชื่อผู้ตรวจบัญชี"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Bank Accounts Section */}
        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mt-6">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg text-navy dark:text-white">ข้อมูลบัญชีเงินฝากธนาคาร</h3>
              <p className="text-xs text-text-muted">บัญชีที่ใช้แสดงในระบบสมุดเงินสด</p>
            </div>
            {isUnlocked && (
              <button onClick={addAccount} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-100 transition-colors">
                <span className="material-symbols-outlined text-base">add</span> เพิ่มบัญชี
              </button>
            )}
          </div>
          <div className="p-6 space-y-4">
            {currentAccounts.map((acc, idx) => (
              <div key={acc.id} className={`p-4 border ${isUnlocked ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 bg-gray-50'} rounded-xl flex flex-col md:flex-row gap-4 relative group`}>
                {isUnlocked && (
                  <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => deleteAccount(acc.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-lg">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                )}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500">ชื่อบัญชี</label>
                    <input type="text" value={acc.name} onChange={(e) => updateAccount(acc.id, 'name', e.target.value)} disabled={!isUnlocked}
                      className="w-full mt-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="เช่น บช.เงินอุดหนุนอื่น (ธกส.)" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">ธนาคาร</label>
                    <input type="text" value={acc.bankName} onChange={(e) => updateAccount(acc.id, 'bankName', e.target.value)} disabled={!isUnlocked}
                      className="w-full mt-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="เช่น ธนาคารเพื่อการเกษตรและสหกรณ์" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">เลขบัญชี</label>
                    <input type="text" value={acc.accountNo} onChange={(e) => updateAccount(acc.id, 'accountNo', e.target.value)} disabled={!isUnlocked}
                      className="w-full mt-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono disabled:bg-gray-100 disabled:text-gray-500" placeholder="000-0-XXXXX-X" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">สีโปรไฟล์ (ใช้แสดงผล)</label>
                    <select value={acc.color} onChange={(e) => updateAccount(acc.id, 'color', e.target.value)} disabled={!isUnlocked}
                      className="w-full mt-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500">
                      <option value="blue">น้ำเงิน</option>
                      <option value="green">เขียว</option>
                      <option value="purple">ม่วง</option>
                      <option value="orange">ส้ม</option>
                      <option value="red">แดง</option>
                      <option value="gray">เทา</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 mt-2">
                    <label className="text-xs font-medium text-gray-500 block mb-2">ประเภท / หมวดเงินที่ผูกกับบัญชีนี้</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {FUND_TYPE_OPTIONS.map(ft => (
                        <label key={ft.value} className={`flex items-start gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${!isUnlocked ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'hover:bg-blue-50 hover:border-blue-200'} ${(acc.fundTypes || []).includes(ft.value) ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200'}`}>
                          <input
                            type="checkbox"
                            disabled={!isUnlocked}
                            checked={(acc.fundTypes || []).includes(ft.value)}
                            onChange={() => toggleFundType(acc.id, ft.value)}
                            className="mt-1"
                          />
                          <span className="text-xs text-gray-700 leading-tight">
                            {ft.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {currentAccounts.length === 0 && (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                ยังไม่มีบัญชีธนาคารในระบบ
              </div>
            )}
          </div>
        </div>

      </div>

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={() => {
          modalConfig.onConfirm?.();
          setModalConfig({ ...modalConfig, isOpen: false });
        }}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        showCancel={modalConfig.showCancel}
        confirmLabel={modalConfig.confirmLabel || (modalConfig.type === 'warning' ? 'ยืนยัน' : 'ตกลง')}
        cancelLabel="ยกเลิก"
      />

      <DeleteConfirmModal
        isOpen={deleteModalConfig.isOpen}
        title={deleteModalConfig.title}
        message={deleteModalConfig.message}
        onCancel={() => setDeleteModalConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={(reason) => {
          deleteModalConfig.onConfirm(reason);
        }}
      />
    </div>
  );
};

export default SchoolSettings;
