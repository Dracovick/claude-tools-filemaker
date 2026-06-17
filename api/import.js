import { neon } from '@neondatabase/serverless';

// Endpoint appelé chaque nuit par le script sur le NAS
// Sécurisé par un token partagé (variable d'environnement IMPORT_TOKEN)
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

    // Vérification du token
    const token = req.headers['x-import-token'];
    if (!token || token !== process.env.IMPORT_TOKEN) {
        return res.status(401).json({ error: 'Token invalide' });
    }

    const { rows } = req.body || {};
    if (!Array.isArray(rows) || !rows.length) {
        return res.status(400).json({ error: 'Corps invalide : { rows: [{...}, ...] } attendu' });
    }

    const sql = neon(process.env.DATABASE_URL);

    // Crée un nouvel enregistrement d'import
    const [imp] = await sql`
        INSERT INTO imports (row_count, source)
        VALUES (${rows.length}, 'FileMaker nightly export')
        RETURNING id
    `;

    // Insère toutes les lignes en une transaction
    await sql.transaction(rows.map(row =>
        sql`INSERT INTO transactions (import_id, data) VALUES (${imp.id}, ${JSON.stringify(row)})`
    ));

    return res.status(200).json({ imported: rows.length, import_id: imp.id });
}
