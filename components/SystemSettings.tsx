import React, { useRef, useState } from 'react';
import { useSchoolData } from '../context/SchoolContext';
import { generateFullBackupZip, BackupProgress } from '../lib/backupZipGenerator';

const SystemSettings: React.FC = () => {
    const { transactions, schoolSettings } = useSchoolData();
    const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
    const [backupMsg, setBackupMsg] = useState('');
    const [progress, setProgress] = useState<BackupProgress | null>(null);
    const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
    const [restoreMsg, setRestoreMsg] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            formData.append('file', new Blob([zipBytes], { type: 'application/zip' }), filename);
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
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-blue-600">cloud_done</span>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-blue-800">สำรองอัตโนมัติทุกครั้งที่เปิดเว็บ (JSON+SQL+CSV)</p>
                        <p className="text-xs text-blue-600 mt-0.5">
                            สำรองล่าสุด: <strong>{lastStr}</strong>
                            &nbsp;·&nbsp;การกดปุ่มด้านล่างจะสร้าง ZIP ครบสมบูรณ์รวม PDF + Excel ด้วย
                        </p>
                    </div>
                </div>

                {/* Backup & Restore */}
                <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">cloud_sync</span>
                            สำรองและกู้คืนข้อมูล
                        </h3>
                    </div>

                    <div className="divide-y divide-gray-100">

                        {/* ── Full ZIP → Telegram ── */}
                        <div className="p-5 flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                                <div className="flex gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="material-symbols-outlined text-blue-600 text-xl">folder_zip</span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">สร้าง ZIP ครบสมบูรณ์ → Telegram</h4>
                                        <p className="text-sm text-gray-500 mt-0.5">
                                            ZIP รวม: <code>backup.json</code> · <code>backup.sql</code> · <code>PDF/</code> สมุดเงินสด+หน้าปก · <code>Excel/</code> แต่ละปีงบ
                                        </p>
                                        {backupMsg && (
                                            <p className={`text-sm mt-2 font-medium ${backupStatus === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                                                {backupMsg}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={handleFullBackup}
                                    disabled={backupStatus === 'loading'}
                                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 shadow-sm flex items-center gap-2 shrink-0 transition-colors font-medium text-sm"
                                >
                                    {backupStatus === 'loading'
                                        ? <><span className="material-symbols-outlined text-xl animate-spin">progress_activity</span> กำลังสร้าง...</>
                                        : <><span className="material-symbols-outlined text-xl">cloud_upload</span> สำรองเดี๋ยวนี้</>
                                    }
                                </button>
                            </div>

                            {/* Progress bar */}
                            {progress && (
                                <div>
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>{progress.step}</span>
                                        <span>{pct}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ZIP contents info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                                {[
                                    { icon: 'description', label: 'backup.json', sub: 'Restore ผ่าน UI', color: 'text-blue-600 bg-blue-50' },
                                    { icon: 'terminal', label: 'backup.sql', sub: 'Restore ผ่าน wrangler', color: 'text-purple-600 bg-purple-50' },
                                    { icon: 'picture_as_pdf', label: 'PDF/', sub: 'สมุดเงินสด + หน้าปก', color: 'text-red-600 bg-red-50' },
                                    { icon: 'table_view', label: 'Excel/', sub: 'แยกปีงบ แยกหมวดเงิน', color: 'text-green-600 bg-green-50' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                                        <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${item.color}`}>
                                            <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-gray-700 truncate">{item.label}</p>
                                            <p className="text-[10px] text-gray-400 truncate">{item.sub}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── ดาวน์โหลด JSON ── */}
                        <div className="p-5 flex flex-col md:flex-row items-start justify-between gap-4">
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="material-symbols-outlined text-green-600 text-xl">download</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800">ดาวน์โหลด JSON ลงเครื่อง</h4>
                                    <p className="text-sm text-gray-500 mt-0.5">บันทึก <code>.json</code> สำหรับ Restore ในอนาคต</p>
                                </div>
                            </div>
                            <button onClick={handleExportJSON}
                                className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-sm flex items-center gap-2 shrink-0 transition-colors font-medium text-sm">
                                <span className="material-symbols-outlined text-xl">file_download</span> ดาวน์โหลด
                            </button>
                        </div>

                        {/* ── Restore จากไฟล์ ── */}
                        <div className="p-5 flex flex-col md:flex-row items-start justify-between gap-4">
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="material-symbols-outlined text-amber-600 text-xl">restore</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800">กู้คืนข้อมูลจากไฟล์ <code>backup.json</code></h4>
                                    <p className="text-sm text-gray-500 mt-0.5">เลือกไฟล์ <code>backup.json</code> จาก ZIP หรือที่บันทึกไว้</p>
                                    <p className="text-xs text-red-500 mt-1 font-medium">⚠️ ข้อมูลปัจจุบันจะถูกแทนที่ทั้งหมด</p>
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

                        {/* SQL restore note */}
                        <div className="p-5 bg-gray-50/50">
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="material-symbols-outlined text-purple-600 text-xl">terminal</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-700 text-sm">Restore จาก <code>backup.sql</code> (สำหรับผู้ดูแลระบบ)</h4>
                                    <p className="text-xs text-gray-500 mt-1">ดึงไฟล์ <code>backup.sql</code> จาก ZIP แล้วรัน:</p>
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
