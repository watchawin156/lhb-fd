// functions/api/transactions/[id].ts
// PUT /api/transactions/:id - แก้ไขรายการ
// DELETE /api/transactions/:id - ลบรายการ

interface Env {
    DB: D1Database;
}

export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
    try {
        const idParam = params.id as string;
        const id = isNaN(Number(idParam)) ? idParam : Number(idParam);
        const body: any = await request.json();
        const extra: any = {};
        const knownKeys = ['date', 'docNo', 'description', 'fundType', 'income', 'expense', 'payer', 'payee', 'payeeType', 'bankId', 'incomeRefId'];
        for (const k of Object.keys(body)) {
            if (!knownKeys.includes(k)) extra[k] = body[k];
        }

        await env.DB.prepare(
            `UPDATE transactions SET
        date = ?, doc_no = ?, description = ?, fund_type = ?,
        income = ?, expense = ?, payer = ?, payee = ?,
        payee_type = ?, bank_id = ?, income_ref_id = ?,
        extra_json = ?, updated_at = datetime('now')
       WHERE id = ?`
        ).bind(
            body.date,
            body.docNo || null,
            body.description || null,
            body.fundType,
            body.income || 0,
            body.expense || 0,
            body.payer || null,
            body.payee || null,
            body.payeeType || null,
            body.bankId || null,
            body.incomeRefId || null,
            Object.keys(extra).length > 0 ? JSON.stringify(extra) : null,
            id
        ).run();

        return Response.json({ success: true, id });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
};

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
    try {
        const idParam = params.id as string;
        const id = isNaN(Number(idParam)) ? idParam : Number(idParam);
        await env.DB.prepare('DELETE FROM transactions WHERE id = ?').bind(id).run();
        return Response.json({ success: true });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
};

export const onRequestOptions: PagesFunction = async () => {
    return new Response(null, { status: 204 });
};
