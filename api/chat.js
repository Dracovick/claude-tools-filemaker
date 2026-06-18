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
- N'inclus jamais de bloc chart si les données sont insuffisantes pour un graphique utile.

CORRESPONDANCE DES POINTURES (champs Qte0 à Qte19) :
Chaque champ QteX représente la quantité commandée pour une pointure spécifique.
| Champ | USA  | EUR  |
|-------|------|------|
| Qte0  | 3    | 33   |
| Qte1  | 4    | 34   |
| Qte2  | 5    | 35   |
| Qte3  | 6    | 36   |
| Qte4  | 7    | 37   |
| Qte5  | 8    | 38   |
| Qte6  | 9    | 39   |
| Qte7  | 10   | 40   |
| Qte8  | 11   | 41   |
| Qte9  | 12   | 42   |
| Qte10 | 13   | 43   |
| Qte11 | 14   | 44   |
| Qte12 | 15   | 45   |
| Qte13 | 16   | 46   |
| Qte14 | 6.5  | 36.5 |
| Qte15 | 7.5  | 37.5 |
| Qte16 | 8.5  | 38.5 |
| Qte17 | 9.5  | 39.5 |
| Qte18 | 10.5 | 40.5 |
| Qte19 | 11.5 | 41.5 |
Lorsqu'on parle de pointures, utilise toujours le système USA sauf si le contexte indique des produits européens.
Un champ Qte vide ou absent signifie zéro unité pour cette pointure.`;

function buildTabData(rows) {
    if (!rows.length) return '';
    // Union de toutes les colonnes présentes dans l'ensemble des lignes
    const colSet = new Set();
    rows.forEach(r => Object.keys(r.data).forEach(k => colSet.add(k)));
    const columns = Array.from(colSet);
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
    const history  = Array.isArray(req.body?.history) ? req.body.history : [];
    if (!question) return res.status(400).json({ error: 'Question vide' });

    // Lecture des données depuis Neon
    const sql      = neon(process.env.DATABASE_URL);
    const maxRows  = parseInt(process.env.MAX_ROWS || '2000', 10);
    const rows     = await sql`SELECT data FROM latest_transactions LIMIT ${maxRows}`;

    if (!rows.length) {
        return res.status(500).json({ error: "Aucune donnée disponible. L'import nightly n'a pas encore été exécuté." });
    }

    const tabData  = buildTabData(rows);
    const system   = SYSTEM_PROMPT_BASE + '\n\nDonnées disponibles:\n---\n' + tabData + '\n---';
    const messages = [...history, { role: 'user', content: question }];

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
            messages,
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
