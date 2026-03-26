/**
 * 超级可爱雷电射击 - 主游戏逻辑
 */
const { createApp, ref, reactive, computed, onMounted, onUnmounted, nextTick } = Vue;

const app = createApp({
  setup() {
    // ===== 游戏状态 =====
    const gameState = ref('start'); // start, playing, paused, gameover
    const showHelp = ref(false);
    const gameArea = ref(null);

    // ===== 分数和统计 =====
    const score = ref(0);
    const highScore = ref(parseInt(localStorage.getItem('cuteShooterHighScore') || '0'));
    const combo = ref(0);
    const comboFlash = ref(false);
    const maxCombo = ref(0);
    const comboTimer = ref(null);
    const wave = ref(0);
    const showWaveText = ref(false);
    const enemiesKilled = ref(0);
    const isNewRecord = ref(false);

    // ===== 玩家状态 =====
    const lives = ref(3);
    const maxLives = ref(5);
    const bombs = ref(2);
    const bombActive = ref(false);
    const playerX = ref(0);
    const playerY = ref(0);
    const playerHurt = ref(false);
    const invincible = ref(false);
    const hasShield = ref(false);
    const shieldTimer = ref(null);
    const fireLevel = ref(1); // 1-3
    const isBoosting = ref(false);

    // ===== 游戏对象 =====
    const playerBullets = reactive([]);
    const enemies = reactive([]);
    const enemyBullets = reactive([]);
    const powerups = reactive([]);
    const explosions = reactive([]);
    const scorePopups = reactive([]);
    const bgStars = reactive([]);
    const bgClouds = reactive([]);

    // ===== 游戏参数 =====
    const gameWidth = ref(0);
    const gameHeight = ref(0);
    const isMobile = ref(false);
    const keys = reactive({});
    let gameLoop = null;
    let shootTimer = null;
    let nextId = 0;
    let waveEnemies = [];
    let waveSpawnIndex = 0;
    let waveSpawnTimer = 0;
    let frameCount = 0;
    let lastTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchPlayerStartX = 0;
    let touchPlayerStartY = 0;
    const audio = new AudioManager();

    const getId = () => ++nextId;

    // ===== 计算属性 =====
    const playerStyle = computed(() => ({
      left: playerX.value + 'px',
      top: playerY.value + 'px',
    }));

    // ===== 初始化 =====
    function initGame() {
      const area = gameArea.value || document.getElementById('app');
      gameWidth.value = area ? area.clientWidth : window.innerWidth;
      gameHeight.value = area ? area.clientHeight : window.innerHeight;
      isMobile.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      // 初始化玩家位置
      playerX.value = gameWidth.value / 2 - 25;
      playerY.value = gameHeight.value - 100;

      // 重置状态
      score.value = 0;
      lives.value = 3;
      bombs.value = 2;
      fireLevel.value = 1;
      combo.value = 0;
      maxCombo.value = 0;
      wave.value = 0;
      enemiesKilled.value = 0;
      invincible.value = false;
      hasShield.value = false;
      isNewRecord.value = false;
      bombActive.value = false;

      playerBullets.length = 0;
      enemies.length = 0;
      enemyBullets.length = 0;
      powerups.length = 0;
      explosions.length = 0;
      scorePopups.length = 0;

      // 初始化背景
      initBackground();
    }

    function initBackground() {
      bgStars.length = 0;
      bgClouds.length = 0;

      for (let i = 0; i < 50; i++) {
        bgStars.push({
          id: getId(),
          x: Math.random() * gameWidth.value,
          y: Math.random() * gameHeight.value,
          size: 6 + Math.random() * 10,
          opacity: 0.3 + Math.random() * 0.7,
          twinkle: 1 + Math.random() * 3,
          speed: 0.2 + Math.random() * 0.5,
        });
      }

      for (let i = 0; i < 5; i++) {
        bgClouds.push({
          id: getId(),
          x: Math.random() * gameWidth.value,
          y: Math.random() * gameHeight.value,
          size: 30 + Math.random() * 30,
          opacity: 0.1 + Math.random() * 0.15,
          speed: 0.3 + Math.random() * 0.5,
        });
      }
    }

    // ===== 游戏流程 =====
    function startGame() {
      audio.init();
      gameState.value = 'playing';
      nextTick(() => {
        initGame();
        startWave();
        startGameLoop();
      });
    }

    function startWave() {
      wave.value++;
      showWaveText.value = true;
      audio.waveStart();
      setTimeout(() => { showWaveText.value = false; }, 2500);

      waveEnemies = generateWave(wave.value);
      waveSpawnIndex = 0;
      waveSpawnTimer = 0;
    }

    function togglePause() {
      if (gameState.value === 'playing') {
        gameState.value = 'paused';
        cancelAnimationFrame(gameLoop);
      } else if (gameState.value === 'paused') {
        gameState.value = 'playing';
        lastTime = performance.now();
        gameLoop = requestAnimationFrame(update);
      }
    }

    function gameOver() {
      gameState.value = 'gameover';
      cancelAnimationFrame(gameLoop);
      audio.gameOver();
      if (score.value > highScore.value) {
        highScore.value = score.value;
        localStorage.setItem('cuteShooterHighScore', score.value.toString());
        isNewRecord.value = true;
      }
    }

    function quitGame() {
      gameState.value = 'start';
      cancelAnimationFrame(gameLoop);
    }

    function goToMenu() {
      gameState.value = 'start';
    }

    // ===== 主循环 =====
    function startGameLoop() {
      lastTime = performance.now();
      gameLoop = requestAnimationFrame(update);
    }

    function update(timestamp) {
      if (gameState.value !== 'playing') return;

      const dt = Math.min((timestamp - lastTime) / 16.67, 3); // 标准化为60fps
      lastTime = timestamp;
      frameCount++;

      updatePlayer(dt);
      updateShooting();
      updateBullets(dt);
      updateEnemies(dt);
      updateEnemyBullets(dt);
      updatePowerups(dt);
      updateBackground(dt);
      spawnWaveEnemies(dt);
      checkCollisions();
      cleanupObjects();

      // 检查波次完成
      if (waveSpawnIndex >= waveEnemies.length && enemies.length === 0) {
        setTimeout(() => {
          if (gameState.value === 'playing') startWave();
        }, 1500);
        // 防止重复触发
        waveEnemies = [];
        waveSpawnIndex = 0;
      }

      gameLoop = requestAnimationFrame(update);
    }

    // ===== 玩家控制 =====
    function updatePlayer(dt) {
      const speed = 5 * dt;
      isBoosting.value = false;

      if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        playerX.value = Math.max(0, playerX.value - speed);
        isBoosting.value = true;
      }
      if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        playerX.value = Math.min(gameWidth.value - 50, playerX.value + speed);
        isBoosting.value = true;
      }
      if (keys['ArrowUp'] || keys['w'] || keys['W']) {
        playerY.value = Math.max(40, playerY.value - speed);
        isBoosting.value = true;
      }
      if (keys['ArrowDown'] || keys['s'] || keys['S']) {
        playerY.value = Math.min(gameHeight.value - 60, playerY.value + speed);
        isBoosting.value = true;
      }
    }

    function updateShooting() {
      // 键盘空格射击或手机自动射击
      if ((keys[' '] || isMobile.value) && frameCount % Math.max(4, 10 - fireLevel.value * 2) === 0) {
        shoot();
      }
    }

    function shoot() {
      const cx = playerX.value + 25;
      const cy = playerY.value;

      if (fireLevel.value >= 3) {
        audio.shootPower();
      } else {
        audio.shoot();
      }

      if (fireLevel.value === 1) {
        playerBullets.push({ id: getId(), x: cx - 4, y: cy - 10, speed: 10, level: 1, damage: 1 });
      } else if (fireLevel.value === 2) {
        playerBullets.push({ id: getId(), x: cx - 14, y: cy - 5, speed: 10, level: 2, damage: 1 });
        playerBullets.push({ id: getId(), x: cx + 6, y: cy - 5, speed: 10, level: 2, damage: 1 });
      } else {
        playerBullets.push({ id: getId(), x: cx - 4, y: cy - 15, speed: 11, level: 3, damage: 2 });
        playerBullets.push({ id: getId(), x: cx - 20, y: cy, speed: 10, level: 2, damage: 1, angle: -0.15 });
        playerBullets.push({ id: getId(), x: cx + 12, y: cy, speed: 10, level: 2, damage: 1, angle: 0.15 });
      }
    }

    // ===== 子弹更新 =====
    function updateBullets(dt) {
      for (const b of playerBullets) {
        b.y -= b.speed * dt;
        if (b.angle) {
          b.x += Math.sin(b.angle) * b.speed * dt;
        }
      }
    }

    // ===== 敌人 =====
    function spawnWaveEnemies(dt) {
      if (waveSpawnIndex >= waveEnemies.length) return;

      waveSpawnTimer += 16.67 * dt;
      const next = waveEnemies[waveSpawnIndex];

      if (waveSpawnTimer >= next.delay) {
        spawnEnemy(next);
        waveSpawnIndex++;
        waveSpawnTimer = 0;
      }
    }

    function spawnEnemy(config) {
      const template = EnemyTypes[config.type];
      const x = config.type === 'boss'
        ? gameWidth.value / 2 - template.width / 2
        : 20 + Math.random() * (gameWidth.value - template.width - 40);

      const hp = Math.ceil(template.hp * (config.hpMultiplier || 1));

      enemies.push({
        id: getId(),
        type: config.type,
        emoji: template.emoji,
        x,
        y: -template.height,
        hp,
        maxHp: hp,
        speed: template.speed,
        score: template.score,
        width: template.width,
        height: template.height,
        shootChance: template.shootChance,
        bulletEmoji: template.bulletEmoji,
        isBoss: template.isBoss || false,
        zigzag: template.zigzag || false,
        zigzagAmp: template.zigzagAmp || 0,
        zigzagFreq: template.zigzagFreq || 0,
        spawnX: x,
        time: 0,
        hitFlash: false,
      });
    }

    function updateEnemies(dt) {
      for (const e of enemies) {
        e.time += dt;

        // Boss特殊行为
        if (e.isBoss) {
          if (e.y < 60) {
            e.y += e.speed * dt;
          } else {
            // Boss左右移动
            e.x = gameWidth.value / 2 - e.width / 2 + Math.sin(e.time * 0.02) * (gameWidth.value * 0.3);
          }
        } else if (e.zigzag) {
          e.y += e.speed * dt;
          e.x = e.spawnX + Math.sin(e.time * e.zigzagFreq) * e.zigzagAmp;
        } else {
          e.y += e.speed * dt;
        }

        // 敌人射击
        if (e.shootChance > 0 && Math.random() < e.shootChance * dt) {
          const bx = e.x + e.width / 2;
          const by = e.y + e.height;

          if (e.isBoss) {
            // Boss发射多方向子弹
            for (let a = -0.5; a <= 0.5; a += 0.25) {
              enemyBullets.push({
                id: getId(),
                x: bx,
                y: by,
                vx: Math.sin(a) * 3,
                vy: 3,
                emoji: e.bulletEmoji || '🔴',
              });
            }
          } else {
            enemyBullets.push({
              id: getId(),
              x: bx,
              y: by,
              vx: 0,
              vy: 3 + Math.random(),
              emoji: e.bulletEmoji || '🔴',
            });
          }
        }

        // 边界限制
        e.x = Math.max(-10, Math.min(gameWidth.value - e.width + 10, e.x));
      }
    }

    function updateEnemyBullets(dt) {
      for (const b of enemyBullets) {
        b.x += (b.vx || 0) * dt;
        b.y += b.vy * dt;
      }
    }

    // ===== 道具 =====
    function spawnPowerup(x, y) {
      const roll = Math.random();
      let type, emoji;

      if (roll < 0.4) { type = 'power'; emoji = '⭐'; }
      else if (roll < 0.65) { type = 'health'; emoji = '❤️'; }
      else if (roll < 0.85) { type = 'shield'; emoji = '🛡️'; }
      else { type = 'bomb'; emoji = '💣'; }

      powerups.push({
        id: getId(),
        x, y, type, emoji,
        speed: 1.5,
      });
    }

    function updatePowerups(dt) {
      for (const p of powerups) {
        p.y += p.speed * dt;
      }
    }

    function collectPowerup(powerup) {
      audio.powerup();

      switch (powerup.type) {
        case 'power':
          fireLevel.value = Math.min(3, fireLevel.value + 1);
          addScorePopup(powerup.x, powerup.y, 'POWER UP!');
          break;
        case 'health':
          lives.value = Math.min(maxLives.value, lives.value + 1);
          addScorePopup(powerup.x, powerup.y, '❤️ +1');
          break;
        case 'shield':
          hasShield.value = true;
          clearTimeout(shieldTimer.value);
          shieldTimer.value = setTimeout(() => { hasShield.value = false; }, 8000);
          addScorePopup(powerup.x, powerup.y, 'SHIELD!');
          break;
        case 'bomb':
          bombs.value = Math.min(5, bombs.value + 1);
          addScorePopup(powerup.x, powerup.y, 'BOMB +1');
          break;
      }
    }

    // ===== 炸弹 =====
    function useBomb() {
      if (bombs.value <= 0 || bombActive.value) return;
      bombs.value--;
      bombActive.value = true;
      audio.bomb();

      // 消灭所有敌人子弹
      enemyBullets.length = 0;

      // 对所有敌人造成伤害
      for (const e of enemies) {
        e.hp -= e.isBoss ? 15 : 999;
        if (e.hp <= 0) {
          addExplosion(e.x + e.width / 2, e.y + e.height / 2, e.isBoss ? 80 : 40);
          score.value += e.score;
          enemiesKilled.value++;
          addScorePopup(e.x, e.y, e.score);
          if (Math.random() < 0.3) spawnPowerup(e.x, e.y);
        }
      }

      // 移除死亡敌人
      const alive = enemies.filter(e => e.hp > 0);
      enemies.length = 0;
      enemies.push(...alive);

      setTimeout(() => { bombActive.value = false; }, 800);
    }

    // ===== 碰撞检测 =====
    function checkCollisions() {
      const px = playerX.value;
      const py = playerY.value;
      const pw = 40;
      const ph = 40;
      const playerCx = px + 25;
      const playerCy = py + 20;
      const playerRadius = 15;

      // 子弹 vs 敌人
      for (let bi = playerBullets.length - 1; bi >= 0; bi--) {
        const b = playerBullets[bi];
        let hit = false;

        for (let ei = enemies.length - 1; ei >= 0; ei--) {
          const e = enemies[ei];

          if (b.x > e.x - 5 && b.x < e.x + e.width + 5 &&
              b.y > e.y - 5 && b.y < e.y + e.height + 5) {

            e.hp -= b.damage;
            e.hitFlash = true;
            setTimeout(() => { e.hitFlash = false; }, 80);
            audio.hit();
            hit = true;

            if (e.hp <= 0) {
              // 敌人死亡
              const expSize = e.isBoss ? 80 : 35;
              addExplosion(e.x + e.width / 2, e.y + e.height / 2, expSize);

              if (e.isBoss) {
                // Boss爆炸效果
                for (let i = 0; i < 8; i++) {
                  setTimeout(() => {
                    addExplosion(
                      e.x + Math.random() * e.width,
                      e.y + Math.random() * e.height,
                      30 + Math.random() * 30
                    );
                  }, i * 100);
                }
              }

              audio.explosion();

              // 连击
              combo.value++;
              comboFlash.value = true;
              setTimeout(() => { comboFlash.value = false; }, 300);
              maxCombo.value = Math.max(maxCombo.value, combo.value);
              clearTimeout(comboTimer.value);
              comboTimer.value = setTimeout(() => { combo.value = 0; }, 2000);

              const comboMultiplier = 1 + (combo.value - 1) * 0.1;
              const earnedScore = Math.floor(e.score * comboMultiplier);
              score.value += earnedScore;
              enemiesKilled.value++;
              addScorePopup(e.x, e.y, earnedScore);

              // 掉落道具
              const dropChance = e.isBoss ? 1 : 0.2;
              if (Math.random() < dropChance) {
                spawnPowerup(e.x + e.width / 2, e.y);
                if (e.isBoss) {
                  // Boss额外掉落
                  spawnPowerup(e.x + e.width / 2 - 30, e.y + 20);
                  spawnPowerup(e.x + e.width / 2 + 30, e.y + 20);
                }
              }

              enemies.splice(ei, 1);
            }
            break;
          }
        }

        if (hit) {
          playerBullets.splice(bi, 1);
        }
      }

      // 玩家 vs 敌人
      if (!invincible.value) {
        for (let ei = enemies.length - 1; ei >= 0; ei--) {
          const e = enemies[ei];
          const ecx = e.x + e.width / 2;
          const ecy = e.y + e.height / 2;
          const dist = Math.hypot(playerCx - ecx, playerCy - ecy);

          if (dist < playerRadius + e.width / 2 - 5) {
            if (hasShield.value) {
              hasShield.value = false;
              clearTimeout(shieldTimer.value);
              e.hp -= 3;
              if (e.hp <= 0) {
                addExplosion(e.x + e.width / 2, e.y + e.height / 2, 35);
                enemies.splice(ei, 1);
              }
            } else {
              takeDamage();
            }
            break;
          }
        }
      }

      // 玩家 vs 敌人子弹
      if (!invincible.value) {
        for (let bi = enemyBullets.length - 1; bi >= 0; bi--) {
          const b = enemyBullets[bi];
          const dist = Math.hypot(playerCx - b.x, playerCy - b.y);

          if (dist < playerRadius + 8) {
            enemyBullets.splice(bi, 1);
            if (hasShield.value) {
              hasShield.value = false;
              clearTimeout(shieldTimer.value);
            } else {
              takeDamage();
            }
            break;
          }
        }
      }

      // 玩家 vs 道具
      for (let pi = powerups.length - 1; pi >= 0; pi--) {
        const p = powerups[pi];
        const dist = Math.hypot(playerCx - (p.x + 14), playerCy - (p.y + 14));

        if (dist < playerRadius + 18) {
          collectPowerup(p);
          powerups.splice(pi, 1);
        }
      }
    }

    function takeDamage() {
      lives.value--;
      playerHurt.value = true;
      audio.playerHit();
      setTimeout(() => { playerHurt.value = false; }, 300);

      // 降低火力
      fireLevel.value = Math.max(1, fireLevel.value - 1);

      if (lives.value <= 0) {
        gameOver();
        return;
      }

      // 无敌时间
      invincible.value = true;
      setTimeout(() => { invincible.value = false; }, 2000);
    }

    // ===== 效果 =====
    function addExplosion(x, y, size) {
      const emojis = ['💥', '✨', '🌟', '💫', '⚡'];
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const exp = { id: getId(), x: x - size / 2, y: y - size / 2, size, emoji };
      explosions.push(exp);
      setTimeout(() => {
        const idx = explosions.indexOf(exp);
        if (idx >= 0) explosions.splice(idx, 1);
      }, 500);
    }

    function addScorePopup(x, y, value) {
      const popup = { id: getId(), x, y, score: value };
      scorePopups.push(popup);
      setTimeout(() => {
        const idx = scorePopups.indexOf(popup);
        if (idx >= 0) scorePopups.splice(idx, 1);
      }, 800);
    }

    // ===== 背景更新 =====
    function updateBackground(dt) {
      for (const star of bgStars) {
        star.y += star.speed * dt;
        if (star.y > gameHeight.value) {
          star.y = -10;
          star.x = Math.random() * gameWidth.value;
        }
      }
      for (const cloud of bgClouds) {
        cloud.y += cloud.speed * dt;
        if (cloud.y > gameHeight.value + 50) {
          cloud.y = -60;
          cloud.x = Math.random() * gameWidth.value;
        }
      }
    }

    // ===== 清理 =====
    function cleanupObjects() {
      // 清除出界对象
      for (let i = playerBullets.length - 1; i >= 0; i--) {
        const b = playerBullets[i];
        if (b.y < -20 || b.x < -20 || b.x > gameWidth.value + 20) {
          playerBullets.splice(i, 1);
        }
      }

      for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].y > gameHeight.value + 60) {
          enemies.splice(i, 1);
        }
      }

      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        if (b.y > gameHeight.value + 20 || b.y < -20 || b.x < -20 || b.x > gameWidth.value + 20) {
          enemyBullets.splice(i, 1);
        }
      }

      for (let i = powerups.length - 1; i >= 0; i--) {
        if (powerups[i].y > gameHeight.value + 40) {
          powerups.splice(i, 1);
        }
      }
    }

    // ===== 触摸控制 =====
    function onTouchStart(e) {
      e.preventDefault();
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchPlayerStartX = playerX.value;
      touchPlayerStartY = playerY.value;
    }

    function onTouchMove(e) {
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      let newX = touchPlayerStartX + dx;
      let newY = touchPlayerStartY + dy;

      newX = Math.max(0, Math.min(gameWidth.value - 50, newX));
      newY = Math.max(40, Math.min(gameHeight.value - 60, newY));

      playerX.value = newX;
      playerY.value = newY;
      isBoosting.value = true;
    }

    function onTouchEnd(e) {
      e.preventDefault();
      isBoosting.value = false;
    }

    // ===== 键盘控制 =====
    function onKeyDown(e) {
      keys[e.key] = true;
      if (e.key === 'z' || e.key === 'Z') {
        useBomb();
      }
      if (e.key === 'Escape') {
        if (gameState.value === 'playing' || gameState.value === 'paused') {
          togglePause();
        }
      }
      // 阻止空格滚动页面
      if (e.key === ' ') e.preventDefault();
    }

    function onKeyUp(e) {
      keys[e.key] = false;
    }

    // ===== 窗口大小变化 =====
    function onResize() {
      const area = gameArea.value || document.getElementById('app');
      if (area) {
        gameWidth.value = area.clientWidth;
        gameHeight.value = area.clientHeight;
      }
    }

    // ===== 生命周期 =====
    onMounted(() => {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('resize', onResize);
      onResize();
      isMobile.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    });

    onUnmounted(() => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(gameLoop);
    });

    return {
      // 状态
      gameState, showHelp, gameArea,
      score, highScore, combo, comboFlash, maxCombo,
      wave, showWaveText, enemiesKilled, isNewRecord,
      lives, maxLives, bombs, bombActive,
      playerX, playerY, playerHurt, invincible,
      hasShield, fireLevel, isBoosting, isMobile,
      // 对象
      playerBullets, enemies, enemyBullets,
      powerups, explosions, scorePopups,
      bgStars, bgClouds,
      // 计算属性
      playerStyle,
      // 方法
      startGame, togglePause, useBomb, quitGame, goToMenu,
      onTouchStart, onTouchMove, onTouchEnd,
    };
  },
});

app.mount('#app');
