// sprites.js - Canvas 2D API 高精細ドット絵キャラクター描画モジュール
// 旧版の 3px ドットを 1.5px サブピクセルに細分化（解像度2倍）し、
// 多段階シェーディング・ディザリング・輪郭・落ち影でリアル寄りに描画する。
// 各キャラクターの外形サイズ（当たり判定基準）は旧版と同一。

const PX = 3;      // 旧基本ピクセル（外形サイズの基準）
const S = PX / 2;  // 高精細サブピクセル（1.5px）

/**
 * 描画ペン生成：グリッド座標 (gx, gy) を S 単位で塗るヘルパー群
 *  R: 矩形塗り / D: チェッカーディザ塗り（陰影のグラデーション表現用）
 */
function makePen(ctx, ox, oy) {
  const R = (gx, gy, w, h, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(ox + gx * S, oy + gy * S, w * S, h * S);
  };
  const D = (gx, gy, w, h, col) => {
    ctx.fillStyle = col;
    for (let j = 0; j < h; j++) {
      for (let i = j % 2; i < w; i += 2) {
        ctx.fillRect(ox + (gx + i) * S, oy + (gy + j) * S, S, S);
      }
    }
  };
  return { R, D };
}

/** キャラクター足元の落ち影 */
function drawShadow(ctx, cx, footY, rx) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, footY - 1, rx, rx * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── flip用ヘルパー ──
function withFlip(ctx, x, y, width, facingRight, drawFn) {
  ctx.save();
  if (!facingRight) {
    ctx.translate(x + width, y);
    ctx.scale(-1, 1);
    drawFn(ctx, 0, 0);
  } else {
    drawFn(ctx, x, y);
  }
  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
// 主人公（スーツ姿の女性、25歳）グリッド 32×44（48×66px）
// ══════════════════════════════════════════════════════════════
const PC = {
  hairD: '#4A2408', hair: '#7A3B10', hairM: '#94511A', hairL: '#C77B33', hairS: '#E8A85C',
  skin: '#FFD9B4', skinS: '#EBBE92', skinD: '#CE9D6E', blush: '#FFA896',
  suit: '#20203A', suitL: '#32324E', suitD: '#13132A', suitHL: '#42426E',
  shirt: '#F2F3F7', shirtS: '#CDD0DC',
  shoe: '#23232E', shoeL: '#3E3E50',
  iris: '#2E86DE', irisD: '#163A60', lash: '#553823', brow: '#7A4516',
  mouth: '#C2503A', mouthOpen: '#A33327',
  lapBody: '#4A4E58', lapDark: '#2E3138', lapScr: '#19F08C', lapScrD: '#0A8C4E',
};

export function drawPlayer(ctx, x, y, state, frame, facingRight) {
  const w = 32 * S; // 48px
  drawShadow(ctx, x + w / 2, y + 44 * S, 13 * S);
  withFlip(ctx, x, y, w, facingRight, (c, bx, by) => {
    _drawPlayerInternal(c, bx, by, state, frame);
  });
}

function _drawPlayerInternal(ctx, x, y, state, frame) {
  const animFrame = frame % 4;
  let bobY = 0;
  let legOffset = 0;

  switch (state) {
    case 'walk':
      bobY = Math.sin(animFrame * Math.PI / 2) * 2;
      legOffset = Math.sin(animFrame * Math.PI / 2) * 3;
      break;
    case 'attack':
      break;
    case 'special':
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
  const { R, D } = makePen(ctx, ox, oy);
  const lo2 = Math.floor(legOffset / 2) * 2;

  // ── ポニーテール（体の後ろ、揺れる） ──
  const sw = Math.round(Math.sin(frame * 0.35));
  R(23, 2, 5, 3, PC.hairM);
  R(25, 5, 4, 4, PC.hair);
  R(26 + sw, 9, 4, 5, PC.hairM);
  R(27 + sw, 14, 3, 4, PC.hair);
  R(28 + sw, 18, 2, 3, PC.hairD);
  R(26, 6, 1, 3, PC.hairL);
  R(27 + sw, 10, 1, 4, PC.hairS);
  R(28 + sw, 15, 1, 2, PC.hairL);

  // ── 髪（クラウン〜サイド） ──
  R(10, 0, 12, 1, PC.hairD);
  R(9, 1, 14, 2, PC.hair);
  R(8, 3, 16, 3, PC.hair);
  R(7, 6, 18, 3, PC.hairM);
  // つやのハイライトバンド
  R(11, 1, 4, 1, PC.hairL);
  R(17, 1, 3, 1, PC.hairL);
  R(10, 2, 2, 1, PC.hairS);
  R(13, 2, 1, 1, PC.hairS);
  D(9, 4, 14, 2, PC.hairL);
  // サイドの髪房
  R(7, 9, 2, 7, PC.hair);
  R(23, 9, 2, 7, PC.hair);
  R(7, 14, 2, 3, PC.hairD);
  R(23, 14, 2, 3, PC.hairD);

  // ── 顔 ──
  R(9, 9, 14, 10, PC.skin);
  // 頬・顎まわりの陰影
  R(9, 13, 1, 5, PC.skinS);
  R(22, 13, 1, 5, PC.skinS);
  R(9, 18, 14, 1, PC.skinS);
  // 前髪（ジグザグの房）
  R(9, 9, 14, 2, PC.hairM);
  R(10, 11, 2, 1, PC.hairM);
  R(14, 11, 2, 1, PC.hairM);
  R(19, 11, 2, 1, PC.hairM);
  R(11, 10, 2, 1, PC.hairL);
  R(17, 10, 2, 1, PC.hairL);
  // 眉
  R(10, 12, 4, 1, PC.brow);
  R(18, 12, 4, 1, PC.brow);
  // 目（まつ毛・白目・虹彩・瞳孔・キャッチライト）
  R(10, 13, 4, 1, PC.lash);
  R(18, 13, 4, 1, PC.lash);
  R(10, 14, 4, 2, '#FFFFFF');
  R(18, 14, 4, 2, '#FFFFFF');
  R(11, 14, 2, 2, PC.iris);
  R(19, 14, 2, 2, PC.iris);
  R(12, 15, 1, 1, PC.irisD);
  R(20, 15, 1, 1, PC.irisD);
  R(11, 14, 1, 1, '#CFE9FF');
  R(19, 14, 1, 1, '#CFE9FF');
  // 鼻
  R(15, 16, 1, 1, PC.skinD);
  // チーク
  D(9, 16, 3, 2, PC.blush);
  D(20, 16, 3, 2, PC.blush);
  // 口
  if (state === 'attack' || state === 'special') {
    R(13, 17, 5, 2, PC.mouthOpen);
    R(14, 18, 3, 1, '#7A1F18');
  } else {
    R(14, 18, 3, 1, PC.mouth);
  }

  // ── 首 ──
  R(13, 19, 6, 3, PC.skin);
  R(13, 19, 6, 1, PC.skinD);

  // ── シャツの襟元 ──
  R(11, 22, 10, 2, PC.shirt);
  R(13, 23, 6, 1, PC.shirtS);
  R(13, 24, 6, 4, PC.shirt);
  R(15, 24, 1, 4, PC.shirtS);

  // ── スーツジャケット ──
  // 肩
  R(5, 22, 6, 2, PC.suitL);
  R(21, 22, 6, 2, PC.suitL);
  // 身頃
  R(5, 24, 5, 9, PC.suit);
  R(22, 24, 5, 9, PC.suit);
  // ラペル
  R(10, 22, 2, 5, PC.suitD);
  R(20, 22, 2, 5, PC.suitD);
  R(11, 26, 2, 3, PC.suitD);
  R(19, 26, 2, 3, PC.suitD);
  // 前合わせ（下部）とボタン
  R(9, 28, 14, 5, PC.suit);
  R(15, 29, 1, 1, '#C9A86A');
  R(15, 31, 1, 1, '#C9A86A');
  // 陰影とリムライト
  R(5, 24, 1, 9, PC.suitD);
  R(26, 24, 1, 9, PC.suitD);
  D(6, 28, 3, 5, PC.suitD);
  R(24, 24, 1, 7, PC.suitHL);
  R(9, 32, 14, 1, PC.suitD);

  // ── スカート（プリーツ入り） ──
  R(8, 33, 16, 3, PC.suit);
  R(7, 36, 18, 2, PC.suitD);
  R(11, 33, 1, 4, PC.suitD);
  R(15, 33, 1, 4, PC.suitD);
  R(19, 33, 1, 4, PC.suitD);
  R(9, 33, 1, 3, PC.suitHL);

  // ── 腕 ──
  if (state === 'attack') {
    const e2 = (animFrame < 2 ? animFrame * 2 : (4 - animFrame) * 2) * 2;
    // 奥の腕
    R(2, 24, 4, 8, PC.suit);
    R(2, 31, 4, 1, PC.suitD);
    R(3, 32, 2, 2, PC.skin);
    // 前へ伸ばす腕
    R(24 + e2, 22, 6, 3, PC.suit);
    R(28 + e2, 23, 4, 2, PC.skin);
    // ノートPC（武器）
    R(30 + e2, 18, 7, 8, PC.lapDark);
    R(31 + e2, 19, 5, 6, PC.lapBody);
    R(31 + e2, 19, 5, 4, PC.lapScrD);
    R(32 + e2, 20, 3, 2, PC.lapScr);
    R(32 + e2, 24, 3, 1, '#6A6E78');
    // スイングの残像
    if (animFrame === 1 || animFrame === 2) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(ox + (26 + e2) * S, oy + 16 * S, 10 * S, 2 * S);
    }
  } else if (state === 'special') {
    // 奥の腕
    R(2, 22, 4, 6, PC.suit);
    R(3, 28, 2, 2, PC.skin);
    // 辞表を掲げる腕
    R(24, 18 - animFrame * 2, 4, 6, PC.suit);
    // 辞表（紙＋赤文字＋印）
    const py = 16 - animFrame * 2;
    R(24, py, 8, 10, '#FFFFFF');
    R(24, py, 8, 1, '#D8D8E0');
    R(31, py, 1, 10, '#C8C8D4');
    R(26, py + 2, 2, 5, '#D03028');
    R(29, py + 7, 2, 2, '#D03028');
    // スラッシュエフェクト
    if (animFrame >= 2) {
      ctx.fillStyle = 'rgba(255, 255, 160, 0.7)';
      ctx.fillRect(ox + 32 * S, oy + 10 * S, 12 * S, 2 * S);
      ctx.fillStyle = 'rgba(255, 240, 100, 0.35)';
      ctx.fillRect(ox + 30 * S, oy + 13 * S, 14 * S, 3 * S);
    }
  } else {
    // 通常時
    R(2, 24, 4, 8, PC.suit);
    R(2, 24, 1, 8, PC.suitD);
    R(2, 31, 4, 1, PC.suitD);
    R(3, 32, 2, 2, PC.skin);
    R(26, 24, 4, 8, PC.suit);
    R(29, 24, 1, 7, PC.suitHL);
    R(26, 31, 3, 2, PC.skin);
    // 手に提げたノートPC
    R(25, 30, 7, 4, PC.lapDark);
    R(26, 31, 5, 2, PC.lapBody);
    R(26, 30, 5, 1, PC.lapScrD);
    R(28, 31, 2, 1, PC.lapScr);
  }

  // ── 脚（ストッキングのつや入り） ──
  R(11, 38, 3, 6 + lo2, PC.skin);
  R(11, 38, 1, 6 + lo2, PC.skinS);
  R(18, 38, 3, 6 - lo2, PC.skin);
  R(20, 38, 1, 6 - lo2, PC.skinS);
  // パンプス
  R(10, 42 + lo2, 5, 2, PC.shoe);
  R(11, 42 + lo2, 2, 1, PC.shoeL);
  R(17, 42 - lo2, 5, 2, PC.shoe);
  R(18, 42 - lo2, 2, 1, PC.shoeL);

  // ── ダメージ時のフラッシュ ──
  if (state === 'hurt' && animFrame % 2 === 0) {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(ox, oy, 32 * S, 44 * S);
  }
}

// ══════════════════════════════════════════════════════════════
// ゾンビ社員 グリッド 28×40（42×60px）
// ══════════════════════════════════════════════════════════════
const ZB = {
  skin: '#7C9A72', skinL: '#94B086', skinD: '#56714E', skinDD: '#3E5238',
  shirt: '#8E8C7C', shirtD: '#6E6C5C', shirtL: '#A6A494',
  pants: '#46443A', pantsD: '#32302A',
  eye: '#FF3B30', socket: '#2E2E22', teeth: '#C9C4A8',
};

export function drawZombieEmployee(ctx, x, y, state, frame, facingRight) {
  const w = 28 * S; // 42px
  if (state !== 'die') drawShadow(ctx, x + w / 2, y + 40 * S, 12 * S);
  withFlip(ctx, x, y, w, facingRight, (c, bx, by) => {
    _drawZombieEmployee(c, bx, by, state, frame);
  });
}

function _drawZombieEmployee(ctx, x, y, state, frame) {
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
  const { R, D } = makePen(ctx, ox, oy);
  const lo2 = Math.floor(legOffset) * 2;

  // ── 頭 ──
  R(7, 0, 14, 2, ZB.skinD);
  R(5, 2, 18, 4, ZB.skin);
  R(4, 6, 20, 6, ZB.skin);
  R(5, 12, 18, 3, ZB.skinD);
  // 腐敗のまだら模様
  D(6, 3, 5, 3, ZB.skinD);
  D(16, 7, 5, 4, ZB.skinD);
  D(8, 9, 3, 2, ZB.skinDD);
  R(20, 3, 2, 2, ZB.skinL);
  // 残った髪
  R(7, 0, 1, 2, '#3A3A2C');
  R(12, 0, 1, 1, '#3A3A2C');
  R(17, 0, 2, 1, '#3A3A2C');
  // 額の縫い跡
  R(14, 2, 5, 1, '#4A3A30');
  R(15, 1, 1, 1, '#4A3A30');
  R(17, 3, 1, 1, '#4A3A30');
  // 目（左右非対称・赤く光る）
  ctx.fillStyle = 'rgba(255, 60, 40, 0.3)';
  ctx.fillRect(ox + 7 * S, oy + 6 * S, 6 * S, 5 * S);
  ctx.fillRect(ox + 17 * S, oy + 7 * S, 6 * S, 5 * S);
  R(8, 7, 4, 3, ZB.socket);
  R(18, 8, 4, 3, ZB.socket);
  R(9, 8, 2, 2, ZB.eye);
  R(19, 9, 2, 2, ZB.eye);
  R(9, 8, 1, 1, '#FFB0A0');
  R(19, 9, 1, 1, '#FFB0A0');
  // 鼻（そげ落ちた穴）
  R(14, 10, 1, 2, ZB.skinDD);
  // 口（開いてギザギザの歯）
  R(9, 12, 10, 2, '#26261C');
  R(10, 12, 1, 1, ZB.teeth);
  R(13, 12, 1, 1, ZB.teeth);
  R(16, 12, 1, 1, ZB.teeth);
  R(12, 13, 1, 1, ZB.teeth);
  // よだれ
  R(11, 14, 1, 2, '#9FD8C8');

  // ── 首 ──
  R(10, 16, 8, 2, ZB.skinD);

  // ── 胴体（ボロボロのシャツ） ──
  R(6, 18, 16, 10, ZB.shirt);
  R(6, 18, 1, 10, ZB.shirtD);
  R(21, 18, 1, 10, ZB.shirtD);
  R(8, 18, 2, 8, ZB.shirtL);
  // 緩んだ曲がりネクタイ
  R(13, 18, 2, 3, '#5A2E2E');
  R(14, 21, 2, 4, '#5A2E2E');
  // 破れ目から覗く肌
  R(8, 20, 2, 3, ZB.skin);
  R(8, 22, 2, 1, ZB.skinD);
  R(16, 24, 3, 2, ZB.skin);
  R(17, 25, 2, 1, ZB.skinD);
  D(10, 25, 4, 2, ZB.shirtD);
  // 裾の破れ（ジグザグ）
  R(7, 27, 2, 1, ZB.shirtD);
  R(12, 27, 2, 1, ZB.shirtD);
  R(18, 27, 2, 1, ZB.shirtD);

  // ── 腕 ──
  if (state === 'attack') {
    const e2 = (animFrame < 2 ? animFrame * 3 : (4 - animFrame) * 3) * 2;
    // 奥の腕
    R(0, 20, 6, 6, ZB.skin);
    R(0, 20, 6, 2, ZB.shirt);
    // 前に突き出す腕
    R(22 + e2, 18, 6, 6, ZB.skin);
    R(22 + e2, 18, 2, 6, ZB.skinD);
    // 爪
    R(27 + e2, 18, 2, 1, '#D8D2B8');
    R(28 + e2, 20, 2, 1, '#D8D2B8');
    R(27 + e2, 22, 2, 1, '#D8D2B8');
  } else {
    // だらんと垂らした腕
    R(0, 20, 4, 12, ZB.skin);
    R(0, 20, 4, 4, ZB.shirt);
    R(0, 23, 1, 1, ZB.shirtD);
    R(0, 30, 4, 3, ZB.skinD);
    R(0, 32, 1, 1, ZB.teeth);
    R(2, 32, 1, 1, ZB.teeth);
    R(24, 20, 4, 12, ZB.skin);
    R(24, 20, 4, 4, ZB.shirt);
    R(24, 30, 4, 3, ZB.skinD);
    R(25, 32, 1, 1, ZB.teeth);
    R(27, 32, 1, 1, ZB.teeth);
  }

  // ── ズボン ──
  R(6, 28, 16, 6, ZB.pants);
  R(6, 28, 1, 6, ZB.pantsD);
  R(21, 28, 1, 6, ZB.pantsD);
  R(12, 30, 2, 2, ZB.skin);
  D(15, 31, 4, 2, ZB.pantsD);

  // ── 脚 ──
  R(8, 34, 4, 4 + lo2, ZB.pants);
  R(8, 34, 1, 4 + lo2, ZB.pantsD);
  R(16, 34, 4, 4 - lo2, ZB.pants);
  R(19, 34, 1, 4 - lo2, ZB.pantsD);
  // 靴
  R(6, 38 + lo2, 6, 2, '#2E2C24');
  R(7, 38 + lo2, 2, 1, '#444036');
  R(16, 38 - lo2, 6, 2, '#2E2C24');
  R(17, 38 - lo2, 2, 1, '#444036');

  ctx.globalAlpha = 1;
}

// ══════════════════════════════════════════════════════════════
// パワハラ中間管理職（ハゲ頭・赤ネクタイ・大柄）グリッド 36×46（54×69px）
// ══════════════════════════════════════════════════════════════
const MG = {
  scalp: '#9B8977', scalpL: '#AE9684', shine: '#E2D2BE',
  skin: '#C2A488', skinD: '#A8895F', skinDD: '#8A6A40',
  suit: '#2C3E50', suitD: '#22303E', suitL: '#3C5268', stripe: '#3A4E62',
  shirt: '#ECF0F1', tie: '#E04030', tieD: '#B83020',
  pants: '#1A2530', pantsD: '#141C28', shoe: '#141414',
};

export function drawMiddleManager(ctx, x, y, state, frame, facingRight) {
  const w = 36 * S; // 54px
  if (state !== 'die') drawShadow(ctx, x + w / 2, y + 46 * S, 16 * S);
  withFlip(ctx, x, y, w, facingRight, (c, bx, by) => {
    _drawMiddleManager(c, bx, by, state, frame);
  });
}

function _drawMiddleManager(ctx, x, y, state, frame) {
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
  const { R, D } = makePen(ctx, ox, oy);
  const lo2 = Math.floor(legOffset) * 2;

  // ── 頭（つやつやのハゲ頭ドーム） ──
  R(8, 0, 20, 3, MG.scalp);
  R(6, 3, 24, 5, MG.scalpL);
  D(7, 6, 22, 2, MG.skin);
  // 強いつやハイライト
  R(10, 1, 5, 2, MG.shine);
  R(20, 2, 4, 1, '#D4C4B0');
  R(9, 3, 1, 1, MG.shine);
  // こめかみの怒り血管
  R(25, 2, 1, 1, '#C04040');
  R(24, 3, 3, 1, '#C04040');
  R(25, 4, 1, 1, '#C04040');
  // 耳
  R(4, 8, 2, 4, MG.scalp);
  R(30, 8, 2, 4, MG.scalp);
  // 顔
  R(6, 8, 24, 7, MG.skin);
  R(7, 15, 22, 2, MG.skinD);
  R(9, 16, 18, 1, MG.skinDD);
  // 太い怒り眉（ハの字）
  R(8, 8, 7, 2, '#2A2A2A');
  R(21, 8, 7, 2, '#2A2A2A');
  R(13, 10, 2, 1, '#2A2A2A');
  R(21, 10, 2, 1, '#2A2A2A');
  // 血走った目
  R(9, 10, 5, 2, '#F5E8E0');
  R(22, 10, 5, 2, '#F5E8E0');
  R(9, 10, 1, 1, '#D88878');
  R(26, 10, 1, 1, '#D88878');
  R(11, 10, 2, 2, '#CC1111');
  R(24, 10, 2, 2, '#CC1111');
  // 大きな鼻
  R(16, 10, 4, 4, MG.skinD);
  R(16, 13, 1, 1, MG.skinDD);
  R(19, 13, 1, 1, MG.skinDD);
  // 怒鳴る口
  if (state === 'charge' || state === 'attack') {
    R(12, 12, 12, 4, '#7A1010');
    R(13, 12, 10, 1, '#E8DCC8');
    R(13, 15, 10, 1, '#E8DCC8');
  } else {
    R(12, 13, 12, 2, '#7A1010');
    R(13, 13, 4, 1, '#E8DCC8');
    R(19, 13, 4, 1, '#E8DCC8');
  }
  // 汗
  R(28, 4, 1, 1, '#BFE8FF');
  R(29, 6, 1, 1, '#9FD8FF');

  // ── 首（太い） ──
  R(14, 17, 8, 3, MG.skinD);

  // ── 胴体（大柄なピンストライプスーツ） ──
  R(4, 20, 28, 14, MG.suit);
  // ピンストライプ
  R(6, 20, 1, 13, MG.stripe);
  R(9, 20, 1, 13, MG.stripe);
  R(26, 20, 1, 13, MG.stripe);
  R(29, 20, 1, 13, MG.stripe);
  // シャツとせり出した腹
  R(13, 20, 10, 9, MG.shirt);
  R(11, 29, 14, 4, '#E4E8EA');
  R(11, 32, 14, 1, '#C8CCD0');
  // 赤いネクタイ
  R(16, 20, 4, 2, MG.tieD);
  R(16, 22, 4, 9, MG.tie);
  D(16, 23, 4, 8, MG.tieD);
  R(17, 31, 2, 2, MG.tieD);
  // ラペルと陰影
  R(11, 20, 2, 6, '#1E2C3A');
  R(23, 20, 2, 6, '#1E2C3A');
  R(4, 20, 2, 14, MG.suitD);
  R(30, 20, 2, 14, MG.suitD);
  R(6, 20, 1, 2, MG.suitL);

  // ── 腕 ──
  if (state === 'attack') {
    const sf = animFrame < 2 ? animFrame : 3 - animFrame;
    // 奥の腕
    R(0, 20, 4, 10, MG.suit);
    R(0, 29, 4, 1, MG.shirt);
    R(0, 30, 4, 3, MG.skinD);
    // 拳を振り下ろす
    R(28, 16 + sf * 4, 6, 8, MG.suit);
    R(28, 22 + sf * 4, 6, 1, MG.shirt);
    R(32, 23 + sf * 4, 4, 4, MG.skinD);
    R(32, 23 + sf * 4, 4, 1, MG.skin);
    if (sf >= 1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(ox + 30 * S, oy + (14 + sf * 4) * S, 8 * S, 1 * S);
    }
  } else if (state === 'charge') {
    // 突進ポーズ
    R(0, 24, 4, 8, MG.suit);
    R(28, 20, 8, 6, MG.suit);
    R(34, 20, 4, 4, MG.skinD);
    R(34, 20, 4, 1, MG.skin);
  } else {
    R(0, 22, 4, 10, MG.suit);
    R(0, 22, 1, 10, MG.suitD);
    R(0, 31, 4, 1, MG.shirt);
    R(0, 32, 4, 3, MG.skinD);
    R(32, 22, 4, 10, MG.suit);
    R(35, 22, 1, 10, MG.suitL);
    R(32, 31, 4, 1, MG.shirt);
    R(32, 32, 4, 3, MG.skinD);
  }

  // ── ズボン ──
  R(8, 34, 20, 6, MG.pants);
  R(13, 34, 1, 6, MG.pantsD);
  R(22, 34, 1, 6, MG.pantsD);

  // ── 脚 ──
  R(10, 40, 6, 4 + lo2, MG.pants);
  R(10, 40, 1, 4 + lo2, MG.pantsD);
  R(20, 40, 6, 4 - lo2, MG.pants);
  R(25, 40, 1, 4 - lo2, MG.pantsD);
  // 革靴（つや入り）
  R(8, 44 + lo2, 8, 2, MG.shoe);
  R(9, 44 + lo2, 3, 1, '#3A3A3A');
  R(20, 44 - lo2, 8, 2, MG.shoe);
  R(21, 44 - lo2, 3, 1, '#3A3A3A');

  // ── charge時の怒りマーク ──
  if (state === 'charge') {
    ctx.fillStyle = '#FF2020';
    ctx.fillRect(ox + 31 * S, oy + 0 * S, 2 * S, 6 * S);
    ctx.fillRect(ox + 29 * S, oy + 2 * S, 6 * S, 2 * S);
  }

  ctx.globalAlpha = 1;
}

// ══════════════════════════════════════════════════════════════
// パワハラ係長（メガネ・七三分け・ホチキス）グリッド 30×42（45×63px）
// ══════════════════════════════════════════════════════════════
const OF = {
  hair: '#26262A', scalp: '#B09682', shine: '#E0CCB8',
  skin: '#DEB887', skinD: '#C4A06A', skinDD: '#A8884E',
  suit: '#1B2A4A', suitD: '#13203A', suitL: '#26365A',
  shirt: '#E8E8EC', tie: '#8A2BC2', tieD: '#6A1F96',
  glass: '#3A4A5A', lens: '#7A94B0', glint: '#D8ECFF',
  pants: '#141E2E', shoe: '#141414',
  stapler: '#5A6B7C', staplerL: '#8A9BAC', staplerD: '#3A4654',
};

export function drawHarassingOfficer(ctx, x, y, state, frame, facingRight) {
  const w = 30 * S; // 45px
  if (state !== 'die') drawShadow(ctx, x + w / 2, y + 42 * S, 13 * S);
  withFlip(ctx, x, y, w, facingRight, (c, bx, by) => {
    _drawHarassingOfficer(c, bx, by, state, frame);
  });
}

function _drawHarassingOfficer(ctx, x, y, state, frame) {
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
  const { R, D } = makePen(ctx, ox, oy);
  const lo2 = Math.floor(legOffset) * 2;

  // ── 頭（七三分け：左に髪・右は薄い） ──
  // 右側の頭皮（先に塗る）
  R(15, 0, 11, 3, OF.scalp);
  R(18, 1, 3, 1, OF.shine);
  // 左側の髪の束
  R(4, 0, 12, 3, OF.hair);
  R(4, 3, 3, 4, OF.hair);
  R(6, 2, 8, 1, '#3A3A40');
  // 右へ流す薄い毛束（コームオーバー）
  R(16, 0, 7, 1, OF.hair);
  R(23, 1, 2, 1, OF.hair);
  R(25, 2, 1, 1, OF.hair);
  // 耳
  R(3, 8, 2, 3, OF.skinD);
  R(26, 8, 2, 3, OF.skinD);
  // 顔
  R(4, 5, 22, 9, OF.skin);
  R(6, 14, 18, 2, OF.skinD);
  R(8, 15, 14, 1, OF.skinDD);
  // 濃い怒り眉
  R(6, 5, 6, 2, '#141414');
  R(18, 5, 6, 2, '#141414');
  // メガネ（フレーム＋レンズ＋斜めの反射光）
  R(5, 7, 8, 4, OF.glass);
  R(17, 7, 8, 4, OF.glass);
  R(6, 8, 6, 2, OF.lens);
  R(18, 8, 6, 2, OF.lens);
  R(13, 8, 4, 1, OF.glass);
  R(4, 8, 1, 1, OF.glass);
  R(26, 8, 1, 1, OF.glass);
  R(7, 8, 1, 1, OF.glint);
  R(8, 9, 1, 1, OF.glint);
  R(19, 8, 1, 1, OF.glint);
  R(20, 9, 1, 1, OF.glint);
  // レンズ越しの赤い目
  R(9, 9, 2, 1, '#CC2200');
  R(21, 9, 2, 1, '#CC2200');
  // 鼻
  R(14, 11, 2, 2, OF.skinD);
  // 口
  if (state === 'attack' || state === 'throw') {
    R(11, 12, 8, 2, '#7A1010');
    R(12, 12, 6, 1, '#E8DCC8');
  } else {
    R(12, 13, 6, 1, '#6A3A3A');
  }

  // ── 首 ──
  R(12, 16, 6, 2, OF.skinD);

  // ── 胴体（ネイビースーツ） ──
  R(4, 18, 22, 12, OF.suit);
  R(4, 18, 1, 12, OF.suitD);
  R(25, 18, 1, 12, OF.suitD);
  R(6, 18, 1, 10, OF.suitL);
  // シャツ
  R(11, 18, 8, 10, OF.shirt);
  R(11, 18, 1, 10, '#CACACE');
  // 紫のネクタイ
  R(14, 18, 3, 2, OF.tieD);
  R(14, 20, 3, 7, OF.tie);
  D(14, 21, 3, 6, OF.tieD);
  R(14, 27, 2, 2, OF.tieD);
  // ラペル
  R(9, 18, 2, 5, OF.suitD);
  R(19, 18, 2, 5, OF.suitD);
  // 胸ポケットとペン
  R(6, 22, 3, 1, OF.suitD);
  R(7, 20, 1, 3, '#C0C0C8');

  // ── 腕 ──
  if (state === 'throw') {
    const e2 = (animFrame < 2 ? animFrame * 2 : (4 - animFrame) * 2) * 2;
    R(0, 20, 4, 8, OF.suit);
    R(1, 28, 2, 2, OF.skinD);
    // 投げる腕＋口の開いたホチキス
    R(26 + e2, 18, 4, 6, OF.suit);
    R(28 + e2, 16, 7, 2, OF.staplerL);
    R(28 + e2, 19, 7, 2, OF.stapler);
    R(28 + e2, 18, 2, 1, OF.staplerD);
    R(34 + e2, 16, 1, 1, '#FFFFFF');
  } else if (state === 'attack') {
    const sf = animFrame < 2 ? animFrame : 3 - animFrame;
    R(0, 18, 4, 8, OF.suit);
    R(26, 18 + sf * 4, 4, 6, OF.suit);
    R(26, 23 + sf * 4, 4, 2, OF.skinD);
  } else {
    R(0, 20, 4, 8, OF.suit);
    R(0, 20, 1, 8, OF.suitD);
    R(1, 28, 2, 2, OF.skinD);
    R(26, 20, 4, 8, OF.suit);
    R(26, 27, 3, 2, OF.skinD);
    // 手元のホチキス
    R(26, 26, 6, 3, OF.stapler);
    R(27, 25, 4, 1, OF.staplerL);
    R(26, 28, 6, 1, OF.staplerD);
  }

  // ── ズボン ──
  R(6, 30, 18, 6, OF.pants);
  R(11, 30, 1, 6, '#0E1620');
  R(18, 30, 1, 6, '#0E1620');

  // ── 脚 ──
  R(8, 36, 4, 4 + lo2, OF.pants);
  R(18, 36, 4, 4 - lo2, OF.pants);
  R(6, 40 + lo2, 6, 2, OF.shoe);
  R(7, 40 + lo2, 2, 1, '#3A3A3A');
  R(18, 40 - lo2, 6, 2, OF.shoe);
  R(19, 40 - lo2, 2, 1, '#3A3A3A');

  if (state === 'hurt' && animFrame % 2 === 0) {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(ox, oy, 30 * S, 42 * S);
  }

  ctx.globalAlpha = 1;
}

// ══════════════════════════════════════════════════════════════
// CEOゾンビ（高級スーツ・金の装飾・フェーズ変化）グリッド 44×48（66×72px）
// ══════════════════════════════════════════════════════════════
const CEO = {
  hair: '#23234A', hairL: '#2E2E5C', silver: '#C8C8D8',
  skin: '#9B8FBF', skinD: '#7B6F9F', skinDD: '#5E5480',
  suit: '#1C1C3E', suitL: '#2C2C5E', suitD: '#12122A',
  gold: '#E8C030', goldL: '#FFE060', goldD: '#B89020',
  shirt: '#EAEAF2', eye: '#FF00FF', pants: '#15152E', shoe: '#0A0A1A',
};

export function drawCEOBoss(ctx, x, y, state, frame, facingRight, phase = 1) {
  const w = 44 * S; // 66px

  // 落ち影
  if (state !== 'die') drawShadow(ctx, x + w / 2, y + 48 * S, 20 * S);

  // オーラ描画（phase別・二重レイヤー）
  const auraCols = [
    ['rgba(255, 50, 50, 0.12)', 'rgba(255, 50, 50, 0.22)'],
    ['rgba(150, 50, 255, 0.12)', 'rgba(150, 50, 255, 0.22)'],
    ['rgba(255, 215, 0, 0.12)', 'rgba(255, 215, 0, 0.22)'],
  ][Math.min(phase - 1, 2)];
  const auraSize = 4 + Math.sin(frame * 0.5) * 2;
  ctx.fillStyle = auraCols[0];
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 24 * S, (w / 2) + (auraSize + 3) * PX, 28 * S + (auraSize + 3) * PX, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = auraCols[1];
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 24 * S, (w / 2) + auraSize * PX, 28 * S + auraSize * PX, 0, 0, Math.PI * 2);
  ctx.fill();

  withFlip(ctx, x, y, w, facingRight, (c, bx, by) => {
    _drawCEOBoss(c, bx, by, state, frame, phase);
  });
}

function _drawCEOBoss(ctx, x, y, state, frame, phase) {
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
  const { R, D } = makePen(ctx, ox, oy);

  // ── 髪（オールバック・銀のメッシュ入り） ──
  R(11, 0, 22, 2, CEO.hair);
  R(10, 2, 24, 3, CEO.hairL);
  R(14, 0, 2, 4, CEO.silver);
  R(24, 0, 2, 4, CEO.silver);
  R(18, 1, 1, 3, '#9A9AB4');
  R(29, 1, 1, 2, '#9A9AB4');
  R(21, 4, 2, 1, CEO.hairL);

  // ── 顔（アンデッドの青白い肌） ──
  R(9, 4, 26, 12, CEO.skin);
  // こけた頬・額の皺
  R(10, 10, 2, 6, CEO.skinD);
  R(32, 10, 2, 6, CEO.skinD);
  D(12, 11, 3, 4, CEO.skinD);
  D(29, 11, 3, 4, CEO.skinD);
  R(14, 6, 16, 1, CEO.skinD);
  // 顎
  R(10, 14, 24, 4, CEO.skinD);
  R(12, 17, 20, 1, CEO.skinDD);
  // 銀の眉
  R(12, 7, 6, 1, '#B8B8C8');
  R(26, 7, 6, 1, '#B8B8C8');
  // 目（マゼンタに光る）
  ctx.fillStyle = 'rgba(255, 0, 255, 0.25)';
  ctx.fillRect(ox + 11 * S, oy + 8 * S, 8 * S, 4 * S);
  ctx.fillRect(ox + 25 * S, oy + 8 * S, 8 * S, 4 * S);
  R(12, 9, 6, 2, '#E8E0F0');
  R(26, 9, 6, 2, '#E8E0F0');
  R(14, 9, 3, 2, CEO.eye);
  R(28, 9, 3, 2, CEO.eye);
  R(15, 10, 1, 1, '#800080');
  R(29, 10, 1, 1, '#800080');
  R(14, 9, 1, 1, '#FFB0FF');
  R(28, 9, 1, 1, '#FFB0FF');
  // 鼻筋
  R(21, 9, 2, 5, CEO.skinD);
  R(21, 13, 1, 1, CEO.skinDD);
  // 口（不敵な笑み／咆哮）
  if (state === 'summon' || state === 'shockwave') {
    R(16, 14, 12, 3, '#3A0030');
    R(18, 14, 2, 1, '#FFD700');
    R(24, 14, 2, 1, '#E8E0F0');
  } else {
    R(17, 15, 8, 1, '#4A0040');
    R(25, 14, 1, 1, '#4A0040');
  }

  // ── 首 ──
  R(18, 18, 8, 2, CEO.skinD);

  // ── 胴体（高級スーツ・金のラペル） ──
  R(6, 20, 32, 16, CEO.suit);
  // 生地のつや（縦のシーン）
  R(12, 20, 2, 14, CEO.suitL);
  D(14, 22, 2, 12, CEO.suitL);
  R(6, 20, 2, 16, CEO.suitD);
  R(36, 20, 2, 16, CEO.suitD);
  // 金のラペル
  R(8, 20, 3, 12, CEO.gold);
  R(10, 20, 1, 12, CEO.goldD);
  R(33, 20, 3, 12, CEO.gold);
  R(33, 20, 1, 12, CEO.goldL);
  // シャツ
  R(16, 20, 12, 12, CEO.shirt);
  R(16, 20, 1, 12, '#CACAD8');
  // 金のネクタイ（柄入り）
  R(20, 20, 4, 3, CEO.goldD);
  R(20, 23, 4, 10, '#FFD700');
  D(20, 24, 4, 9, CEO.gold);
  R(21, 33, 2, 2, CEO.goldD);
  // ポケットチーフ
  R(11, 23, 3, 2, '#F0F0F8');
  // 金ボタン
  R(15, 28, 1, 1, '#FFD700');
  R(15, 32, 1, 1, '#FFD700');

  // フェーズごとの装飾
  if (phase >= 2) {
    // 紫のエネルギーの揺らめき
    R(9, 24, 1, 1, '#B05BD6');
    R(35, 24, 1, 1, '#B05BD6');
    R(11, 29, 1, 1, '#B05BD6');
    R(33, 29, 1, 1, '#B05BD6');
    D(7, 26, 3, 6, 'rgba(155, 89, 182, 0.55)');
    D(34, 26, 3, 6, 'rgba(155, 89, 182, 0.55)');
  }
  if (phase >= 3) {
    // 金の紋様
    R(13, 26, 1, 1, '#FFD700');
    R(31, 26, 1, 1, '#FFD700');
    R(15, 30, 1, 1, '#FFE060');
    R(29, 30, 1, 1, '#FFE060');
    D(12, 33, 20, 2, 'rgba(255, 215, 0, 0.5)');
  }

  // ── 腕 ──
  if (state === 'throw') {
    const tp = animFrame < 2 ? animFrame : 3 - animFrame;
    R(0, 22, 6, 10, CEO.suit);
    R(0, 31, 6, 1, CEO.gold);
    R(1, 32, 4, 3, CEO.skin);
    R(36 + tp * 2, 20, 6, 8, CEO.suit);
    R(36 + tp * 2, 27, 6, 1, CEO.gold);
    R(40 + tp * 2, 20, 4, 4, CEO.skin);
  } else if (state === 'summon') {
    // 両手を上げて魔力を放つ
    R(0, 14, 6, 10, CEO.suit);
    R(38, 14, 6, 10, CEO.suit);
    R(0, 12, 4, 4, CEO.skin);
    R(40, 12, 4, 4, CEO.skin);
    ctx.fillStyle = 'rgba(255, 0, 255, 0.4)';
    ctx.fillRect(ox + 0 * S, oy + 9 * S, 5 * S, 3 * S);
    ctx.fillRect(ox + 39 * S, oy + 9 * S, 5 * S, 3 * S);
  } else if (state === 'shockwave') {
    // 地面へ拳を叩きつける
    R(0, 28, 6, 12, CEO.suit);
    R(38, 28, 6, 12, CEO.suit);
    R(0, 38, 4, 4, CEO.skin);
    R(40, 38, 4, 4, CEO.skin);
  } else {
    R(0, 22, 6, 12, CEO.suit);
    R(0, 22, 1, 12, CEO.suitD);
    R(0, 33, 6, 1, CEO.gold);
    R(1, 34, 4, 3, CEO.skin);
    R(38, 22, 6, 12, CEO.suit);
    R(43, 22, 1, 12, CEO.suitL);
    R(38, 33, 6, 1, CEO.gold);
    R(39, 34, 4, 3, CEO.skin);
  }

  // ── ズボン（センタープレス入り） ──
  R(10, 36, 24, 6, CEO.pants);
  R(15, 36, 1, 6, '#0E0E20');
  R(28, 36, 1, 6, '#0E0E20');

  // ── 脚 ──
  R(12, 42, 6, 4, CEO.pants);
  R(26, 42, 6, 4, CEO.pants);
  // 高級靴（金のバックル付き）
  R(10, 46, 8, 2, CEO.shoe);
  R(26, 46, 8, 2, CEO.shoe);
  R(11, 46, 3, 1, '#26263E');
  R(27, 46, 3, 1, '#26263E');
  R(10, 46, 1, 1, '#FFD700');
  R(33, 46, 1, 1, '#FFD700');

  // ── shockwave エフェクト ──
  if (state === 'shockwave' && animFrame >= 2) {
    ctx.fillStyle = phase === 3 ? 'rgba(255, 215, 0, 0.4)' : phase === 2 ? 'rgba(150, 50, 255, 0.4)' : 'rgba(255, 50, 50, 0.4)';
    const waveW = (animFrame - 1) * 20 * S;
    ctx.fillRect(ox + 22 * S - waveW, oy + 44 * S, waveW * 2, 6 * S);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(ox + 22 * S - waveW * 0.7, oy + 44 * S, waveW * 1.4, 2 * S);
  }

  ctx.globalAlpha = 1;
}

// ══════════════════════════════════════════════════════════════
// アイテム描画（エナドリ 24×33px / おにぎり 27×27px / 札束）
// ══════════════════════════════════════════════════════════════
export function drawItem(ctx, x, y, type) {
  const { R, D } = makePen(ctx, x, y);

  if (type === 'energy_drink') {
    // アルミの蓋とプルタブ
    R(2, 0, 12, 2, '#D8D8E0');
    R(6, 0, 3, 1, '#9A9AA4');
    R(2, 2, 12, 1, '#A8A8B4');
    // 缶ボディ（金属の縦グラデーション）
    R(0, 3, 16, 17, '#1E88E5');
    R(0, 3, 2, 17, '#1565C0');
    R(14, 3, 2, 17, '#0F4FA0');
    R(3, 3, 2, 17, '#64B5F6');
    // ラベル
    R(2, 7, 12, 6, '#F4F4F8');
    R(2, 7, 12, 1, '#E0E0E8');
    R(2, 12, 12, 1, '#D0D0DC');
    // 稲妻マーク（影付き）
    R(8, 7, 2, 2, '#FFC400');
    R(7, 9, 2, 2, '#FFC400');
    R(8, 11, 2, 1, '#FFC400');
    R(9, 8, 1, 1, '#E8A000');
    R(8, 10, 1, 1, '#E8A000');
    // 液体の透け窓と気泡
    R(3, 14, 10, 4, '#00E5FF');
    R(5, 15, 1, 1, '#B2F4FF');
    R(9, 16, 1, 1, '#B2F4FF');
    R(3, 17, 10, 1, '#00B8D4');
    // 底のリム
    R(2, 20, 12, 2, '#1259A8');
    // 結露のしずく
    R(4, 5, 1, 1, 'rgba(255,255,255,0.55)');
    R(12, 9, 1, 1, 'rgba(255,255,255,0.45)');
    R(5, 18, 1, 1, 'rgba(255,255,255,0.5)');

  } else if (type === 'onigiri') {
    // おにぎり（丸みのある三角形）
    const rowW = [2, 4, 6, 8, 10, 12, 12, 14, 14, 16, 18, 18, 18, 18, 18, 18, 16, 14];
    for (let r = 0; r < rowW.length; r++) {
      const w = rowW[r];
      R(9 - w / 2, r, w, 1, '#F7F7F2');
    }
    // 右側の陰影（米のかたまり感）
    for (let r = 4; r < 16; r++) {
      const w = rowW[r];
      R(9 + w / 2 - 2, r, 2, 1, '#E0E0D4');
    }
    // 米粒のテクスチャ
    R(6, 5, 1, 1, '#E8E8DC');
    R(10, 4, 1, 1, '#E8E8DC');
    R(4, 9, 1, 1, '#E8E8DC');
    R(12, 8, 1, 1, '#E8E8DC');
    R(7, 12, 1, 1, '#E8E8DC');
    // 左上のハイライト
    R(7, 2, 2, 1, 'rgba(255,255,255,0.6)');
    R(6, 4, 1, 2, 'rgba(255,255,255,0.4)');
    // 梅干しの覗き
    R(8, 3, 2, 2, '#E84850');
    // 海苔（つや入り）
    R(6, 8, 6, 10, '#1B1B1B');
    R(7, 9, 1, 2, '#3A3A3A');
    R(9, 12, 1, 2, '#3A3A3A');
    R(6, 17, 6, 1, '#0E0E0E');

  } else if (type === 'money') {
    // 札束（一万円札イメージ：茶金系・積み重ね）
    const bill = '#8B6914', billL = '#C49A2A', billS = '#5C420A', edge = '#3A2200';
    // 厚みの側面
    R(4, 14, 18, 4, billS);
    R(18, 2, 4, 12, billS);
    R(19, 3, 1, 10, '#6B4E10');
    // 段差（複数枚の重なり）
    R(2, 12, 18, 2, billS);
    R(2, 10, 18, 2, '#6B4E10');
    R(3, 11, 16, 1, '#7A5515');
    // 札束の正面
    R(0, 0, 18, 12, bill);
    R(0, 0, 18, 1, billL);
    R(0, 0, 1, 12, '#7A5515');
    // 紙幣の模様（横線）
    R(2, 2, 6, 1, billL);
    R(10, 2, 6, 1, billL);
    R(2, 8, 14, 1, '#7A5515');
    R(2, 5, 3, 1, '#A88420');
    R(13, 5, 3, 1, '#A88420');
    // ¥マーク（中央）
    R(7, 3, 1, 2, edge);
    R(10, 3, 1, 2, edge);
    R(8, 5, 2, 1, edge);
    R(7, 7, 4, 1, edge);
    R(8, 8, 2, 1, edge);
    // 金色の帯
    R(6, 0, 4, 12, '#C8960A');
    R(6, 0, 1, 12, '#FFD700');
    R(9, 0, 1, 12, '#8A6406');
    R(7, 1, 2, 1, '#FFE060');
  }
}

// ══════════════════════════════════════════════════════════════
// 飛び道具描画（中心 (x+12, y+12) 基準で回転）
// ══════════════════════════════════════════════════════════════
export function drawProjectile(ctx, x, y, type, frame) {
  const rot = (frame % 8) * (Math.PI / 4);

  ctx.save();
  ctx.translate(x + 8 * S, y + 8 * S);
  ctx.rotate(rot);
  const { R, D } = makePen(ctx, 0, 0);

  if (type === 'document') {
    // 書類（めくれた角・赤いハンコ付き）
    R(-6, -8, 12, 16, '#F8F8FA');
    R(5, -8, 1, 16, '#D8D8E0');
    R(-6, 7, 12, 1, '#D8D8E0');
    // めくれた右上の角
    R(3, -8, 3, 3, '#C8C8D0');
    R(4, -7, 2, 2, '#E8E8EE');
    // テキスト風の線
    R(-4, -6, 8, 1, '#9AA0AC');
    R(-4, -4, 6, 1, '#9AA0AC');
    R(-4, -2, 8, 1, '#9AA0AC');
    R(-4, 0, 5, 1, '#9AA0AC');
    R(-4, 2, 7, 1, '#B0B6C0');
    // 赤いハンコ（丸印）
    R(1, 3, 3, 3, '#E03028');
    R(2, 4, 1, 1, '#F8F8FA');

  } else if (type === 'money') {
    // 舞う札束（後ろに一枚ヒラリ）
    ctx.fillStyle = 'rgba(76, 175, 80, 0.45)';
    ctx.fillRect(-8 * S, -6 * S, 10 * S, 6 * S);
    R(-6, -4, 12, 8, '#2E7D32');
    R(-5, -3, 10, 6, '#4CAF50');
    R(-5, -3, 10, 1, '#66BB6A');
    R(-6, -4, 1, 8, '#1B5E20');
    R(5, -4, 1, 8, '#1B5E20');
    // 帯
    R(-2, -4, 4, 8, '#C8A028');
    R(-2, -4, 1, 8, '#FFD700');
    // ¥マーク
    R(-1, -2, 1, 1, '#FFFFFF');
    R(1, -2, 1, 1, '#FFFFFF');
    R(0, -1, 1, 1, '#FFFFFF');
    R(-1, 0, 3, 1, '#FFFFFF');
    R(0, 1, 1, 1, '#FFFFFF');

  } else if (type === 'stapler') {
    // ホチキス（金属のつや入り）
    R(-6, 1, 12, 2, '#3A4654');
    R(-6, -2, 12, 3, '#5A6B7C');
    R(-5, -3, 9, 2, '#8A9BAC');
    R(-5, -3, 4, 1, '#B8C6D4');
    R(4, -1, 2, 2, '#2E3A46');
    R(-6, -1, 1, 1, '#FFFFFF');
  }

  ctx.restore();
}
