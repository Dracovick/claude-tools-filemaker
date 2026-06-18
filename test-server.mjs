// Serveur de test local — 0 token API, 0 dépendances cloud
// Usage : node test-server.mjs
// Ouvrir : http://localhost:3000

import http from 'http';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir  = path.dirname(fileURLToPath(import.meta.url));
const PORT   = 3000;
let mockCallCount = 0;

function buildMockAnswer(question) {
    const q = question.toLowerCase();

    // Total / montant / ventes globales
    if (/total|montant|chiffre|vente/.test(q) && !/client|modèle|modele|produit/.test(q)) {
        const mois = /janvier|jan/i.test(q) ? 'janvier 2026'
            : /février|fev/i.test(q)        ? 'février 2026'
            : /mars/i.test(q)               ? 'mars 2026'
            : /avril|apr/i.test(q)          ? 'avril 2026'
            : /mai/i.test(q)                ? 'mai 2026'
            : /juin|jun/i.test(q)           ? 'juin 2026'
            : null;
        if (mois) {
            return (
                `## Total des ventes — ${mois}\n\n` +
                `| Indicateur | Valeur |\n|---|---|\n` +
                `| Unités totales | **1 284** |\n` +
                `| Montant total | **186 432,50 $** |\n` +
                `| Commandes distinctes | **47** |\n` +
                `| Clients distincts | **23** |\n\n` +
                `> Données simulées — activez l'API réelle pour les vrais chiffres.`
            );
        }
        return (
            `## Total des ventes\n\n` +
            `| Indicateur | Valeur |\n|---|---|\n` +
            `| Unités totales | **8 621** |\n` +
            `| Montant total | **1 243 890,00 $** |\n` +
            `| Commandes distinctes | **312** |\n` +
            `| Clients distincts | **58** |\n\n` +
            `> Données simulées — activez l'API réelle pour les vrais chiffres.`
        );
    }

    // Clients d'un modèle
    if (/client/.test(q) && /modèle|modele|victor|stone|lyra|minerva|walker|boulder/i.test(q)) {
        const modele = /victor/i.test(q) ? 'Ice VICTOR m'
            : /stone/i.test(q)           ? 'Ice STONE m'
            : /lyra/i.test(q)            ? 'LYRA w'
            : /minerva/i.test(q)         ? 'MINERVA w'
            : /walker/i.test(q)          ? 'WALKER PRO'
            : 'Ice VICTOR m';
        return (
            `## Clients ayant commandé **${modele}**\n\n` +
            `| Client | Unités | Montant |\n|--------|--------|--------|\n` +
            `| Sports Experts-536 (St-Hyacinthe) | 13 | 3 509,87 $ |\n` +
            `| Sports Experts-538 (Longueuil) | 4 | 1 079,96 $ |\n` +
            `| Sports Experts-402 (Terrebonne) | 18 | 4 859,82 $ |\n` +
            `| Pieds Géants | 21 | 5 669,79 $ |\n` +
            `| Chaussures Parent | 9 | 2 429,91 $ |\n\n` +
            `> Données simulées — activez l'API réelle pour les vrais chiffres.`
        );
    }

    // Par modèle / produit
    if (/modèle|modele|produit|article/.test(q)) {
        return (
            `## Ventes par modèle\n\n` +
            `| Modèle | Unités | Montant |\n|--------|--------|--------|\n` +
            `| Ice VICTOR m | 306 | 82 499,94 $ |\n` +
            `| Ice STONE m | 241 | 65 069,59 $ |\n` +
            `| LYRA w | 198 | 35 600,02 $ |\n` +
            `| MINERVA w | 176 | 31 679,24 $ |\n` +
            `| WALKER PRO | 143 | 28 584,57 $ |\n\n` +
            `> Données simulées — activez l'API réelle pour les vrais chiffres.`
        );
    }

    // Par client
    if (/client/.test(q)) {
        return (
            `## Ventes par client\n\n` +
            `| Client | Unités | Montant |\n|--------|--------|--------|\n` +
            `| Sports Experts (réseau) | 892 | 240 839,08 $ |\n` +
            `| Atmosphère | 341 | 92 069,59 $ |\n` +
            `| Pieds Géants | 198 | 53 461,02 $ |\n` +
            `| Chaussures Parent | 143 | 38 584,57 $ |\n\n` +
            `> Données simulées — activez l'API réelle pour les vrais chiffres.`
        );
    }

    // Par grandeur / pointure
    if (/grandeur|pointure|taille|size/.test(q)) {
        return (
            `### Ventes par grandeur — Système USA\n\n` +
            `| Pointure | Unités |\n|----------|--------|\n` +
            `| USA 7 | 142 |\n| USA 8 | 387 |\n| USA 9 | 512 |\n` +
            `| USA 10 | 468 |\n| USA 11 | 301 |\n| USA 12 | 189 |\n\n` +
            `### Ventes par grandeur — Système EUR\n\n` +
            `| Pointure | Unités |\n|----------|--------|\n` +
            `| EUR 38 | 97 |\n| EUR 39 | 143 |\n| EUR 40 | 201 |\n` +
            `| EUR 41 | 178 |\n| EUR 42 | 134 |\n\n` +
            `> Données simulées — activez l'API réelle pour les vrais chiffres.`
        );
    }

    // Par vendeur / représentant
    if (/vendeur|représentant|rep\b|vend/.test(q)) {
        return (
            `## Ventes par représentant\n\n` +
            `| Représentant | Unités | Montant | Commandes |\n|---|---|---|---|\n` +
            `| Alain Knapp | 2 195 | 592 350,00 $ | 87 |\n` +
            `| Marie Tremblay | 1 842 | 497 140,00 $ | 73 |\n` +
            `| Pierre Dumont | 1 204 | 325 080,00 $ | 48 |\n\n` +
            `> Données simulées — activez l'API réelle pour les vrais chiffres.`
        );
    }

    // Graphique demandé
    if (/graphique|graph|chart|visuel/.test(q)) {
        return (
            `Voici l'évolution des ventes par mois :\n\n` +
            '```chart\n' +
            `{"type":"bar","title":"Ventes mensuelles (simulées)","labels":["Jan","Fév","Mar","Avr","Mai","Jun"],"datasets":[{"label":"Unités","data":[820,940,1100,1284,1560,980]}]}\n` +
            '```\n\n' +
            `> Données simulées — activez l'API réelle pour les vrais chiffres.`
        );
    }

    // Réponse générique
    return (
        `**[MODE MOCK]** Question reçue : *${question}*\n\n` +
        `Réponse générique simulée. Le serveur mock ne reconnaît pas cette question spécifique.\n\n` +
        `Types de questions reconnues par le mock :\n` +
        `- Total des ventes (globales ou par mois)\n` +
        `- Ventes par modèle / produit\n` +
        `- Clients d'un modèle\n` +
        `- Ventes par client\n` +
        `- Ventes par grandeur / pointure\n` +
        `- Ventes par vendeur / représentant\n` +
        `- Demande de graphique\n\n` +
        `> Données simulées — activez l'API réelle pour les vrais chiffres.`
    );
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
        const html = fs.readFileSync(path.join(__dir, 'public', 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
    }

    if (req.method === 'POST' && req.url === '/api/chat') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            mockCallCount++;
            const { question = '' } = JSON.parse(body || '{}');
            const isCached = mockCallCount > 1;
            const answer   = buildMockAnswer(question);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                answer,
                rows:        2000,
                cache_write: isCached ? 0    : 8500,
                cache_read:  isCached ? 8500 : 0,
            }));
        });
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`\n✅ Serveur mock démarré → http://localhost:${PORT}/`);
    console.log('   0 token consommé. Ctrl+C pour arrêter.\n');
});
