// sprites.js - Canvas 2D API ドット絵風キャラクター描画モジュール
// ピクセルサイズ 3-4px を基本単位として拡大ドット絵感を演出

const PX = 3; // 基本ピクセルサイズ

/**
 * ドットを打つヘルパー
 */
function dot(ctx, bx, by, col, px = PX) {
  ctx.fillStyle = col;
  ctx.fillRect(bx, by, px, px);
}

/**
 * 矩形ブロックを打つヘルパー（px単位の幅・高さ）
 */
function block(ctx, bx, by, w, h, col, px = PX) {
  ctx.fillStyle = col;
  ctx.fillRect(bx, by, w * px, h * px);
}

// ── カラーパレット ──
const PAL = {
  // 主人公
  hair: '#8B4513',
  hairHighlight: '#CD853F',
  skin: '#FFDAB9',
  skinShadow: '#E8C4A0',
  suitBlack: '#1A1A2E',
  suitDark: '#16213E',
  shirtWhite: '#F0F0F0',
  shirtShadow: '#D0D0D0',
  skirt: '#1A1A2E',
  shoes: '#2C2C2C',
  eye: '#2E86DE',
  eyeWhite: '#FFFFFF',
  mouth: '#E55B3C',
  laptop: '#555555',
  laptopScreen: '#00FF88',

  // ゾンビ社員
  zombieSkin: '#7C9A72',
  zombieSkinDark: '#5A7A52',
  zombieShirt: '#8A8A7A',
  zombieShirtRip: '#6A6A5A',
  zombiePants: '#4A4A3A',
  zombieEye: '#FF4444',

  // 中間管理職
  managerSkin: '#DEB887',
  managerSkinDark: '#C4A06A',
  managerSuit: '#2C3E50',
  managerTie: '#E74C3C',
  managerEye: '#FF0000',
  managerShirt: '#ECF0F1',

  // CEOゾンビ
  ceoSkin: '#9B8FBF',
  ceoSkinDark: '#7B6F9F',
  ceoSuit: '#1C1C3E',
  ceoSuitGold: '#FFD700',
  ceoTie: '#FFD700',
  ceoEye: '#FF00FF',

  // オーラ色（phase）
  auraP1: 'rgba(255, 50, 50, 0.3)',
  auraP2: 'rgba(150, 50, 255, 0.3)',
  auraP3: 'rgba(255, 215, 0, 0.3)',

  // アイテム
  energyCan: '#2196F3',
  energyCanDark: '#1565C0',
  energyLabel: '#FFFFFF',
  energyLiquid: '#00E5FF',
  onigiriRice: '#F5F5F5',
  onigiriNori: '#1B1B1B',
  onigiriUme: '#FF6B6B',

  // 飛び道具
  document: '#F5F5F5',
  documentLine: '#BBBBBB',
  money: '#2E7D32',
  moneyLight: '#4CAF50',
  moneySymbol: '#FFFFFF',
  stapler: '#667788',
  staplerAccent: '#99AABB',

  // パワハラ係長
  officerSkin: '#DEB887',
  officerSkinDark: '#C4A06A',
  officerSuit: '#1B2A4A',
  officerTie: '#9400D3',
  officerGlass: '#445566',
};

// ── flip用ヘルパー ──
function withFlip(ctx, x, y, width, facingRight, drawFn) {
  ctx.save();
  if (!facingRight) {
    ctx.translate(x + width, y);
    ctx.scale(-1, 1);
    ctx.translate(0, 0);
    drawFn(ctx, 0, 0);
  } else {
    drawFn(ctx, x, y);
  }
  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
// 主人公（スーツ姿の女性、25歳）
// ══════════════════════════════════════════════════════════════
export function drawPlayer(ctx, x, y, state, frame, facingRight) {
  const w = 16 * PX; // 48px wide
  const baseY = y;
  withFlip(ctx, x, y, w, facingRight, (c, bx, by) => {
    _drawPlayerInternal(c, bx, by, state, frame, baseY);
  });
}

function _drawPlayerInternal(ctx, x, y, state, frame) {
  const P = PX;
  const animFrame = frame % 4;
  let bobY = 0;
  let armAngle = 0;
  let legOffset = 0;

  // アニメーション状態
  switch (state) {
    case 'walk':
      bobY = Math.sin(animFrame * Math.PI / 2) * 2;
      legOffset = Math.sin(animFrame * Math.PI / 2) * 3;
      break;
    case 'attack':
      armAngle = animFrame < 2 ? -animFrame * 15 : (4 - animFrame) * 15;
      break;
    case 'special':
      armAngle = animFrame * 20 - 30;
      bobY = -animFrame * 2;
      break;
    case 'hurt':
      bobY = Math.sin(animFrame * Math.PI) * 3;
      break;
    case 'dash':
      bobY = -1;
      legOffset = animFrame * 2;
      break;
  }

  const ox = x;
  const oy = y + bobY;

  // ── 髪（ポニーテール） ──
  block(ctx, ox + 4 * P, oy + 0 * P, 8, 2, PAL.hair, P);
  block(ctx, ox + 3 * P, oy + 2 * P, 10, 3, PAL.hair, P);
  // ポニーテールの尻尾
  block(ctx, ox + 12 * P, oy + 2 * P, 2, 2, PAL.hair, P);
  block(ctx, ox + 13 * P, oy + 4 * P, 2, 3, PAL.hair, P);
  block(ctx, ox + 14 * P, oy + 6 * P, 1, 2, PAL.hairHighlight, P);
  // ハイライト
  dot(ctx, ox + 5 * P, oy + 1 * P, PAL.hairHighlight, P);
  dot(ctx, ox + 7 * P, oy + 1 * P, PAL.hairHighlight, P);

  // ── 顔 ──
  block(ctx, ox + 4 * P, oy + 5 * P, 8, 5, PAL.skin, P);
  block(ctx, ox + 4 * P, oy + 8 * P, 8, 2, PAL.skinShadow, P);
  // 目
  dot(ctx, ox + 5 * P, oy + 6 * P, PAL.eyeWhite, P);
  dot(ctx, ox + 6 * P, oy + 6 * P, PAL.eye, P);
  dot(ctx, ox + 9 * P, oy + 6 * P, PAL.eyeWhite, P);
  dot(ctx, ox + 10 * P, oy + 6 * P, PAL.eye, P);
  // 口
  if (state === 'attack' || state === 'special') {
    block(ctx, ox + 7 * P, oy + 8 * P, 2, 1, PAL.mouth, P);
  } else {
    dot(ctx, ox + 7 * P, oy + 8 * P, PAL.mouth, P);
  }

  // ── 首 ──
  block(ctx, ox + 6 * P, oy + 10 * P, 4, 1, PAL.skin, P);

  // ── シャツ ──
  block(ctx, ox + 5 * P, oy + 11 * P, 6, 2, PAL.shirtWhite, P);
  dot(ctx, ox + 7 * P, oy + 11 * P, PAL.shirtShadow, P);
  dot(ctx, ox + 8 * P, oy + 11 * P, PAL.shirtShadow, P);

  // ── スーツジャケット ──
  block(ctx, ox + 3 * P, oy + 11 * P, 2, 5, PAL.suitBlack, P);
  block(ctx, ox + 11 * P, oy + 11 * P, 2, 5, PAL.suitBlack, P);
  block(ctx, ox + 5 * P, oy + 13 * P, 6, 3, PAL.suitDark, P);

  // ── スカート ──
  block(ctx, ox + 4 * P, oy + 16 * P, 8, 3, PAL.skirt, P);

  // ── 腕 ──
  if (state === 'attack') {
    // 攻撃時：腕を前に伸ばす
    const armExtend = animFrame < 2 ? animFrame * 2 : (4 - animFrame) * 2;
    block(ctx, ox + 1 * P, oy + 12 * P, 2, 4, PAL.suitBlack, P);
    block(ctx, ox + 12 * P + armExtend * P, oy + 11 * P, 3, 2, PAL.skin, P);
    // ノートPC で殴る
    block(ctx, ox + 14 * P + armExtend * P, oy + 10 * P, 3, 3, PAL.laptop, P);
    dot(ctx, ox + 15 * P + armExtend * P, oy + 11 * P, PAL.laptopScreen, P);
  } else if (state === 'special') {
    // 辞表スラッシュ
    block(ctx, ox + 1 * P, oy + 11 * P, 2, 3, PAL.suitBlack, P);
    // 辞表を掲げる
    block(ctx, ox + 12 * P, oy + 8 * P - animFrame * P, 4, 5, '#FFFFFF', P);
    block(ctx, ox + 13 * P, oy + 9 * P - animFrame * P, 2, 3, '#FF0000', P);
    // スラッシュエフェクト
    if (animFrame >= 2) {
      ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
      ctx.fillRect(ox + 14 * P, oy + 5 * P, 6 * P, 2 * P);
    }
  } else {
    // 通常時
    block(ctx, ox + 1 * P, oy + 12 * P, 2, 4, PAL.suitBlack, P);
    block(ctx, ox + 13 * P, oy + 12 * P, 2, 4, PAL.suitBlack, P);
    // 手にノートPC
    block(ctx, ox + 13 * P, oy + 15 * P, 3, 2, PAL.laptop, P);
    dot(ctx, ox + 14 * P, oy + 15 * P, PAL.laptopScreen, P);
  }

  // ── 脚 ──
  if (state === 'walk' || state === 'dash') {
    block(ctx, ox + 5 * P, oy + 19 * P, 2, 3 + Math.floor(legOffset / 2), PAL.skin, P);
    block(ctx, ox + 9 * P, oy + 19 * P, 2, 3 - Math.floor(legOffset / 2), PAL.skin, P);
    block(ctx, ox + 5 * P, oy + 21 * P + Math.floor(legOffset / 2) * P, 2, 1, PAL.shoes, P);
    block(ctx, ox + 9 * P, oy + 21 * P - Math.floor(legOffset / 2) * P, 2, 1, PAL.shoes, P);
  } else {
    block(ctx, ox + 5 * P, oy + 19 * P, 2, 3, PAL.skin, P);
    block(ctx, ox + 9 * P, oy + 19 * P, 2, 3, PAL.skin, P);
    block(ctx, ox + 5 * P, oy + 21 * P, 2, 1, PAL.shoes, P);
    block(ctx, ox + 9 * P, oy + 21 * P, 2, 1, PAL.shoes, P);
  }

  // ── ダメージ時のフラッシュ ──
  if (state === 'hurt' && animFrame % 2 === 0) {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(ox, oy, 16 * P, 22 * P);
  }
}

// ══════════════════════════════════════════════════════════════
// ゾンビ社員（灰色の肌、ボロボロのスーツ）
// ══════════════════════════════════════════════════════════════
export function drawZombieEmployee(ctx, x, y, state, frame, facingRight) {
  const w = 14 * PX;
  withFlip(ctx, x, y, w, facingRight, (c, bx, by) => {
    _drawZombieEmployee(c, bx, by, state, frame);
  });
}

function _drawZombieEmployee(ctx, x, y, state, frame) {
  const P = PX;
  const animFrame = frame % 4;
  let bobY = 0;
  let legOffset = 0;
  let alpha = 1;

  switch (state) {
    case 'walk':
      bobY = Math.sin(animFrame * Math.PI / 2) * 2;
      legOffset = Math.sin(animFrame * Math.PI / 2) * 2;
      break;
    case 'attack':
      break;
    case 'hurt':
      bobY = Math.sin(animFrame * Math.PI) * 4;
      break;
    case 'die':
      alpha = 1 - (animFrame / 4);
      bobY = animFrame * 3;
      break;
  }

  ctx.globalAlpha = alpha;
  const ox = x;
  const oy = y + bobY;

  // ── 頭 ──
  block(ctx, ox + 3 * P, oy + 0 * P, 8, 3, PAL.zombieSkin, P);
  block(ctx, ox + 2 * P, oy + 3 * P, 10, 5, PAL.zombieSkin, P);
  block(ctx, ox + 3 * P, oy + 6 * P, 8, 2, PAL.zombieSkinDark, P);

  // 目（赤く光る）
  dot(ctx, ox + 4 * P, oy + 4 * P, PAL.zombieEye, P);
  dot(ctx, ox + 9 * P, oy + 4 * P, PAL.zombieEye, P);
  // 口（開いている）
  block(ctx, ox + 5 * P, oy + 6 * P, 4, 1, '#3A3A2A', P);
  dot(ctx, ox + 6 * P, oy + 7 * P, '#3A3A2A', P);

  // ランダムに髪の毛が残っている
  dot(ctx, ox + 3 * P, oy + 0 * P, '#4A4A3A', P);
  dot(ctx, ox + 7 * P, oy + 0 * P, '#4A4A3A', P);

  // ── 首 ──
  block(ctx, ox + 5 * P, oy + 8 * P, 4, 1, PAL.zombieSkinDark, P);

  // ── 胴体（ボロボロのシャツ） ──
  block(ctx, ox + 3 * P, oy + 9 * P, 8, 5, PAL.zombieShirt, P);
  // 破れ目
  dot(ctx, ox + 4 * P, oy + 10 * P, PAL.zombieSkin, P);
  dot(ctx, ox + 8 * P, oy + 12 * P, PAL.zombieSkin, P);
  dot(ctx, ox + 5 * P, oy + 13 * P, PAL.zombieShirtRip, P);

  // ── 腕 ──
  if (state === 'attack') {
    const extend = animFrame < 2 ? animFrame * 3 : (4 - animFrame) * 3;
    block(ctx, ox + 0 * P, oy + 10 * P, 3, 3, PAL.zombieSkin, P);
    block(ctx, ox + 11 * P + extend * P, oy + 9 * P, 3, 3, PAL.zombieSkin, P);
    // 爪
    dot(ctx, ox + 13 * P + extend * P, oy + 9 * P, '#AAAAAA', P);
    dot(ctx, ox + 13 * P + extend * P, oy + 11 * P, '#AAAAAA', P);
  } else {
    // だらんと垂らした腕
    block(ctx, ox + 0 * P, oy + 10 * P, 2, 5, PAL.zombieSkin, P);
    block(ctx, ox + 12 * P, oy + 10 * P, 2, 5, PAL.zombieSkin, P);
  }

  // ── ズボン ──
  block(ctx, ox + 3 * P, oy + 14 * P, 8, 3, PAL.zombiePants, P);
  // 破れ
  dot(ctx, ox + 6 * P, oy + 15 * P, PAL.zombieSkin, P);

  // ── 脚 ──
  block(ctx, ox + 4 * P, oy + 17 * P, 2, 3 + Math.floor(legOffset), PAL.zombiePants, P);
  block(ctx, ox + 8 * P, oy + 17 * P, 2, 3 - Math.floor(legOffset), PAL.zombiePants, P);
  // 靴
  block(ctx, ox + 3 * P, oy + 19 * P + Math.floor(legOffset) * P, 3, 1, '#3A3A2A', P);
  block(ctx, ox + 8 * P, oy + 19 * P - Math.floor(legOffset) * P, 3, 1, '#3A3A2A', P);

  ctx.globalAlpha = 1;
}

// ══════════════════════════════════════════════════════════════
// パワハラ中間管理職（赤いネクタイ、大柄）
// ══════════════════════════════════════════════════════════════
export function drawMiddleManager(ctx, x, y, state, frame, facingRight) {
  const w = 18 * PX;
  withFlip(ctx, x, y, w, facingRight, (c, bx, by) => {
    _drawMiddleManager(c, bx, by, state, frame);
  });
}

function _drawMiddleManager(ctx, x, y, state, frame) {
  const P = PX;
  const animFrame = frame % 4;
  let bobY = 0;
  let legOffset = 0;
  let alpha = 1;

  switch (state) {
    case 'walk':
      bobY = Math.sin(animFrame * Math.PI / 2) * 2;
      legOffset = Math.sin(animFrame * Math.PI / 2) * 2;
      break;
    case 'charge':
      bobY = -2;
      legOffset = animFrame * 2;
      break;
    case 'hurt':
      bobY = Math.sin(animFrame * Math.PI) * 4;
      break;
    case 'die':
      alpha = 1 - (animFrame / 4);
      bobY = animFrame * 4;
      break;
  }

  ctx.globalAlpha = alpha;
  const ox = x;
  const oy = y + bobY;

  // ── 頭（完全ハゲ：波平スタイル） ──
  block(ctx, ox + 3 * P, oy + 0 * P, 12, 2, '#9B8977', P); // 上部（濃い頭皮色）
  block(ctx, ox + 3 * P, oy + 2 * P, 12, 4, '#A89080', P); // 中部（明るい頭皮色）
  block(ctx, ox + 4 * P, oy + 6 * P, 10, 2, PAL.managerSkinDark, P);
  // つやつやハイライト
  block(ctx, ox + 4 * P, oy + 0 * P, 2, 1, '#D4C4B0', P); // 左上
  block(ctx, ox + 9 * P, oy + 1 * P, 2, 1, '#D4C4B0', P); // 右上

  // 眉毛（怒り）
  block(ctx, ox + 5 * P, oy + 3 * P, 3, 1, '#2A2A2A', P);
  block(ctx, ox + 10 * P, oy + 3 * P, 3, 1, '#2A2A2A', P);
  // 目（赤い）
  dot(ctx, ox + 5 * P, oy + 5 * P, '#FFFFFF', P);
  dot(ctx, ox + 6 * P, oy + 5 * P, PAL.managerEye, P);
  dot(ctx, ox + 11 * P, oy + 5 * P, '#FFFFFF', P);
  dot(ctx, ox + 12 * P, oy + 5 * P, PAL.managerEye, P);
  // 口（怒って開いている）
  block(ctx, ox + 7 * P, oy + 7 * P, 4, 1, '#8B0000', P);
  if (state === 'charge' || state === 'attack') {
    block(ctx, ox + 7 * P, oy + 8 * P, 4, 1, '#8B0000', P);
  }

  // ── 首 ──
  block(ctx, ox + 7 * P, oy + 9 * P, 4, 1, PAL.managerSkinDark, P);

  // ── 胴体（大柄なスーツ） ──
  block(ctx, ox + 2 * P, oy + 10 * P, 14, 7, PAL.managerSuit, P);
  // シャツ
  block(ctx, ox + 7 * P, oy + 10 * P, 4, 5, PAL.managerShirt, P);
  // 赤いネクタイ
  block(ctx, ox + 8 * P, oy + 10 * P, 2, 6, PAL.managerTie, P);
  dot(ctx, ox + 8 * P, oy + 16 * P, PAL.managerTie, P);

  // ── 腕 ──
  if (state === 'attack') {
    const smashFrame = animFrame < 2 ? animFrame : 3 - animFrame;
    block(ctx, ox + 0 * P, oy + 10 * P, 2, 5, PAL.managerSuit, P);
    // 拳を振り下ろす
    block(ctx, ox + 14 * P, oy + 8 * P + smashFrame * 2 * P, 3, 4, PAL.managerSuit, P);
    block(ctx, ox + 16 * P, oy + 11 * P + smashFrame * 2 * P, 2, 2, PAL.managerSkin, P);
  } else if (state === 'charge') {
    // 突進ポーズ
    block(ctx, ox + 0 * P, oy + 11 * P, 2, 4, PAL.managerSuit, P);
    block(ctx, ox + 14 * P, oy + 10 * P, 4, 3, PAL.managerSuit, P);
    block(ctx, ox + 17 * P, oy + 10 * P, 2, 2, PAL.managerSkin, P);
  } else {
    block(ctx, ox + 0 * P, oy + 11 * P, 2, 5, PAL.managerSuit, P);
    block(ctx, ox + 16 * P, oy + 11 * P, 2, 5, PAL.managerSuit, P);
  }

  // ── ズボン ──
  block(ctx, ox + 4 * P, oy + 17 * P, 10, 3, '#1A2530', P);

  // ── 脚 ──
  block(ctx, ox + 5 * P, oy + 20 * P, 3, 3 + Math.floor(legOffset), '#1A2530', P);
  block(ctx, ox + 10 * P, oy + 20 * P, 3, 3 - Math.floor(legOffset), '#1A2530', P);
  // 靴
  block(ctx, ox + 4 * P, oy + 22 * P + Math.floor(legOffset) * P, 4, 1, '#1A1A1A', P);
  block(ctx, ox + 10 * P, oy + 22 * P - Math.floor(legOffset) * P, 4, 1, '#1A1A1A', P);

  // ── charge時の怒りマーク ──
  if (state === 'charge') {
    ctx.fillStyle = '#FF0000';
    // 十字型怒りマーク
    ctx.fillRect(ox + 15 * P, oy + 0 * P, P, 3 * P);
    ctx.fillRect(ox + 14 * P, oy + 1 * P, 3 * P, P);
  }

  ctx.globalAlpha = 1;
}

// ══════════════════════════════════════════════════════════════
// パワハラ係長（メガネ、ホチキス持ち、ネイビースーツ）
// ══════════════════════════════════════════════════════════════
export function drawHarassingOfficer(ctx, x, y, state, frame, facingRight) {
  const w = 15 * PX;
  withFlip(ctx, x, y, w, facingRight, (c, bx, by) => {
    _drawHarassingOfficer(c, bx, by, state, frame);
  });
}

function _drawHarassingOfficer(ctx, x, y, state, frame) {
  const P = PX;
  const animFrame = frame % 4;
  let bobY = 0;
  let legOffset = 0;
  let alpha = 1;

  switch (state) {
    case 'walk':
      bobY = Math.sin(animFrame * Math.PI / 2) * 2;
      legOffset = Math.sin(animFrame * Math.PI / 2) * 2;
      break;
    case 'throw':
      bobY = -1;
      break;
    case 'hurt':
      bobY = Math.sin(animFrame * Math.PI) * 4;
      break;
    case 'die':
      alpha = 1 - animFrame / 4;
      bobY = animFrame * 4;
      break;
  }

  ctx.globalAlpha = alpha;
  const ox = x;
  const oy = y + bobY;

  // ── 頭（七三分け：左側に髪が多い） ──
  // 左側：髪（黒）
  block(ctx, ox + 2 * P, oy + 0 * P, 5, 3, '#2A2A2A', P); // 左側の髪
  // 右側：頭皮（禿げている）
  block(ctx, ox + 7 * P, oy + 0 * P, 6, 2, '#A89080', P); // 右側の頭皮

  block(ctx, ox + 2 * P, oy + 3 * P, 11, 5, PAL.officerSkin, P);
  block(ctx, ox + 3 * P, oy + 8 * P, 9, 1, PAL.officerSkinDark, P);

  // つやハイライト（右側の禿げた部分に）
  block(ctx, ox + 8 * P, oy + 0 * P, 2, 1, '#D4C4B0', P); // 右上つや

  // 眉毛（怒り・濃い）
  block(ctx, ox + 3 * P, oy + 2 * P, 3, 1, '#111111', P);
  block(ctx, ox + 9 * P, oy + 2 * P, 3, 1, '#111111', P);
  block(ctx, ox + 3 * P, oy + 3 * P, 3, 1, '#111111', P);
  block(ctx, ox + 9 * P, oy + 3 * P, 3, 1, '#111111', P);

  // メガネ
  ctx.fillStyle = PAL.officerGlass;
  ctx.fillRect(ox + 3 * P, oy + 3 * P, 4 * P, 2 * P);
  ctx.fillRect(ox + 8 * P, oy + 3 * P, 4 * P, 2 * P);
  ctx.fillRect(ox + 7 * P, oy + 4 * P, P, P);
  ctx.fillStyle = '#88AAFF';
  ctx.fillRect(ox + 4 * P, oy + 3 * P, P, P);
  ctx.fillRect(ox + 9 * P, oy + 3 * P, P, P);

  // 目
  dot(ctx, ox + 5 * P, oy + 4 * P, '#FF2200', P);
  dot(ctx, ox + 10 * P, oy + 4 * P, '#FF2200', P);

  // 口
  if (state === 'attack' || state === 'throw') {
    block(ctx, ox + 6 * P, oy + 6 * P, 3, 1, '#8B0000', P);
  } else {
    block(ctx, ox + 6 * P, oy + 7 * P, 2, 1, '#6A3A3A', P);
  }

  // ── 首 ──
  block(ctx, ox + 6 * P, oy + 8 * P, 3, 1, PAL.officerSkinDark, P);

  // ── 胴体（ネイビースーツ） ──
  block(ctx, ox + 2 * P, oy + 9 * P, 11, 6, PAL.officerSuit, P);
  block(ctx, ox + 6 * P, oy + 9 * P, 3, 5, '#E8E8E8', P);
  block(ctx, ox + 7 * P, oy + 9 * P, 1, 5, PAL.officerTie, P);
  dot(ctx, ox + 7 * P, oy + 14 * P, PAL.officerTie, P);

  // ── 腕 ──
  if (state === 'throw') {
    const throwExt = animFrame < 2 ? animFrame * 2 : (4 - animFrame) * 2;
    block(ctx, ox + 0 * P, oy + 10 * P, 2, 4, PAL.officerSuit, P);
    block(ctx, ox + 13 * P + throwExt * P, oy + 9 * P, 2, 3, PAL.officerSuit, P);
    block(ctx, ox + 14 * P + throwExt * P, oy + 9 * P, 3, 2, PAL.stapler, P);
    dot(ctx, ox + 15 * P + throwExt * P, oy + 9 * P, PAL.staplerAccent, P);
  } else if (state === 'attack') {
    const swingF = animFrame < 2 ? animFrame : 3 - animFrame;
    block(ctx, ox + 0 * P, oy + 9 * P, 2, 4, PAL.officerSuit, P);
    block(ctx, ox + 13 * P, oy + 9 * P + swingF * 2 * P, 2, 3, PAL.officerSuit, P);
    block(ctx, ox + 13 * P, oy + 11 * P + swingF * 2 * P, 2, 1, PAL.officerSkin, P);
  } else {
    block(ctx, ox + 0 * P, oy + 10 * P, 2, 4, PAL.officerSuit, P);
    block(ctx, ox + 13 * P, oy + 10 * P, 2, 4, PAL.officerSuit, P);
    block(ctx, ox + 13 * P, oy + 13 * P, 3, 2, PAL.stapler, P);
  }

  // ── ズボン ──
  block(ctx, ox + 3 * P, oy + 15 * P, 9, 3, '#141E2E', P);

  // ── 脚 ──
  block(ctx, ox + 4 * P, oy + 18 * P, 2, 3 + Math.floor(legOffset), '#141E2E', P);
  block(ctx, ox + 9 * P, oy + 18 * P, 2, 3 - Math.floor(legOffset), '#141E2E', P);
  block(ctx, ox + 3 * P, oy + 20 * P + Math.floor(legOffset) * P, 3, 1, '#1A1A1A', P);
  block(ctx, ox + 9 * P, oy + 20 * P - Math.floor(legOffset) * P, 3, 1, '#1A1A1A', P);

  if (state === 'hurt' && animFrame % 2 === 0) {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(ox, oy, 15 * P, 22 * P);
  }

  ctx.globalAlpha = 1;
}

// ══════════════════════════════════════════════════════════════
// CEOゾンビ（豪華なスーツ、金色のオーラ）
// ══════════════════════════════════════════════════════════════
export function drawCEOBoss(ctx, x, y, state, frame, facingRight, phase = 1) {
  const w = 22 * PX;

  // オーラ描画（phase別）
  const auraColors = [PAL.auraP1, PAL.auraP2, PAL.auraP3];
  const auraCol = auraColors[Math.min(phase - 1, 2)];
  const auraSize = 4 + Math.sin(frame * 0.5) * 2;
  ctx.fillStyle = auraCol;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 12 * PX, (w / 2) + auraSize * PX, 14 * PX + auraSize * PX, 0, 0, Math.PI * 2);
  ctx.fill();

  withFlip(ctx, x, y, w, facingRight, (c, bx, by) => {
    _drawCEOBoss(c, bx, by, state, frame, phase);
  });
}

function _drawCEOBoss(ctx, x, y, state, frame, phase) {
  const P = PX;
  const animFrame = frame % 4;
  let bobY = 0;
  let alpha = 1;

  switch (state) {
    case 'idle':
      bobY = Math.sin(animFrame * Math.PI / 2) * 1;
      break;
    case 'throw':
      break;
    case 'summon':
      bobY = -3;
      break;
    case 'shockwave':
      bobY = animFrame < 2 ? -animFrame * 3 : (animFrame - 4) * 3;
      break;
    case 'hurt':
      bobY = Math.sin(animFrame * Math.PI) * 5;
      break;
    case 'die':
      alpha = 1 - (animFrame / 4);
      bobY = animFrame * 5;
      break;
  }

  ctx.globalAlpha = alpha;
  const ox = x;
  const oy = y + bobY;

  // ── 頭（王冠風の髪） ──
  // 髪/頭頂
  block(ctx, ox + 6 * P, oy + 0 * P, 10, 2, '#2A2A4A', P);
  // 白髪混じり
  dot(ctx, ox + 8 * P, oy + 0 * P, '#C0C0C0', P);
  dot(ctx, ox + 12 * P, oy + 0 * P, '#C0C0C0', P);

  // 顔
  block(ctx, ox + 5 * P, oy + 2 * P, 12, 7, PAL.ceoSkin, P);
  block(ctx, ox + 6 * P, oy + 7 * P, 10, 2, PAL.ceoSkinDark, P);

  // 目
  dot(ctx, ox + 7 * P, oy + 4 * P, '#FFFFFF', P);
  dot(ctx, ox + 8 * P, oy + 4 * P, PAL.ceoEye, P);
  dot(ctx, ox + 13 * P, oy + 4 * P, '#FFFFFF', P);
  dot(ctx, ox + 14 * P, oy + 4 * P, PAL.ceoEye, P);

  // 口
  if (state === 'summon' || state === 'shockwave') {
    block(ctx, ox + 9 * P, oy + 7 * P, 4, 2, '#4A0040', P);
  } else {
    block(ctx, ox + 9 * P, oy + 7 * P, 3, 1, '#4A0040', P);
  }

  // ── 首 ──
  block(ctx, ox + 9 * P, oy + 9 * P, 4, 1, PAL.ceoSkinDark, P);

  // ── 胴体（高級スーツ） ──
  block(ctx, ox + 3 * P, oy + 10 * P, 16, 8, PAL.ceoSuit, P);

  // 金のラペル
  block(ctx, ox + 4 * P, oy + 10 * P, 2, 6, PAL.ceoSuitGold, P);
  block(ctx, ox + 16 * P, oy + 10 * P, 2, 6, PAL.ceoSuitGold, P);

  // シャツ
  block(ctx, ox + 8 * P, oy + 10 * P, 6, 6, '#E8E8E8', P);

  // 金のネクタイ
  block(ctx, ox + 10 * P, oy + 10 * P, 2, 7, PAL.ceoTie, P);
  dot(ctx, ox + 10 * P, oy + 17 * P, PAL.ceoTie, P);

  // フェーズごとのスーツの装飾
  if (phase >= 2) {
    // 紫の模様
    dot(ctx, ox + 5 * P, oy + 12 * P, '#9B59B6', P);
    dot(ctx, ox + 15 * P, oy + 12 * P, '#9B59B6', P);
    dot(ctx, ox + 6 * P, oy + 15 * P, '#9B59B6', P);
    dot(ctx, ox + 14 * P, oy + 15 * P, '#9B59B6', P);
  }
  if (phase >= 3) {
    // 金の模様
    dot(ctx, ox + 5 * P, oy + 14 * P, '#FFD700', P);
    dot(ctx, ox + 15 * P, oy + 14 * P, '#FFD700', P);
    dot(ctx, ox + 7 * P, oy + 13 * P, '#FFD700', P);
    dot(ctx, ox + 13 * P, oy + 13 * P, '#FFD700', P);
  }

  // ── 腕 ──
  if (state === 'throw') {
    const throwPhase = animFrame < 2 ? animFrame : 3 - animFrame;
    block(ctx, ox + 0 * P, oy + 11 * P, 3, 5, PAL.ceoSuit, P);
    block(ctx, ox + 18 * P + throwPhase * P, oy + 10 * P, 3, 4, PAL.ceoSuit, P);
    block(ctx, ox + 20 * P + throwPhase * P, oy + 10 * P, 2, 2, PAL.ceoSkin, P);
  } else if (state === 'summon') {
    // 両手を上げる
    block(ctx, ox + 0 * P, oy + 7 * P, 3, 5, PAL.ceoSuit, P);
    block(ctx, ox + 19 * P, oy + 7 * P, 3, 5, PAL.ceoSuit, P);
    block(ctx, ox + 0 * P, oy + 6 * P, 2, 2, PAL.ceoSkin, P);
    block(ctx, ox + 20 * P, oy + 6 * P, 2, 2, PAL.ceoSkin, P);
  } else if (state === 'shockwave') {
    // 地面に拳を叩きつける
    block(ctx, ox + 0 * P, oy + 14 * P, 3, 6, PAL.ceoSuit, P);
    block(ctx, ox + 19 * P, oy + 14 * P, 3, 6, PAL.ceoSuit, P);
    block(ctx, ox + 0 * P, oy + 19 * P, 2, 2, PAL.ceoSkin, P);
    block(ctx, ox + 20 * P, oy + 19 * P, 2, 2, PAL.ceoSkin, P);
  } else {
    block(ctx, ox + 0 * P, oy + 11 * P, 3, 6, PAL.ceoSuit, P);
    block(ctx, ox + 19 * P, oy + 11 * P, 3, 6, PAL.ceoSuit, P);
  }

  // ── ズボン ──
  block(ctx, ox + 5 * P, oy + 18 * P, 12, 3, '#15152E', P);

  // ── 脚 ──
  block(ctx, ox + 6 * P, oy + 21 * P, 3, 3, '#15152E', P);
  block(ctx, ox + 13 * P, oy + 21 * P, 3, 3, '#15152E', P);
  // 高級靴
  block(ctx, ox + 5 * P, oy + 23 * P, 4, 1, '#0A0A1A', P);
  block(ctx, ox + 13 * P, oy + 23 * P, 4, 1, '#0A0A1A', P);
  // 金の靴飾り
  dot(ctx, ox + 5 * P, oy + 23 * P, '#FFD700', P);
  dot(ctx, ox + 16 * P, oy + 23 * P, '#FFD700', P);

  // ── shockwave エフェクト ──
  if (state === 'shockwave' && animFrame >= 2) {
    ctx.fillStyle = phase === 3 ? 'rgba(255, 215, 0, 0.4)' : phase === 2 ? 'rgba(150, 50, 255, 0.4)' : 'rgba(255, 50, 50, 0.4)';
    // 衝撃波の広がり
    const waveW = (animFrame - 1) * 10 * P;
    ctx.fillRect(ox + 11 * P - waveW, oy + 22 * P, waveW * 2, 3 * P);
  }

  ctx.globalAlpha = 1;
}

// ══════════════════════════════════════════════════════════════
// アイテム描画
// ══════════════════════════════════════════════════════════════
export function drawItem(ctx, x, y, type) {
  const P = PX;

  if (type === 'energy_drink') {
    // 缶本体
    block(ctx, x + 1 * P, y + 0 * P, 6, 1, '#C0C0C0', P); // 缶の蓋
    block(ctx, x + 0 * P, y + 1 * P, 8, 10, PAL.energyCan, P);
    block(ctx, x + 1 * P, y + 2 * P, 6, 8, PAL.energyCanDark, P);
    // ラベル
    block(ctx, x + 2 * P, y + 3 * P, 4, 3, PAL.energyLabel, P);
    // 稲妻マーク
    dot(ctx, x + 4 * P, y + 3 * P, '#FFD700', P);
    dot(ctx, x + 3 * P, y + 4 * P, '#FFD700', P);
    dot(ctx, x + 4 * P, y + 5 * P, '#FFD700', P);
    // 液体の透け
    block(ctx, x + 2 * P, y + 7 * P, 4, 2, PAL.energyLiquid, P);
    // 光沢
    dot(ctx, x + 1 * P, y + 2 * P, 'rgba(255,255,255,0.4)', P);
    dot(ctx, x + 1 * P, y + 3 * P, 'rgba(255,255,255,0.3)', P);

  } else if (type === 'onigiri') {
    // おにぎり（三角形）
    dot(ctx, x + 4 * P, y + 0 * P, PAL.onigiriRice, P);
    block(ctx, x + 3 * P, y + 1 * P, 3, 1, PAL.onigiriRice, P);
    block(ctx, x + 2 * P, y + 2 * P, 5, 1, PAL.onigiriRice, P);
    block(ctx, x + 1 * P, y + 3 * P, 7, 1, PAL.onigiriRice, P);
    block(ctx, x + 0 * P, y + 4 * P, 9, 2, PAL.onigiriRice, P);
    block(ctx, x + 0 * P, y + 6 * P, 9, 3, PAL.onigiriRice, P);
    // 海苔（縦長）
    block(ctx, x + 3 * P, y + 3 * P, 3, 6, PAL.onigiriNori, P);
    // 光沢
    dot(ctx, x + 3 * P, y + 1 * P, 'rgba(255,255,255,0.3)', P);

  } else if (type === 'money') {
    // 日本の札束（一万円札イメージ：茶色・金茶系）
    const billColor   = '#8B6914'; // 一万円札の茶色
    const billLight   = '#C49A2A'; // 明るい面
    const billShadow  = '#5C420A'; // 影・側面
    const bandColor   = '#C8960A'; // 帯（金色の紙帯）
    const bandLight   = '#FFD700';
    const edgeColor   = '#3A2200'; // 札の端

    // 厚みの側面（下・右に積み重ね感）
    block(ctx, x + 2 * P, y + 7 * P, 9, 2, billShadow, P); // 下側面
    block(ctx, x + 9 * P, y + 1 * P, 2, 6, billShadow, P); // 右側面

    // 段差（複数枚の重なり表現）
    block(ctx, x + 1 * P, y + 6 * P, 9, 1, billShadow, P);
    block(ctx, x + 1 * P, y + 5 * P, 9, 1, '#6B4E10', P);

    // 札束の正面（メイン）
    block(ctx, x + 0 * P, y + 0 * P, 9, 6, billColor, P);
    // 上面ハイライト
    block(ctx, x + 1 * P, y + 1 * P, 7, 1, billLight, P);
    // 模様（紙幣風の横線）
    block(ctx, x + 1 * P, y + 2 * P, 3, 1, billLight, P);
    block(ctx, x + 5 * P, y + 2 * P, 3, 1, billLight, P);
    block(ctx, x + 1 * P, y + 4 * P, 7, 1, '#7A5515', P);

    // ¥マーク（中央）
    dot(ctx, x + 3 * P, y + 2 * P, edgeColor, P);
    dot(ctx, x + 5 * P, y + 2 * P, edgeColor, P);
    dot(ctx, x + 4 * P, y + 3 * P, edgeColor, P);
    block(ctx, x + 3 * P, y + 4 * P, 3, 1, edgeColor, P);
    dot(ctx, x + 4 * P, y + 5 * P, edgeColor, P);

    // 帯（金色の束ね帯）
    block(ctx, x + 3 * P, y + 0 * P, 2, 6, bandColor, P);
    dot(ctx, x + 3 * P, y + 0 * P, bandLight, P);
    dot(ctx, x + 4 * P, y + 5 * P, '#994400', P);
  }
}

// ══════════════════════════════════════════════════════════════
// 飛び道具描画
// ══════════════════════════════════════════════════════════════
export function drawProjectile(ctx, x, y, type, frame) {
  const P = PX;
  const rot = (frame % 8) * (Math.PI / 4); // 回転

  ctx.save();
  ctx.translate(x + 4 * P, y + 4 * P);
  ctx.rotate(rot);

  if (type === 'document') {
    // 白い四角（書類）
    block(ctx, -3 * P, -4 * P, 6, 8, PAL.document, P);
    // 線（テキスト風）
    block(ctx, -2 * P, -3 * P, 4, 1, PAL.documentLine, P);
    block(ctx, -2 * P, -1 * P, 3, 1, PAL.documentLine, P);
    block(ctx, -2 * P, 1 * P, 4, 1, PAL.documentLine, P);
    block(ctx, -2 * P, 3 * P, 2, 1, PAL.documentLine, P);
    // 赤いハンコ
    dot(ctx, 1 * P, 2 * P, '#FF0000', P);

  } else if (type === 'money') {
    // 札束（相対座標）
    block(ctx, -3 * P, -2 * P, 6, 4, PAL.money, P);
    block(ctx, -2 * P, -1 * P, 4, 2, PAL.moneyLight, P);
    // ¥ マーク
    dot(ctx, 0 * P, -1 * P, PAL.moneySymbol, P);
    dot(ctx, -1 * P, 0 * P, PAL.moneySymbol, P);
    dot(ctx, 0 * P, 0 * P, PAL.moneySymbol, P);
    // 紙幣の端
    dot(ctx, -3 * P, -2 * P, '#1B5E20', P);
    dot(ctx, 2 * P, 1 * P, '#1B5E20', P);
    // 帯（束ねた線）
    block(ctx, -1 * P, -2 * P, 2, 4, '#8B6914', P);

  } else if (type === 'stapler') {
    // ホチキス（灰色の小さい直方体）
    ctx.fillStyle = PAL.stapler;
    ctx.fillRect(-3 * P, -P, 6 * P, 2 * P);
    ctx.fillStyle = PAL.staplerAccent;
    ctx.fillRect(-2 * P, -P, 2 * P, P);
    dot(ctx, P, 0, '#334455', P);
  }

  ctx.restore();
}
