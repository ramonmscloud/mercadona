# CSV Editor para Lista Mercadona

## Contexto

El archivo `compra mercadona.csv` contiene una lista de la compra con columnas `Pasillo;Articulo;`. Tiene 319 lineas. El usuario necesita un programa Python autonomo (CLI) para gestionarlo.

## Estructura

```
cambiarCSVcompra/
├── main.py              # Menu interactivo CLI
├── csv_handler.py       # Leer, escribir, buscar, modificar el CSV
├── deepseek_client.py   # Cliente HTTP para DeepSeek v4 Flash
├── duplicate_finder.py  # Envia lista a DeepSeek y parsea duplicados
├── requirements.txt     # httpx
└── .env                 # DEEPSEEK_API_KEY
```

El programa lee/escribe el CSV en `../compra mercadona.csv`.

## Menu

1. Ver articulos (todos o filtrados por pasillo, con paginacion)
2. Anadir articulo (pasillo + nombre)
3. Borrar articulo (por numero de linea o busqueda)
4. Cambiar articulo (modificar pasillo y/o nombre)
5. Gestionar pasillos:
   - Listar pasillos existentes
   - Renombrar pasillo
   - Mover articulos entre pasillos
   - Fusionar dos pasillos
6. Buscar duplicados por parecido (DeepSeek API)
7. Salir

## Duplicados con DeepSeek

- Se envia la lista completa de articulos a `deepseek-chat` (model `deepseek-chat`)
- El prompt pide devolver grupos de duplicados en JSON estructurado
- Se muestran los grupos y se permite elegir cual conservar

## API Key

Variable `DEEPSEEK_API_KEY` en `.env`. El programa la carga con `python-dotenv`.
