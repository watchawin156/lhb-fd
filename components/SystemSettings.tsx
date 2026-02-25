import React, { useRef, useState } from 'react';
import { useSchoolData } from '../context/SchoolContext';

const SystemSettings: React.FC = () => {
    const { } = useSchoolData();
    const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
    const [backupMsg, setBackupMsg] = useState('');
    const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
    const [restoreMsg, setRestoreMsg] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── ส่งสำรองข้อมูลไป Telegram (ZIP) ──────────────────────────────────────
    const handleBackupNow = async () => {
        setBackupStatus('loading');
        setBackupMsg('');
        try {
            const res = await fetch('/api/backup', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setBackupStatus('ok');
                setBackupMsg(`✅ ส่ง ZIP สำเร็จ! ${data.transactions} รายการ → Telegram (${data.files} ไฟล์ในซิป)`);
                localStorage.setItem('lhb_last_auto_backup', String(Date.now()));
            } else {
                setBackupStatus('err');
                setBackupMsg(`❌ ${data.error || 'เกิดข้อผิดพลาด'}`);
            }
        } catch (e: any) {
            setBackupStatus('err');
            setBackupMsg(`❌ ${e.message}`);
        }
    };

    // ── Export JSON ────────────────────────────────────────────────────────────
    const handleExportJSON = () => {
        window.open('/api/backup?action=export', '_blank');
    };

    // ── Restore จาก JSON file ─────────────────────────────────────────────────
    const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!confirm(`ยืนยัน Restore จากไฟล์ "${file.name}"?\n\n⚠️ ข้อมูลปัจจุบันในระบบจะถูกแทนที่ทั้งหมด`)) {
            e.target.value = '';
            return;
        }
        setRestoreStatus('loading');
        setRestoreMsg('');
        try {
            const text = await file.text();
            const json = JSON.parse(text);
            const res = await fetch('/api/backup', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(json),
            });
            const data = await res.json();
            if (data.success) {
                setRestoreStatus('ok');
                setRestoreMsg(`✅ Restore สำเร็จ! ${data.restored} รายการ — กำลังรีโหลด...`);
                setTimeout(() => window.location.reload(), 1800);
            } else {
                setRestoreStatus('err');
                setRestoreMsg(`❌ ${data.error || 'เกิดข้อผิดพลาด'}`);
            }
        } catch (e: any) {
            setRestoreStatus('err');
            setRestoreMsg(`❌ ${e.message}`);
        }
        e.target.value = '';
    };

    const lastTs = Number(localStorage.getItem('lhb_last_auto_backup') || '0');
    const lastStr = lastTs
        ? new Date(lastTs).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
        : 'ยังไม่มี (จะสำรองอัตโนมัติเมื่อใช้งานครبت 1 ชม.)';

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark p-6">
            <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-10">

                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-text dark:text-text-dark flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-3xl">settings</span>
                        ตั้งค่าระบบ (System Settings)
                    </h2>
                </div>

                {/* ═══ Auto Backup Status ════════════════════════════════════════ */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-blue-600">cloud_done</span>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-blue-800">สำรองอัตโนมัติทุกครั้งที่เปิดเว็บ</p>
                        <p className="text-xs text-blue-600 mt-0.5">
                            ส่ง ZIP ไป Telegram ทุกชั่วโมง · สำรองล่าสุด: <strong>{lastStr}</strong>
                        </p>
                    </div>
                </div>

                {/* ═══ Backup & Restore Section ══════════════════════════════════ */}
                <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">cloud_sync</span>
                            สำรองและกู้คืนข้อมูล
                        </h3>
                    </div>

                    <div className="divide-y divide-gray-100">

                        {/* ── ส่ง ZIP → Telegram ── */}
                        <div className="p-5 flex flex-col md:flex-row items-start justify-between gap-4">
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="material-symbols-outlined text-blue-600 text-xl">send</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800">ส่งสำรองข้อมูลไป Telegram ทันที</h4>
                                    <p className="text-sm text-gray-500 mt-0.5">ZIP ประกอบด้วย: <code>backup.json</code> · <code>backup.sql</code> · CSV แยกปีงบ แยกหมวดเงิน</p>
                                    {backupMsg && (
                                        <p className={`text-sm mt-2 font-medium ${backupStatus === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                                            {backupMsg}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={handleBackupNow}
                                disabled={backupStatus === 'loading'}
                                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 shadow-sm flex items-center gap-2 shrink-0 transition-colors font-medium text-sm"
                            >
                                {backupStatus === 'loading'
                                    ? <><span className="material-symbols-outlined text-xl animate-spin">progress_activity</span> กำลังส่ง...</>
                                    : <><span className="material-symbols-outlined text-xl">cloud_upload</span> ส่งเดี๋ยวนี้</>
                                }
                            </button>
                        </div>

                        {/* ── ดาวน์โหลด JSON ── */}
                        <div className="p-5 flex flex-col md:flex-row items-start justify-between gap-4">
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="material-symbols-outlined text-green-600 text-xl">download</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800">ดาวน์โหลด JSON ลงเครื่อง</h4>
                                    <p className="text-sm text-gray-500 mt-0.5">บันทึก <code>.json</code> ไว้กับตัวเอง สำหรับ Restore ในอนาคต</p>
                                </div>
                            </div>
                            <button
                                onClick={handleExportJSON}
                                className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-sm flex items-center gap-2 shrink-0 transition-colors font-medium text-sm"
                            >
                                <span className="material-symbols-outlined text-xl">file_download</span>
                                ดาวน์โหลด
                            </button>
                        </div>

                        {/* ── Restore จากไฟล์ ── */}
                        <div className="p-5 flex flex-col md:flex-row items-start justify-between gap-4">
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="material-symbols-outlined text-amber-600 text-xl">restore</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800">โหลดข้อมูลกลับจากไฟล์ <code>.json</code></h4>
                                    <p className="text-sm text-gray-500 mt-0.5">เลือกไฟล์ <code>backup.json</code> จาก ZIP หรือที่ดาวน์โหลดไว้ เพื่อกู้คืนข้อมูล</p>
                                    <p className="text-xs text-red-500 mt-1 font-medium">⚠️ ข้อมูลปัจจุบันในฐานข้อมูลจะถูกแทนที่ทั้งหมด</p>
                                    {restoreMsg && (
                                        <p className={`text-sm mt-2 font-medium ${restoreStatus === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                                            {restoreMsg}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="shrink-0">
                                <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleRestoreFile} />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={restoreStatus === 'loading'}
                                    className="px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:bg-gray-300 shadow-sm flex items-center gap-2 transition-colors font-medium text-sm"
                                >
                                    {restoreStatus === 'loading'
                                        ? <><span className="material-symbols-outlined text-xl animate-spin">progress_activity</span> กำลัง Restore...</>
                                        : <><span className="material-symbols-outlined text-xl">upload_file</span> เลือกไฟล์ .json</>
                                    }
                                </button>
                            </div>
                        </div>

                        {/* ── SQL Restore Note ── */}
                        <div className="p-5 bg-gray-50/50">
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="material-symbols-outlined text-purple-600 text-xl">terminal</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-700 text-sm">Restore จาก <code>backup.sql</code> (สำหรับผู้ดูแลระบบ)</h4>
                                    <p className="text-xs text-gray-500 mt-1">ดึงไฟล์ <code>backup.sql</code> จาก ZIP แล้วรันคำสั่ง:</p>
                                    <code className="block mt-1.5 text-xs bg-gray-900 text-green-400 rounded-lg px-3 py-2 font-mono">
                                        npx wrangler d1 execute lhb-fd-db --file=backup.sql --remote
                                    </code>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default SystemSettings;
