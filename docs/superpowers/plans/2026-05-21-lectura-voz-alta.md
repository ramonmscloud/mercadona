# Lectura en voz alta - Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modificar la función `readListAloud()` para que lea productos uno a uno con su pasillo y cantidad, en vez de agrupar por pasillo.

**Architecture:** Ajuste puntual en `js/script.js`. El HTML y CSS ya están correctos. Solo se modifica la lógica de construcción del texto hablado dentro de `readListAloud()`.

**Tech Stack:** Vanilla JS, Web Speech API (SpeechSynthesis)

---

### Task 1: Corregir formato de lectura a producto-por-producto con pasillo y cantidad

**Files:**
- Modify: `js/script.js:862-905` (función `readListAloud`)

- [ ] **Step 1: Reemplazar la lógica de construcción del texto en `readListAloud`**

La función actual agrupa por pasillo. Hay que cambiarla para iterar productos ordenados y construir texto individual por producto.

Buscar el bloque dentro de `readListAloud()` desde `const grouped = {};` hasta `speakText(text);` y reemplazarlo:

```javascript
    const sorted = [...checkedProducts].sort((a, b) => {
        const aNum = parseInt(a.aisle.match(/^\d+/));
        const bNum = parseInt(b.aisle.match(/^\d+/));
        if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) return aNum - bNum;
        if (a.aisle !== b.aisle) return a.aisle.localeCompare(b.aisle);
        return a.name.localeCompare(b.name);
    });

    const parts = sorted.map(p => {
        const aisleMatch = p.aisle.match(/^\d+\s+(.+)/);
        const aisleName = aisleMatch ? aisleMatch[1] : p.aisle;
        const qty = p.quantity > 1 ? `, ${p.quantity} unidades` : '';
        return `${p.name}, en ${aisleName}${qty}`;
    });

    const text = `Tienes ${checkedProducts.length} producto${checkedProducts.length !== 1 ? 's' : ''} en tu lista. ${parts.join('. ')}.`;
```

El resultado final de la función `readListAloud()` debe quedar así:

```javascript
function readListAloud() {
    const btn = document.querySelector('.speak-btn');
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        if (btn) btn.classList.remove('speaking');
        return;
    }

    const checkedProducts = products.filter(p => p.checked);
    if (checkedProducts.length === 0) {
        speakText('No hay productos marcados para comprar.');
        return;
    }

    const sorted = [...checkedProducts].sort((a, b) => {
        const aNum = parseInt(a.aisle.match(/^\d+/));
        const bNum = parseInt(b.aisle.match(/^\d+/));
        if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) return aNum - bNum;
        if (a.aisle !== b.aisle) return a.aisle.localeCompare(b.aisle);
        return a.name.localeCompare(b.name);
    });

    const parts = sorted.map(p => {
        const aisleMatch = p.aisle.match(/^\d+\s+(.+)/);
        const aisleName = aisleMatch ? aisleMatch[1] : p.aisle;
        const qty = p.quantity > 1 ? `, ${p.quantity} unidades` : '';
        return `${p.name}, en ${aisleName}${qty}`;
    });

    const text = `Tienes ${checkedProducts.length} producto${checkedProducts.length !== 1 ? 's' : ''} en tu lista. ${parts.join('. ')}.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1;
    utterance.pitch = 1;
    if (btn) btn.classList.add('speaking');
    utterance.onend = () => { if (btn) btn.classList.remove('speaking'); };
    utterance.onerror = () => { if (btn) btn.classList.remove('speaking'); };
    window.speechSynthesis.speak(utterance);
}
```

- [ ] **Step 2: Verificar que el servidor carga sin errores**

```bash
node server.js
```

Abrir `http://localhost:8000` en el navegador y comprobar que la consola no muestra errores JS.

- [ ] **Step 3: Probar manualmente los casos**

| Caso | Acción | Resultado esperado |
|---|---|---|
| Lista vacía | Pulsar 🔊 sin productos marcados | "No hay productos marcados para comprar" |
| 1 producto, qty 1 | Marcar 1 producto y pulsar 🔊 | "Tienes 1 producto en tu lista. Leche, en Lácteos." |
| 1 producto, qty 3 | Marcar 1 producto, poner cantidad 3, pulsar 🔊 | "...Leche, en Lácteos, 3 unidades." |
| Varios productos | Marcar varios en distintos pasillos | Cada producto dice su pasillo y cantidad si >1 |
| Toggle stop | Pulsar 🔊 mientras habla | Se detiene la lectura, desaparece animación |
| Animación | Pulsar 🔊 | El botón se pone rojo con pulso mientras habla |

- [ ] **Step 4: Commit**

```bash
git add js/script.js
git commit -m "fix: cambiar lectura en voz alta a formato producto-por-producto con pasillo y cantidad"
```
