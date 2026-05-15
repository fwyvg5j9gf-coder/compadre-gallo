#!/bin/bash
# =====================================================
# GALLO · arrancar.sh
# Corre esto cada vez que abras la computadora y
# quieras trabajar en compadregallo.
# Uso: bash arrancar.sh
# =====================================================

echo ""
echo "  g a l l o  /casa"
echo "  arrancando el servidor..."
echo ""

# Va a la carpeta correcta (por si acaso)
cd "$(dirname "$0")"

# Arranca el servidor de desarrollo
npm run dev
