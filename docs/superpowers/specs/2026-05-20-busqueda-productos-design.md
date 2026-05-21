# Diseño: Búsqueda/Filtrado de Productos

## Fecha: 2026-05-20
## Tema: Buscar/Filtrar productos

---

## Resumen

Añadir un campo de búsqueda en tiempo real que permita filtrar los productos del catálogo por nombre. La búsqueda es parcial, case-insensitive y solo afecta a la visualización, no a los datos.

---

## Contexto

La aplicación actual muestra ~227 productos agrupados por pasillos. Navegar por todos los productos en móvil es tedioso. Los usuarios necesitan una forma rápida de encontrar productos específicos sin tener que hacer scroll por todos los pasillos.

---

## Requisitos

### Funcionales

1. **Campo de búsqueda visible**: Input de texto ubicado entre los botones de control y el contenedor de productos.
2. **Búsqueda en tiempo real**: Filtrado instantáneo al escribir (sin botón de "buscar").
3. **Búsqueda parcial**: Escribir "leche" encuentra "Leche entera", "Leche desnatada".
4. **Case-insensitive**: No distingue entre mayúsculas y minúsculas.
5. **Solo nombres de producto**: No busca en nombres de pasillo.
6. **Integración con modos de vista**:
   - En "Ver Todos": filtra todos los productos.
   - En "Ver Mi Lista": filtra solo los productos seleccionados.
7. **Botón de limpiar**: Icono "❌" que aparece cuando hay texto, para vaciar el campo rápidamente.
8. **Mensaje sin resultados**: Mostrar texto amigable cuando no hay coincidencias.
9. **No persistencia**: El texto de búsqueda es temporal, no se guarda en localStorage.
10. **Borrar lista limpia búsqueda**: Al pulsar "Borrar Mi Lista", el campo de búsqueda se vacía.

### No funcionales

- Responsive: Debe funcionar correctamente en móvil y desktop.
- Rendimiento: El filtrado debe ser instantáneo con ~227 productos.
- Accesibilidad: Input debe tener label/placeholder descriptivo.

---

## Interfaz de Usuario (UI)

### Posición

```
┌─────────────────────────────────────┐
│  Ver Todos  Ver Mi Lista  ...       │  <- Botones de control
├─────────────────────────────────────┤
│  🔍 Buscar producto...        ❌     │  <- NUEVO: Campo de búsqueda
├─────────────────────────────────────┤
│  01 - Pasillo limpieza              │  <- Contenedor de productos
│  [ ] Toallitas bebé          [1]    │
│  ...                                │
└─────────────────────────────────────┘
```

### Estilo

- Ancho 100% del contenedor.
- Padding cómodo para táctil (mínimo 12px vertical).
- Borde redondeado, color coherente con la paleta existente (verdes/azules).
- Placeholder: "🔍 Buscar producto..."
- Botón de limpiar: posicionado absolutamente a la derecha del input.

---

## Comportamiento

### Filtrado

```javascript
// Pseudocódigo
const searchTerm = input.value.toLowerCase().trim();
const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm)
);
```

### Visualización

- Los productos filtrados se agrupan por pasillo como siempre.
- Solo se renderizan los pasillos que contienen al menos un producto coincidente.
- Dentro de cada pasillo, solo se renderizan los productos coincidentes.
- Los productos mantienen su estado (checked, quantity) y funcionalidad (checkbox, cantidad, cambiar pasillo).

### Casos límite

- **Input vacío**: Muestra todos los productos según el modo activo (todos o solo seleccionados).
- **Sin coincidencias**: Muestra mensaje "No se encontraron productos que coincidan con 'xxx'".
- **Modo "Ver Mi Lista" + búsqueda**: Aplica ambos filtros (seleccionados Y coinciden con búsqueda).

---

## Integración con código existente

### Archivos a modificar

1. **index.html**: Añadir el input de búsqueda y botón de limpiar.
2. **css/styles.css**: Añadir estilos para el input, botón de limpiar y mensaje sin resultados.
3. **js/script.js**: Añadir lógica de filtrado, gestión del estado de búsqueda, integración con `displayProducts()`.

### Estado añadido

```javascript
let searchTerm = ''; // Término de búsqueda actual
```

### Funciones a modificar

- `displayProducts(showOnlyChecked)`: Añadir parámetro/filter interno para aplicar búsqueda.
- `clearUserList()`: Limpiar `searchTerm` y el input al borrar la lista.
- `showAllItems()`: Mantener búsqueda activa si existe.
- `showMyList()`: Mantener búsqueda activa si existe.

### Funciones nuevas

- `filterProducts()`: Aplica el filtro de búsqueda sobre la lista de productos.
- `clearSearch()`: Limpia el campo de búsqueda y refresca la vista.
- `handleSearchInput()`: Manejador del evento `input` del campo de búsqueda.

---

## Pruebas (Testing)

### Manuales

1. Escribir "leche" -> debe mostrar solo productos con "leche" en el nombre.
2. Escribir "LECHE" -> mismo resultado que "leche" (case-insensitive).
3. Escribir "xyz" -> debe mostrar mensaje "No se encontraron productos..."
4. Seleccionar productos, cambiar a "Ver Mi Lista", escribir búsqueda -> solo muestra seleccionados que coincidan.
5. Pulsar "❌" -> campo se vacía, vuelve a mostrar todo.
6. Pulsar "Borrar Mi Lista" -> campo de búsqueda se vacía.
7. En móvil: input debe ser táctil-friendly, placeholder visible.

---

## Decisiones de diseño

| Decisión | Alternativa | Razón |
|----------|-------------|-------|
| Búsqueda en tiempo real | Botón "Buscar" | Más rápido e intuitivo con 200+ productos |
| Solo nombres de producto | Incluir pasillos | El usuario pidió explícitamente solo nombres |
| No persistir búsqueda | Guardar en localStorage | La búsqueda es temporal por naturaleza |
| Botón de limpiar | Sin botón | Mejora UX, permite reset rápido |
| Filtrar pasillos vacíos | Mostrar todos los pasillos | Más limpio, menos scroll innecesario |

---

## Notas de implementación

- Reutilizar la lógica de agrupación y ordenación de `displayProducts()`.
- El filtrado debe aplicarse ANTES de la agrupación por pasillo.
- No modificar el array `products` global; filtrar sobre una copia local en `displayProducts()`.
- Asegurar que los event listeners no se dupliquen al recrear el DOM.
