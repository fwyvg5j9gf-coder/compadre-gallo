#!/usr/bin/env python3
"""
verificar.py — smoke test para compadregallo.com
Uso:
  python3 scripts/verificar.py               # contra localhost:3000 (dev)
  python3 scripts/verificar.py produccion    # contra NEXT_PUBLIC_APP_URL
"""

import sys, os, urllib.request, urllib.error, json
from datetime import datetime

# ── Configuración ──────────────────────────────────────────────────────────────

if len(sys.argv) > 1 and sys.argv[1] == "produccion":
    BASE = os.environ.get("NEXT_PUBLIC_APP_URL", "https://compadregallo.com").rstrip("/")
    env  = "PRODUCCIÓN"
else:
    BASE = "http://localhost:3000"
    env  = "LOCAL (dev)"

# (método, ruta, códigos aceptados, descripción)
CHECKS = [
    # Públicas — deben devolver 200
    ("GET",  "/",                          [200],           "homepage"),
    ("GET",  "/artistas",                  [200],           "catálogo artistas"),
    ("GET",  "/tienda",                    [200],           "tienda"),
    ("GET",  "/preventa",                  [200],           "preventa"),
    # Auth — deben redirigir sin sesión
    ("GET",  "/cuenta",                    [307,302,308],   "cuenta cliente (→ login)"),
    ("GET",  "/casa",                      [307,302,308],   "admin dashboard (→ login)"),
    ("GET",  "/casa/artistas",             [307,302,308],   "admin artistas (→ login)"),
    ("GET",  "/casa/tienda",               [307,302,308],   "admin tienda (→ login)"),
    ("GET",  "/casa/ordenes",              [307,302,308],   "admin órdenes (→ login)"),
    ("GET",  "/casa/usuarios",             [307,302,308],   "admin usuarios (→ login)"),
    ("GET",  "/casa/cuentas",              [307,302,308],   "admin cuentas (→ login)"),
    # APIs — sin payload deben rechazar, no crashear
    ("POST", "/api/stripe/create-intent",  [400,401,422],   "stripe create-intent (sin payload)"),
    ("POST", "/api/stripe/webhook",        [400,401,422],   "stripe webhook (sin firma)"),
    ("GET",  "/api/export-orders",         [307,302,401,403], "export CSV (sin auth)"),
]

# ── Runner ─────────────────────────────────────────────────────────────────────

class NoRedirect(urllib.request.HTTPErrorProcessor):
    def http_response(self, request, response): return response
    https_response = http_response

opener = urllib.request.build_opener(NoRedirect)

def check(method, path, accepted, desc):
    url = BASE + path
    try:
        req = urllib.request.Request(url, method=method,
                                     data=b"{}" if method == "POST" else None)
        req.add_header("Content-Type", "application/json")
        resp = opener.open(req, timeout=8)
        code = resp.status
    except urllib.error.HTTPError as e:
        code = e.code
    except Exception as e:
        return None, str(e)
    return code, None

def run():
    ts  = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ok  = 0
    fail = 0
    errors = []

    print(f"\n  compadregallo — verificación de salud")
    print(f"  {env}  ·  {ts}")
    print(f"  {BASE}\n")
    print(f"  {'CÓDIGO':<7} {'MÉTODO':<6} {'RUTA':<32} {'ESTADO'}")
    print(f"  {'─'*62}")

    for method, path, accepted, desc in CHECKS:
        code, err = check(method, path, accepted, desc)
        if err:
            icon = "✗"
            note = f"ERROR: {err}"
            fail += 1
            errors.append((method, path, desc, note))
        elif code in accepted:
            icon = "✓"
            note = desc
            ok += 1
        else:
            icon = "✗"
            note = f"{desc}  ← código inesperado (esperado {accepted})"
            fail += 1
            errors.append((method, path, desc, f"código {code}, esperado {accepted}"))

        print(f"  {icon} {str(code) if code else 'ERR':<6} {method:<6} {path:<32} {note}")

    print(f"\n  {'─'*62}")
    if fail == 0:
        print(f"  ✓ TODOS LOS CHECKS PASARON ({ok}/{ok})\n")
    else:
        print(f"  ✗ {fail} FALLO(S) de {ok+fail} checks\n")
        for method, path, desc, note in errors:
            print(f"    → {method} {path}")
            print(f"       {note}")
        print()

    return 0 if fail == 0 else 1

if __name__ == "__main__":
    sys.exit(run())
