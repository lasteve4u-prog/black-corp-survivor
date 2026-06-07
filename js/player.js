// player.js - 主人公「佐藤ヒカリ」クラス
import { drawPlayer, drawProjectile } from './sprites.js';

export class Player {
  constructor(x, y) {
    // 位置・サイズ
    this.x = x;
    this.y = y;
    this.width = 48;
    this.height = 64;

    // ステータス
    this.hp = 100;
    this.maxHp = 100;
    this.score = 0;
    this.combo = 0;
    this.comboMultiplier = 1.0; // コンボによるスコア倍率
    this.damageThisRound = 0;   // このラウンドで受けたダメージ（ボーナス計算用）

    // 状態
    this.state = 'idle';       // 'idle' | 'walk' | 'attack' | 'special' | 'hurt' | 'dash'
    this.facingRight = true;
    this.isAlive = true;

    // 移動
    this.speed = 200;          // 通常移動速度 px/s
    this.dashSpeed = 350;      // ダッシュ速度 px/s

    // アニメーション
    this.frameCounter = 0;
    this.animFrame = 0;

    // 攻撃
    this.attackCombo = 0;        // 0: なし, 1: 1段目, 2: 2段目, 3: 3段目
    this.attackTimer = 0;        // 攻撃中の経過時間
    this.attackDuration = 0.3;   // 各攻撃の持続時間
    this.attackBufferTime = 0;   // 次の攻撃入力バッファ
    this.canChainAttack = false; // コンボ連鎖可能フラグ
    this.hasHitThisAttack = false; // この攻撃でヒット済みか（多段ヒット防止用）

    // 特殊攻撃「辞表スラッシュ」
    this.specialTimer = 0;       // 特殊攻撃中の経過時間
    this.specialCharge = 0.5;    // 溜め時間
    this.specialCooldown = 0;    // クールダウン残り
    this.specialCooldownMax = 3; // クールダウン秒数

    // ダッシュ
    this.isDashing = false;
    this.dashInvincibleTime = 0.2; // ダッシュ中の無敵時間
    this.dashTimer = 0;

    // 無敵
    this.invincibleTimer = 0;    // 被ダメージ後の無敵時間
    this.invincibleDuration = 0.8;

    // 飛び道具
    this.projectiles = [];

    // コンボ持続
    this.comboTimer = 0;
    this.comboTimeout = 2.0;     // コンボリセットまでの秒数

    // ダメージ
    this.attackDamages = [15, 20, 10]; // 1段、2段、3段のダメージ

    // アップグレード倍率
    this.attackMultiplier = 1.0;
    this.speedMultiplier = 1.0;
  }

  update(dt, input, enemies, effects, audio) {
    if (!this.isAlive) return;

    // タイマー更新
    this._updateTimers(dt);

    // アニメーションフレーム更新
    this.frameCounter++;
    if (this.frameCounter % 6 === 0) {
      this.animFrame++;
    }

    // 状態ごとの処理
    switch (this.state) {
      case 'hurt':
        this._updateHurt(dt);
        break;
      case 'attack':
        this._updateAttack(dt, input, enemies, effects, audio);
        break;
      case 'special':
        this._updateSpecial(dt, enemies, effects, audio);
        break;
      default:
        this._updateNormal(dt, input, effects, audio);
        break;
    }

    // 飛び道具の更新
    this._updateProjectiles(dt, enemies, effects, audio);

    // コンボタイマー
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }

    // Y移動制限（X はmain.js の clampPlayerToArea で管理）
    this.y = Math.max(300, Math.min(480, this.y));
  }

  _updateTimers(dt) {
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    if (this.specialCooldown > 0) this.specialCooldown -= dt;
    if (this.dashTimer > 0) this.dashTimer -= dt;
  }

  _updateHurt(dt) {
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      this.state = 'idle';
    }
  }

  _updateNormal(dt, input, effects, audio) {
    // 特殊攻撃の入力チェック（Xキー）
    if (input.special && this.specialCooldown <= 0) {
      this.state = 'special';
      this.specialTimer = 0;
      this.hasHitThisAttack = false;
      return;
    }

    // 攻撃の入力チェック（Zキー）
    if (input.attack) {
      this._startAttack(1);
      return;
    }

    // 移動処理
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;

    // ダッシュ判定
    this.isDashing = input.dash && (dx !== 0 || dy !== 0);
    const currentSpeed = (this.isDashing ? this.dashSpeed : this.speed) * this.speedMultiplier;

    if (this.isDashing) {
      this.dashTimer = this.dashInvincibleTime;
      this.state = 'dash';
    }

    if (dx !== 0 || dy !== 0) {
      // 斜め移動の正規化
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;

      this.x += dx * currentSpeed * dt;
      this.y += dy * currentSpeed * dt;

      if (dx !== 0) this.facingRight = dx > 0;

      if (!this.isDashing) {
        this.state = 'walk';
      }
    } else {
      if (this.state !== 'dash' || this.dashTimer <= 0) {
        this.state = 'idle';
      }
    }

    // ダッシュ状態の解除
    if (this.state === 'dash' && this.dashTimer <= 0) {
      this.state = (dx !== 0 || dy !== 0) ? 'walk' : 'idle';
    }
  }

  _startAttack(comboStep) {
    this.state = 'attack';
    this.attackCombo = comboStep;
    this.attackTimer = this.attackDuration;
    this.canChainAttack = false;
    this.hasHitThisAttack = false;
  }

  _updateAttack(dt, input, enemies, effects, audio) {
    this.attackTimer -= dt;

    // 攻撃判定（攻撃中前半でヒットチェック）
    if (!this.hasHitThisAttack && this.attackTimer > this.attackDuration * 0.3) {
      this._checkAttackHit(enemies, effects, audio);
    }

    // コンボ連鎖ウィンドウ（攻撃後半で次の入力を受け付け）
    if (this.attackTimer <= this.attackDuration * 0.4) {
      this.canChainAttack = true;
    }

    // 3段目攻撃の飛び道具発射
    if (this.attackCombo === 3 && !this.hasHitThisAttack) {
      this._fireProjectile();
      this.hasHitThisAttack = true; // 飛び道具は1回だけ発射
    }

    // 攻撃入力バッファ
    if (input.attack && this.canChainAttack && this.attackCombo < 3) {
      this._startAttack(this.attackCombo + 1);
      return;
    }

    // 攻撃終了
    if (this.attackTimer <= 0) {
      this.attackCombo = 0;
      this.state = 'idle';
    }
  }

  _checkAttackHit(enemies, effects, audio) {
    if (this.attackCombo === 3) return; // 3段目は飛び道具なので近接判定なし

    const hitbox = this.getAttackHitbox();
    if (!hitbox) return;

    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;
      const eh = enemy.getHitbox();
      if (this._aabbOverlap(hitbox, eh)) {
        const damage = this.attackDamages[this.attackCombo - 1] * this.attackMultiplier;
        enemy.takeDamage(damage, effects, audio);
        this.hasHitThisAttack = true;

        // コンボ加算
        this.combo++;
        this.comboTimer = this.comboTimeout;

        // スコア加算（コンボボーナス：10コンボごとに2倍へ）
        if (!enemy.isAlive) {
          this.comboMultiplier = 1 + Math.floor(this.combo / 10) * 1.0;
          this.score += Math.floor(enemy.scoreValue * this.comboMultiplier);
        }

        // ヒットエフェクト
        if (effects && effects.emit) {
          effects.emit(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 'hit', 5);
        }

        if (audio && audio.play) {
          audio.play('hit');
        }
        break; // 1回の攻撃で1体のみヒット
      }
    }
  }

  _fireProjectile() {
    const projX = this.facingRight ? this.x + this.width : this.x - 16;
    const projY = this.y + this.height / 2 - 8;
    const vx = this.facingRight ? 400 : -400;

    this.projectiles.push({
      x: projX,
      y: projY,
      vx: vx,
      vy: 0,
      width: 24,
      height: 16,
      damage: this.attackDamages[2] * this.attackMultiplier,
      active: true,
      frame: 0,
      frameCounter: 0,
      type: 'document'
    });
  }

  _updateProjectiles(dt, enemies, effects, audio) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) {
        this.projectiles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // アニメーション
      p.frameCounter++;
      if (p.frameCounter % 6 === 0) {
        p.frame++;
      }

      // 画面外チェック
      if (p.x < -50 || p.x > 1010) {
        p.active = false;
        continue;
      }

      // 敵との衝突判定
      for (const enemy of enemies) {
        if (!enemy.isAlive) continue;
        const eh = enemy.getHitbox();
        const ph = { x: p.x, y: p.y, w: p.width, h: p.height };
        if (this._aabbOverlap(ph, eh)) {
          enemy.takeDamage(p.damage, effects, audio);
          p.active = false;

          // コンボ加算
          this.combo++;
          this.comboTimer = this.comboTimeout;

          if (!enemy.isAlive) {
            this.comboMultiplier = 1 + Math.floor(this.combo / 10) * 1.0;
            this.score += Math.floor(enemy.scoreValue * this.comboMultiplier);
          }

          if (effects && effects.emit) {
            effects.emit(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 'hit', 3);
          }
          if (audio && audio.play) {
            audio.play('hit');
          }
          break;
        }
      }
    }
  }

  _updateSpecial(dt, enemies, effects, audio) {
    this.specialTimer += dt;

    // 溜め中
    if (this.specialTimer < this.specialCharge) {
      return;
    }

    // 溜め完了 → 攻撃判定
    if (!this.hasHitThisAttack) {
      this.hasHitThisAttack = true;
      const hitbox = this._getSpecialHitbox();

      for (const enemy of enemies) {
        if (!enemy.isAlive) continue;
        const eh = enemy.getHitbox();
        if (this._aabbOverlap(hitbox, eh)) {
          enemy.takeDamage(40 * this.attackMultiplier, effects, audio);

          this.combo++;
          this.comboTimer = this.comboTimeout;

          if (!enemy.isAlive) {
            this.comboMultiplier = 1 + Math.floor(this.combo / 10) * 1.0;
            this.score += Math.floor(enemy.scoreValue * this.comboMultiplier);
          }
        }
      }

      // スペシャルエフェクト
      if (effects && effects.emit) {
        const ex = this.facingRight
          ? this.x + this.width + 60
          : this.x - 60;
        effects.emit(ex, this.y + this.height / 2, 'special', 15);
      }
      if (audio && audio.play) {
        audio.play('special');
      }
    }

    // 攻撃後0.3秒で復帰
    if (this.specialTimer >= this.specialCharge + 0.3) {
      this.state = 'idle';
      this.specialCooldown = this.specialCooldownMax;
      this.specialTimer = 0;
    }
  }

  _getSpecialHitbox() {
    const rangeW = 120;
    const rangeH = 80;
    const hx = this.facingRight
      ? this.x + this.width
      : this.x - rangeW;
    return {
      x: hx,
      y: this.y + this.height / 2 - rangeH / 2,
      w: rangeW,
      h: rangeH
    };
  }

  draw(ctx) {
    if (!this.isAlive) return;

    // 無敵中の点滅
    if (this.invincibleTimer > 0) {
      if (Math.floor(this.invincibleTimer * 10) % 2 === 0) return;
    }

    // プレイヤー描画
    drawPlayer(ctx, this.x, this.y, this.state, this.animFrame, this.facingRight);

    // 飛び道具描画
    for (const p of this.projectiles) {
      if (p.active) {
        drawProjectile(ctx, p.x, p.y, p.type, p.frame);
      }
    }
  }

  takeDamage(amount, effects, audio) {
    if (!this.isAlive) return;
    if (this.invincibleTimer > 0) return;
    if (this.dashTimer > 0) return; // ダッシュ中は無敵

    this.hp -= amount;
    this.state = 'hurt';
    this.attackTimer = 0.3; // hurtの持続時間
    this.invincibleTimer = this.invincibleDuration;

    // コンボリセット
    this.combo = 0;
    this.comboTimer = 0;

    // 攻撃中断
    this.attackCombo = 0;
    this.specialTimer = 0;

    if (effects && effects.emit) {
      effects.emit(this.x + this.width / 2, this.y + this.height / 2, 'damage', 8);
    }
    if (audio && audio.play) {
      audio.play('playerHurt');
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
    }
  }

  heal(amount) {
    if (!this.isAlive) return;
    this.hp = Math.min(this.hp + amount, this.maxHp);
  }

  getHitbox() {
    return {
      x: this.x,
      y: this.y,
      w: this.width,
      h: this.height
    };
  }

  getAttackHitbox() {
    if (this.state !== 'attack' || this.attackCombo === 0) return null;
    if (this.attackCombo === 3) return null; // 3段目は飛び道具

    // 1段目: 前方パンチ
    // 2段目: 振り下ろし（やや広い）
    const ranges = [
      { w: 50, h: 40 },  // 1段目
      { w: 55, h: 50 },  // 2段目
    ];
    const range = ranges[this.attackCombo - 1];

    const hx = this.facingRight
      ? this.x + this.width
      : this.x - range.w;

    return {
      x: hx,
      y: this.y + this.height / 2 - range.h / 2,
      w: range.w,
      h: range.h
    };
  }

  _aabbOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }
}
