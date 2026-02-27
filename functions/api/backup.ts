// functions/api/backup.ts
// POST /api/backup → ZIP (json + sql + csv) → Telegram
// GET  /api/backup?action=export → download JSON
// PUT  /api/backup → restore จาก JSON

interface Env {
    DB: D1Database;
    TELEGRAM_BOT_TOKEN: string;
    TELEGRAM_CHAT_ID: string;
}

const TELEGRAM_BOT_TOKEN = '8505492579:AAHWRjIcdINKMetnp1bKcXt0xecVSoChSr8';
const TELEGRAM_CHAT_ID = '-1003201809285';
const TELEGRAM_THREAD_ID = '7637';

// ─── CRC32 ────────────────────────────────────────────────────────────────────
const CRC32_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[i] = c;
    }
    return t;
})();

function crc32(data: Uint8Array): number {
    let c = 0xffffffff;
    for (let i = 0; i < data.length; i++) c = CRC32_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

// ─── Minimal ZIP maker (Store method = no compression) ──────────────────────
function buildZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
    const enc = new TextEncoder();
    const now = new Date();
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);

    const localHeaders: Uint8Array[] = [];
    const centralDirs: Uint8Array[] = [];
    let offset = 0;

    for (const { name, data } of files) {
        const nameB = enc.encode(name);
        const crc = crc32(data);
        const size = data.length;

        // Local file header
        const lh = new Uint8Array(30 + nameB.length);
        const lv = new DataView(lh.buffer);
        lv.setUint32(0, 0x04034b50, true);
        lv.setUint16(4, 20, true);
        lv.setUint16(6, 0, true);
        lv.setUint16(8, 0, true);         // method: store
        lv.setUint16(10, dosTime, true);
        lv.setUint16(12, dosDate, true);
        lv.setUint32(14, crc, true);
        lv.setUint32(18, size, true);
        lv.setUint32(22, size, true);
        lv.setUint16(26, nameB.length, true);
        lv.setUint16(28, 0, true);
        lh.set(nameB, 30);

        // Central directory entry
        const cd = new Uint8Array(46 + nameB.length);
        const cv = new DataView(cd.buffer);
        cv.setUint32(0, 0x02014b50, true);
        cv.setUint16(4, 20, true);
        cv.setUint16(6, 20, true);
        cv.setUint16(8, 0, true);
        cv.setUint16(10, 0, true);
        cv.setUint16(12, dosTime, true);
        cv.setUint16(14, dosDate, true);
        cv.setUint32(16, crc, true);
        cv.setUint32(20, size, true);
        cv.setUint32(24, size, true);
        cv.setUint16(28, nameB.length, true);
        cv.setUint16(30, 0, true);
        cv.setUint16(32, 0, true);
        cv.setUint16(34, 0, true);
        cv.setUint16(36, 0, true);
        cv.setUint32(38, 0, true);
        cv.setUint32(42, offset, true);
        cd.set(nameB, 46);

        offset += lh.length + data.length;
        localHeaders.push(lh, data);
        centralDirs.push(cd);
    }

    // End of central directory
    const cdOffset = offset;
    const cdSize = centralDirs.reduce((s, e) => s + e.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, cdOffset, true);
    ev.setUint16(20, 0, true);

    const all = [...localHeaders, ...centralDirs, eocd];
    const total = all.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const p of all) { out.set(p, pos); pos += p.length; }
    return out;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getFiscalYear(dateStr: string) {
    const d = new Date(dateStr || '');
    if (isNaN(d.getTime())) return null;
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    return ((m >= 10 ? y + 1 : y) + 543).toString();
}

const FUNDS: Record<string, string> = {
    'fund-subsidy': 'เงินอุดหนุนรายหัว',
    'fund-15y-book': 'ค่าหนังสือเรียน',
    'fund-15y-supply': 'ค่าอุปกรณ์การเรียน',
    'fund-15y-uniform': 'ค่าเครื่องแบบนักเรียน',
    'fund-15y-activity': 'กิจกรรมพัฒนาคุณภาพ',
    'fund-poor': 'เงินปัจจัยพื้นฐานยากจน',
    'fund-state': 'เงินรายได้แผ่นดิน',
    'fund-lunch': 'เงินอาหารกลางวัน',
    'fund-eef': 'เงิน กสศ.',
    'fund-school-income': 'เงินรายได้สถานศึกษา',
    'fund-tax': 'เงินภาษี 1%',
};

function buildCSV(rows: any[], columns: { key: string; label: string }[]): string {
    const header = columns.map(c => `"${c.label}"`).join(',');
    const lines = rows.map(r =>
        columns.map(c => {
            const v = r[c.key] ?? '';
            return typeof v === 'number' ? v.toFixed(2) : `"${String(v).replace(/"/g, '""')}"`;
        }).join(',')
    );
    return '\uFEFF' + [header, ...lines].join('\r\n'); // BOM for Excel Thai
}

// ─── POST /api/backup → ZIP → Telegram ──────────────────────────────────────
export const onRequestPost: PagesFunction<Env> = async ({ env }) => {
    try {
        const enc = new TextEncoder();
        const now = new Date();
        const thaiDate = new Intl.DateTimeFormat('th-TH', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok'
        }).format(now);
        const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');

        // ดึงข้อมูล
        const [txResult, settingsRow, logsResult] = await Promise.all([
            env.DB.prepare('SELECT * FROM transactions ORDER BY date ASC, id ASC').all(),
            env.DB.prepare('SELECT * FROM school_settings WHERE id = 1').first(),
            env.DB.prepare(`SELECT * FROM audit_logs WHERE timestamp >= datetime('now', '-1 year') ORDER BY timestamp DESC LIMIT 1000`).all(),
        ]);

        const transactions = txResult.results as any[];
        const settings = settingsRow as any;
        const logs = logsResult.results as any[];
        const schoolName = settings?.school_name_th || 'โรงเรียน';
        const folderName = `backup-${stamp}`;

        // ── 1. JSON backup (restoreable) ──────────────────────────────────────
        const backupJson = JSON.stringify({ version: '1.0', exportedAt: now.toISOString(), settings, transactions, auditLogs: logs }, null, 2);

        // ── 2. SQL dump (restoreable via wrangler d1 execute) ─────────────────
        let sql = `-- LHB School Finance Backup\n-- Generated: ${now.toISOString()}\n-- School: ${schoolName}\n\n`;
        sql += `BEGIN TRANSACTION;\n\nDELETE FROM transactions;\n\n`;
        for (const tx of transactions) {
            const cols = ['id', 'date', 'doc_no', 'description', 'fund_type', 'income', 'expense', 'payer', 'payee', 'payee_type', 'bank_id', 'income_ref_id', 'extra_json'];
            const vals = cols.map(c => {
                const v = tx[c];
                if (v === null || v === undefined) return 'NULL';
                if (typeof v === 'number') return v;
                return `'${String(v).replace(/'/g, "''")}'`;
            }).join(', ');
            sql += `INSERT INTO transactions (${cols.join(', ')}) VALUES (${vals});\n`;
        }
        sql += `\nCOMMIT;\n`;

        // ── 3. CSV แยกปีงบ + แยก fund ─────────────────────────────────────────
        // จัดกลุ่ม
        const byFyFund: Record<string, Record<string, any[]>> = {};
        for (const tx of transactions) {
            const fy = getFiscalYear(tx.date) || 'ไม่ระบุ';
            const fund = tx.fund_type || 'other';
            if (!byFyFund[fy]) byFyFund[fy] = {};
            if (!byFyFund[fy][fund]) byFyFund[fy][fund] = [];
            byFyFund[fy][fund].push(tx);
        }

        const csvCols = [
            { key: 'date', label: 'วันที่' },
            { key: 'doc_no', label: 'เลขที่เอกสาร' },
            { key: 'description', label: 'รายการ' },
            { key: 'income', label: 'รับ (บาท)' },
            { key: 'expense', label: 'จ่าย (บาท)' },
            { key: 'payer', label: 'ผู้จ่าย/ผู้รับ' },
        ];

        // ── รวม files เข้า ZIP ────────────────────────────────────────────────
        const zipFiles: { name: string; data: Uint8Array }[] = [];

        // README
        const readme = `ไฟล์สำรองข้อมูล ${schoolName}\nวันที่สำรอง: ${thaiDate}\nรายการทั้งหมด: ${transactions.length}\n\nโครงสร้างไฟล์:\n  backup.json  → Restore ผ่านหน้า ตั้งค่าระบบ > โหลดข้อมูลกลับ\n  backup.sql   → Restore ด้วย: wrangler d1 execute lhb-fd-db --file=backup.sql --remote\n  csv/         → ข้อมูลแยกปีงบ แยกหมวดเงิน (เปิดด้วย Excel)`;
        zipFiles.push({ name: `${folderName}/README.txt`, data: enc.encode(readme) });

        // JSON
        zipFiles.push({ name: `${folderName}/backup.json`, data: enc.encode(backupJson) });

        // SQL
        zipFiles.push({ name: `${folderName}/backup.sql`, data: enc.encode(sql) });

        // CSV ต่อปีงบ
        for (const [fy, fundMap] of Object.entries(byFyFund).sort()) {
            // รวมทุก fund ในปีนั้น
            const allTxInFy = Object.values(fundMap).flat().sort((a, b) => a.date?.localeCompare(b.date || '') || 0);
            zipFiles.push({
                name: `${folderName}/csv/ปีงบ-${fy}/ทุกหมวด-${fy}.csv`,
                data: enc.encode(buildCSV(allTxInFy, csvCols)),
            });
            // แยกตาม fund
            for (const [fundKey, rows] of Object.entries(fundMap).sort()) {
                const fundName = FUNDS[fundKey] || fundKey;
                const sortedRows = [...rows].sort((a, b) => a.date?.localeCompare(b.date || '') || 0);
                zipFiles.push({
                    name: `${folderName}/csv/ปีงบ-${fy}/${fundName}.csv`,
                    data: enc.encode(buildCSV(sortedRows, csvCols)),
                });
            }
        }

        // สร้าง ZIP
        const zipBytes = buildZip(zipFiles);
        const zipFilename = `lhb-backup-${stamp}.zip`;

        // ส่ง Telegram
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('message_thread_id', TELEGRAM_THREAD_ID);
        formData.append('caption',
            `📦 สำรองข้อมูล ${schoolName}\n🗓 ${thaiDate}\n📊 ${transactions.length} รายการ\n\n📁 ประกอบด้วย:\n• backup.json (Restore ผ่าน UI)\n• backup.sql (Restore ผ่าน wrangler)\n• CSV แยกปีงบ ${Object.keys(byFyFund).join(', ')}`
        );
        formData.append('document', new Blob([zipBytes], { type: 'application/zip' }), zipFilename);

        const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
            method: 'POST', body: formData,
        });
        const tgJson = await tgRes.json() as any;

        return Response.json({
            success: true,
            message: 'ส่งสำรองข้อมูลไป Telegram สำเร็จ',
            filename: zipFilename,
            files: zipFiles.length,
            transactions: transactions.length,
            fiscalYears: Object.keys(byFyFund),
            telegram: { ok: tgJson.ok },
        });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
};

// ─── GET /api/backup?action=export → download JSON ───────────────────────────
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('action') === 'export') {
        const [txResult, settingsRow, logsResult] = await Promise.all([
            env.DB.prepare('SELECT * FROM transactions ORDER BY date ASC').all(),
            env.DB.prepare('SELECT * FROM school_settings WHERE id = 1').first(),
            env.DB.prepare(`SELECT * FROM audit_logs WHERE timestamp >= datetime('now', '-1 year') ORDER BY timestamp DESC LIMIT 1000`).all(),
        ]);
        const data = { version: '1.0', exportedAt: new Date().toISOString(), settings: settingsRow, transactions: txResult.results, auditLogs: logsResult.results };
        return new Response(JSON.stringify(data, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="lhb-backup-${new Date().toISOString().slice(0, 10)}.json"`,
            }
        });
    }
    return Response.json({ error: 'Unknown action' }, { status: 400 });
};

// ─── PUT /api/backup → restore จาก JSON ─────────────────────────────────────
export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
    try {
        const body: any = await request.json();
        if (!body.transactions || !Array.isArray(body.transactions)) {
            return Response.json({ error: 'ไฟล์ backup ไม่ถูกต้อง (ต้องมี transactions array)' }, { status: 400 });
        }

        await env.DB.prepare('DELETE FROM transactions').run();

        const txs = body.transactions as any[];
        if (txs.length > 0) {
            for (let i = 0; i < txs.length; i += 50) {
                const chunk = txs.slice(i, i + 50);
                await env.DB.batch(chunk.map((tx: any) =>
                    env.DB.prepare(
                        `INSERT OR REPLACE INTO transactions (id,date,doc_no,description,fund_type,income,expense,payer,payee,payee_type,bank_id,income_ref_id,extra_json)
                         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
                    ).bind(tx.id ?? null, tx.date ?? null, tx.doc_no ?? null, tx.description ?? null, tx.fund_type ?? null,
                        tx.income ?? 0, tx.expense ?? 0, tx.payer ?? null, tx.payee ?? null, tx.payee_type ?? null,
                        tx.bank_id ?? null, tx.income_ref_id ?? null, tx.extra_json ?? null)
                ));
            }
        }

        if (body.settings) {
            const s = body.settings as any;
            await env.DB.prepare(
                `INSERT OR REPLACE INTO school_settings (id,school_name_th,school_name_en,address,director_name,finance_officer,auditor,affiliation,bank_accounts,extra)
                 VALUES (1,?,?,?,?,?,?,?,?,?)`
            ).bind(s.school_name_th ?? null, s.school_name_en ?? null, s.address ?? null, s.director_name ?? null,
                s.finance_officer ?? null, s.auditor ?? null, s.affiliation ?? null, s.bank_accounts ?? null, s.extra ?? null).run();
        }

        await env.DB.prepare(
            `INSERT INTO audit_logs (timestamp,user_name,action,details,module) VALUES (datetime('now','+7 hours'),'ระบบ','RESTORE_BACKUP',?,'settings')`
        ).bind(`Restore ข้อมูลสำเร็จ: ${txs.length} รายการ`).run();

        return Response.json({ success: true, restored: txs.length, message: `Restore สำเร็จ: ${txs.length} รายการ` });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
};

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204 });
