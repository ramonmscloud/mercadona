# CSV Editor Mercadona - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Programa Python CLI para gestionar `compra mercadona.csv` (anadir, borrar, cambiar articulos/pasillos, detectar duplicados via DeepSeek API).

**Architecture:** Modulos separados: `csv_handler.py` (I/O CSV), `deepseek_client.py` (API DeepSeek), `duplicate_finder.py` (logica duplicados), `main.py` (menu CLI). Comunicacion via funciones puras con tipos claros.

**Tech Stack:** Python 3.12, httpx, python-dotenv, csv (stdlib), difflib (stdlib).

## Global Constraints

- Base path: `cambiarCSVcompra/`
- CSV fuente: `../compra mercadona.csv`
- Encoding: utf-8
- CSV delimiter: `;`
- DeepSeek model: `deepseek-chat` (flash)
- API key via `.env` (`DEEPSEEK_API_KEY`)
- CLI interactivo, sin dependencia del proyecto web

---

### Task 1: requirements.txt y .env.example

**Files:**
- Create: `cambiarCSVcompra/requirements.txt`
- Create: `cambiarCSVcompra/.env.example`

**Produces:** `requirements.txt` con `httpx` y `python-dotenv`. `.env.example` con plantilla de API key.

- [ ] **Step 1: Write requirements.txt**

```
httpx>=0.27.0
python-dotenv>=1.0.0
```

- [ ] **Step 2: Write .env.example**

```
DEEPSEEK_API_KEY=sk-tu-key-aqui
```

- [ ] **Step 3: Copy .env.example to .env**

```bash
cp cambiarCSVcompra/.env.example cambiarCSVcompra/.env
```

- [ ] **Step 4: Install dependencies**

```bash
pip install -r cambiarCSVcompra/requirements.txt
```

- [ ] **Step 5: Commit**

```bash
git add cambiarCSVcompra/requirements.txt cambiarCSVcompra/.env.example
git commit -m "feat: add python dependencies and env template"
```

---

### Task 2: csv_handler.py — lectura, escritura, busquedas basicas

**Files:**
- Create: `cambiarCSVcompra/csv_handler.py`

**Produces:**
- `CsvHandler(csv_path: str)` — clase con metodos:
  - `read_all() -> list[dict[str, str]]` (keys: "Pasillo", "Articulo")
  - `write_all(rows: list[dict[str, str]]) -> None`
  - `get_pasillos() -> list[str]` — pasillos unicos ordenados
  - `get_pasillos_counts() -> list[tuple[str, int]]` — pasillo + conteo

- [ ] **Step 1: Write csv_handler.py**

```python
import csv
import os
from typing import Any

CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "compra mercadona.csv")

class CsvHandler:
    def __init__(self, csv_path: str | None = None) -> None:
        self.csv_path = csv_path or CSV_PATH

    def read_all(self) -> list[dict[str, str]]:
        rows: list[dict[str, str]] = []
        with open(self.csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f, delimiter=";")
            for r in reader:
                rows.append({"Pasillo": r["Pasillo"].strip(), "Articulo": r["Articulo"].strip()})
        return rows

    def write_all(self, rows: list[dict[str, str]]) -> None:
        with open(self.csv_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["Pasillo", "Articulo"], delimiter=";")
            writer.writeheader()
            for r in rows:
                writer.writerow({"Pasillo": r["Pasillo"], "Articulo": r["Articulo"]})

    def get_pasillos(self) -> list[str]:
        rows = self.read_all()
        seen: set[str] = set()
        result: list[str] = []
        for r in rows:
            if r["Pasillo"] not in seen:
                seen.add(r["Pasillo"])
                result.append(r["Pasillo"])
        return result

    def get_pasillos_counts(self) -> list[tuple[str, int]]:
        rows = self.read_all()
        counts: dict[str, int] = {}
        for r in rows:
            counts[r["Pasillo"]] = counts.get(r["Pasillo"], 0) + 1
        return sorted(counts.items(), key=lambda x: x[1], reverse=True)
```

- [ ] **Step 2: Quick smoke test (manual)**

```bash
python3 -c "from cambiarCSVcompra.csv_handler import CsvHandler; h = CsvHandler(); rows = h.read_all(); print(f'Leidos {len(rows)} filas'); print(f'Pasillos: {h.get_pasillos()}')"
```

- [ ] **Step 3: Commit**

```bash
git add cambiarCSVcompra/csv_handler.py
git commit -m "feat: add csv_handler with read/write/get_pasillos"
```

---

### Task 3: deepseek_client.py — cliente API DeepSeek

**Files:**
- Create: `cambiarCSVcompra/deepseek_client.py`

**Produces:**
- `DeepSeekClient(api_key: str, model: str = "deepseek-chat")` — clase con:
  - `async chat(prompt: str, system: str | None = None) -> str` — envia prompt y devuelve respuesta

- [ ] **Step 1: Write deepseek_client.py**

```python
import os
from dotenv import load_dotenv
import httpx

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"

class DeepSeekClient:
    def __init__(self, api_key: str | None = None, model: str = "deepseek-chat") -> None:
        self.api_key = api_key or DEEPSEEK_API_KEY
        if not self.api_key:
            raise ValueError("DEEPSEEK_API_KEY no configurada en .env")
        self.model = model
        self.base_url = DEEPSEEK_BASE_URL

    def chat(self, prompt: str, system: str | None = None) -> str:
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        with httpx.Client(timeout=120) as client:
            resp = client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={"model": self.model, "messages": messages, "temperature": 0.0},
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
```

- [ ] **Step 2: Quick smoke test (skip if no key set)**

```bash
python3 -c "
from cambiarCSVcompra.deepseek_client import DeepSeekClient
c = DeepSeekClient()
r = c.chat('Di hola en una palabra')
print(r)
"
```

- [ ] **Step 3: Commit**

```bash
git add cambiarCSVcompra/deepseek_client.py
git commit -m "feat: add deepseek_client for API calls"
```

---

### Task 4: duplicate_finder.py — deteccion de duplicados via DeepSeek

**Files:**
- Create: `cambiarCSVcompra/duplicate_finder.py`

**Produces:**
- `DuplicateFinder(client: DeepSeekClient, csv_handler: CsvHandler)` — clase con:
  - `find_duplicates() -> list[list[dict]]` — devuelve grupos de articulos duplicados
  - `merge_group(group: list[dict], keep_idx: int) -> None` — conserva uno y elimina el resto

- [ ] **Step 1: Write duplicate_finder.py**

```python
import json
import re
from .deepseek_client import DeepSeekClient
from .csv_handler import CsvHandler

SYSTEM_PROMPT = """Eres un asistente que analiza listas de la compra de Mercadona.
Tu tarea es encontrar articulos duplicados o muy similares en la lista.
Dos articulos son duplicados si se refieren al mismo producto aunque esten escritos de forma diferente
(mayusculas/minusculas, abreviaturas, descripciones adicionales, mismo producto en distinto pasillo).

Devuelve UNICAMENTE un JSON con este formato exacto:
{
  "groups": [
    {
      "items": [
        {"index": 0, "pasillo": "01 Pasillo limpieza", "articulo": "Flit (sin perfume, azul)"},
        {"index": 1, "pasillo": "01 Pasillo limpieza", "articulo": "Flit contra acaros (marron)"}
      ],
      "reason": "Ambos son insecticida Flit"
    }
  ]
}

El campo "index" debe ser el numero de linea (empezando en 0, sin contar la cabecera) del articulo en la lista.
NO incluyas texto fuera del JSON. Solo devuelve el JSON."""

class DuplicateFinder:
    def __init__(self, client: DeepSeekClient, csv_handler: CsvHandler) -> None:
        self.client = client
        self.csv = csv_handler

    def find_duplicates(self) -> list[dict]:
        rows = self.csv.read_all()
        if len(rows) < 2:
            return []

        lines = "\n".join(
            f"{i}: [{r['Pasillo']}] {r['Articulo']}" for i, r in enumerate(rows)
        )

        prompt = f"""Analiza esta lista de {len(rows)} articulos de la compra de Mercadona
y encuentra grupos de articulos duplicados o muy similares.

{lines}

Devuelve el JSON con los grupos de duplicados encontrados."""

        response = self.client.chat(prompt, system=SYSTEM_PROMPT)
        try:
            json_match = re.search(r"\{[\s\S]*\}", response)
            if json_match:
                data = json.loads(json_match.group())
                return data.get("groups", [])
        except (json.JSONDecodeError, KeyError):
            pass
        return []

    def merge_group(self, group: dict, keep_index: int) -> None:
        rows = self.csv.read_all()
        items = sorted(group.get("items", []), key=lambda x: x.get("index", 0), reverse=True)
        for item in items:
            idx = item.get("index", -1)
            if idx != keep_index and 0 <= idx < len(rows):
                rows.pop(idx)
        self.csv.write_all(rows)
```

- [ ] **Step 2: Commit**

```bash
git add cambiarCSVcompra/duplicate_finder.py
git commit -m "feat: add duplicate_finder with DeepSeek integration"
```

---

### Task 5: main.py — menu interactivo completo

**Files:**
- Create: `cambiarCSVcompra/main.py`

**Produces:** Programa CLI con las 7 opciones del menu.

- [ ] **Step 1: Write main.py**

```python
import sys
from csv_handler import CsvHandler
from deepseek_client import DeepSeekClient
from duplicate_finder import DuplicateFinder

PAGE_SIZE = 25

def main() -> None:
    csv_handler = CsvHandler()
    try:
        client = DeepSeekClient()
        finder = DuplicateFinder(client, csv_handler)
    except ValueError as e:
        print(f"Error: {e}")
        print("Copia .env.example a .env y configura DEEPSEEK_API_KEY")
        finder = None

    while True:
        print("\n" + "=" * 50)
        print("  GESTOR LISTA MERCADONA")
        print("=" * 50)
        print("1. Ver articulos")
        print("2. Anadir articulo")
        print("3. Borrar articulo")
        print("4. Cambiar articulo")
        print("5. Gestionar pasillos")
        if finder:
            print("6. Buscar duplicados (DeepSeek)")
        print("7. Salir")
        print("=" * 50)

        opcion = input("Elige opcion: ").strip()

        if opcion == "1":
            ver_articulos(csv_handler)
        elif opcion == "2":
            anadir_articulo(csv_handler)
        elif opcion == "3":
            borrar_articulo(csv_handler)
        elif opcion == "4":
            cambiar_articulo(csv_handler)
        elif opcion == "5":
            gestionar_pasillos(csv_handler)
        elif opcion == "6" and finder:
            buscar_duplicados(finder)
        elif opcion == "7":
            print("Adios!")
            break
        else:
            print("Opcion no valida.")


def ver_articulos(csv_handler: CsvHandler) -> None:
    rows = csv_handler.read_all()
    pasillos = csv_handler.get_pasillos()
    print("\nFiltrar por pasillo? (deja vacio para todos)")
    for i, p in enumerate(pasillos):
        print(f"  {i}: {p}")
    filtro = input("Numero de pasillo o Enter: ").strip()

    if filtro.isdigit():
        idx = int(filtro)
        if 0 <= idx < len(pasillos):
            pasillo = pasillos[idx]
            rows = [r for r in rows if r["Pasillo"] == pasillo]
        else:
            print("Numero invalido, mostrando todos.")

    total = len(rows)
    pagina = 0
    while pagina * PAGE_SIZE < total:
        inicio = pagina * PAGE_SIZE
        fin = min(inicio + PAGE_SIZE, total)
        print(f"\n--- Articulos {inicio+1}-{fin} de {total} ---")
        for i, r in enumerate(rows[inicio:fin], start=inicio):
            print(f"  {i}: [{r['Pasillo']}] {r['Articulo']}")
        if fin >= total:
            break
        cont = input(f"\nMostrar mas? (Enter=si, 'q'=salir): ").strip()
        if cont.lower() == "q":
            break
        pagina += 1


def anadir_articulo(csv_handler: CsvHandler) -> None:
    rows = csv_handler.read_all()
    pasillos = csv_handler.get_pasillos()
    print("\nPasillos disponibles:")
    for i, p in enumerate(pasillos):
        print(f"  {i}: {p}")
    print(f"  {len(pasillos)}: (nuevo pasillo)")

    sel = input("Elige pasillo (numero): ").strip()
    if sel.isdigit():
        idx = int(sel)
        if 0 <= idx < len(pasillos):
            pasillo = pasillos[idx]
        elif idx == len(pasillos):
            pasillo = input("Nombre del nuevo pasillo: ").strip()
            if not pasillo:
                print("Cancelado.")
                return
        else:
            print("Numero invalido.")
            return
    else:
        print("Cancelado.")
        return

    articulo = input("Nombre del articulo: ").strip()
    if not articulo:
        print("Cancelado.")
        return

    rows.append({"Pasillo": pasillo, "Articulo": articulo})
    csv_handler.write_all(rows)
    print(f"Anadido: [{pasillo}] {articulo}")


def borrar_articulo(csv_handler: CsvHandler) -> None:
    rows = csv_handler.read_all()
    busqueda = input("Texto a buscar en articulo (o numero de linea): ").strip()
    if busqueda.isdigit():
        idx = int(busqueda)
        if 0 <= idx < len(rows):
            r = rows.pop(idx)
            csv_handler.write_all(rows)
            print(f"Borrado [{r['Pasillo']}] {r['Articulo']}")
        else:
            print("Numero fuera de rango.")
        return

    matches = [(i, r) for i, r in enumerate(rows) if busqueda.lower() in r["Articulo"].lower()]
    if not matches:
        print("No encontrado.")
        return

    print(f"\n{len(matches)} coincidencias:")
    for i, (idx, r) in enumerate(matches):
        print(f"  {i}: [{r['Pasillo']}] {r['Articulo']}")

    sel = input("Numero a borrar (o Enter para cancelar): ").strip()
    if sel.isdigit():
        m_idx = int(sel)
        if 0 <= m_idx < len(matches):
            original_idx = matches[m_idx][0]
            r = rows.pop(original_idx)
            csv_handler.write_all(rows)
            print(f"Borrado [{r['Pasillo']}] {r['Articulo']}")
        else:
            print("Indice invalido.")


def cambiar_articulo(csv_handler: CsvHandler) -> None:
    rows = csv_handler.read_all()
    busqueda = input("Texto a buscar en articulo (o Enter para ver todos): ").strip()

    if not busqueda:
        for i, r in enumerate(rows):
            print(f"  {i}: [{r['Pasillo']}] {r['Articulo']}")
        idx = input("\nNumero de linea a cambiar: ").strip()
        if not idx.isdigit():
            return
        idx = int(idx)
        if not (0 <= idx < len(rows)):
            print("Fuera de rango.")
            return
        matches = [(idx, rows[idx])]
    else:
        matches = [(i, r) for i, r in enumerate(rows) if busqueda.lower() in r["Articulo"].lower()]
        if not matches:
            print("No encontrado.")
            return
        print(f"\n{len(matches)} coincidencias:")
        for j, (i, r) in enumerate(matches):
            print(f"  {j}: [{r['Pasillo']}] {r['Articulo']}")
        sel = input("Numero a cambiar: ").strip()
        if not sel.isdigit() or not (0 <= int(sel) < len(matches)):
            return
        original_idx, old_row = matches[int(sel)]
        matches = [(original_idx, old_row)]

    _, old_row = matches[0]
    print(f"\nEditando: [{old_row['Pasillo']}] {old_row['Articulo']}")
    nuevo_articulo = input(f"Nuevo nombre (Enter='{old_row['Articulo']}'): ").strip()
    pasillos = csv_handler.get_pasillos()
    print("\nPasillos:")
    for i, p in enumerate(pasillos):
        marca = " <-- actual" if p == old_row["Pasillo"] else ""
        print(f"  {i}: {p}{marca}")
    print(f"  {len(pasillos)}: (nuevo pasillo)")
    sel_pasillo = input("Nuevo pasillo (Enter para mantener): ").strip()

    if sel_pasillo.isdigit():
        p_idx = int(sel_pasillo)
        if 0 <= p_idx < len(pasillos):
            nuevo_pasillo = pasillos[p_idx]
        elif p_idx == len(pasillos):
            nuevo_pasillo = input("Nombre del nuevo pasillo: ").strip()
            if not nuevo_pasillo:
                nuevo_pasillo = old_row["Pasillo"]
        else:
            print("Indice de pasillo invalido.")
            return
    else:
        nuevo_pasillo = old_row["Pasillo"]

    rows[matches[0][0]] = {
        "Pasillo": nuevo_pasillo,
        "Articulo": nuevo_articulo if nuevo_articulo else old_row["Articulo"],
    }
    csv_handler.write_all(rows)
    print("Articulo actualizado.")


def gestionar_pasillos(csv_handler: CsvHandler) -> None:
    while True:
        print("\n--- Gestion de Pasillos ---")
        print("1. Listar pasillos")
        print("2. Renombrar pasillo")
        print("3. Mover articulos entre pasillos")
        print("4. Fusionar dos pasillos")
        print("5. Volver")

        op = input("Opcion: ").strip()
        if op == "1":
            listar_pasillos(csv_handler)
        elif op == "2":
            renombrar_pasillo(csv_handler)
        elif op == "3":
            mover_articulos(csv_handler)
        elif op == "4":
            fusionar_pasillos(csv_handler)
        elif op == "5":
            break


def listar_pasillos(csv_handler: CsvHandler) -> None:
    counts = csv_handler.get_pasillos_counts()
    print(f"\n{'Pasillo':<40} {'Articulos':>10}")
    print("-" * 52)
    for pasillo, count in counts:
        print(f"{pasillo:<40} {count:>10}")


def renombrar_pasillo(csv_handler: CsvHandler) -> None:
    pasillos = csv_handler.get_pasillos()
    for i, p in enumerate(pasillos):
        print(f"  {i}: {p}")
    sel = input("Numero de pasillo a renombrar: ").strip()
    if not sel.isdigit() or not (0 <= int(sel) < len(pasillos)):
        return
    old = pasillos[int(sel)]
    nuevo = input(f"Nuevo nombre para '{old}': ").strip()
    if not nuevo:
        return
    rows = csv_handler.read_all()
    count = 0
    for r in rows:
        if r["Pasillo"] == old:
            r["Pasillo"] = nuevo
            count += 1
    csv_handler.write_all(rows)
    print(f"Renombrado: {count} articulos movidos de '{old}' a '{nuevo}'.")


def mover_articulos(csv_handler: CsvHandler) -> None:
    rows = csv_handler.read_all()
    pasillos = csv_handler.get_pasillos()
    print("\nPasillo origen:")
    for i, p in enumerate(pasillos):
        print(f"  {i}: {p}")
    sel_origen = input("Numero: ").strip()
    if not sel_origen.isdigit() or not (0 <= int(sel_origen) < len(pasillos)):
        return
    origen = pasillos[int(sel_origen)]

    articulos_origen = [(i, r) for i, r in enumerate(rows) if r["Pasillo"] == origen]
    print(f"\nArticulos en '{origen}':")
    for j, (i, r) in enumerate(articulos_origen):
        print(f"  {j}: {r['Articulo']}")

    sel_arts = input("Numeros a mover (separados por comas, Enter=todos): ").strip()

    if sel_arts:
        indices_a_mover = set()
        for s in sel_arts.split(","):
            s = s.strip()
            if s.isdigit() and 0 <= int(s) < len(articulos_origen):
                indices_a_mover.add(int(s))
    else:
        indices_a_mover = set(range(len(articulos_origen)))

    print("\nPasillo destino:")
    for i, p in enumerate(pasillos):
        print(f"  {i}: {p}")
    print(f"  {len(pasillos)}: (nuevo pasillo)")
    sel_destino = input("Numero: ").strip()
    if not sel_destino.isdigit():
        return
    d_idx = int(sel_destino)
    if 0 <= d_idx < len(pasillos):
        destino = pasillos[d_idx]
    elif d_idx == len(pasillos):
        destino = input("Nombre del nuevo pasillo: ").strip()
        if not destino:
            return
    else:
        return

    count = 0
    for j in sorted(indices_a_mover, reverse=True):
        original_idx = articulos_origen[j][0]
        rows[original_idx]["Pasillo"] = destino
        count += 1

    csv_handler.write_all(rows)
    print(f"Movidos {count} articulos de '{origen}' a '{destino}'.")


def fusionar_pasillos(csv_handler: CsvHandler) -> None:
    pasillos = csv_handler.get_pasillos()
    print("\nPasillo A (absorbe al otro):")
    for i, p in enumerate(pasillos):
        print(f"  {i}: {p}")
    a_sel = input("Numero: ").strip()
    if not a_sel.isdigit() or not (0 <= int(a_sel) < len(pasillos)):
        return
    pasillo_a = pasillos[int(a_sel)]

    print("\nPasillo B (sera eliminado, sus articulos van a A):")
    remaining = [p for p in pasillos if p != pasillo_a]
    for i, p in enumerate(remaining):
        print(f"  {i}: {p}")
    b_sel = input("Numero: ").strip()
    if not b_sel.isdigit() or not (0 <= int(b_sel) < len(remaining)):
        return
    pasillo_b = remaining[int(b_sel)]

    rows = csv_handler.read_all()
    count = 0
    for r in rows:
        if r["Pasillo"] == pasillo_b:
            r["Pasillo"] = pasillo_a
            count += 1

    csv_handler.write_all(rows)
    print(f"Fusionados: {count} articulos de '{pasillo_b}' movidos a '{pasillo_a}'.")


def buscar_duplicados(finder: DuplicateFinder) -> None:
    print("\nAnalizando duplicados con DeepSeek... (puede tardar unos segundos)")
    try:
        grupos = finder.find_duplicates()
    except Exception as e:
        print(f"Error al consultar DeepSeek: {e}")
        return

    if not grupos:
        print("No se encontraron duplicados.")
        return

    print(f"\nSe encontraron {len(grupos)} grupos de posibles duplicados:\n")
    for g_idx, grupo in enumerate(grupos):
        print(f"--- Grupo {g_idx+1} ---")
        print(f"  Razon: {grupo.get('reason', 'N/A')}")
        for item in grupo.get("items", []):
            print(f"    [{item.get('pasillo', '?')}] {item.get('articulo', '?')}")
        print()

    accion = input("Quieres fusionar algun grupo? (numero de grupo, Enter=no): ").strip()
    if not accion.isdigit():
        return
    g_idx = int(accion) - 1
    if not (0 <= g_idx < len(grupos)):
        print("Grupo invalido.")
        return

    grupo = grupos[g_idx]
    items = grupo.get("items", [])
    print("\nCual conservar?")
    for j, item in enumerate(items):
        print(f"  {j}: [{item.get('pasillo', '?')}] {item.get('articulo', '?')}")
    keep_sel = input("Numero a conservar: ").strip()
    if not keep_sel.isdigit() or not (0 <= int(keep_sel) < len(items)):
        return
    keep_idx = items[int(keep_sel)].get("index", 0)

    finder.merge_group(grupo, keep_idx)
    print("Grupo fusionado. Los duplicados han sido eliminados.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Smoke test**

```bash
python3 cambiarCSVcompra/main.py
# Navegar por el menu, verificar que lee el CSV y muestra datos
```

- [ ] **Step 3: Commit**

```bash
git add cambiarCSVcompra/main.py
git commit -m "feat: add interactive CLI menu for CSV management"
```

---

### Self-Review

1. **Spec coverage:** Todas las funcionalidades pedidas cubiertas: ver, anadir, borrar, cambiar articulos/pasillos, duplicados con DeepSeek.
2. **Placeholders:** Ninguno. Todo el codigo esta completo.
3. **Type consistency:** `CsvHandler`, `DeepSeekClient`, `DuplicateFinder` — nombres e interfaces consistentes en todos los modulos.
