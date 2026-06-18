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
Un champ Qte vide ou absent signifie zéro unité pour cette pointure.

RÈGLES DE CALCUL IMPÉRATIVES :
- Les totaux, sommes, moyennes et comptages sont pré-calculés par la base de données SQL et fournis dans la section STATISTIQUES VÉRIFIÉES ci-dessous.
- Tu DOIS utiliser ces chiffres pré-calculés pour répondre aux questions de totaux. Ne recalcule JAMAIS toi-même ces valeurs à partir des données brutes.
- Les montants utilisent la virgule comme séparateur décimal (ex: 82,5 = 82.5). Ne confonds pas virgule décimale et séparateur de milliers.
- Si une question demande un calcul qui n'est pas dans les statistiques pré-calculées, indique clairement que tu travailles à partir des données brutes et que le résultat est une estimation.`;

async function buildStats(sql) {
    const [totals] = await sql`
        SELECT
            COUNT(*)::int                                                                                      AS nb_lignes,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte_Total',',','.'),''),'0')::numeric)::int                   AS unites_total,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Montant',   ',','.'),''),'0')::numeric)::numeric(12,2)        AS montant_total,
            COUNT(DISTINCT data->>'No_Commande')::int                                                         AS nb_commandes,
            COUNT(DISTINCT data->>'Client')::int                                                              AS nb_clients
        FROM latest_transactions
    `;

    const [q] = await sql`
        SELECT
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte0', ',','.'),''),'0')::numeric)::int AS q0,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte1', ',','.'),''),'0')::numeric)::int AS q1,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte2', ',','.'),''),'0')::numeric)::int AS q2,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte3', ',','.'),''),'0')::numeric)::int AS q3,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte4', ',','.'),''),'0')::numeric)::int AS q4,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte5', ',','.'),''),'0')::numeric)::int AS q5,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte6', ',','.'),''),'0')::numeric)::int AS q6,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte7', ',','.'),''),'0')::numeric)::int AS q7,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte8', ',','.'),''),'0')::numeric)::int AS q8,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte9', ',','.'),''),'0')::numeric)::int AS q9,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte10',',','.'),''),'0')::numeric)::int AS q10,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte11',',','.'),''),'0')::numeric)::int AS q11,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte12',',','.'),''),'0')::numeric)::int AS q12,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte13',',','.'),''),'0')::numeric)::int AS q13,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte14',',','.'),''),'0')::numeric)::int AS q14,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte15',',','.'),''),'0')::numeric)::int AS q15,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte16',',','.'),''),'0')::numeric)::int AS q16,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte17',',','.'),''),'0')::numeric)::int AS q17,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte18',',','.'),''),'0')::numeric)::int AS q18,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte19',',','.'),''),'0')::numeric)::int AS q19
        FROM latest_transactions
    `;

    const byClient = await sql`
        SELECT
            data->>'Client'                                                                             AS client,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Montant',   ',','.'),''),'0')::numeric)::numeric(12,2) AS montant,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte_Total', ',','.'),''),'0')::numeric)::int           AS unites
        FROM latest_transactions
        GROUP BY data->>'Client'
        ORDER BY montant DESC
        LIMIT 20
    `;

    const byModele = await sql`
        SELECT
            data->>'Modele'                                                                             AS modele,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Montant',   ',','.'),''),'0')::numeric)::numeric(12,2) AS montant,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte_Total', ',','.'),''),'0')::numeric)::int           AS unites
        FROM latest_transactions
        GROUP BY data->>'Modele'
        ORDER BY unites DESC
        LIMIT 20
    `;

    const byDevise = await sql`
        SELECT
            data->>'Devise'                                                                             AS devise,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Montant',   ',','.'),''),'0')::numeric)::numeric(12,2) AS montant,
            SUM(COALESCE(NULLIF(REPLACE(data->>'Qte_Total', ',','.'),''),'0')::numeric)::int           AS unites
        FROM latest_transactions
        GROUP BY data->>'Devise'
        ORDER BY montant DESC
    `;

    const SIZE_LABEL = [
        'USA 3/EUR 33','USA 4/EUR 34','USA 5/EUR 35','USA 6/EUR 36',
        'USA 7/EUR 37','USA 8/EUR 38','USA 9/EUR 39','USA 10/EUR 40',
        'USA 11/EUR 41','USA 12/EUR 42','USA 13/EUR 43','USA 14/EUR 44',
        'USA 15/EUR 45','USA 16/EUR 46','USA 6.5/EUR 36.5','USA 7.5/EUR 37.5',
        'USA 8.5/EUR 38.5','USA 9.5/EUR 39.5','USA 10.5/EUR 40.5','USA 11.5/EUR 41.5',
    ];
    const qteSummary = SIZE_LABEL
        .map((lbl, i) => `${lbl}: ${q[`q${i}`] ?? 0} unités`)
        .join('\n');

    return `
STATISTIQUES VÉRIFIÉES (calculées par PostgreSQL — source de vérité absolue) :

Résumé général :
- Lignes de commande : ${totals.nb_lignes}
- Commandes distinctes : ${totals.nb_commandes}
- Clients distincts : ${totals.nb_clients}
- Unités totales : ${totals.unites_total}
- Montant total : ${Number(totals.montant_total).toFixed(2)} $

Unités par pointure :
${qteSummary}

Ventes par client (montant décroissant) :
${byClient.map(r => `${r.client}: ${r.unites} unités / ${Number(r.montant).toFixed(2)} $`).join('\n')}

Ventes par modèle (unités décroissantes) :
${byModele.map(r => `${r.modele}: ${r.unites} unités / ${Number(r.montant).toFixed(2)} $`).join('\n')}

Ventes par devise :
${byDevise.map(r => `${r.devise}: ${Number(r.montant).toFixed(2)} $ (${r.unites} unités)`).join('\n')}
`.trim();
}

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

    const [tabData, stats] = await Promise.all([
        Promise.resolve(buildTabData(rows)),
        buildStats(sql),
    ]);
    const system   = SYSTEM_PROMPT_BASE
        + '\n\n' + stats
        + '\n\nDonnées brutes ligne par ligne :\n---\n' + tabData + '\n---';
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
