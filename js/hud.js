// =============================================================================
// hud.js - HUD（ヘッドアップディスプレイ）とメニュー画面描画
// ブラック企業サバイバー ～経営者ゾンビ殲滅戦～
// =============================================================================

import { drawPlayer } from './sprites.js';

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

  // === 背景: 夜空のグラデーション（地平線は赤く焼ける） ===
  const t = blinkFrame * 0.016;
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  bgGrad.addColorStop(0, '#04040c');
  bgGrad.addColorStop(0.35, '#0a0a20');
  bgGrad.addColorStop(0.62, '#161033');
  bgGrad.addColorStop(0.75, '#2a1430');
  bgGrad.addColorStop(0.82, '#3a1422');
  bgGrad.addColorStop(1, '#0c0610');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // ビルのシルエット（アニメーション付き）
  _drawCityScape(ctx, canvasWidth, canvasHeight, t);

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

  // ── 舞い散る白い花弁 ──
  _drawFallingPetals(ctx, canvasWidth, canvasHeight, t);

  // ── ビネット（四隅を暗く） ──
  const vig = ctx.createRadialGradient(
    cx, canvasHeight * 0.5, canvasHeight * 0.3,
    cx, canvasHeight * 0.5, canvasHeight * 0.95,
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

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

  // フレーバーテキスト（祭壇とスコアの間）
  ctx.font = '15px monospace';
  ctx.fillStyle = 'rgba(180, 180, 180, 0.7)';
  ctx.fillText('Rest in peace...', cx, canvasHeight * 0.655);

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

/** 決定論的な擬似乱数（ゲームオーバー画面の模様再現用） */
function _hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function _drawBuddhistAltar(ctx, cx, baseY, t) {
  // ── 鯨幕（黒白の縦縞の幕） ──
  const curtainW = 476; // 28px ストライプ17本で左右対称（中央は黒）
  const curtainH = 250;
  const cLeft = cx - curtainW / 2;
  const cTop = baseY - 220;
  for (let i = 0; i < Math.ceil(curtainW / 28); i++) {
    const sx = cLeft + i * 28;
    const w = Math.min(28, cLeft + curtainW - sx);
    ctx.fillStyle = i % 2 === 0 ? '#141414' : '#cfcfcf';
    ctx.fillRect(sx, cTop, w, curtainH);
    // 布の縦シワ（うっすら）
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.10)';
    ctx.fillRect(sx + 7, cTop, 2, curtainH);
    ctx.fillRect(sx + 19, cTop, 3, curtainH);
  }
  // 幕の下端へ落ちる影
  const cShade = ctx.createLinearGradient(0, cTop + curtainH - 70, 0, cTop + curtainH);
  cShade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  cShade.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = cShade;
  ctx.fillRect(cLeft, cTop + curtainH - 70, curtainW, 70);
  // 水引幕（上端の横布とスカラップの垂れ）
  ctx.fillStyle = '#0c0c0c';
  ctx.fillRect(cLeft - 12, cTop - 8, curtainW + 24, 24);
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.arc(cLeft + 14 + i * 47, cTop + 15, 24, 0, Math.PI);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(cLeft - 12, cTop - 8, curtainW + 24, 2);
  // 垂れの縁のハイライト
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.arc(cLeft + 14 + i * 47, cTop + 15, 24, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }

  // ── 床に落ちる祭壇の光だまり ──
  const floorGlow = ctx.createRadialGradient(cx, baseY + 24, 20, cx, baseY + 24, 240);
  floorGlow.addColorStop(0, 'rgba(200, 200, 200, 0.06)');
  floorGlow.addColorStop(1, 'rgba(200, 200, 200, 0)');
  ctx.fillStyle = floorGlow;
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 24, 240, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── 白布掛けの3段祭壇 ──
  _drawAltarTier(ctx, cx, baseY + 4, 330, 30);
  _drawAltarTier(ctx, cx, baseY - 26, 260, 26);
  _drawAltarTier(ctx, cx, baseY - 52, 190, 24);

  // ── 祭壇上の品々 ──
  // 遺影（上段に置かれ、イーゼルの脚が天板に着く）
  _drawMemorialPortrait(ctx, cx, baseY - 124, t);
  // 位牌（遺影の右）
  _drawMemorialTablet(ctx, cx + 62, baseY - 76);
  // 蝋燭（中段の左右）
  _drawCentralCandle(ctx, cx - 72, baseY - 52, t);
  _drawCentralCandle(ctx, cx + 72, baseY - 52, t + 1.3);
  // 線香鉢（中段中央）
  _drawIncenseStand(ctx, cx, baseY - 52, t, 0);
  // 菊の献花（下段の左右）
  _drawFlowerOffering(ctx, cx - 125, baseY - 22, 0);
  _drawFlowerOffering(ctx, cx + 125, baseY - 22, 7);
  // 供物の果物（下段）
  _drawOffering(ctx, cx - 58, baseY - 22);
  _drawOffering(ctx, cx + 58, baseY - 22);
}

/** 白布の掛かった祭壇の段（x は中心） */
function _drawAltarTier(ctx, x, bottomY, w, h) {
  const topY = bottomY - h;
  // 天板の白布
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(x - w / 2 - 4, topY - 3, w + 8, 5);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.fillRect(x - w / 2 - 4, topY - 3, w + 8, 1);
  // 前面に垂れる布（縦の折り目）
  const clothGrad = ctx.createLinearGradient(0, topY, 0, bottomY);
  clothGrad.addColorStop(0, '#d6d6d6');
  clothGrad.addColorStop(0.15, '#c2c2c2');
  clothGrad.addColorStop(1, '#8e8e8e');
  ctx.fillStyle = clothGrad;
  ctx.fillRect(x - w / 2 - 4, topY + 2, w + 8, h - 2);
  // 折り目の陰影
  for (let i = 0; i < Math.floor(w / 34); i++) {
    const fx = x - w / 2 + 10 + i * 34;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.13)';
    ctx.fillRect(fx, topY + 4, 3, h - 6);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
    ctx.fillRect(fx + 5, topY + 4, 2, h - 6);
  }
  // 銀のトリムライン
  ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
  ctx.fillRect(x - w / 2 - 4, topY + 4, w + 8, 1);
  // 裾の影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(x - w / 2 - 4, bottomY - 2, w + 8, 2);
}

/** 遺影：高精細グレースケールの主人公の肖像（u=2px のサブピクセル描画） */
function _drawMemorialPortrait(ctx, cx, centerY, t) {
  const frameW = 66;
  const frameH = 80;
  const fx = cx - frameW / 2;
  const fy = centerY - frameH / 2;

  // 額縁の影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(fx + 3, fy + 4, frameW, frameH);
  // 漆塗りの黒額縁（銀の面取り）
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(fx, fy, frameW, frameH);
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(fx + 1, fy + 1, frameW - 2, 1);
  ctx.fillRect(fx + 1, fy + 1, 1, frameH - 2);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(fx + 1, fy + frameH - 2, frameW - 2, 1);
  ctx.fillRect(fx + frameW - 2, fy + 1, 1, frameH - 2);
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(fx + 4.5, fy + 4.5, frameW - 9, frameH - 9);
  // 白いマット
  ctx.fillStyle = '#e6e6e6';
  ctx.fillRect(fx + 6, fy + 6, frameW - 12, frameH - 12);
  // 写真エリア（淡いビネットの背景）
  const px0 = fx + 10;
  const py0 = fy + 10;
  const pw = frameW - 20; // 46
  const phh = frameH - 20; // 60
  const photoBg = ctx.createRadialGradient(cx, py0 + phh * 0.4, 6, cx, py0 + phh * 0.4, 44);
  photoBg.addColorStop(0, '#bdbdbd');
  photoBg.addColorStop(1, '#8e8e8e');
  ctx.fillStyle = photoBg;
  ctx.fillRect(px0, py0, pw, phh);

  // ── 人物のバスト（グレースケール・u=2px グリッド 23×29） ──
  const u = 2;
  const ox = px0 + 0;
  const oy = py0 + 1;
  const R = (gx, gy, w, h, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(ox + gx * u, oy + gy * u, w * u, h * u);
  };
  const hairD = '#3a3a3a', hair = '#525252', hairL = '#757575', hairS = '#979797';
  const skin = '#d4d4d4', skinS = '#b9b9b9', skinD = '#a0a0a0';
  const suit = '#242424', suitL = '#3a3a3a', shirt = '#efefef';

  // ポニーテール（後ろ・右側）
  R(18, 3, 3, 3, hair);
  R(19, 6, 3, 4, hairD);
  R(20, 10, 2, 3, hair);
  R(19, 6, 1, 3, hairL);
  // 髪のクラウン
  R(7, 0, 9, 1, hairD);
  R(6, 1, 11, 2, hair);
  R(5, 3, 13, 2, hair);
  R(8, 1, 3, 1, hairL);
  R(13, 1, 2, 1, hairS);
  R(7, 2, 2, 1, hairS);
  // サイドの髪
  R(5, 5, 2, 7, hair);
  R(16, 5, 2, 7, hair);
  R(5, 10, 2, 3, hairD);
  R(16, 10, 2, 3, hairD);
  // 顔
  R(7, 5, 9, 8, skin);
  R(7, 11, 9, 2, skinS);
  R(7, 8, 1, 4, skinS);
  R(15, 8, 1, 4, skinS);
  // 前髪
  R(7, 5, 9, 1, hair);
  R(8, 6, 2, 1, hair);
  R(12, 6, 2, 1, hair);
  R(15, 6, 1, 1, hair);
  // 眉
  R(8, 7, 3, 1, '#6e6e6e');
  R(13, 7, 3, 1, '#6e6e6e');
  // 目（穏やかな表情：まつ毛＋白目＋灰色の虹彩＋光）
  R(8, 8, 3, 1, '#4a4a4a');
  R(13, 8, 3, 1, '#4a4a4a');
  R(8, 9, 3, 1, '#f4f4f4');
  R(13, 9, 3, 1, '#f4f4f4');
  R(9, 9, 1, 1, '#5e5e5e');
  R(14, 9, 1, 1, '#5e5e5e');
  // 鼻
  R(11, 10, 1, 1, skinD);
  // 微笑み
  R(10, 11, 3, 1, '#909090');
  // 首
  R(10, 13, 4, 2, skin);
  R(10, 13, 4, 1, skinD);
  // シャツの襟元（V字）
  R(8, 15, 8, 1, shirt);
  R(10, 16, 4, 2, shirt);
  R(11, 16, 1, 2, '#d0d0d0');
  // スーツの肩〜胸
  R(3, 15, 5, 2, suitL);
  R(15, 15, 5, 2, suitL);
  R(2, 17, 6, 12, suit);
  R(15, 17, 6, 12, suit);
  R(8, 18, 2, 11, suit);
  R(13, 18, 2, 11, suit);
  R(10, 18, 3, 4, shirt);
  R(9, 22, 5, 7, suit);
  // ラペルの線
  R(8, 17, 1, 5, '#161616');
  R(14, 17, 1, 5, '#161616');

  // 写真のガラス反射（斜めの光）
  ctx.save();
  ctx.beginPath();
  ctx.rect(px0, py0, pw, phh);
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.13)';
  ctx.beginPath();
  ctx.moveTo(px0 - 10, py0 + 18);
  ctx.lineTo(px0 + 22, py0 - 10);
  ctx.lineTo(px0 + 34, py0 - 10);
  ctx.lineTo(px0 + 2, py0 + 28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.beginPath();
  ctx.moveTo(px0 + 8, py0 + phh);
  ctx.lineTo(px0 + pw + 10, py0 + 8);
  ctx.lineTo(px0 + pw + 16, py0 + 14);
  ctx.lineTo(px0 + 14, py0 + phh);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 喪章のリボン（左上の角を斜めに横切る細い黒帯＋小さな結び）
  ctx.save();
  ctx.translate(fx + 7, fy + 7);
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(-15, -3.5, 30, 7);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(-15, -3.5, 30, 1.5);
  // 帯の端の三角の切り込み
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.moveTo(-15, -3.5);
  ctx.lineTo(-19, 0);
  ctx.lineTo(-15, 3.5);
  ctx.closePath();
  ctx.moveTo(15, -3.5);
  ctx.lineTo(19, 0);
  ctx.lineTo(15, 3.5);
  ctx.closePath();
  ctx.fill();
  // 中央の小さな結び目
  ctx.fillStyle = '#222222';
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 額縁を支える小さなイーゼルの脚
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(fx + 10, fy + frameH);
  ctx.lineTo(fx + 4, fy + frameH + 8);
  ctx.moveTo(fx + frameW - 10, fy + frameH);
  ctx.lineTo(fx + frameW - 4, fy + frameH + 8);
  ctx.stroke();
}

/** 位牌（黒漆＋金の戒名風の縦線） */
function _drawMemorialTablet(ctx, x, bottomY) {
  // 蓮華の台座（2段）
  ctx.fillStyle = '#2e2e2e';
  ctx.fillRect(x - 11, bottomY - 4, 22, 4);
  ctx.fillStyle = '#3c3c3c';
  ctx.fillRect(x - 8, bottomY - 8, 16, 4);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(x - 11, bottomY - 4, 22, 1);
  ctx.fillRect(x - 8, bottomY - 8, 16, 1);
  // 札板（黒漆・上端は丸い）
  ctx.fillStyle = '#101010';
  ctx.fillRect(x - 7, bottomY - 36, 14, 28);
  ctx.beginPath();
  ctx.arc(x, bottomY - 36, 7, Math.PI, Math.PI * 2);
  ctx.fill();
  // 漆の艶
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.fillRect(x - 5, bottomY - 38, 2, 28);
  // 金の戒名（抽象化した縦の刻み）
  ctx.fillStyle = 'rgba(212, 175, 55, 0.75)';
  ctx.fillRect(x - 1, bottomY - 34, 2, 4);
  ctx.fillRect(x - 1, bottomY - 28, 2, 3);
  ctx.fillRect(x - 1, bottomY - 23, 2, 4);
  ctx.fillRect(x - 1, bottomY - 17, 2, 3);
  ctx.fillRect(x - 1, bottomY - 12, 2, 2);
}

/** 蝋燭（真鍮の燭台・蝋だれ・二重の炎） */
function _drawCentralCandle(ctx, x, bottomY, t) {
  const flicker = 0.7 + Math.sin(t * 8.3) * 0.2 + Math.sin(t * 13) * 0.1;
  const cW = 8;
  const cH = 30;
  const cTopY = bottomY - 10 - cH;

  // 燭台（皿と脚）
  ctx.fillStyle = '#6a6a6a';
  ctx.fillRect(x - 9, bottomY - 4, 18, 3);
  ctx.fillRect(x - 3, bottomY - 10, 6, 6);
  ctx.fillStyle = '#8c8c8c';
  ctx.fillRect(x - 9, bottomY - 4, 18, 1);
  ctx.fillStyle = '#4e4e4e';
  ctx.fillRect(x - 9, bottomY - 2, 18, 1);

  // 蝋燭本体（白蝋の縦グラデーション）
  const candleGrad = ctx.createLinearGradient(x - cW / 2, 0, x + cW / 2, 0);
  candleGrad.addColorStop(0, '#dedede');
  candleGrad.addColorStop(0.45, '#f4f4f4');
  candleGrad.addColorStop(1, '#b8b8b8');
  ctx.fillStyle = candleGrad;
  ctx.fillRect(x - cW / 2, cTopY, cW, cH);
  // 上端の溶けたくぼみ
  ctx.fillStyle = '#c8c8c8';
  ctx.fillRect(x - cW / 2, cTopY, cW, 2);
  // 蝋だれ（側面のしずく）
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(x - cW / 2 - 1, cTopY + 3, 2, 7);
  ctx.fillRect(x + cW / 2 - 1, cTopY + 6, 2, 10);
  ctx.beginPath();
  ctx.arc(x - cW / 2, cTopY + 10, 1.5, 0, Math.PI * 2);
  ctx.arc(x + cW / 2, cTopY + 16, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // 芯
  ctx.strokeStyle = '#404040';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, cTopY);
  ctx.lineTo(x + 0.5, cTopY - 5);
  ctx.stroke();

  // 炎のグロー
  const glowR = ctx.createRadialGradient(x, cTopY - 8, 0, x, cTopY - 6, 32);
  glowR.addColorStop(0, `rgba(255, 255, 255, ${0.38 * flicker})`);
  glowR.addColorStop(0.5, `rgba(200, 200, 200, ${0.18 * flicker})`);
  glowR.addColorStop(1, 'rgba(100, 100, 100, 0)');
  ctx.fillStyle = glowR;
  ctx.fillRect(x - 32, cTopY - 38, 64, 48);

  // 炎（外炎＋内炎の二重・揺らぎ）
  const sway = Math.sin(t * 6.7) * 1.2;
  const fH = 15 * flicker;
  const fW = 5.5 * flicker;
  // 外炎
  ctx.beginPath();
  ctx.moveTo(x + sway, cTopY - 4 - fH);
  ctx.quadraticCurveTo(x + fW, cTopY - 4 - fH * 0.3, x + fW * 0.2, cTopY - 3);
  ctx.lineTo(x - fW * 0.2, cTopY - 3);
  ctx.quadraticCurveTo(x - fW, cTopY - 4 - fH * 0.3, x + sway, cTopY - 4 - fH);
  const flameGrad = ctx.createLinearGradient(x, cTopY - 4 - fH, x, cTopY - 3);
  flameGrad.addColorStop(0, '#ffffff');
  flameGrad.addColorStop(0.4, '#d8d8d8');
  flameGrad.addColorStop(1, '#888888');
  ctx.fillStyle = flameGrad;
  ctx.fill();
  // 内炎（白い芯）
  ctx.beginPath();
  ctx.ellipse(x + sway * 0.4, cTopY - 4 - fH * 0.32, fW * 0.35, fH * 0.32, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * flicker})`;
  ctx.fill();
}

/** 線香鉢（陶器の香炉・灰・点った線香3本） */
function _drawIncenseStand(ctx, x, bottomY, t, phase) {
  // 香炉（丸い陶器のボウル）
  ctx.fillStyle = '#5a5a5a';
  ctx.beginPath();
  ctx.ellipse(x, bottomY - 8, 13, 8, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillRect(x - 13, bottomY - 12, 26, 4);
  // 口縁のハイライトと脚
  ctx.fillStyle = '#7e7e7e';
  ctx.fillRect(x - 13, bottomY - 13, 26, 2);
  ctx.fillStyle = '#444444';
  ctx.fillRect(x - 5, bottomY - 1, 3, 2);
  ctx.fillRect(x + 2, bottomY - 1, 3, 2);
  // 灰
  ctx.fillStyle = '#9a9a9a';
  ctx.fillRect(x - 10, bottomY - 13, 20, 2);

  // 線香（3本・わずかに開く）
  for (let i = -1; i <= 1; i++) {
    const sx = x + i * 4;
    const tipX = sx + i * 2;
    const tipY = bottomY - 34;
    ctx.strokeStyle = '#8a8a6a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, bottomY - 13);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    // 火の点り（明滅）
    const ember = 0.5 + Math.sin(t * 3 + i * 2.1) * 0.3;
    ctx.fillStyle = `rgba(255, 240, 230, ${ember})`;
    ctx.fillRect(tipX - 1, tipY - 1, 2, 2);
    // 煙
    _drawIncenseSmoke(ctx, tipX, tipY - 3, t, phase + i * 0.35);
  }
}

/** 菊の献花（花瓶＋花弁が層になった白菊のクラスター） */
function _drawFlowerOffering(ctx, x, bottomY, seed) {
  // 花瓶（くびれのある銀器）
  ctx.fillStyle = '#5e5e5e';
  ctx.beginPath();
  ctx.moveTo(x - 8, bottomY);
  ctx.lineTo(x - 5, bottomY - 12);
  ctx.lineTo(x - 7, bottomY - 18);
  ctx.lineTo(x + 7, bottomY - 18);
  ctx.lineTo(x + 5, bottomY - 12);
  ctx.lineTo(x + 8, bottomY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.fillRect(x - 5, bottomY - 17, 2, 15);
  ctx.fillStyle = '#3e3e3e';
  ctx.fillRect(x - 8, bottomY - 1, 16, 1);

  // 葉（花瓶の口から広がる）
  ctx.fillStyle = '#4e4e4e';
  for (let i = 0; i < 4; i++) {
    const ang = -Math.PI / 2 + (i - 1.5) * 0.5;
    ctx.save();
    ctx.translate(x, bottomY - 18);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.ellipse(0, -9, 2.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 白菊（大3輪＋小2輪の固定クラスター）
  const blooms = [
    { dx: 0, dy: -32, r: 8 },
    { dx: -11, dy: -25, r: 6.5 },
    { dx: 11, dy: -26, r: 6.5 },
    { dx: -6, dy: -38, r: 5 },
    { dx: 7, dy: -36, r: 5 },
  ];
  for (let b = 0; b < blooms.length; b++) {
    _drawChrysanthemum(ctx, x + blooms[b].dx, bottomY + blooms[b].dy, blooms[b].r, seed + b * 2.7);
  }
}

/** 白菊一輪（外側・内側の花弁の二重リング） */
function _drawChrysanthemum(ctx, x, y, r, seed) {
  const rot = _hash(seed) * Math.PI;
  // 外側の花弁
  ctx.fillStyle = 'rgba(225, 225, 225, 0.92)';
  for (let i = 0; i < 8; i++) {
    const ang = rot + (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(ang) * r * 0.62, y + Math.sin(ang) * r * 0.62, r * 0.32, r * 0.58, ang, 0, Math.PI * 2);
    ctx.fill();
  }
  // 内側の花弁（明るめ・半位相ずらし）
  ctx.fillStyle = 'rgba(245, 245, 245, 0.95)';
  for (let i = 0; i < 6; i++) {
    const ang = rot + ((i + 0.5) / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(ang) * r * 0.34, y + Math.sin(ang) * r * 0.34, r * 0.24, r * 0.4, ang, 0, Math.PI * 2);
    ctx.fill();
  }
  // 花芯（点描）
  ctx.fillStyle = '#bdbdbd';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9e9e9e';
  ctx.fillRect(x - 1, y - 1, 1.5, 1.5);
  ctx.fillRect(x + 1, y, 1.5, 1.5);
}

/** 供物（三方の台に積まれた果物） */
function _drawOffering(ctx, x, bottomY) {
  // 三方（木の台：胴に眼象の窓）
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(x - 9, bottomY - 8, 18, 8);
  ctx.fillStyle = '#2e2e2e';
  ctx.fillRect(x - 4, bottomY - 6, 8, 5);
  ctx.fillStyle = '#5e5e5e';
  ctx.fillRect(x - 12, bottomY - 11, 24, 3);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(x - 12, bottomY - 11, 24, 1);

  // 果物（2＋1の積み・ハイライト付き）
  const fruit = (fx, fy, r, base) => {
    const g = ctx.createRadialGradient(fx - r * 0.35, fy - r * 0.4, r * 0.2, fx, fy, r);
    g.addColorStop(0, '#b8b8b8');
    g.addColorStop(1, base);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
    // ヘタ
    ctx.fillStyle = '#3e3e3e';
    ctx.fillRect(fx - 0.5, fy - r - 1.5, 1.5, 2);
  };
  fruit(x - 5, bottomY - 16, 5.5, '#787878');
  fruit(x + 5, bottomY - 16, 5.5, '#6e6e6e');
  fruit(x, bottomY - 24, 5, '#828282');
}

/** 舞い散る白い花弁 */
function _drawFallingPetals(ctx, cw, ch, t) {
  for (let i = 0; i < 14; i++) {
    const speed = 26 + _hash(i * 3.3) * 22;
    const prog = ((t * speed) / ch + _hash(i * 7.1)) % 1;
    const y = prog * (ch + 40) - 20;
    const x = _hash(i * 13.7) * cw + Math.sin(t * 0.7 + i * 2.3) * 46;
    const rot = t * (0.8 + (i % 3) * 0.5) + i * 1.7;
    const alpha = 0.10 + _hash(i * 5.9) * 0.16;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = `rgba(228, 228, 228, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.2, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // 花弁の中心の影
    ctx.fillStyle = `rgba(150, 150, 150, ${alpha * 0.6})`;
    ctx.beginPath();
    ctx.ellipse(1, 0.4, 1.6, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function _drawIncenseSmoke(ctx, x, baseY, t, phase) {
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const prog  = ((t * 0.22 + phase + i * 0.085) % 1.0);
    const sy    = baseY - prog * 100;
    const sx    = x + Math.sin(t * 1.6 + phase + i * 1.1) * 10 * prog
                    + Math.sin(t * 0.5 + phase) * 4 * prog;
    const alpha = (1 - prog) * 0.26 * (0.5 + prog);
    const size  = 1.5 + prog * 6;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(210, 210, 210, ${alpha})`;
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

  const cx = canvasWidth / 2;
  const time = Date.now() * 0.001;
  const frame = Math.floor(time * 6); // スプライトのアニメ用

  // 黄金の夜明けのグラデーション背景
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  bgGrad.addColorStop(0, '#1a1405');
  bgGrad.addColorStop(0.4, '#2e2208');
  bgGrad.addColorStop(0.7, '#3a2a08');
  bgGrad.addColorStop(1, '#0c0902');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // ── 回転する光芒（サンバースト） ──
  const burstY = canvasHeight * 0.42;
  ctx.save();
  ctx.translate(cx, burstY);
  ctx.rotate(time * 0.12);
  for (let i = 0; i < 24; i++) {
    ctx.rotate((Math.PI * 2) / 24);
    const rayGrad = ctx.createLinearGradient(0, 0, 0, -canvasHeight);
    rayGrad.addColorStop(0, `rgba(255, 225, 120, ${i % 2 === 0 ? 0.10 : 0.05})`);
    rayGrad.addColorStop(1, 'rgba(255, 225, 120, 0)');
    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(0, -canvasHeight);
    ctx.lineTo(26, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 中心の暖かなグロー
  const coreGlow = ctx.createRadialGradient(cx, burstY, 20, cx, burstY, canvasHeight * 0.7);
  coreGlow.addColorStop(0, 'rgba(255, 235, 150, 0.18)');
  coreGlow.addColorStop(0.4, 'rgba(180, 130, 40, 0.10)');
  coreGlow.addColorStop(1, 'rgba(10, 8, 2, 0.55)');
  ctx.fillStyle = coreGlow;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // ── 表彰台に立つ主人公（辞表スラッシュのポーズ） ──
  _drawVictoryPodium(ctx, cx, canvasHeight * 0.62, time);

  // ── 金の紙吹雪 ──
  _drawConfetti(ctx, canvasWidth, canvasHeight, time);

  // ── きらめく星（十字のスパークル） ──
  _drawSparkles(ctx, canvasWidth, canvasHeight, time);

  const titleY = canvasHeight * 0.17;

  // VICTORY テキスト
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // グロー
  ctx.shadowColor = 'rgba(255, 200, 50, 0.8)';
  ctx.shadowBlur = 50;

  ctx.font = 'bold 72px monospace';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#000000';
  ctx.strokeText('VICTORY!', cx, titleY);

  const vicGrad = ctx.createLinearGradient(0, titleY - 36, 0, titleY + 36);
  vicGrad.addColorStop(0, '#ffd700');
  vicGrad.addColorStop(0.3, '#ffec80');
  vicGrad.addColorStop(0.5, '#fff5c0');
  vicGrad.addColorStop(0.7, '#ffec80');
  vicGrad.addColorStop(1, '#d4a800');
  ctx.fillStyle = vicGrad;
  ctx.fillText('VICTORY!', cx, titleY);

  ctx.shadowBlur = 0;

  // フレーバーテキスト
  ctx.font = 'bold 18px monospace';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000000';
  ctx.strokeText('JUSTICE FOR THE BLACK CORPORATION!', cx, titleY + 52);
  ctx.fillStyle = '#f0e8c0';
  ctx.fillText('JUSTICE FOR THE BLACK CORPORATION!', cx, titleY + 52);

  // スコア表示
  _drawScorePanel(ctx, canvasWidth, canvasHeight, score, canvasHeight * 0.86);

  // PRESS ENTER TO TITLE（点滅）
  const blink = Math.sin(Date.now() * 0.005) > 0;
  if (blink) {
    ctx.font = 'bold 18px monospace';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';
    ctx.strokeText('PRESS ENTER TO TITLE', cx, canvasHeight * 0.95);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('PRESS ENTER TO TITLE', cx, canvasHeight * 0.95);
  }

  ctx.restore();
}

/** 勝利の表彰台と主人公スプライト */
function _drawVictoryPodium(ctx, cx, baseY, t) {
  // 表彰台に落ちるスポットの円
  const spot = ctx.createRadialGradient(cx, baseY, 10, cx, baseY, 130);
  spot.addColorStop(0, 'rgba(255, 240, 180, 0.16)');
  spot.addColorStop(1, 'rgba(255, 240, 180, 0)');
  ctx.fillStyle = spot;
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 4, 130, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  // 表彰台（1位の台座・金のトリム）
  const podW = 96, podH = 40;
  const px = cx - podW / 2;
  const py = baseY;
  const podGrad = ctx.createLinearGradient(px, py, px, py + podH);
  podGrad.addColorStop(0, '#caa12e');
  podGrad.addColorStop(1, '#7a5e14');
  ctx.fillStyle = podGrad;
  ctx.fillRect(px, py, podW, podH);
  // 天面
  ctx.fillStyle = '#e8c64a';
  ctx.fillRect(px - 4, py - 5, podW + 8, 6);
  ctx.fillStyle = 'rgba(255, 245, 200, 0.6)';
  ctx.fillRect(px - 4, py - 5, podW + 8, 1);
  // 縦の溝
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(cx - 16, py + 4, 2, podH - 6);
  ctx.fillRect(cx + 14, py + 4, 2, podH - 6);
  // 「1」のプレート
  ctx.fillStyle = '#3a2c08';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('1', cx, py + podH / 2 + 2);

  // 主人公（special ポーズで台上に。スプライトの足元が py に来るよう配置）
  // drawPlayer の総高は 44*S = 66px。足元 = y + 66 → y = py - 66 + 微調整
  const bobY = Math.sin(t * 2.5) * 2;
  drawPlayer(ctx, cx - 24, py - 64 + bobY, 'special', Math.floor(t * 4) % 4, true);

  ctx.textAlign = 'center';
}

/** 金の紙吹雪（回転しながら舞い落ちる短冊） */
function _drawConfetti(ctx, cw, ch, t) {
  const cols = ['#ffd700', '#fff0a0', '#e8b020', '#fff5d0', '#d49000'];
  for (let i = 0; i < 60; i++) {
    const speed = 30 + _h2(i * 2.3) * 50;
    const prog = ((t * speed) / ch + _h2(i * 5.1)) % 1;
    const y = prog * (ch + 30) - 15;
    const x = _h2(i * 7.7) * cw + Math.sin(t * 1.4 + i) * 40;
    const w = 4 + _h2(i * 3.3) * 4;
    const h = 7 + _h2(i * 9.1) * 5;
    // 回転で見える幅が変わる（ひらひら感）
    const flip = Math.abs(Math.cos(t * 4 + i * 1.7));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * (1 + (i % 3) * 0.4) + i);
    ctx.fillStyle = cols[i % cols.length];
    ctx.globalAlpha = 0.55 + _h2(i) * 0.4;
    ctx.fillRect(-w / 2, -h / 2, w * (0.3 + flip * 0.7), h);
    // 短冊の陰影
    ctx.fillStyle = 'rgba(120, 80, 10, 0.35)';
    ctx.fillRect(-w / 2, h / 2 - 1, w * (0.3 + flip * 0.7), 1);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/** 十字型のきらめき（明滅するスパークル） */
function _drawSparkles(ctx, cw, ch, t) {
  for (let i = 0; i < 16; i++) {
    const sx = _h2(i * 4.7) * cw;
    const sy = _h2(i * 8.3) * ch * 0.75;
    const phase = (t * 1.5 + _h2(i * 2.1) * 6) % 3;
    if (phase > 1) continue; // 点いている時間は短く
    const s = Math.sin(phase * Math.PI) * (3 + _h2(i * 6.7) * 5);
    if (s <= 0) continue;
    ctx.fillStyle = `rgba(255, 248, 210, ${Math.sin(phase * Math.PI) * 0.9})`;
    // 縦横の十字
    ctx.fillRect(sx - 0.7, sy - s, 1.4, s * 2);
    ctx.fillRect(sx - s, sy - 0.7, s * 2, 1.4);
    // 中心の輝き
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.sin(phase * Math.PI) * 0.9})`;
    ctx.fillRect(sx - 1, sy - 1, 2, 2);
  }
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

/** 決定論的な擬似乱数（タイトル背景の星・窓の再現用） */
function _h2(n) {
  const s = Math.sin(n * 91.37 + 47.13) * 28411.13;
  return s - Math.floor(s);
}

/**
 * 都市のシルエット描画（タイトル画面背景用・多層パララックス）
 * @param {number} t - アニメーション用の経過秒
 */
function _drawCityScape(ctx, cw, ch, t = 0) {
  const baseY = ch * 0.75;

  // ── 瞬く星空 ──
  for (let i = 0; i < 70; i++) {
    const sx = _h2(i * 1.7) * cw;
    const sy = _h2(i * 3.1) * baseY * 0.7;
    const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.3));
    const r = 0.4 + _h2(i * 5.9) * 1.0;
    ctx.fillStyle = `rgba(220, 225, 255, ${tw * (0.3 + _h2(i * 2.3) * 0.5)})`;
    ctx.fillRect(sx, sy, r, r);
  }

  // ── 月（暈つき・クレーター） ──
  const moonX = cw * 0.78;
  const moonY = ch * 0.2;
  const moonGlow = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 90);
  moonGlow.addColorStop(0, 'rgba(220, 225, 245, 0.20)');
  moonGlow.addColorStop(1, 'rgba(220, 225, 245, 0)');
  ctx.fillStyle = moonGlow;
  ctx.fillRect(moonX - 90, moonY - 90, 180, 180);
  ctx.fillStyle = '#d6dae8';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(150, 155, 175, 0.5)';
  ctx.beginPath();
  ctx.arc(moonX + 8, moonY - 6, 5, 0, Math.PI * 2);
  ctx.arc(moonX - 9, moonY + 7, 4, 0, Math.PI * 2);
  ctx.arc(moonX + 4, moonY + 12, 3, 0, Math.PI * 2);
  ctx.fill();
  // 月にかかる薄雲（ゆっくり流れる）
  ctx.fillStyle = 'rgba(20, 22, 40, 0.55)';
  for (let i = 0; i < 4; i++) {
    const drift = ((t * 6 + i * 70) % (cw + 200)) - 100;
    const cyc = moonY - 14 + i * 9;
    ctx.beginPath();
    ctx.ellipse(moonX - 40 + drift * 0.15 + i * 18, cyc, 46, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 遠景ビル層（青く霞む） ──
  ctx.fillStyle = 'rgba(16, 18, 40, 0.85)';
  for (let i = 0; i < 12; i++) {
    const bw = 46 + _h2(i * 7.7) * 40;
    const bh = 70 + _h2(i * 4.3) * 120;
    const bx = i * (cw / 12) - 10;
    ctx.fillRect(bx, baseY - bh, bw, bh + 40);
    // 遠景の窓（まばらに点灯）
    for (let wy = baseY - bh + 10; wy < baseY - 6; wy += 16) {
      for (let wx = bx + 5; wx < bx + bw - 5; wx += 11) {
        if (_h2(wx * 1.3 + wy * 0.7) > 0.78) {
          ctx.fillStyle = 'rgba(180, 195, 255, 0.10)';
          ctx.fillRect(wx, wy, 4, 6);
          ctx.fillStyle = 'rgba(16, 18, 40, 0.85)';
        }
      }
    }
  }

  // ── 近景ビル層（濃い・屋上設備つき） ──
  const buildings = [
    { x: 30,  w: 90,  h: 210, roof: 'tank' },
    { x: 125, w: 64,  h: 150, roof: 'antenna' },
    { x: 198, w: 104, h: 290, roof: 'beacon' },
    { x: 312, w: 74,  h: 180, roof: 'box' },
    { x: 388, w: 124, h: 330, roof: 'antenna' },
    { x: 520, w: 56,  h: 150, roof: 'box' },
    { x: 582, w: 92,  h: 250, roof: 'tank' },
    { x: 682, w: 112, h: 300, roof: 'beacon' },
    { x: 800, w: 60,  h: 165, roof: 'box' },
    { x: 866, w: 104, h: 245, roof: 'antenna' },
  ];

  for (let bi = 0; bi < buildings.length; bi++) {
    const b = buildings[bi];
    const topY = baseY - b.h;
    // 本体（左右でわずかに陰影）
    const bGrad = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
    bGrad.addColorStop(0, 'rgba(13, 13, 30, 0.96)');
    bGrad.addColorStop(0.5, 'rgba(9, 9, 22, 0.96)');
    bGrad.addColorStop(1, 'rgba(5, 5, 14, 0.96)');
    ctx.fillStyle = bGrad;
    ctx.fillRect(b.x, topY, b.w, b.h + (ch - baseY));
    // 屋上のパラペット
    ctx.fillStyle = 'rgba(40, 42, 64, 0.5)';
    ctx.fillRect(b.x - 2, topY, b.w + 4, 3);

    // 屋上設備
    const rcx = b.x + b.w / 2;
    ctx.fillStyle = 'rgba(8, 8, 18, 0.96)';
    if (b.roof === 'antenna') {
      ctx.fillRect(rcx - 1, topY - 26, 2, 26);
      ctx.strokeStyle = 'rgba(8, 8, 18, 0.96)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rcx, topY - 26); ctx.lineTo(rcx - 8, topY);
      ctx.moveTo(rcx, topY - 26); ctx.lineTo(rcx + 8, topY);
      ctx.stroke();
      // 先端の航空障害灯（赤・明滅）
      const blink = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 3 + bi));
      ctx.fillStyle = `rgba(255, 60, 60, ${blink})`;
      ctx.fillRect(rcx - 1.5, topY - 28, 3, 3);
    } else if (b.roof === 'tank') {
      ctx.fillRect(rcx - 14, topY - 14, 28, 14);
      ctx.fillRect(rcx - 10, topY - 20, 20, 6);
      ctx.fillStyle = 'rgba(30, 32, 50, 0.5)';
      ctx.fillRect(rcx - 14, topY - 14, 28, 2);
    } else if (b.roof === 'beacon') {
      ctx.fillRect(rcx - 16, topY - 10, 32, 10);
      const blink = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2.4 + bi * 2));
      ctx.fillStyle = `rgba(255, 70, 70, ${blink})`;
      ctx.fillRect(rcx - 2, topY - 16, 4, 6);
      const bGlow = ctx.createRadialGradient(rcx, topY - 13, 1, rcx, topY - 13, 22);
      bGlow.addColorStop(0, `rgba(255, 70, 70, ${blink * 0.4})`);
      bGlow.addColorStop(1, 'rgba(255, 70, 70, 0)');
      ctx.fillStyle = bGlow;
      ctx.fillRect(rcx - 22, topY - 35, 44, 44);
    } else {
      ctx.fillRect(rcx - 12, topY - 9, 24, 9);
    }

    // 窓（決定論的に点灯・たまに暖色） — ビル本体色に戻す
    for (let wy = topY + 14; wy < baseY - 8; wy += 18) {
      for (let wx = b.x + 7; wx < b.x + b.w - 7; wx += 13) {
        const r = _h2(wx * 2.1 + wy * 1.7 + bi);
        if (r > 0.62) {
          const warm = r > 0.86;
          ctx.fillStyle = warm ? 'rgba(255, 205, 110, 0.16)' : 'rgba(150, 175, 255, 0.10)';
          ctx.fillRect(wx, wy, 7, 9);
          // 点灯窓の淡い光こぼれ
          if (warm) {
            ctx.fillStyle = 'rgba(255, 205, 110, 0.05)';
            ctx.fillRect(wx - 1, wy - 1, 9, 11);
          }
        } else {
          ctx.fillStyle = 'rgba(40, 44, 70, 0.18)';
          ctx.fillRect(wx, wy, 7, 9);
        }
      }
    }
  }

  // ── BLACK CORP 本社（中央奥の最も高いビルに赤ネオンの社名） ──
  const hqX = cw * 0.5 - 62;
  const hqTop = baseY - 330;
  ctx.fillStyle = 'rgba(60, 14, 20, 0.5)';
  ctx.fillRect(hqX, hqTop + 18, 124, 26);
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  const neon = 0.5 + 0.5 * Math.sin(t * 1.5);
  ctx.fillStyle = `rgba(255, 60, 70, ${0.55 + neon * 0.35})`;
  ctx.shadowColor = `rgba(255, 40, 50, ${0.6 * neon})`;
  ctx.shadowBlur = 14;
  ctx.fillText('BLACK CORP', cw * 0.5, hqTop + 35);
  ctx.shadowBlur = 0;

  // ── 地面 ──
  const groundGrad = ctx.createLinearGradient(0, baseY, 0, ch);
  groundGrad.addColorStop(0, '#0c0c1a');
  groundGrad.addColorStop(1, '#060610');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, baseY, cw, ch - baseY);

  // ── 地表の霧（ゆらめく） ──
  for (let i = 0; i < 5; i++) {
    const fy = baseY + 6 + i * 9;
    const drift = Math.sin(t * 0.5 + i * 1.7) * 30;
    ctx.fillStyle = `rgba(70, 75, 110, ${0.06 - i * 0.008})`;
    ctx.beginPath();
    ctx.ellipse(cw * 0.5 + drift, fy, cw * 0.6, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 街灯とゾンビのシルエット（地平線上） ──
  const lampXs = [cw * 0.18, cw * 0.62, cw * 0.88];
  for (let i = 0; i < lampXs.length; i++) {
    const lx = lampXs[i];
    ctx.strokeStyle = 'rgba(6, 6, 14, 0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx, baseY + 26);
    ctx.lineTo(lx, baseY - 30);
    ctx.lineTo(lx + 16, baseY - 34);
    ctx.stroke();
    // 灯り
    ctx.fillStyle = 'rgba(255, 210, 130, 0.7)';
    ctx.fillRect(lx + 14, baseY - 36, 5, 4);
    const lGlow = ctx.createRadialGradient(lx + 16, baseY - 34, 2, lx + 16, baseY - 34, 60);
    lGlow.addColorStop(0, 'rgba(255, 210, 130, 0.12)');
    lGlow.addColorStop(1, 'rgba(255, 210, 130, 0)');
    ctx.fillStyle = lGlow;
    ctx.fillRect(lx - 44, baseY - 78, 120, 100);
    // 街灯の下を徘徊するゾンビのシルエット
    const zx = lx + 8 + Math.sin(t * 0.6 + i * 2) * 22;
    const sway = Math.sin(t * 3 + i) * 1.5;
    ctx.fillStyle = 'rgba(4, 5, 10, 0.92)';
    ctx.fillRect(zx - 4, baseY - 2, 8, 12);            // 胴
    ctx.fillRect(zx - 3, baseY - 11, 6, 9);            // 頭〜肩
    ctx.fillRect(zx - 8 + sway, baseY - 1, 5, 2);      // 突き出た腕
    ctx.fillRect(zx - 4, baseY + 10, 3, 6);            // 脚
    ctx.fillRect(zx + 1, baseY + 10, 3, 6);
  }
  ctx.textAlign = 'center';
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
  ctx.strokeText('LEVEL UP! CHOOSE AN UPGRADE', cx, cy - 120);
  ctx.fillStyle = '#FFD700';
  ctx.fillText('LEVEL UP! CHOOSE AN UPGRADE', cx, cy - 120);

  ctx.font = '14px monospace';
  ctx.fillStyle = '#778899';
  ctx.fillText('Select with ← →  /  Confirm with Enter or Space', cx, cy - 92);

  // カード描画
  const cardW = 210;
  const cardH = 136;
  const gap = 18;
  const totalW = cardW * 3 + gap * 2;
  const startX = cx - totalW / 2;

  options.forEach((opt, i) => {
    const cardX = startX + i * (cardW + gap);
    const cardY = cy - cardH / 2 + 12;
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
