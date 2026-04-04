/**
 * export.js — Generadores de código C para GBDK-2020
 * Centraliza toda la lógica de exportación/importación de tiles y mapas.
 */

const GB_COLORS = ["#E0F8D0", "#88C070", "#346856", "#081820"];

/** Convierte un byte a hex: 0xFF */
function toHex(b) {
  return "0x" + b.toString(16).padStart(2, "0").toUpperCase();
}

/** Convierte un byte a binario: 0b00110011 */
function toBin(b) {
  return "0b" + b.toString(2).padStart(8, "0");
}

/**
 * Convierte una cuadrícula de colores (0-3) en los bytes GBDK de un tile 8x8.
 * El formato GameBoy usa 2 bits por pixel repartidos en 2 planos (low/high).
 * @param {number[][]} grid8x8 — grid[y][x] = valor 0-3
 * @returns {{ low: number, high: number }[]} — array de 8 pares de bytes (una entrada por fila)
 */
function gridToGBBytes(grid8x8) {
  const rows = [];
  for (let y = 0; y < 8; y++) {
    let low = 0, high = 0;
    for (let x = 0; x < 8; x++) {
      const val = grid8x8[y][x];
      const bit = 7 - x;
      if (val & 1) low  |= (1 << bit);
      if (val & 2) high |= (1 << bit);
    }
    rows.push({ low, high });
  }
  return rows;
}

/**
 * Convierte bytes GBDK (pares low/high) de vuelta a una cuadrícula.
 * @param {{ low: number, high: number }[]} rows
 * @returns {number[][]} grid[y][x]
 */
function gbBytesToGrid(rows) {
  const grid = [];
  for (let y = 0; y < 8; y++) {
    const row = [];
    const { low, high } = rows[y];
    for (let x = 0; x < 8; x++) {
      const bit    = 7 - x;
      const lowBit  = (low  >> bit) & 1;
      const highBit = (high >> bit) & 1;
      row.push((highBit << 1) | lowBit);
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Genera el contenido de un array C para un sprite (uno o varios tiles 8x8).
 * @param {string} name — nombre de la variable
 * @param {number[][]} fullGrid — grid completo (puede ser 8x8, 8x16, 16x8, 16x16)
 * @param {number} gridW — ancho en pixels
 * @param {number} gridH — alto en pixels
 * @param {"hex"|"binary"} format
 * @returns {string} código C
 */
function exportSprite(name, fullGrid, gridW, gridH, format) {
  // Divide en bloques 8x8 en orden: izq→der, arriba→abajo
  const tilesX = gridW / 8;
  const tilesY = gridH / 8;
  const blocks = [];

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      // Extraer sub-cuadrícula 8x8
      const sub = [];
      for (let y = 0; y < 8; y++) {
        const row = [];
        for (let x = 0; x < 8; x++) {
          row.push(fullGrid[ty * 8 + y][tx * 8 + x]);
        }
        sub.push(row);
      }
      blocks.push(sub);
    }
  }

  const totalTiles = tilesX * tilesY;
  const lines = [];

  if (totalTiles === 1) {
    // Nombre simple: custom_sprite[]
    lines.push(`unsigned char ${name}[] = {`);
    const bytes = gridToGBBytes(blocks[0]);
    if (format === "hex") {
      const vals = bytes.flatMap(b => [toHex(b.low), toHex(b.high)]);
      lines.push(`  ${vals.slice(0, 8).join(", ")},`);
      lines.push(`  ${vals.slice(8, 16).join(", ")}`);
    } else {
      bytes.forEach(b => lines.push(`  ${toBin(b.low)}, ${toBin(b.high)},`));
    }
    lines.push(`};`);
  } else {
    // Múltiples tiles: custom_sprite_0[], _1[], etc.
    const suffixes = totalTiles === 2
      ? (tilesX === 1 ? ["_top", "_bottom"] : ["_left", "_right"])
      : ["_tl", "_tr", "_bl", "_br"];

    blocks.forEach((sub, i) => {
      const tileName = `${name}${suffixes[i] || "_" + i}`;
      lines.push(`unsigned char ${tileName}[] = {`);
      const bytes = gridToGBBytes(sub);
      if (format === "hex") {
        const vals = bytes.flatMap(b => [toHex(b.low), toHex(b.high)]);
        lines.push(`  ${vals.slice(0, 8).join(", ")},`);
        lines.push(`  ${vals.slice(8, 16).join(", ")}`);
      } else {
        bytes.forEach(b => lines.push(`  ${toBin(b.low)}, ${toBin(b.high)},`));
      }
      lines.push(`};`);
      if (i < blocks.length - 1) lines.push("");
    });
  }

  return lines.join("\n");
}

/**
 * Importa código C de un sprite (hex o binario) y lo convierte en una grid.
 * @param {string} text — código C pegado
 * @param {"hex"|"binary"} format
 * @param {number} gridW
 * @param {number} gridH
 * @returns {{ name: string, grid: number[][] } | null}
 */
function importSprite(text, format, gridW, gridH) {
  const nameMatch = text.match(/unsigned char\s+([a-zA-Z0-9_]+)(?:_(?:top|bottom|left|right|tl|tr|bl|br|0|1|2|3))?\s*\[\]/);
  const name = nameMatch ? nameMatch[1].replace(/_(?:top|bottom|left|right|tl|tr|bl|br)$/, "") : "custom_sprite";

  let allRows = [];
  if (format === "hex") {
    const matches = [...text.matchAll(/0x([0-9a-fA-F]{2})\s*,\s*0x([0-9a-fA-F]{2})/g)];
    allRows = matches.map(m => ({
      low:  parseInt(m[1], 16),
      high: parseInt(m[2], 16)
    }));
  } else {
    const matches = [...text.matchAll(/0b([01]{8})\s*,\s*0b([01]{8})/g)];
    allRows = matches.map(m => ({
      low:  parseInt(m[1], 2),
      high: parseInt(m[2], 2)
    }));
  }

  const tilesX = gridW / 8;
  const tilesY = gridH / 8;
  const totalTiles = tilesX * tilesY;
  const neededRows = totalTiles * 8;

  if (allRows.length < neededRows) return null;

  // Reconstruir la grid completa
  const fullGrid = Array.from({ length: gridH }, () => Array(gridW).fill(0));
  let rowIdx = 0;

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const tileRows = allRows.slice(rowIdx, rowIdx + 8);
      const sub = gbBytesToGrid(tileRows);
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          fullGrid[ty * 8 + y][tx * 8 + x] = sub[y][x];
        }
      }
      rowIdx += 8;
    }
  }

  return { name, grid: fullGrid };
}

/**
 * Genera el contenido completo del archivo tiles.h.
 * @param {{ name: string, slotId: number, grid: number[][] }[]} tiles
 * @returns {string}
 */
function generateTilesH(tiles) {
  const lines = [
    "#ifndef TILES_H",
    "#define TILES_H",
    ""
  ];

  tiles.forEach(tile => {
    lines.push(`// Slot ${tile.slotId}: ${tile.name}`);
    lines.push(`const unsigned char ${tile.name}[] = {`);
    const bytes = gridToGBBytes(tile.grid);
    const vals = bytes.flatMap(b => [toHex(b.low), toHex(b.high)]);
    lines.push(`    ${vals.slice(0, 8).join(", ")},`);
    lines.push(`    ${vals.slice(8, 16).join(", ")}`);
    lines.push(`};`);
    lines.push("");
  });

  lines.push("#endif");
  lines.push("");
  return lines.join("\n");
}

/**
 * Genera el bloque de código para pegar en main.c (set_bkg_data + level_map).
 * @param {{ name: string, slotId: number }[]} tiles
 * @param {number[]} map — array plano de 32×18 = 576 slots
 * @param {string} mapName — nombre de la variable del mapa
 * @returns {string}
 */
function generateMainC(tiles, map, mapName) {
  const lines = [];

  // set_bkg_data calls
  lines.push("// Cargar tiles en VRAM (pegar en void main() antes del loop)");
  tiles.forEach(tile => {
    lines.push(`set_bkg_data(${tile.slotId}, 1, ${tile.name});`);
  });

  lines.push("");
  lines.push(`// Array de mapa — ${mapName} (32x18 = 576 tiles)`);
  lines.push(`unsigned char ${mapName}[] = {`);

  // 18 filas de 32 columnas
  for (let row = 0; row < 18; row++) {
    const rowData = map.slice(row * 32, row * 32 + 32);
    const comma = row < 17 ? "," : "";
    lines.push(`    ${rowData.join(", ")}${comma}`);
  }

  lines.push(`};`);
  lines.push("");
  lines.push(`// Activar mapa en pantalla (pegar en main() donde corresponda)`);
  lines.push(`set_bkg_tiles(0, 0, 32, 18, ${mapName});`);
  lines.push(`SHOW_BKG;`);

  return lines.join("\n");
}

/**
 * Parsea un archivo tiles.h y extrae los tiles definidos.
 * @param {string} text — contenido del archivo tiles.h
 * @returns {{ name: string, slotId: number, grid: number[][] }[]}
 */
function parseTilesH(text) {
  const result = [];
  // Buscar bloques: // Slot N: name o simplemente el array
  const blocks = [...text.matchAll(
    /(?:\/\/\s*Slot\s*(\d+)[^\n]*)?\s*(?:const\s+)?unsigned char\s+([a-zA-Z0-9_]+)\[\]\s*=\s*\{([^}]+)\}/g
  )];

  let autoSlot = 128;
  blocks.forEach(m => {
    const slotId = m[1] ? parseInt(m[1]) : autoSlot++;
    const name   = m[2];
    const body   = m[3];

    // Extraer todos los valores hex
    const hexVals = [...body.matchAll(/0x([0-9a-fA-F]{2})/gi)].map(h => parseInt(h[1], 16));
    if (hexVals.length < 16) return;

    // Reconstruir desde pares low/high
    const rows = [];
    for (let i = 0; i < 8; i++) {
      rows.push({ low: hexVals[i * 2], high: hexVals[i * 2 + 1] });
    }
    const grid = gbBytesToGrid(rows);
    result.push({ name, slotId, grid });
  });

  return result;
}

// Exportar para uso en otros módulos (sin módulos ES, acceso global)
window.GBExport = {
  toHex, toBin, gridToGBBytes, gbBytesToGrid,
  exportSprite, importSprite,
  generateTilesH, generateMainC, parseTilesH,
  GB_COLORS
};
