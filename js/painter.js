/**
 * painter.js — Clase PixelEditor reutilizable
 * Maneja el editor de píxeles para cualquier tamaño de cuadrícula.
 * Soporta click, drag y teclado para selección de color.
 */

class PixelEditor {
  /**
   * @param {HTMLElement} container — div donde se renderiza el grid
   * @param {HTMLCanvasElement[]} previewCanvases — uno o más canvas de preview
   * @param {number} cols — ancho en pixels
   * @param {number} rows — alto en pixels
   * @param {number} cellSize — tamaño visual de cada celda en px
   */
  constructor(container, previewCanvases, cols = 8, rows = 8, cellSize = 36) {
    this.container     = container;
    this.previews      = Array.isArray(previewCanvases) ? previewCanvases : [previewCanvases];
    this.cols          = cols;
    this.rows          = rows;
    this.cellSize      = cellSize;
    this.currentColor  = 3;
    this.isDrawing     = false;
    this.mode          = "paint"; // "paint" o "move"
    this.colors        = GBExport.GB_COLORS;

    // Grid de valores 0-3
    this.grid = Array.from({ length: rows }, () => Array(cols).fill(0));

    this._buildGrid();
    this._bindEvents();
    this.render();
  }

  setMode(mode) {
    this.mode = mode;
    this.container.style.cursor = mode === "move" ? "move" : "crosshair";
  }

  /** Mueve el contenido del grid */
  shift(dx, dy) {
    const newGrid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    let pixelsLost = false;

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const val = this.grid[y][x];
        if (val === 0) continue;

        const nx = x + dx;
        const ny = y + dy;

        if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
          newGrid[ny][nx] = val;
        } else {
          pixelsLost = true;
        }
      }
    }
    return { newGrid, pixelsLost };
  }

  /** Mueve el contenido desde un grid base (útil para arrastrar) */
  shiftFrom(baseGrid, dx, dy) {
    const newGrid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    let pixelsLost = false;

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const val = baseGrid[y][x];
        if (val === 0) continue;

        const nx = x + dx;
        const ny = y + dy;

        if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
          newGrid[ny][nx] = val;
        } else {
          pixelsLost = true;
        }
      }
    }
    return { newGrid, pixelsLost };
  }

  /** Reconstruye todo el DOM del grid */
  _buildGrid() {
    this.container.innerHTML = "";
    this.container.style.gridTemplateColumns = `repeat(${this.cols}, ${this.cellSize}px)`;
    this.container.style.gridTemplateRows    = `repeat(${this.rows}, ${this.cellSize}px)`;

    this.cells = [];
    for (let y = 0; y < this.rows; y++) {
      const rowCells = [];
      for (let x = 0; x < this.cols; x++) {
        const cell = document.createElement("div");
        cell.className       = "cell";
        cell.style.width     = this.cellSize + "px";
        cell.style.height    = this.cellSize + "px";
        cell.dataset.x       = x;
        cell.dataset.y       = y;
        this.container.appendChild(cell);
        rowCells.push(cell);
      }
      this.cells.push(rowCells);
    }
  }

  _bindEvents() {
    this.container.addEventListener("mousedown", e => {
      if (e.button !== 0 && e.button !== 2) return;
      e.preventDefault();
      this.isDrawing = true;
      this._paint(e);
    });

    this.container.addEventListener("mousemove", e => {
      if (!this.isDrawing) return;
      this._paint(e);
    });

    this.container.addEventListener("contextmenu", e => e.preventDefault());

    window.addEventListener("mouseup", () => { this.isDrawing = false; });
  }

  _paint(e) {
    if (this.mode !== "paint") return;
    const cell = e.target.closest(".cell");
    if (!cell || !this.container.contains(cell)) return;
    const x = parseInt(cell.dataset.x);
    const y = parseInt(cell.dataset.y);
    if (isNaN(x) || isNaN(y)) return;

    // Botón derecho o Shift → borrar (color 0)
    const color = (e.button === 2 || e.shiftKey) ? 0 : this.currentColor;
    this.grid[y][x] = color;
    this.render();
  }

  /** Renderiza el grid y los previews */
  render() {
    // Grid
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.cells[y][x].style.background = this.colors[this.grid[y][x]];
      }
    }

    // Previews (se escalan automáticamente según el canvas width)
    this.previews.forEach(canvas => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scaleX = canvas.width  / this.cols;
      const scaleY = canvas.height / this.rows;
      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols; x++) {
          ctx.fillStyle = this.colors[this.grid[y][x]];
          ctx.fillRect(x * scaleX, y * scaleY, scaleX, scaleY);
        }
      }
    });

    if (this.onChange) this.onChange(this.grid);
  }

  /** Limpia el grid */
  clear() {
    this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    this.render();
  }

  /** Voltea el grid horizontalmente */
  flipHorizontal() {
    this.grid = this.grid.map(row => [...row].reverse());
    this.render();
  }

  /** Voltea el grid verticalmente */
  flipVertical() {
    this.grid = [...this.grid].reverse();
    this.render();
  }

  /** Cambia el tamaño del grid (reinicia el contenido) */
  resize(cols, rows, cellSize) {
    this.cols     = cols;
    this.rows     = rows;
    this.cellSize = cellSize || this.cellSize;
    this.grid     = Array.from({ length: rows }, () => Array(cols).fill(0));
    this._buildGrid();
    this.render();
  }

  /** Carga una grid externa */
  loadGrid(grid) {
    this.grid = grid.map(row => [...row]);
    this.render();
  }

  /** Selecciona un color activo */
  setColor(c) { this.currentColor = c; }

  /** Genera una miniatura del tile como DataURL (para mostrar en la paleta) */
  toDataURL(scale = 4) {
    const offscreen = document.createElement("canvas");
    offscreen.width  = this.cols  * scale;
    offscreen.height = this.rows  * scale;
    const ctx = offscreen.getContext("2d");
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        ctx.fillStyle = this.colors[this.grid[y][x]];
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    return offscreen.toDataURL();
  }

  /** Genera una miniatura desde un grid cualquiera (estático) */
  static gridToDataURL(grid, cols, rows, scale = 4) {
    const offscreen = document.createElement("canvas");
    offscreen.width  = cols  * scale;
    offscreen.height = rows  * scale;
    const ctx = offscreen.getContext("2d");
    GBExport.GB_COLORS.forEach(() => {}); // assure colors loaded
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        ctx.fillStyle = GBExport.GB_COLORS[grid[y][x]];
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    return offscreen.toDataURL();
  }
}

window.PixelEditor = PixelEditor;
