# Game Boy 8×8 Sprite Painter

Una pequeña aplicación web que permite **dibujar sprites de 8×8 píxeles con la paleta de 4 tonos de la Game Boy** y exportarlos en el formato de **arrays C** que utilizan los proyectos de desarrollo para Game Boy.

## Características

- Lienzo de **8×8 celdas** (1 píxel = 1 celda).
- **4 colores** disponibles (los tonos típicos de Game Boy).
- Paleta seleccionable con clics o con las teclas `0`, `1`, `2`, `3`.
- **Click** pinta la celda con el color activo.
- **Shift + click** limpia la celda (color 0).
- Botón **Exportar** → genera un `unsigned char sprite[]` con:
  - Dos bytes por fila (byte bajo y byte alto).
  - Cada byte representado como literal binario `0bXXXXXXXX`.
  - Comentarios indicando la fila correspondiente.
- Botón **Importar** → pega un array previamente exportado y la cuadrícula se reconstruye.
- Botón **Clear** → limpia todo el lienzo.
- El array exportado es **100% compatible** con el formato usado en librerías de desarrollo para Game Boy.

## Uso rápido

1. Abre el archivo `index.html` en tu navegador.
2. Dibuja tu sprite con los colores de la paleta.
3. Pulsa **Exportar** → copia el array generado.
4. Pega el código en tu archivo C, por ejemplo:

```c
unsigned char real_sprite[] = {
  // fila 1: byte bajo, byte alto
  0b00111100, 0b00000000,
  // fila 2: byte bajo, byte alto
  0b01000010, 0b00000000,
  // ...
};
```
## Compatibilidad

El array exportado es código **C estándar**, por lo que puede usarse en cualquier proyecto que maneje gráficos de Game Boy.  
En particular, está diseñado para integrarse fácilmente en proyectos con **[GBDK-2020](https://github.com/gbdk-2020/gbdk-2020)**, la librería de desarrollo más usada actualmente para crear homebrew de Game Boy.
