import { neon } from '@neondatabase/serverless';

const SYSTEM_PROMPT_BASE = `Tu es un assistant expert en analyse de transactions et ventes.
Tu reçois des données exportées de FileMaker en format tab-séparé.
Réponds toujours en français en utilisant le format Markdown (gras, listes, titres, tableaux si pertinent).
Sois précis et concis. Si la donnée demandée n'est pas dans le fichier, dis-le clairement.

GRAPHIQUES : lorsqu'une visualisation est pertinente ou demandée, insère dans ta réponse
un ou plusieurs blocs délimités exactement par \`\`\`chart et \`\`\` contenant du JSON valide de cette forme :
\`\`\`chart
{"type":"bar","title":"Titre du graphique","labels":["A","B","C"],"datasets":[{"label":"Légende","data":[10,20,30]}]}
\`\`\`
Types disponibles : bar, pie, line, doughnut.
Règles impératives pour les blocs chart :
- JSON strictement valide (pas de commentaires, pas de virgule finale).
- Une seule propriété "datasets" contenant un tableau d'objets {"label", "data"}.
- Tu peux mettre du texte Markdown avant et/ou après chaque bloc chart.
- N'inclus jamais de bloc chart si les données sont insuffisantes pour un graphique utile.`;

function buildTabData(rows) {
    if (!rows.length) return '';
    const columns = Object.keys(rows[0].data);
    const header  = columns.join('\t');
    const body    = rows.map(r => columns.map(c => r.data[c] ?? '').join('\t')).join('\n');
    return header + '\n' + body;
}

export default async function handler(req, res) {
    // CORS pour le Web Viewer FileMaker
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

    const question = (req.body?.question || '').trim();
    if (!question) return res.status(400).json({ error: 'Question vide' });

    // Lecture des données depuis Neon
    const sql      = neon(process.env.DATABASE_URL);
    const maxRows  = parseInt(process.env.MAX_ROWS || '2000', 10);
    const rows     = await sql`SELECT data FROM latest_transactions LIMIT ${maxRows}`;

    if (!rows.length) {
        return res.status(500).json({ error: "Aucune donnée disponible. L'import nightly n'a pas encore été exécuté." });
    }

    const tabData = buildTabData(rows);
    const system  = SYSTEM_PROMPT_BASE + '\n\nDonnées disponibles:\n---\n' + tabData + '\n---';

    // Appel Claude
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type':      'application/json',
            'x-api-key':         process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model:      process.env.MODEL || 'claude-sonnet-4-6',
            max_tokens: 2048,
            system,
            messages: [{ role: 'user', content: question }],
        }),
    });

    const claudeData = await claudeRes.json();
    if (!claudeRes.ok) {
        return res.status(500).json({ error: claudeData.error?.message || `Erreur API Claude ${claudeRes.status}` });
    }

    return res.status(200).json({
        answer: claudeData.content[0].text,
        rows:   rows.length,
    });
}
