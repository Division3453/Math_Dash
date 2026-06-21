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
let cannonPhase = false;
let cannonShots = 0;
let cannonRounds = 0;
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
  cannonPhase = false;
  cannonShots = 0;
  cannonRounds = 0;
  timeSinceStart = 0;
  obstacles = [];
  let playerColor = '#444';
  if (level === 2) playerColor = '#f08f00';
  if (level === 3) playerColor = '#ffffff';
  player = {
    x: 80,
    y: groundY - 40,
    width: 40,
    height: 40,
    vy: 0,
    isOnGround: true,
    color: playerColor,
  };
  currentQuestion = null;
  questionText.textContent = 'Press Space to Start';
  answerButtons.innerHTML = '';
  scoreValue.textContent = Math.floor(score);
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

function getScoreReward() {
  const rewards = {
    easy: 15,
    normal: 25,
    hard: 35,
    custom: 25,
  };
  return rewards[difficultyMode] || 25;
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
    if (!isHitQuestion) {
      score += getScoreReward();
    }
    if (isHitQuestion && hitQuestionPhase === 'brick' && boss && boss.width <= 150) {
      boss.hits += 1;
      questionText.textContent = `Good hit! Bricks thrown: ${boss.hits}/6.`;
      if (boss.hits >= 6) {
        defeatBoss();
      }
    } else if (isHitQuestion && hitQuestionPhase === 'cannon' && boss && boss.width > 150) {
      cannonShots += 1;
      if (boss.cannonBalls === undefined) boss.cannonBalls = [];
      boss.cannonBalls.push({
        x: boss.cannonX + 40,
        y: boss.cannonY + 40,
        vx: 8,
      });
      if (cannonShots >= 5) {
        cannonRounds += 1;
        if (cannonRounds >= 5) {
          defeatBoss();
          return;
        } else {
          cannonShots = 0;
          questionText.textContent = `Round ${cannonRounds + 1}/5! Take cannon and shoot (Shot 1/5).`;
          currentQuestion = createQuestion();
          renderQuestion();
          return;
        }
      } else {
        questionText.textContent = `Good shot! (Round ${cannonRounds + 1}/5, Shot ${cannonShots + 1}/5).`;
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
      scoreValue.textContent = Math.floor(score);
      answerButtons.querySelectorAll('button').forEach((btn) => {
        btn.disabled = true;
      });
      restartBossFight();
      return;
    } else if (isHitQuestion && hitQuestionPhase === 'cannon') {
      questionText.textContent = 'Wrong! Try again.';
    } else {
      questionText.textContent = `Oops! The answer was ${currentQuestion.answer}.`;
    }
  }
  if (isHitQuestion && hitQuestionPhase === 'brick' && boss && boss.width <= 150 && choice === currentQuestion.answer) {
    boss.brickAnimation = {
      active: true,
      x: player.x + player.width,
      y: player.y + player.height / 2 - 8,
      width: 22,
      height: 12,
      speed: 14,
      rotation: 0,
    };
  }
  scoreValue.textContent = Math.floor(score);
  answerButtons.querySelectorAll('button').forEach((btn) => {
    btn.disabled = true;
  });
  setTimeout(() => {
    if (boss && boss.stage === 2 && boss.width <= 150 && boss.hits < 6) {
      currentQuestion = createQuestion();
      renderQuestion();
    } else if (boss && boss.stage === 2 && boss.width > 150 && cannonShots < 5) {
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
  scoreValue.textContent = Math.floor(score);
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

  if (isHitQuestion && hitQuestionPhase === 'cannon') {
    questionText.textContent = 'Cannon shot failed. Try again.';
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
  let obstacle = {
    x: gameWidth + 20,
    y: groundY - height,
    width: rand(20, 30),
    height,
  };
  if (level === 3) {
    // Level 3: polar bears and penguins
    const types = ['bear', 'penguin'];
    obstacle.type = types[Math.floor(Math.random() * types.length)];
  }
  obstacles.push(obstacle);
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
      startBossFight(1);
    }
    if (level === 2 && score >= 1500) {
      startBossFight(2);
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

  if (!boss) {
    score += deltaTime * 0.01;
  }
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

function startBossFight(bossLevel) {
  if (bossLevel === 1) {
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
  } else if (bossLevel === 2) {
    boss = {
      stage: 1,
      x: gameWidth - 200,
      y: groundY - 100,
      width: 160,
      height: 80,
      bulletTimer: 0,
      bullets: [],
      dodged: 0,
      hits: 0,
      brickAnimation: null,
      cannonX: gameWidth - 160,
      cannonY: groundY - 100,
      cannonBalls: [],
    };
    obstacles = [];
    cannonPhase = false;
    cannonShots = 0;
    cannonRounds = 0;
    currentQuestion = null;
    answerButtons.innerHTML = '';
    questionText.textContent = 'Desert Boss appears! Dodge the cannon symbols (22).';
  }
}

function spawnBossBullet() {
  const symbols = ['+', '-', '×', '÷'];
  const type = symbols[Math.floor(Math.random() * symbols.length)];
  let y = boss.y + rand(20, boss.height - 26);
  if (boss.width > 150) {
    // Level 2 boss: varied heights
    y = rand(60, groundY - 80);
  }
  boss.bullets.push({
    x: boss.x,
    y: y,
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
    if (boss.width > 150) {
      // Level 2 boss with cannon
      const dodgeTarget = 22;
      boss.bulletTimer += deltaTime;
      if (boss.bulletTimer > 800) {
        boss.bulletTimer = 0;
        spawnBossBullet();
      }
      boss.bullets.forEach((bullet) => {
        bullet.x += bullet.vx;
        if (!bullet.counted && bullet.x + bullet.width < player.x) {
          bullet.counted = true;
          boss.dodged += 1;
          if (boss.dodged >= dodgeTarget) {
            startCannonPhase();
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
    } else {
      // Level 1 boss
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
  } else if (boss.stage === 2 && boss.width <= 150) {
    // Level 1 brick phase
    if (boss.brickAnimation && boss.brickAnimation.active) {
      boss.brickAnimation.x += boss.brickAnimation.speed;
      boss.brickAnimation.rotation += 0.3;
      if (boss.brickAnimation.x > boss.x) {
        boss.brickAnimation.active = false;
      }
    }
  } else if (boss.stage === 2 && boss.width > 150) {
    // Level 2 cannon phase
    if (boss.cannonBalls) {
      boss.cannonBalls.forEach((ball) => {
        ball.x += ball.vx;
      });
      boss.cannonBalls = boss.cannonBalls.filter((ball) => ball.x < boss.x);
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
  if (boss.width <= 150) {
    // Level 1 brick phase
    boss.stage = 2;
    boss.bullets = [];
    isHitQuestion = true;
    hitQuestionPhase = 'brick';
    currentQuestion = createQuestion();
    questionText.textContent = `Boss is tired! Throw a brick (${boss.hits}/6).`;
    renderQuestion();
  }
}

function startCannonPhase() {
  if (!boss || boss.stage !== 1) return;
  boss.stage = 2;
  boss.bullets = [];
  cannonPhase = true;
  cannonShots = 0;
  cannonRounds = 0;
  isHitQuestion = true;
  hitQuestionPhase = 'cannon';
  currentQuestion = createQuestion();
  questionText.textContent = `Boss is tired! Take cannon and shoot (Round ${cannonRounds + 1}/5, Shot ${cannonShots + 1}/5).`;
  renderQuestion();
}

function defeatBoss() {
  if (level === 1) {
    boss = null;
    player.color = '#f08f00';
    questionText.textContent = 'Boss defeated! Prepare for the next choice.';
    answerButtons.innerHTML = '';
    isHitQuestion = false;
    hitQuestionPhase = null;
    cannonPhase = false;
    showLevelTransitionPrompt();
  } else if (level === 2) {
    boss = null;
    player.color = '#ffffff';
    level = 3;
    scrollSpeed = parseInt(speedSlider.value, 10) + 3;
    questionText.textContent = 'Desert Boss defeated! Welcome to the Snowy Lands!';
    answerButtons.innerHTML = '';
    isHitQuestion = false;
    hitQuestionPhase = null;
    cannonPhase = false;
    currentQuestion = createQuestion();
    renderQuestion();
  }
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

function drawObstacle(obstacle) {
  if (level === 1) {
    // Brown block
    ctx.fillStyle = '#6b5533';
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  } else if (level === 2) {
    // Brown block (same for desert)
    ctx.fillStyle = '#6b5533';
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  } else if (level === 3) {
    // Polar bear or penguin
    if (obstacle.type === 'bear') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      // Draw ears
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(obstacle.x + 8, obstacle.y - 5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(obstacle.x + obstacle.width - 8, obstacle.y - 5, 4, 0, Math.PI * 2);
      ctx.fill();
      // Draw eyes
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(obstacle.x + 10, obstacle.y + 8, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(obstacle.x + obstacle.width - 10, obstacle.y + 8, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (obstacle.type === 'penguin') {
      // Penguin (black and white)
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2 - 4, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2 + 2, 6, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(obstacle.x + obstacle.width / 2 - 4, obstacle.y + obstacle.height / 2 - 6, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(obstacle.x + obstacle.width / 2 + 4, obstacle.y + obstacle.height / 2 - 6, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, gameWidth, gameHeight);

  // Background and ground
  if (level === 1) {
    ctx.fillStyle = '#8ad3ff';
    ctx.fillRect(0, 0, gameWidth, gameHeight);
    ctx.fillStyle = '#85c1ef';
    ctx.fillRect(0, groundY, gameWidth, gameHeight - groundY);
  } else if (level === 2) {
    ctx.fillStyle = '#ffd598';
    ctx.fillRect(0, 0, gameWidth, gameHeight);
    ctx.fillStyle = '#e2b15a';
    ctx.fillRect(0, groundY, gameWidth, gameHeight - groundY);
  } else if (level === 3) {
    // Snowy lands
    ctx.fillStyle = '#e8f4f8';
    ctx.fillRect(0, 0, gameWidth, gameHeight);
    ctx.fillStyle = '#d0e8f0';
    ctx.fillRect(0, groundY, gameWidth, gameHeight - groundY);
  }

  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  obstacles.forEach((obstacle) => {
    drawObstacle(obstacle);
  });

  if (boss) {
    if (boss.width <= 150) {
      // Level 1 boss
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
    } else {
      // Level 2 boss - yellow with cannon
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
      // Draw cannon
      ctx.fillStyle = '#8B7500';
      ctx.beginPath();
      ctx.arc(boss.cannonX + 30, boss.cannonY + 35, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(boss.cannonX + 35, boss.cannonY + 25, 25, 10);
    }

    boss.bullets.forEach((bullet) => {
      ctx.fillStyle = '#000';
      ctx.font = 'bold 28px Arial';
      ctx.fillText(bullet.type, bullet.x, bullet.y + bullet.height - 6);
    });

    if (boss.width > 150 && boss.cannonBalls) {
      boss.cannonBalls.forEach((ball) => {
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (boss.brickAnimation && boss.brickAnimation.active) {
      ctx.save();
      const brickCenterX = boss.brickAnimation.x + boss.brickAnimation.width / 2;
      const brickCenterY = boss.brickAnimation.y + boss.brickAnimation.height / 2;
      ctx.translate(brickCenterX, brickCenterY);
      ctx.rotate(boss.brickAnimation.rotation);
      ctx.fillStyle = '#a0522d';
      ctx.fillRect(
        -boss.brickAnimation.width / 2,
        -boss.brickAnimation.height / 2,
        boss.brickAnimation.width,
        boss.brickAnimation.height
      );
      ctx.restore();
    }
  }

  // Draw cannon in player's hands during cannon phase
  if (cannonPhase && boss && boss.width > 150) {
    ctx.fillStyle = '#8B7500';
    ctx.beginPath();
    ctx.arc(player.x + player.width + 5, player.y + 10, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(player.x + player.width + 8, player.y + 6, 15, 6);
  }

  ctx.fillStyle = '#000000';
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
