// functions/api/transactions.ts
// GET /api/transactions - ดึงรายการทั้งหมด
// POST /api/transactions - เพิ่มรายการใหม่

interface Env {
    DB: D1Database;
}

function txFromRow(row: any) {
    const extra = row.extra_json ? JSON.parse(row.extra_json) : {};
    return {
        ...extra,
        id: row.id,
        date: row.date,
        docNo: row.doc_no,
        description: row.description,
        fundType: row.fund_type,
        income: row.income || 0,
        expense: row.expense || 0,
        payer: row.payer,
        payee: row.payee,
        payeeType: row.payee_type,
        bankId: row.bank_id,
        incomeRefId: row.income_ref_id,
    };
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
    try {
        const { results } = await env.DB.prepare(
            'SELECT * FROM transactions ORDER BY date ASC, id ASC'
        ).all();
        return Response.json(results.map(txFromRow));
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
    try {
        const body: any = await request.json();
        const extra: any = {};
        // เก็บ fields พิเศษใน extra_json
        const knownKeys = ['id', 'date', 'docNo', 'description', 'fundType', 'income', 'expense', 'payer', 'payee', 'payeeType', 'bankId', 'incomeRefId'];
        for (const k of Object.keys(body)) {
            if (!knownKeys.includes(k)) extra[k] = body[k];
        }

        const { meta } = await env.DB.prepare(
            `INSERT INTO transactions (date, doc_no, description, fund_type, income, expense, payer, payee, payee_type, bank_id, income_ref_id, extra_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
            Object.keys(extra).length > 0 ? JSON.stringify(extra) : null
        ).run();

        return Response.json({ ...body, id: meta.last_row_id }, { status: 201 });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
};

export const onRequestOptions: PagesFunction = async () => {
    return new Response(null, { status: 204 });
};
