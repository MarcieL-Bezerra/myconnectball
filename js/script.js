const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const levelDisplay = document.getElementById('level-display');
const messageDisplay = document.getElementById('message');
const btnReset = document.getElementById('btn-reset');
const CANVAS_SIZE = 400;
canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

// Configuração das Fases
const config = [
  { grid: 4, colors: ["red", "blue"] },
  { grid: 5, colors: ["red", "blue", "green"] },
  { grid: 6, colors: ["red", "blue", "green", "yellow"] },
  { grid: 7, colors: ["red", "blue", "green", "yellow", "orange"] },
  { grid: 8, colors: ["red", "blue", "green", "yellow", "orange", "purple"] }
];

const levels = config.map(conf => {
  // Cria todas as coordenadas possíveis para este grid
  let positions = [];
  for (let r = 0; r < conf.grid; r++) {
    for (let c = 0; c < conf.grid; c++) {
      positions.push([r, c]);
    }
  }

  // Embaralha as posições (Fisher-Yates)
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  // Alimenta os dots retirando as posições do array embaralhado
  const dots = {};
  conf.colors.forEach(color => {
    dots[color] = [positions.pop(), positions.pop()];
  });

  return { grid: conf.grid, dots };
});

let currentLevelIdx = 0;
let cellSize, gridN, dots, paths, isDrawing, currentColor;
let drawPoints; // Para armazenar pontos reais do mouse
let attempts = 0;
let maxAttempts = 0;

function updateAttemptsDisplay() {
  const attemptsDisplay = document.getElementById('attempts-display');
  if (attemptsDisplay) {
    attemptsDisplay.innerText = `Tentativas: ${attempts}/${maxAttempts}`;
  }
}

function updateVidasDisplay() {
  const vidasDisplay = document.getElementById('vidas-display');
  if (vidasDisplay) {
    let hearts = '';
    for (let i = 0; i < maxAttempts - attempts; i++) {
      hearts += '❤️';
    }
    for (let i = 0; i < attempts; i++) {
      hearts += '<span style="opacity:0.2">❤️</span>';
    }
    vidasDisplay.innerHTML = hearts;
  }
}

function initLevel() {
  const level = levels[currentLevelIdx];
  gridN = level.grid;
  dots = level.dots;
  cellSize = CANVAS_SIZE / gridN;
  paths = {};
  for (let color in dots) paths[color] = [];
  isDrawing = false;
  currentColor = null;
  drawPoints = [];
  maxAttempts = Object.keys(dots).length;
  attempts = 0;
  levelDisplay.innerText = `Fase ${currentLevelIdx + 1} (${gridN}x${gridN})`;
  messageDisplay.innerText = "Conecte as cores!";
  updateVidasDisplay();
  draw();
}

function draw() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  // Desenhar Grid
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridN; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cellSize, 0);
    ctx.lineTo(i * cellSize, CANVAS_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cellSize);
    ctx.lineTo(CANVAS_SIZE, i * cellSize);
    ctx.stroke();
  }
  // Desenhar Caminhos
  for (let color in paths) {
    if (paths[color].length > 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.beginPath();
      paths[color].forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt[0], pt[1]);
        else ctx.lineTo(pt[0], pt[1]);
      });
      ctx.stroke();
    }
  }
  // Desenhar Bolas
  for (let color in dots) {
    ctx.fillStyle = color;
    dots[color].forEach(p => {
      ctx.beginPath();
      ctx.arc(p[0] * cellSize + cellSize/2, p[1] * cellSize + cellSize/2, cellSize/3, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

function checkWin() {
  for (let color in dots) {
    const path = paths[color];
    if (path.length < 2) return false;
    // Verifica se o início e fim estão próximos das bolas
    const start = dots[color][0], end = dots[color][1];
    const startPx = [start[0] * cellSize + cellSize/2, start[1] * cellSize + cellSize/2];
    const endPx = [end[0] * cellSize + cellSize/2, end[1] * cellSize + cellSize/2];
    const first = path[0], last = path[path.length-1];
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < cellSize/2;
    const connected = (dist(first, startPx) && dist(last, endPx)) || (dist(first, endPx) && dist(last, startPx));
    if (!connected) return false;
  }
  setTimeout(() => {
    if (currentLevelIdx < levels.length - 1) {
      alert("Boa! Próxima fase.");
      currentLevelIdx++;
      initLevel();
    } else {
      alert("Parabéns! Você venceu todas as fases!");
      currentLevelIdx = 0;
      initLevel();
    }
  }, 100);
}

function segmentsIntersect(a1, a2, b1, b2) {
  // Retorna true se os segmentos a1-a2 e b1-b2 se cruzam
  function ccw(p1, p2, p3) {
    return (p3[1] - p1[1]) * (p2[0] - p1[0]) > (p2[1] - p1[1]) * (p3[0] - p1[0]);
  }
  return (ccw(a1, b1, b2) !== ccw(a2, b1, b2)) && (ccw(a1, a2, b1) !== ccw(a1, a2, b2));
}

function handleInput(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
  const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
  if (e.type === 'mousedown' || e.type === 'touchstart') {
    for (let color in dots) {
      for (let p of dots[color]) {
        const cx = p[0] * cellSize + cellSize/2;
        const cy = p[1] * cellSize + cellSize/2;
        if (Math.hypot(x - cx, y - cy) < cellSize/2) {
          currentColor = color;
          paths[color] = [[x, y]];
          isDrawing = true;
          break;
        }
      }
      if (isDrawing) break;
    }
  } else if (isDrawing && (e.type === 'mousemove' || e.type === 'touchmove')) {
    if (currentColor) {
      const last = paths[currentColor][paths[currentColor].length - 1];
      const dx = x - last[0];
      const dy = y - last[1];
      if (Math.sqrt(dx*dx + dy*dy) > 2) {
        let intersects = false;
        for (let otherColor in paths) {
          if (otherColor === currentColor) continue;
          const pts = paths[otherColor];
          for (let i = 1; i < pts.length; i++) {
            if (segmentsIntersect(last, [x, y], pts[i-1], pts[i])) {
              intersects = true;
              break;
            }
          }
          if (intersects) break;
        }
        if (!intersects) {
          paths[currentColor].push([x, y]);
        } else {
          // Caminho cruzou, perde vida
          isDrawing = false;
          attempts++;
          updateVidasDisplay();
          messageDisplay.innerText = "Caminho cruzou! -1 vida";
          draw();
          setTimeout(() => {
            paths[currentColor] = [];
            messageDisplay.innerText = "Conecte as cores!";
            draw();
            if (attempts >= maxAttempts) {
              messageDisplay.innerText = "Game Over! Reiniciando...";
              updateVidasDisplay();
              setTimeout(() => {
                currentLevelIdx = 0;
                initLevel();
              }, 2000);
            }
          }, 2000);
        }
      }
    }
  } else if (e.type === 'mouseup' || e.type === 'touchend') {
    isDrawing = false;
    checkWin();
  }
  if (attempts < maxAttempts) draw();
}

canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('mousemove', handleInput);
window.addEventListener('mouseup', handleInput);
canvas.addEventListener('touchstart', handleInput);
canvas.addEventListener('touchmove', handleInput);
canvas.addEventListener('touchend', handleInput);
btnReset.onclick = initLevel;
initLevel();