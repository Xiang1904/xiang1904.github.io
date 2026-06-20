const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const bestElement = document.getElementById("best-score");
const statusElement = document.getElementById("game-status");
const startButton = document.getElementById("start-button");
const retryButton = document.getElementById("retry-button");

const width = canvas.width;
const height = canvas.height;
const groundHeight = 82;
const bird = {
  x: 120,
  y: 250,
  size: 24,
  velocity: 0
};

let pipes = [];
let score = 0;
let bestScore = Number(localStorage.getItem("pipeBirdBest") || 0);
let frame = 0;
let running = false;
let gameOver = false;
let animationId = null;

bestElement.textContent = bestScore;

const resetGame = () => {
  bird.y = 250;
  bird.velocity = 0;
  pipes = [];
  score = 0;
  frame = 0;
  running = true;
  gameOver = false;
  scoreElement.textContent = score;
  statusElement.textContent = "點擊或按空白鍵讓小鳥飛起。";
  startButton.textContent = "重新開始";
  retryButton.classList.add("hidden");

  if (animationId) cancelAnimationFrame(animationId);
  loop();
};

const flap = () => {
  if (!running && !gameOver) {
    resetGame();
    return;
  }

  if (gameOver) return;

  bird.velocity = -7.2;
};

const createPipe = () => {
  const gap = 190;
  const topHeight = 70 + Math.random() * 230;
  pipes.push({
    x: width + 20,
    topHeight,
    bottomY: topHeight + gap,
    width: 72,
    passed: false
  });
};

const drawBackground = () => {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#183747");
  sky.addColorStop(1, "#0f222c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
  ctx.beginPath();
  ctx.arc(82, 90, 28, 0, Math.PI * 2);
  ctx.arc(115, 88, 36, 0, Math.PI * 2);
  ctx.arc(150, 96, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#173c35";
  ctx.fillRect(0, height - groundHeight, width, groundHeight);
  ctx.fillStyle = "#2dd4bf";
  ctx.fillRect(0, height - groundHeight, width, 12);
};

const drawBird = () => {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(Math.max(-0.45, Math.min(0.55, bird.velocity / 12)));

  ctx.fillStyle = "#f6c542";
  ctx.beginPath();
  ctx.arc(0, 0, bird.size, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.ellipse(-10, 4, 14, 8, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(8, -8, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(10, -8, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(42, 8);
  ctx.lineTo(22, 15);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
};

const drawPipes = () => {
  for (const pipe of pipes) {
    ctx.fillStyle = "#2dd4bf";
    ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
    ctx.fillRect(pipe.x, pipe.bottomY, pipe.width, height - groundHeight - pipe.bottomY);

    ctx.fillStyle = "#0f766e";
    ctx.fillRect(pipe.x - 8, pipe.topHeight - 24, pipe.width + 16, 24);
    ctx.fillRect(pipe.x - 8, pipe.bottomY, pipe.width + 16, 24);
  }
};

const hitPipe = (pipe) => {
  const birdLeft = bird.x - bird.size;
  const birdRight = bird.x + bird.size;
  const birdTop = bird.y - bird.size;
  const birdBottom = bird.y + bird.size;
  const pipeLeft = pipe.x;
  const pipeRight = pipe.x + pipe.width;
  const insideX = birdRight > pipeLeft && birdLeft < pipeRight;
  const outsideGap = birdTop < pipe.topHeight || birdBottom > pipe.bottomY;

  return insideX && outsideGap;
};

const endGame = () => {
  running = false;
  gameOver = true;
  bestScore = Math.max(bestScore, score);
  localStorage.setItem("pipeBirdBest", String(bestScore));
  bestElement.textContent = bestScore;
  startButton.textContent = "重新挑戰";
  retryButton.classList.remove("hidden");
  statusElement.textContent = "遊戲結束，請按重新挑戰再開始。";
};

const update = () => {
  frame += 1;
  bird.velocity += 0.32;
  bird.y += bird.velocity;

  if (frame % 110 === 0) createPipe();

  for (const pipe of pipes) {
    pipe.x -= 2.4;

    if (!pipe.passed && pipe.x + pipe.width < bird.x) {
      pipe.passed = true;
      score += 1;
      scoreElement.textContent = score;
    }

    if (hitPipe(pipe)) endGame();
  }

  pipes = pipes.filter((pipe) => pipe.x + pipe.width > -30);

  if (bird.y + bird.size > height - groundHeight || bird.y - bird.size < 0) {
    endGame();
  }
};

const drawStartScreen = () => {
  drawBackground();
  drawBird();
  ctx.fillStyle = "rgba(23, 32, 38, 0.78)";
  ctx.fillRect(60, 232, width - 120, 112);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 24px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("小鳥飛水管", width / 2, 276);
  ctx.font = "600 16px Segoe UI, sans-serif";
  ctx.fillText("點擊畫面或按開始", width / 2, 310);
};

const drawGameOverScreen = () => {
  ctx.fillStyle = "rgba(7, 16, 21, 0.78)";
  ctx.fillRect(72, 224, width - 144, 140);
  ctx.fillStyle = "#edf5f7";
  ctx.font = "800 30px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("遊戲結束", width / 2, 274);
  ctx.font = "700 18px Segoe UI, sans-serif";
  ctx.fillText(`分數：${score}`, width / 2, 310);
  ctx.fillText("按重新挑戰再開始", width / 2, 340);
};

const loop = () => {
  if (!running) {
    drawStartScreen();
    return;
  }

  update();
  drawBackground();
  drawPipes();
  drawBird();

  if (gameOver) {
    drawGameOverScreen();
    return;
  }

  animationId = requestAnimationFrame(loop);
};

startButton.addEventListener("click", resetGame);
retryButton.addEventListener("click", (event) => {
  event.stopPropagation();
  resetGame();
});
canvas.addEventListener("click", flap);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    flap();
  }
});

drawStartScreen();
