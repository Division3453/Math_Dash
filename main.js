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
const easyBtn = document.getElementById('easyBtn');
const normalBtn = document.getElementById('normalBtn');
const hardBtn = document.getElementById('hardBtn');
const customBtn = document.getElementById('customBtn');
const reviveCheckbox = document.getElementById('reviveCheckbox');
const reviveOverlay = document.getElementById('reviveOverlay');
const reviveTimerText = document.getElementById('reviveTimerText');
const reviveButton = document.getElementById('reviveButton');
const transitionOverlay = document.getElementById('transitionOverlay');
const stayButton = document.getElementById('stayButton');
const goButton = document.getElementById('goButton');

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
let revivePending = false;
let reviveTimer = 0;
let reviveEnabled = true;
let difficultyMode = 'easy';
let levelTransitionPending = false;
const difficultyPresets = {
  easy: { speed: 5, jumpPower: 20, obstacleSpacing: 1600, questionTimeout: 7000 },
  normal: { speed: 6, jumpPower: 18, obstacleSpacing: 1300, questionTimeout: 5000 },
  hard: { speed: 9, jumpPower: 16, obstacleSpacing: 1000, questionTimeout: 3500 },
};
let settings = {
  jumpPower: 18,
  obstacleSpacing: 1300,
  questionTimeout: 5000,
};

function resetGame() {
  score = 0;
  applyDifficulty(difficultyMode, false);
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
  setDifficultyControlsEnabled(false);
  questionTimer = 0;
  currentQuestion = createQuestion();
  renderQuestion();
  window.requestAnimationFrame(gameLoop);
}

function endGame() {
  if (revivePending || attemptRevive()) {
    return;
  }

  gameState = 'gameOver';
  setDifficultyControlsEnabled(true);
  questionText.textContent = 'Game Over! Press Space to Restart';
  answerButtons.innerHTML = '';
}

function attemptRevive() {
  if (!reviveEnabled || Math.random() > 0.1) {
    return false;
  }

  revivePending = true;
  reviveTimer = 13000;
  reviveTimerText.textContent = '13';
  reviveOverlay.classList.remove('hidden');
  gameState = 'revivePending';
  questionText.textContent = 'Chance to revive! Press REVIVE!';
  answerButtons.innerHTML = '';
  setDifficultyControlsEnabled(false);
  return true;
}

function completeGameOver() {
  revivePending = false;
  reviveOverlay.classList.add('hidden');
  gameState = 'gameOver';
  setDifficultyControlsEnabled(true);
  questionText.textContent = 'Game Over! Press Space to Restart';
  answerButtons.innerHTML = '';
}

function revivePlayer() {
  revivePending = false;
  reviveOverlay.classList.add('hidden');
  gameState = 'playing';
  setDifficultyControlsEnabled(false);
  player.x = 80;
  player.y = groundY - player.height;
  player.vy = 0;
  player.isOnGround = true;
  obstacles = [];
  questionTimer = 0;
  currentQuestion = createQuestion();
  renderQuestion();
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
    if (score >= 10) {
      score -= 10;
    }
    if (isHitQuestion && hitQuestionPhase === 'symbol') {
      questionText.textContent = 'Wrong! Boss fight restarts.';
      scoreValue.textContent = score;
      answerButtons.querySelectorAll('button').forEach((btn) => {
        btn.disabled = true;
      });
      restartBossFight();
      return;
    }
    questionText.textContent = `Oops! The answer was ${currentQuestion.answer}.`;
  }
  if (isHitQuestion && hitQuestionPhase === 'brick' && boss && choice === currentQuestion.answer) {
    boss.brickAnimation = {
      active: true,
      x: player.x + player.width,
      y: player.y + player.height / 2 - 8,
      width: 22,
      height: 12,
      speed: 14,
    };
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
  if (score >= 15) {
    score -= 15;
  }
  scoreValue.textContent = score;
  if (isHitQuestion && hitQuestionPhase === 'brick') {
    questionText.textContent = 'Brick throw failed. Try again.';
    questionExpired = true;
    currentQuestion = null;
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
    questionText.textContent = 'Hit symbol failed. Boss fight restarts.';
    restartBossFight();
    return;
  } else {
    questionText.textContent = 'Time ran out! Next question incoming.';
  }

  isHitQuestion = false;
  hitQuestionPhase = null;
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

    if (level === 1 && score >= 700) {
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
    brickAnimation: null,
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
    y: boss.y + rand(20, boss.height - 26),
    width: 26,
    height: 26,
    vx: -6 - (level === 2 ? 2 : 0),
    type,
    counted: false,
  });
}

function updateBoss(deltaTime) {
  if (!boss) return;

  if (isHitQuestion && hitQuestionPhase === 'symbol') {
    return; // pause boss bullets while recovering from a symbol hit
  }

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

  if (boss.brickAnimation && boss.brickAnimation.active) {
    boss.brickAnimation.x += boss.brickAnimation.speed;
    if (boss.brickAnimation.x > boss.x) {
      boss.brickAnimation.active = false;
    }
  }
}

function restartBossFight() {
  if (!boss) return;
  boss.stage = 1;
  boss.bullets = [];
  boss.bulletTimer = 0;
  boss.dodged = 0;
  boss.hits = 0;
  isHitQuestion = false;
  hitQuestionPhase = null;
  currentQuestion = null;
  answerButtons.innerHTML = '';
  questionText.textContent = 'Boss fight restarts! Dodge the math symbols.';
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
  player.color = '#f08f00';
  questionText.textContent = 'Boss defeated! Prepare for the next choice.';
  answerButtons.innerHTML = '';
  isHitQuestion = false;
  hitQuestionPhase = null;
  showLevelTransitionPrompt();
}

function showLevelTransitionPrompt() {
  levelTransitionPending = true;
  gameState = 'levelTransition';
  transitionOverlay.classList.remove('hidden');
  setDifficultyControlsEnabled(false);
}

function chooseStayHere() {
  levelTransitionPending = false;
  transitionOverlay.classList.add('hidden');
  gameState = 'playing';
  level = 1;
  currentQuestion = createQuestion();
  renderQuestion();
}

function chooseGoToDesert() {
  levelTransitionPending = false;
  transitionOverlay.classList.add('hidden');
  gameState = 'playing';
  level = 2;
  scrollSpeed = parseInt(speedSlider.value, 10) + 2;
  currentQuestion = createQuestion();
  renderQuestion();
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

    ctx.fillStyle = '#8b0000';
    ctx.beginPath();
    ctx.moveTo(boss.x + 20, boss.y);
    ctx.lineTo(boss.x + 34, boss.y - 22);
    ctx.lineTo(boss.x + 48, boss.y);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(boss.x + boss.width - 20, boss.y);
    ctx.lineTo(boss.x + boss.width - 34, boss.y - 22);
    ctx.lineTo(boss.x + boss.width - 48, boss.y);
    ctx.closePath();
    ctx.fill();

    boss.bullets.forEach((bullet) => {
      ctx.fillStyle = '#000';
      ctx.font = 'bold 28px Arial';
      ctx.fillText(bullet.type, bullet.x, bullet.y + bullet.height - 6);
    });

    if (boss.brickAnimation && boss.brickAnimation.active) {
      ctx.fillStyle = '#a0522d';
      ctx.fillRect(
        boss.brickAnimation.x,
        boss.brickAnimation.y,
        boss.brickAnimation.width,
        boss.brickAnimation.height
      );
    }
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('Math Dash', 16, 30);
}

let lastTime = 0;
function gameLoop(timestamp) {
  if (gameState === 'ready' || gameState === 'gameOver') return;
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  if (gameState === 'playing') {
    update(deltaTime);
  } else if (gameState === 'revivePending') {
    updateRevive(deltaTime);
  }

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
    if (gameState === 'revivePending') {
      return;
    }
    if (player && player.isOnGround) {
      player.vy = -settings.jumpPower;
      player.isOnGround = false;
    }
  }
});

function updateRevive(deltaTime) {
  if (!revivePending) return;
  reviveTimer -= deltaTime;
  reviveTimerText.textContent = Math.max(0, Math.ceil(reviveTimer / 1000)).toString();
  if (reviveTimer <= 0) {
    completeGameOver();
  }
}

function updateDifficultyLabels() {
  speedValueLabel.textContent = speedSlider.value;
  jumpValueLabel.textContent = jumpSlider.value;
  spacingValueLabel.textContent = spacingSlider.value;
  timeoutValueLabel.textContent = timeoutSlider.value;
}

function applyDifficulty(mode, syncSliders = true) {
  difficultyMode = mode;
  easyBtn.classList.toggle('selected', mode === 'easy');
  normalBtn.classList.toggle('selected', mode === 'normal');
  hardBtn.classList.toggle('selected', mode === 'hard');
  customBtn.classList.toggle('selected', mode === 'custom');

  if (mode === 'custom') {
    speedSlider.disabled = false;
    jumpSlider.disabled = false;
    spacingSlider.disabled = false;
    timeoutSlider.disabled = false;
    if (syncSliders) {
      scrollSpeed = parseInt(speedSlider.value, 10);
      settings.jumpPower = parseInt(jumpSlider.value, 10);
      settings.obstacleSpacing = parseInt(spacingSlider.value, 10);
      settings.questionTimeout = parseInt(timeoutSlider.value, 10);
      updateDifficultyLabels();
    }
  } else {
    const preset = difficultyPresets[mode];
    scrollSpeed = preset.speed;
    settings.jumpPower = preset.jumpPower;
    settings.obstacleSpacing = preset.obstacleSpacing;
    settings.questionTimeout = preset.questionTimeout;
    speedSlider.value = preset.speed;
    jumpSlider.value = preset.jumpPower;
    spacingSlider.value = preset.obstacleSpacing;
    timeoutSlider.value = preset.questionTimeout;
    updateDifficultyLabels();
    speedSlider.disabled = true;
    jumpSlider.disabled = true;
    spacingSlider.disabled = true;
    timeoutSlider.disabled = true;
  }
}

function setDifficultyControlsEnabled(enabled) {
  easyBtn.disabled = !enabled;
  normalBtn.disabled = !enabled;
  hardBtn.disabled = !enabled;
  customBtn.disabled = !enabled;

  if (!enabled) {
    speedSlider.disabled = true;
    jumpSlider.disabled = true;
    spacingSlider.disabled = true;
    timeoutSlider.disabled = true;
    return;
  }

  if (difficultyMode === 'custom') {
    speedSlider.disabled = false;
    jumpSlider.disabled = false;
    spacingSlider.disabled = false;
    timeoutSlider.disabled = false;
  } else {
    speedSlider.disabled = true;
    jumpSlider.disabled = true;
    spacingSlider.disabled = true;
    timeoutSlider.disabled = true;
  }
}

speedSlider.addEventListener('input', () => {
  if (difficultyMode === 'custom') {
    scrollSpeed = parseInt(speedSlider.value, 10);
    updateDifficultyLabels();
  }
});

jumpSlider.addEventListener('input', () => {
  if (difficultyMode === 'custom') {
    settings.jumpPower = parseInt(jumpSlider.value, 10);
    updateDifficultyLabels();
  }
});

spacingSlider.addEventListener('input', () => {
  if (difficultyMode === 'custom') {
    settings.obstacleSpacing = parseInt(spacingSlider.value, 10);
    updateDifficultyLabels();
  }
});

timeoutSlider.addEventListener('input', () => {
  if (difficultyMode === 'custom') {
    settings.questionTimeout = parseInt(timeoutSlider.value, 10);
    updateDifficultyLabels();
  }
});

easyBtn.addEventListener('click', () => applyDifficulty('easy'));
normalBtn.addEventListener('click', () => applyDifficulty('normal'));
hardBtn.addEventListener('click', () => applyDifficulty('hard'));
customBtn.addEventListener('click', () => applyDifficulty('custom'));

reviveCheckbox.addEventListener('change', () => {
  reviveEnabled = reviveCheckbox.checked;
});

reviveButton.addEventListener('click', () => {
  if (revivePending) {
    revivePlayer();
  }
});

stayButton.addEventListener('click', chooseStayHere);
goButton.addEventListener('click', chooseGoToDesert);

canvas.addEventListener('click', () => {
  if (gameState === 'ready' || gameState === 'gameOver') {
    lastTime = performance.now();
    startGame();
  }
});

updateDifficultyLabels();
resetGame();
