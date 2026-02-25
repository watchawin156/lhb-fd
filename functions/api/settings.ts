// functions/api/settings.ts
// GET /api/settings - ดึงการตั้งค่าโรงเรียน
// POST /api/settings - อัปเดตการตั้งค่า

interface Env {
    DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
    try {
        const row = await env.DB.prepare('SELECT * FROM school_settings WHERE id = 1').first();
        if (!row) return Response.json({ error: 'Not found' }, { status: 404 });

        return Response.json({
            schoolNameTH: row.school_name_th,
            schoolNameEN: row.school_name_en,
            address: row.address,
            directorName: row.director_name,
            financeOfficerName: row.finance_officer_name,
            auditorName: row.auditor_name,
            affiliation: row.affiliation,
            bankAccounts: row.bank_accounts_json ? JSON.parse(row.bank_accounts_json as string) : [],
        });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
    try {
        const body: any = await request.json();
        await env.DB.prepare(
            `INSERT INTO school_settings (id, school_name_th, school_name_en, address, director_name, finance_officer_name, auditor_name, affiliation, bank_accounts_json, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         school_name_th = excluded.school_name_th,
         school_name_en = excluded.school_name_en,
         address = excluded.address,
         director_name = excluded.director_name,
         finance_officer_name = excluded.finance_officer_name,
         auditor_name = excluded.auditor_name,
         affiliation = excluded.affiliation,
         bank_accounts_json = excluded.bank_accounts_json,
         updated_at = excluded.updated_at`
        ).bind(
            body.schoolNameTH || '',
            body.schoolNameEN || '',
            body.address || '',
            body.directorName || '',
            body.financeOfficerName || '',
            body.auditorName || '',
            body.affiliation || '',
            JSON.stringify(body.bankAccounts || [])
        ).run();

        return Response.json({ success: true });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
};

export const onRequestOptions: PagesFunction = async () => {
    return new Response(null, { status: 204 });
};
