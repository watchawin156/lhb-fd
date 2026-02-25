import React, { useState } from 'react';
import { useSchoolData } from '../context/SchoolContext';

const SystemSettings: React.FC = () => {
    const { resetData } = useSchoolData();
    const [confirmReset, setConfirmReset] = useState(false);

    const handleReset = () => {
        resetData();
        alert('ล้างข้อมูลสำเร็จ ข้อมูลถูกทำการรีเซ็ตใหม่แล้ว (ยกเว้นการตั้งค่าหัวกระดาษ)');
        setConfirmReset(false);
        window.location.reload();
    };

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark p-6">
            <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-10">

                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-text dark:text-text-dark flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-3xl">settings</span>
                        ตั้งค่าระบบ (System Settings)
                    </h2>
                </div>

                <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-red-100 dark:border-red-900/30 overflow-hidden">
                    <div className="p-6 border-b border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10">
                        <h3 className="font-bold text-lg text-red-600 dark:text-red-400">จัดการข้อมูลระบบ (Data Management)</h3>
                        <p className="text-xs text-red-500 mt-1">ส่วนนี้มีผลกระทบต่อข้อมูลในระบบ โปรดใช้งานด้วยความระมัดระวัง</p>
                    </div>
                    <div className="p-6 flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                            <div>
                                <h4 className="font-bold text-text dark:text-text-dark">ล้างข้อมูลธุรกรรมและการเงินทั้งหมด (Clear All Transaction Data)</h4>
                                <p className="text-sm text-text-muted dark:text-text-muted-dark mt-1">
                                    การล้างข้อมูลจะทำการลบรายการเดินบัญชี ใบเสร็จรับเงิน ใบเบิกจ่าย และประวัติการทำรายการต่างๆ ทั้งหมด
                                    (โดยจะยังคงรักษาการตั้งค่าโรงเรียนและชื่อผู้เซ็นไว้) เหมาะสำหรับเริ่มต้นปีงบประมาณใหม่
                                </p>
                            </div>
                            <button
                                onClick={() => setConfirmReset(!confirmReset)}
                                className="px-5 py-2 border border-red-500 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors bg-white dark:bg-surface-dark shrink-0"
                            >
                                {confirmReset ? 'ยกเลิก' : 'ล้างข้อมูล'}
                            </button>
                        </div>

                        {confirmReset && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fade-in-down">
                                <p className="text-red-700 dark:text-red-300 font-medium mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined">warning</span>
                                    คำเตือน: คุณแน่ใจหรือไม่ที่จะลบข้อมูลทั้งหมด? การกระทำนี้ไม่สามารถกู้คืนได้ นอกเสียจากคุณทำการสำรองข้อมูลไว้แล้ว
                                </p>
                                <button
                                    onClick={handleReset}
                                    className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined">delete_forever</span>
                                    ยืนยันการล้างข้อมูลแบบถาวร
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SystemSettings;
