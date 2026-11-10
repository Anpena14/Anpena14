#!/bin/bash
# Doble clic para abrir el panel. Deja esta ventana abierta mientras lo usas; ciérrala para apagarlo.
cd "$(dirname "$0")" || exit 1
# Carga el PATH de tu terminal (zsh) para encontrar claude, codex, gemini, hermes y ollama.
PATH_ZSH="$(/bin/zsh -lic 'printf %s "$PATH"' 2>/dev/null)"
[ -n "$PATH_ZSH" ] && export PATH="$PATH_ZSH:$PATH"
if ! command -v python3 >/dev/null 2>&1; then
  echo "Falta Python 3. Ejecuta en Terminal:  xcode-select --install   y vuelve a abrir este archivo."
  read -r -p "Pulsa Enter para cerrar…"; exit 1
fi
python3 aos.py
read -r -p "El panel se cerró. Pulsa Enter para cerrar esta ventana…"
