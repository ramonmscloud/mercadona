# Diseño: Ordenación Alfabética de Productos

## Fecha: 2026-05-21
## Tema: Botón para ordenar productos alfabéticamente

---

## Resumen

Añadir un botón "Ver A-Z" que permita mostrar todos los productos ordenados alfabéticamente, independientemente de los pasillos. Se mantiene un botón "Ver por Pasillo" para volver al comportamiento por defecto (agrupado por pasillos).

---

## Contexto

La aplicación actual muestra ~227 productos agrupados por pasillos. Dentro de cada pasillo, los productos ya están ordenados alfabéticamente. Sin embargo, algunos usuarios prefieren ver toda la lista en orden alfabético para encontrar productos más rápidamente, especialmente cuando no están seguros de en qué pasillo se encuentra un producto.

Ya existe una funcionalidad de búsqueda que ayuda a encontrar productos, pero una vista alfabética completa es útil para:
- Navegar por toda la lista sin saber el nombre exacto
- Descubrir productos que quizás no recordabas
- Tener una alternativa visual a la búsqueda

---

## Requisitos

### Funcionales

1. **Botón "Ver por Pasillo"**: Muestra productos agrupados por pasillo (comportamiento actual por defecto)
2. **Botón "Ver A-Z"**: Muestra todos los productos en orden alfabético (A-Z), sin agrupar por pasillos
3. **Visualización del pasillo**: En modo A-Z, cada producto muestra su nombre seguido del pasillo entre paréntesis
4. **Estado activo**: El botón del modo actual se resalta visualmente
5. **Integración con filtros existentes**:
   - Funciona con "Ver Todos" y "Ver Mi Lista"
   - Funciona con la búsqueda
6. **Reset al borrar**: Al pulsar "Borrar Mi Lista", el modo vuelve a "Ver por Pasillo"
7. **No persistencia**: El modo de ordenación NO se guarda en localStorage (comportamiento temporal)

### No funcionales

- Responsive: Botones deben adaptarse a móvil (apilarse si es necesario)
- Rendimiento: El ordenamiento debe ser instantáneo con ~227 productos
- Consistencia visual: Los nuevos botones deben tener el mismo estilo que los existentes

---

## Interfaz de Usuario (UI)

### Posición

```
┌─────────────────────────────────────┐
│  Ver Todos  Ver Mi Lista            │  <- Botones de vista
│  Generar txt  Borrar Mi Lista       │
│  Cargar txt                         │
├─────────────────────────────────────┤
│  [Ver por Pasillo] [Ver A-Z]        │  <- NUEVOS BOTONES
├─────────────────────────────────────┤
│  Buscar producto...            ❌    │  <- Búsqueda existente
├─────────────────────────────────────┤
│  Productos...                       │
└─────────────────────────────────────┘
```

### En modo "Ver por Pasillo"

```
01 - Pasillo limpieza
  [ ] Ariel cápsulas ropa        [1]
  [ ] Fairy fregar verde         [0]
  [ ] Papel WC                   [0]

02 - Verduras
  [ ] Acelga                     [0]
  [ ] Brócoli                    [1]
```

### En modo "Ver A-Z"

```
[ ] Acelga (02 Verduras)          [0]
[ ] Aceite de oliva (03 Aceite)   [1]
[ ] Aguacate (02 Verduras)        [0]
[ ] Ariel cápsulas ropa           [0]
      (01 Pasillo limpieza)
[ ] Brócoli (02 Verduras)         [1]
```

---

## Comportamiento

### Estado global

```javascript
let sortMode = 'aisle'; // 'aisle' | 'alphabetical'
```

### Renderizado

**Modo 'aisle' (por pasillo):**
- Agrupa productos por pasillo
- Ordena pasillos por número
- Dentro de cada pasillo, ordena alfabéticamente
- Muestra cabecera de pasillo

**Modo 'alphabetical' (A-Z):**
- Toma todos los productos (filtrados por checked/búsqueda si aplica)
- Ordena alfabéticamente por nombre
- Muestra en lista plana (sin cabeceras de pasillo)
- Cada producto muestra: `[checkbox] Nombre producto (Pasillo) [cantidad]`

### Cambio de modo

Al pulsar un botón de ordenación:
1. Actualizar `sortMode`
2. Actualizar estilos de botones (activo/inactivo)
3. Llamar a `displayProducts()` para refrescar

### Integración con filtros

```javascript
// Pseudocódigo
displayProducts(showOnlyChecked) {
    let filtered = products;
    
    // Aplicar filtro de checked
    if (showOnlyChecked) {
        filtered = filtered.filter(p => p.checked);
    }
    
    // Aplicar filtro de búsqueda
    if (searchTerm) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm));
    }
    
    // Renderizar según modo de ordenación
    if (sortMode === 'aisle') {
        renderByAisle(filtered);
    } else {
        renderAlphabetical(filtered);
    }
}
```

---

## Integración con código existente

### Archivos a modificar

1. **index.html**: Añadir botones "Ver por Pasillo" y "Ver A-Z"
2. **css/styles.css**: Añadir estilos para botones activos/inactivos
3. **js/script.js**: 
   - Añadir variable `sortMode`
   - Añadir funciones `showByAisle()` y `showAlphabetical()`
   - Modificar `displayProducts()` para soportar ambos modos
   - Actualizar `clearUserList()` para resetear a modo pasillo

### Estado añadido

```javascript
let sortMode = 'aisle'; // 'aisle' | 'alphabetical'
```

### Funciones nuevas

- `showByAisle()`: Activa modo por pasillo y refresca
- `showAlphabetical()`: Activa modo A-Z y refresca
- `renderByAisle(products)`: Renderiza agrupado por pasillo (extraído de displayProducts actual)
- `renderAlphabetical(products)`: Renderiza lista plana ordenada A-Z

### Funciones a modificar

- `displayProducts(showOnlyChecked)`: Añadir lógica de enrutamiento según `sortMode`
- `clearUserList()`: Resetear `sortMode` a 'aisle'
- `window.onload()`: Inicializar `sortMode` a 'aisle'

---

## Pruebas (Testing)

### Manuales

1. Pulsar "Ver A-Z" → Todos los productos en orden alfabético, sin cabeceras de pasillo
2. Pulsar "Ver por Pasillo" → Vuelve a la vista agrupada (comportamiento original)
3. En "Ver A-Z", verificar que cada producto muestra su pasillo
4. Seleccionar productos, cambiar a "Ver Mi Lista", pulsar "Ver A-Z" → Solo productos seleccionados, ordenados A-Z
5. Escribir en búsqueda en modo A-Z → Solo productos que coinciden, ordenados A-Z
6. Pulsar "Borrar Mi Lista" → Vuelve a modo "Ver por Pasillo"
7. En móvil: Botones deben ser táctil-friendly y adaptarse al ancho

---

## Decisiones de diseño

| Decisión | Alternativa | Razón |
|----------|-------------|-------|
| Dos botones separados | Dropdown selector | Más directo, consistente con UI actual |
| Modo por pasillo por defecto | Modo A-Z por defecto | El agrupado por pasillo es el caso de uso principal (recorrido en tienda) |
| No persistencia | Guardar en localStorage | El modo de ordenación es una preferencia temporal de visualización |
| Mostrar pasillo entre paréntesis | No mostrar pasillo | El usuario pidió ver el pasillo para saber dónde encontrar el producto |
| Lista plana sin cabeceras | Cabeceras por letra (A, B, C...) | Más simple, menos scroll. Se puede añadir letras más adelante si se necesita |
