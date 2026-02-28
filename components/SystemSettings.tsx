import React, { useRef, useState, useEffect } from 'react';
import { useSchoolData } from '../context/SchoolContext';
import { generateFullBackupZip, BackupProgress } from '../lib/backupZipGenerator';

const SystemSettings: React.FC = () => {
    const { transactions, schoolSettings, updateSchoolSettings } = useSchoolData();

    // Modals state
    const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
    const [isDocNumModalOpen, setIsDocNumModalOpen] = useState(false);

    // Backup & Restore State
    const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
    const [backupMsg, setBackupMsg] = useState('');
    const [progress, setProgress] = useState<BackupProgress | null>(null);
    const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
    const [restoreMsg, setRestoreMsg] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto Doc Number State
    const [docPrefixes, setDocPrefixes] = useState({
        incomePrefix: '',
        expensePrefix: '',
        borrowPrefix: '',
        returnPrefix: ''
    });

    useEffect(() => {
        if (schoolSettings.docNumberSettings) {
            setDocPrefixes(schoolSettings.docNumberSettings);
        }
    }, [schoolSettings]);

    // ── สร้าง ZIP บน frontend แล้วส่ง Telegram ───────────────────────────────
    const handleFullBackup = async () => {
        setBackupStatus('loading');
        setBackupMsg('');
        setProgress(null);

        try {
            const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const schoolName = schoolSettings?.schoolNameTH || 'โรงเรียน';
            const filename = `lhb-backup-${stamp}.zip`;

            // สร้าง ZIP ทั้งหมด (PDF + Excel + JSON + SQL)
            const zipBytes = await generateFullBackupZip(
                transactions,
                schoolSettings,
                (p) => setProgress(p)
            );

            setProgress({ step: 'กำลังส่งไป Telegram...', total: 1, current: 1 });

            // ส่งไป Telegram ผ่าน /api/telegram-send
            const thaiDate = new Intl.DateTimeFormat('th-TH', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok'
            }).format(new Date());

            const caption = `📦 สำรองข้อมูล ${schoolName}\n🗓 ${thaiDate}\n📊 ${transactions.length} รายการ\n\n📁 zip ประกอบด้วย:\n• backup.json (Restore ผ่าน UI)\n• backup.sql (Restore ผ่าน wrangler)\n• PDF สมุดเงินสด + หน้าปก (แยกปีงบ)\n• Excel แยกปีงบ แยกหมวดเงิน`;

            const formData = new FormData();
            formData.append('file', new Blob([new Uint8Array(zipBytes)], { type: 'application/zip' }), filename);
            formData.append('caption', caption);
            formData.append('filename', filename);

            const res = await fetch('/api/telegram-send', { method: 'POST', body: formData });
            const result = await res.json();

            if (result.success) {
                setBackupStatus('ok');
                setBackupMsg(`✅ ส่ง ZIP สำเร็จ! (${(zipBytes.length / 1024).toFixed(0)} KB) → Telegram`);
                localStorage.setItem('lhb_last_auto_backup', String(Date.now()));
            } else {
                setBackupStatus('err');
                setBackupMsg(`❌ ${result.error || 'Telegram error'}`);
            }
        } catch (e: any) {
            setBackupStatus('err');
            setBackupMsg(`❌ ${e.message}`);
        } finally {
            setProgress(null);
        }
    };

    // ── Export JSON ────────────────────────────────────────────────────────────
    const handleExportJSON = () => window.open('/api/backup?action=export', '_blank');

    // ── Restore จากไฟล์ .json ─────────────────────────────────────────────────
    const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!confirm(`ยืนยัน Restore จากไฟล์ "${file.name}"?\n\n⚠️ ข้อมูลปัจจุบันจะถูกแทนที่ทั้งหมด`)) {
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
        } catch (err: any) {
            setRestoreStatus('err');
            setRestoreMsg(`❌ ${err.message}`);
        }
        e.target.value = '';
    };

    const handleSaveDocSettings = async () => {
        await updateSchoolSettings({ docNumberSettings: docPrefixes });
        alert('บันทึกการตั้งค่าเลขที่เอกสารอัตโนมัติสำเร็จแล้ว');
        setIsDocNumModalOpen(false);
    };

    const lastTs = Number(localStorage.getItem('lhb_last_auto_backup') || '0');
    const lastStr = lastTs
        ? new Date(lastTs).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
        : 'ยังไม่มี';

    const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark p-6">
            <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-10">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-text dark:text-text-dark flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-3xl">settings</span>
                        ตั้งค่าระบบ (System Settings)
                    </h2>
                </div>

                {/* Auto backup status */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-blue-600">cloud_done</span>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-blue-800">สำรองอัตโนมัติทุกครั้งที่เปิดเว็บ (JSON+SQL+CSV)</p>
                        <p className="text-xs text-blue-600 mt-0.5">
                            สำรองล่าสุด: <strong>{lastStr}</strong>
                        </p>
                    </div>
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Backup/Restore Card */}
                    <button
                        onClick={() => setIsBackupModalOpen(true)}
                        className="bg-white hover:bg-gray-50 dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center transition-all hover:-translate-y-1 hover:shadow-md group"
                    >
                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-3xl text-blue-600">cloud_sync</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">สำรองและกู้คืนข้อมูล</h3>
                        <p className="text-sm text-gray-500">สร้าง ZIP สำรองข้อมูลเต็มรูปแบบส่งเข้า Telegram หรือกู้คืนข้อมูลจากไฟล์ JSON</p>
                    </button>

                    {/* Auto Doc Number Card */}
                    <button
                        onClick={() => setIsDocNumModalOpen(true)}
                        className="bg-white hover:bg-gray-50 dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center transition-all hover:-translate-y-1 hover:shadow-md group"
                    >
                        <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-3xl text-purple-600">numbers</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">ตั้งค่าเลขที่เอกสารอัตโนมัติ</h3>
                        <p className="text-sm text-gray-500">กำหนดรูปแบบตัวย่อสำหรับการรันเลขที่เอกสารอัตโนมัติ (รายรับ, จ่าย, ยืม, คืน)</p>
                    </button>
                </div>

                {/* --- Backup & Restore Modal --- */}
                {isBackupModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden animate-scale-in">
                            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-600">cloud_sync</span>
                                    สำรองและกู้คืนข้อมูล
                                </h3>
                                <button onClick={() => setIsBackupModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="divide-y divide-gray-100 max-h-[75vh] overflow-y-auto">
                                {/* ── Full ZIP → Telegram ── */}
                                <div className="p-6 flex flex-col gap-4">
                                    <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                                        <div className="flex gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-blue-600 text-2xl">folder_zip</span>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-800 text-base">สร้าง ZIP ครบสมบูรณ์ → Telegram</h4>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    ZIP รวม: <code>backup.json</code> · <code>backup.sql</code> · <code>PDF/</code> สมุดเงินสด+หน้าปก · <code>Excel/</code> แต่ละปีงบ
                                                </p>
                                                {backupMsg && (
                                                    <p className={`text-sm mt-3 font-medium px-3 py-2 rounded-lg ${backupStatus === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                                        {backupMsg}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleFullBackup}
                                            disabled={backupStatus === 'loading'}
                                            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 shadow-sm flex items-center gap-2 shrink-0 transition-colors font-medium text-sm"
                                        >
                                            {backupStatus === 'loading'
                                                ? <><span className="material-symbols-outlined animate-spin">progress_activity</span> กำลังสร้าง...</>
                                                : <><span className="material-symbols-outlined">cloud_upload</span> สำรองเดี๋ยวนี้</>
                                            }
                                        </button>
                                    </div>

                                    {/* Progress bar */}
                                    {progress && (
                                        <div className="mt-2 pl-16">
                                            <div className="flex justify-between text-xs text-gray-500 mb-1.5 font-medium">
                                                <span>{progress.step}</span>
                                                <span>{pct}%</span>
                                            </div>
                                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* ZIP contents info */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pl-16">
                                        {[
                                            { icon: 'description', label: 'backup.json', sub: 'Restore ผ่าน UI', color: 'text-blue-600 bg-blue-50 border-blue-100' },
                                            { icon: 'terminal', label: 'backup.sql', sub: 'Restore ผ่าน wrangler', color: 'text-purple-600 bg-purple-50 border-purple-100' },
                                            { icon: 'picture_as_pdf', label: 'PDF/', sub: 'สมุดเงินสด + หน้าปก', color: 'text-red-600 bg-red-50 border-red-100' },
                                            { icon: 'table_view', label: 'Excel/', sub: 'แยกปีงบ แยกหมวดเงิน', color: 'text-green-600 bg-green-50 border-green-100' },
                                        ].map((item, i) => (
                                            <div key={i} className={`flex flex-col items-center justify-center p-3 rounded-xl border ${item.color} text-center gap-1`}>
                                                <span className="material-symbols-outlined text-2xl mb-1">{item.icon}</span>
                                                <p className="text-xs font-bold text-gray-800">{item.label}</p>
                                                <p className="text-[10px] text-gray-500">{item.sub}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ── ดาวน์โหลด JSON ── */}
                                <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-green-600 text-2xl">download</span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-800 text-base">ดาวน์โหลด JSON ลงเครื่อง</h4>
                                            <p className="text-sm text-gray-500 mt-1">บันทึก <code>.json</code> สำหรับ Restore ในอนาคต</p>
                                        </div>
                                    </div>
                                    <button onClick={handleExportJSON}
                                        className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-sm flex items-center gap-2 shrink-0 transition-colors font-medium text-sm">
                                        <span className="material-symbols-outlined">file_download</span> ดาวน์โหลด
                                    </button>
                                </div>

                                {/* ── Restore จากไฟล์ ── */}
                                <div className="p-6 flex flex-col md:flex-row items-start justify-between gap-4 bg-orange-50/30">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-orange-600 text-2xl">restore</span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-800 text-base">กู้คืนข้อมูลจากไฟล์ <code>backup.json</code></h4>
                                            <p className="text-sm text-gray-500 mt-1">เลือกไฟล์ <code>backup.json</code> จาก ZIP หรือที่บันทึกไว้</p>
                                            <p className="text-xs text-red-500 mt-2 font-bold px-2 py-1 bg-red-50 rounded inline-block">⚠️ ข้อมูลปัจจุบันจะถูกแทนที่ทั้งหมด</p>
                                            {restoreMsg && (
                                                <p className={`text-sm mt-3 font-medium px-3 py-2 rounded-lg ${restoreStatus === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
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
                                            className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:bg-gray-300 shadow-sm flex items-center gap-2 transition-colors font-medium text-sm"
                                        >
                                            {restoreStatus === 'loading'
                                                ? <><span className="material-symbols-outlined animate-spin">progress_activity</span> กำลัง Restore...</>
                                                : <><span className="material-symbols-outlined">upload_file</span> เลือกไฟล์ .json</>
                                            }
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                {/* --- Auto Doc Number Modal --- */}
                {isDocNumModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-scale-in">
                            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-purple-600">numbers</span>
                                    ตั้งค่าเลขที่เอกสารอัตโนมัติ
                                </h3>
                                <button onClick={() => setIsDocNumModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-sm font-semibold text-gray-700 block mb-1">คำนำหน้ารายรับ (Income)</label>
                                    <input
                                        type="text"
                                        value={docPrefixes.incomePrefix}
                                        onChange={e => setDocPrefixes({ ...docPrefixes, incomePrefix: e.target.value })}
                                        placeholder="เช่น ร."
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-700 block mb-1">คำนำหน้ารายจ่าย (Expense)</label>
                                    <input
                                        type="text"
                                        value={docPrefixes.expensePrefix}
                                        onChange={e => setDocPrefixes({ ...docPrefixes, expensePrefix: e.target.value })}
                                        placeholder="เช่น จ."
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-700 block mb-1">คำนำหน้าขอยืมเงิน (Borrow)</label>
                                    <input
                                        type="text"
                                        value={docPrefixes.borrowPrefix}
                                        onChange={e => setDocPrefixes({ ...docPrefixes, borrowPrefix: e.target.value })}
                                        placeholder="เช่น ย."
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-700 block mb-1">คำนำหน้าส่งใช้คืนเงินยืม (Return)</label>
                                    <input
                                        type="text"
                                        value={docPrefixes.returnPrefix}
                                        onChange={e => setDocPrefixes({ ...docPrefixes, returnPrefix: e.target.value })}
                                        placeholder="เช่น ค."
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-purple-500"
                                    />
                                </div>

                                <div className="mt-6">
                                    <button
                                        onClick={handleSaveDocSettings}
                                        className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition"
                                    >
                                        บันทึกการตั้งค่า
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SystemSettings;
