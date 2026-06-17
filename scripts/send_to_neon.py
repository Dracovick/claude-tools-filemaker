#!/usr/bin/env python3
"""
Script d'import nightly - à lancer sur le NAS ASUSTOR via le planificateur ADM
Lit export.tab et envoie les données à l'endpoint Vercel /api/import
"""
import csv
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

# ── Configuration ────────────────────────────────────────────────
TAB_FILE     = Path("/volume1/Web/Claude-Tools/data/export.tab")
VERCEL_URL   = "https://claude-tools-filemaker.vercel.app/api/import"
# Token lu depuis un fichier de config local (non versionné)
_TOKEN_FILE  = Path(__file__).parent / "import_token.txt"
IMPORT_TOKEN = _TOKEN_FILE.read_text(encoding="utf-8").strip() if _TOKEN_FILE.exists() else ""
# ─────────────────────────────────────────────────────────────────

def read_tab(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter="\t")
        return [dict(row) for row in reader]

def send(rows):
    payload = json.dumps({"rows": rows}).encode("utf-8")
    req = urllib.request.Request(
        VERCEL_URL,
        data=payload,
        headers={
            "Content-Type":    "application/json",
            "x-import-token":  IMPORT_TOKEN,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())

def main():
    if not TAB_FILE.exists():
        print(f"[ERREUR] Fichier introuvable : {TAB_FILE}", file=sys.stderr)
        sys.exit(1)

    rows = read_tab(TAB_FILE)
    if not rows:
        print("[ERREUR] Fichier vide.", file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] {len(rows)} lignes lues depuis {TAB_FILE.name}")

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
