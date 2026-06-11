// =============================================================================
// stage.js - ステージ背景描画・スクロール管理
// ブラック企業サバイバー ～経営者ゾンビ殲滅戦～
// 高精細版：多層シェーディング・小物・環境光でリアル寄りに描画する。
// =============================================================================

/** 決定論的な擬似乱数（毎フレーム同じ模様を再現するため） */
function rnd(seed) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * ステージクラス
 * 4エリア構成のベルトスクロールステージを管理する。
 * - エントランス (0-1200px)
 * - オープンフロア (1200-2400px)
 * - 役員フロア (2400-3600px)
 * - ボスエリア (3600-4800px)
 */
export class Stage {
  constructor() {
    this.scrollX = 0;
    this.totalWidth = 4800;
    this.currentArea = 0;
    this.isBossArea = false;
    this.areaTransitioning = false;

    // 内部状態
    this._flickerTimers = [0, 0, 0, 0, 0, 0, 0, 0];
    this._flickerStates = [true, true, true, true, true, true, true, true];
    this._time = 0;
    this._stormTime = 0;
    this._lightningTimer = 0; // 稲妻の残光時間

    // エリア定義
    this._areas = [
      { name: 'Entrance', start: 0, end: 1200 },
      { name: 'Open Floor', start: 1200, end: 2400 },
      { name: 'Executive Floor', start: 2400, end: 3600 },
      { name: 'Boss Area', start: 3600, end: 4800 },
    ];
  }

  /**
   * スクロール更新
   * @param {number} dt - デルタタイム（秒）
   * @param {number} playerX - プレイヤーのワールドX座標
   * @param {number} canvasWidth - キャンバス幅
   */
  update(dt, playerX, canvasWidth) {
    this._time += dt;
    this._stormTime += dt;

    // 稲妻：ランダムに発生して短く残光
    if (this._lightningTimer > 0) {
      this._lightningTimer -= dt;
    } else if (Math.random() < 0.004) {
      this._lightningTimer = 0.12 + Math.random() * 0.1;
    }

    // 蛍光灯の点滅タイマー更新
    for (let i = 0; i < this._flickerTimers.length; i++) {
      this._flickerTimers[i] -= dt;
      if (this._flickerTimers[i] <= 0) {
        this._flickerStates[i] = Math.random() > 0.3;
        this._flickerTimers[i] = 0.05 + Math.random() * 0.2;
      }
    }

    // ボスエリアではスクロールしない
    if (this.isBossArea) {
      return;
    }

    // エリア遷移中はスクロールしない
    if (this.areaTransitioning) {
      return;
    }

    // プレイヤーが画面右端 70% を超えたら右へスクロール
    // プレイヤーが画面左端 30% を下回ったら左へスクロール
    const screenX = playerX - this.scrollX;
    const rightThreshold = canvasWidth * 0.7;
    const leftThreshold  = canvasWidth * 0.3;

    if (screenX > rightThreshold) {
      this.scrollX += screenX - rightThreshold;
    } else if (screenX < leftThreshold) {
      this.scrollX -= leftThreshold - screenX;
    }

    // 現在のエリア境界でスクロール停止
    const areaBounds = this.getAreaBounds();
    const maxScroll = Math.max(0, areaBounds.right - canvasWidth);
    if (this.scrollX > maxScroll) {
      this.scrollX = maxScroll;
    }
    if (this.scrollX < areaBounds.left) {
      this.scrollX = areaBounds.left;
    }
  }

  /**
   * 背景描画
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   */
  draw(ctx, canvasWidth, canvasHeight) {
    // 遠景（天井・壁）: scrollX * 0.3
    this._drawFarBackground(ctx, canvasWidth, canvasHeight);

    // 中景（家具・デスク）: scrollX * 0.6
    this._drawMidground(ctx, canvasWidth, canvasHeight);

    // 近景（床・小物）: scrollX * 1.0
    this._drawForeground(ctx, canvasWidth, canvasHeight);
  }

  /**
   * 現在のスクロールオフセットを返す
   * @returns {number}
   */
  getScrollX() {
    return this.scrollX;
  }

  /**
   * エリア遷移チェック
   * @param {number} playerX - プレイヤーのワールドX座標
   * @returns {{ shouldTransition: boolean, nextArea: number }|null}
   */
  checkAreaTransition(playerX) {
    const area = this._areas[this.currentArea];
    if (!area) return null;

    // プレイヤーがエリア右端に到達したかチェック
    if (playerX >= area.end - 50 && this.currentArea < this._areas.length - 1) {
      return {
        shouldTransition: true,
        nextArea: this.currentArea + 1,
      };
    }
    return null;
  }

  /**
   * 現在エリアの左端・右端を返す
   * @returns {{ left: number, right: number }}
   */
  getAreaBounds() {
    const area = this._areas[this.currentArea];
    if (!area) {
      return { left: 0, right: this.totalWidth };
    }
    return { left: area.start, right: area.end };
  }

  /**
   * 次のエリアに移行
   * @param {number} areaIndex
   */
  advanceToArea(areaIndex) {
    if (areaIndex >= 0 && areaIndex < this._areas.length) {
      this.currentArea = areaIndex;
      if (areaIndex === 3) {
        this.isBossArea = true;
        // ボスエリアはスクロール固定
        this.scrollX = this._areas[3].start;
      }
    }
  }

  /**
   * ステージリセット
   */
  reset() {
    this.scrollX = 0;
    this.currentArea = 0;
    this.isBossArea = false;
    this.areaTransitioning = false;
    this._time = 0;
    this._stormTime = 0;
    this._lightningTimer = 0;
    for (let i = 0; i < this._flickerTimers.length; i++) {
      this._flickerTimers[i] = 0;
      this._flickerStates[i] = true;
    }
  }

  // ===========================================================================
  // 遠景描画（天井・壁）- パララックス係数 0.3
  // ===========================================================================
  _drawFarBackground(ctx, cw, ch) {
    // パララックスは現在エリア内のローカルスクロール基準。
    // （scrollX 全体に係数を掛けると、後半エリアの壁が一度も画面に入らない）
    const bounds = this.getAreaBounds();
    const parallax = bounds.left + (this.scrollX - bounds.left) * 0.3;
    ctx.save();

    // 全体の暗い背景
    const bgGrad = ctx.createLinearGradient(0, 0, 0, ch);
    bgGrad.addColorStop(0, '#0a0a1a');
    bgGrad.addColorStop(0.5, '#121225');
    bgGrad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cw, ch);

    // エリアに応じた壁の描画
    for (let areaIdx = 0; areaIdx < 4; areaIdx++) {
      const area = this._areas[areaIdx];
      const areaLeft = area.start - parallax;
      const areaRight = area.end - parallax;

      // 画面外ならスキップ
      if (areaRight < -100 || areaLeft > cw + 100) continue;

      this._drawAreaWall(ctx, areaIdx, areaLeft, areaRight, cw, ch);
    }

    ctx.restore();
  }

  /**
   * エリアごとの壁を描画
   */
  _drawAreaWall(ctx, areaIdx, left, right, cw, ch) {
    const width = right - left;

    switch (areaIdx) {
      case 0: // エントランス
        this._drawEntranceWall(ctx, left, width, cw, ch);
        break;
      case 1: // オープンフロア
        this._drawOpenFloorWall(ctx, left, width, cw, ch);
        break;
      case 2: // 役員フロア
        this._drawExecutiveWall(ctx, left, width, cw, ch);
        break;
      case 3: // ボスエリア
        this._drawBossWall(ctx, left, width, cw, ch);
        break;
    }
  }

  /**
   * 壁下部の腰壁・幅木（壁と床のつなぎ）
   */
  _drawWainscot(ctx, left, width, ch, baseCol, lineCol) {
    const y0 = ch * 0.65;
    const y1 = ch * 0.78;
    ctx.fillStyle = baseCol;
    ctx.fillRect(left, y0, width, y1 - y0);
    // 上端のモールディング（明・暗の2本線でベベル感）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(left, y0, width, 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(left, y0 + 2, width, 2);
    // 幅木
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(left, y1 - 6, width, 6);
    ctx.fillStyle = lineCol;
    ctx.fillRect(left, y1 - 7, width, 1);
  }

  /**
   * エントランスの壁
   */
  _drawEntranceWall(ctx, left, width, cw, ch) {
    // 暗い灰色の壁
    const wallGrad = ctx.createLinearGradient(left, 0, left, ch * 0.65);
    wallGrad.addColorStop(0, '#1a1a2e');
    wallGrad.addColorStop(1, '#252540');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(left, 0, width, ch * 0.65);

    // 天井ライン
    ctx.fillStyle = '#0c0c18';
    ctx.fillRect(left, 0, width, 14);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(left, 14, width, 2);

    // 壁のパネル（ベベル付きの継ぎ目）
    for (let x = left; x < left + width; x += 120) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(x, 16, 2, ch * 0.65 - 16);
      ctx.fillStyle = 'rgba(140, 140, 190, 0.08)';
      ctx.fillRect(x + 2, 16, 1, ch * 0.65 - 16);
    }
    // 横ライン（パネルの段）
    for (let y = 80; y < ch * 0.65; y += 80) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(left, y, width, 2);
      ctx.fillStyle = 'rgba(140, 140, 190, 0.06)';
      ctx.fillRect(left, y + 2, width, 1);
    }
    // 壁の汚れ・シミ
    for (let i = 0; i < 8; i++) {
      const sx = left + rnd(i * 7.3) * width;
      const sy = 60 + rnd(i * 3.1) * ch * 0.4;
      ctx.fillStyle = `rgba(0, 0, 0, ${0.08 + rnd(i) * 0.08})`;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 14 + rnd(i * 1.7) * 22, 8 + rnd(i * 2.9) * 12, rnd(i) * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 社名サイン「BLACK CORP.」（一部の文字が消えかけ）
    const signX = left + 420;
    if (signX > -300 && signX < cw + 100) {
      ctx.fillStyle = '#101020';
      ctx.fillRect(signX - 16, 36, 270, 44);
      ctx.strokeStyle = 'rgba(120, 120, 160, 0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(signX - 16, 36, 270, 44);
      // 赤いネオン文字（2文字は死んでいる、1文字は明滅）
      const text = 'BLACK CORP.';
      ctx.font = 'bold 26px monospace';
      for (let i = 0; i < text.length; i++) {
        const dead = (i === 1 || i === 8);
        const flicker = (i === 4 && !this._flickerStates[7]);
        ctx.fillStyle = dead ? 'rgba(80, 30, 40, 0.5)'
          : flicker ? 'rgba(150, 40, 55, 0.5)'
          : '#E0304A';
        ctx.fillText(text[i], signX + i * 22, 68);
      }
      // ネオンのグロー
      const glow = ctx.createRadialGradient(signX + 110, 58, 8, signX + 110, 58, 180);
      glow.addColorStop(0, 'rgba(224, 48, 74, 0.10)');
      glow.addColorStop(1, 'rgba(224, 48, 74, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(signX - 80, 0, 400, 160);
    }

    // 割れたガラスドア（ひび割れの放射＋立入禁止テープ）
    const doorX = left + 100;
    if (doorX > -150 && doorX < cw + 150) {
      // ドアフレーム（両開き）
      ctx.fillStyle = '#3a3a50';
      ctx.fillRect(doorX - 6, ch * 0.13, 92, ch * 0.52);
      ctx.fillStyle = '#14141f';
      ctx.fillRect(doorX, ch * 0.15, 38, ch * 0.5);
      ctx.fillRect(doorX + 42, ch * 0.15, 38, ch * 0.5);
      // ガラスの反射
      ctx.fillStyle = 'rgba(150, 200, 255, 0.06)';
      ctx.fillRect(doorX + 4, ch * 0.17, 12, ch * 0.45);
      ctx.fillRect(doorX + 56, ch * 0.17, 8, ch * 0.45);
      // 取っ手
      ctx.fillStyle = '#8a8aa0';
      ctx.fillRect(doorX + 32, ch * 0.38, 4, 24);
      ctx.fillRect(doorX + 44, ch * 0.38, 4, 24);
      // ひび割れ（衝突点から放射状）
      const cxp = doorX + 58;
      const cyp = ch * 0.3;
      ctx.strokeStyle = 'rgba(170, 210, 255, 0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const ang = i * 0.9 + 0.3;
        const len = 18 + rnd(i * 4.7) * 26;
        ctx.beginPath();
        ctx.moveTo(cxp, cyp);
        ctx.lineTo(cxp + Math.cos(ang) * len, cyp + Math.sin(ang) * len);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cxp, cyp, 7, 0, Math.PI * 2);
      ctx.stroke();
      // 床に落ちたガラス片
      ctx.fillStyle = 'rgba(170, 210, 255, 0.25)';
      for (let i = 0; i < 6; i++) {
        const gx = doorX + 10 + rnd(i * 9.1) * 70;
        const gy = ch * 0.63 + rnd(i * 5.3) * 8;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + 5, gy - 4);
        ctx.lineTo(gx + 8, gy + 1);
        ctx.closePath();
        ctx.fill();
      }
      // 立入禁止テープ（黄黒の斜めストライプ）
      ctx.save();
      ctx.translate(doorX + 40, ch * 0.42);
      ctx.rotate(-0.12);
      ctx.fillStyle = '#C8A818';
      ctx.fillRect(-70, -7, 140, 14);
      ctx.fillStyle = '#15150f';
      for (let i = -70; i < 70; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 7);
        ctx.lineTo(i + 10, -7);
        ctx.lineTo(i + 18, -7);
        ctx.lineTo(i + 8, 7);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    this._drawWainscot(ctx, left, width, ch, '#15152a', 'rgba(120, 120, 170, 0.18)');
  }

  /**
   * オープンフロアの壁
   */
  _drawOpenFloorWall(ctx, left, width, cw, ch) {
    // やや暗い青灰色の壁
    const wallGrad = ctx.createLinearGradient(left, 0, left, ch * 0.65);
    wallGrad.addColorStop(0, '#16213e');
    wallGrad.addColorStop(1, '#1a2745');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(left, 0, width, ch * 0.65);

    // 天井ライン
    ctx.fillStyle = '#0c1226';
    ctx.fillRect(left, 0, width, 14);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(left, 14, width, 2);

    // 窓（夜の都市スカイラインが見える）
    for (let i = 0; i < 4; i++) {
      const wx = left + 80 + i * 280;
      if (wx > -200 && wx < cw + 200) {
        const wy = ch * 0.08;
        const wh = ch * 0.27;
        const ww = 160;
        // 夜空
        const skyGrad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
        skyGrad.addColorStop(0, '#060818');
        skyGrad.addColorStop(0.7, '#0a1028');
        skyGrad.addColorStop(1, '#060818');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(wx, wy, ww, wh);
        // 月（2番目の窓のみ）
        if (i === 1) {
          ctx.fillStyle = '#D8D8C4';
          ctx.beginPath();
          ctx.arc(wx + ww * 0.7, wy + wh * 0.25, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
          ctx.beginPath();
          ctx.arc(wx + ww * 0.7 + 3, wy + wh * 0.25 - 2, 3, 0, Math.PI * 2);
          ctx.arc(wx + ww * 0.7 - 4, wy + wh * 0.25 + 3, 2, 0, Math.PI * 2);
          ctx.fill();
          // 月光のにじみ
          const moonGlow = ctx.createRadialGradient(wx + ww * 0.7, wy + wh * 0.25, 5, wx + ww * 0.7, wy + wh * 0.25, 36);
          moonGlow.addColorStop(0, 'rgba(216, 216, 196, 0.18)');
          moonGlow.addColorStop(1, 'rgba(216, 216, 196, 0)');
          ctx.fillStyle = moonGlow;
          ctx.fillRect(wx + ww * 0.7 - 36, wy + wh * 0.25 - 36, 72, 72);
        }
        // 都市のシルエットと灯り
        for (let b = 0; b < 5; b++) {
          const bw = 22 + rnd(i * 11 + b * 3.7) * 18;
          const bh = wh * (0.25 + rnd(i * 5 + b * 7.1) * 0.45);
          const bx = wx + 4 + b * (ww - 10) / 5;
          ctx.fillStyle = '#04060e';
          ctx.fillRect(bx, wy + wh - bh, bw, bh);
          // 点灯している窓
          for (let k = 0; k < 4; k++) {
            if (rnd(i * 31 + b * 13 + k * 5.3) > 0.55) {
              ctx.fillStyle = 'rgba(255, 200, 90, 0.5)';
              ctx.fillRect(
                bx + 3 + (k % 2) * 8,
                wy + wh - bh + 4 + Math.floor(k / 2) * 9,
                3, 4,
              );
            }
          }
        }
        // ブラインド（上部・一部壊れて斜め）
        ctx.strokeStyle = 'rgba(180, 190, 210, 0.16)';
        ctx.lineWidth = 2;
        const blindH = wh * (i === 2 ? 0.55 : 0.3);
        for (let by = wy + 3; by < wy + blindH; by += 6) {
          ctx.beginPath();
          if (i === 2) {
            // 壊れて斜めにずり落ちたブラインド
            ctx.moveTo(wx, by);
            ctx.lineTo(wx + ww, by + 14);
          } else {
            ctx.moveTo(wx, by);
            ctx.lineTo(wx + ww, by);
          }
          ctx.stroke();
        }
        // 窓枠
        ctx.strokeStyle = 'rgba(90, 100, 130, 0.6)';
        ctx.lineWidth = 3;
        ctx.strokeRect(wx, wy, ww, wh);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(wx + ww / 2, wy);
        ctx.lineTo(wx + ww / 2, wy + wh);
        ctx.stroke();
        // 窓台
        ctx.fillStyle = 'rgba(60, 70, 100, 0.5)';
        ctx.fillRect(wx - 4, wy + wh, ww + 8, 5);
      }
    }

    // 破れたモチベーションポスター
    const posterX = left + 320;
    if (posterX > -80 && posterX < cw + 80) {
      ctx.save();
      ctx.translate(posterX, ch * 0.44);
      ctx.rotate(0.06);
      ctx.fillStyle = '#26304a';
      ctx.fillRect(0, 0, 56, 76);
      ctx.fillStyle = '#36405c';
      ctx.fillRect(4, 4, 48, 36);
      // 標語のテキスト行
      ctx.fillStyle = 'rgba(200, 200, 220, 0.4)';
      ctx.fillRect(8, 46, 40, 3);
      ctx.fillRect(8, 54, 32, 3);
      ctx.fillRect(8, 62, 36, 3);
      // 破れてめくれた右下角
      ctx.fillStyle = '#16213e';
      ctx.beginPath();
      ctx.moveTo(56, 76);
      ctx.lineTo(36, 76);
      ctx.lineTo(56, 52);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#444f6e';
      ctx.beginPath();
      ctx.moveTo(36, 76);
      ctx.lineTo(56, 52);
      ctx.lineTo(48, 76);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 止まった壁掛け時計
    const clockX = left + 760;
    if (clockX > -40 && clockX < cw + 40) {
      ctx.fillStyle = '#0e1426';
      ctx.beginPath();
      ctx.arc(clockX, ch * 0.16, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(150, 160, 190, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(clockX, ch * 0.16, 17, 0, Math.PI * 2);
      ctx.stroke();
      // 文字盤の目盛り
      ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(clockX + Math.cos(a) * 13, ch * 0.16 + Math.sin(a) * 13);
        ctx.lineTo(clockX + Math.cos(a) * 15, ch * 0.16 + Math.sin(a) * 15);
        ctx.stroke();
      }
      // 深夜0時すぎで止まった針
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(clockX, ch * 0.16);
      ctx.lineTo(clockX + 2, ch * 0.16 - 11);
      ctx.moveTo(clockX, ch * 0.16);
      ctx.lineTo(clockX + 6, ch * 0.16 - 6);
      ctx.stroke();
    }

    this._drawWainscot(ctx, left, width, ch, '#101a32', 'rgba(110, 130, 180, 0.18)');
  }

  /**
   * 役員フロアの壁
   */
  _drawExecutiveWall(ctx, left, width, cw, ch) {
    // ダークレッドの壁
    const wallGrad = ctx.createLinearGradient(left, 0, left, ch * 0.65);
    wallGrad.addColorStop(0, '#1a0a0a');
    wallGrad.addColorStop(0.5, '#2a1215');
    wallGrad.addColorStop(1, '#1a0a0a');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(left, 0, width, ch * 0.65);

    // 壁紙のストライプ
    ctx.fillStyle = 'rgba(180, 100, 80, 0.04)';
    for (let x = left; x < left + width; x += 26) {
      ctx.fillRect(x, ch * 0.05, 9, ch * 0.4);
    }

    // 天井ライン＋金の廻り縁
    ctx.fillStyle = '#100606';
    ctx.fillRect(left, 0, width, 14);
    ctx.fillStyle = 'rgba(200, 165, 60, 0.35)';
    ctx.fillRect(left, ch * 0.05 - 2, width, 2);
    ctx.fillStyle = 'rgba(110, 85, 25, 0.4)';
    ctx.fillRect(left, ch * 0.05, width, 1);

    // 腰壁ライン（金の二重モールディング）
    ctx.fillStyle = 'rgba(200, 165, 60, 0.3)';
    ctx.fillRect(left, ch * 0.45, width, 2);
    ctx.fillStyle = 'rgba(110, 85, 25, 0.35)';
    ctx.fillRect(left, ch * 0.45 + 3, width, 1);

    // 壁のパネル装飾（ベベル付き）
    for (let x = left; x < left + width; x += 200) {
      ctx.strokeStyle = 'rgba(200, 165, 60, 0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 14, ch * 0.08, 172, ch * 0.34);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.strokeRect(x + 17, ch * 0.08 + 3, 166, ch * 0.34 - 6);
    }

    // 額縁（傾いた肖像画：赤く光る目）
    for (let i = 0; i < 3; i++) {
      const px = left + 150 + i * 350;
      if (px > -120 && px < cw + 120) {
        ctx.save();
        ctx.translate(px + 40, ch * 0.18);
        ctx.rotate((i % 2 === 0 ? 0.08 : -0.12));
        // 金フレーム（二重）
        ctx.strokeStyle = 'rgba(200, 165, 60, 0.5)';
        ctx.lineWidth = 4;
        ctx.strokeRect(-42, -32, 84, 64);
        ctx.strokeStyle = 'rgba(110, 85, 25, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-37, -27, 74, 54);
        // 角飾り
        ctx.fillStyle = 'rgba(200, 165, 60, 0.45)';
        ctx.fillRect(-45, -35, 6, 6);
        ctx.fillRect(39, -35, 6, 6);
        ctx.fillRect(-45, 29, 6, 6);
        ctx.fillRect(39, 29, 6, 6);
        // 絵画内部：歴代経営者の肖像シルエット
        ctx.fillStyle = '#170a10';
        ctx.fillRect(-36, -26, 72, 52);
        ctx.fillStyle = '#241019';
        ctx.beginPath();
        ctx.arc(0, -8, 11, 0, Math.PI * 2); // 頭
        ctx.fill();
        ctx.fillRect(-16, 2, 32, 24); // 肩
        // 赤く光る目
        ctx.fillStyle = `rgba(255, 50, 50, ${0.5 + Math.sin(this._time * 2 + i * 2) * 0.25})`;
        ctx.fillRect(-5, -10, 3, 2);
        ctx.fillRect(2, -10, 3, 2);
        ctx.restore();
      }
    }

    // 壁面燭台（金のブラケット＋揺れる炎）
    for (let i = 0; i < 2; i++) {
      const sx = left + 330 + i * 350;
      if (sx > -40 && sx < cw + 40) {
        ctx.fillStyle = 'rgba(200, 165, 60, 0.45)';
        ctx.fillRect(sx - 2, ch * 0.26, 4, 14);
        ctx.fillRect(sx - 7, ch * 0.26 + 14, 14, 4);
        if (this._flickerStates[6]) {
          const fy = ch * 0.26 - 4 + Math.sin(this._time * 7 + i * 3) * 1.5;
          // 炎
          ctx.fillStyle = 'rgba(255, 180, 70, 0.8)';
          ctx.beginPath();
          ctx.ellipse(sx, fy, 3, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 240, 160, 0.9)';
          ctx.beginPath();
          ctx.ellipse(sx, fy + 2, 1.5, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          // 光のにじみ
          const fGlow = ctx.createRadialGradient(sx, fy, 3, sx, fy, 50);
          fGlow.addColorStop(0, 'rgba(255, 180, 70, 0.13)');
          fGlow.addColorStop(1, 'rgba(255, 180, 70, 0)');
          ctx.fillStyle = fGlow;
          ctx.fillRect(sx - 50, fy - 50, 100, 100);
        }
      }
    }

    this._drawWainscot(ctx, left, width, ch, '#170a0c', 'rgba(200, 165, 60, 0.2)');
  }

  /**
   * ボスエリアの壁
   */
  _drawBossWall(ctx, left, width, cw, ch) {
    // 深い赤黒い壁
    const wallGrad = ctx.createLinearGradient(left, 0, left, ch * 0.65);
    wallGrad.addColorStop(0, '#0a0005');
    wallGrad.addColorStop(0.3, '#1a0510');
    wallGrad.addColorStop(0.7, '#1a0510');
    wallGrad.addColorStop(1, '#0a0005');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(left, 0, width, ch * 0.65);

    // 壁のパネル継ぎ目
    ctx.fillStyle = 'rgba(120, 40, 50, 0.1)';
    for (let x = left; x < left + width; x += 150) {
      ctx.fillRect(x, 0, 2, ch * 0.65);
    }

    // 大きな窓（外は嵐の夜）
    const winX = left + width * 0.3;
    const winW = width * 0.4;
    const winY = ch * 0.05;
    const winH = ch * 0.45;
    if (winX + winW > 0 && winX < cw) {
      // 窓の外（嵐の夜空）
      const skyGrad = ctx.createLinearGradient(winX, winY, winX, winY + winH);
      skyGrad.addColorStop(0, '#050510');
      skyGrad.addColorStop(0.4, '#0a0a25');
      skyGrad.addColorStop(1, '#050510');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(winX, winY, winW, winH);

      // 眼下の都市スカイライン（点灯する窓つき）
      for (let b = 0; b < 9; b++) {
        const bw = 24 + rnd(b * 3.3) * 26;
        const bh = winH * (0.12 + rnd(b * 7.7) * 0.22);
        const bx = winX + 4 + b * (winW - 8) / 9;
        ctx.fillStyle = '#03040c';
        ctx.fillRect(bx, winY + winH - bh, bw, bh);
        for (let k = 0; k < 3; k++) {
          if (rnd(b * 17 + k * 5.9) > 0.6) {
            ctx.fillStyle = 'rgba(255, 190, 80, 0.4)';
            ctx.fillRect(bx + 3 + k * 6, winY + winH - bh + 4, 3, 4);
          }
        }
      }

      // 嵐の雲
      ctx.fillStyle = 'rgba(30, 30, 50, 0.6)';
      const cloudOffset = Math.sin(this._stormTime * 0.3) * 20;
      for (let i = 0; i < 3; i++) {
        const cx = winX + winW * 0.2 + i * winW * 0.25 + cloudOffset;
        const cy = winY + winH * 0.2 + Math.sin(i + this._stormTime * 0.5) * 10;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 60, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(45, 45, 70, 0.4)';
        ctx.beginPath();
        ctx.ellipse(cx - 20, cy - 8, 35, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(30, 30, 50, 0.6)';
      }

      // 稲妻（ボルト形状＋空全体のフラッシュ）
      if (this._lightningTimer > 0) {
        const bseed = Math.floor(this._stormTime * 2);
        let lx = winX + winW * (0.3 + rnd(bseed) * 0.4);
        let ly = winY;
        ctx.strokeStyle = `rgba(230, 235, 255, ${Math.min(1, this._lightningTimer * 8)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        for (let s = 1; s <= 5; s++) {
          lx += (rnd(bseed * 7 + s * 3.1) - 0.45) * 36;
          ly += winH * 0.16;
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
        // 枝分かれ
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx, ly - winH * 0.3);
        ctx.lineTo(lx - 22, ly - winH * 0.18);
        ctx.stroke();
        // 空のフラッシュ
        ctx.fillStyle = `rgba(200, 200, 255, ${this._lightningTimer * 1.2})`;
        ctx.fillRect(winX, winY, winW, winH);
      }

      // 雨粒（長さ・濃さにばらつき）
      for (let i = 0; i < 26; i++) {
        const rx = winX + ((i * 73 + this._stormTime * (90 + (i % 5) * 18)) % winW);
        const ry = winY + ((i * 47 + this._stormTime * (170 + (i % 3) * 40)) % winH);
        const len = 6 + (i % 4) * 3;
        ctx.strokeStyle = `rgba(120, 140, 220, ${0.18 + (i % 3) * 0.08})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 2, ry + len);
        ctx.stroke();
      }
      // ガラスを伝う水滴
      ctx.strokeStyle = 'rgba(150, 170, 230, 0.12)';
      for (let i = 0; i < 5; i++) {
        const dx = winX + rnd(i * 13.7) * winW;
        ctx.beginPath();
        ctx.moveTo(dx, winY + rnd(i * 3.3) * winH * 0.4);
        ctx.lineTo(dx + 2, winY + winH * (0.5 + rnd(i * 7.7) * 0.4));
        ctx.stroke();
      }

      // 窓枠（立体感のある二重枠）
      ctx.strokeStyle = '#2a1418';
      ctx.lineWidth = 8;
      ctx.strokeRect(winX, winY, winW, winH);
      ctx.strokeStyle = 'rgba(140, 90, 80, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(winX - 4, winY - 4, winW + 8, winH + 8);
      // 窓の仕切り
      ctx.strokeStyle = '#241115';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(winX + winW / 3, winY);
      ctx.lineTo(winX + winW / 3, winY + winH);
      ctx.moveTo(winX + winW * 2 / 3, winY);
      ctx.lineTo(winX + winW * 2 / 3, winY + winH);
      ctx.moveTo(winX, winY + winH / 2);
      ctx.lineTo(winX + winW, winY + winH / 2);
      ctx.stroke();
    }

    // 非常灯（赤い回転灯の明滅）
    const alarmX = left + width * 0.15;
    if (alarmX > -30 && alarmX < cw + 30) {
      ctx.fillStyle = '#33181c';
      ctx.fillRect(alarmX - 8, 18, 16, 8);
      const pulse = (Math.sin(this._time * 4) + 1) / 2;
      ctx.fillStyle = `rgba(255, 40, 40, ${0.4 + pulse * 0.5})`;
      ctx.beginPath();
      ctx.arc(alarmX, 18, 6, Math.PI, Math.PI * 2);
      ctx.fill();
      const aGlow = ctx.createRadialGradient(alarmX, 20, 4, alarmX, 20, 90);
      aGlow.addColorStop(0, `rgba(255, 40, 40, ${0.10 + pulse * 0.12})`);
      aGlow.addColorStop(1, 'rgba(255, 40, 40, 0)');
      ctx.fillStyle = aGlow;
      ctx.fillRect(alarmX - 90, 0, 180, 180);
    }

    // 赤い照明のグロー
    const glowIntensity = 0.1 + Math.sin(this._time * 1.5) * 0.05;
    const glow = ctx.createRadialGradient(
      left + width / 2, ch * 0.1, 10,
      left + width / 2, ch * 0.1, width * 0.6,
    );
    glow.addColorStop(0, `rgba(200, 20, 20, ${glowIntensity})`);
    glow.addColorStop(1, 'rgba(200, 20, 20, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(left, 0, width, ch);

    this._drawWainscot(ctx, left, width, ch, '#12060c', 'rgba(150, 60, 60, 0.2)');
  }

  // ===========================================================================
  // 中景描画（家具・デスク）- パララックス係数 0.6
  // ===========================================================================
  _drawMidground(ctx, cw, ch) {
    // 遠景と同じく、現在エリア基準のローカルパララックス
    const bounds = this.getAreaBounds();
    const parallax = bounds.left + (this.scrollX - bounds.left) * 0.6;
    ctx.save();

    for (let areaIdx = 0; areaIdx < 4; areaIdx++) {
      const area = this._areas[areaIdx];
      const areaLeft = area.start - parallax;
      const areaRight = area.end - parallax;

      if (areaRight < -200 || areaLeft > cw + 200) continue;

      this._drawAreaFurniture(ctx, areaIdx, areaLeft, areaRight, cw, ch);
    }

    ctx.restore();
  }

  /**
   * エリアごとの家具描画
   */
  _drawAreaFurniture(ctx, areaIdx, left, right, cw, ch) {
    switch (areaIdx) {
      case 0:
        this._drawEntranceFurniture(ctx, left, right, cw, ch);
        break;
      case 1:
        this._drawOpenFloorFurniture(ctx, left, right, cw, ch);
        break;
      case 2:
        this._drawExecutiveFurniture(ctx, left, right, cw, ch);
        break;
      case 3:
        this._drawBossFurniture(ctx, left, right, cw, ch);
        break;
    }
  }

  /**
   * エントランスの家具（受付カウンター、枯れた観葉植物）
   */
  _drawEntranceFurniture(ctx, left, right, cw, ch) {
    const floorY = ch * 0.75;

    // 受付カウンター
    const counterX = left + 500;
    if (counterX > -250 && counterX < cw + 250) {
      // カウンター本体（前面パネルに溝）
      const bodyGrad = ctx.createLinearGradient(counterX, floorY - 80, counterX, floorY);
      bodyGrad.addColorStop(0, '#32324a');
      bodyGrad.addColorStop(1, '#222236');
      ctx.fillStyle = bodyGrad;
      ctx.fillRect(counterX, floorY - 80, 200, 80);
      // カウンタートップ（厚みと光沢）
      ctx.fillStyle = '#4a4a68';
      ctx.fillRect(counterX - 6, floorY - 88, 212, 10);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(counterX - 6, floorY - 88, 212, 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(counterX - 6, floorY - 79, 212, 2);
      // 前面パネルの溝
      ctx.strokeStyle = 'rgba(110, 110, 160, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(counterX + 12, floorY - 68, 80, 48);
      ctx.strokeRect(counterX + 108, floorY - 68, 80, 48);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.strokeRect(counterX + 14, floorY - 66, 76, 44);
      ctx.strokeRect(counterX + 110, floorY - 66, 76, 44);
      // カウンター上の死んだ受付モニター
      ctx.fillStyle = '#10101c';
      ctx.fillRect(counterX + 28, floorY - 116, 40, 26);
      ctx.fillStyle = '#06060e';
      ctx.fillRect(counterX + 31, floorY - 113, 34, 20);
      ctx.fillStyle = 'rgba(120, 140, 200, 0.08)';
      ctx.fillRect(counterX + 33, floorY - 111, 10, 16);
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(counterX + 44, floorY - 90, 8, 3);
      // 倒れた「受付」プレート
      ctx.save();
      ctx.translate(counterX + 130, floorY - 90);
      ctx.rotate(0.85);
      ctx.fillStyle = '#8a8aa8';
      ctx.fillRect(0, 0, 34, 10);
      ctx.fillStyle = 'rgba(20, 20, 35, 0.7)';
      ctx.fillRect(4, 3, 26, 4);
      ctx.restore();
      // 散らばった呼び鈴
      ctx.fillStyle = '#9a8a4a';
      ctx.beginPath();
      ctx.arc(counterX + 95, floorY - 92, 4, Math.PI, Math.PI * 2);
      ctx.fill();
    }

    // 枯れた観葉植物
    const plantX = left + 800;
    if (plantX > -60 && plantX < cw + 60) {
      // 鉢（陶器の質感）
      const potGrad = ctx.createLinearGradient(plantX - 20, 0, plantX + 20, 0);
      potGrad.addColorStop(0, '#4a3628');
      potGrad.addColorStop(0.5, '#5a4634');
      potGrad.addColorStop(1, '#34241a');
      ctx.fillStyle = potGrad;
      ctx.beginPath();
      ctx.moveTo(plantX - 15, floorY);
      ctx.lineTo(plantX - 20, floorY - 30);
      ctx.lineTo(plantX + 20, floorY - 30);
      ctx.lineTo(plantX + 15, floorY);
      ctx.closePath();
      ctx.fill();
      // 鉢の縁
      ctx.fillStyle = '#5e4a36';
      ctx.fillRect(plantX - 21, floorY - 33, 42, 5);
      // 乾いた土
      ctx.fillStyle = '#2a2018';
      ctx.fillRect(plantX - 16, floorY - 30, 32, 3);
      // 枯れた茎（数本・ねじれ）
      ctx.strokeStyle = '#4a3a20';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(plantX, floorY - 30);
      ctx.quadraticCurveTo(plantX - 8, floorY - 55, plantX - 5, floorY - 72);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(plantX, floorY - 30);
      ctx.quadraticCurveTo(plantX + 10, floorY - 48, plantX + 9, floorY - 62);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(plantX - 2, floorY - 30);
      ctx.quadraticCurveTo(plantX - 14, floorY - 40, plantX - 18, floorY - 46);
      ctx.stroke();
      // 枯れ葉（垂れ下がる）
      ctx.fillStyle = '#3a3010';
      ctx.beginPath();
      ctx.ellipse(plantX - 8, floorY - 70, 12, 4, -0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(plantX + 12, floorY - 58, 10, 4, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#332a0e';
      ctx.beginPath();
      ctx.ellipse(plantX - 18, floorY - 44, 8, 3, -1.1, 0, Math.PI * 2);
      ctx.fill();
      // 床に落ちた枯れ葉
      ctx.fillStyle = 'rgba(58, 48, 16, 0.7)';
      ctx.beginPath();
      ctx.ellipse(plantX - 28, floorY - 2, 6, 2.5, 0.4, 0, Math.PI * 2);
      ctx.ellipse(plantX + 26, floorY - 1, 5, 2, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 蛍光灯（天井）
    this._drawFluorescentLight(ctx, left + 300, ch * 0.02, 120, 0);
    this._drawFluorescentLight(ctx, left + 700, ch * 0.02, 120, 1);
    this._drawFluorescentLight(ctx, left + 1050, ch * 0.02, 120, 2);
  }

  /**
   * オープンフロアの家具（散乱デスク、倒れたPC、パーティション）
   */
  _drawOpenFloorFurniture(ctx, left, right, cw, ch) {
    const floorY = ch * 0.75;

    // 散乱したデスク群
    const desks = [
      { x: 100, w: 120, h: 55, tilt: 0 },
      { x: 320, w: 130, h: 55, tilt: 0.05 },
      { x: 550, w: 110, h: 55, tilt: -0.03 },
      { x: 800, w: 140, h: 55, tilt: 0 },
      { x: 1000, w: 120, h: 55, tilt: 0.08 },
    ];

    for (let di = 0; di < desks.length; di++) {
      const desk = desks[di];
      const dx = left + desk.x;
      if (dx > -200 && dx < cw + 200) {
        ctx.save();
        ctx.translate(dx + desk.w / 2, floorY);
        ctx.rotate(desk.tilt);
        // デスク天板（厚み＋ハイライト）
        ctx.fillStyle = '#383852';
        ctx.fillRect(-desk.w / 2, -desk.h, desk.w, 4);
        ctx.fillStyle = '#2e2e42';
        ctx.fillRect(-desk.w / 2, -desk.h + 4, desk.w, 5);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(-desk.w / 2, -desk.h + 9, desk.w, 2);
        // デスク脚（金属の光沢）
        ctx.fillStyle = '#252538';
        ctx.fillRect(-desk.w / 2 + 5, -desk.h + 8, 6, desk.h - 8);
        ctx.fillRect(desk.w / 2 - 11, -desk.h + 8, 6, desk.h - 8);
        ctx.fillStyle = 'rgba(140, 140, 190, 0.15)';
        ctx.fillRect(-desk.w / 2 + 5, -desk.h + 8, 2, desk.h - 8);
        ctx.fillRect(desk.w / 2 - 11, -desk.h + 8, 2, desk.h - 8);
        // 袖引き出し（右脚側）
        ctx.fillStyle = '#2a2a3e';
        ctx.fillRect(desk.w / 2 - 38, -desk.h + 10, 26, desk.h - 12);
        ctx.fillStyle = 'rgba(110, 110, 160, 0.2)';
        ctx.fillRect(desk.w / 2 - 34, -desk.h + 16, 18, 2);
        ctx.fillRect(desk.w / 2 - 34, -desk.h + 30, 18, 2);

        if (desk.tilt !== 0) {
          // 倒れたモニター（画面割れ）
          ctx.fillStyle = '#1a1a2a';
          ctx.save();
          ctx.rotate(0.4);
          ctx.fillRect(-15, -desk.h - 25, 35, 25);
          ctx.fillStyle = '#0a0a15';
          ctx.fillRect(-12, -desk.h - 22, 29, 19);
          // 画面のひび
          ctx.strokeStyle = 'rgba(120, 140, 200, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-6, -desk.h - 18);
          ctx.lineTo(4, -desk.h - 10);
          ctx.lineTo(12, -desk.h - 14);
          ctx.stroke();
          ctx.restore();
          // 散らばった書類（天板上）
          ctx.fillStyle = 'rgba(200, 195, 180, 0.25)';
          ctx.fillRect(-desk.w / 2 + 14, -desk.h - 4, 18, 4);
        } else {
          // 稼働中のモニター（緑のターミナル画面）
          const lightOn = this._flickerStates[(di + 3) % 8];
          ctx.fillStyle = '#1a1a2a';
          ctx.fillRect(-20, -desk.h - 30, 40, 28);
          ctx.fillStyle = lightOn ? '#0E2418' : '#0a0a15';
          ctx.fillRect(-17, -desk.h - 28, 34, 24);
          if (lightOn) {
            // ターミナルのテキスト行
            ctx.fillStyle = 'rgba(40, 220, 120, 0.5)';
            for (let l = 0; l < 5; l++) {
              ctx.fillRect(-14, -desk.h - 25 + l * 4, 10 + rnd(di * 9 + l * 3.7) * 16, 2);
            }
            // 画面の発光
            const mGlow = ctx.createRadialGradient(0, -desk.h - 16, 5, 0, -desk.h - 16, 45);
            mGlow.addColorStop(0, 'rgba(40, 220, 120, 0.08)');
            mGlow.addColorStop(1, 'rgba(40, 220, 120, 0)');
            ctx.fillStyle = mGlow;
            ctx.fillRect(-45, -desk.h - 60, 90, 90);
          }
          // モニターのスタンド
          ctx.fillStyle = '#252538';
          ctx.fillRect(-5, -desk.h - 2, 10, 4);
          // キーボードとマグカップ
          ctx.fillStyle = '#20202f';
          ctx.fillRect(-14, -desk.h + 1, 26, 4);
          ctx.fillStyle = '#7a3535';
          ctx.fillRect(18, -desk.h - 2, 8, 7);
          ctx.strokeStyle = '#7a3535';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(27, -desk.h + 1, 3, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
        }
        ctx.restore();

        // 垂れ下がるケーブル
        ctx.strokeStyle = 'rgba(30, 30, 45, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(dx + desk.w - 18, floorY - desk.h + 8);
        ctx.quadraticCurveTo(dx + desk.w + 4, floorY - 16, dx + desk.w + 14, floorY);
        ctx.stroke();
      }
    }

    // 壊れたパーティション
    const partX = left + 700;
    if (partX > -80 && partX < cw + 80) {
      ctx.save();
      ctx.translate(partX, floorY);
      ctx.rotate(0.15);
      // 支柱
      ctx.fillStyle = '#2a2a3d';
      ctx.fillRect(0, -120, 8, 120);
      ctx.fillStyle = 'rgba(140, 140, 190, 0.15)';
      ctx.fillRect(0, -120, 2, 120);
      // パネル（布の質感＋へこみ）
      ctx.fillStyle = 'rgba(50, 50, 70, 0.7)';
      ctx.fillRect(8, -110, 60, 100);
      ctx.fillStyle = 'rgba(70, 70, 95, 0.3)';
      for (let fy = -106; fy < -14; fy += 7) {
        ctx.fillRect(10, fy, 56, 1);
      }
      // へこみと破れ
      ctx.fillStyle = 'rgba(20, 20, 32, 0.6)';
      ctx.beginPath();
      ctx.ellipse(38, -60, 12, 9, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // 貼られた付箋
      ctx.fillStyle = 'rgba(220, 200, 90, 0.5)';
      ctx.fillRect(16, -100, 9, 9);
      ctx.fillStyle = 'rgba(120, 200, 200, 0.4)';
      ctx.fillRect(48, -88, 9, 9);
      ctx.restore();
    }

    // 蛍光灯（不規則に点滅）
    this._drawFluorescentLight(ctx, left + 200, ch * 0.02, 120, 3);
    this._drawFluorescentLight(ctx, left + 600, ch * 0.02, 120, 4);
    this._drawFluorescentLight(ctx, left + 900, ch * 0.02, 120, 5);
  }

  /**
   * 役員フロアの家具（高級家具の残骸）
   */
  _drawExecutiveFurniture(ctx, left, right, cw, ch) {
    const floorY = ch * 0.75;

    // 豪華なソファ（壊れている・タフティング付き）
    const sofaX = left + 200;
    if (sofaX > -250 && sofaX < cw + 250) {
      // 背もたれ（革の艶）
      const backGrad = ctx.createLinearGradient(sofaX, floorY - 80, sofaX, floorY - 42);
      backGrad.addColorStop(0, '#3a1d2c');
      backGrad.addColorStop(1, '#241018');
      ctx.fillStyle = backGrad;
      ctx.fillRect(sofaX, floorY - 80, 150, 38);
      // タフティングのボタンとくぼみ
      for (let bx = 0; bx < 4; bx++) {
        for (let by = 0; by < 2; by++) {
          const tx = sofaX + 22 + bx * 36;
          const ty = floorY - 72 + by * 16;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.beginPath();
          ctx.arc(tx, ty, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#1a0a12';
          ctx.beginPath();
          ctx.arc(tx, ty, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 座面
      const seatGrad = ctx.createLinearGradient(sofaX, floorY - 45, sofaX, floorY - 15);
      seatGrad.addColorStop(0, '#371b29');
      seatGrad.addColorStop(1, '#1f0d14');
      ctx.fillStyle = seatGrad;
      ctx.fillRect(sofaX, floorY - 45, 150, 30);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(sofaX, floorY - 45, 150, 3);
      // アーム（丸み）
      ctx.fillStyle = '#2c1420';
      ctx.fillRect(sofaX - 12, floorY - 58, 17, 43);
      ctx.fillRect(sofaX + 145, floorY - 58, 17, 43);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.ellipse(sofaX - 3, floorY - 56, 8, 4, 0, Math.PI, Math.PI * 2);
      ctx.ellipse(sofaX + 153, floorY - 56, 8, 4, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // 破れから飛び出た詰め物
      ctx.fillStyle = 'rgba(190, 180, 160, 0.5)';
      ctx.beginPath();
      ctx.ellipse(sofaX + 96, floorY - 44, 9, 5, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sofaX + 86, floorY - 46);
      ctx.lineTo(sofaX + 106, floorY - 41);
      ctx.stroke();
      // クッション（1つは座面、1つは床に）
      ctx.fillStyle = '#3d1e2b';
      ctx.fillRect(sofaX + 10, floorY - 42, 40, 25);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(sofaX + 10, floorY - 42, 40, 3);
      ctx.save();
      ctx.translate(sofaX + 170, floorY - 10);
      ctx.rotate(0.3);
      ctx.fillStyle = '#3d1e2b';
      ctx.fillRect(0, 0, 35, 22);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(0, 18, 35, 4);
      ctx.restore();
      // 木製の脚
      ctx.fillStyle = '#241008';
      ctx.fillRect(sofaX + 4, floorY - 15, 6, 15);
      ctx.fillRect(sofaX + 140, floorY - 15, 6, 15);
    }

    // 高級テーブル（ひっくり返っている・木目）
    const tableX = left + 500;
    if (tableX > -180 && tableX < cw + 180) {
      ctx.save();
      ctx.translate(tableX, floorY);
      ctx.rotate(-0.1);
      // テーブル天板（マホガニーの木目）
      const woodGrad = ctx.createLinearGradient(0, -35, 120, -25);
      woodGrad.addColorStop(0, '#33201a');
      woodGrad.addColorStop(0.5, '#42281e');
      woodGrad.addColorStop(1, '#2a1812');
      ctx.fillStyle = woodGrad;
      ctx.fillRect(0, -35, 120, 10);
      ctx.strokeStyle = 'rgba(20, 10, 6, 0.5)';
      ctx.lineWidth = 1;
      for (let g = 0; g < 3; g++) {
        ctx.beginPath();
        ctx.moveTo(4, -33 + g * 3);
        ctx.bezierCurveTo(40, -34 + g * 3, 80, -31 + g * 3, 116, -33 + g * 3);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(0, -35, 120, 2);
      // 脚（旋盤加工の段差）
      ctx.fillStyle = '#3a2a20';
      ctx.fillRect(10, -60, 8, 60);
      ctx.fillRect(100, -50, 8, 50);
      ctx.fillStyle = '#4a3628';
      ctx.fillRect(9, -52, 10, 4);
      ctx.fillRect(99, -42, 10, 4);
      ctx.restore();
    }

    // キャビネット（開いている・書類が溢れる）
    const cabX = left + 850;
    if (cabX > -120 && cabX < cw + 120) {
      const cabGrad = ctx.createLinearGradient(cabX, 0, cabX + 70, 0);
      cabGrad.addColorStop(0, '#332842');
      cabGrad.addColorStop(1, '#221a2e');
      ctx.fillStyle = cabGrad;
      ctx.fillRect(cabX, floorY - 100, 70, 100);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(cabX, floorY - 100, 70, 2);
      // 引き出し（開いている・前板の立体感）
      ctx.fillStyle = '#3e3050';
      ctx.fillRect(cabX - 20, floorY - 80, 60, 15);
      ctx.fillRect(cabX - 10, floorY - 55, 50, 15);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(cabX - 20, floorY - 67, 60, 2);
      ctx.fillRect(cabX - 10, floorY - 42, 50, 2);
      // 中から溢れる書類
      ctx.fillStyle = 'rgba(200, 195, 180, 0.5)';
      ctx.fillRect(cabX - 16, floorY - 84, 24, 4);
      ctx.fillRect(cabX - 4, floorY - 86, 18, 4);
      ctx.save();
      ctx.translate(cabX - 18, floorY - 58);
      ctx.rotate(-0.4);
      ctx.fillRect(0, 0, 16, 4);
      ctx.restore();
      // 取っ手（金）
      ctx.strokeStyle = 'rgba(200, 165, 60, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cabX + 0, floorY - 73);
      ctx.lineTo(cabX + 20, floorY - 73);
      ctx.moveTo(cabX + 8, floorY - 48);
      ctx.lineTo(cabX + 28, floorY - 48);
      ctx.stroke();
      // 上に置かれたブランデーグラス（倒れている）
      ctx.strokeStyle = 'rgba(200, 215, 230, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cabX + 50, floorY - 103, 7, 4, 1.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // シャンデリア（クリスタル付き・微かに光る）
    const chandX = left + 600;
    if (chandX > -70 && chandX < cw + 70) {
      // 吊り下げチェーン
      ctx.strokeStyle = 'rgba(200, 165, 60, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(chandX, 0);
      ctx.lineTo(chandX, ch * 0.06);
      ctx.stroke();
      // 本体フレーム（曲線アーム）
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(chandX, ch * 0.06);
        ctx.quadraticCurveTo(chandX + i * 22, ch * 0.06 + 6, chandX + i * 26, ch * 0.1);
        ctx.stroke();
        // ロウソク
        ctx.fillStyle = 'rgba(220, 215, 190, 0.4)';
        ctx.fillRect(chandX + i * 26 - 1.5, ch * 0.085, 3, 9);
        // 微かな光（中央のみ点灯）
        if (this._flickerStates[6] && i === 0) {
          ctx.fillStyle = 'rgba(255, 200, 110, 0.7)';
          ctx.beginPath();
          ctx.ellipse(chandX, ch * 0.082, 2, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          const cGlow = ctx.createRadialGradient(chandX, ch * 0.085, 4, chandX, ch * 0.085, 60);
          cGlow.addColorStop(0, 'rgba(255, 200, 110, 0.12)');
          cGlow.addColorStop(1, 'rgba(255, 200, 110, 0)');
          ctx.fillStyle = cGlow;
          ctx.fillRect(chandX - 60, ch * 0.085 - 60, 120, 120);
        }
        // クリスタルの雫
        ctx.fillStyle = `rgba(200, 220, 255, ${0.25 + rnd(i * 7.7) * 0.2})`;
        ctx.beginPath();
        ctx.moveTo(chandX + i * 26, ch * 0.1 + 2);
        ctx.lineTo(chandX + i * 26 - 2, ch * 0.1 + 7);
        ctx.lineTo(chandX + i * 26, ch * 0.1 + 11);
        ctx.lineTo(chandX + i * 26 + 2, ch * 0.1 + 7);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  /**
   * ボスエリアの家具（巨大な社長デスク）
   */
  _drawBossFurniture(ctx, left, right, cw, ch) {
    const floorY = ch * 0.75;

    // 大きな本棚（背後）
    const shelfX = left + 800;
    if (shelfX > -200 && shelfX < cw + 200) {
      const shelfGrad = ctx.createLinearGradient(shelfX, 0, shelfX + 150, 0);
      shelfGrad.addColorStop(0, '#22100c');
      shelfGrad.addColorStop(0.5, '#180a07');
      shelfGrad.addColorStop(1, '#100604');
      ctx.fillStyle = shelfGrad;
      ctx.fillRect(shelfX, ch * 0.25, 150, floorY - ch * 0.25);
      // 上部の冠モールディング
      ctx.fillStyle = '#2e1810';
      ctx.fillRect(shelfX - 6, ch * 0.25 - 8, 162, 10);
      ctx.fillStyle = 'rgba(200, 165, 60, 0.2)';
      ctx.fillRect(shelfX - 6, ch * 0.25 - 8, 162, 2);
      // 棚板（厚みと影）
      ctx.fillStyle = '#2a1510';
      for (let sy = ch * 0.3; sy < floorY; sy += 50) {
        ctx.fillRect(shelfX, sy, 150, 5);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(shelfX, sy + 5, 150, 3);
        ctx.fillStyle = '#2a1510';
      }
      // 本（高さ・幅・傾きにばらつき）
      const bookColors = ['#3a1020', '#20303a', '#302a10', '#1a2a30', '#2a1a30', '#33251a'];
      for (let row = 0; row < 4; row++) {
        const sy = ch * 0.3 + row * 50;
        if (sy >= floorY - 45) continue;
        let bx = shelfX + 8;
        for (let b = 0; b < 7 && bx < shelfX + 134; b++) {
          const bw = 9 + rnd(row * 19 + b * 7.3) * 8;
          const bh = 32 + rnd(row * 11 + b * 3.9) * 10;
          const col = bookColors[Math.floor(rnd(row * 5 + b * 13.7) * bookColors.length)];
          if (rnd(row * 23 + b * 17.1) > 0.85) {
            // 斜めに倒れかけた本
            ctx.save();
            ctx.translate(bx + bw / 2, sy + 50 - 2);
            ctx.rotate(0.35);
            ctx.fillStyle = col;
            ctx.fillRect(-bw / 2, -bh, bw, bh);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.fillRect(-bw / 2, -bh, 2, bh);
            ctx.restore();
          } else {
            ctx.fillStyle = col;
            ctx.fillRect(bx, sy + 50 - 2 - bh, bw, bh);
            // 背表紙のハイライトと帯
            ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
            ctx.fillRect(bx, sy + 50 - 2 - bh, 2, bh);
            ctx.fillStyle = 'rgba(200, 165, 60, 0.25)';
            ctx.fillRect(bx + 1, sy + 50 - 2 - bh + 5, bw - 2, 2);
          }
          bx += bw + 2;
        }
      }
    }

    // 巨大な社長デスク
    const deskX = left + 400;
    if (deskX > -320 && deskX < cw + 320) {
      // デスク本体（マホガニー・前面に彫り込みパネル）
      const deskGrad = ctx.createLinearGradient(deskX, floorY - 70, deskX, floorY);
      deskGrad.addColorStop(0, '#2a120c');
      deskGrad.addColorStop(1, '#160806');
      ctx.fillStyle = deskGrad;
      ctx.fillRect(deskX, floorY - 70, 250, 70);
      // 前面パネルの彫り込み（金の縁取り）
      ctx.strokeStyle = 'rgba(200, 165, 60, 0.22)';
      ctx.lineWidth = 1;
      ctx.strokeRect(deskX + 14, floorY - 58, 100, 44);
      ctx.strokeRect(deskX + 136, floorY - 58, 100, 44);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.strokeRect(deskX + 17, floorY - 55, 94, 38);
      ctx.strokeRect(deskX + 139, floorY - 55, 94, 38);
      // デスクトップ（木目＋金のトリム）
      const topGrad = ctx.createLinearGradient(deskX, floorY - 75, deskX + 260, floorY - 75);
      topGrad.addColorStop(0, '#2a1510');
      topGrad.addColorStop(0.5, '#46281a');
      topGrad.addColorStop(1, '#2a1510');
      ctx.fillStyle = topGrad;
      ctx.fillRect(deskX - 8, floorY - 80, 266, 14);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(deskX - 8, floorY - 80, 266, 2);
      ctx.fillStyle = 'rgba(200, 165, 60, 0.35)';
      ctx.fillRect(deskX - 8, floorY - 67, 266, 1);
      // 木目
      ctx.strokeStyle = 'rgba(15, 8, 5, 0.5)';
      ctx.lineWidth = 1;
      for (let g = 0; g < 2; g++) {
        ctx.beginPath();
        ctx.moveTo(deskX - 4, floorY - 77 + g * 5);
        ctx.bezierCurveTo(deskX + 70, floorY - 79 + g * 5, deskX + 180, floorY - 74 + g * 5, deskX + 254, floorY - 77 + g * 5);
        ctx.stroke();
      }

      // ── デスク上のアイテム ──
      // 緑シェードのバンカーズランプ（点灯）
      const lampX = deskX + 36;
      ctx.fillStyle = '#1a1410';
      ctx.fillRect(lampX + 8, floorY - 84, 4, 4);
      ctx.strokeStyle = '#3a3024';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lampX + 10, floorY - 84);
      ctx.lineTo(lampX + 10, floorY - 102);
      ctx.stroke();
      ctx.fillStyle = '#1e5c38';
      ctx.beginPath();
      ctx.moveTo(lampX - 6, floorY - 100);
      ctx.lineTo(lampX + 26, floorY - 100);
      ctx.lineTo(lampX + 20, floorY - 110);
      ctx.lineTo(lampX, floorY - 110);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 235, 170, 0.75)';
      ctx.fillRect(lampX - 4, floorY - 100, 28, 2);
      const lGlow = ctx.createRadialGradient(lampX + 10, floorY - 96, 5, lampX + 10, floorY - 96, 55);
      lGlow.addColorStop(0, 'rgba(255, 225, 150, 0.16)');
      lGlow.addColorStop(1, 'rgba(255, 225, 150, 0)');
      ctx.fillStyle = lGlow;
      ctx.fillRect(lampX - 45, floorY - 150, 110, 110);

      // ネームプレート（金・立体）
      ctx.fillStyle = '#8a701e';
      ctx.fillRect(deskX + 100, floorY - 86, 52, 4);
      ctx.fillStyle = '#c8a830';
      ctx.fillRect(deskX + 102, floorY - 94, 48, 10);
      ctx.fillStyle = 'rgba(255, 240, 170, 0.6)';
      ctx.fillRect(deskX + 102, floorY - 94, 48, 2);
      ctx.fillStyle = '#1a0a05';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('C E O', deskX + 113, floorY - 86);

      // 黒電話（受話器が外れている）
      ctx.fillStyle = '#100c0c';
      ctx.fillRect(deskX + 170, floorY - 90, 26, 10);
      ctx.fillStyle = '#1c1616';
      ctx.fillRect(deskX + 173, floorY - 94, 20, 5);
      ctx.save();
      ctx.translate(deskX + 208, floorY - 82);
      ctx.rotate(0.5);
      ctx.fillStyle = '#181212';
      ctx.fillRect(0, 0, 18, 5);
      ctx.fillRect(-2, -2, 5, 8);
      ctx.fillRect(15, -2, 5, 8);
      ctx.restore();
      // カールコード
      ctx.strokeStyle = 'rgba(30, 24, 24, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(deskX + 196, floorY - 84);
      ctx.quadraticCurveTo(deskX + 202, floorY - 76, deskX + 208, floorY - 80);
      ctx.stroke();

      // ペン立て
      ctx.fillStyle = '#252535';
      ctx.fillRect(deskX + 230, floorY - 95, 15, 16);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.fillRect(deskX + 230, floorY - 95, 3, 16);
      ctx.strokeStyle = '#4a4a60';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(deskX + 235, floorY - 95);
      ctx.lineTo(deskX + 233, floorY - 108);
      ctx.moveTo(deskX + 240, floorY - 95);
      ctx.lineTo(deskX + 242, floorY - 105);
      ctx.stroke();

      // 札束の山（デスク端）
      ctx.fillStyle = '#6e5410';
      ctx.fillRect(deskX + 64, floorY - 86, 22, 6);
      ctx.fillStyle = '#8a6914';
      ctx.fillRect(deskX + 62, floorY - 90, 22, 5);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
      ctx.fillRect(deskX + 69, floorY - 90, 6, 9);
    }

    // レザーチェア（ハイバック・ステッチ入り）
    const chairX = left + 480;
    if (chairX > -120 && chairX < cw + 120) {
      // 背もたれ
      const chGrad = ctx.createLinearGradient(chairX - 28, 0, chairX + 28, 0);
      chGrad.addColorStop(0, '#1e0a0a');
      chGrad.addColorStop(0.5, '#2c1010');
      chGrad.addColorStop(1, '#140505');
      ctx.fillStyle = chGrad;
      ctx.beginPath();
      ctx.ellipse(chairX, floorY - 68, 28, 34, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(chairX - 28, floorY - 68, 56, 30);
      // ステッチ（横のキルティングライン）
      ctx.strokeStyle = 'rgba(120, 60, 50, 0.3)';
      ctx.lineWidth = 1;
      for (let s = 0; s < 3; s++) {
        ctx.beginPath();
        ctx.moveTo(chairX - 24, floorY - 84 + s * 14);
        ctx.quadraticCurveTo(chairX, floorY - 88 + s * 14, chairX + 24, floorY - 84 + s * 14);
        ctx.stroke();
      }
      // 座面
      ctx.fillStyle = '#1c0808';
      ctx.beginPath();
      ctx.ellipse(chairX, floorY - 35, 30, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.ellipse(chairX, floorY - 38, 24, 8, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // ガス圧シリンダーと5本脚
      ctx.strokeStyle = '#2e2e2e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(chairX, floorY - 24);
      ctx.lineTo(chairX, floorY - 8);
      ctx.stroke();
      ctx.lineWidth = 2;
      for (let l = -2; l <= 2; l++) {
        if (l === 0) continue;
        ctx.beginPath();
        ctx.moveTo(chairX, floorY - 8);
        ctx.lineTo(chairX + l * 12, floorY);
        ctx.stroke();
        // キャスター
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(chairX + l * 12, floorY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ===========================================================================
  // 近景描画（床・小物）- パララックス係数 1.0
  // ===========================================================================
  _drawForeground(ctx, cw, ch) {
    const parallax = this.scrollX * 1.0;
    ctx.save();

    for (let areaIdx = 0; areaIdx < 4; areaIdx++) {
      const area = this._areas[areaIdx];
      const areaLeft = area.start - parallax;
      const areaRight = area.end - parallax;

      if (areaRight < -200 || areaLeft > cw + 200) continue;

      this._drawAreaFloor(ctx, areaIdx, areaLeft, areaRight, cw, ch);
      this._drawAreaDetails(ctx, areaIdx, areaLeft, areaRight, cw, ch);
    }

    ctx.restore();
  }

  /**
   * エリアごとの床描画
   */
  _drawAreaFloor(ctx, areaIdx, left, right, cw, ch) {
    const floorY = ch * 0.75;
    const floorH = ch * 0.25;
    const width = right - left;

    switch (areaIdx) {
      case 0: {
        // エントランス - 大理石風の床
        const marbleGrad = ctx.createLinearGradient(0, floorY, 0, ch);
        marbleGrad.addColorStop(0, '#3a3a4e');
        marbleGrad.addColorStop(0.3, '#2e2e42');
        marbleGrad.addColorStop(1, '#1a1a2e');
        ctx.fillStyle = marbleGrad;
        ctx.fillRect(left, floorY, width, floorH);

        // タイルの市松の明暗
        for (let tx = Math.floor(left / 60) * 60; tx < right; tx += 60) {
          for (let ty = Math.floor(floorY / 60) * 60; ty < ch; ty += 60) {
            if (((tx / 60) + Math.floor(ty / 60)) % 2 === 0) {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
              ctx.fillRect(Math.max(tx, left), Math.max(ty, floorY), 60, 60);
            }
          }
        }
        // タイル目地
        ctx.strokeStyle = 'rgba(80, 80, 110, 0.2)';
        ctx.lineWidth = 1;
        for (let tx = Math.floor(left / 60) * 60; tx < right; tx += 60) {
          ctx.beginPath();
          ctx.moveTo(tx, floorY);
          ctx.lineTo(tx, ch);
          ctx.stroke();
        }
        for (let ty = floorY; ty < ch; ty += 60) {
          ctx.beginPath();
          ctx.moveTo(left, ty);
          ctx.lineTo(right, ty);
          ctx.stroke();
        }
        // 大理石の石目（うねる筋）
        ctx.strokeStyle = 'rgba(170, 170, 200, 0.07)';
        ctx.lineWidth = 1;
        for (let v = 0; v < 7; v++) {
          const vx = left + v * 180 + rnd(v * 3.1) * 60;
          const vy = floorY + 12 + rnd(v * 7.7) * (floorH - 24);
          ctx.beginPath();
          ctx.moveTo(vx, vy);
          ctx.bezierCurveTo(
            vx + 40, vy + (rnd(v * 1.3) - 0.5) * 26,
            vx + 80, vy + (rnd(v * 2.7) - 0.5) * 26,
            vx + 130, vy + (rnd(v * 5.1) - 0.5) * 18,
          );
          ctx.stroke();
        }
        // ひび割れたタイル
        const crackX = left + 660;
        ctx.strokeStyle = 'rgba(10, 10, 20, 0.5)';
        ctx.beginPath();
        ctx.moveTo(crackX, floorY + 26);
        ctx.lineTo(crackX + 18, floorY + 38);
        ctx.lineTo(crackX + 12, floorY + 52);
        ctx.moveTo(crackX + 18, floorY + 38);
        ctx.lineTo(crackX + 34, floorY + 44);
        ctx.stroke();
        // 窓明かりの反射
        ctx.fillStyle = 'rgba(150, 170, 220, 0.03)';
        ctx.beginPath();
        ctx.ellipse(left + 300, floorY + 40, 130, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 1: {
        // オープンフロア - カーペット風
        const carpetGrad = ctx.createLinearGradient(0, floorY, 0, ch);
        carpetGrad.addColorStop(0, '#2a2a3e');
        carpetGrad.addColorStop(1, '#1e1e30');
        ctx.fillStyle = carpetGrad;
        ctx.fillRect(left, floorY, width, floorH);

        // カーペットタイルの継ぎ目
        ctx.strokeStyle = 'rgba(20, 20, 35, 0.4)';
        ctx.lineWidth = 1;
        for (let tx = Math.floor(left / 90) * 90; tx < right; tx += 90) {
          ctx.beginPath();
          ctx.moveTo(tx, floorY);
          ctx.lineTo(tx, ch);
          ctx.stroke();
        }
        // カーペットのテクスチャ（ドット）
        ctx.fillStyle = 'rgba(60, 60, 80, 0.2)';
        for (let dx = Math.floor(left / 12) * 12; dx < right; dx += 12) {
          for (let dy = floorY + 5; dy < ch; dy += 12) {
            if ((dx + dy) % 24 === 0) {
              ctx.fillRect(dx, dy, 2, 2);
            }
          }
        }
        // 擦り切れ・汚れのパッチ
        for (let i = 0; i < 5; i++) {
          const px = left + rnd(i * 9.3) * width;
          const py = floorY + 14 + rnd(i * 4.1) * (floorH - 28);
          ctx.fillStyle = `rgba(0, 0, 0, ${0.10 + rnd(i * 2.3) * 0.10})`;
          ctx.beginPath();
          ctx.ellipse(px, py, 24 + rnd(i) * 30, 9 + rnd(i * 3.3) * 8, rnd(i) * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        // 床を這う延長ケーブル
        ctx.strokeStyle = 'rgba(15, 15, 28, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(left + 380, floorY + 8);
        ctx.bezierCurveTo(left + 460, floorY + 30, left + 560, floorY + 16, left + 660, floorY + 36);
        ctx.stroke();
        // 電源タップ
        ctx.fillStyle = '#d8d8e0';
        ctx.fillRect(left + 660, floorY + 33, 22, 7);
        ctx.fillStyle = '#202030';
        ctx.fillRect(left + 663, floorY + 35, 3, 3);
        ctx.fillRect(left + 670, floorY + 35, 3, 3);
        break;
      }
      case 2: {
        // 役員フロア - 赤い絨毯
        const rugGrad = ctx.createLinearGradient(0, floorY, 0, ch);
        rugGrad.addColorStop(0, '#3a1520');
        rugGrad.addColorStop(0.3, '#2a0a15');
        rugGrad.addColorStop(1, '#1a0510');
        ctx.fillStyle = rugGrad;
        ctx.fillRect(left, floorY, width, floorH);

        // 絨毯の毛並み（不規則な濃淡）
        for (let i = 0; i < 10; i++) {
          const px = left + rnd(i * 6.7) * width;
          const py = floorY + rnd(i * 2.9) * floorH;
          ctx.fillStyle = `rgba(90, 30, 45, ${0.05 + rnd(i) * 0.05})`;
          ctx.beginPath();
          ctx.ellipse(px, py, 35 + rnd(i * 4.4) * 40, 8 + rnd(i * 8.8) * 8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // 金のボーダー（二重線＋ダイヤ紋様）
        ctx.strokeStyle = 'rgba(200, 165, 60, 0.22)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(left, floorY + 6);
        ctx.lineTo(right, floorY + 6);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(left, floorY + 12);
        ctx.lineTo(right, floorY + 12);
        ctx.stroke();
        // 中央のダイヤ紋様の帯
        const midY = floorY + floorH / 2;
        ctx.strokeStyle = 'rgba(200, 140, 80, 0.13)';
        for (let dx = Math.floor(left / 90) * 90; dx < right; dx += 90) {
          ctx.beginPath();
          ctx.moveTo(dx, midY - 9);
          ctx.lineTo(dx + 16, midY);
          ctx.lineTo(dx, midY + 9);
          ctx.lineTo(dx - 16, midY);
          ctx.closePath();
          ctx.stroke();
          // 内側の小ダイヤ
          ctx.beginPath();
          ctx.moveTo(dx, midY - 4);
          ctx.lineTo(dx + 7, midY);
          ctx.lineTo(dx, midY + 4);
          ctx.lineTo(dx - 7, midY);
          ctx.closePath();
          ctx.stroke();
        }
        break;
      }
      case 3: {
        // ボスエリア - 暗い豪華な床
        const bossFloorGrad = ctx.createLinearGradient(0, floorY, 0, ch);
        bossFloorGrad.addColorStop(0, '#2a1015');
        bossFloorGrad.addColorStop(0.5, '#1a0810');
        bossFloorGrad.addColorStop(1, '#0a0005');
        ctx.fillStyle = bossFloorGrad;
        ctx.fillRect(left, floorY, width, floorH);

        // 寄木張りのパターン
        ctx.strokeStyle = 'rgba(150, 50, 50, 0.1)';
        ctx.lineWidth = 1;
        for (let tx = Math.floor(left / 80) * 80; tx < right; tx += 80) {
          ctx.beginPath();
          ctx.moveTo(tx, floorY);
          ctx.lineTo(tx, ch);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(150, 50, 50, 0.05)';
        let rowIdx = 0;
        for (let ty = floorY + 20; ty < ch; ty += 20) {
          const off = (rowIdx % 2) * 40;
          for (let tx = Math.floor(left / 80) * 80 + off; tx < right; tx += 80) {
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + 80, ty);
            ctx.stroke();
          }
          rowIdx++;
        }
        // 中央の金の象嵌サークル（社章風）
        const inlayX = left + 510;
        ctx.strokeStyle = 'rgba(200, 165, 60, 0.10)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(inlayX, floorY + floorH * 0.45, 120, 34, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(inlayX, floorY + floorH * 0.45, 98, 26, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 赤い照明の反射
        const reflectionIntensity = 0.05 + Math.sin(this._time * 1.5) * 0.02;
        const reflection = ctx.createRadialGradient(
          left + (right - left) / 2, floorY + 20, 10,
          left + (right - left) / 2, floorY + 20, 300,
        );
        reflection.addColorStop(0, `rgba(200, 30, 30, ${reflectionIntensity})`);
        reflection.addColorStop(1, 'rgba(200, 30, 30, 0)');
        ctx.fillStyle = reflection;
        ctx.fillRect(left, floorY, width, floorH);
        // 窓明かりの床反射（嵐の青白い光）
        const winRef = 0.03 + (this._lightningTimer > 0 ? 0.10 : 0);
        ctx.fillStyle = `rgba(150, 170, 230, ${winRef})`;
        ctx.beginPath();
        ctx.ellipse(left + 580, floorY + 36, 180, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    // 床の境界線（段差感）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(left, floorY, right - left, 1);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(left, floorY + 1, right - left, 2);
  }

  /**
   * エリアごとの小物描画
   */
  _drawAreaDetails(ctx, areaIdx, left, right, cw, ch) {
    const floorY = ch * 0.75;

    switch (areaIdx) {
      case 0: {
        // エントランスの小物
        // 散乱した書類
        this._drawScatteredPapers(ctx, left + 350, floorY, 3);
        this._drawScatteredPapers(ctx, left + 950, floorY, 2);
        // 落ちた社員証
        const idX = left + 550;
        if (idX > -30 && idX < cw + 30) {
          ctx.save();
          ctx.translate(idX, floorY + 18);
          ctx.rotate(-0.5);
          ctx.fillStyle = 'rgba(220, 220, 230, 0.5)';
          ctx.fillRect(0, 0, 16, 11);
          ctx.fillStyle = 'rgba(80, 100, 160, 0.5)';
          ctx.fillRect(1, 1, 5, 6);
          ctx.fillStyle = 'rgba(60, 60, 70, 0.4)';
          ctx.fillRect(8, 3, 7, 1);
          ctx.fillRect(8, 6, 6, 1);
          // ストラップ
          ctx.strokeStyle = 'rgba(160, 50, 60, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(8, 0);
          ctx.quadraticCurveTo(14, -10, 24, -7);
          ctx.stroke();
          ctx.restore();
        }
        break;
      }
      case 1: {
        // オープンフロアの小物
        // コーヒーの染み
        this._drawCoffeeStain(ctx, left + 250, floorY + 10);
        this._drawCoffeeStain(ctx, left + 650, floorY + 20);

        // 散乱した書類
        this._drawScatteredPapers(ctx, left + 400, floorY, 5);
        this._drawScatteredPapers(ctx, left + 750, floorY, 3);
        this._drawScatteredPapers(ctx, left + 1050, floorY, 4);

        // キーボードが床に
        const kbX = left + 500;
        if (kbX > -60 && kbX < cw + 60) {
          ctx.save();
          ctx.translate(kbX, floorY - 3);
          ctx.rotate(0.6);
          ctx.fillStyle = '#2a2a3a';
          ctx.fillRect(0, 0, 45, 15);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
          ctx.fillRect(0, 0, 45, 2);
          // キーの模様（外れたキーが2個）
          ctx.strokeStyle = 'rgba(80, 80, 110, 0.3)';
          ctx.lineWidth = 1;
          for (let ky = 2; ky < 13; ky += 4) {
            for (let kx = 2; kx < 43; kx += 5) {
              if (ky === 6 && (kx === 12 || kx === 27)) continue; // 欠けたキー
              ctx.strokeRect(kx, ky, 3, 3);
            }
          }
          ctx.restore();
          // 外れて転がったキー
          ctx.fillStyle = 'rgba(80, 80, 110, 0.4)';
          ctx.fillRect(kbX + 30, floorY + 12, 4, 4);
          ctx.fillRect(kbX - 14, floorY + 6, 4, 4);
        }

        // 倒れたコーヒーカップ（こぼれた跡つき）
        const cupX = left + 270;
        if (cupX > -30 && cupX < cw + 30) {
          ctx.save();
          ctx.translate(cupX, floorY + 8);
          ctx.rotate(1.3);
          ctx.fillStyle = 'rgba(230, 228, 222, 0.55)';
          ctx.fillRect(0, 0, 10, 13);
          ctx.fillStyle = 'rgba(150, 100, 60, 0.4)';
          ctx.fillRect(0, 0, 10, 2);
          ctx.restore();
        }
        break;
      }
      case 2: {
        // 役員フロアの小物
        this._drawScatteredPapers(ctx, left + 100, floorY, 2);

        // ワインボトル（倒れている）＋こぼれたワイン
        const bottleX = left + 400;
        if (bottleX > -50 && bottleX < cw + 50) {
          // こぼれたワインの染み
          ctx.fillStyle = 'rgba(110, 15, 35, 0.35)';
          ctx.beginPath();
          ctx.ellipse(bottleX + 36, floorY + 4, 26, 7, 0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(110, 15, 35, 0.25)';
          ctx.beginPath();
          ctx.ellipse(bottleX + 58, floorY + 8, 10, 4, -0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.save();
          ctx.translate(bottleX, floorY - 5);
          ctx.rotate(1.4);
          // ボトル本体（ガラスの艶）
          ctx.fillStyle = '#1a1530';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(3, -5);
          ctx.lineTo(3, -25);
          ctx.lineTo(8, -30);
          ctx.lineTo(8, -50);
          ctx.lineTo(-8, -50);
          ctx.lineTo(-8, -30);
          ctx.lineTo(-3, -25);
          ctx.lineTo(-3, -5);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(170, 190, 255, 0.12)';
          ctx.fillRect(-6, -48, 3, 16);
          // ラベル
          ctx.fillStyle = 'rgba(190, 180, 150, 0.4)';
          ctx.fillRect(-7, -45, 14, 10);
          ctx.fillStyle = 'rgba(80, 20, 30, 0.5)';
          ctx.fillRect(-5, -42, 10, 2);
          ctx.restore();
        }

        // 倒れたワイングラス
        const glassX = left + 460;
        if (glassX > -30 && glassX < cw + 30) {
          ctx.strokeStyle = 'rgba(200, 215, 230, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.save();
          ctx.translate(glassX, floorY + 6);
          ctx.rotate(1.5);
          ctx.beginPath();
          ctx.ellipse(0, -12, 6, 7, 0, 0, Math.PI * 2);
          ctx.moveTo(0, -5);
          ctx.lineTo(0, 4);
          ctx.moveTo(-4, 5);
          ctx.lineTo(4, 5);
          ctx.stroke();
          ctx.restore();
        }
        break;
      }
      case 3: {
        // ボスエリアの小物
        this._drawScatteredPapers(ctx, left + 300, floorY, 2);

        // 壊れた時計（床に・ガラス片と止まった針）
        const clockX = left + 200;
        if (clockX > -40 && clockX < cw + 40) {
          ctx.fillStyle = 'rgba(20, 12, 8, 0.6)';
          ctx.beginPath();
          ctx.arc(clockX, floorY - 5, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(200, 165, 60, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(clockX, floorY - 5, 15, 0, Math.PI * 2);
          ctx.stroke();
          // 文字盤の目盛り
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(200, 165, 60, 0.25)';
          for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(clockX + Math.cos(a) * 11, floorY - 5 + Math.sin(a) * 11);
            ctx.lineTo(clockX + Math.cos(a) * 13, floorY - 5 + Math.sin(a) * 13);
            ctx.stroke();
          }
          // 針
          ctx.strokeStyle = 'rgba(200, 165, 60, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(clockX, floorY - 5);
          ctx.lineTo(clockX + 8, floorY - 12);
          ctx.moveTo(clockX, floorY - 5);
          ctx.lineTo(clockX - 3, floorY + 5);
          ctx.stroke();
          // 飛び散ったガラス片
          ctx.fillStyle = 'rgba(170, 210, 255, 0.25)';
          ctx.beginPath();
          ctx.moveTo(clockX + 22, floorY + 2);
          ctx.lineTo(clockX + 27, floorY - 2);
          ctx.lineTo(clockX + 30, floorY + 3);
          ctx.closePath();
          ctx.fill();
          ctx.fillRect(clockX - 24, floorY + 4, 4, 3);
        }

        // 散らばった紙幣
        for (let i = 0; i < 4; i++) {
          const bx = left + 600 + rnd(i * 8.3) * 220;
          const by = floorY + 6 + rnd(i * 3.7) * 20;
          if (bx < -30 || bx > cw + 30) continue;
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(rnd(i * 5.1) * 2 - 1);
          ctx.fillStyle = 'rgba(138, 105, 20, 0.45)';
          ctx.fillRect(0, 0, 16, 8);
          ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
          ctx.fillRect(6, 0, 4, 8);
          ctx.restore();
        }
        break;
      }
    }
  }

  // ===========================================================================
  // ヘルパー描画メソッド
  // ===========================================================================

  /**
   * 蛍光灯の描画（吊り下げ式・金属ハウジング）
   */
  _drawFluorescentLight(ctx, x, y, width, flickerIndex) {
    const isOn = this._flickerStates[flickerIndex % this._flickerStates.length];

    // 吊りワイヤー
    ctx.strokeStyle = 'rgba(120, 120, 140, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 10, 0);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x + width - 10, 0);
    ctx.lineTo(x + width - 10, y);
    ctx.stroke();

    // 金属ハウジング（上部の笠）
    ctx.fillStyle = '#3a3a48';
    ctx.fillRect(x - 4, y - 4, width + 8, 5);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(x - 4, y - 4, width + 8, 1);

    // 蛍光管
    ctx.fillStyle = isOn ? '#e8e8f0' : '#3a3a45';
    ctx.fillRect(x, y + 1, width, 5);
    if (isOn) {
      // 管の中心の明るい芯
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 4, y + 2, width - 8, 2);
    } else {
      // 消えた管の暗い反射
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(x + 4, y + 2, width - 8, 1);
    }

    // 点灯時のグロー効果
    if (isOn) {
      const intensity = 0.08 + Math.random() * 0.04;
      const glow = ctx.createRadialGradient(
        x + width / 2, y + 3, 5,
        x + width / 2, y + 3, 120,
      );
      glow.addColorStop(0, `rgba(200, 210, 255, ${intensity})`);
      glow.addColorStop(1, 'rgba(200, 210, 255, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 60, y - 60, width + 120, 180);
      // 下方向への光の帯
      const beam = ctx.createLinearGradient(0, y + 6, 0, y + 90);
      beam.addColorStop(0, 'rgba(200, 210, 255, 0.05)');
      beam.addColorStop(1, 'rgba(200, 210, 255, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 6);
      ctx.lineTo(x + width - 6, y + 6);
      ctx.lineTo(x + width + 18, y + 90);
      ctx.lineTo(x - 18, y + 90);
      ctx.closePath();
      ctx.fill();
    }

    // マウント（両端の口金）
    ctx.fillStyle = '#4a4a55';
    ctx.fillRect(x - 2, y - 2, 8, 10);
    ctx.fillRect(x + width - 6, y - 2, 8, 10);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(x - 2, y - 2, 8, 2);
    ctx.fillRect(x + width - 6, y - 2, 8, 2);
  }

  /**
   * 散乱した書類の描画
   */
  _drawScatteredPapers(ctx, x, floorY, count) {
    for (let i = 0; i < count; i++) {
      const px = x + (i * 37 % 80) - 20;
      const py = floorY - 2 + (i * 13 % 6);

      if (px < -30 || px > 990) continue;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate((i * 1.7) % 3 - 1.5);

      const pw = 20 + (i % 3) * 5;
      const phh = 14 + (i % 2) * 4;
      // 紙の影
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(1, 1, pw, phh);
      ctx.fillStyle = `rgba(200, 195, 180, ${0.18 + (i * 0.05)})`;
      ctx.fillRect(0, 0, pw, phh);
      // めくれた角
      ctx.fillStyle = `rgba(160, 155, 140, ${0.18 + (i * 0.05)})`;
      ctx.beginPath();
      ctx.moveTo(pw, phh);
      ctx.lineTo(pw - 5, phh);
      ctx.lineTo(pw, phh - 5);
      ctx.closePath();
      ctx.fill();

      // テキストライン
      ctx.fillStyle = 'rgba(80, 80, 80, 0.12)';
      for (let line = 3; line < phh - 1; line += 3) {
        ctx.fillRect(2, line, pw - 8 + (i % 3) * 3, 1);
      }
      // 一部の書類に赤い印影（却下のハンコ）
      if (i % 3 === 1) {
        ctx.fillStyle = 'rgba(200, 40, 40, 0.25)';
        ctx.fillRect(pw - 8, 2, 5, 5);
      }

      ctx.restore();
    }
  }

  /**
   * コーヒーの染み描画
   */
  _drawCoffeeStain(ctx, x, y) {
    if (x < -30 || x > 990) return;

    // 染みの本体（濃淡2層）
    ctx.fillStyle = 'rgba(60, 30, 15, 0.15)';
    ctx.beginPath();
    ctx.ellipse(x, y, 18, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(50, 24, 12, 0.12)';
    ctx.beginPath();
    ctx.ellipse(x - 4, y + 2, 10, 6, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // 飛び散った小さな滴
    ctx.fillStyle = 'rgba(60, 30, 15, 0.12)';
    ctx.beginPath();
    ctx.ellipse(x + 22, y + 4, 3, 2, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 20, y - 3, 2.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // リング（カップの跡）
    ctx.strokeStyle = 'rgba(70, 35, 15, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x + 3, y - 2, 10, 8, -0.2, 0, Math.PI * 2);
    ctx.stroke();
  }
}
