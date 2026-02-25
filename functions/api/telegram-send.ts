// functions/api/telegram-send.ts
// POST /api/telegram-send - รับ binary ZIP จาก frontend แล้วส่งไป Telegram

interface Env {
    TELEGRAM_BOT_TOKEN: string;
    TELEGRAM_CHAT_ID: string;
}

const TELEGRAM_BOT_TOKEN = '8505492579:AAHWRjIcdINKMetnp1bKcXt0xecVSoChSr8';
const TELEGRAM_CHAT_ID = '-1002301809285';

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
    try {
        // รับ FormData จาก frontend (มี file binary + caption + filename)
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const caption = formData.get('caption') as string || 'สำรองข้อมูล';
        const filename = formData.get('filename') as string || 'backup.zip';

        if (!file) {
            return Response.json({ error: 'ไม่พบไฟล์' }, { status: 400 });
        }

        // ส่งไป Telegram
        const tgForm = new FormData();
        tgForm.append('chat_id', TELEGRAM_CHAT_ID);
        tgForm.append('caption', caption);
        tgForm.append('document', file, filename);

        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
            method: 'POST',
            body: tgForm,
        });

        const result = await res.json() as any;
        if (!result.ok) {
            return Response.json({ error: result.description || 'Telegram error' }, { status: 500 });
        }

        return Response.json({ success: true, message_id: result.result?.message_id });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
};

export const onRequestOptions: PagesFunction = async () =>
    new Response(null, { status: 204 });
