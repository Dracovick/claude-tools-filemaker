-- Schéma Claude-Tools pour Neon PostgreSQL
-- À exécuter une seule fois dans l'éditeur SQL de la console Neon

-- Table des sessions d'import (une par nuit)
CREATE TABLE IF NOT EXISTS imports (
    id          SERIAL PRIMARY KEY,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    row_count   INTEGER,
    source      TEXT DEFAULT 'FileMaker export'
);

-- Table des données (JSONB = flexible, fonctionne avec n'importe quelles colonnes FileMaker)
CREATE TABLE IF NOT EXISTS transactions (
    id          SERIAL PRIMARY KEY,
    import_id   INTEGER REFERENCES imports(id) ON DELETE CASCADE,
    data        JSONB NOT NULL
);

-- Index pour les recherches dans les données JSON
CREATE INDEX IF NOT EXISTS idx_transactions_gin ON transactions USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_transactions_import ON transactions (import_id);

-- Vue qui retourne toujours le dernier import
CREATE OR REPLACE VIEW latest_transactions AS
SELECT data
FROM transactions
WHERE import_id = (SELECT MAX(id) FROM imports);
