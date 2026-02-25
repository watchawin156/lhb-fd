// functions/api/audit-logs.ts
// GET /api/audit-logs - ดึง log ทั้งหมด
// POST /api/audit-logs - บันทึก log ใหม่

interface Env {
    DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
    try {
        const { results } = await env.DB.prepare(
            'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500'
        ).all();
        return Response.json(results.map((r: any) => ({
            id: r.id,
            timestamp: r.timestamp,
            user: r.user_name,
            action: r.action,
            details: r.details,
            module: r.module,
        })));
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
    try {
        const body: any = await request.json();
        const { meta } = await env.DB.prepare(
            `INSERT INTO audit_logs (timestamp, user_name, action, details, module)
       VALUES (datetime('now'), ?, ?, ?, ?)`
        ).bind(
            body.user || 'เจ้าหน้าที่การเงิน',
            body.action || '',
            body.details || '',
            body.module || ''
        ).run();

        return Response.json({ id: meta.last_row_id }, { status: 201 });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
};

export const onRequestDelete: PagesFunction<Env> = async ({ env }) => {
    try {
        await env.DB.prepare('DELETE FROM audit_logs').run();
        await env.DB.prepare('DELETE FROM transactions').run();
        return Response.json({ success: true });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
};

export const onRequestOptions: PagesFunction = async () => {
    return new Response(null, { status: 204 });
};
