/**
 * 敌人配置和波次系统
 */
const EnemyTypes = {
  // 普通蘑菇怪
  normal: {
    emoji: '🍄',
    hp: 1,
    speed: 1.5,
    score: 100,
    width: 34,
    height: 34,
    shootChance: 0,
  },
  // 快速幽灵
  fast: {
    emoji: '👻',
    hp: 1,
    speed: 3,
    score: 150,
    width: 30,
    height: 30,
    shootChance: 0,
  },
  // 坦克乌龟
  tank: {
    emoji: '🐢',
    hp: 5,
    speed: 0.8,
    score: 300,
    width: 42,
    height: 42,
    shootChance: 0.005,
  },
  // 蛇形仙人掌
  zigzag: {
    emoji: '🌵',
    hp: 2,
    speed: 1.8,
    score: 200,
    width: 32,
    height: 32,
    shootChance: 0,
    zigzag: true,
    zigzagAmp: 80,
    zigzagFreq: 0.03,
  },
  // 射手花
  shooter: {
    emoji: '🌸',
    hp: 3,
    speed: 1,
    score: 250,
    width: 38,
    height: 38,
    shootChance: 0.015,
    bulletEmoji: '🌺',
  },
  // BOSS 恶龙
  boss: {
    emoji: '🐉',
    hp: 50,
    speed: 0.5,
    score: 2000,
    width: 64,
    height: 64,
    shootChance: 0.03,
    bulletEmoji: '🔥',
    isBoss: true,
  },
};

/**
 * 波次生成配置
 */
function generateWave(waveNum) {
  const enemies = [];
  const difficulty = Math.min(waveNum, 30);

  // 每5波出Boss
  if (waveNum % 5 === 0) {
    enemies.push({
      type: 'boss',
      delay: 500,
      // Boss HP随波次增加
      hpMultiplier: 1 + (waveNum / 5 - 1) * 0.5,
    });
    // Boss波还有小兵
    const minionCount = Math.min(3 + Math.floor(waveNum / 5), 10);
    for (let i = 0; i < minionCount; i++) {
      enemies.push({
        type: ['normal', 'fast'][Math.floor(Math.random() * 2)],
        delay: 2000 + i * 800,
      });
    }
    return enemies;
  }

  // 普通波次
  const baseCount = 4 + Math.floor(difficulty * 0.8);
  const totalEnemies = Math.min(baseCount, 20);

  for (let i = 0; i < totalEnemies; i++) {
    let type;
    const roll = Math.random();

    if (waveNum <= 2) {
      // 前两波只有普通和快速
      type = roll < 0.7 ? 'normal' : 'fast';
    } else if (waveNum <= 4) {
      if (roll < 0.4) type = 'normal';
      else if (roll < 0.7) type = 'fast';
      else if (roll < 0.9) type = 'zigzag';
      else type = 'tank';
    } else {
      if (roll < 0.25) type = 'normal';
      else if (roll < 0.45) type = 'fast';
      else if (roll < 0.65) type = 'zigzag';
      else if (roll < 0.8) type = 'shooter';
      else type = 'tank';
    }

    enemies.push({
      type,
      delay: i * (600 - Math.min(difficulty * 15, 300)),
    });
  }

  return enemies;
}

window.EnemyTypes = EnemyTypes;
window.generateWave = generateWave;
