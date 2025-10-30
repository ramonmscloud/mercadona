# Lista de Compras Mercadona

Una aplicación web simple y eficiente para gestionar listas de compras del supermercado Mercadona, organizada por pasillos para facilitar la navegación en tienda.

## 🚀 Funcionalidades

- **Catálogo de productos**: Carga automática de productos desde archivo CSV organizado por pasillos
- **Selección interactiva**: Marca/desmarca productos con checkboxes y especifica cantidades (1-25 unidades)
- **Vista organizada**: Productos agrupados por pasillo con orden alfabético
- **Gestión de listas**:
  - Ver catálogo completo
  - Ver solo productos seleccionados
  - Reiniciar lista
- **Exportación/Importación**:
  - Exporta lista a archivo TXT organizado por pasillos
  - Importa listas desde archivos TXT
- **Observaciones**: Campo para añadir notas personalizadas
- **Persistencia**: Guarda automáticamente las selecciones en el navegador
- **Interfaz responsive**: Optimizada para móviles y desktop
- **Modo offline**: Funciona sin conexión una vez cargada

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js (servidor HTTP simple)
- **Datos**: CSV con productos organizados por pasillos
- **Librerías**:
  - xlsx.full.min.js (manejo de archivos)
  - jspdf (generación de PDFs)

## 📦 Instalación y Uso

### Prerrequisitos

- Node.js instalado
- Navegador web moderno

### Instalación

1. Clona el repositorio:

   ```bash
   git clone https://github.com/ramonmscloud/mercadona.git
   cd mercadona
   ```

2. Instala dependencias:

   ```bash
   npm install
   ```

3. Inicia el servidor:

   ```bash
   node server.js
   ```

4. Abre tu navegador en `http://localhost:8000`

### Uso

1. La aplicación carga automáticamente el catálogo de productos
2. Selecciona los productos que necesitas marcando los checkboxes
3. Ajusta las cantidades si es necesario
4. Usa "Ver Mi Lista" para ver solo los seleccionados
5. Exporta tu lista a TXT para llevar al supermercado
6. Importa listas previas desde archivos TXT

## 📁 Estructura del Proyecto

```
mercadona/
├── index.html          # Interfaz principal
├── server.js           # Servidor backend
├── js/
│   └── script.js       # Lógica de la aplicación
├── css/
│   ├── styles.css      # Estilos principales
│   └── background.css  # Estilos de fondo
├── images/             # Imágenes (si las hay)
├── libs/
│   └── xlsx.full.min.js # Librería para archivos Excel/CSV
├── compra mercadona.csv # Catálogo de productos
└── package.json        # Dependencias
```

## 📊 Datos

El archivo `compra mercadona.csv` contiene aproximadamente 227 productos distribuidos en pasillos como:

- Limpieza
- Pan y Dulces
- Droguería
- Y otros...

Formato: `Pasillo;Artículo;`

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Añade nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🔗 Enlaces

- **Repositorio**: [https://github.com/ramonmscloud/mercadona](https://github.com/ramonmscloud/mercadona)
- **Issues**: [Reportar problemas](https://github.com/ramonmscloud/mercadona/issues)

---

*Desarrollado para facilitar las compras en Mercadona con una interfaz intuitiva y organizada.*
