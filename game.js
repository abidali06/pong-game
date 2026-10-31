//================MODULES=========================
import { initCanvas, clearCanvas } from "./modules/canvas-utils.js";
import { createAnimationLoop, clamp } from "./modules/game-utils.js";
import { createKeyboardInput } from "./modules/misc.js";
import { vectorMagnitude } from "./modules/maths-physics-utils.js";
import {
  playWallSound,
  playPaddleSound,
  playScoreSound,
  playStartSound,
  playGameOverSound,
} from "./modules/audio.js";
//===================DOM===========================
const gameCanvas = initCanvas("#gameCanvas");
const canvasElement = document.getElementById("gameCanvas");
const ctx = gameCanvas.ctx;
const keyboard = createKeyboardInput();
const scoreText = document.getElementById("score");
const gameOverScreen = document.getElementById("game-over");
const gameOverMessage = document.getElementById("game-over-message");
const restartButton = document.getElementById("restart-button");
const pauseButton = document.getElementById("pause-button");
const startScreen = document.getElementById("start-screen");
const diffScreen = document.getElementById("diff-screen");
const localPlayButton = document.getElementById("local");
const compPlayButton = document.getElementById("comp");
const easyButton = document.getElementById("easy");
const mediumButton = document.getElementById("medium");
const hardButton = document.getElementById("hard");
const impossibleButton = document.getElementById("impossible");
const flashButton = document.getElementById("flash");
const menuButton = document.getElementById("menu-button");
//==================OBJECTS========================
const paddle1 = {
  length: 150,
  x: gameCanvas.width - 100, //tope end point
  y: gameCanvas.height / 2 - 75,
  thickness: 10,
  speed: 1000,
};
const paddle2 = {
  length: 150,
  x: 100, //top end point
  y: gameCanvas.height / 2 - 75,
  thickness: 10,
  speed: 1000,
};
const ball1 = {
  x: gameCanvas.width / 2,
  y: gameCanvas.height / 2,
  radius: 10,
  speedX: 1000,
  speedY: 1000,
};
const ball2 = {
  x: gameCanvas.width / 2,
  y: gameCanvas.height / 3,
  radius: 10,
  speedX: 1000,
  speedY: 1000,
};
const score = {
  player1: 0,
  player2: 0,
};
//=====================VARIABLES===================
const maxBallSpeed = 2000;
const speedIncreaseFactor = 1.1;
const goal = 10;
let aiAlignment = 0.5;
let gameOver = false;
let paused = false;
let waitingToServe = false;
let gameMode; //comp or local.
let compDiff; // easy, medium, hard, impossible or flash.
const activePointers = new Map();
//======================FUNCTIONS==================
function startGame(mode) {
  startScreen.classList.add("hidden");
  resetPaddles();
  resetBall(ball1);
  resetBall(ball2);
  updateSCoreUi();
  gameMode = mode;
  if (mode === "comp") {
    diffScreen.classList.remove("hidden");
    return;
  }
  playStartSound();
  loop.start();
}
function chooseDiff(diff) {
  compDiff = diff;
  diffScreen.classList.add("hidden");
  playStartSound();
  loop.start();
}
function drawPaddle(paddle) {
  ctx.save();

  ctx.shadowBlur = 16;
  ctx.shadowColor = "#3a5fc7";
  ctx.fillStyle = "#3a5fd8";

  ctx.fillRect(paddle.x, paddle.y, paddle.thickness, paddle.length);

  ctx.restore();
}
function drawBall(ball) {
  ctx.save();

  // Outer cyan glow
  ctx.shadowBlur = 22;
  ctx.shadowColor = "#38bdf8";

  // Bright ball
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#f8fafc";
  ctx.fill();

  ctx.restore();
}
function drawArena() {
  ctx.save();

  ctx.setLineDash([10, 12]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";

  ctx.beginPath();
  ctx.moveTo(gameCanvas.width / 2, 0);
  ctx.lineTo(gameCanvas.width / 2, gameCanvas.height);
  ctx.stroke();

  ctx.restore();
}
function clampPaddle(paddle) {
  paddle.y = clamp(paddle.y, 0, gameCanvas.height - paddle.length);
}
function handleControl(dt) {
  if (gameOver) return;
  if (keyboard.isDown("ArrowRight")) {
    paddle1.y -= paddle1.speed * dt;
  }
  if (keyboard.isDown("ArrowLeft")) {
    paddle1.y += paddle1.speed * dt;
  }
  if (gameMode === "local") {
    if (keyboard.isDown("KeyW")) {
      paddle2.y -= paddle2.speed * dt;
    }
    if (keyboard.isDown("KeyS")) {
      paddle2.y += paddle2.speed * dt;
    }
  }
}
function movePaddleToPointer(event, paddle) {
  const rect = canvasElement.getBoundingClientRect();
  const pointerY =
    (event.clientY - rect.top) * (gameCanvas.height / rect.height);

  paddle.y = clamp(
    pointerY - paddle.length / 2,
    0,
    gameCanvas.height - paddle.length,
  );
}
function releasePointer(event) {
  activePointers.delete(event.pointerId);
}
function clearTouchControls() {
  activePointers.clear();
}
function updateBall(ball, dt) {
  if (gameOver || waitingToServe) return;
  ball.x += ball.speedX * dt;
  ball.y += ball.speedY * dt;
}
function handleBallWallCollision(ball) {
  if (gameOver || waitingToServe) return;
  if (ball.y - ball.radius <= 0) {
    playWallSound();
    ball.y = ball.radius;
    ball.speedY = Math.abs(ball.speedY);
  } else if (ball.y + ball.radius >= gameCanvas.height) {
    playWallSound();
    ball.y = gameCanvas.height - ball.radius;
    ball.speedY = -Math.abs(ball.speedY);
  }
}
function handleBallPaddleCollision(ball) {
  if (gameOver || waitingToServe) return;
  // Right paddle
  if (
    ball.speedX > 0 &&
    ball.x + ball.radius >= paddle1.x &&
    ball.x - ball.radius <= paddle1.x + paddle1.thickness &&
    ball.y + ball.radius >= paddle1.y &&
    ball.y - ball.radius <= paddle1.y + paddle1.length
  ) {
    playPaddleSound();
    ball.x = paddle1.x - ball.radius;
    const paddleCentre = paddle1.y + paddle1.length / 2;
    const offset = ball.y - paddleCentre;
    const hitPosition = clamp(offset / (paddle1.length / 2), -1, 1);
    const angle = hitPosition * (Math.PI / 3);
    const totalSpeed = vectorMagnitude(ball.speedX, ball.speedY);
    ball.speedX = -totalSpeed * Math.cos(angle);
    ball.speedY = totalSpeed * Math.sin(angle);
    handleBallSpeed(ball);
    aiAlignment = 0.2 + Math.random() * 0.6;
  }

  // Left paddle
  else if (
    ball.speedX < 0 &&
    ball.x + ball.radius >= paddle2.x &&
    ball.x - ball.radius <= paddle2.x + paddle2.thickness &&
    ball.y + ball.radius >= paddle2.y &&
    ball.y - ball.radius <= paddle2.y + paddle2.length
  ) {
    playPaddleSound();
    ball.x = paddle2.x + paddle2.thickness + ball.radius;
    const paddleCentre = paddle2.y + paddle2.length / 2;
    const offset = ball.y - paddleCentre;
    const hitPosition = clamp(offset / (paddle2.length / 2), -1, 1);
    const angle = hitPosition * (Math.PI / 3);
    const totalSpeed = vectorMagnitude(ball.speedX, ball.speedY);
    ball.speedX = totalSpeed * Math.cos(angle);
    ball.speedY = totalSpeed * Math.sin(angle);
    handleBallSpeed(ball);
  }
}
function handleBallSpeed(ball) {
  if (
    vectorMagnitude(
      ball.speedX * speedIncreaseFactor,
      ball.speedY * speedIncreaseFactor,
    ) <= maxBallSpeed
  ) {
    ball.speedX *= speedIncreaseFactor;
    ball.speedY *= speedIncreaseFactor;
  }
}
function resetBall(ball) {
  ball.x = gameCanvas.width / 2;
  ball.y = gameCanvas.height / 2;

  ball.speedX = Math.random() < 0.5 ? -1000 : 1000;
  ball.speedY = Math.random() * 1000 - 500;
  waitingToServe = false;
}
function resetPaddles() {
  paddle1.x = gameCanvas.width - 100;
  paddle1.y = gameCanvas.height / 2 - 75;
  paddle2.x = 100;
  paddle2.y = gameCanvas.height / 2 - 75;
}
function detectMiss(ball) {
  if (gameOver || waitingToServe) return;
  if (ball.x + ball.radius >= gameCanvas.width) {
    playScoreSound();
    score.player2++;
  } else if (ball.x - ball.radius <= 0) {
    playScoreSound();
    score.player1++;
  } else {
    return;
  }

  if (score.player1 >= goal || score.player2 >= goal) {
    playGameOverSound();
    gameOver = true;
    clearTouchControls();
    loop.stop();
    gameOverMessage.textContent =
      score.player1 >= goal ? "Player 1 wins!" : "Player 2 wins!";

    gameOverScreen.classList.remove("hidden");
    return;
  }

  ball.speedX = 0;
  ball.speedY = 0;
  waitingToServe = true;
  setTimeout(resetBall, 1000, ball);
}
function updateSCoreUi() {
  scoreText.textContent = `Score ${score.player2} : ${score.player1}`;
}
function resetSCore() {
  score.player1 = 0;
  score.player2 = 0;
}
function restartGame() {
  gameOver = false;
  paused = false;
  waitingToServe = false;
  pauseButton.textContent = "PAUSE";
  startScreen.classList.add("hidden");
  clearTouchControls();
  resetPaddles();
  resetBall(ball1);
  //resetBall(ball2);
  resetSCore();
  gameOverScreen.classList.add("hidden");
  updateSCoreUi();
  loop.start();
}
function togglePause() {
  if (gameOver) return;

  if (paused) {
    paused = false;
    pauseButton.textContent = "PAUSE";
    loop.start();
  } else {
    paused = true;
    pauseButton.textContent = "RESUME";
    clearTouchControls();
    loop.stop();
  }
}
/*function basicAi(paddle, ball, dt) {
  if (gameOver || waitingToServe || paused) return;
  let target;
  if (ball.speedX > 0) {
    target = gameCanvas.height / 2;
  } else target = ball.y;
  const paddleCenter = paddle.y + paddle.length / 2;
  const distance = target - paddleCenter;
  const speed = distance * 7;
  paddle.y += clamp(speed, -paddle.speed, paddle.speed) * dt;
}*/
/*function basicPredictiveAi(paddle, ball, dt) {
  if (gameOver || waitingToServe || paused) return;

  let target;

  if (ball.speedX > 0) {
    target = gameCanvas.height / 2;
  } else if (ball.speedY === 0) {
    target = ball.y;
  } else {
    let wallCollisionTime;

    if (ball.speedY > 0) {
      wallCollisionTime =
        (gameCanvas.height - ball.radius - ball.y) / ball.speedY;
    } else {
      wallCollisionTime = (ball.radius - ball.y) / ball.speedY;
    }

    const predictedX = ball.x + ball.speedX * wallCollisionTime;

    const wallCollision =
      predictedX >= paddle.x + paddle.thickness + ball.radius;

    if (wallCollision) {
      target = gameCanvas.height / 2;
    } else {
      const timeToHitPaddle =
        (ball.x - ball.radius - (paddle.x + paddle.thickness)) / -ball.speedX;
      target = ball.y + ball.speedY * timeToHitPaddle;
    }
  }

  const paddleCenter = paddle.y + paddle.length / 2;
  const distance = target - paddleCenter;
  const speed = distance * 7;

  paddle.y += clamp(speed, -paddle.speed, paddle.speed) * dt;
}*/
function humanLikeAi(paddle, ball, dt) {
  if (gameOver || waitingToServe || paused) return;
  let target;
  const isLeftPaddle = paddle.x < gameCanvas.width / 2;
  const ballApproaching =
    (isLeftPaddle && ball.speedX < 0) || (!isLeftPaddle && ball.speedX > 0);
  if (!ballApproaching) {
    target = gameCanvas.height / 2;
  } else if (ball.speedY === 0) {
    target = ball.y;
  } else {
    let wallCollisionTime;
    if (ball.speedY > 0) {
      wallCollisionTime =
        (gameCanvas.height - ball.radius - ball.y) / ball.speedY;
    } else {
      wallCollisionTime = (ball.radius - ball.y) / ball.speedY;
    }
    const predictedX = ball.x + ball.speedX * wallCollisionTime;
    const paddleCollisionX = isLeftPaddle
      ? paddle.x + paddle.thickness + ball.radius
      : paddle.x - ball.radius;
    const wallCollision = isLeftPaddle
      ? predictedX >= paddleCollisionX
      : predictedX <= paddleCollisionX;
    if (
      !wallCollision ||
      (isLeftPaddle ? ball.x <= 200 : ball.x >= gameCanvas.width - 200)
    ) {
      target = ball.y;
    } else {
      target = gameCanvas.height / 2;
    }
  }
  const alignmentPoint = paddle.y + paddle.length * aiAlignment;
  const distance = target - alignmentPoint;
  const speed = distance * 7;
  paddle.y += clamp(speed, -paddle.speed, paddle.speed) * dt;
}
function fullyPredictiveAi(paddle, ball, dt) {
  if (gameOver || waitingToServe || paused) return;
  let target;
  const isLeftPaddle = paddle.x < gameCanvas.width / 2;
  const ballApproaching =
    (isLeftPaddle && ball.speedX < 0) || (!isLeftPaddle && ball.speedX > 0);

  if (!ballApproaching) {
    target = gameCanvas.height / 2;
  } else {
    let wallCollision = true;
    let wallCollisionTime;
    let X = ball.x;
    let Y = ball.y;
    let speedY = ball.speedY;
    while (wallCollision) {
      if (speedY === 0) {
        wallCollision = false;
        break;
      } else if (speedY > 0) {
        wallCollisionTime = (gameCanvas.height - ball.radius - Y) / speedY;
      } else {
        wallCollisionTime = (ball.radius - Y) / speedY;
      }
      const predictedX = X + ball.speedX * wallCollisionTime;
      const paddleCollisionX = isLeftPaddle
        ? paddle.x + paddle.thickness + ball.radius
        : paddle.x - ball.radius;
      const reachesPaddle = isLeftPaddle
        ? predictedX < paddleCollisionX
        : predictedX > paddleCollisionX;
      if (reachesPaddle) {
        const timeToPaddle = (paddleCollisionX - X) / ball.speedX;
        Y = Y + speedY * timeToPaddle;
        wallCollision = false;
        break;
      }
      const predictedY = Y + speedY * wallCollisionTime;
      X = predictedX;
      Y = predictedY;
      speedY = -speedY;
    }
    target = Y;
  }
  const alignmentPoint = paddle.y + paddle.length * aiAlignment;
  const distance = target - alignmentPoint;
  if (compDiff === "impossible") {
    const movement = paddle.speed * dt;
    paddle.y += Math.sign(distance) * Math.min(Math.abs(distance), movement);
    return;
  }
  if (compDiff === "flash") {
    const movement = paddle.speed * 2 * dt;
    paddle.y += Math.sign(distance) * Math.min(Math.abs(distance), movement);
    return;
  }
  const strength = compDiff === "medium" ? 1.7 : 2;
  const speed = distance * strength;
  paddle.y += clamp(speed, -paddle.speed, paddle.speed) * dt;
}
function mainMenu() {
  gameOver = false;
  paused = false;
  waitingToServe = false;
  gameMode = null;
  compDiff = null;
  loop.stop();
  clearTouchControls();
  resetBall(ball1);
  resetPaddles();
  resetSCore();
  gameOverScreen.classList.add("hidden");
  diffScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
  pauseButton.textContent = "PAUSE";
  updateSCoreUi();
}
//================MAIN GAME LOOP===================
const loop = createAnimationLoop((dt) => {
  clearCanvas(ctx, gameCanvas.width, gameCanvas.height);

  handleControl(dt);
  if (gameMode === "comp") {
    if (compDiff === "easy") {
      humanLikeAi(paddle2, ball1, dt);
    } else {
      fullyPredictiveAi(paddle2, ball1, dt);
    }
  }
  clampPaddle(paddle1);
  clampPaddle(paddle2);

  const subSteps = 2;
  const subDt = dt / subSteps;

  for (let i = 0; i < subSteps; i++) {
    updateBall(ball1, subDt);
    handleBallWallCollision(ball1);
    handleBallPaddleCollision(ball1);
    detectMiss(ball1);
  }

  //updateBall(ball2, dt);
  //handleBallWallCollision(ball2);
  //handleBallPaddleCollision(ball2);
  //detectMiss(ball2);

  drawArena();
  drawPaddle(paddle1);
  drawPaddle(paddle2);
  drawBall(ball1);
  //drawBall(ball2);
  updateSCoreUi();
});
//=====================BUTTONS======================
localPlayButton.addEventListener("click", startGame.bind(null, "local"));
compPlayButton.addEventListener("click", startGame.bind(null, "comp"));
easyButton.addEventListener("click", chooseDiff.bind(null, "easy"));
mediumButton.addEventListener("click", chooseDiff.bind(null, "medium"));
hardButton.addEventListener("click", chooseDiff.bind(null, "hard"));
impossibleButton.addEventListener("click", chooseDiff.bind(null, "impossible"));
flashButton.addEventListener("click", chooseDiff.bind(null, "flash"));
restartButton.addEventListener("click", restartGame);
pauseButton.addEventListener("click", togglePause);
menuButton.addEventListener("click", mainMenu);
//===============TOUCH LISTENERS======================
canvasElement.addEventListener("pointerdown", (event) => {
  if (gameOver || paused) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;

  const rect = canvasElement.getBoundingClientRect();
  let paddle;

  if (gameMode === "local") {
    paddle = event.clientX < rect.left + rect.width / 2 ? paddle2 : paddle1;
  } else if (gameMode === "comp") {
    paddle = paddle1;
  } else {
    return;
  }

  if ([...activePointers.values()].includes(paddle)) return;

  activePointers.set(event.pointerId, paddle);
  canvasElement.setPointerCapture(event.pointerId);

  movePaddleToPointer(event, paddle);
});
canvasElement.addEventListener("pointermove", (event) => {
  const paddle = activePointers.get(event.pointerId);

  if (!paddle || gameOver || paused) return;

  movePaddleToPointer(event, paddle);
});
canvasElement.addEventListener("pointerup", releasePointer);
canvasElement.addEventListener("pointercancel", releasePointer);
canvasElement.addEventListener("lostpointercapture", releasePointer);
