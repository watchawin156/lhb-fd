// functions/api/backup.ts
// POST /api/backup - สร้าง backup และส่งไป Telegram

interface Env {
    DB: D1Database;
    TELEGRAM_BOT_TOKEN: string;
    TELEGRAM_CHAT_ID: string;
}

const TELEGRAM_BOT_TOKEN = '8505492579:AAHWRjIcdINKMetnp1bKcXt0xecVSoChSr8';
const TELEGRAM_CHAT_ID = '-1002301809285'; // supergroup chat id

async function sendTelegramFile(
    botToken: string,
    chatId: string,
    fileContent: string,
    filename: string,
    caption: string
) {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption);
    formData.append('document', new Blob([fileContent], { type: 'application/octet-stream' }), filename);

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
        method: 'POST',
        body: formData,
    });
    return res.json();
}

export const onRequestPost: PagesFunction<Env> = async ({ env }) => {
    try {
        const now = new Date();
        const thaiDate = new Intl.DateTimeFormat('th-TH', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
            timeZone: 'Asia/Bangkok'
        }).format(now);

        // ดึงข้อมูลทั้งหมดจาก D1
        const [txResult, settingsRow, logsResult] = await Promise.all([
            env.DB.prepare('SELECT * FROM transactions ORDER BY date ASC, id ASC').all(),
            env.DB.prepare('SELECT * FROM school_settings WHERE id = 1').first(),
            env.DB.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1000').all(),
        ]);

        const transactions = txResult.results;
        const settings = settingsRow;
        const logs = logsResult.results;

        // สร้างไฟล์ JSON สำรองข้อมูล
        const backupData = {
            version: '1.0',
            exportedAt: now.toISOString(),
            settings,
            transactions,
            auditLogs: logs,
        };

        const jsonContent = JSON.stringify(backupData, null, 2);
        const timestamp = now.toISOString().slice(0, 10).replace(/-/g, '');
        const schoolName = (settings as any)?.school_name_th || 'โรงเรียน';

        // จัดกลุ่มตามปีงบ
        interface TxRecord { date?: string; income?: number; expense?: number; fund_type?: string;[key: string]: any; }
        const fyGroups = new Map<string, TxRecord[]>();
        for (const tx of transactions as TxRecord[]) {
            const d = new Date(tx.date || '');
            const m = d.getMonth() + 1;
            const y = d.getFullYear();
            const fy = String((m >= 10 ? y + 1 : y) + 543);
            if (!fyGroups.has(fy)) fyGroups.set(fy, []);
            fyGroups.get(fy)!.push(tx as TxRecord);
        }

        // สร้าง CSV สรุปต่อปีงบ
        let csvSummary = `ระบบสำรองข้อมูล - ${schoolName}\nส่งออกเมื่อ: ${thaiDate}\n\n`;
        csvSummary += `ปีงบประมาณ,รายการทั้งหมด,รายรับรวม,รายจ่ายรวม,คงเหลือ\n`;

        for (const [fy, txs] of fyGroups) {
            const totalIncome = txs.reduce((s, t) => s + (t.income || 0), 0);
            const totalExpense = txs.reduce((s, t) => s + (t.expense || 0), 0);
            csvSummary += `${fy},${txs.length},${totalIncome.toFixed(2)},${totalExpense.toFixed(2)},${(totalIncome - totalExpense).toFixed(2)}\n`;
        }

        const botToken = TELEGRAM_BOT_TOKEN;
        const chatId = TELEGRAM_CHAT_ID;

        // ส่งไฟล์ JSON
        const caption = `📦 สำรองข้อมูล ${schoolName}\n🗓 ${thaiDate}\n📊 รายการ: ${transactions.length} รายการ\n📁 ไฟล์นี้นำกลับมาโหลดในระบบได้`;

        const [jsonResult, csvResult] = await Promise.all([
            sendTelegramFile(botToken, chatId, jsonContent, `lhb-backup-${timestamp}.db.json`, caption),
            sendTelegramFile(botToken, chatId, csvSummary, `lhb-summary-${timestamp}.csv`, `📊 สรุปรายปีงบประมาณ`),
        ]);

        return Response.json({
            success: true,
            message: `ส่งสำรองข้อมูลไป Telegram สำเร็จ`,
            transactions: transactions.length,
            fiscalYears: Array.from(fyGroups.keys()),
            telegram: {
                json: jsonResult.ok,
                csv: csvResult.ok,
            }
        });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
};

// GET /api/backup - restore จาก JSON
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'export') {
        // Export ข้อมูลเป็น JSON
        const [txResult, settingsRow, logsResult] = await Promise.all([
            env.DB.prepare('SELECT * FROM transactions ORDER BY date ASC').all(),
            env.DB.prepare('SELECT * FROM school_settings WHERE id = 1').first(),
            env.DB.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500').all(),
        ]);

        const data = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            settings: settingsRow,
            transactions: txResult.results,
            auditLogs: logsResult.results,
        };

        return new Response(JSON.stringify(data, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="lhb-backup-${new Date().toISOString().slice(0, 10)}.db.json"`,
            }
        });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
};

export const onRequestOptions: PagesFunction = async () => {
    return new Response(null, { status: 204 });
};
