# 🎮 GameBoy Sprite Painter — Guía de uso completa

> Herramienta web para diseñar sprites y tilemaps para juegos de Game Boy.  
> Compatible con **GBDK-2020** · Exporta código **C estándar** · Sin dependencias · Abre directo en el navegador.

---

## Tabla de Contenidos

1. [Inicio rápido](#inicio-rápido)
2. [Modo Sprites](#modo-sprites)
   - [Tamaños disponibles](#tamaños-disponibles)
   - [Pintar en el canvas](#pintar-en-el-canvas)
   - [Paleta de colores](#paleta-de-colores-gameboy)
   - [Exportar sprites](#exportar-sprites)
   - [Importar sprites](#importar-sprites)
3. [Modo Tile Map](#modo-tile-map)
   - [Flujo de trabajo recomendado](#flujo-de-trabajo-recomendado)
   - [Crear tiles](#crear-tiles)
   - [Paleta de tiles](#paleta-de-tiles)
   - [Pintar el mapa 32×18](#pintar-el-mapa-3218)
   - [Exportar el mapa](#exportar-el-mapa)
   - [Importar tiles.h existente](#importar-tilesh-existente)
4. [Formato de exportación](#formato-de-exportación)
   - [tiles.h](#tilesh)
   - [main.c — set_bkg_data y level_map](#mainc)
5. [Integración con GBDK-2020](#integración-con-gbdk-2020)
6. [Slots de VRAM y límites](#slots-de-vram-y-límites)
7. [Referencia rápida de atajos](#referencia-rápida-de-atajos)

---

## Inicio rápido

1. Abre `index.html` directamente en tu navegador (no necesita servidor).
2. Elige el modo de trabajo: **Sprites** o **Tile Map** (tabs en la cabecera).
3. Dibuja, exporta, y pega el código en tu proyecto GBDK.

---

## Modo Sprites

### Tamaños disponibles

La Game Boy mueve sprites en hardware con unidades de **8×8 píxeles**. Internamente, todos los tamaños se dividen en bloques de 8×8 al exportar.

| Botón  | Dimensión | Tiles generados | Uso típico |
|--------|-----------|-----------------|------------|
| `8×8`  | 8×8 px    | 1 array         | Bala, ítem pequeño |
| `8×16` | 8×16 px   | 2 arrays (`_top`, `_bottom`) | Personaje vertical |
| `16×8` | 16×8 px   | 2 arrays (`_left`, `_right`) | Vehículo horizontal |
| `16×16`| 16×16 px  | 4 arrays (`_tl`, `_tr`, `_bl`, `_br`) | Jefe, enemigo grande |

> **¿Por qué varios arrays?** GBDK trata cada bloque de 8×8 como un sprite independiente. Para un personaje de 16×16, usas 4 sprites de hardware posicionados juntos.

### Pintar en el canvas

| Acción | Resultado |
|--------|-----------|
| **Clic izquierdo** | Pinta con el color activo |
| **Clic + arrastrar** | Pinta múltiples celdas en un trazo |
| **Clic derecho** | Borra la celda (color 0 — blanco GB) |
| **Shift + clic** | Borra la celda (alternativa) |

### Paleta de colores GameBoy

La Game Boy original tiene exactamente **4 niveles de gris**, aquí representados con los colores icónicos de su pantalla LCD:

| ID | Color hex | Nombre informal | Valor GBDK |
|----|-----------|-----------------|------------|
| `0` | `#E0F8D0` | Blanco GB (fondo) | 00 en ambos planos |
| `1` | `#88C070` | Verde claro | bit low = 1 |
| `2` | `#346856` | Verde oscuro | bit high = 1 |
| `3` | `#081820` | Negro GB | ambos bits = 1 |

Selecciona el color activo con:
- **Clic** en la paleta de swatches.
- **Teclas `0`, `1`, `2`, `3`** del teclado (solo cuando el foco no está en un input de texto).

### Exportar sprites

1. Escribe el nombre de la variable en **"Nombre del array"** (máx. 20 chars, sin comenzar con número).
2. Elige el formato:
   - **Hexadecimal** → más compacto, estándar en proyectos GBDK.
   - **Binario** → más legible, puedes ver la figura en el código.
3. Pulsa **⬇ Exportar código C**.
4. El código aparece en el panel derecho. Usa **📋 Copiar** para llevarlo al portapapeles.

**Ejemplo — sprite 8×8 (hexadecimal):**
```c
unsigned char moto_sprite[] = {
  0x00, 0x00, 0x18, 0x18, 0x3C, 0x3C, 0x7E, 0x7E,
  0x7E, 0x7E, 0x3C, 0x3C, 0x18, 0x18, 0x00, 0x00
};
```

**Ejemplo — sprite 16×16 (hexadecimal):**
```c
unsigned char player_tl[] = {
  0x00, 0x00, 0x0F, 0x0F, 0x1F, 0x1F, 0x3F, 0x3F,
  0x3F, 0x3F, 0x1F, 0x1F, 0x0F, 0x0F, 0x00, 0x00
};

unsigned char player_tr[] = { ... };
unsigned char player_bl[] = { ... };
unsigned char player_br[] = { ... };
```

### Importar sprites

1. Pega el código C en el área de texto del panel derecho.
2. Asegúrate de que el **formato seleccionado** (hex/binario) coincida con el código pegado.
3. Pulsa **⬆ Importar código C**.
4. La cuadrícula se reconstruye con los píxeles del sprite importado.

> El importador también detecta automáticamente el nombre de la variable y lo coloca en el campo de nombre.

---

## Modo Tile Map

El modo Tile Map está diseñado para crear el **fondo completo de una pantalla de Game Boy** (32×18 tiles = 256×144 píxeles), que es exactamente la resolución del hardware.

### Flujo de trabajo recomendado

```
1. Crear tiles individuales (mini editor 8×8)
        ↓
2. Cada tile se agrega a la Paleta de Tiles (se le asigna un slot)
        ↓
3. Seleccionar el tile activo y pintarlo sobre el mapa 32×18
        ↓
4. Exportar → obtienes tiles.h y el código para main.c
        ↓
5. Pegar tiles.h en tu carpeta /include
   Pegar el bloque de main.c en void main()
```

### Crear tiles

1. Pulsa **+ Nuevo Tile** en el panel izquierdo.
2. Se abre el **Mini Editor de Tile** en la zona central.
3. Dibuja tu tile de 8×8 (mismas reglas que el modo Sprite).
4. Escribe el nombre de la variable C en **"Nombre variable"** (ej: `sky_tile`).
5. El **Slot ID** se asigna automáticamente (empieza en 128).
6. Pulsa **✔ Guardar Tile** → el tile aparece en la paleta lateral.

Para **editar** un tile ya guardado, haz clic en el ícono ✏ de su fila en la paleta.

### Paleta de tiles

La paleta lateral muestra todos los tiles creados con:
- **Miniatura** del tile (vista previa pixel art).
- **Nombre** de la variable C.
- **Slot ID** que ocupa en VRAM (desde 128 en adelante).
- Botón **✏** para editar.
- Botón **🗑** para eliminar (pide confirmación).

El tile resaltado en verde es el **tile activo** — el que se pintará en el mapa al hacer clic.

### Pintar el mapa 32×18

1. Selecciona un tile en la paleta (clic en su fila).
2. Haz **clic** o **clic + arrastrar** sobre el mapa para pintar.
3. **Clic derecho** sobre una celda la borra (la deja como la primera celda de la paleta al exportar).
4. Usa los toggles para activar/desactivar la **cuadrícula** y las **coordenadas**.

El lienzo muestra en tiempo real los tiles con sus colores exactos de la paleta GameBoy.

### Exportar el mapa

1. Escribe el nombre del mapa en **"Nombre del mapa"** (por defecto `level_map`).
2. Pulsa **⬇ Exportar Todo**.
3. Aparecen dos pestañas de salida:

#### Pestaña `tiles.h`
Contiene todos los arrays de tiles definidos. **Copia esto a tu archivo `include/tiles.h`.**

```c
#ifndef TILES_H
#define TILES_H

// Slot 128: sky_tile
const unsigned char sky_tile[] = {
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};

// Slot 129: road_tile
const unsigned char road_tile[] = {
    0x00, 0x00, 0x10, 0x00, 0x00, 0x01, 0x04, 0x00,
    0x00, 0x10, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00
};

#endif
```

#### Pestaña `main.c`
Contiene el código que va **dentro de `void main()`** de tu proyecto. Incluye:
- Las llamadas `set_bkg_data()` para cargar tiles en VRAM.
- El array `level_map[]` con el mapa completo.
- La llamada `set_bkg_tiles()` para activarlo.

```c
// Cargar tiles en VRAM (pegar en void main() antes del loop)
set_bkg_data(128, 1, sky_tile);
set_bkg_data(129, 1, road_tile);
set_bkg_data(130, 1, line_tile);

// Array de mapa — level_map (32x18 = 576 tiles)
unsigned char level_map[] = {
    128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128,
    129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129, 129,
    // ...18 filas en total
};

// Activar mapa en pantalla
set_bkg_tiles(0, 0, 32, 18, level_map);
SHOW_BKG;
```

### Importar tiles.h existente

Si ya tienes un `tiles.h` con tiles definidos y quieres reutilizarlos:

1. Pulsa **⬆ Importar tiles.h** en el panel de paleta.
2. Pega el contenido completo de tu archivo.
3. Pulsa **✔ Importar**.
4. Los tiles se agregan a la paleta (los que ya existan por nombre se omiten).

> Los slots se leen del comentario `// Slot NNN:` si existe. Si no hay comentario, se asignan en orden desde 128.

---

## Formato de exportación

### El sistema de 2 planos (bit planes) de Game Boy

Cada píxel de Game Boy usa **2 bits** para codificar uno de 4 colores. Estos bits se distribuyen en dos bytes por fila (2 planos):

```
Fila del sprite:  [ p1 p0 ] en cada pixel
                       │  └─── Byte LOW  (bit 0 de cada color)
                       └─────  Byte HIGH (bit 1 de cada color)
```

**Ejemplo — fila con colores `3,2,1,0,3,2,1,0`:**
```
Pixel:   3    2    1    0    3    2    1    0
Color:  11   10   01   00   11   10   01   00
         │    │    │    │    │    │    │    │
LOW:     1    0    1    0    1    0    1    0   = 0b10101010 = 0xAA
HIGH:    1    1    0    0    1    1    0    0   = 0b11001100 = 0xCC
```

El array resultante para esa fila sería: `0xAA, 0xCC`

La herramienta hace este cálculo automáticamente — tú solo pinta.

---

## Integración con GBDK-2020

### Estructura de un proyecto típico

```
mi_juego/
├── include/
│   └── tiles.h          ← generado por la herramienta
├── src/
│   └── main.c           ← pega aquí el bloque de main.c
└── Makefile
```

### Paso a paso completo

```c
// 1. En main.c, incluir el header
#include "tiles.h"

// 2. Declarar el mapa (o pégalo directo desde la herramienta)
unsigned char level_map[] = {
    128, 128, 129, 130, ...
};

// 3. En void main(), cargar los tiles ANTES del loop
void main(void) {
    // Cargar tiles en VRAM (slot 128 en adelante → Background)
    set_bkg_data(128, 1, sky_tile);
    set_bkg_data(129, 1, road_tile);
    set_bkg_data(130, 1, line_tile);

    // Aplicar el mapa al fondo
    set_bkg_tiles(0, 0, 32, 18, level_map);
    SHOW_BKG;

    while (1) {
        // ...lógica del juego
        wait_vbl_done();
    }
}
```

---

## Slots de VRAM y límites

La VRAM de Game Boy tiene espacio para **256 tiles** en el banco de Background (modo estándar).

| Rango | Uso convencional |
|-------|-----------------|
| `0 – 127`   | Sprites de objetos (`set_sprite_data`) |
| `128 – 255` | Tiles de fondo (`set_bkg_data`) ← la herramienta empieza aquí |

> **Límite práctico**: Puedes tener hasta **128 tiles únicos de fondo** (slots 128–255).  
> Si tu mapa necesita más variedad visual, tendrás que usar tiles similares con pequeñas variaciones o técnicas de scroll.

---

## Referencia rápida de atajos

| Atajo | Acción |
|-------|--------|
| `0` `1` `2` `3` | Seleccionar color de la paleta |
| **Clic izquierdo** | Pintar celda |
| **Clic + arrastrar** | Pintar en trazo continuo |
| **Clic derecho** | Borrar celda |
| **Shift + clic** | Borrar celda (alternativa) |

---

## Archivos del proyecto

```
GameBoy-Sprite-Painter/
├── index.html              ← Punto de entrada (abrir en navegador)
├── styles/
│   └── style.css           ← Estilos de la interfaz
├── js/
│   ├── export.js           ← Lógica de generación/parseo de código C
│   ├── painter.js          ← Editor de píxeles reutilizable (clase PixelEditor)
│   ├── sprite-mode.js      ← Lógica del modo Sprite
│   └── tilemap-mode.js     ← Lógica del modo Tile Map
├── samples/
│   ├── hiragana.h          ← Ejemplo: caracteres hiragana en sprites 8×8
│   └── ...                 ← Otros ejemplos de referencia
└── docs/
    └── GUIDE.md            ← Esta guía
```

---

*© 2025 Percy Duarte Gálvez — GameBoy Sprite Painter · Compatible con GBDK-2020*
