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
SYSTÈME DE GRANDEUR — champ Type_Grandeur :
Le champ Type_Grandeur détermine COMMENT lire les colonnes Qte0 à Qte19.

⚠ ATTENTION — CONFUSION À ÉVITER ABSOLUMENT :
- Les codes W, M, Y, W1, M1, Y1 dans Type_Grandeur signifient Women/Men/Youth (catégorie de chaussure).
  Ils utilisent les POINTURES AMÉRICAINES. "M" ici = Men's (chaussure homme), PAS la taille vestimentaire Medium.
- Les tailles vestimentaires XS, S, M, L, XL, 2XL N'EXISTENT QUE pour les produits avec Type_Grandeur = O.
  Si Type_Grandeur ≠ O, il n'y a JAMAIS de taille XS/S/M/L/XL/2XL.

| Type_Grandeur     | Système  | Correspondance des champs Qte                                                                                                                     |
|-------------------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| W, M, Y, W1, M1, Y1 | USA   | Qte0=3, Qte1=4, Qte2=5, Qte3=6, Qte4=7, Qte5=8, Qte6=9, Qte7=10, Qte8=11, Qte9=12, Qte10=13, Qte11=14, Qte12=15, Qte13=16, Qte14=6.5, Qte15=7.5, Qte16=8.5, Qte17=9.5, Qte18=10.5, Qte19=11.5 |
| A, B, A/B         | EUR      | Qte0=33, Qte1=34, Qte2=35, Qte3=36, Qte4=37, Qte5=38, Qte6=39, Qte7=40, Qte8=41, Qte9=42, Qte10=43, Qte11=44, Qte12=45, Qte13=46, Qte14=36.5, Qte15=37.5, Qte16=38.5, Qte17=39.5, Qte18=40.5, Qte19=41.5 |
| O                 | Tailles  | Qte0=non utilisé, Qte1=XS, Qte2=S, Qte3=M, Qte4=L, Qte5=XL, Qte6=2XL (les autres Qte sont non utilisés) |

Toujours lire les colonnes Qte selon le Type_Grandeur de la ligne concernée. Ne jamais mélanger les systèmes.
Un champ Qte vide ou absent signifie zéro unité pour cette pointure/taille.

RÈGLES DE CALCUL IMPÉRATIVES :
- Les totaux, sommes, moyennes et comptages sont pré-calculés par la base de données SQL et fournis dans la section STATISTIQUES VÉRIFIÉES ci-dessous.
- Tu DOIS utiliser ces chiffres pré-calculés pour répondre aux questions de totaux. Ne recalcule JAMAIS toi-même ces valeurs à partir des données brutes.
- Les montants utilisent la virgule comme séparateur décimal (ex: 82,5 = 82.5). Ne confonds pas virgule décimale et séparateur de milliers.
- INTERDIT : N'utilise JAMAIS le symbole ~ (tilde) ni les mots "environ", "approximativement", "à peu près" pour des chiffres de quantité ou de montant. Les statistiques pré-calculées sont exactes — utilise-les telles quelles.
- Si une question demande un calcul qui n'est pas dans les statistiques pré-calculées, dis-le explicitement et refuse de donner un chiffre approximatif.

RÈGLES DE PRÉSENTATION DES GRANDEURS :
- Ne jamais mélanger les systèmes USA, EUR et tailles (O) dans un même chiffre ou tableau.
- Toujours préciser le système : écrire "USA 8" ou "EUR 38", jamais juste "8" ou "38" sans préfixe.
- Quand l'utilisateur demande "grandeur 8" sans préciser : chercher dans les produits USA (USA 8) ET dans les produits EUR (EUR 38 ne vaut pas 8 USA). Présenter les résultats séparément avec leur système explicite.
- Un produit USA avec Qte5=3 représente 3 unités en USA 8. Un produit EUR avec Qte5=3 représente 3 unités en EUR 38. Ce sont des grandeurs DIFFÉRENTES sur des systèmes DIFFÉRENTS — ne jamais les additionner sans le signaler clairement.
- Pour les produits O, toujours écrire la taille complète : "taille S", "taille M", etc. — jamais juste "M" seul qui pourrait être confondu avec le code Men's.`;

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

    // Pointures ventilées par système US / EUR / O
    const bySystemeQte = await sql`
        SELECT
            CASE
                WHEN data->>'Type_Grandeur' IN ('W','M','Y','W1','M1','Y1') THEN 'US'
                WHEN data->>'Type_Grandeur' IN ('A','B','A/B')              THEN 'EUR'
                WHEN data->>'Type_Grandeur' = 'O'                           THEN 'O'
                ELSE COALESCE(data->>'Type_Grandeur','?')
            END AS systeme,
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
        GROUP BY systeme
        ORDER BY systeme
    `;

    // Pointures ventilées par devise — évite que Claude calcule lui-même
    const byDeviseQte = await sql`
        SELECT
            data->>'Devise'                                                                              AS devise,
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
        GROUP BY data->>'Devise'
        ORDER BY devise
    `;

    const US_LABEL_GLOBAL  = ['3','4','5','6','7','8','9','10','11','12','13','14','15','16','6.5','7.5','8.5','9.5','10.5','11.5'];
    const EUR_LABEL_GLOBAL = ['33','34','35','36','37','38','39','40','41','42','43','44','45','46','36.5','37.5','38.5','39.5','40.5','41.5'];

    const deviseQteSummary = byDeviseQte.map(row => {
        const lines = Array.from({length: 20}, (_, i) => i)
            .filter(i => (row[`q${i}`] ?? 0) > 0)
            .map(i => `  Qte${i}: ${row[`q${i}`]}`)
            .join('\n');
        return `Devise ${row.devise} :\n${lines || '  (aucune unité)'}`;
    }).join('\n\n');


    const O_LABEL   = ['—','XS','S','M','L','XL','2XL','—','—','—','—','—','—','—','—','—','—','—','—','—'];
    const systemeQteSummary = bySystemeQte.map(row => {
        let prefix, labels;
        if (row.systeme === 'US')       { prefix = 'USA'; labels = US_LABEL_GLOBAL; }
        else if (row.systeme === 'EUR') { prefix = 'EUR'; labels = EUR_LABEL_GLOBAL; }
        else if (row.systeme === 'O')   { prefix = 'taille'; labels = O_LABEL; }
        else { prefix = row.systeme; labels = US_LABEL_GLOBAL; }
        const lines = labels
            .map((lbl, i) => lbl === '—' ? null : `  ${prefix} ${lbl}: ${row[`q${i}`] ?? 0}`)
            .filter((line, i) => line !== null && (row[`q${i}`] ?? 0) > 0)
            .join('\n');
        const typeInfo = row.systeme === 'US' ? 'W/M/Y/W1/M1/Y1' : row.systeme === 'EUR' ? 'A/B' : row.systeme;
        return `Produits ${row.systeme} (Type_Grandeur=${typeInfo}) :\n${lines || '  (aucune unité)'}`;
    }).join('\n\n');

    return `
STATISTIQUES VÉRIFIÉES (calculées par PostgreSQL — source de vérité absolue) :
Ces chiffres sont EXACTS. Utilise-les sans approximation ni recalcul.

Résumé général :
- Lignes de commande : ${totals.nb_lignes}
- Commandes distinctes : ${totals.nb_commandes}
- Clients distincts : ${totals.nb_clients}
- Unités totales : ${totals.unites_total}
- Montant total : ${Number(totals.montant_total).toFixed(2)} $

Unités par grandeur PAR SYSTÈME (chiffres exacts — USA et EUR sont des systèmes distincts, ne jamais les additionner) :
${systemeQteSummary}

Unités par pointure PAR DEVISE (chiffres exacts — ne pas recalculer) :
${deviseQteSummary}

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
