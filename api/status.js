import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();

    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
        SELECT
            MIN(data->>'Date_Commande') AS min_date,
            MAX(data->>'Date_Commande') AS max_date,
            COUNT(*)::int                AS total_rows
        FROM latest_transactions
    `;

    const { min_date, max_date, total_rows } = rows[0] || {};
    return res.status(200).json({ min_date: min_date || null, max_date: max_date || null, total_rows: total_rows || 0 });
}
