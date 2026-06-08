// =============================================================================
// stage.js - ステージ背景描画・スクロール管理
// ブラック企業サバイバー ～経営者ゾンビ殲滅戦～
// =============================================================================

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
    for (let i = 0; i < this._flickerTimers.length; i++) {
      this._flickerTimers[i] = 0;
      this._flickerStates[i] = true;
    }
  }

  // ===========================================================================
  // 遠景描画（天井・壁）- パララックス係数 0.3
  // ===========================================================================
  _drawFarBackground(ctx, cw, ch) {
    const parallax = this.scrollX * 0.3;
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
   * エントランスの壁
   */
  _drawEntranceWall(ctx, left, width, cw, ch) {
    // 暗い灰色の壁
    const wallGrad = ctx.createLinearGradient(left, 0, left, ch * 0.65);
    wallGrad.addColorStop(0, '#1a1a2e');
    wallGrad.addColorStop(1, '#252540');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(left, 0, width, ch * 0.65);

    // 壁のパネルライン
    ctx.strokeStyle = 'rgba(100, 100, 140, 0.15)';
    ctx.lineWidth = 1;
    for (let x = left; x < left + width; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ch * 0.65);
      ctx.stroke();
    }
    // 横ライン
    for (let y = 0; y < ch * 0.65; y += 80) {
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + width, y);
      ctx.stroke();
    }

    // 割れたガラスドアの残骸（エリア左端付近）
    const doorX = left + 100;
    if (doorX > -100 && doorX < cw + 100) {
      // ドアフレーム
      ctx.fillStyle = '#3a3a50';
      ctx.fillRect(doorX, ch * 0.15, 80, ch * 0.5);
      // ガラスの破片
      ctx.strokeStyle = 'rgba(150, 200, 255, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const fx = doorX + 10 + Math.sin(i * 2.3) * 30;
        const fy = ch * 0.15 + 20 + i * 40;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + 15, fy - 10);
        ctx.lineTo(fx + 25, fy + 5);
        ctx.closePath();
        ctx.stroke();
      }
    }
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

    // 窓のシルエット（壁の上部）
    ctx.fillStyle = 'rgba(10, 15, 30, 0.8)';
    for (let i = 0; i < 4; i++) {
      const wx = left + 80 + i * 280;
      if (wx > -150 && wx < cw + 150) {
        ctx.fillRect(wx, ch * 0.08, 150, ch * 0.25);
        // 窓枠
        ctx.strokeStyle = 'rgba(80, 90, 120, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(wx, ch * 0.08, 150, ch * 0.25);
        // 中央の仕切り
        ctx.beginPath();
        ctx.moveTo(wx + 75, ch * 0.08);
        ctx.lineTo(wx + 75, ch * 0.08 + ch * 0.25);
        ctx.stroke();
      }
    }
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

    // 金色の装飾ライン（壁の上部と下部）
    ctx.strokeStyle = 'rgba(180, 150, 50, 0.25)';
    ctx.lineWidth = 2;
    // 上部装飾
    ctx.beginPath();
    ctx.moveTo(left, ch * 0.05);
    ctx.lineTo(left + width, ch * 0.05);
    ctx.stroke();
    // 下部装飾（腰壁のライン）
    ctx.beginPath();
    ctx.moveTo(left, ch * 0.45);
    ctx.lineTo(left + width, ch * 0.45);
    ctx.stroke();

    // 額縁（傾いた絵画）
    for (let i = 0; i < 3; i++) {
      const px = left + 150 + i * 350;
      if (px > -100 && px < cw + 100) {
        ctx.save();
        ctx.translate(px + 40, ch * 0.18);
        ctx.rotate((i % 2 === 0 ? 0.08 : -0.12)); // 傾き
        // フレーム
        ctx.strokeStyle = 'rgba(180, 150, 50, 0.4)';
        ctx.lineWidth = 3;
        ctx.strokeRect(-40, -30, 80, 60);
        // 絵画内部（暗い色）
        ctx.fillStyle = 'rgba(30, 15, 20, 0.8)';
        ctx.fillRect(-37, -27, 74, 54);
        ctx.restore();
      }
    }

    // 壁のパネル装飾
    ctx.strokeStyle = 'rgba(180, 150, 50, 0.1)';
    ctx.lineWidth = 1;
    for (let x = left; x < left + width; x += 200) {
      ctx.strokeRect(x + 10, ch * 0.06, 180, ch * 0.38);
    }
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

      // 嵐の雲
      ctx.fillStyle = 'rgba(30, 30, 50, 0.6)';
      const cloudOffset = Math.sin(this._stormTime * 0.3) * 20;
      for (let i = 0; i < 3; i++) {
        const cx = winX + winW * 0.2 + i * winW * 0.25 + cloudOffset;
        const cy = winY + winH * 0.2 + Math.sin(i + this._stormTime * 0.5) * 10;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 60, 20, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 稲光（ランダム）
      if (Math.random() < 0.005) {
        ctx.fillStyle = 'rgba(200, 200, 255, 0.15)';
        ctx.fillRect(winX, winY, winW, winH);
      }

      // 雨粒
      ctx.strokeStyle = 'rgba(100, 120, 200, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 15; i++) {
        const rx = winX + ((i * 73 + this._stormTime * 100) % winW);
        const ry = winY + ((i * 47 + this._stormTime * 200) % winH);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 2, ry + 8);
        ctx.stroke();
      }

      // 窓枠
      ctx.strokeStyle = 'rgba(60, 40, 40, 0.8)';
      ctx.lineWidth = 4;
      ctx.strokeRect(winX, winY, winW, winH);
      // 窓の仕切り
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(winX + winW / 3, winY);
      ctx.lineTo(winX + winW / 3, winY + winH);
      ctx.moveTo(winX + winW * 2 / 3, winY);
      ctx.lineTo(winX + winW * 2 / 3, winY + winH);
      ctx.moveTo(winX, winY + winH / 2);
      ctx.lineTo(winX + winW, winY + winH / 2);
      ctx.stroke();
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
  }

  // ===========================================================================
  // 中景描画（家具・デスク）- パララックス係数 0.6
  // ===========================================================================
  _drawMidground(ctx, cw, ch) {
    const parallax = this.scrollX * 0.6;
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
    if (counterX > -200 && counterX < cw + 200) {
      // カウンター本体
      ctx.fillStyle = '#2a2a3e';
      ctx.fillRect(counterX, floorY - 80, 200, 80);
      // カウンタートップ
      ctx.fillStyle = '#3a3a55';
      ctx.fillRect(counterX - 5, floorY - 85, 210, 10);
      // カウンターのディテール
      ctx.strokeStyle = 'rgba(100, 100, 150, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(counterX + 10, floorY - 70, 80, 50);
      ctx.strokeRect(counterX + 110, floorY - 70, 80, 50);
    }

    // 枯れた観葉植物
    const plantX = left + 800;
    if (plantX > -50 && plantX < cw + 50) {
      // 鉢
      ctx.fillStyle = '#3a2a20';
      ctx.beginPath();
      ctx.moveTo(plantX - 15, floorY);
      ctx.lineTo(plantX - 20, floorY - 30);
      ctx.lineTo(plantX + 20, floorY - 30);
      ctx.lineTo(plantX + 15, floorY);
      ctx.closePath();
      ctx.fill();
      // 枯れた茎
      ctx.strokeStyle = '#4a3a20';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(plantX, floorY - 30);
      ctx.lineTo(plantX - 5, floorY - 70);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(plantX, floorY - 30);
      ctx.lineTo(plantX + 8, floorY - 60);
      ctx.stroke();
      // 枯れた葉
      ctx.fillStyle = '#3a3010';
      ctx.beginPath();
      ctx.ellipse(plantX - 8, floorY - 68, 12, 5, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(plantX + 12, floorY - 58, 10, 4, 0.3, 0, Math.PI * 2);
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

    for (const desk of desks) {
      const dx = left + desk.x;
      if (dx > -200 && dx < cw + 200) {
        ctx.save();
        ctx.translate(dx + desk.w / 2, floorY);
        ctx.rotate(desk.tilt);
        // デスク天板
        ctx.fillStyle = '#2e2e42';
        ctx.fillRect(-desk.w / 2, -desk.h, desk.w, 8);
        // デスク脚
        ctx.fillStyle = '#252538';
        ctx.fillRect(-desk.w / 2 + 5, -desk.h + 8, 6, desk.h - 8);
        ctx.fillRect(desk.w / 2 - 11, -desk.h + 8, 6, desk.h - 8);

        // 倒れたモニター（一部のデスクのみ）
        if (desk.tilt !== 0) {
          ctx.fillStyle = '#1a1a2a';
          ctx.save();
          ctx.rotate(0.4);
          ctx.fillRect(-15, -desk.h - 25, 35, 25);
          ctx.strokeStyle = 'rgba(60, 60, 100, 0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(-15, -desk.h - 25, 35, 25);
          ctx.restore();
        } else {
          // 正常なモニター
          ctx.fillStyle = '#1a1a2a';
          ctx.fillRect(-20, -desk.h - 30, 40, 28);
          ctx.fillStyle = '#0a0a15';
          ctx.fillRect(-17, -desk.h - 28, 34, 24);
          // モニターのスタンド
          ctx.fillStyle = '#252538';
          ctx.fillRect(-5, -desk.h - 2, 10, 4);
        }

        ctx.restore();
      }
    }

    // 壊れたパーティション
    const partX = left + 700;
    if (partX > -50 && partX < cw + 50) {
      ctx.save();
      ctx.translate(partX, floorY);
      ctx.rotate(0.15);
      ctx.fillStyle = '#2a2a3d';
      ctx.fillRect(0, -120, 8, 120);
      // パーティションパネル
      ctx.fillStyle = 'rgba(50, 50, 70, 0.6)';
      ctx.fillRect(8, -110, 60, 100);
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

    // 豪華なソファ（壊れている）
    const sofaX = left + 200;
    if (sofaX > -200 && sofaX < cw + 200) {
      ctx.fillStyle = '#2a1520';
      // ソファ座面
      ctx.fillRect(sofaX, floorY - 45, 150, 30);
      // 背もたれ
      ctx.fillRect(sofaX, floorY - 80, 150, 38);
      // アーム
      ctx.fillRect(sofaX - 10, floorY - 55, 15, 40);
      ctx.fillRect(sofaX + 145, floorY - 55, 15, 40);
      // クッション（1つは床に）
      ctx.fillStyle = '#351a25';
      ctx.fillRect(sofaX + 10, floorY - 42, 40, 25);
      ctx.save();
      ctx.translate(sofaX + 170, floorY - 10);
      ctx.rotate(0.3);
      ctx.fillRect(0, 0, 35, 22);
      ctx.restore();
    }

    // 高級テーブル（ひっくり返っている）
    const tableX = left + 500;
    if (tableX > -150 && tableX < cw + 150) {
      ctx.save();
      ctx.translate(tableX, floorY);
      ctx.rotate(-0.1);
      ctx.fillStyle = '#2a1a15';
      // テーブル天板
      ctx.fillRect(0, -35, 120, 10);
      // 脚（2本見える）
      ctx.fillStyle = '#3a2a20';
      ctx.fillRect(10, -60, 8, 60);
      ctx.fillRect(100, -50, 8, 50);
      ctx.restore();
    }

    // キャビネット（開いている）
    const cabX = left + 850;
    if (cabX > -100 && cabX < cw + 100) {
      ctx.fillStyle = '#2a2035';
      ctx.fillRect(cabX, floorY - 100, 70, 100);
      // 引き出し（開いている）
      ctx.fillStyle = '#352a40';
      ctx.fillRect(cabX - 20, floorY - 80, 60, 15);
      ctx.fillRect(cabX - 10, floorY - 55, 50, 15);
      // 取っ手
      ctx.strokeStyle = 'rgba(180, 150, 50, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cabX + 10, floorY - 72);
      ctx.lineTo(cabX + 30, floorY - 72);
      ctx.stroke();
    }

    // シャンデリア風照明（暗い）
    const chandX = left + 600;
    if (chandX > -50 && chandX < cw + 50) {
      ctx.strokeStyle = 'rgba(180, 150, 50, 0.2)';
      ctx.lineWidth = 2;
      // 吊り下げチェーン
      ctx.beginPath();
      ctx.moveTo(chandX, 0);
      ctx.lineTo(chandX, ch * 0.06);
      ctx.stroke();
      // 本体
      ctx.beginPath();
      ctx.moveTo(chandX - 30, ch * 0.06);
      ctx.lineTo(chandX + 30, ch * 0.06);
      ctx.stroke();
      // アーム
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(chandX + i * 15, ch * 0.06);
        ctx.lineTo(chandX + i * 20, ch * 0.09);
        ctx.stroke();
        // 微かな光
        if (this._flickerStates[6] && i === 0) {
          ctx.fillStyle = 'rgba(200, 180, 100, 0.1)';
          ctx.beginPath();
          ctx.arc(chandX + i * 20, ch * 0.09, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  /**
   * ボスエリアの家具（巨大な社長デスク）
   */
  _drawBossFurniture(ctx, left, right, cw, ch) {
    const floorY = ch * 0.75;

    // 巨大な社長デスク
    const deskX = left + 400;
    if (deskX > -300 && deskX < cw + 300) {
      // デスク本体（大きい）
      ctx.fillStyle = '#1a0a08';
      ctx.fillRect(deskX, floorY - 70, 250, 70);
      // デスクトップ
      const topGrad = ctx.createLinearGradient(deskX, floorY - 75, deskX + 260, floorY - 75);
      topGrad.addColorStop(0, '#2a1510');
      topGrad.addColorStop(0.5, '#3a2015');
      topGrad.addColorStop(1, '#2a1510');
      ctx.fillStyle = topGrad;
      ctx.fillRect(deskX - 5, floorY - 78, 260, 12);

      // デスク上のアイテム
      // ネームプレート
      ctx.fillStyle = '#b89a30';
      ctx.fillRect(deskX + 100, floorY - 88, 50, 12);
      ctx.fillStyle = '#1a0a05';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('CEO', deskX + 112, floorY - 79);

      // ペン立て
      ctx.fillStyle = '#252535';
      ctx.fillRect(deskX + 200, floorY - 95, 15, 20);
      ctx.strokeStyle = '#3a3a50';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(deskX + 205, floorY - 95);
      ctx.lineTo(deskX + 203, floorY - 108);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(deskX + 210, floorY - 95);
      ctx.lineTo(deskX + 212, floorY - 105);
      ctx.stroke();
    }

    // 大きな本棚（背後）
    const shelfX = left + 800;
    if (shelfX > -200 && shelfX < cw + 200) {
      ctx.fillStyle = '#1a0a08';
      ctx.fillRect(shelfX, ch * 0.25, 150, floorY - ch * 0.25);
      // 棚板
      ctx.fillStyle = '#2a1510';
      for (let sy = ch * 0.3; sy < floorY; sy += 50) {
        ctx.fillRect(shelfX, sy, 150, 5);
      }
      // 本（いくつか倒れている）
      const bookColors = ['#3a1020', '#20303a', '#302a10', '#1a2a30', '#2a1a30'];
      for (let sy = ch * 0.3; sy < floorY - 50; sy += 50) {
        for (let bx = 0; bx < 6; bx++) {
          ctx.fillStyle = bookColors[(bx + Math.floor(sy)) % bookColors.length];
          if (bx === 3 && sy < ch * 0.5) {
            // 倒れた本
            ctx.save();
            ctx.translate(shelfX + 15 + bx * 20, sy + 5);
            ctx.rotate(0.5);
            ctx.fillRect(0, 0, 12, 35);
            ctx.restore();
          } else {
            ctx.fillRect(shelfX + 10 + bx * 20, sy + 5, 12, 40);
          }
        }
      }
    }

    // レザーチェア
    const chairX = left + 480;
    if (chairX > -100 && chairX < cw + 100) {
      // 座面
      ctx.fillStyle = '#1a0808';
      ctx.beginPath();
      ctx.ellipse(chairX, floorY - 35, 30, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      // 背もたれ
      ctx.fillStyle = '#150505';
      ctx.beginPath();
      ctx.ellipse(chairX, floorY - 65, 28, 30, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // 脚
      ctx.strokeStyle = '#2a2a2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(chairX, floorY - 20);
      ctx.lineTo(chairX, floorY);
      ctx.moveTo(chairX - 20, floorY);
      ctx.lineTo(chairX + 20, floorY);
      ctx.stroke();
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

        // タイル模様
        ctx.strokeStyle = 'rgba(80, 80, 110, 0.15)';
        ctx.lineWidth = 1;
        for (let tx = left; tx < right; tx += 60) {
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
        break;
      }
      case 1: {
        // オープンフロア - カーペット風
        const carpetGrad = ctx.createLinearGradient(0, floorY, 0, ch);
        carpetGrad.addColorStop(0, '#2a2a3e');
        carpetGrad.addColorStop(1, '#1e1e30');
        ctx.fillStyle = carpetGrad;
        ctx.fillRect(left, floorY, width, floorH);

        // カーペットのテクスチャ（ドット）
        ctx.fillStyle = 'rgba(60, 60, 80, 0.2)';
        for (let dx = left; dx < right; dx += 12) {
          for (let dy = floorY + 5; dy < ch; dy += 12) {
            if ((dx + dy) % 24 === 0) {
              ctx.fillRect(dx, dy, 2, 2);
            }
          }
        }
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

        // 絨毯の模様
        ctx.strokeStyle = 'rgba(180, 100, 60, 0.08)';
        ctx.lineWidth = 1;
        // 中央のライン
        ctx.beginPath();
        ctx.moveTo(left, floorY + floorH / 2);
        ctx.lineTo(right, floorY + floorH / 2);
        ctx.stroke();
        // 端のボーダー
        ctx.strokeStyle = 'rgba(180, 150, 50, 0.1)';
        ctx.beginPath();
        ctx.moveTo(left, floorY + 3);
        ctx.lineTo(right, floorY + 3);
        ctx.stroke();
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

        // 床のパターン
        ctx.strokeStyle = 'rgba(150, 50, 50, 0.1)';
        ctx.lineWidth = 1;
        for (let tx = left; tx < right; tx += 80) {
          ctx.beginPath();
          ctx.moveTo(tx, floorY);
          ctx.lineTo(tx, ch);
          ctx.stroke();
        }

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
        break;
      }
    }

    // 床の境界線（段差感）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, floorY);
    ctx.lineTo(right, floorY);
    ctx.stroke();
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
        if (kbX > -50 && kbX < cw + 50) {
          ctx.save();
          ctx.translate(kbX, floorY - 3);
          ctx.rotate(0.6);
          ctx.fillStyle = '#2a2a3a';
          ctx.fillRect(0, 0, 45, 15);
          ctx.strokeStyle = 'rgba(80, 80, 110, 0.3)';
          ctx.lineWidth = 1;
          // キーの模様
          for (let ky = 2; ky < 13; ky += 4) {
            for (let kx = 2; kx < 43; kx += 5) {
              ctx.strokeRect(kx, ky, 3, 3);
            }
          }
          ctx.restore();
        }
        break;
      }
      case 2: {
        // 役員フロアの小物
        this._drawScatteredPapers(ctx, left + 100, floorY, 2);

        // ワインボトル（倒れている）
        const bottleX = left + 400;
        if (bottleX > -30 && bottleX < cw + 30) {
          ctx.save();
          ctx.translate(bottleX, floorY - 5);
          ctx.rotate(1.4);
          ctx.fillStyle = '#1a1530';
          // ボトル本体
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
          ctx.restore();
        }
        break;
      }
      case 3: {
        // ボスエリアの小物
        this._drawScatteredPapers(ctx, left + 300, floorY, 2);

        // 壊れた時計（床に）
        const clockX = left + 200;
        if (clockX > -30 && clockX < cw + 30) {
          ctx.strokeStyle = 'rgba(180, 150, 50, 0.3)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(clockX, floorY - 5, 15, 0, Math.PI * 2);
          ctx.stroke();
          // 針
          ctx.beginPath();
          ctx.moveTo(clockX, floorY - 5);
          ctx.lineTo(clockX + 8, floorY - 12);
          ctx.moveTo(clockX, floorY - 5);
          ctx.lineTo(clockX - 3, floorY + 5);
          ctx.stroke();
        }
        break;
      }
    }
  }

  // ===========================================================================
  // ヘルパー描画メソッド
  // ===========================================================================

  /**
   * 蛍光灯の描画
   */
  _drawFluorescentLight(ctx, x, y, width, flickerIndex) {
    const isOn = this._flickerStates[flickerIndex % this._flickerStates.length];

    // ライト本体
    ctx.fillStyle = isOn ? '#e8e8f0' : '#3a3a45';
    ctx.fillRect(x, y, width, 6);

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
    }

    // マウント
    ctx.fillStyle = '#4a4a55';
    ctx.fillRect(x - 2, y - 2, 8, 10);
    ctx.fillRect(x + width - 6, y - 2, 8, 10);
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

      ctx.fillStyle = `rgba(200, 195, 180, ${0.15 + (i * 0.05)})`;
      ctx.fillRect(0, 0, 20 + (i % 3) * 5, 14 + (i % 2) * 4);

      // テキストライン
      ctx.fillStyle = 'rgba(80, 80, 80, 0.1)';
      for (let line = 3; line < 14; line += 3) {
        ctx.fillRect(2, line, 12 + (i % 3) * 3, 1);
      }

      ctx.restore();
    }
  }

  /**
   * コーヒーの染み描画
   */
  _drawCoffeeStain(ctx, x, y) {
    if (x < -30 || x > 990) return;

    ctx.fillStyle = 'rgba(60, 30, 15, 0.15)';
    ctx.beginPath();
    ctx.ellipse(x, y, 18, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // リング
    ctx.strokeStyle = 'rgba(70, 35, 15, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x + 3, y - 2, 10, 8, -0.2, 0, Math.PI * 2);
    ctx.stroke();
  }
}
