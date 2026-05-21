# Ordenación Alfabética de Productos - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir botones para alternar entre vista por pasillo y vista alfabética (A-Z) de los productos.

**Architecture:** Se añaden dos botones de ordenación al HTML con estilos CSS para estado activo. Se añade una variable global `sortMode` que controla cómo `displayProducts()` renderiza: agrupado por pasillo (comportamiento actual extraído a `renderByAisle()`) o lista plana ordenada alfabéticamente (`renderAlphabetical()`).

**Tech Stack:** HTML5, CSS3, JavaScript ES6+, Node.js (servidor estático)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `index.html` | Modify | Añadir botones "Ver por Pasillo" y "Ver A-Z" |
| `css/styles.css` | Modify | Estilos para botones de ordenación activos/inactivos |
| `js/script.js` | Modify | Estado `sortMode`, funciones de ordenación, modificar `displayProducts()` |

---

### Task 1: Añadir botones de ordenación al HTML

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Añadir contenedor de botones de ordenación**

Insertar justo después del div `controls` (línea 25) y antes del div `search-container` (línea 27):

```html
        <div class="sort-controls">
            <button onclick="showByAisle()" id="btn-sort-aisle" class="sort-btn active">Ver por Pasillo</button>
            <button onclick="showAlphabetical()" id="btn-sort-alpha" class="sort-btn">Ver A-Z</button>
        </div>
```

La estructura resultante debe ser:
1. `<div class="controls mobile-controls">` (botones de vista: Ver Todos, Ver Mi Lista, etc.)
2. `<div class="sort-controls">` (NUEVO: botones de ordenación)
3. `<div class="search-container">` (búsqueda)
4. `<div id="products-container">` (productos)

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add sort buttons to HTML"
```

---

### Task 2: Añadir estilos CSS para botones de ordenación

**Files:**
- Modify: `css/styles.css`

- [ ] **Step 1: Añadir estilos de contenedor y botones**

Añadir al final de `css/styles.css` (después de los estilos de búsqueda):

```css
/* ===== ORDENACIÓN ===== */
.sort-controls {
    display: flex;
    gap: 8px;
    margin: 10px 0;
    justify-content: center;
}

.sort-btn {
    background: linear-gradient(to right, #6c757d, #5a6268);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.9rem;
    flex: 1;
    max-width: 140px;
}

.sort-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3);
}

.sort-btn.active {
    background: linear-gradient(to right, #28a745, #218838);
    box-shadow: 0 2px 8px rgba(40, 167, 69, 0.4);
}

.sort-btn.active:hover {
    box-shadow: 0 4px 15px rgba(40, 167, 69, 0.5);
}
```

- [ ] **Step 2: Verificar coherencia visual**

Asegurarse de que:
- `.sort-btn` sigue el mismo patrón que `.control-btn` pero con colores diferentes (gris por defecto, verde activo)
- El contenedor usa `flex` con `gap` para espaciado uniforme
- En móvil, los botones ocupan el ancho disponible con `flex: 1`

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "feat: add sort button styles"
```

---

### Task 3: Implementar lógica de ordenación en JavaScript

**Files:**
- Modify: `js/script.js`

- [ ] **Step 1: Añadir variable de estado global**

Después de `let currentViewMode = 'all';` (línea 11):

```javascript
let sortMode = 'aisle'; // 'aisle' | 'alphabetical'
```

- [ ] **Step 2: Extraer renderizado por pasillo a función separada**

En `displayProducts(showOnlyChecked = false)` (línea 139), el código actual desde la línea 150 hasta el final de la función hace el renderizado por pasillo. Extraer todo ese bloque a una nueva función `renderByAisle(filteredProducts, container)`.

La función `renderByAisle` debe recibir:
- `filteredProducts`: array de productos ya filtrados por checked y búsqueda
- `container`: el elemento DOM donde renderizar

Mover todo el código desde:
```javascript
    const groupedProducts = {};
    products.forEach(product => {
```
hasta el final de `sortedAisles.forEach(...)` (justo antes de `container.appendChild(section)`) a una nueva función.

**La función `displayProducts` modificada quedará:**

```javascript
function displayProducts(showOnlyChecked = false) {
    console.log(`Mostrando productos (solo marcados: ${showOnlyChecked}, modo: ${sortMode})`);
    console.log(`Total de productos disponibles: ${products.length}`);
    
    const container = document.getElementById('products-container');
    if (!container) {
        console.error('Error: No se encontró el contenedor de productos');
        return;
    }
    container.innerHTML = '';

    // Filtrar productos
    const filteredProducts = products.filter(product => {
        if (showOnlyChecked && !product.checked) {
            return false;
        }
        if (searchTerm && !product.name.toLowerCase().includes(searchTerm)) {
            return false;
        }
        return true;
    });

    // Renderizar según modo de ordenación
    if (sortMode === 'aisle') {
        renderByAisle(filteredProducts, container);
    } else {
        renderAlphabetical(filteredProducts, container);
    }
    
    console.log('Visualización de productos completada');
}
```

- [ ] **Step 3: Crear función renderByAisle**

```javascript
function renderByAisle(filteredProducts, container) {
    const groupedProducts = {};
    filteredProducts.forEach(product => {
        if (!groupedProducts[product.aisle]) {
            groupedProducts[product.aisle] = [];
        }
        groupedProducts[product.aisle].push(product);
    });

    const aisleCount = Object.keys(groupedProducts).length;
    console.log(`Pasillos a mostrar: ${aisleCount}`);

    // Ordenar los pasillos por su número inicial si existe
    const sortedAisles = Object.keys(groupedProducts).sort((a, b) => {
        const aNum = parseInt(a.match(/^\d+/));
        const bNum = parseInt(b.match(/^\d+/));
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
        }
        return a.localeCompare(b);
    });

    // Mostrar mensaje si no hay resultados
    if (sortedAisles.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results-message';
        noResults.textContent = searchTerm
            ? `No se encontraron productos que coincidan con "${searchTerm}"`
            : 'No hay productos para mostrar';
        container.appendChild(noResults);
        return;
    }

    sortedAisles.forEach(aisle => {
        const section = document.createElement('div');
        section.className = 'aisle-section';
        
        // Extraer el número del pasillo si existe
        const aisleMatch = aisle.match(/^(\d+)\s+(.+)/);
        let aisleTitle = aisle;
        if (aisleMatch) {
            aisleTitle = `${aisleMatch[1]} - ${aisleMatch[2]}`;
        }
        
        section.innerHTML = `<h2>${aisleTitle}</h2>`;

        // Ordenar productos alfabéticamente
        const sortedProducts = groupedProducts[aisle].sort((a, b) => 
            a.name.localeCompare(b.name)
        );

        sortedProducts.forEach(product => {
            const item = document.createElement('div');
            item.className = 'product-item';
            
            item.innerHTML = `
                <input type="checkbox" id="${product.name.replace(/"/g, '&quot;')}" 
                    ${product.checked ? 'checked' : ''}
                    onchange="toggleProduct('${product.name.replace(/'/g, "\\'")}')"
                >
                <label for="${product.name.replace(/"/g, '&quot;')}">${product.name}</label>
                <input type="number" class="quantity-input" 
                    min="0" max="25" value="${product.checked ? (product.quantity || 1) : 0}" 
                    onchange="updateQuantity('${product.name.replace(/'/g, "\\'")}', this.value)"
                    ${!product.checked ? 'disabled' : ''}
                    aria-label="Cantidad">
                <button class="change-aisle-btn" onclick="toggleAisleSelector(this)" aria-label="Cambiar pasillo">
                    <span>⋮</span>
                </button>
                <div class="aisle-selector hidden">
                    <select onchange="changeAisle('${product.name.replace(/'/g, "\\'")}', this.value)">
                        ${Array.from(aisles).sort().map(a => 
                            `<option value="${a.replace(/"/g, '&quot;')}" ${a === product.aisle ? 'selected' : ''}>
                                ${a}
                            </option>`
                        ).join('')}
                    </select>
                </div>
            `;
            section.appendChild(item);
        });

        container.appendChild(section);
    });
}
```

- [ ] **Step 4: Crear función renderAlphabetical**

```javascript
function renderAlphabetical(filteredProducts, container) {
    // Ordenar productos alfabéticamente
    const sortedProducts = filteredProducts.sort((a, b) => 
        a.name.localeCompare(b.name)
    );

    console.log(`Productos a mostrar: ${sortedProducts.length}`);

    // Mostrar mensaje si no hay resultados
    if (sortedProducts.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results-message';
        noResults.textContent = searchTerm
            ? `No se encontraron productos que coincidan con "${searchTerm}"`
            : 'No hay productos para mostrar';
        container.appendChild(noResults);
        return;
    }

    const list = document.createElement('div');
    list.className = 'alphabetical-list';

    sortedProducts.forEach(product => {
        const item = document.createElement('div');
        item.className = 'product-item';
        
        // Extraer nombre del pasillo limpio
        const aisleMatch = product.aisle.match(/^(\d+)\s+(.+)/);
        const aisleDisplay = aisleMatch ? `(${aisleMatch[1]} ${aisleMatch[2]})` : `(${product.aisle})`;
        
        item.innerHTML = `
            <input type="checkbox" id="${product.name.replace(/"/g, '&quot;')}" 
                ${product.checked ? 'checked' : ''}
                onchange="toggleProduct('${product.name.replace(/'/g, "\\'")}')"
            >
            <label for="${product.name.replace(/"/g, '&quot;')}">${product.name} <span class="aisle-label">${aisleDisplay}</span></label>
            <input type="number" class="quantity-input" 
                min="0" max="25" value="${product.checked ? (product.quantity || 1) : 0}" 
                onchange="updateQuantity('${product.name.replace(/'/g, "\\'")}', this.value)"
                ${!product.checked ? 'disabled' : ''}
                aria-label="Cantidad">
            <button class="change-aisle-btn" onclick="toggleAisleSelector(this)" aria-label="Cambiar pasillo">
                <span>⋮</span>
            </button>
            <div class="aisle-selector hidden">
                <select onchange="changeAisle('${product.name.replace(/'/g, "\\'")}', this.value)">
                    ${Array.from(aisles).sort().map(a => 
                        `<option value="${a.replace(/"/g, '&quot;')}" ${a === product.aisle ? 'selected' : ''}>
                            ${a}
                        </option>`
                    ).join('')}
                </select>
            </div>
        `;
        list.appendChild(item);
    });

    container.appendChild(list);
}
```

- [ ] **Step 5: Crear funciones de control de ordenación**

Añadir después de `clearSearch()`:

```javascript
// Función para activar modo por pasillo
function showByAisle() {
    sortMode = 'aisle';
    updateSortButtons();
    displayProducts(currentViewMode === 'checked');
}

// Función para activar modo alfabético
function showAlphabetical() {
    sortMode = 'alphabetical';
    updateSortButtons();
    displayProducts(currentViewMode === 'checked');
}

// Función para actualizar estilos de botones de ordenación
function updateSortButtons() {
    const btnAisle = document.getElementById('btn-sort-aisle');
    const btnAlpha = document.getElementById('btn-sort-alpha');
    
    if (btnAisle) {
        btnAisle.classList.toggle('active', sortMode === 'aisle');
    }
    if (btnAlpha) {
        btnAlpha.classList.toggle('active', sortMode === 'alphabetical');
    }
}
```

- [ ] **Step 6: Añadir estilo CSS para etiqueta de pasillo en modo A-Z**

Añadir a los estilos CSS de ordenación (en Task 2):

```css
.aisle-label {
    color: #6c757d;
    font-size: 0.85em;
    font-style: italic;
}
```

- [ ] **Step 7: Commit**

```bash
git add js/script.js
git commit -m "feat: implement sort mode logic and rendering"
```

---

### Task 4: Integrar ordenación con funciones existentes

**Files:**
- Modify: `js/script.js`

- [ ] **Step 1: Resetear modo al borrar lista**

En `clearUserList()`, añadir junto al reset de búsqueda (usando `resetSearchUI()` que ya existe):

```javascript
    // Resetear modo de ordenación
    sortMode = 'aisle';
    updateSortButtons();
```

- [ ] **Step 2: Inicializar modo al cargar página**

En `window.onload`, añadir junto a la inicialización de búsqueda:

```javascript
    // Inicializar modo de ordenación
    sortMode = 'aisle';
    updateSortButtons();
```

- [ ] **Step 3: Commit**

```bash
git add js/script.js
git commit -m "feat: integrate sort mode with existing functions"
```

---

### Task 5: Testing manual y verificación

**Files:**
- No se modifica código, solo se prueba

- [ ] **Step 1: Iniciar servidor y abrir aplicación**

```bash
node server.js
```

Abrir navegador en `http://localhost:8000`

- [ ] **Step 2: Prueba de cambio de modo**

1. Página carga en modo "Ver por Pasillo" (botón verde)
2. Pulsar "Ver A-Z" → botón se pone verde, "Ver por Pasillo" se pone gris
3. Verificar que productos están ordenados A-Z sin cabeceras de pasillo
4. Verificar que cada producto muestra su pasillo entre paréntesis
5. Pulsar "Ver por Pasillo" → vuelve a la vista agrupada

- [ ] **Step 3: Prueba de integración con filtros**

1. Seleccionar algunos productos
2. Pulsar "Ver Mi Lista"
3. Pulsar "Ver A-Z" → Solo productos seleccionados, ordenados A-Z
4. Escribir una búsqueda → Solo coincidencias, ordenadas A-Z
5. Pulsar "Ver por Pasillo" → Vuelve a agrupado por pasillo

- [ ] **Step 4: Prueba de reset**

1. Cambiar a "Ver A-Z"
2. Pulsar "Borrar Mi Lista" y confirmar
3. Tras recarga, debe estar en "Ver por Pasillo" por defecto

- [ ] **Step 5: Prueba en móvil**

1. Abrir DevTools > Toggle Device Toolbar
2. Seleccionar dispositivo móvil
3. Verificar que botones de ordenación se adaptan al ancho

- [ ] **Step 6: Commit final**

```bash
git commit -m "test: verify alphabetical sort functionality"
```

---

## Self-Review

### Spec coverage

| Requisito del Spec | Task que lo implementa |
|-------------------|------------------------|
| Botón "Ver por Pasillo" | Task 1 (HTML), Task 3 (JS showByAisle) |
| Botón "Ver A-Z" | Task 1 (HTML), Task 3 (JS showAlphabetical) |
| Visualización del pasillo en modo A-Z | Task 3 (JS renderAlphabetical aisle-label) |
| Estado activo resaltado | Task 2 (CSS .sort-btn.active), Task 3 (updateSortButtons) |
| Integración con Ver Todos/Ver Mi Lista | Task 3 (displayProducts usa currentViewMode) |
| Integración con búsqueda | Task 3 (displayProducts aplica searchTerm antes de renderizar) |
| Reset al borrar lista | Task 4 (clearUserList reset sortMode) |
| No persistencia | Task 4 (no localStorage para sortMode) |
| Responsive en móvil | Task 2 (CSS flex + gap) |

### Placeholder scan

- ✅ Sin "TBD", "TODO", "implement later"
- ✅ Cada paso tiene código completo
- ✅ Sin referencias a funciones no definidas

### Type consistency

- ✅ `sortMode` es string: `'aisle' | 'alphabetical'`
- ✅ `showByAisle()` y `showAlphabetical()` no reciben parámetros
- ✅ `updateSortButtons()` no recibe parámetros
- ✅ `renderByAisle(filteredProducts, container)` recibe array y elemento DOM
- ✅ `renderAlphabetical(filteredProducts, container)` recibe array y elemento DOM

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-21-ordenacion-alfabetica.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
