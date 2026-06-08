// =============================================================================
// hud.js - HUD（ヘッドアップディスプレイ）とメニュー画面描画
// ブラック企業サバイバー ～経営者ゾンビ殲滅戦～
// =============================================================================

/**
 * ゲーム中のHUD描画
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ hp: number, maxHp: number, score: number, combo: number, comboMultiplier: number }} player
 * @param {{ hp: number, maxHp: number, phase: number, isAlive: boolean }|null} boss
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
export function drawHUD(ctx, player, boss, canvasWidth, canvasHeight) {
  ctx.save();

  // === プレイヤーHP ===
  _drawPlayerHP(ctx, player, canvasWidth, canvasHeight);

  // === スコア ===
  _drawScore(ctx, player.score, canvasWidth);

  // === コンボ ===
  if (player.combo > 1) {
    _drawCombo(ctx, player.combo, player.comboMultiplier, canvasWidth, canvasHeight);
  }

  // === ボスHP ===
  if (boss && boss.isAlive) {
    _drawBossHP(ctx, boss, canvasWidth);
  }

  ctx.restore();
}

/**
 * タイトル画面描画
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {number} blinkFrame - 点滅用フレームカウンター
 */
export function drawTitleScreen(ctx, canvasWidth, canvasHeight, blinkFrame, scoreRecords = []) {
  ctx.save();

  // === 背景: 暗いオフィスのシルエット ===
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  bgGrad.addColorStop(0, '#050510');
  bgGrad.addColorStop(0.3, '#0a0a20');
  bgGrad.addColorStop(0.6, '#101030');
  bgGrad.addColorStop(1, '#080818');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // ビルのシルエット
  _drawCityScape(ctx, canvasWidth, canvasHeight);

  // 赤いビネット効果
  const vignette = ctx.createRadialGradient(
    canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.2,
    canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.9,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(30, 0, 0, 0.5)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // === タイトルロゴ ===
  const titleY = canvasHeight * 0.25;

  // 強化されたグロー効果
  const glowPulse = Math.sin(blinkFrame * 0.03) * 0.4 + 0.6;
  ctx.shadowColor = `rgba(255, 80, 80, ${0.8 * glowPulse})`;
  ctx.shadowBlur = 50;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // メインタイトル（より大きく）
  ctx.font = 'bold 72px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 縁取り（より太く）
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#330000';
  ctx.strokeText('BLACK CORP SURVIVOR', canvasWidth / 2, titleY);
  // 本体（より鮮やかなグラデーション）
  const titleGrad = ctx.createLinearGradient(0, titleY - 36, 0, titleY + 36);
  titleGrad.addColorStop(0, '#ff1a1a');
  titleGrad.addColorStop(0.5, '#ff6060');
  titleGrad.addColorStop(1, '#dd0000');
  ctx.fillStyle = titleGrad;
  ctx.fillText('BLACK CORP SURVIVOR', canvasWidth / 2, titleY);

  ctx.shadowBlur = 0;

  // サブタイトル
  ctx.font = 'bold 28px monospace';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#000000';
  ctx.strokeText('~ ZOMBIE EXECUTIVE EXTERMINATION ~', canvasWidth / 2, titleY + 65);
  ctx.fillStyle = '#ffcccc';
  ctx.fillText('~ ZOMBIE EXECUTIVE EXTERMINATION ~', canvasWidth / 2, titleY + 65);

  // 装飾ライン（より目立つ）
  const lineW = 400;
  const lineGrad = ctx.createLinearGradient(
    canvasWidth / 2 - lineW / 2, 0,
    canvasWidth / 2 + lineW / 2, 0,
  );
  lineGrad.addColorStop(0, 'rgba(255, 30, 30, 0)');
  lineGrad.addColorStop(0.2, 'rgba(255, 80, 80, 0.8)');
  lineGrad.addColorStop(0.5, 'rgba(255, 150, 150, 1)');
  lineGrad.addColorStop(0.8, 'rgba(255, 80, 80, 0.8)');
  lineGrad.addColorStop(1, 'rgba(255, 30, 30, 0)');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(canvasWidth / 2 - lineW / 2, titleY + 95, lineW, 3);
  ctx.fillRect(canvasWidth / 2 - lineW / 2, titleY - 48, lineW, 3);

  // === PRESS ENTER TO START（点滅・センター）===
  const blink = Math.sin(blinkFrame * 0.08) > 0;
  if (blink) {
    ctx.font = 'bold 22px monospace';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.strokeText('PRESS ENTER TO START', canvasWidth / 2, canvasHeight * 0.55);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('PRESS ENTER TO START', canvasWidth / 2, canvasHeight * 0.55);
  }

  // === PRESS H FOR CONTROLS ===
  ctx.font = '14px monospace';
  ctx.fillStyle = 'rgba(180, 180, 200, 0.7)';
  ctx.textAlign = 'center';
  ctx.fillText('PRESS  H  FOR  CONTROLS', canvasWidth / 2, canvasHeight * 0.62);

  // === スコア記録（センター揃え）===
  if (scoreRecords && scoreRecords.length > 0) {
    // パネルサイズと位置（センター配置・コンパクト化）
    const panelW = canvasWidth * 0.45;
    const panelH = canvasHeight * 0.22;
    const panelX = (canvasWidth - panelW) / 2;
    const panelY = canvasHeight * 0.68;

    // スコアセクションの背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = '#ff6060';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    // タイトル（中央揃え）
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ff6060';
    ctx.textAlign = 'center';
    ctx.fillText('BEST SCORES', canvasWidth / 2, panelY + 18);

    // スコアレコード（センター配置）
    const recordY = panelY + 40;
    const recordH = 16;
    const cx = canvasWidth / 2;
    for (let i = 0; i < Math.min(5, scoreRecords.length); i++) {
      const record = scoreRecords[i];
      const y = recordY + i * recordH;

      // 順位とスコア（右寄せで揃える）
      ctx.font = i === 0 ? 'bold 12px monospace' : '11px monospace';
      ctx.fillStyle = i === 0 ? '#ffff00' : '#c0c0ff';
      ctx.textAlign = 'right';
      const scoreStr = String(record.score).padStart(6, ' ');
      ctx.fillText(`${i + 1}. ${scoreStr}`, cx - 10, y);

      // 日時（左寄せで揃える）
      ctx.font = '10px monospace';
      ctx.fillStyle = i === 0 ? '#ffdd88' : 'rgba(192, 192, 255, 0.6)';
      ctx.textAlign = 'left';
      ctx.fillText(`${record.date} ${record.time}`, cx + 10, y);
    }
  }

  // textAlign をリセット
  ctx.textAlign = 'center';

  // === クレジット（一番下に1行で配置）===
  ctx.font = '11px monospace';
  ctx.fillStyle = 'rgba(120, 120, 150, 0.5)';
  ctx.fillText('© 2026 BLACK CORP SURVIVOR PROJECT — ALL RIGHTS RESERVED', canvasWidth / 2, canvasHeight * 0.97);

  ctx.restore();
}

/**
 * ゲームオーバー画面描画
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {number} score
 */
export function drawGameOver(ctx, canvasWidth, canvasHeight, score) {
  ctx.save();

  const cx = canvasWidth / 2;
  const t  = Date.now() * 0.001;

  // ── 背景（モノクロ：黒からグレー） ──
  const bg = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  bg.addColorStop(0,   '#0a0a0a');
  bg.addColorStop(0.5, '#1a1a1a');
  bg.addColorStop(1,   '#050505');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 細かい横線（走査線風）
  ctx.fillStyle = 'rgba(100, 100, 100, 0.02)';
  for (let y = 0; y < canvasHeight; y += 4) {
    ctx.fillRect(0, y, canvasWidth, 2);
  }

  // ── 日本式告別式祭壇 ──
  _drawBuddhistAltar(ctx, cx, canvasHeight * 0.58, t);

  // ── GAME OVER テキスト（モノクロ） ──
  const titleY = canvasHeight * 0.13;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 54px monospace';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
  ctx.shadowBlur = 20;
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#000';
  ctx.strokeText('GAME  OVER', cx, titleY);
  const goGrad = ctx.createLinearGradient(0, titleY - 28, 0, titleY + 28);
  goGrad.addColorStop(0, '#e8e8e8');
  goGrad.addColorStop(0.5, '#b0b0b0');
  goGrad.addColorStop(1, '#808080');
  ctx.fillStyle = goGrad;
  ctx.fillText('GAME  OVER', cx, titleY);
  ctx.shadowBlur = 0;

  // フレーバーテキスト
  ctx.font = '15px monospace';
  ctx.fillStyle = 'rgba(180, 180, 180, 0.7)';
  ctx.fillText('Rest in peace...', cx, titleY + 46);

  // ── スコア ──
  _drawScorePanel(ctx, canvasWidth, canvasHeight, score, canvasHeight * 0.73);

  // ── 操作案内（点滅） ──
  const blink = Math.sin(t * 2.8) > 0;
  if (blink) {
    ctx.font = 'bold 16px monospace';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';
    ctx.strokeText('PRESS ENTER TO RETRY', cx, canvasHeight * 0.85);
    ctx.fillStyle = '#dddddd';
    ctx.fillText('PRESS ENTER TO RETRY', cx, canvasHeight * 0.85);

    ctx.font = '14px monospace';
    ctx.strokeText('PRESS ESC TO TITLE', cx, canvasHeight * 0.92);
    ctx.fillStyle = 'rgba(180, 160, 210, 0.8)';
    ctx.fillText('PRESS ESC TO TITLE', cx, canvasHeight * 0.92);
  }

  ctx.restore();
}

function _drawBuddhistAltar(ctx, cx, baseY, t) {
  // ── 祭壇の背景（黒い幕） ──
  ctx.fillStyle = 'rgba(15, 15, 15, 0.95)';
  ctx.fillRect(cx - 160, baseY - 180, 320, 200);
  // グレーの枠線
  ctx.strokeStyle = '#808080';
  ctx.lineWidth = 3;
  ctx.strokeRect(cx - 160, baseY - 180, 320, 200);

  // ── 3段の祭壇 ──
  _drawAltarTier(ctx, cx - 100, baseY,      140, 30, 0); // 下段
  _drawAltarTier(ctx, cx - 75,  baseY - 40, 150, 28, 1); // 中段
  _drawAltarTier(ctx, cx - 50,  baseY - 78, 100, 26, 2); // 上段

  // ── 遺影（中央上）：主人公のドット絵 ──
  const portraitX = cx;
  const portraitY = baseY - 130;
  // 額縁（金色）
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(portraitX - 28, portraitY - 38, 56, 52);
  // 内側の黒
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(portraitX - 24, portraitY - 34, 48, 44);
  // 主人公のドット絵（P=2で描画、キャラを枠内中央に配置）
  const P = 2;
  // キャラ全体の幅16P=32px、高さ21P=42px → 中央揃えの起点
  const ox = portraitX - 8 * P;
  const oy = portraitY - 28;

  // 髪
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(ox + 4 * P, oy + 0,     8 * P, 2 * P);
  ctx.fillRect(ox + 3 * P, oy + 2 * P, 10 * P, 3 * P);
  // ポニーテール
  ctx.fillRect(ox + 12 * P, oy + 2 * P, 2 * P, 2 * P);
  ctx.fillRect(ox + 13 * P, oy + 4 * P, 1 * P, 3 * P);
  ctx.fillStyle = '#CD853F';
  ctx.fillRect(ox + 5 * P, oy + 1 * P, 1 * P, 1 * P);

  // 顔
  ctx.fillStyle = '#FFDAB9';
  ctx.fillRect(ox + 4 * P, oy + 5 * P, 8 * P, 5 * P);
  ctx.fillStyle = '#E8C4A0';
  ctx.fillRect(ox + 4 * P, oy + 8 * P, 8 * P, 2 * P);

  // 目
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(ox + 5 * P, oy + 6 * P, 1 * P, 1 * P);
  ctx.fillRect(ox + 9 * P, oy + 6 * P, 1 * P, 1 * P);
  ctx.fillStyle = '#2E86DE';
  ctx.fillRect(ox + 6 * P, oy + 6 * P, 1 * P, 1 * P);
  ctx.fillRect(ox + 10 * P, oy + 6 * P, 1 * P, 1 * P);

  // 口
  ctx.fillStyle = '#E55B3C';
  ctx.fillRect(ox + 7 * P, oy + 8 * P, 1 * P, 1 * P);

  // 首
  ctx.fillStyle = '#FFDAB9';
  ctx.fillRect(ox + 6 * P, oy + 10 * P, 4 * P, 1 * P);

  // スーツジャケット
  ctx.fillStyle = '#1A1A2E';
  ctx.fillRect(ox + 3 * P, oy + 11 * P, 2 * P, 5 * P);
  ctx.fillRect(ox + 11 * P, oy + 11 * P, 2 * P, 5 * P);
  ctx.fillRect(ox + 5 * P, oy + 13 * P, 6 * P, 3 * P);

  // シャツ
  ctx.fillStyle = '#F0F0F0';
  ctx.fillRect(ox + 5 * P, oy + 11 * P, 6 * P, 2 * P);

  // 光沢（フレーム左上）
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(portraitX - 22, portraitY - 32, 10, 16);

  // ── 中央のろうそく（火が揺らぐ） ──
  _drawCentralCandle(ctx, cx, baseY - 45, t);

  // ── 左右の線香立て ──
  _drawIncenseStand(ctx, cx - 80, baseY - 30, t, 0);
  _drawIncenseStand(ctx, cx + 80, baseY - 30, t, 1.8);

  // ── 献花台（白い花がたくさん） ──
  _drawFlowerOffering(ctx, cx - 120, baseY + 5, t, 0);
  _drawFlowerOffering(ctx, cx + 120, baseY + 5, t, 1.4);

  // ── 供物（果物） ──
  _drawOffering(ctx, cx - 50, baseY + 8);
  _drawOffering(ctx, cx + 50, baseY + 8);
}

function _drawAltarTier(ctx, x, y, w, h, tier) {
  // 祭壇の段（モノクロ）
  const grad = ctx.createLinearGradient(x, y - h, x, y);
  grad.addColorStop(0, '#505050');
  grad.addColorStop(0.5, '#606060');
  grad.addColorStop(1, '#404040');
  ctx.fillStyle = grad;
  ctx.fillRect(x - w / 2, y - h, w, h);

  // 枠線
  ctx.strokeStyle = '#707070';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2, y - h, w, h);

  // グレーの装飾ライン
  if (tier === 1) {
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y - h + 4);
    ctx.lineTo(x + w / 2, y - h + 4);
    ctx.stroke();
  }
}

function _drawCentralCandle(ctx, x, y, t) {
  const flicker = 0.7 + Math.sin(t * 8.3) * 0.2 + Math.sin(t * 13) * 0.1;

  // ろうそく本体（モノクロ）
  const cW = 10, cH = 50;
  const candleGrad = ctx.createLinearGradient(x - cW / 2, y - cH, x + cW / 2, y - cH);
  candleGrad.addColorStop(0,   '#e0e0e0');
  candleGrad.addColorStop(0.5, '#f0f0f0');
  candleGrad.addColorStop(1,   '#c0c0c0');
  ctx.fillStyle = candleGrad;
  ctx.fillRect(x - cW / 2, y - cH, cW, cH);

  // 芯
  ctx.strokeStyle = '#505050';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - cH);
  ctx.lineTo(x + 0.5, y - cH - 8);
  ctx.stroke();

  // 炎のグロー（モノクロ：白いグロー）
  const glowR = ctx.createRadialGradient(x, y - cH - 10, 0, x, y - cH - 5, 35);
  glowR.addColorStop(0,   `rgba(255, 255, 255, ${0.4 * flicker})`);
  glowR.addColorStop(0.5, `rgba(200, 200, 200, ${0.2 * flicker})`);
  glowR.addColorStop(1,   'rgba(100, 100, 100, 0)');
  ctx.fillStyle = glowR;
  ctx.fillRect(x - 35, y - cH - 40, 70, 50);

  // 炎（モノクロ：グレースケール）
  const fH = 18 * flicker;
  const fW = 7 * flicker;
  ctx.beginPath();
  ctx.moveTo(x, y - cH - fH);
  ctx.quadraticCurveTo(x + fW,     y - cH - fH * 0.3, x + fW * 0.2, y - cH);
  ctx.lineTo(x - fW * 0.2, y - cH);
  ctx.quadraticCurveTo(x - fW,     y - cH - fH * 0.3, x, y - cH - fH);
  const flameGrad = ctx.createLinearGradient(x, y - cH - fH, x, y - cH);
  flameGrad.addColorStop(0,   '#ffffff');
  flameGrad.addColorStop(0.3, '#e0e0e0');
  flameGrad.addColorStop(0.7, '#b0b0b0');
  flameGrad.addColorStop(1,   '#808080');
  ctx.fillStyle = flameGrad;
  ctx.fill();
}

function _drawIncenseStand(ctx, x, y, t, phase) {
  // 線香立て（モノクロ：グレー）
  ctx.fillStyle = '#606060';
  ctx.fillRect(x - 4, y, 8, 28);
  ctx.strokeStyle = '#707070';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 4, y, 8, 28);

  // 線香（3本）
  for (let i = -1; i <= 1; i++) {
    const sx = x + i * 3;
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, y);
    ctx.lineTo(sx, y - 16);
    ctx.stroke();
    // 煙
    _drawIncenseSmoke(ctx, sx, y - 18, t, phase + i * 0.3);
  }
}

function _drawFlowerOffering(ctx, x, y, t, phase) {
  // 献花台の白い花がたくさん
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + t + phase;
    const r = 12 + Math.sin(t + i) * 3;
    const fx = x + Math.cos(angle) * r;
    const fy = y + Math.sin(angle) * r * 0.6;
    _drawWhiteFlower(ctx, fx, fy);
  }
  // 中央の葉（グレー）
  ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

function _drawWhiteFlower(ctx, x, y) {
  const petals = 5;
  ctx.fillStyle = 'rgba(240, 240, 240, 0.8)';
  for (let i = 0; i < petals; i++) {
    const angle = (i / petals) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(
      x + Math.cos(angle) * 4,
      y + Math.sin(angle) * 4,
      2.5, 4,
      angle, 0, Math.PI * 2,
    );
    ctx.fill();
  }
  // 花心（グレー）
  ctx.fillStyle = '#c0c0c0';
  ctx.beginPath();
  ctx.arc(x, y, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function _drawOffering(ctx, x, y) {
  // 供物（グレーの円）
  ctx.fillStyle = '#909090';
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#707070';
  ctx.lineWidth = 1;
  ctx.stroke();
  // 葉（グレー）
  ctx.fillStyle = '#808080';
  ctx.beginPath();
  ctx.ellipse(x + 4, y - 4, 3, 2, 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function _drawIncenseSmoke(ctx, x, baseY, t, phase) {
  ctx.save();
  for (let i = 0; i < 10; i++) {
    const prog  = ((t * 0.25 + phase + i * 0.1) % 1.0);
    const sy    = baseY - prog * 90;
    const sx    = x + Math.sin(t * 1.8 + phase + i * 1.1) * 9 * prog;
    const alpha = (1 - prog) * 0.22;
    const size  = 2 + prog * 7;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 200, 200, ${alpha})`;
    ctx.fill();
  }
  ctx.restore();
}

/**
 * 勝利画面描画
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {number} score
 */
export function drawVictory(ctx, canvasWidth, canvasHeight, score) {
  ctx.save();

  // 金色のグラデーションオーバーレイ
  const overlay = ctx.createRadialGradient(
    canvasWidth / 2, canvasHeight * 0.35, 30,
    canvasWidth / 2, canvasHeight * 0.35, canvasHeight,
  );
  overlay.addColorStop(0, 'rgba(60, 50, 10, 0.8)');
  overlay.addColorStop(0.3, 'rgba(40, 30, 5, 0.85)');
  overlay.addColorStop(1, 'rgba(10, 8, 2, 0.95)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // パーティクル風の輝き
  const time = Date.now() * 0.001;
  for (let i = 0; i < 20; i++) {
    const px = canvasWidth / 2 + Math.sin(time * 0.5 + i * 1.3) * 300;
    const py = canvasHeight * 0.3 + Math.cos(time * 0.7 + i * 0.9) * 150;
    const size = 2 + Math.sin(time + i) * 1.5;
    const alpha = 0.1 + Math.sin(time * 2 + i * 0.5) * 0.08;
    ctx.fillStyle = `rgba(255, 220, 80, ${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }

  const centerY = canvasHeight * 0.3;

  // VICTORY テキスト
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // グロー
  ctx.shadowColor = 'rgba(255, 200, 50, 0.8)';
  ctx.shadowBlur = 50;

  ctx.font = 'bold 72px monospace';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#000000';
  ctx.strokeText('VICTORY!', canvasWidth / 2, centerY);

  const vicGrad = ctx.createLinearGradient(0, centerY - 36, 0, centerY + 36);
  vicGrad.addColorStop(0, '#ffd700');
  vicGrad.addColorStop(0.3, '#ffec80');
  vicGrad.addColorStop(0.5, '#fff5c0');
  vicGrad.addColorStop(0.7, '#ffec80');
  vicGrad.addColorStop(1, '#d4a800');
  ctx.fillStyle = vicGrad;
  ctx.fillText('VICTORY!', canvasWidth / 2, centerY);

  ctx.shadowBlur = 0;

  // フレーバーテキスト
  ctx.font = 'bold 18px monospace';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000000';
  ctx.strokeText('JUSTICE FOR THE BLACK CORPORATION!', canvasWidth / 2, centerY + 60);
  ctx.fillStyle = '#f0e8c0';
  ctx.fillText('JUSTICE FOR THE BLACK CORPORATION!', canvasWidth / 2, centerY + 60);

  // スコア表示
  _drawScorePanel(ctx, canvasWidth, canvasHeight, score, centerY + 120);

  // PRESS ENTER TO TITLE（点滅）
  const blink = Math.sin(Date.now() * 0.005) > 0;
  if (blink) {
    ctx.font = 'bold 18px monospace';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';
    ctx.strokeText('PRESS ENTER TO TITLE', canvasWidth / 2, canvasHeight * 0.8);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('PRESS ENTER TO TITLE', canvasWidth / 2, canvasHeight * 0.8);
  }

  ctx.restore();
}

/**
 * エリア名表示（エリア遷移時のテロップ）
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {string} areaName - 例: "AREA 1: エントランス"
 * @param {number} progress - 0-1 のアニメーション進行度
 */
export function drawAreaTitle(ctx, canvasWidth, canvasHeight, areaName, progress) {
  ctx.save();

  let alpha = 1;
  let offsetX = 0;

  if (progress < 0.3) {
    // スライドイン（右から）
    const t = progress / 0.3;
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    offsetX = (1 - eased) * 300;
    alpha = eased;
  } else if (progress < 0.7) {
    // 表示
    offsetX = 0;
    alpha = 1;
  } else {
    // フェードアウト
    const t = (progress - 0.7) / 0.3;
    alpha = 1 - t;
  }

  ctx.globalAlpha = alpha;

  const centerX = canvasWidth / 2 + offsetX;
  const centerY = canvasHeight / 2;

  // 背景バー
  const barW = 500;
  const barH = 60;
  const barGrad = ctx.createLinearGradient(
    centerX - barW / 2, 0, centerX + barW / 2, 0,
  );
  barGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  barGrad.addColorStop(0.15, 'rgba(0, 0, 0, 0.7)');
  barGrad.addColorStop(0.5, 'rgba(10, 5, 20, 0.85)');
  barGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.7)');
  barGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = barGrad;
  ctx.fillRect(centerX - barW / 2, centerY - barH / 2, barW, barH);

  // 上下のライン
  const lineGrad = ctx.createLinearGradient(
    centerX - barW / 2, 0, centerX + barW / 2, 0,
  );
  lineGrad.addColorStop(0, 'rgba(200, 50, 50, 0)');
  lineGrad.addColorStop(0.3, 'rgba(200, 80, 50, 0.6)');
  lineGrad.addColorStop(0.5, 'rgba(255, 100, 60, 0.8)');
  lineGrad.addColorStop(0.7, 'rgba(200, 80, 50, 0.6)');
  lineGrad.addColorStop(1, 'rgba(200, 50, 50, 0)');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(centerX - barW / 2, centerY - barH / 2, barW, 2);
  ctx.fillRect(centerX - barW / 2, centerY + barH / 2 - 2, barW, 2);

  // エリア名テキスト
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 28px monospace';

  // 縁取り
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(areaName, centerX, centerY);

  // 本体
  ctx.fillStyle = '#ffffff';
  ctx.fillText(areaName, centerX, centerY);

  ctx.restore();
}

/**
 * 操作説明画面描画
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
export function drawControls(ctx, canvasWidth, canvasHeight) {
  ctx.save();

  // 暗い背景
  ctx.fillStyle = 'rgba(5, 5, 15, 0.95)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // カード背景
  const cardX = canvasWidth * 0.1;
  const cardY = canvasHeight * 0.08;
  const cardW = canvasWidth * 0.8;
  const cardH = canvasHeight * 0.84;

  // カードシャドウ
  ctx.shadowColor = 'rgba(200, 50, 50, 0.2)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 5;

  // カード本体
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardGrad.addColorStop(0, 'rgba(25, 20, 40, 0.95)');
  cardGrad.addColorStop(1, 'rgba(15, 12, 25, 0.95)');
  ctx.fillStyle = cardGrad;
  _roundRect(ctx, cardX, cardY, cardW, cardH, 12);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // カードボーダー
  ctx.strokeStyle = 'rgba(150, 50, 50, 0.3)';
  ctx.lineWidth = 1;
  _roundRect(ctx, cardX, cardY, cardW, cardH, 12);
  ctx.stroke();

  // タイトル
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 28px monospace';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000000';
  ctx.strokeText('CONTROLS', canvasWidth / 2, cardY + 40);
  ctx.fillStyle = '#ff6060';
  ctx.fillText('CONTROLS', canvasWidth / 2, cardY + 40);

  // 装飾ライン
  const lineW2 = 200;
  ctx.fillStyle = 'rgba(200, 60, 60, 0.4)';
  ctx.fillRect(canvasWidth / 2 - lineW2 / 2, cardY + 60, lineW2, 1);

  // 操作一覧
  const controls = [
    { key: '← → / A D', desc: 'Move left / right' },
    { key: '↑ / W', desc: 'Move up' },
    { key: '↓ / S', desc: 'Move down' },
    { key: 'Z / SPACE', desc: 'Punch (combo on repeat)' },
    { key: 'X', desc: 'Special (Resignation Slash)' },
    { key: 'Shift', desc: 'Dash (with invincibility)' },
    { key: 'ENTER', desc: 'Confirm / Pause' },
  ];

  const startY = cardY + 90;
  const rowH = 48;

  for (let i = 0; i < controls.length; i++) {
    const ry = startY + i * rowH;

    // キーアイコン
    _drawKeyIcon(ctx, canvasWidth * 0.28, ry, controls[i].key);

    // 説明
    ctx.textAlign = 'left';
    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(220, 220, 240, 0.85)';
    ctx.fillText(controls[i].desc, canvasWidth * 0.45, ry);
  }

  // 戻る案内
  const blink = Math.sin(Date.now() * 0.005) > 0;
  if (blink) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = 'rgba(200, 200, 220, 0.7)';
    ctx.fillText('PRESS ENTER TO BACK', canvasWidth / 2, cardY + cardH - 30);
  }

  ctx.restore();
}


// =============================================================================
// 内部ヘルパー関数
// =============================================================================

/**
 * プレイヤーHP描画
 */
function _drawPlayerHP(ctx, player, canvasWidth, canvasHeight) {
  const x = 16;
  const y = 16;
  const barW = 200;
  const barH = 16;

  // 背景パネル
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  _roundRect(ctx, x - 4, y - 4, barW + 80, barH + 28, 6);
  ctx.fill();

  // パネルボーダー
  ctx.strokeStyle = 'rgba(100, 100, 150, 0.3)';
  ctx.lineWidth = 1;
  _roundRect(ctx, x - 4, y - 4, barW + 80, barH + 28, 6);
  ctx.stroke();

  // ラベル
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#8888aa';
  ctx.fillText('HP', x + 2, y + 4);

  // 名前
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#c0c0e0';
  ctx.fillText('HIKARI', x + 30, y + 4);

  // HPバー外枠
  const barX = x;
  const barY = y + 14;
  ctx.strokeStyle = 'rgba(200, 200, 220, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  // HPバー背景
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(barX, barY, barW, barH);

  // HP割合
  const ratio = Math.max(0, Math.min(1, player.hp / player.maxHp));
  const fillW = barW * ratio;

  // HP色の決定
  let barColor;
  if (ratio > 0.6) {
    const grad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
    grad.addColorStop(0, '#40e040');
    grad.addColorStop(1, '#20a020');
    barColor = grad;
  } else if (ratio > 0.3) {
    const grad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
    grad.addColorStop(0, '#e0e040');
    grad.addColorStop(1, '#a0a020');
    barColor = grad;
  } else {
    // 赤（点滅）
    const blinkAlpha = Math.sin(Date.now() * 0.01) > 0 ? 1 : 0.5;
    const grad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
    grad.addColorStop(0, `rgba(240, 40, 40, ${blinkAlpha})`);
    grad.addColorStop(1, `rgba(180, 20, 20, ${blinkAlpha})`);
    barColor = grad;
  }

  // HPバー本体
  ctx.fillStyle = barColor;
  ctx.fillRect(barX, barY, fillW, barH);

  // ハイライト
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(barX, barY, fillW, barH / 3);

  // HP数値
  ctx.textAlign = 'right';
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#e0e0f0';
  ctx.fillText(`${Math.ceil(player.hp)}/${player.maxHp}`, barX + barW - 4, barY + barH / 2);
}

/**
 * スコア描画
 */
function _drawScore(ctx, score, canvasWidth) {
  const x = canvasWidth - 16;
  const y = 28;

  // 背景パネル
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  _roundRect(ctx, x - 170, y - 16, 174, 32, 6);
  ctx.fill();

  ctx.strokeStyle = 'rgba(100, 100, 150, 0.3)';
  ctx.lineWidth = 1;
  _roundRect(ctx, x - 170, y - 16, 174, 32, 6);
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 18px monospace';

  // 縁取り
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(`SCORE: ${String(score).padStart(6, '0')}`, x - 8, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`SCORE: ${String(score).padStart(6, '0')}`, x - 8, y);
}

/**
 * コンボ描画
 */
function _drawCombo(ctx, combo, multiplier, canvasWidth, canvasHeight) {
  const x = canvasWidth * 0.82;
  const y = canvasHeight * 0.35;

  // バウンドアニメーション
  const bounce = Math.sin(Date.now() * 0.01) * 3;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // グロー
  ctx.shadowColor = 'rgba(255, 220, 50, 0.6)';
  ctx.shadowBlur = 20;

  // コンボ数
  ctx.font = `bold ${36 + Math.min(combo, 10) * 2}px monospace`;
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(`${combo}`, x, y + bounce);

  const comboGrad = ctx.createLinearGradient(0, y - 20 + bounce, 0, y + 20 + bounce);
  comboGrad.addColorStop(0, '#ffd700');
  comboGrad.addColorStop(0.5, '#ffec80');
  comboGrad.addColorStop(1, '#ff8c00');
  ctx.fillStyle = comboGrad;
  ctx.fillText(`${combo}`, x, y + bounce);

  ctx.shadowBlur = 0;

  // "COMBO!" テキスト
  ctx.font = 'bold 16px monospace';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000000';
  ctx.strokeText('COMBO!', x, y + 28 + bounce);
  ctx.fillStyle = '#ffe060';
  ctx.fillText('COMBO!', x, y + 28 + bounce);

  // スコア倍率表示（10コンボ以上で表示）
  if (combo >= 10) {
    ctx.font = 'bold 14px monospace';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    const multText = `x${multiplier.toFixed(1)}`;
    ctx.strokeText(multText, x, y + 52 + bounce);
    ctx.fillStyle = '#ffff00';
    ctx.fillText(multText, x, y + 52 + bounce);
  }
}

/**
 * ボスHP描画
 */
function _drawBossHP(ctx, boss, canvasWidth) {
  const barW = 400;
  const barH = 20;
  const x = (canvasWidth - barW) / 2;
  const y = 50;

  // 背景パネル
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  _roundRect(ctx, x - 10, y - 25, barW + 20, barH + 40, 8);
  ctx.fill();

  ctx.strokeStyle = 'rgba(180, 50, 50, 0.4)';
  ctx.lineWidth = 1;
  _roundRect(ctx, x - 10, y - 25, barW + 20, barH + 40, 8);
  ctx.stroke();

  // ボス名ラベル
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px monospace';

  // 名前の縁取り
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000000';
  ctx.strokeText('CEO ZOMBIE', canvasWidth / 2, y - 12);
  ctx.fillStyle = '#ff6060';
  ctx.fillText('CEO ZOMBIE', canvasWidth / 2, y - 12);

  // フェーズ表示
  ctx.textAlign = 'right';
  ctx.font = 'bold 11px monospace';
  const phaseColors = ['#ff5050', '#c040ff', '#ffd700'];
  const phaseColor = phaseColors[Math.min(boss.phase - 1, 2)] || '#ff5050';
  ctx.fillStyle = phaseColor;
  ctx.fillText(`Phase ${boss.phase}`, x + barW, y - 12);

  // HPバー外枠
  ctx.strokeStyle = 'rgba(200, 200, 220, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, barW, barH);

  // HPバー背景
  ctx.fillStyle = '#1a0a0a';
  ctx.fillRect(x, y, barW, barH);

  // HP割合
  const ratio = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
  const fillW = barW * ratio;

  // フェーズに応じたバー色
  let bossBarColor;
  switch (boss.phase) {
    case 1: {
      const g = ctx.createLinearGradient(x, y, x, y + barH);
      g.addColorStop(0, '#ff4040');
      g.addColorStop(1, '#cc2020');
      bossBarColor = g;
      break;
    }
    case 2: {
      const g = ctx.createLinearGradient(x, y, x, y + barH);
      g.addColorStop(0, '#c040ff');
      g.addColorStop(1, '#8020cc');
      bossBarColor = g;
      break;
    }
    case 3:
    default: {
      const g = ctx.createLinearGradient(x, y, x, y + barH);
      g.addColorStop(0, '#ffd700');
      g.addColorStop(0.5, '#ffec80');
      g.addColorStop(1, '#d4a800');
      bossBarColor = g;
      break;
    }
  }

  ctx.fillStyle = bossBarColor;
  ctx.fillRect(x, y, fillW, barH);

  // ハイライト
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(x, y, fillW, barH / 3);

  // 脈動グロー（低HP時）
  if (ratio < 0.3) {
    const pulse = Math.sin(Date.now() * 0.008) * 0.3 + 0.3;
    ctx.fillStyle = `rgba(255, 50, 50, ${pulse * 0.15})`;
    ctx.fillRect(x, y, barW, barH);
  }
}

/**
 * 都市のシルエット描画（タイトル画面背景用）
 */
function _drawCityScape(ctx, cw, ch) {
  const baseY = ch * 0.75;

  ctx.fillStyle = 'rgba(10, 10, 25, 0.8)';

  // ビル群
  const buildings = [
    { x: 50, w: 80, h: 200 },
    { x: 120, w: 60, h: 150 },
    { x: 200, w: 100, h: 280 },
    { x: 310, w: 70, h: 180 },
    { x: 380, w: 120, h: 320 },
    { x: 500, w: 50, h: 140 },
    { x: 560, w: 90, h: 250 },
    { x: 660, w: 110, h: 300 },
    { x: 770, w: 60, h: 160 },
    { x: 840, w: 100, h: 240 },
  ];

  for (const b of buildings) {
    ctx.fillRect(b.x, baseY - b.h, b.w, b.h + ch);

    // 窓（ランダムに点灯）
    for (let wy = baseY - b.h + 15; wy < baseY - 10; wy += 20) {
      for (let wx = b.x + 8; wx < b.x + b.w - 8; wx += 14) {
        if (Math.sin(wx * 3.7 + wy * 2.3) > 0.3) {
          ctx.fillStyle = 'rgba(255, 200, 100, 0.06)';
        } else {
          ctx.fillStyle = 'rgba(50, 50, 80, 0.3)';
        }
        ctx.fillRect(wx, wy, 8, 10);
      }
    }

    ctx.fillStyle = 'rgba(10, 10, 25, 0.8)';
  }

  // 地面
  ctx.fillStyle = '#0a0a15';
  ctx.fillRect(0, baseY, cw, ch - baseY);
}

/**
 * スコアパネル描画（ゲームオーバー/勝利画面用）
 */
function _drawScorePanel(ctx, cw, ch, score, y) {
  const panelW = 250;
  const panelH = 50;
  const panelX = cw / 2 - panelW / 2;

  // パネル背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  _roundRect(ctx, panelX, y - panelH / 2, panelW, panelH, 8);
  ctx.fill();

  // ボーダー
  ctx.strokeStyle = 'rgba(200, 180, 100, 0.3)';
  ctx.lineWidth = 1;
  _roundRect(ctx, panelX, y - panelH / 2, panelW, panelH, 8);
  ctx.stroke();

  // スコアテキスト
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#a0a0b0';
  ctx.fillText('FINAL SCORE', cw / 2, y - 10);

  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#ffd700';
  ctx.fillText(String(score).padStart(6, '0'), cw / 2, y + 12);
}

/**
 * キーアイコン描画（操作説明画面用）
 */
function _drawKeyIcon(ctx, x, y, label) {
  const minW = 50;
  ctx.font = 'bold 13px monospace';
  const textW = ctx.measureText(label).width;
  const w = Math.max(minW, textW + 20);
  const h = 30;

  // キーの影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  _roundRect(ctx, x - w / 2, y - h / 2 + 3, w, h, 5);
  ctx.fill();

  // キー本体
  const keyGrad = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  keyGrad.addColorStop(0, '#3a3550');
  keyGrad.addColorStop(1, '#252235');
  ctx.fillStyle = keyGrad;
  _roundRect(ctx, x - w / 2, y - h / 2, w, h, 5);
  ctx.fill();

  // キーボーダー
  ctx.strokeStyle = 'rgba(150, 130, 200, 0.4)';
  ctx.lineWidth = 1;
  _roundRect(ctx, x - w / 2, y - h / 2, w, h, 5);
  ctx.stroke();

  // ハイライト
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  _roundRect(ctx, x - w / 2 + 2, y - h / 2 + 2, w - 4, h / 2 - 2, 3);
  ctx.fill();

  // ラベル
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#d0d0f0';
  ctx.fillText(label, x, y);
}

/**
 * レベルアップ選択画面描画
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {{ label: string, description: string, symbol: string, color: string }[]} options
 * @param {number} selectedIdx
 */
export function drawLevelUp(ctx, canvasWidth, canvasHeight, options, selectedIdx) {
  ctx.save();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  // タイトル
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 26px monospace';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#000';
  ctx.strokeText('LEVEL UP! CHOOSE AN UPGRADE', cx, cy - 105);
  ctx.fillStyle = '#FFD700';
  ctx.fillText('LEVEL UP! CHOOSE AN UPGRADE', cx, cy - 105);

  ctx.font = '14px monospace';
  ctx.fillStyle = '#778899';
  ctx.fillText('Select with ← →  /  Confirm with Enter or Space', cx, cy - 76);

  // カード描画
  const cardW = 210;
  const cardH = 136;
  const gap = 18;
  const totalW = cardW * 3 + gap * 2;
  const startX = cx - totalW / 2;

  options.forEach((opt, i) => {
    const cardX = startX + i * (cardW + gap);
    const cardY = cy - cardH / 2 - 10;
    const sel = i === selectedIdx;

    ctx.fillStyle = sel ? 'rgba(255, 215, 0, 0.18)' : 'rgba(8, 8, 24, 0.92)';
    _roundRect(ctx, cardX, cardY, cardW, cardH, 12);
    ctx.fill();

    ctx.strokeStyle = sel ? '#FFD700' : '#334466';
    ctx.lineWidth = sel ? 3 : 1;
    _roundRect(ctx, cardX, cardY, cardW, cardH, 12);
    ctx.stroke();

    // シンボル
    ctx.font = '34px monospace';
    ctx.fillStyle = opt.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opt.symbol, cardX + cardW / 2, cardY + 38);

    // ラベル
    ctx.font = `bold 17px monospace`;
    ctx.fillStyle = sel ? '#FFD700' : '#FFFFFF';
    ctx.fillText(opt.label, cardX + cardW / 2, cardY + 74);

    // 説明
    ctx.font = '13px monospace';
    ctx.fillStyle = '#99AABB';
    ctx.fillText(opt.description, cardX + cardW / 2, cardY + 100);

    if (sel) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#FFD700';
      ctx.fillText('▼', cardX + cardW / 2, cardY + cardH + 14);
    }
  });

  ctx.restore();
}

/**
 * ポーズ画面描画
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
export function drawPause(ctx, canvasWidth, canvasHeight) {
  ctx.save();

  // 半透明オーバーレイ
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  // パネル
  const panelW = 360;
  const panelH = 160;
  ctx.fillStyle = 'rgba(10, 10, 30, 0.9)';
  _roundRect(ctx, cx - panelW / 2, cy - panelH / 2, panelW, panelH, 12);
  ctx.fill();
  ctx.strokeStyle = '#5566aa';
  ctx.lineWidth = 2;
  _roundRect(ctx, cx - panelW / 2, cy - panelH / 2, panelW, panelH, 12);
  ctx.stroke();

  // PAUSE テキスト
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 48px monospace';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#000033';
  ctx.strokeText('⏸ PAUSE', cx, cy - 20);
  ctx.fillStyle = '#aabbff';
  ctx.fillText('⏸ PAUSE', cx, cy - 20);

  // 操作説明
  ctx.font = '16px monospace';
  ctx.fillStyle = '#888899';
  ctx.fillText('Press ESC / P to resume', cx, cy + 30);

  ctx.restore();
}

/**
 * 角丸矩形パスの生成
 */
function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
