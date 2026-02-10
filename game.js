// ---------------------------
// Constants
// ---------------------------
const VIRTUAL_WIDTH = 960;
const VIRTUAL_HEIGHT = 360;
const GROUND_Y = 290;

const PLAYER_SIZE = 30;
const PLAYER_X = 120;
const JUMP_VELOCITY = -620;
const GRAVITY = 2100;
const ALLOW_DOUBLE_JUMP = true;

const INITIAL_WORLD_SPEED = 320;
const MAX_WORLD_SPEED = 650;
const SPEED_INCREASE_PER_SEC = 9;

const SPAWN_INTERVAL_MIN = 0.8;
const SPAWN_INTERVAL_MAX = 1.8;
const MIN_SPAWN_DISTANCE = 200;

const OBSTACLE_MIN_WIDTH = 22;
const OBSTACLE_MAX_WIDTH = 42;
const OBSTACLE_MIN_HEIGHT = 26;
const OBSTACLE_MAX_HEIGHT = 58;

const SCORE_RATE = 10; // points per second
const HIGH_SCORE_KEY = "minimal_runner_high_score";

const FIXED_TIME_STEP = 1 / 120;
const MAX_FRAME_DELTA = 0.05;

// ---------------------------
// Canvas setup
// ---------------------------
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const restartButton = document.getElementById("restartButton");

canvas.width = VIRTUAL_WIDTH;
canvas.height = VIRTUAL_HEIGHT;

function resizeCanvas() {
  const margin = 32;
  const maxWidth = Math.max(320, window.innerWidth - margin);
  const maxHeight = Math.max(200, window.innerHeight - margin - 70);
  const scale = Math.min(maxWidth / VIRTUAL_WIDTH, maxHeight / VIRTUAL_HEIGHT);

  canvas.style.width = `${Math.floor(VIRTUAL_WIDTH * scale)}px`;
  canvas.style.height = `${Math.floor(VIRTUAL_HEIGHT * scale)}px`;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ---------------------------
// Game state
// ---------------------------
const gameState = {
  started: false,
  gameOver: false,
  score: 0,
  highScore: Number(localStorage.getItem(HIGH_SCORE_KEY) || 0),
  worldSpeed: INITIAL_WORLD_SPEED,
  spawnTimer: 0,
  spawnDelay: randomRange(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX),
  obstacles: [],
  particles: [],
  player: {
    x: PLAYER_X,
    y: GROUND_Y - PLAYER_SIZE,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    velY: 0,
    grounded: true,
    jumpsUsed: 0
  }
};

// ---------------------------
// Input handling
// ---------------------------
const input = {
  jumpQueued: false
};

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (key === " " || key === "spacebar") {
    event.preventDefault();
    input.jumpQueued = true;
    if (!gameState.started) {
      gameState.started = true;
    }
  }

  if (key === "r" && gameState.gameOver) {
    resetGame();
  }
});

restartButton.addEventListener("click", () => {
  if (gameState.gameOver) {
    resetGame();
  }
});

// ---------------------------
// Utility
// ---------------------------
function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function intersectsAABB(a, b) {
  // Axis-Aligned Bounding Box collision test.
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// ---------------------------
// Core update logic
// ---------------------------
function tryJump() {
  const player = gameState.player;
  const canJump =
    player.grounded || (ALLOW_DOUBLE_JUMP && player.jumpsUsed < 2);

  if (input.jumpQueued && canJump) {
    player.velY = JUMP_VELOCITY;
    player.grounded = false;
    player.jumpsUsed += 1;
  }

  input.jumpQueued = false;
}

function updatePlayer(dt) {
  const player = gameState.player;
  const wasGrounded = player.grounded;

  // Integrate vertical motion with gravity.
  player.velY += GRAVITY * dt;
  player.y += player.velY * dt;

  const floorY = GROUND_Y - player.height;
  if (player.y >= floorY) {
    player.y = floorY;
    player.velY = 0;
    player.grounded = true;
    player.jumpsUsed = 0;
    if (!wasGrounded) {
      spawnLandingDust(player.x + player.width * 0.35, GROUND_Y, 5);
    }
  } else {
    player.grounded = false;
  }
}

function updateWorld(dt) {
  gameState.worldSpeed = clamp(
    gameState.worldSpeed + SPEED_INCREASE_PER_SEC * dt,
    INITIAL_WORLD_SPEED,
    MAX_WORLD_SPEED
  );

  gameState.score += SCORE_RATE * dt;
}

function updateSpawning(dt) {
  gameState.spawnTimer += dt;

  if (gameState.spawnTimer < gameState.spawnDelay) {
    return;
  }

  const lastObstacle =
    gameState.obstacles.length > 0
      ? gameState.obstacles[gameState.obstacles.length - 1]
      : null;

  if (lastObstacle) {
    const rightEdge = lastObstacle.x + lastObstacle.width;
    const distanceFromSpawn = VIRTUAL_WIDTH - rightEdge;
    if (distanceFromSpawn < MIN_SPAWN_DISTANCE) {
      return;
    }
  }

  const width = randomInt(OBSTACLE_MIN_WIDTH, OBSTACLE_MAX_WIDTH);
  const height = randomInt(OBSTACLE_MIN_HEIGHT, OBSTACLE_MAX_HEIGHT);

  gameState.obstacles.push({
    x: VIRTUAL_WIDTH + randomInt(20, 70),
    y: GROUND_Y - height,
    width,
    height
  });

  gameState.spawnTimer = 0;
  // As speed climbs, average spawn delay gets slightly shorter.
  const speedRatio =
    (gameState.worldSpeed - INITIAL_WORLD_SPEED) /
    (MAX_WORLD_SPEED - INITIAL_WORLD_SPEED);
  const spawnScale = 1 - 0.32 * clamp(speedRatio, 0, 1);
  gameState.spawnDelay =
    randomRange(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX) * spawnScale;
}

function updateObstacles(dt) {
  const move = gameState.worldSpeed * dt;

  for (const obstacle of gameState.obstacles) {
    obstacle.x -= move;
  }

  gameState.obstacles = gameState.obstacles.filter(
    (obstacle) => obstacle.x + obstacle.width > -10
  );
}

function updateParticles(dt) {
  for (const p of gameState.particles) {
    p.vx *= 0.96;
    p.vy += 1250 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  gameState.particles = gameState.particles.filter((p) => p.life > 0);
}

function spawnLandingDust(x, y, count) {
  for (let i = 0; i < count; i += 1) {
    gameState.particles.push({
      x: x + randomRange(-8, 8),
      y: y - 2,
      vx: randomRange(-60, 95),
      vy: randomRange(-180, -60),
      size: randomRange(2, 4),
      life: randomRange(0.16, 0.34)
    });
  }
}

function checkCollision() {
  const player = gameState.player;
  for (const obstacle of gameState.obstacles) {
    if (intersectsAABB(player, obstacle)) {
      gameState.gameOver = true;
      gameState.highScore = Math.max(
        gameState.highScore,
        Math.floor(gameState.score)
      );
      localStorage.setItem(HIGH_SCORE_KEY, String(gameState.highScore));
      restartButton.classList.add("show");
      return;
    }
  }
}

function fixedUpdate(dt) {
  if (!gameState.started || gameState.gameOver) {
    return;
  }

  tryJump();
  updatePlayer(dt);
  updateWorld(dt);
  updateSpawning(dt);
  updateObstacles(dt);
  updateParticles(dt);
  checkCollision();
}

// ---------------------------
// Rendering
// ---------------------------
function drawBackground() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
}

function drawGround() {
  ctx.strokeStyle = "#1f1f1f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + 0.5);
  ctx.lineTo(VIRTUAL_WIDTH, GROUND_Y + 0.5);
  ctx.stroke();
}

function drawPlayer() {
  const p = gameState.player;
  ctx.fillStyle = "#1f1f1f";
  ctx.fillRect(p.x, p.y, p.width, p.height);
}

function drawObstacles() {
  ctx.fillStyle = "#3d3d3d";
  for (const obstacle of gameState.obstacles) {
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  }
}

function drawParticles() {
  ctx.fillStyle = "#8f8f8f";
  for (const p of gameState.particles) {
    const alpha = clamp(p.life / 0.34, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawHUD() {
  ctx.fillStyle = "#1f1f1f";
  ctx.font = "20px Trebuchet MS, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${Math.floor(gameState.score)}`, 16, 30);
  ctx.fillText(`High: ${gameState.highScore}`, 16, 56);
}

function drawStartOverlay() {
  if (gameState.started) {
    return;
  }
  ctx.fillStyle = "#1f1f1f";
  ctx.font = "bold 34px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Press Space to Start", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2);
}

function drawGameOverOverlay() {
  if (!gameState.gameOver) {
    return;
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  ctx.fillStyle = "#1f1f1f";
  ctx.textAlign = "center";
  ctx.font = "bold 42px Trebuchet MS, sans-serif";
  ctx.fillText("Game Over", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 - 20);
  ctx.font = "22px Trebuchet MS, sans-serif";
  ctx.fillText("Press R or click Restart", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 + 20);
}

function render() {
  drawBackground();
  drawGround();
  drawObstacles();
  drawPlayer();
  drawParticles();
  drawHUD();
  drawStartOverlay();
  drawGameOverOverlay();
}

// ---------------------------
// Reset logic
// ---------------------------
function resetGame() {
  gameState.started = false;
  gameState.gameOver = false;
  gameState.score = 0;
  gameState.worldSpeed = INITIAL_WORLD_SPEED;
  gameState.spawnTimer = 0;
  gameState.spawnDelay = randomRange(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX);
  gameState.obstacles = [];
  gameState.particles = [];

  gameState.player.y = GROUND_Y - gameState.player.height;
  gameState.player.velY = 0;
  gameState.player.grounded = true;
  gameState.player.jumpsUsed = 0;

  input.jumpQueued = false;
  restartButton.classList.remove("show");
}

// ---------------------------
// Main loop (delta-time + fixed simulation)
// ---------------------------
let lastTimestamp = 0;
let accumulator = 0;

function gameLoop(timestampMs) {
  const now = timestampMs * 0.001;
  let frameDt = now - lastTimestamp;
  if (lastTimestamp === 0) {
    frameDt = 0;
  }
  lastTimestamp = now;
  frameDt = Math.min(frameDt, MAX_FRAME_DELTA);

  accumulator += frameDt;
  while (accumulator >= FIXED_TIME_STEP) {
    fixedUpdate(FIXED_TIME_STEP);
    accumulator -= FIXED_TIME_STEP;
  }

  render();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
