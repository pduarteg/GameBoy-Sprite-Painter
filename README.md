# Game Boy 8×8 Sprite Painter

Una pequeña aplicación web que permite **dibujar sprites de 8×8 píxeles con la paleta de 4 tonos de la Game Boy** y exportarlos en el formato de **arrays C** que utilizan los proyectos de desarrollo para Game Boy.

## Características

- Lienzo de **8×8 celdas** (1 píxel = 1 celda).
- **4 colores** disponibles (los tonos típicos de Game Boy).
- Paleta seleccionable con clics o con las teclas `0`, `1`, `2`, `3`.
- **Click** pinta la celda con el color activo.
- **Shift + click** limpia la celda (color 0).
- Botón **Exportar** → genera un `unsigned char sprite[]` que puede tener dos formatos intercambiables en el menú desplegable:
  - **Binario (8x2):** Dos bytes por fila. Representado como `0bXXXXXXXX`, ideal para ver la figura directamente en el código.
  - **Hexadecimal (2x8):** Dos filas de 8 columnas. Representado como `0xXX`, ideal para compilar de forma más compacta con el estándar en C.
- Botón **Importar** → pega un array previamente exportado (en cualquiera de los dos formatos) y la cuadrícula se reconstruye.
- Botón **Clear** → limpia todo el lienzo.
- El array exportado es **100% compatible** con librerías Game Boy en C.

## Uso rápido

1. Abre el archivo `index.html` en tu navegador.
2. Dibuja tu sprite con los colores de la paleta.
3. Elige el formato deseado en el menú desplegable.
4. Pulsa **Exportar C code** → usa el botón **Copy code**.
5. Pega el código exportado en tu archivo C:

**Si usaste Binario (8 filas x 2 valores):**
```c
unsigned char real_sprite[] = {
  0b00111100, 0b00000000,
  0b01000010, 0b00000000,
  // ... (hasta completar 8 líneas de código)
};
```

**Si usaste Hexadecimal (2 filas x 8 valores):**
```c
unsigned char real_sprite[] = {
  0x3C, 0x00, 0x42, 0x00, 0x99, 0x00, 0xA5, 0x00,
  0x81, 0x00, 0xA5, 0x00, 0x99, 0x00, 0x42, 0x00
};
```
## Compatibilidad

El array exportado es código **C estándar**, por lo que puede usarse en cualquier proyecto que maneje gráficos de Game Boy.  
En particular, está diseñado para integrarse fácilmente en proyectos con **[GBDK-2020](https://github.com/gbdk-2020/gbdk-2020)**, la librería de desarrollo más usada actualmente para crear homebrew de Game Boy.
