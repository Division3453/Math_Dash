const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreValue = document.getElementById('scoreValue');
const questionText = document.getElementById('questionText');
const answerButtons = document.getElementById('answerButtons');
const timerFill = document.getElementById('timerFill');
const speedSlider = document.getElementById('speedSlider');
const jumpSlider = document.getElementById('jumpSlider');
const spacingSlider = document.getElementById('spacingSlider');
const timeoutSlider = document.getElementById('timeoutSlider');
const speedValueLabel = document.getElementById('speedValue');
const jumpValueLabel = document.getElementById('jumpValue');
const spacingValueLabel = document.getElementById('spacingValue');
const timeoutValueLabel = document.getElementById('timeoutValue');

const gameWidth = canvas.width;
const gameHeight = canvas.height;
const groundY = gameHeight - 40;

let gameState = 'ready';
let score = 0;
let player = null;
let obstacles = [];
let scrollSpeed = 6;
let lastObstacleTime = 0;
let questionTimer = 0;
let currentQuestion = null;
let timeSinceStart = 0;
let obstaclesToClear = 0;
let questionExpired = false;
let isHitQuestion = false;
let hitQuestionPhase = null;
let level = 1;
let boss = null;
let settings = {
  jumpPower: 18,
  obstacleSpacing: 1300,
  questionTimeout: 5000,
};

function resetGame() {
  score = 0;
  scrollSpeed = parseInt(speedSlider.value, 10);
  lastObstacleTime = 0;
  questionTimer = 0;
  questionExpired = false;
  isHitQuestion = false;
  hitQuestionPhase = null;
  level = 1;
  boss = null;
  timeSinceStart = 0;
  obstacles = [];
  player = {
    x: 80,
    y: groundY - 40,
    width: 40,
    height: 40,
    vy: 0,
    isOnGround: true,
    color: '#444',
  };
  currentQuestion = null;
  questionText.textContent = 'Press Space to Start';
  answerButtons.innerHTML = '';
  scoreValue.textContent = score;
}

function startGame() {
  if (gameState === 'playing') return;
  resetGame();
  gameState = 'playing';
  questionTimer = 0;
  currentQuestion = createQuestion();
  renderQuestion();
  window.requestAnimationFrame(gameLoop);
}

function endGame() {
  gameState = 'gameOver';
  questionText.textContent = 'Game Over! Press Space to Restart';
  answerButtons.innerHTML = '';
}

function createQuestion() {
  const types = ['+', '-', '×', '÷'];
  const type = types[Math.floor(Math.random() * types.length)];
  let a = 0;
  let b = 0;
  let answer = 0;

  if (type === '+') {
    a = rand(1, 15);
    b = rand(1, 15);
    answer = a + b;
  } else if (type === '-') {
    a = rand(5, 20);
    b = rand(1, a);
    answer = a - b;
  } else if (type === '×') {
    a = rand(1, 10);
    b = rand(1, 10);
    answer = a * b;
  } else {
    b = rand(2, 6);
    answer = rand(1, 10);
    a = answer * b;
  }

  const choices = generateChoices(answer);
  return { a, b, type, answer, choices };
}

function generateChoices(answer) {
  const choices = new Set([answer]);
  while (choices.size < 4) {
    const offset = rand(-6, 6);
    const candidate = answer + offset;
    if (candidate >= 0) {
      choices.add(candidate);
    }
  }
  return shuffle(Array.from(choices));
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function renderQuestion() {
  if (!currentQuestion) return;
  questionTimer = 0;
  questionExpired = false;
  if (timerFill) {
    timerFill.classList.remove('expired');
    timerFill.style.width = '100%';
  }
  questionText.textContent = `Solve: ${currentQuestion.a} ${currentQuestion.type} ${currentQuestion.b}`;
  answerButtons.innerHTML = '';

  currentQuestion.choices.forEach((choice) => {
    const button = document.createElement('button');
    button.className = 'answer-button';
    button.textContent = choice;
    button.addEventListener('click', () => evaluateAnswer(choice, button));
    answerButtons.appendChild(button);
  });
}

function evaluateAnswer(choice, button) {
  if (gameState !== 'playing' || !currentQuestion) return;
  if (choice === currentQuestion.answer) {
    button.classList.add('correct');
    score += 25;
    if (isHitQuestion && hitQuestionPhase === 'brick' && boss) {
      boss.hits += 1;
      questionText.textContent = `Good hit! Bricks thrown: ${boss.hits}/6.`;
      if (boss.hits >= 6) {
        defeatBoss();
      }
    } else {
      obstaclesToClear = Math.max(obstaclesToClear, 3);
      questionText.textContent = 'Correct! The next 3 obstacles will disappear.';
    }
  } else {
    button.classList.add('wrong');
    score = Math.max(0, score - 10);
    questionText.textContent = `Oops! The answer was ${currentQuestion.answer}.`;
  }
  scoreValue.textContent = score;
  answerButtons.querySelectorAll('button').forEach((btn) => {
    btn.disabled = true;
  });
  setTimeout(() => {
    if (boss && boss.stage === 2 && boss.hits < 6) {
      currentQuestion = createQuestion();
      renderQuestion();
    } else if (!isHitQuestion || (isHitQuestion && hitQuestionPhase === 'symbol')) {
      isHitQuestion = false;
      hitQuestionPhase = null;
      if (boss && boss.stage === 1) {
        currentQuestion = null;
        answerButtons.innerHTML = '';
      } else {
        currentQuestion = createQuestion();
        renderQuestion();
      }
    } else {
      currentQuestion = createQuestion();
      renderQuestion();
    }
  }, 1000);
}

function handleFailedQuestion() {
  if (gameState !== 'playing') return;
  score = Math.max(0, score - 15);
  scoreValue.textContent = score;
  if (isHitQuestion && hitQuestionPhase === 'brick') {
    questionText.textContent = 'Brick throw failed. Try again.';
    questionExpired = false;
    if (timerFill) {
      timerFill.classList.remove('expired');
      timerFill.style.width = '100%';
    }
    setTimeout(() => {
      if (gameState === 'playing') {
        currentQuestion = createQuestion();
        renderQuestion();
      }
    }, 1000);
    return;
  }

  if (isHitQuestion && hitQuestionPhase === 'symbol') {
    questionText.textContent = 'Hit symbol failed. Recover and keep dodging.';
  } else {
    questionText.textContent = 'Time ran out! Next question incoming.';
  }

  isHitQuestion = false;
  hitQuestionPhase = null;
  questionExpired = false;
  if (timerFill) {
    timerFill.classList.remove('expired');
    timerFill.style.width = '100%';
  }
  setTimeout(() => {
    if (gameState === 'playing') {
      currentQuestion = createQuestion();
      renderQuestion();
    }
  }, 1000);
}

function spawnObstacle() {
  const height = rand(30, 50);
  obstacles.push({
    x: gameWidth + 20,
    y: groundY - height,
    width: rand(20, 30),
    height,
  });
}

function update(deltaTime) {
  if (gameState !== 'playing') return;
  timeSinceStart += deltaTime;
  questionTimer += deltaTime;

  if (currentQuestion && !questionExpired && questionTimer > settings.questionTimeout) {
    questionExpired = true;
    questionTimer = settings.questionTimeout;
    if (timerFill) {
      timerFill.classList.add('expired');
      timerFill.style.width = '0%';
    }
    handleFailedQuestion();
  }

  player.vy += 0.9;
  player.y += player.vy;

  if (player.y + player.height >= groundY) {
    player.y = groundY - player.height;
    player.vy = 0;
    player.isOnGround = true;
  } else {
    player.isOnGround = false;
  }

  if (!boss) {
    if (timeSinceStart - lastObstacleTime > rand(settings.obstacleSpacing, settings.obstacleSpacing + 800)) {
      spawnObstacle();
      lastObstacleTime = timeSinceStart;
    }

    obstacles.forEach((obstacle) => {
      obstacle.x -= scrollSpeed;
    });

    if (level === 1 && score >= 1000) {
      startBossFight();
    }
  }

  if (obstaclesToClear > 0 && obstacles.length > 0) {
    obstacles.splice(0, Math.min(obstaclesToClear, obstacles.length));
    obstaclesToClear = 0;
  }

  obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > -20);

  if (boss) {
    updateBoss(deltaTime);
  }

  if (!boss && checkCollision()) {
    endGame();
    return;
  }

  if (timerFill && !questionExpired && currentQuestion) {
    const remaining = Math.max(0, settings.questionTimeout - questionTimer);
    const percent = settings.questionTimeout > 0 ? (remaining / settings.questionTimeout) * 100 : 100;
    timerFill.style.width = `${percent}%`;
  }

  score += deltaTime * 0.01;
  scoreValue.textContent = Math.floor(score);
}

function createQuestionOfType(type) {
  let a = 0;
  let b = 0;
  let answer = 0;

  if (type === '+') {
    a = rand(1, 15);
    b = rand(1, 15);
    answer = a + b;
  } else if (type === '-') {
    a = rand(5, 20);
    b = rand(1, a);
    answer = a - b;
  } else if (type === '×') {
    a = rand(1, 10);
    b = rand(1, 10);
    answer = a * b;
  } else {
    b = rand(2, 6);
    answer = rand(1, 10);
    a = answer * b;
  }

  const choices = generateChoices(answer);
  return { a, b, type, answer, choices };
}

function startBossFight() {
  boss = {
    stage: 1,
    x: gameWidth - 180,
    y: groundY - 100,
    width: 140,
    height: 80,
    bulletTimer: 0,
    bullets: [],
    dodged: 0,
    hits: 0,
  };
  obstacles = [];
  currentQuestion = null;
  answerButtons.innerHTML = '';
  questionText.textContent = 'Boss appears! Dodge the math symbols.';
}

function spawnBossBullet() {
  const symbols = ['+', '-', '×', '÷'];
  const type = symbols[Math.floor(Math.random() * symbols.length)];
  boss.bullets.push({
    x: boss.x,
    y: boss.y + 30,
    width: 26,
    height: 26,
    vx: -6 - (level === 2 ? 2 : 0),
    type,
    counted: false,
  });
}

function updateBoss(deltaTime) {
  if (!boss) return;

  if (boss.stage === 1) {
    boss.bulletTimer += deltaTime;
    if (boss.bulletTimer > 900) {
      boss.bulletTimer = 0;
      spawnBossBullet();
    }

    boss.bullets.forEach((bullet) => {
      bullet.x += bullet.vx;
      if (!bullet.counted && bullet.x + bullet.width < player.x) {
        bullet.counted = true;
        boss.dodged += 1;
        if (boss.dodged >= 10) {
          startBrickPhase();
        }
      }
    });

    boss.bullets = boss.bullets.filter((bullet) => bullet.x + bullet.width > -20);

    if (!isHitQuestion) {
      boss.bullets.forEach((bullet, index) => {
        if (
          player.x < bullet.x + bullet.width &&
          player.x + player.width > bullet.x &&
          player.y < bullet.y + bullet.height &&
          player.y + player.height > bullet.y
        ) {
          boss.bullets.splice(index, 1);
          startHitQuestion(bullet.type);
        }
      });
    }
  }
}

function startHitQuestion(symbolType) {
  isHitQuestion = true;
  hitQuestionPhase = 'symbol';
  currentQuestion = createQuestionOfType(symbolType);
  questionText.textContent = `You were hit by ${symbolType}! Solve it to recover.`;
  renderQuestion();
}

function startBrickPhase() {
  if (!boss || boss.stage !== 1) return;
  boss.stage = 2;
  boss.bullets = [];
  isHitQuestion = true;
  hitQuestionPhase = 'brick';
  currentQuestion = createQuestion();
  questionText.textContent = `Boss is tired! Throw a brick (${boss.hits}/6).`;
  renderQuestion();
}

function defeatBoss() {
  boss = null;
  level = 2;
  player.color = '#f08f00';
  scrollSpeed = parseInt(speedSlider.value, 10) + 2;
  questionText.textContent = 'Boss defeated! Welcome to Level 2: Desert.';
  answerButtons.innerHTML = '';
  isHitQuestion = false;
  hitQuestionPhase = null;
  setTimeout(() => {
    currentQuestion = createQuestion();
    renderQuestion();
  }, 1000);
}

function checkCollision() {
  return obstacles.some((obstacle) => {
    return (
      player.x < obstacle.x + obstacle.width &&
      player.x + player.width > obstacle.x &&
      player.y < obstacle.y + obstacle.height &&
      player.y + player.height > obstacle.y
    );
  });
}

function draw() {
  ctx.clearRect(0, 0, gameWidth, gameHeight);

  ctx.fillStyle = level === 2 ? '#ffd598' : '#8ad3ff';
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  ctx.fillStyle = level === 2 ? '#e2b15a' : '#85c1ef';
  ctx.fillRect(0, groundY, gameWidth, gameHeight - groundY);

  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  ctx.fillStyle = '#6b5533';
  obstacles.forEach((obstacle) => {
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  });

  if (boss) {
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Boss`, boss.x + 10, boss.y + 24);
    ctx.fillText(`Bricks: ${boss.hits}/6`, boss.x + 10, boss.y + 44);
    ctx.fillText(`Dodged: ${boss.dodged}/10`, boss.x + 10, boss.y + 64);
    ctx.font = 'bold 28px Arial';
    boss.bullets.forEach((bullet) => {
      ctx.fillStyle = '#000';
      ctx.fillText(bullet.type, bullet.x, bullet.y + bullet.height - 6);
    });
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('Math Dash', 16, 30);
}

let lastTime = 0;
function gameLoop(timestamp) {
  if (gameState !== 'playing') return;
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  update(deltaTime);
  draw();
  window.requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    if (gameState === 'ready' || gameState === 'gameOver') {
      lastTime = performance.now();
      startGame();
      return;
    }
    if (player && player.isOnGround) {
      player.vy = -settings.jumpPower;
      player.isOnGround = false;
    }
  }
});

function updateDifficultyLabels() {
  speedValueLabel.textContent = speedSlider.value;
  jumpValueLabel.textContent = jumpSlider.value;
  spacingValueLabel.textContent = spacingSlider.value;
  timeoutValueLabel.textContent = timeoutSlider.value;
}

speedSlider.addEventListener('input', () => {
  scrollSpeed = parseInt(speedSlider.value, 10);
  updateDifficultyLabels();
});

jumpSlider.addEventListener('input', () => {
  settings.jumpPower = parseInt(jumpSlider.value, 10);
  updateDifficultyLabels();
});

spacingSlider.addEventListener('input', () => {
  settings.obstacleSpacing = parseInt(spacingSlider.value, 10);
  updateDifficultyLabels();
});

timeoutSlider.addEventListener('input', () => {
  settings.questionTimeout = parseInt(timeoutSlider.value, 10);
  updateDifficultyLabels();
});

canvas.addEventListener('click', () => {
  if (gameState === 'ready' || gameState === 'gameOver') {
    lastTime = performance.now();
    startGame();
  }
});

updateDifficultyLabels();
resetGame();
