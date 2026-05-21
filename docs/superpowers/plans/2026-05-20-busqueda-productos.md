# Búsqueda/Filtrado de Productos - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un campo de búsqueda en tiempo real que filtre productos por nombre, integrado con las vistas existentes.

**Architecture:** Se añade un input de búsqueda al DOM con su lógica de filtrado en JavaScript. El estado de búsqueda (`searchTerm`) se añade a las variables globales y se integra en `displayProducts()` para filtrar antes de agrupar por pasillo. El CSS se mantiene en el archivo existente.

**Tech Stack:** HTML5, CSS3, JavaScript ES6+, Node.js (servidor estático)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `index.html` | Modify | Añadir input de búsqueda y botón de limpiar |
| `css/styles.css` | Modify | Estilos para input, botón limpiar y mensaje sin resultados |
| `js/script.js` | Modify | Lógica de filtrado, estado de búsqueda, integración con funciones existentes |

---

### Task 1: Añadir campo de búsqueda al HTML

**Files:**
- Modify: `index.html:27`

- [ ] **Step 1: Añadir el contenedor de búsqueda**

Insertar justo después del div `controls` y antes del div `products-container`:

```html
        <div class="search-container">
            <input type="text" id="search-input" placeholder="🔍 Buscar producto..." oninput="handleSearchInput(this.value)">
            <button id="clear-search-btn" class="clear-search-btn" onclick="clearSearch()" style="display: none;">❌</button>
        </div>
```

- [ ] **Step 2: Verificar la estructura HTML**

La estructura resultante debe ser:
1. `<div class="controls mobile-controls">` (botones)
2. `<div class="search-container">` (NUEVO)
3. `<div id="products-container" class="mobile-products">` (productos)

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add search input to HTML"
```

---

### Task 2: Añadir estilos CSS para la búsqueda

**Files:**
- Modify: `css/styles.css`

- [ ] **Step 1: Añadir estilos del contenedor de búsqueda**

Añadir al final de `css/styles.css`:

```css
/* ===== BÚSQUEDA ===== */
.search-container {
    position: relative;
    margin: 10px 0;
    width: 100%;
}

#search-input {
    width: 100%;
    padding: 12px 40px 12px 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 1rem;
    box-sizing: border-box;
    transition: border-color 0.3s ease;
}

#search-input:focus {
    outline: none;
    border-color: #28a745;
}

.clear-search-btn {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 4px 8px;
    color: #dc3545;
    line-height: 1;
}

.clear-search-btn:hover {
    color: #c82333;
}

.no-results-message {
    text-align: center;
    padding: 20px;
    color: #6c757d;
    font-style: italic;
}
```

- [ ] **Step 2: Verificar coherencia visual**

Asegurarse de que:
- El padding (12px) es táctil-friendly para móvil
- El color de foco (`#28a745`) coincide con la paleta verde de la app
- El botón de limpiar no afecta el ancho del input (usando `box-sizing: border-box` y padding derecho)

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "feat: add search styles"
```

---

### Task 3: Implementar lógica de filtrado en JavaScript

**Files:**
- Modify: `js/script.js`

- [ ] **Step 1: Añadir variable de estado global**

Después de la declaración de `let listObservations = '';` (línea ~9):

```javascript
let searchTerm = '';   // Término de búsqueda actual
```

- [ ] **Step 2: Implementar función de manejo de búsqueda**

Añadir después de la función `isTouchDevice()` (línea ~236):

```javascript
// Función para manejar la entrada de búsqueda
function handleSearchInput(value) {
    searchTerm = value.toLowerCase().trim();
    
    // Mostrar/ocultar botón de limpiar
    const clearBtn = document.getElementById('clear-search-btn');
    if (clearBtn) {
        clearBtn.style.display = searchTerm ? 'block' : 'none';
    }
    
    // Refrescar la vista
    const isMyListView = document.querySelector('.controls .control-btn:nth-child(2)')?.classList.contains('active');
    displayProducts(isMyListView);
}

// Función para limpiar la búsqueda
function clearSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    searchTerm = '';
    
    const clearBtn = document.getElementById('clear-search-btn');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    
    // Refrescar la vista
    const isMyListView = document.querySelector('.controls .control-btn:nth-child(2)')?.classList.contains('active');
    displayProducts(isMyListView);
}
```

**Nota:** No hay un indicador explícito de "modo Mi Lista" en el estado actual, así que simplemente llamamos a `displayProducts()` sin argumento o con `false`. Ver Task 4 para la integración correcta.

- [ ] **Step 3: Modificar displayProducts para filtrar**

Modificar la función `displayProducts(showOnlyChecked = false)` (línea ~137). Cambiar el bloque de filtrado inicial:

**ANTES:**
```javascript
    products.forEach(product => {
        if (!showOnlyChecked || product.checked) {
            if (!groupedProducts[product.aisle]) {
                groupedProducts[product.aisle] = [];
            }
            groupedProducts[product.aisle].push(product);
        }
    });
```

**DESPUÉS:**
```javascript
    products.forEach(product => {
        // Filtrar por estado de selección (showOnlyChecked)
        if (showOnlyChecked && !product.checked) {
            return;
        }
        
        // Filtrar por término de búsqueda
        if (searchTerm && !product.name.toLowerCase().includes(searchTerm)) {
            return;
        }
        
        if (!groupedProducts[product.aisle]) {
            groupedProducts[product.aisle] = [];
        }
        groupedProducts[product.aisle].push(product);
    });
```

- [ ] **Step 4: Añadir mensaje cuando no hay resultados**

Después del bloque `const sortedAisles = ...` y antes de `sortedAisles.forEach(aisle => {`, añadir:

```javascript
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
```

- [ ] **Step 5: Commit**

```bash
git add js/script.js
git commit -m "feat: implement search filtering logic"
```

---

### Task 4: Integrar búsqueda con funciones existentes

**Files:**
- Modify: `js/script.js`

- [ ] **Step 1: Limpiar búsqueda al borrar lista**

En `clearUserList()` (línea ~363), añadir antes de `window.location.reload()`:

```javascript
    // Limpiar búsqueda
    searchTerm = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    const clearBtn = document.getElementById('clear-search-btn');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
```

- [ ] **Step 2: Asegurar que showAllItems y showMyList mantienen búsqueda**

Las funciones `showAllItems()` y `showMyList()` ya llaman a `displayProducts()`, que ahora respeta `searchTerm` automáticamente. No se requiere cambio adicional.

- [ ] **Step 3: Limpiar búsqueda al cargar página**

En `window.onload` (línea ~447), añadir al final de la función:

```javascript
    // Inicializar campo de búsqueda
    searchTerm = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
```

- [ ] **Step 4: Commit**

```bash
git add js/script.js
git commit -m "feat: integrate search with existing functions"
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

- [ ] **Step 2: Prueba de búsqueda básica**

1. Escribir "leche" en el campo de búsqueda
2. **Esperado:** Solo se muestran productos con "leche" en el nombre
3. Escribir "LECHE" (mayúsculas)
4. **Esperado:** Mismo resultado que "leche"

- [ ] **Step 3: Prueba de sin resultados**

1. Escribir "xyz123" en el campo de búsqueda
2. **Esperado:** Mensaje "No se encontraron productos que coincidan con 'xyz123'"

- [ ] **Step 4: Prueba de integración con "Ver Mi Lista"**

1. Seleccionar algunos productos
2. Pulsar "Ver Mi Lista"
3. Escribir una búsqueda que coincida con algunos seleccionados
4. **Esperado:** Solo muestra los seleccionados que coinciden

- [ ] **Step 5: Prueba de botón limpiar**

1. Escribir texto en búsqueda
2. Pulsar el botón ❌
3. **Esperado:** Campo se vacía, vuelve a mostrar todos los productos

- [ ] **Step 6: Prueba de borrar lista**

1. Seleccionar productos, escribir en búsqueda
2. Pulsar "Borrar Mi Lista" y confirmar
3. **Esperado:** Tras recarga, el campo de búsqueda está vacío

- [ ] **Step 7: Prueba en móvil (simulador)**

1. Abrir DevTools > Toggle Device Toolbar
2. Seleccionar un dispositivo móvil (ej: iPhone SE)
3. **Esperado:** Input de búsqueda es táctil-friendly, se puede escribir fácilmente

- [ ] **Step 8: Commit final**

```bash
git commit -m "test: verify search functionality"
```

---

## Self-Review

### Spec coverage

| Requisito del Spec | Task que lo implementa |
|-------------------|------------------------|
| Campo de búsqueda visible | Task 1 (HTML) |
| Búsqueda en tiempo real | Task 3 (JS handleSearchInput) |
| Búsqueda parcial | Task 3 (includes) |
| Case-insensitive | Task 3 (toLowerCase) |
| Solo nombres de producto | Task 3 (product.name.includes) |
| Integración Ver Todos | Task 3 (displayProducts respeta searchTerm) |
| Integración Ver Mi Lista | Task 3 (displayProducts con showOnlyChecked) |
| Botón de limpiar | Task 1 (HTML), Task 2 (CSS), Task 3 (clearSearch) |
| Mensaje sin resultados | Task 3 (no-results-message) |
| No persistencia | Task 4 (no localStorage para searchTerm) |
| Borrar lista limpia búsqueda | Task 4 (clearUserList modificado) |
| Responsive | Task 2 (CSS padding táctil) |

### Placeholder scan

- ✅ Sin "TBD", "TODO", "implement later"
- ✅ Cada paso tiene código completo
- ✅ Sin referencias a funciones no definidas

### Type consistency

- ✅ `searchTerm` es string global, inicializado a `''`
- ✅ `handleSearchInput` recibe string, convierte a lowercase
- ✅ `clearSearch` no recibe parámetros
- ✅ `displayProducts` no cambia su firma (searchTerm es global)

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-20-busqueda-productos.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
