# Lectura en voz alta de la lista de compra

**Fecha:** 2026-05-21
**Estado:** Aprobado

## Objetivo

Añadir un botón que lea en voz alta los productos marcados para comprar, permitiendo un repaso rápido auditivo antes de salir a comprar.

## Funcionalidad

### Botón "Leer lista"

- **Ubicación:** Barra de controles superior, junto a los botones existentes (Ver Todos, Ver Mi Lista, Generar txt, etc.)
- **Estilo:** Botón naranja (`speak-btn`) con icono de altavoz
- **Comportamiento:** Play/Stop toggle — primera pulsación inicia la lectura, segunda pulsación la detiene
- **Feedback visual:** Animación de pulso rojo (`speaking`) mientras el navegador está hablando

### Formato de lectura

Cada producto se lee individualmente con su pasillo y cantidad:

- Si `quantity > 1`: `"Leche, en Lácteos, 2 unidades."`
- Si `quantity = 1`: `"Leche, en Lácteos."` (se omite la cantidad)
- Productos ordenados alfabéticamente dentro de cada pasillo
- Pasillos ordenados numéricamente por su prefijo

### Casos borde

- **Lista vacía:** Reproduce `"No hay productos marcados para comprar."`
- **Sin productos con cantidad >1:** Nunca se mencionan "unidades"
- **TTS no disponible:** El navegador maneja el error silenciosamente

## Implementación

### HTML (`index.html`)

Añadir botón en la sección `.controls`:

```html
<button onclick="readListAloud()" class="speak-btn">🔊 Leer lista</button>
```

### JavaScript (`js/script.js`)

Dos funciones:

1. **`readListAloud()`** — Función principal expuesta globalmente:
   - Si ya está hablando → cancela y quita clase `speaking`
   - Si no hay productos marcados → reproduce mensaje vacío y termina
   - Construye el texto de lectura producto-por-producto (pasillo + cantidad)
   - Crea `SpeechSynthesisUtterance` con `lang='es-ES'`
   - Añade clase `speaking` al botón, la quita en `onend`/`onerror`

2. **`speakText(text)`** — Helper para casos simples (mensaje de lista vacía):
   - Cancela cualquier lectura activa
   - Crea y reproduce utterance

### CSS (`css/styles.css`)

Añadir clase `.speak-btn`:

```css
.speak-btn {
    background: linear-gradient(to right, #ff6f00, #e65100);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    margin: 5px;
}

.speak-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(255, 111, 0, 0.3);
}

.speak-btn.speaking {
    background: linear-gradient(to right, #d32f2f, #b71c1c);
    animation: pulse 1s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}
```

## Testing

- Probar con lista vacía → debe decir "No hay productos marcados para comprar"
- Probar con 1 producto → debe leer nombre + pasillo, sin cantidad
- Probar con varios productos en distintos pasillos → cada uno con su pasillo y cantidad si >1
- Probar toggle → primer clic habla, segundo clic detiene
- Probar que la animación de pulso aparece y desaparece correctamente
