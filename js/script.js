const colors = [
  "#E0F8D0", // 0
  "#88C070", // 1
  "#346856", // 2
  "#081820"  // 3
];

let currentColor = 3; // empieza en oscuro
let grid = Array.from({ length: 8 }, () => Array(8).fill(0));

const board = document.getElementById("board");
for (let y = 0; y < 8; y++) {
  for (let x = 0; x < 8; x++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.x = x;
    cell.dataset.y = y;
    cell.style.background = colors[0];
    cell.onclick = (e) => {
      if (e.shiftKey) { grid[y][x] = 0; }
      else { grid[y][x] = currentColor; }
      render();
    };
    board.appendChild(cell);
  }
}

const palette = document.getElementById("palette");
colors.forEach((c, i) => {
  const s = document.createElement("div");
  s.className = "swatch";
  s.style.background = c;
  if (i === currentColor) s.classList.add("selected");
  s.onclick = () => {
    currentColor = i;
    document.querySelectorAll(".swatch").forEach(sw => sw.classList.remove("selected"));
    s.classList.add("selected");
  };

  s.textContent = i;
  palette.appendChild(s);
});

function toBin(b) { return "0b" + b.toString(2).padStart(8, "0"); }
function toHex(b) { return "0x" + b.toString(16).padStart(2, "0").toUpperCase(); }

function exportArray() {
  const format = document.getElementById("formatSelect").value;
  let lines = ["unsigned char real_sprite[] = {"];
  
  if (format === "hex") {
    let hexValues = [];
    for (let y = 0; y < 8; y++) {
      let low = 0, high = 0;
      for (let x = 0; x < 8; x++) {
        const val = grid[y][x];
        const bit = 7 - x;
        if (val & 1) low |= (1 << bit);
        if (val & 2) high |= (1 << bit);
      }
      hexValues.push(toHex(low), toHex(high));
    }
    // Formato 2 filas de 8 columnas
    lines.push(`  ${hexValues.slice(0, 8).join(", ")},`);
    lines.push(`  ${hexValues.slice(8, 16).join(", ")}`);
  } else {
    for (let y = 0; y < 8; y++) {
      let low = 0, high = 0;
      for (let x = 0; x < 8; x++) {
        const val = grid[y][x];
        const bit = 7 - x;
        if (val & 1) low |= (1 << bit);
        if (val & 2) high |= (1 << bit);
      }
      lines.push(`  ${toBin(low)}, ${toBin(high)},`);
    }
  }
  
  lines.push("};");
  document.getElementById("out").value = lines.join("\n");
}

function importArray() {
  const text = document.getElementById("out").value;
  const format = document.getElementById("formatSelect").value;
  let matches = [];
  
  if (format === "hex") {
    matches = [...text.matchAll(/0x([0-9a-fA-F]{2})\s*,\s*0x([0-9a-fA-F]{2})/g)];
  } else {
    matches = [...text.matchAll(/0b([01]{8})\s*,\s*0b([01]{8})/g)];
  }

  if (matches.length < 8) { 
    alert(`No se encontraron 8 filas válidas en el texto para el formato ${format}`); 
    return; 
  }

  matches.slice(0, 8).forEach((m, y) => {
    const low = parseInt(m[1], format === "hex" ? 16 : 2);
    const high = parseInt(m[2], format === "hex" ? 16 : 2);
    for (let x = 0; x < 8; x++) {
      const bit = 7 - x;
      const lowBit = (low >> bit) & 1;
      const highBit = (high >> bit) & 1;
      const val = (highBit << 1) | lowBit; 
      grid[y][x] = val;
    }
  });
  render();
}

document.getElementById("clearBtn").onclick = () => {
  grid = Array.from({ length: 8 }, () => Array(8).fill(0));
  render();
};

document.getElementById("exportBtn").onclick = exportArray;
document.getElementById("importBtn").onclick = importArray;

window.addEventListener("keydown", e => {
  if ("0123".includes(e.key)) {
    currentColor = parseInt(e.key);
    document.querySelectorAll(".swatch").forEach(sw => sw.classList.remove("selected"));
    palette.children[currentColor].classList.add("selected");
  }
});

document.getElementById("copyBtn").onclick = () => {
  const out = document.getElementById("out").value;
  if (!out.trim()) {
    alert("No hay nada para copiar. Exporta o pega código primero.");
    return;
  }
  navigator.clipboard.writeText(out)
    .then(() => {
      alert("✅ Código copiado al portapapeles");
    })
    .catch(() => {
      alert("❌ No se pudo copiar automáticamente, copia manualmente.");
    });
};

function render() {
  // --- pintar el tablero ---
  [...board.children].forEach(cell => {
    const x = cell.dataset.x, y = cell.dataset.y;
    cell.style.background = colors[grid[y][x]];
  });

  // --- pintar el preview ---
  const canvas = document.getElementById("preview");
  const ctx = canvas.getContext("2d");

  const scale = 8; // cada pixel del sprite se dibuja con este tamaño
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = colors[grid[y][x]];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
}


render();

// --- Lógica del Dropdown Personalizado ---
const formatDropdown = document.getElementById("formatDropdown");
const dropdownOptions = document.getElementById("dropdownOptions");
const dropdownSelected = document.getElementById("dropdownSelected");
const formatInput = document.getElementById("formatSelect");

formatDropdown.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdownOptions.classList.toggle("show");
});

document.querySelectorAll(".dropdown-option").forEach(option => {
  option.addEventListener("click", (e) => {
    e.stopPropagation();
    const value = e.target.getAttribute("data-value");
    const text = e.target.textContent;
    
    formatInput.value = value;
    dropdownSelected.textContent = text;
    dropdownOptions.classList.remove("show");
  });
});

window.addEventListener("click", () => {
  dropdownOptions.classList.remove("show");
});
