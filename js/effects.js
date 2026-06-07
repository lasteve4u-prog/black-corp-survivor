// effects.js - パーティクルシステムと画面エフェクト

// ── パーティクル1個のデータ ──
class Particle {
  constructor(x, y, vx, vy, color, size, life, gravity = 0, friction = 1) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.gravity = gravity;
    this.friction = friction;
    this.alive = true;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
      return;
    }
    this.vy += this.gravity * dt;
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    const currentSize = this.size * (0.5 + 0.5 * alpha);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(
      Math.floor(this.x - currentSize / 2),
      Math.floor(this.y - currentSize / 2),
      Math.ceil(currentSize),
      Math.ceil(currentSize)
    );
    ctx.globalAlpha = 1;
  }
}

// ══════════════════════════════════════════════════════════════
// パーティクルシステム
// ══════════════════════════════════════════════════════════════
export class ParticleSystem {
  constructor() {
    /** @type {Particle[]} */
    this.particles = [];
  }

  /**
   * ヒット時のパーティクル
   */
  addHitEffect(x, y, color = '#FFAA00') {
    const count = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 100 + Math.random() * 200;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 3 + Math.random() * 4;
      const life = 0.2 + Math.random() * 0.3;
      this.particles.push(new Particle(x, y, vx, vy, color, size, life, 0, 0.95));
    }
    // スパーク（小さな白い粒）
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 150;
      this.particles.push(
        new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, '#FFFFFF', 2, 0.15)
      );
    }
  }

  /**
   * ダッシュの残像
   */
  addDashEffect(x, y) {
    const colors = ['#88CCFF', '#AADDFF', '#66AADD'];
    for (let i = 0; i < 5; i++) {
      const col = colors[Math.floor(Math.random() * colors.length)];
      const vx = -30 - Math.random() * 50;
      const vy = (Math.random() - 0.5) * 40;
      const size = 4 + Math.random() * 6;
      const life = 0.15 + Math.random() * 0.2;
      this.particles.push(new Particle(x, y + Math.random() * 40, vx, vy, col, size, life, 0, 0.9));
    }
  }

  /**
   * 敵撃破時の派手なパーティクル
   */
  addDeathEffect(x, y) {
    const colors = ['#FF4444', '#FF8800', '#FFCC00', '#FFFFFF', '#FF6600'];
    const count = 25 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = 80 + Math.random() * 300;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const col = colors[Math.floor(Math.random() * colors.length)];
      const size = 3 + Math.random() * 8;
      const life = 0.4 + Math.random() * 0.6;
      this.particles.push(new Particle(x, y, vx, vy, col, size, life, 200, 0.97));
    }
    // 大きなフラッシュ粒
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 80;
      this.particles.push(
        new Particle(
          x, y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          '#FFFFFF',
          8 + Math.random() * 6,
          0.3 + Math.random() * 0.2,
          0,
          0.92
        )
      );
    }
  }

  /**
   * アイテム取得時のキラキラ
   */
  addItemEffect(x, y) {
    const colors = ['#FFD700', '#FFEA00', '#FFF8E1', '#FFE082', '#FFFFFF'];
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 60 + Math.random() * 100;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 30;
      const col = colors[Math.floor(Math.random() * colors.length)];
      const size = 2 + Math.random() * 4;
      const life = 0.3 + Math.random() * 0.5;
      this.particles.push(new Particle(x, y, vx, vy, col, size, life, -50, 0.96));
    }
    // 星型パーティクル（十字形）
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i;
      const speed = 40 + Math.random() * 30;
      this.particles.push(
        new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, '#FFD700', 5, 0.5, -20, 0.98)
      );
    }
  }

  /**
   * フレーム更新
   */
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (!this.particles[i].alive) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * 描画
   */
  draw(ctx) {
    for (const p of this.particles) {
      p.draw(ctx);
    }
  }
}

// ══════════════════════════════════════════════════════════════
// 画面シェイク
// ══════════════════════════════════════════════════════════════
export class ScreenShake {
  constructor() {
    this._intensity = 0;
    this._duration = 0;
    this._elapsed = 0;
    this._offsetX = 0;
    this._offsetY = 0;
    this._active = false;
  }

  /**
   * 揺れ開始
   * @param {number} intensity - 揺れの強さ（ピクセル）
   * @param {number} duration  - 揺れの持続時間（秒）
   */
  trigger(intensity, duration) {
    this._intensity = intensity;
    this._duration = duration;
    this._elapsed = 0;
    this._active = true;
  }

  /**
   * フレーム更新
   */
  update(dt) {
    if (!this._active) return;

    this._elapsed += dt;
    if (this._elapsed >= this._duration) {
      this._active = false;
      this._offsetX = 0;
      this._offsetY = 0;
      return;
    }

    const progress = this._elapsed / this._duration;
    const decay = 1 - progress; // 徐々に減衰
    const currentIntensity = this._intensity * decay;

    this._offsetX = (Math.random() * 2 - 1) * currentIntensity;
    this._offsetY = (Math.random() * 2 - 1) * currentIntensity;
  }

  get offsetX() {
    return Math.floor(this._offsetX);
  }

  get offsetY() {
    return Math.floor(this._offsetY);
  }

  get isActive() {
    return this._active;
  }
}

// ══════════════════════════════════════════════════════════════
// フラッシュエフェクト
// ══════════════════════════════════════════════════════════════
export class FlashEffect {
  constructor() {
    this._color = 'rgba(255,255,255,0)';
    this._duration = 0;
    this._elapsed = 0;
    this._active = false;
    this._r = 255;
    this._g = 255;
    this._b = 255;
  }

  /**
   * 画面フラッシュ開始
   * @param {string} color - CSSカラー文字列（例: '#FF0000', 'rgb(255,0,0)'）
   * @param {number} duration - 持続時間（秒）
   */
  trigger(color, duration) {
    // カラーをパース（簡易: hex or named colors）
    this._parseColor(color);
    this._duration = duration;
    this._elapsed = 0;
    this._active = true;
  }

  _parseColor(color) {
    // #RRGGBB の場合
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      this._r = parseInt(hex.substring(0, 2), 16);
      this._g = parseInt(hex.substring(2, 4), 16);
      this._b = parseInt(hex.substring(4, 6), 16);
    } else if (color === 'white') {
      this._r = 255; this._g = 255; this._b = 255;
    } else if (color === 'red') {
      this._r = 255; this._g = 0; this._b = 0;
    } else if (color === 'yellow') {
      this._r = 255; this._g = 255; this._b = 0;
    } else if (color === 'gold') {
      this._r = 255; this._g = 215; this._b = 0;
    } else if (color === 'purple') {
      this._r = 150; this._g = 0; this._b = 255;
    } else {
      // デフォルト: 白
      this._r = 255; this._g = 255; this._b = 255;
    }
  }

  update(dt) {
    if (!this._active) return;
    this._elapsed += dt;
    if (this._elapsed >= this._duration) {
      this._active = false;
    }
  }

  /**
   * 描画（キャンバス全体にカラーオーバーレイ）
   */
  draw(ctx, canvasWidth, canvasHeight) {
    if (!this._active) return;

    const progress = this._elapsed / this._duration;
    const alpha = Math.max(0, 0.6 * (1 - progress)); // 最大 0.6 → 0 に減衰

    ctx.fillStyle = `rgba(${this._r}, ${this._g}, ${this._b}, ${alpha})`;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }
}
