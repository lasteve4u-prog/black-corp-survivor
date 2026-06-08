// main.js - ゲームループ・シーン管理・モジュール統合
// ブラック企業サバイバー ～経営者ゾンビ殲滅戦～

import { Input } from './input.js';
import { Player } from './player.js';
import { createWave, MiddleManager, HarassingOfficer } from './enemy.js';
import { CEOBoss } from './boss.js';
import { Stage } from './stage.js';
import { ParticleSystem, ScreenShake, FlashEffect } from './effects.js';
import { AudioManager } from './audio.js';
import { drawItem } from './sprites.js';
import {
  drawHUD,
  drawTitleScreen,
  drawGameOver,
  drawVictory,
  drawAreaTitle,
  drawControls,
  drawPause,
  drawLevelUp,
} from './hud.js';

// =============================================================================
// 定数
// =============================================================================

const CANVAS_W = 960;
const CANVAS_H = 540;
const MAX_SCORE_RECORDS = 10;
const STORAGE_KEY = 'kill_game_scores';

const SCENE = {
  TITLE: 'title',
  CONTROLS: 'controls',
  PLAYING: 'playing',
  PAUSED: 'paused',
  LEVEL_UP: 'level_up',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
};

const LEVEL_UP_OPTIONS = [
  {
    label: 'HP Recovery',
    description: 'Restore 40 HP',
    symbol: '♥',
    color: '#FF6B6B',
    apply: (p) => p.heal(40),
  },
  {
    label: 'Attack UP',
    description: 'Damage +25% (stacks)',
    symbol: '⚔',
    color: '#FFD700',
    apply: (p) => { p.attackMultiplier += 0.25; },
  },
  {
    label: 'Skill Boost',
    description: 'Special cooldown -0.5s',
    symbol: '⚡',
    color: '#00FF00',
    apply: (p) => { p.specialCooldownMax = Math.max(1, p.specialCooldownMax - 0.5); },
  },
];

const AREA_NAMES = [
  'AREA 1: ENTRANCE',
  'AREA 2: OPEN FLOOR',
  'AREA 3: EXECUTIVE FLOOR',
  'AREA 4: BOSS AREA',
];

/** エリアごとのウェーブインデックス（createWave 引数） */
const AREA_WAVES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [],
];

const BOSS_SCORE = 5000;
const AREA_CLEAR_BONUS = 500;
let bossStartTime = 0;  // ボス戦開始時刻

// =============================================================================
// ゲーム状態
// =============================================================================

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const loadingScreen = document.getElementById('loading-screen');

let scene = SCENE.TITLE;
let blinkFrame = 0;
let lastTime = 0;
let audioInitialized = false;

// =============================================================================
// スコア記録管理
// =============================================================================

function loadScoreRecords() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn('Failed to load score records:', e);
    return [];
  }
}

function saveScoreRecord(score) {
  try {
    const records = loadScoreRecords();
    const now = new Date();
    const record = {
      score: Math.floor(score),
      date: now.toLocaleDateString('ja-JP'),
      time: now.toLocaleTimeString('ja-JP'),
    };
    records.push(record);
    // スコアを降順でソート（高い順）
    records.sort((a, b) => b.score - a.score);
    // 上位10個のみ保持
    records.splice(MAX_SCORE_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to save score record:', e);
  }
}

function getScoreRecords() {
  return loadScoreRecords();
}

// ゲームプレイオブジェクト
const stage = new Stage();
const particles = new ParticleSystem();
const screenShake = new ScreenShake();
const screenFlash = new FlashEffect();

let player = null;
let enemies = [];
let boss = null;
let items = [];

let currentWaveIndex = 0;
let wavesInArea = [];
let waveSpawned = false;
let waitingForWaveClear = false;

let areaTitleTimer = 0;
let areaTitleDuration = 2.0;
let areaTitleName = '';
let showingAreaTitle = false;

// レベルアップ
let pendingNextArea = 0;
let levelUpSelectedIdx = 0;

// H キー用（Input モジュール外）
const rawKeys = {};
const rawPrevKeys = {};

// =============================================================================
// エフェクト / オーディオ アダプター
// 各モジュールが期待する effects.emit / audio.play インターフェース
// =============================================================================

const effectsAdapter = {
  emit(x, y, type) {
    switch (type) {
      case 'hit':
        particles.addHitEffect(x, y);
        break;
      case 'death':
        particles.addDeathEffect(x, y);
        break;
      case 'damage':
        particles.addHitEffect(x, y, '#FF4444');
        screenShake.trigger(4, 0.15);
        break;
      case 'special':
        particles.addHitEffect(x, y, '#FFEE00');
        screenFlash.trigger('yellow', 0.2);
        screenShake.trigger(6, 0.2);
        break;
      case 'summon':
        particles.addItemEffect(x, y);
        break;
      case 'shockwave':
        particles.addDeathEffect(x, y);
        screenShake.trigger(12, 0.5);
        break;
      case 'explosion':
        particles.addDeathEffect(x, y);
        screenShake.trigger(8, 0.3);
        break;
      default:
        particles.addHitEffect(x, y);
    }
  },
  screenFlash(color) {
    if (typeof color === 'string' && color.includes('255, 0, 0')) {
      screenFlash.trigger('red', 0.3);
    } else {
      screenFlash.trigger('red', 0.3);
    }
  },
};

const audioAdapter = {
  play(name) {
    if (!audioInitialized) return;
    switch (name) {
      case 'hit':
        AudioManager.playHit();
        break;
      case 'playerHurt':
        AudioManager.playDamage();
        break;
      case 'special':
        AudioManager.playSpecial();
        break;
      case 'enemyDeath':
        AudioManager.playHit();
        break;
      case 'enemyHurt':
        AudioManager.playHit();
        break;
      case 'bossThrow':
        AudioManager.playHit();
        break;
      case 'bossSummon':
        AudioManager.playSpecial();
        break;
      case 'bossShockwave':
        AudioManager.playDamage();
        screenShake.trigger(12, 0.5);
        break;
      case 'bossDefeat':
        AudioManager.playBossDeath();
        break;
      case 'bossHurt':
        AudioManager.playHit();
        break;
      case 'explosion':
        AudioManager.playHit();
        break;
      case 'pickup':
        AudioManager.playPickup();
        break;
      default:
        break;
    }
  },
};

// =============================================================================
// 初期化
// =============================================================================

function init() {
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  Input.init();

  window.addEventListener('keydown', (e) => {
    rawKeys[e.code] = true;
  });
  window.addEventListener('keyup', (e) => {
    rawKeys[e.code] = false;
  });
  window.addEventListener('blur', () => {
    for (const key in rawKeys) rawKeys[key] = false;
  });

  scaleCanvas();
  window.addEventListener('resize', scaleCanvas);

  setTimeout(() => {
    loadingScreen.classList.add('hidden');
  }, 1600);

  requestAnimationFrame(gameLoop);
}

function scaleCanvas() {
  const aspect = CANVAS_W / CANVAS_H;
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const winAspect = winW / winH;

  if (winAspect > aspect) {
    canvas.style.width = `${winH * aspect}px`;
    canvas.style.height = `${winH}px`;
  } else {
    canvas.style.width = `${winW}px`;
    canvas.style.height = `${winW / aspect}px`;
  }
}

function initAudio() {
  if (audioInitialized) return;
  AudioManager.init();
  audioInitialized = true;
}

// =============================================================================
// シーン遷移
// =============================================================================

function startGame() {
  initAudio();
  AudioManager.startBGM(0); // AREA 0 のBGM

  scene = SCENE.PLAYING;
  stage.reset();

  player = new Player(150, 400);
  enemies = [];
  boss = null;
  items = [];
  bossStartTime = 0;

  currentWaveIndex = 0;
  wavesInArea = [...AREA_WAVES[0]];
  waveSpawned = false;
  waitingForWaveClear = false;
  showingAreaTitle = false;

  showAreaTitle(AREA_NAMES[0]);
  spawnNextWave();
}

function goToTitle() {
  AudioManager.stopBGM();
  scene = SCENE.TITLE;
  player = null;
  enemies = [];
  boss = null;
  items = [];
}

function showAreaTitle(name) {
  areaTitleName = name;
  areaTitleTimer = 0;
  areaTitleDuration = 2.0;
  showingAreaTitle = true;
}

// =============================================================================
// ウェーブ / エリア管理
// =============================================================================

function spawnNextWave() {
  if (stage.isBossArea) return;
  if (currentWaveIndex >= wavesInArea.length) {
    waveSpawned = true;
    waitingForWaveClear = false;
    return;
  }

  const waveNum = wavesInArea[currentWaveIndex];
  const spawned = createWave(waveNum);
  const baseX = player.x + CANVAS_W * 0.6;

  spawned.forEach((enemy, i) => {
    enemy.x = baseX + i * 70 + Math.random() * 120;
    enemy.y = 320 + Math.random() * 140;
  });

  enemies.push(...spawned);
  currentWaveIndex++;
  waveSpawned = true;
  waitingForWaveClear = true;
}

function spawnBoss() {
  const bounds = stage.getAreaBounds();
  boss = new CEOBoss(bounds.left + 520, 360);
  bossStartTime = Date.now();  // ボス戦開始時刻を記録
  initAudio();
  AudioManager.stopBGM();
  AudioManager.startBossBGM();
  AudioManager.playBossRoar();
  screenShake.trigger(10, 0.8);
}

function onAreaTransition(nextArea) {
  stage.areaTransitioning = true;
  stage.advanceToArea(nextArea);

  const bounds = stage.getAreaBounds();
  player.x = bounds.left + 80;

  if (stage.isBossArea) {
    enemies = [];
    spawnBoss();
    showAreaTitle(AREA_NAMES[nextArea]);
  } else {
    currentWaveIndex = 0;
    wavesInArea = [...AREA_WAVES[nextArea]];
    waveSpawned = false;
    waitingForWaveClear = false;
    showAreaTitle(AREA_NAMES[nextArea]);
    spawnNextWave();

    // エリアごとにBGMを切り替え
    AudioManager.stopBGM();
    AudioManager.startBGM(nextArea);
  }

  player.score += AREA_CLEAR_BONUS;

  setTimeout(() => {
    stage.areaTransitioning = false;
  }, 500);
}

function tryDropItem(x, y) {
  items.push({
    x: x + 10,
    y: y,
    type: Math.random() > 0.5 ? 'energy_drink' : 'onigiri',
    width: 24,
    height: 24,
    active: true,
  });
}

function dropMoneyItem(x, y) {
  items.push({
    x: x + 10,
    y: y,
    type: 'money',
    width: 24,
    height: 24,
    active: true,
  });
}

function checkWaveProgress() {
  if (stage.isBossArea || !waitingForWaveClear) return;

  const aliveEnemies = enemies.filter((e) => e.isAlive || !e.isDead);
  if (aliveEnemies.length === 0) {
    waitingForWaveClear = false;
    if (currentWaveIndex < wavesInArea.length) {
      spawnNextWave();
    }
  }
}

// =============================================================================
// 衝突判定
// =============================================================================

function aabbOverlap(a, b) {
  const aw = a.w !== undefined ? a.w : a.width;
  const ah = a.h !== undefined ? a.h : a.height;
  const bw = b.w !== undefined ? b.w : b.width;
  const bh = b.h !== undefined ? b.h : b.height;
  return (
    a.x < b.x + bw &&
    a.x + aw > b.x &&
    a.y < b.y + bh &&
    a.y + ah > b.y
  );
}

function getCombatTargets() {
  const targets = [...enemies];
  if (boss && boss.isAlive && !boss.isIntro) {
    targets.push(boss);
  }
  if (boss) {
    targets.push(...boss.summonedEnemies.filter((e) => e.isAlive));
  }
  return targets;
}

function checkEnemyAttacksOnPlayer() {
  if (!player.isAlive) return;

  const allEnemies = [...enemies];
  if (boss) {
    allEnemies.push(...boss.summonedEnemies);
  }

  for (const enemy of allEnemies) {
    if (!enemy.isAlive) continue;
    const atk = enemy.getAttackHitbox();
    if (atk && aabbOverlap(atk, player.getHitbox())) {
      player.takeDamage(enemy.damage, effectsAdapter, audioAdapter);
    }
  }
}

function checkEnemyProjectilesOnPlayer() {
  if (!player.isAlive) return;
  for (const enemy of enemies) {
    if (!enemy.projectiles) continue;
    for (const p of enemy.projectiles) {
      if (!p.active) continue;
      const ph = { x: p.x, y: p.y, w: p.width, h: p.height };
      if (aabbOverlap(ph, player.getHitbox())) {
        player.takeDamage(p.damage, effectsAdapter, audioAdapter);
        p.active = false;
      }
    }
  }
}

function checkBossAttacksOnPlayer() {
  if (!boss || !player.isAlive || boss.isIntro) return;

  const melee = boss.getAttackHitbox();
  if (melee && aabbOverlap(melee, player.getHitbox())) {
    player.takeDamage(melee.damage || 15, effectsAdapter, audioAdapter);
  }

  const shock = boss.getShockwaveHitbox();
  if (shock && aabbOverlap(shock, player.getHitbox())) {
    player.takeDamage(shock.damage || 25, effectsAdapter, audioAdapter);
    screenShake.trigger(10, 0.4);
  }

  for (const p of boss.projectiles) {
    if (!p.active) continue;
    const ph = { x: p.x, y: p.y, w: p.width, h: p.height };
    if (aabbOverlap(ph, player.getHitbox())) {
      player.takeDamage(p.damage, effectsAdapter, audioAdapter);
      p.active = false;
    }
  }
}

function checkItemPickups() {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (!item.active) {
      items.splice(i, 1);
      continue;
    }
    const ih = { x: item.x, y: item.y, w: item.width, h: item.height };
    if (aabbOverlap(ih, player.getHitbox())) {
      if (item.type === 'energy_drink') {
        player.heal(25);
      } else if (item.type === 'money') {
        player.maxHp += 20;
        player.heal(20);
      } else {
        player.heal(40);
      }
      effectsAdapter.emit(item.x + 12, item.y + 12, 'summon');
      audioAdapter.play('pickup');
      items.splice(i, 1);
    }
  }
}

function clampPlayerToArea() {
  const bounds = stage.getAreaBounds();
  player.x = Math.max(bounds.left, Math.min(bounds.right - player.width, player.x));
  player.y = Math.max(300, Math.min(480, player.y));
}

// =============================================================================
// 更新処理
// =============================================================================

function updateTitle(dt) {
  blinkFrame++;

  if (justPressedRaw('KeyH')) {
    scene = SCENE.CONTROLS;
    return;
  }

  if (Input.confirm) {
    initAudio();
    startGame();
  }
}

function updateControls() {
  blinkFrame++;
  if (Input.confirm) {
    scene = SCENE.TITLE;
  }
}

function updateLevelUp() {
  blinkFrame++;

  if (justPressedRaw('ArrowLeft') || justPressedRaw('KeyA')) {
    levelUpSelectedIdx = (levelUpSelectedIdx + 2) % 3;
    updateRawKeys();
    return;
  }
  if (justPressedRaw('ArrowRight') || justPressedRaw('KeyD')) {
    levelUpSelectedIdx = (levelUpSelectedIdx + 1) % 3;
    updateRawKeys();
    return;
  }
  if (justPressedRaw('Enter') || justPressedRaw('Space')) {
    LEVEL_UP_OPTIONS[levelUpSelectedIdx].apply(player);
    onAreaTransition(pendingNextArea);
    scene = SCENE.PLAYING;
    updateRawKeys();
    return;
  }

  updateRawKeys();
}

function updatePaused() {
  blinkFrame++;
  if (justPressedRaw('Escape') || justPressedRaw('KeyP')) {
    scene = SCENE.PLAYING;
    AudioManager.resumeBGM();
  }
  updateRawKeys();
}

function updatePlaying(dt) {
  blinkFrame++;

  if (justPressedRaw('Escape') || justPressedRaw('KeyP')) {
    scene = SCENE.PAUSED;
    AudioManager.pauseBGM();
    updateRawKeys();
    return;
  }

  // エリア名テロップ
  if (showingAreaTitle) {
    areaTitleTimer += dt;
    if (areaTitleTimer >= areaTitleDuration) {
      showingAreaTitle = false;
    }
  }

  const combatTargets = getCombatTargets();

  // プレイヤー更新
  player.update(dt, Input, combatTargets, effectsAdapter, audioAdapter);
  clampPlayerToArea();

  // ダッシュ残像
  if (player.isDashing && player.state === 'dash') {
    particles.addDashEffect(player.x + player.width / 2, player.y + player.height / 2);
  }

  // ステージスクロール
  stage.update(dt, player.x, CANVAS_W);

  // 敵更新
  for (const enemy of enemies) {
    enemy.update(dt, player.x, player.y, effectsAdapter, audioAdapter);
  }

  // ボス更新
  if (boss) {
    boss.update(dt, player.x, player.y, effectsAdapter, audioAdapter);
  }

  // 敵の攻撃判定
  checkEnemyAttacksOnPlayer();
  checkEnemyProjectilesOnPlayer();
  checkBossAttacksOnPlayer();

  // 死亡敵の掃除とウェーブ進行
  enemies = enemies.filter((e) => !e.isDead);
  checkWaveProgress();

  // 撃破時アイテムドロップ（フィルタ前に処理するため別途）
  dropItemsFromKills();

  // アイテム取得
  checkItemPickups();

  // エフェクト更新
  particles.update(dt);
  screenShake.update(dt);
  screenFlash.update(dt);

  // エリア遷移チェック
  if (!stage.areaTransitioning && !stage.isBossArea) {
    const transition = stage.checkAreaTransition(player.x);
    if (transition && transition.shouldTransition) {
      const aliveLeft = enemies.filter((e) => e.isAlive);
      if (aliveLeft.length === 0 && currentWaveIndex >= wavesInArea.length) {
        pendingNextArea = transition.nextArea;
        levelUpSelectedIdx = 0;
        scene = SCENE.LEVEL_UP;
        updateRawKeys();
        return;
      }
    }
  }

  // ボスエリア：右端まで進んだらボス戦開始（既にスポーン済み）
  if (stage.isBossArea && !boss) {
    spawnBoss();
  }

  // ゲーム終了判定
  if (!player.isAlive) {
    scene = SCENE.GAME_OVER;
    screenShake.trigger(8, 0.5);
    AudioManager.stopBGM();
    AudioManager.playFuneralBell();
    return;
  }

  if (boss && boss.isDefeated) {
    player.score += BOSS_SCORE;

    // タイムボーナス：90秒以内にクリアで追加ボーナス
    const bossElapsedSec = (Date.now() - bossStartTime) / 1000;
    if (bossElapsedSec < 90) {
      const timeBonus = Math.floor((90 - bossElapsedSec) * 50);
      player.score += timeBonus;
    }

    saveScoreRecord(player.score);
    scene = SCENE.VICTORY;
    screenFlash.trigger('gold', 0.8);
    screenShake.trigger(6, 0.6);
    AudioManager.stopBGM();
    AudioManager.startVictoryBGM();
  }

  Input.update();
  updateRawKeys();
}

/** 倒された敵からアイテムドロップ（スコアは player.js 側で加算済み） */
function dropItemsFromKills() {
  const allEnemies = [...enemies];
  if (boss) allEnemies.push(...boss.summonedEnemies);

  for (const enemy of allEnemies) {
    if (!enemy.isAlive && !enemy._itemDropped) {
      enemy._itemDropped = true;
      if (enemy instanceof MiddleManager || enemy instanceof HarassingOfficer) {
        dropMoneyItem(enemy.x, enemy.y);
      } else if (Math.random() < 0.15) {
        tryDropItem(enemy.x, enemy.y);
      }
    }
  }
}

function updateGameOver() {
  blinkFrame++;
  if (justPressedRaw('Enter')) {
    startGame();
  } else if (justPressedRaw('Escape')) {
    goToTitle();
  }
  Input.update();
  updateRawKeys();
}

function updateVictory() {
  blinkFrame++;
  if (justPressedRaw('Enter')) {
    goToTitle();
  }
  Input.update();
  updateRawKeys();
}

function update(dt) {
  switch (scene) {
    case SCENE.TITLE:
      updateTitle(dt);
      break;
    case SCENE.CONTROLS:
      updateControls();
      break;
    case SCENE.PLAYING:
      updatePlaying(dt);
      break;
    case SCENE.PAUSED:
      updatePaused();
      break;
    case SCENE.LEVEL_UP:
      updateLevelUp();
      break;
    case SCENE.GAME_OVER:
      updateGameOver();
      break;
    case SCENE.VICTORY:
      updateVictory();
      break;
  }

  if (scene === SCENE.TITLE || scene === SCENE.CONTROLS) {
    Input.update();
    updateRawKeys();
  }
}

// =============================================================================
// 描画処理
// =============================================================================

function drawPlaying() {
  const scrollX = stage.getScrollX();
  const shakeX = screenShake.offsetX;
  const shakeY = screenShake.offsetY;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // 背景（パララックスは Stage 内部で処理）
  stage.draw(ctx, CANVAS_W, CANVAS_H);

  // ワールド座標のエンティティ
  ctx.save();
  ctx.translate(-scrollX, 0);

  // Yソート（奥行き）
  const drawables = [];

  for (const enemy of enemies) {
    if (!enemy.isDead) drawables.push({ y: enemy.y, draw: () => enemy.draw(ctx) });
  }
  if (boss && !boss.isDefeated) {
    drawables.push({ y: boss.y, draw: () => boss.draw(ctx) });
  }
  for (const item of items) {
    if (item.active) {
      drawables.push({
        y: item.y,
        draw: () => drawItem(ctx, item.x, item.y, item.type),
      });
    }
  }
  if (player.isAlive) {
    drawables.push({ y: player.y, draw: () => player.draw(ctx) });
  }

  drawables.sort((a, b) => a.y - b.y);
  for (const d of drawables) d.draw();

  particles.draw(ctx);
  ctx.restore();

  ctx.restore();

  // HUD（スクリーン座標）
  const bossHud = boss && boss.isAlive ? boss : null;
  drawHUD(ctx, player, bossHud, CANVAS_W, CANVAS_H);

  // エリア名テロップ
  if (showingAreaTitle) {
    const progress = areaTitleTimer / areaTitleDuration;
    drawAreaTitle(ctx, CANVAS_W, CANVAS_H, areaTitleName, progress);
  }

  // 画面フラッシュ
  screenFlash.draw(ctx, CANVAS_W, CANVAS_H);
}

function draw() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  switch (scene) {
    case SCENE.TITLE:
      drawTitleScreen(ctx, CANVAS_W, CANVAS_H, blinkFrame, getScoreRecords());
      break;
    case SCENE.CONTROLS:
      drawControls(ctx, CANVAS_W, CANVAS_H);
      break;
    case SCENE.PLAYING:
      drawPlaying();
      break;
    case SCENE.PAUSED:
      drawPlaying();
      drawPause(ctx, CANVAS_W, CANVAS_H);
      break;
    case SCENE.LEVEL_UP:
      drawPlaying();
      drawLevelUp(ctx, CANVAS_W, CANVAS_H, LEVEL_UP_OPTIONS, levelUpSelectedIdx);
      break;
    case SCENE.GAME_OVER:
      drawPlaying();
      drawGameOver(ctx, CANVAS_W, CANVAS_H, player ? player.score : 0);
      break;
    case SCENE.VICTORY:
      drawPlaying();
      drawVictory(ctx, CANVAS_W, CANVAS_H, player ? player.score : 0);
      break;
  }
}

// =============================================================================
// ゲームループ
// =============================================================================

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

// =============================================================================
// ユーティリティ
// =============================================================================

function justPressedRaw(code) {
  return !!rawKeys[code] && !rawPrevKeys[code];
}

function updateRawKeys() {
  for (const key in rawKeys) {
    rawPrevKeys[key] = rawKeys[key];
  }
}

// =============================================================================
// 起動
// =============================================================================

init();
