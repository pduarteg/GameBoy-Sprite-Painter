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

  // Ajustar tamaños de los previews según el sprite
  function resizePreviews(w, h) {
    preview1.width  = w;       preview1.height  = h;
    preview2.width  = w * 2;   preview2.height  = h * 2;
    preview4.width  = w * 4;   preview4.height  = h * 4;
  }

  // Inicializar el editor de sprite
  const boardEl = document.getElementById("spriteBoard");
  resizePreviews(8, 8);
  const editor = new PixelEditor(boardEl, [preview1, preview2, preview4], 8, 8, 36);

  // === AUTOSAVE LOGIC ===
  function saveSpriteState() {
    const state = {
      spriteW,
      spriteH,
      name: nameInput.value,
      grid: editor.grid
    };
    localStorage.setItem("gb_painter_sprite_state", JSON.stringify(state));
  }

  function loadSpriteState() {
    const saved = localStorage.getItem("gb_painter_sprite_state");
    if (!saved) return;
    try {
      const state = JSON.parse(saved);
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
      editor.resize(spriteW, spriteH, cellSize);
      editor.loadGrid(state.grid);
    } catch (e) {
      console.error("Error loading sprite state", e);
    }
  }

  editor.onChange = () => saveSpriteState();

  // === PALETA DE COLORES ===
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
  loadSpriteState();

})();
