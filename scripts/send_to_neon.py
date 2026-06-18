#!/usr/bin/env python3
"""
Script d'import nightly - à lancer sur le NAS ASUSTOR via le planificateur ADM
Lit Export.csv (sans en-têtes) et envoie les données à l'endpoint Vercel /api/import
"""
import csv
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

# ── Configuration ────────────────────────────────────────────────
CSV_FILE     = Path("/volume1/Web/Claude-Tools/data/Export.csv")
VERCEL_URL   = "https://claude-tools-filemaker.vercel.app/api/import"
_TOKEN_FILE  = Path(__file__).parent / "import_token.txt"
IMPORT_TOKEN = _TOKEN_FILE.read_text(encoding="utf-8").strip() if _TOKEN_FILE.exists() else ""
# ─────────────────────────────────────────────────────────────────

COLS = [
    "Qte0","Qte1","Qte2","Qte3","Qte4","Qte5","Qte6","Qte7","Qte8","Qte9",
    "Qte10","Qte11","Qte12","Qte13","Qte14","Qte15","Qte16","Qte17","Qte18","Qte19",
    "Qte_Total","Marque","Modele","Code_Produit","Annee","Saison","Type",
    "Date_Commande","Devise","Prix_Unitaire","Prix_Detail","Client",
    "Date_Facture","Montant","No_Commande","Code_Client","Nom_Client","Type_Grandeur",
]

def read_csv(path):
    rows = []
    with open(path, encoding="utf-8-sig", newline="") as f:
        for raw in csv.reader(f):
            if not any(raw):
                continue
            obj = {}
            for i, col in enumerate(COLS):
                val = raw[i].strip() if i < len(raw) else ""
                if col.startswith("Qte"):
                    obj[col] = val if val != "" else "0"
                elif val != "":
                    obj[col] = val
            rows.append(obj)
    return rows

def send(rows):
    payload = json.dumps({"rows": rows}).encode("utf-8")
    req = urllib.request.Request(
        VERCEL_URL,
        data=payload,
        headers={
            "Content-Type":   "application/json",
            "x-import-token": IMPORT_TOKEN,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())

def main():
    if not CSV_FILE.exists():
        print(f"[ERREUR] Fichier introuvable : {CSV_FILE}", file=sys.stderr)
        sys.exit(1)

    rows = read_csv(CSV_FILE)
    if not rows:
        print("[ERREUR] Fichier vide.", file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] {len(rows)} lignes lues depuis {CSV_FILE.name}")

    try:
        result = send(rows)
        print(f"[OK] Import #{result['import_id']} — {result['imported']} lignes envoyées vers Neon")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"[ERREUR] HTTP {e.code} : {body}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[ERREUR] {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
