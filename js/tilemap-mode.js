/**
 * tilemap-mode.js — Lógica del modo Tile Map Editor
 * Gestiona:
 *   - La paleta de tiles (registro de tiles con nombre, slot, grid)
 *   - El mini editor 8x8 para crear/editar tiles
 *   - El lienzo de mapa 32x18 (canvas)
 *   - La exportación dual (tiles.h + main.c)
 *   - La importación de tiles.h
 */

(function () {

  // ====================================================
  // ESTADO
  // ====================================================
  const MAP_COLS = 32;
  const MAP_ROWS = 18;
  const BASE_SLOT = 128;

  /** @type {{ name: string, slotId: number, grid: number[][] }[]} */
  let tileRegistry = [];

  /** Índice del tile activo en tileRegistry (-1 = ninguno) */
  let activeTileIndex = -1;

  /** Mapa plano de 32×18, cada valor es un slotId o -1 (vacío) */
  let tileMap = Array(MAP_COLS * MAP_ROWS).fill(-1);

  /** Índice del tile siendo editado (-1 = nuevo) */
  let editingIndex = -1;

  // ====================================================
  // AUTOSAVE LOGIC
  // ====================================================
  function saveTilemapState() {
    const state = {
      tileRegistry,
      tileMap,
      mapName: document.getElementById("mapName").value
    };
    localStorage.setItem("gb_painter_tilemap_state", JSON.stringify(state));
  }

  function loadTilemapState() {
    const saved = localStorage.getItem("gb_painter_tilemap_state");
    if (!saved) return;
    try {
      const state = JSON.parse(saved);
      tileRegistry = state.tileRegistry || [];
      tileMap      = state.tileMap || Array(MAP_COLS * MAP_ROWS).fill(-1);
      document.getElementById("mapName").value = state.mapName || "level_map";
    } catch (e) {
      console.error("Error loading tilemap state", e);
    }
  }

  // ====================================================
  // MAP CANVAS
  // ====================================================
  const mapCanvas   = document.getElementById("mapCanvas");
  const mapCtx      = mapCanvas.getContext("2d");
  const CELL_W      = mapCanvas.width  / MAP_COLS; // 512/32 = 16px
  const CELL_H      = mapCanvas.height / MAP_ROWS; // 288/18 = 16px

  let showGrid      = true;
  let showCoord     = false;
  let isMapDrawing  = false;

  document.getElementById("showGridToggle").addEventListener("change", e => {
    showGrid = e.target.checked;
    renderMap();
  });

  document.getElementById("showCoordToggle").addEventListener("change", e => {
    showCoord = e.target.checked;
    renderMap();
  });

  /** Dibuja el mapa completo en el canvas */
  function renderMap() {
    mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);

    // Fondo
    mapCtx.fillStyle = GBExport.GB_COLORS[0];
    mapCtx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);

    // Tiles
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const slotId = tileMap[row * MAP_COLS + col];
        const tile = tileRegistry.find(t => t.slotId === slotId);
        if (tile) {
          drawTileOnCanvas(mapCtx, tile.grid, col * CELL_W, row * CELL_H, CELL_W, CELL_H);
        }
      }
    }

    // Grid overlay
    if (showGrid) {
      mapCtx.strokeStyle = "rgba(136,192,112,0.3)";
      mapCtx.lineWidth   = 0.5;
      for (let c = 0; c <= MAP_COLS; c++) {
        mapCtx.beginPath();
        mapCtx.moveTo(c * CELL_W, 0);
        mapCtx.lineTo(c * CELL_W, mapCanvas.height);
        mapCtx.stroke();
      }
      for (let r = 0; r <= MAP_ROWS; r++) {
        mapCtx.beginPath();
        mapCtx.moveTo(0, r * CELL_H);
        mapCtx.lineTo(mapCanvas.width, r * CELL_H);
        mapCtx.stroke();
      }
    }

    // Coordenadas
    if (showCoord) {
      mapCtx.font         = "10px monospace";
      mapCtx.textAlign    = "center";
      mapCtx.textBaseline = "middle";
      for (let row = 0; row < MAP_ROWS; row++) {
        for (let col = 0; col < MAP_COLS; col++) {
          const x = col * CELL_W + CELL_W / 2;
          const y = row * CELL_H + CELL_H / 2;
          // Sombra para contraste
          mapCtx.fillStyle = "rgba(8,24,32,0.7)";
          mapCtx.fillText(`${col},${row}`, x + 1, y + 1);
          // Texto
          mapCtx.fillStyle = "rgba(136,192,112,1)";
          mapCtx.fillText(`${col},${row}`, x, y);
        }
      }
    }
  }

  /** Dibuja un tile 8x8 en una celda del canvas del mapa */
  function drawTileOnCanvas(ctx, grid, dx, dy, cw, ch) {
    const px = cw / 8;
    const py = ch / 8;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = GBExport.GB_COLORS[grid[y][x]];
        ctx.fillRect(dx + x * px, dy + y * py, px, py);
      }
    }
  }

  /** Obtiene la celda [col, row] a partir de coordenadas del canvas */
  function getMapCell(e) {
    const rect = mapCanvas.getBoundingClientRect();
    const scaleX = mapCanvas.width  / rect.width;
    const scaleY = mapCanvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top)  * scaleY;
    return {
      col: Math.floor(cx / CELL_W),
      row: Math.floor(cy / CELL_H)
    };
  }

  function paintMapCell(e) {
    if (activeTileIndex < 0) return;
    const { col, row } = getMapCell(e);
    if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return;
    tileMap[row * MAP_COLS + col] = tileRegistry[activeTileIndex].slotId;
    renderMap();
    saveTilemapState();
  }

  mapCanvas.addEventListener("mousedown", e => {
    if (e.button === 0) {
      isMapDrawing = true;
      paintMapCell(e);
    } else if (e.button === 2) {
      // Clic derecho: borrar celda
      const { col, row } = getMapCell(e);
      if (col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS) {
        tileMap[row * MAP_COLS + col] = -1;
        renderMap();
        saveTilemapState();
      }
    }
  });

  mapCanvas.addEventListener("mousemove", e => {
    if (isMapDrawing) paintMapCell(e);
  });

  mapCanvas.addEventListener("contextmenu", e => e.preventDefault());
  window.addEventListener("mouseup", () => { isMapDrawing = false; });

  // Botón borrar mapa
  document.getElementById("clearMapBtn").addEventListener("click", () => {
    if (confirm("¿Borrar todo el mapa?")) {
      tileMap = Array(MAP_COLS * MAP_ROWS).fill(-1);
      renderMap();
      localStorage.removeItem("gb_painter_tilemap_state");
    }
  });

  // ====================================================
  // TILE PALETTE PANEL
  // ====================================================
  function nextSlotId() {
    if (tileRegistry.length === 0) return BASE_SLOT;
    return Math.max(...tileRegistry.map(t => t.slotId)) + 1;
  }

  function renderTilePalette() {
    const listEl  = document.getElementById("tilePaletteList");
    const emptyEl = document.getElementById("emptyPaletteMsg");

    listEl.innerHTML = "";

    if (tileRegistry.length === 0) {
      listEl.appendChild(emptyEl);
      emptyEl.style.display = "flex";
    }

    // Actualizar contador
    const countBadge = document.getElementById("tileCountBadge");
    if (countBadge) {
      countBadge.textContent = `${tileRegistry.length} / 128`;
      if (tileRegistry.length > 128) {
        countBadge.style.background = "var(--game-over)";
        countBadge.style.color = "#fff";
      } else {
        countBadge.style.background = "var(--border-normal)";
        countBadge.style.color = "var(--text-muted)";
      }
    }

    if (tileRegistry.length === 0) return;

    tileRegistry.forEach((tile, i) => {
      const item = document.createElement("div");
      item.className = "tile-palette-item" + (i === activeTileIndex ? " active" : "");
      item.dataset.index = i;

      // Miniatura del tile
      const img = document.createElement("img");
      img.src    = PixelEditor.gridToDataURL(tile.grid, 8, 8, 4);
      img.width  = 32;
      img.height = 32;
      img.className = "tile-swatch";

      const info = document.createElement("div");
      info.className = "tile-item-info";
      info.innerHTML = `
        <div class="tile-item-name">${tile.name}</div>
        <div class="tile-item-slot">Slot ${tile.slotId}</div>
      `;

      const actions = document.createElement("div");
      actions.className = "tile-item-actions";

      const editBtn = document.createElement("button");
      editBtn.textContent = "✏";
      editBtn.className   = "tile-item-btn";
      editBtn.title       = "Editar tile";
      editBtn.onclick = e => { e.stopPropagation(); openTileEditor(i); };

      const delBtn = document.createElement("button");
      delBtn.textContent = "🗑";
      delBtn.className   = "tile-item-btn delete";
      delBtn.title       = "Eliminar tile";
      delBtn.onclick = e => {
        e.stopPropagation();
        if (confirm(`¿Eliminar "${tile.name}" (slot ${tile.slotId})?`)) {
          tileRegistry.splice(i, 1);
          if (activeTileIndex >= tileRegistry.length) activeTileIndex = tileRegistry.length - 1;
          renderTilePalette();
          updateActiveBadge();
          renderMap();
          saveTilemapState();
        }
      };

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      item.appendChild(img);
      item.appendChild(info);
      item.appendChild(actions);

      // Seleccionar tile activo al hacer clic
      item.addEventListener("click", () => {
        activeTileIndex = i;
        renderTilePalette();
        updateActiveBadge();
      });

      listEl.appendChild(item);
    });
  }

  function updateActiveBadge() {
    const badge = document.getElementById("activeTileBadge");
    if (activeTileIndex >= 0 && activeTileIndex < tileRegistry.length) {
      const t = tileRegistry[activeTileIndex];
      badge.textContent = `✏ Pintando: ${t.name} (slot ${t.slotId})`;
      badge.style.borderColor = "var(--accent-bright)";
    } else {
      badge.textContent = "Sin tile seleccionado";
      badge.style.borderColor = "";
    }
  }

  // ====================================================
  // MINI TILE EDITOR (para crear/editar tiles)
  // ====================================================
  const miniEditorCard     = document.getElementById("miniEditorCard");
  const tileEditorBoardEl  = document.getElementById("tileEditorBoard");
  const tileEditorPreview  = document.getElementById("tileEditorPreview");
  const tileVarNameInput   = document.getElementById("tileVarName");
  const tileSlotBadge      = document.getElementById("tileSlotBadge");

  let tileEditor = null;

  /** Paleta de colores del mini editor */
  const tilePaletteEl = document.getElementById("tilePalette");
  GBExport.GB_COLORS.forEach((c, i) => {
    const sw = document.createElement("div");
    sw.className        = "swatch";
    sw.style.background = c;
    sw.textContent = i;
    if (i === 3) sw.classList.add("selected");
    sw.addEventListener("click", () => {
      if (tileEditor) tileEditor.setColor(i);
      document.querySelectorAll("#tilePalette .swatch").forEach(s => s.classList.remove("selected"));
      sw.classList.add("selected");
    });
    tilePaletteEl.appendChild(sw);
  });

  /** Teclas 0-3 para el mini editor */
  window.addEventListener("keydown", e => {
    if (document.getElementById("panel-tilemap").classList.contains("active") &&
        miniEditorCard.style.display !== "none" &&
        "0123".includes(e.key) && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      const i = parseInt(e.key);
      if (tileEditor) tileEditor.setColor(i);
      document.querySelectorAll("#tilePalette .swatch").forEach(s => s.classList.remove("selected"));
      tilePaletteEl.children[i].classList.add("selected");
    }
  });

  function openTileEditor(index = -1) {
    editingIndex = index;
    miniEditorCard.style.display = "block";

    // Crear/recrear el editor
    tileEditor = new PixelEditor(tileEditorBoardEl, [tileEditorPreview], 8, 8, 28);

    if (index >= 0) {
      // Editar tile existente
      const tile = tileRegistry[index];
      tileEditor.loadGrid(tile.grid);
      tileVarNameInput.value  = tile.name;
      tileSlotBadge.textContent = tile.slotId;
    } else {
      // Nuevo tile
      tileEditor.clear();
      tileVarNameInput.value    = "my_tile";
      tileSlotBadge.textContent = nextSlotId();
    }

    // Resetear selección de color del mini editor
    document.querySelectorAll("#tilePalette .swatch").forEach((s, i) => {
      s.classList.toggle("selected", i === 3);
    });
    tileEditor.setColor(3);

    miniEditorCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  document.getElementById("newTileBtn").addEventListener("click", () => openTileEditor(-1));

  document.getElementById("saveTileBtn").addEventListener("click", () => {
    const name = tileVarNameInput.value.trim() || "my_tile";

    if (editingIndex >= 0) {
      // Actualizar tile existente
      tileRegistry[editingIndex].grid = tileEditor.grid.map(r => [...r]);
      tileRegistry[editingIndex].name = name;
    } else {
      // Agregar nuevo
      tileRegistry.push({
        name,
        slotId: nextSlotId(),
        grid: tileEditor.grid.map(r => [...r])
      });
      activeTileIndex = tileRegistry.length - 1;
    }

    renderTilePalette();
    updateActiveBadge();
    renderMap();
    saveTilemapState();
    miniEditorCard.style.display = "none";
    editingIndex = -1;
  });

  document.getElementById("cancelTileBtn").addEventListener("click", () => {
    miniEditorCard.style.display = "none";
    editingIndex = -1;
  });

  document.getElementById("clearTileBtn").addEventListener("click", () => {
    if (tileEditor) tileEditor.clear();
  });

  // Validación del nombre del tile
  tileVarNameInput.addEventListener("input", function () {
    let val = this.value.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, "");
    while (val.length > 0 && /^[0-9]/.test(val)) val = val.substring(1);
    if (val.length > 20) val = val.substring(0, 20);
    this.value = val;
    saveTilemapState();
  });

  // ====================================================
  // EXPORTACIÓN DUAL
  // ====================================================
  document.getElementById("exportTilemapBtn").addEventListener("click", () => {
    if (tileRegistry.length === 0) {
      alert("No hay tiles en la paleta. Agrega al menos uno.");
      return;
    }

    const mapName = document.getElementById("mapName").value.trim() || "level_map";

    // Construir mapa final: reemplazar -1 con el primer slotId disponible (o 0)
    const defaultSlot = tileRegistry[0]?.slotId ?? BASE_SLOT;
    const finalMap = tileMap.map(s => s === -1 ? defaultSlot : s);

    const tilesHContent = GBExport.generateTilesH(tileRegistry);
    const mainCContent  = GBExport.generateMainC(tileRegistry, finalMap, mapName);

    document.getElementById("outTilesH").value = tilesHContent;
    document.getElementById("outMainC").value  = mainCContent;

    // Mostrar pestaña tiles.h
    switchOutputTab("outTilesH");
  });

  // Exportar mapa como PNG (Escala 1x)
  document.getElementById("exportImageMapBtn").addEventListener("click", () => {
    const mapName = document.getElementById("mapName").value.trim() || "level_map";
    
    // Crear un canvas temporal de tamaño 1x (256x144)
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = MAP_COLS * 8;
    tempCanvas.height = MAP_ROWS * 8;
    const tempCtx = tempCanvas.getContext("2d");

    // Rellenar fondo
    tempCtx.fillStyle = GBExport.GB_COLORS[0];
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Dibujar tiles
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const slotId = tileMap[row * MAP_COLS + col];
        const tile = tileRegistry.find(t => t.slotId === slotId);
        if (tile) {
          drawTileOnCanvas(tempCtx, tile.grid, col * 8, row * 8, 8, 8);
        }
      }
    }

    const link = document.createElement("a");
    link.download = mapName + ".png";
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
  });

  // ====================================================
  // OUTPUT TABS
  // ====================================================
  function switchOutputTab(targetId) {
    document.querySelectorAll(".out-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".out-panel").forEach(p => p.classList.remove("active"));
    document.querySelector(`.out-tab[data-target="${targetId}"]`).classList.add("active");
    document.getElementById(targetId).classList.add("active");
  }

  document.querySelectorAll(".out-tab").forEach(tab => {
    tab.addEventListener("click", () => switchOutputTab(tab.dataset.target));
  });

  // Copiar tiles.h
  document.getElementById("copyTilesBtn").addEventListener("click", () => {
    const text = document.getElementById("outTilesH").value;
    if (!text.trim()) { alert("Exporta primero."); return; }
    navigator.clipboard.writeText(text)
      .then(() => alert("✅ tiles.h copiado al portapapeles."))
      .catch(() => alert("❌ No se pudo copiar."));
  });

  // Copiar main.c
  document.getElementById("copyMainBtn").addEventListener("click", () => {
    const text = document.getElementById("outMainC").value;
    if (!text.trim()) { alert("Exporta primero."); return; }
    navigator.clipboard.writeText(text)
      .then(() => alert("✅ Código main.c copiado al portapapeles."))
      .catch(() => alert("❌ No se pudo copiar."));
  });

  // ====================================================
  // IMPORTAR MAPA COMPLETO (2 pasos)
  // ====================================================
  const importModal = document.getElementById("importTilesModal");

  /** Helpers de navegación entre pasos */
  function importGoToStep(step) {
    const p1 = document.getElementById("importStepPanel1");
    const p2 = document.getElementById("importStepPanel2");
    const i1 = document.getElementById("importStep1Indicator");
    const i2 = document.getElementById("importStep2Indicator");
    if (step === 1) {
      p1.style.display = "block";  p2.style.display = "none";
      i1.classList.add("active");  i2.classList.remove("active");
    } else {
      p1.style.display = "none";   p2.style.display = "block";
      i1.classList.remove("active"); i2.classList.add("active");
    }
  }

  function closeImportModal() {
    importModal.style.display = "none";
    importGoToStep(1);
    document.getElementById("importTilesText").value  = "";
    document.getElementById("importMainCText").value  = "";
  }

  /** Abrir modal */
  document.getElementById("importTilesBtn").addEventListener("click", () => {
    importGoToStep(1);
    importModal.style.display = "flex";
  });

  /** Cancelar (paso 1 y 2) */
  document.getElementById("cancelImportTiles").addEventListener("click",  closeImportModal);
  document.getElementById("cancelImportTiles2").addEventListener("click", closeImportModal);

  /** Siguiente → pasar al paso 2 */
  document.getElementById("importStep1Next").addEventListener("click", () => {
    const text = document.getElementById("importTilesText").value;
    if (!text.trim()) {
      alert("Pega el contenido de tiles.h antes de continuar.");
      return;
    }
    importGoToStep(2);
  });

  /** ← Atrás → volver al paso 1 */
  document.getElementById("importStep2Back").addEventListener("click", () => {
    importGoToStep(1);
  });

  /** ✔ Importar — procesar ambos pasos */
  document.getElementById("confirmImportTiles").addEventListener("click", () => {
    const tilesText = document.getElementById("importTilesText").value;
    const mainCText = document.getElementById("importMainCText").value;

    // ── Paso 1: Importar tiles.h ──────────────────────────────
    if (!tilesText.trim()) {
      alert("El campo de tiles.h está vacío.");
      importGoToStep(1);
      return;
    }

    const parsedTiles = GBExport.parseTilesH(tilesText);
    if (parsedTiles.length === 0) {
      alert("No se encontraron tiles válidos en el texto de tiles.h.");
      importGoToStep(1);
      return;
    }

    // Merge tiles: agregar los que no existen aún (por nombre)
    let addedTiles = 0;
    parsedTiles.forEach(t => {
      const exists = tileRegistry.find(r => r.name === t.name);
      if (!exists) { tileRegistry.push(t); addedTiles++; }
      else {
        // Actualizar slot si el tiles.h tiene una asignación explícita
        if (t.slotId !== undefined) exists.slotId = t.slotId;
      }
    });

    // ── Paso 2 (opcional): Importar main.c ───────────────────
    let mapMsg = "";
    if (mainCText.trim()) {
      const parsedMap = GBExport.parseMainC(mainCText);

      if (!parsedMap) {
        alert("No se pudo leer el bloque de main.c. Verifica que contenga el array del mapa.");
        return;
      }

      const { mapName, mapData, slotMap } = parsedMap;

      // Actualizar el nombre del mapa en el campo UI
      const mapNameInput = document.getElementById("mapName");
      if (mapNameInput) mapNameInput.value = mapName;

      // Los set_bkg_data del main.c pueden tener slots diferentes a los
      // guardados en tiles.h (p.ej. si el usuario los movió). Hacemos
      // una segunda pasada para asegurarnos de que los slots sean correctos.
      Object.entries(slotMap).forEach(([slotStr, tileName]) => {
        const slotId = parseInt(slotStr);
        const tile   = tileRegistry.find(r => r.name === tileName);
        if (tile && tile.slotId !== slotId) tile.slotId = slotId;
      });

      // Rellenar el tileMap con los valores del array
      const needed = MAP_COLS * MAP_ROWS;
      if (mapData.length >= needed) {
        tileMap = mapData.slice(0, needed);
        mapMsg = ` y mapa "${mapName}" (${needed} celdas) reconstruido`;
      } else if (mapData.length > 0) {
        // Array más corto de lo esperado: rellenar el resto con -1
        tileMap = [...mapData, ...Array(needed - mapData.length).fill(-1)];
        mapMsg = ` y mapa "${mapName}" reconstruido (datos parciales: ${mapData.length}/${needed})`;
      } else {
        mapMsg = " (el array del mapa estaba vacío)";
      }
    }

    // Si llega algún tile con slotId que no existe en el registro,
    // el mapa podría mostrar celdas "vacías" — está bien, es el comportamiento esperado.

    if (activeTileIndex >= tileRegistry.length) activeTileIndex = tileRegistry.length - 1;

    renderTilePalette();
    updateActiveBadge();
    renderMap();

    alert(`✅ ${addedTiles} tile(s) importados${mapMsg}.`);
    closeImportModal();
  });

  /** Cerrar modal al hacer clic fuera */
  importModal.addEventListener("click", e => {
    if (e.target === importModal) closeImportModal();
  });


  // ====================================================
  // MODE TAB SWITCHING (tabs del header)
  // ====================================================
  document.getElementById("tab-sprite").addEventListener("click", () => {
    document.getElementById("tab-sprite").classList.add("active");
    document.getElementById("tab-tilemap").classList.remove("active");
    document.getElementById("panel-sprite").classList.add("active");
    document.getElementById("panel-tilemap").classList.remove("active");
    document.getElementById("tab-sprite").setAttribute("aria-selected", "true");
    document.getElementById("tab-tilemap").setAttribute("aria-selected", "false");
  });

  document.getElementById("tab-tilemap").addEventListener("click", () => {
    document.getElementById("tab-tilemap").classList.add("active");
    document.getElementById("tab-sprite").classList.remove("active");
    document.getElementById("panel-tilemap").classList.add("active");
    document.getElementById("panel-sprite").classList.remove("active");
    document.getElementById("tab-tilemap").setAttribute("aria-selected", "true");
    document.getElementById("tab-sprite").setAttribute("aria-selected", "false");
    renderMap();
  });

  // Cargar estado
  loadTilemapState();

  // Renderizado inicial
  renderTilePalette();
  renderMap();

})();
