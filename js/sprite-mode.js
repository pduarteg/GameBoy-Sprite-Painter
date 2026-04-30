/**
 * sprite-mode.js — Lógica del modo Sprite Editor
 * Gestiona el editor multi-tamaño (8x8, 8x16, 16x8, 16x16),
 * la paleta de colores, exportación e importación.
 */

(function () {
  // Tamaño actual del canvas
  let spriteW = 8, spriteH = 8;

  // Calcular tamaño de celda según el tamaño del sprite
  function getCellSize(w, h) {
    if (w === 16 || h === 16) return 24;
    return 36;
  }

  // Preview canvases
  const preview1 = document.getElementById("spritePreview");
  const preview2 = document.getElementById("spritePreview2x");
  const preview4 = document.getElementById("spritePreview4x");
  const globalCanvases = Array.from(document.querySelectorAll(".slot-preview-canvas"));

  // Ajustar tamaños de los previews según el sprite
  function resizePreviews(w, h) {
    preview1.width  = w;       preview1.height  = h;
    preview2.width  = w * 2;   preview2.height  = h * 2;
    preview4.width  = w * 4;   preview4.height  = h * 4;
    
    // El canvas global del slot actual también debe medir 4x
    if (globalCanvases[currentSlot]) {
      globalCanvases[currentSlot].width = w * 4;
      globalCanvases[currentSlot].height = h * 4;
    }
  }

  // Auxiliar para renderizar un grid estático en un canvas
  function renderStaticGrid(grid, canvas, w, h, scale) {
    const ctx = canvas.getContext("2d");
    canvas.width = w * scale;
    canvas.height = h * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        ctx.fillStyle = GBExport.GB_COLORS[grid[y][x]];
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }

  function updateAllGlobalPreviews() {
    const allSlots = JSON.parse(localStorage.getItem("gb_painter_slots") || "[]");
    globalCanvases.forEach((canvas, i) => {
      const state = allSlots[i];
      if (state && state.grid) {
        renderStaticGrid(state.grid, canvas, state.spriteW || 8, state.spriteH || 8, 4);
      } else {
        // Slot vacío
        canvas.width = 32; canvas.height = 32;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = GBExport.GB_COLORS[0];
        ctx.fillRect(0, 0, 32, 32);
      }
      canvas.classList.toggle("active", i === currentSlot);
    });
  }

  // Inicializar el editor de sprite
  let currentSlot = 0;
  const boardEl = document.getElementById("spriteBoard");
  resizePreviews(8, 8);
  const editor = new PixelEditor(boardEl, [preview1, preview2, preview4], 8, 8, 36);

  // === AUTOSAVE LOGIC ===
  function saveSpriteState() {
    // Intentar recuperar slots existentes o migrar el anterior
    let allSlots = JSON.parse(localStorage.getItem("gb_painter_slots") || "[]");
    
    // Si no hay slots pero sí el estado antiguo, migrarlo al slot 0
    const legacy = localStorage.getItem("gb_painter_sprite_state");
    if (allSlots.length === 0 && legacy) {
      allSlots[0] = JSON.parse(legacy);
    }

    const state = {
      spriteW,
      spriteH,
      name: nameInput.value,
      grid: editor.grid
    };
    
    allSlots[currentSlot] = state;
    localStorage.setItem("gb_painter_slots", JSON.stringify(allSlots));
    localStorage.setItem("gb_painter_current_slot", currentSlot);
  }

  function loadSlot(slotIndex) {
    currentSlot = slotIndex;
    let allSlots = JSON.parse(localStorage.getItem("gb_painter_slots") || "[]");
    
    // Migración inicial si es necesario
    const legacy = localStorage.getItem("gb_painter_sprite_state");
    if (allSlots.length === 0 && legacy) {
      allSlots[0] = JSON.parse(legacy);
    }

    const state = allSlots[currentSlot];

    // Actualizar UI de slots
    document.querySelectorAll(".slot-btn").forEach(b => {
      const active = parseInt(b.dataset.slot) === currentSlot;
      b.classList.toggle("active", active);
      b.setAttribute("aria-checked", active ? "true" : "false");
    });

    // Actualizar previews globales
    globalCanvases.forEach((c, i) => {
      c.classList.toggle("active", i === currentSlot);
    });

    if (!state) {
      // Slot nuevo/vacío
      spriteW = 8;
      spriteH = 8;
      nameInput.value = "sprite_slot_" + (currentSlot + 1);
      
      const cellSize = getCellSize(spriteW, spriteH);
      resizePreviews(spriteW, spriteH);
      editor.previews = [preview1, preview2, preview4, globalCanvases[currentSlot]];
      editor.resize(spriteW, spriteH, cellSize);
      editor.clear();

      // Actualizar UI de tamaño
      document.querySelectorAll(".size-btn").forEach(b => {
        const active = parseInt(b.dataset.w) === 8 && parseInt(b.dataset.h) === 8;
        b.classList.toggle("active", active);
        b.setAttribute("aria-checked", active ? "true" : "false");
      });

      saveSpriteState();
      return;
    }

    spriteW = state.spriteW || 8;
    spriteH = state.spriteH || 8;
    nameInput.value = state.name || "custom_sprite";
    
    // Actualizar UI del selector de tamaño
    document.querySelectorAll(".size-btn").forEach(b => {
      const active = parseInt(b.dataset.w) === spriteW && parseInt(b.dataset.h) === spriteH;
      b.classList.toggle("active", active);
      b.setAttribute("aria-checked", active ? "true" : "false");
    });

    const cellSize = getCellSize(spriteW, spriteH);
    resizePreviews(spriteW, spriteH);
    editor.previews = [preview1, preview2, preview4, globalCanvases[currentSlot]];
    editor.resize(spriteW, spriteH, cellSize);
    editor.loadGrid(state.grid);
  }

  function loadInitialState() {
    const savedSlot = localStorage.getItem("gb_painter_current_slot");
    const slotToLoad = savedSlot !== null ? parseInt(savedSlot) : 0;
    loadSlot(slotToLoad);
    updateAllGlobalPreviews();
  }

  editor.onChange = () => saveSpriteState();

  // === SLOT PICKER ===
  document.getElementById("slotPicker").addEventListener("click", e => {
    const btn = e.target.closest(".slot-btn");
    if (!btn) return;
    const slotIdx = parseInt(btn.dataset.slot);
    if (slotIdx === currentSlot) return;

    loadSlot(slotIdx);
  });

  // Permitir cambiar de slot haciendo click en la vista global
  globalCanvases.forEach(canvas => {
    canvas.onclick = () => {
      const slotIdx = parseInt(canvas.dataset.slot);
      if (slotIdx === currentSlot) return;
      loadSlot(slotIdx);
    };
  });
  const paletteEl = document.getElementById("spritePalette");
  GBExport.GB_COLORS.forEach((c, i) => {
    const sw = document.createElement("div");
    sw.className   = "swatch";
    sw.style.background = c;
    sw.textContent = i;
    if (i === 3) sw.classList.add("selected");
    sw.setAttribute("role", "radio");
    sw.setAttribute("aria-label", `Color ${i}`);
    sw.onclick = () => {
      editor.setColor(i);
      document.querySelectorAll("#spritePalette .swatch").forEach(s => s.classList.remove("selected"));
      sw.classList.add("selected");
    };
    paletteEl.appendChild(sw);
  });

  // Teclas 0-3
  window.addEventListener("keydown", e => {
    if (document.getElementById("panel-sprite").classList.contains("active") &&
        "0123".includes(e.key) && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      const i = parseInt(e.key);
      editor.setColor(i);
      document.querySelectorAll("#spritePalette .swatch").forEach(s => s.classList.remove("selected"));
      paletteEl.children[i].classList.add("selected");
    }
  });

  // === SELECTOR DE TAMAÑO ===
  document.getElementById("sizePicker").addEventListener("click", e => {
    const btn = e.target.closest(".size-btn");
    if (!btn) return;

    spriteW = parseInt(btn.dataset.w);
    spriteH = parseInt(btn.dataset.h);

    document.querySelectorAll(".size-btn").forEach(b => {
      b.classList.remove("active");
      b.setAttribute("aria-checked", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-checked", "true");

    const cellSize = getCellSize(spriteW, spriteH);
    resizePreviews(spriteW, spriteH);
    editor.resize(spriteW, spriteH, cellSize);
  });

  // === DROPDOWN DE FORMATO ===
  const formatDropdown = document.getElementById("spriteFormatDropdown");
  const formatSelected = document.getElementById("spriteDropdownSelected");
  const formatInput    = document.getElementById("spriteFormat");

  formatDropdown.addEventListener("click", e => {
    e.stopPropagation();
    document.getElementById("spriteDropdownOptions").classList.toggle("show");
  });

  document.querySelectorAll("#spriteDropdownOptions .dropdown-option").forEach(opt => {
    opt.addEventListener("click", e => {
      e.stopPropagation();
      formatInput.value     = opt.dataset.value;
      formatSelected.textContent = opt.textContent;
      document.getElementById("spriteDropdownOptions").classList.remove("show");
    });
  });

  window.addEventListener("click", () => {
    document.getElementById("spriteDropdownOptions")?.classList.remove("show");
  });

  // === VALIDACIÓN DE NOMBRE ===
  const nameInput = document.getElementById("spriteName");
  nameInput.addEventListener("input", function () {
    let val = this.value.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, "");
    while (val.length > 0 && /^[0-9]/.test(val)) val = val.substring(1);
    if (val.length > 20) val = val.substring(0, 20);
    this.value = val;
    saveSpriteState();
  });

  // === EXPORTAR ===
  document.getElementById("exportBtn").addEventListener("click", () => {
    const name   = nameInput.value.trim() || "custom_sprite";
    const format = formatInput.value;
    const code   = GBExport.exportSprite(name, editor.grid, spriteW, spriteH, format);
    document.getElementById("spriteOut").value = code;
  });

  // === EXPORTAR COMO PNG ===
  document.getElementById("exportImageBtn").addEventListener("click", () => {
    const name = nameInput.value.trim() || "custom_sprite";
    const link = document.createElement("a");
    link.download = name + ".png";
    link.href = preview1.toDataURL("image/png");
    link.click();
  });

  // === IMPORTAR ===
  document.getElementById("importBtn").addEventListener("click", () => {
    const text   = document.getElementById("spriteOut").value;
    const format = formatInput.value;
    if (!text.trim()) {
      alert("Pega el código C en el área de texto primero.");
      return;
    }
    const result = GBExport.importSprite(text, format, spriteW, spriteH);
    if (!result) {
      alert(`No se encontraron suficientes datos válidos para un sprite ${spriteW}×${spriteH} en formato ${format}.`);
      return;
    }
    editor.loadGrid(result.grid);
    nameInput.value = result.name;
  });

  // === BORRAR ===
  document.getElementById("clearBtn").addEventListener("click", () => {
    editor.clear();
    // También limpiar en el almacenamiento persistente para este slot
    let allSlots = JSON.parse(localStorage.getItem("gb_painter_slots") || "[]");
    if (allSlots[currentSlot]) {
      allSlots[currentSlot].grid = editor.grid; // grid ya está vacío por editor.clear()
      localStorage.setItem("gb_painter_slots", JSON.stringify(allSlots));
    }
    localStorage.removeItem("gb_painter_sprite_state");
  });

  // === COPIAR ===
  document.getElementById("copyBtn").addEventListener("click", () => {
    const out = document.getElementById("spriteOut").value;
    if (!out.trim()) {
      alert("No hay nada para copiar.");
      return;
    }
    navigator.clipboard.writeText(out)
      .then(() => alert("✅ Código copiado al portapapeles."))
      .catch(() => alert("❌ No se pudo copiar automáticamente."));
  });

  // Cargar estado inicial
  loadInitialState();

})();
