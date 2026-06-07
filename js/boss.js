// boss.js - CEOゾンビボスクラス
import { drawCEOBoss, drawProjectile } from './sprites.js';
import { ZombieEmployee } from './enemy.js';

export class CEOBoss {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 64;
    this.height = 80;

    this.hp = 350;
    this.maxHp = 350;

    this.phase = 1;             // 1 | 2 | 3
    this.state = 'idle';        // 'idle' | 'throw' | 'summon' | 'shockwave' | 'hurt' | 'die'
    this.facingRight = false;
    this.isAlive = true;
    this.isDefeated = false;    // 死亡アニメーション完了
    this.scoreValue = 0;        // スコアはmain.jsでBOSS_SCOREとして加算
    this.isIntro = true;        // 登場演出中

    // 飛び道具（札束）
    this.projectiles = [];

    // 召喚した部下
    this.summonedEnemies = [];

    // アニメーション
    this.frameCounter = 0;
    this.animFrame = 0;

    // 登場演出（右からスライドイン）
    this.introTimer = 0;
    this.introDuration = 3.5;
    this.introStartX = 1100;    // 画面外右から
    this.introTargetX = x;
    this.introTargetY = y;

    // 移動速度（フェーズで変化）
    this.speed = 50;

    // 攻撃タイマー
    this.throwCooldown = 0;
    this.throwCooldownMax = 1.2;  // 札束投げの頻度UP
    this.throwDuration = 0.4;
    this.throwTimer = 0;

    // 近接攻撃
    this.meleeCooldown = 0;
    this.meleeCooldownMax = 1.0;  // 近接攻撃も頻度UP
    this.meleeDamage = 15;

    // 突進（フェーズ2+）
    this.chargeCooldown = 0;
    this.chargeCooldownMax = 3.5;  // 突進の頻度UP
    this.chargeTimer = 0;
    this.chargeDuration = 0.8;
    this.chargeSpeed = 280;        // 突進速度UP
    this.chargeDirectionX = 0;
    this.chargeDirectionY = 0;
    this.isCharging = false;

    // 召喚（フェーズ2+）
    this.summonCooldown = 0;
    this.summonCooldownMax = 8.0;  // 召喚の頻度UP
    this.summonTimer = 0;
    this.summonDuration = 0.6;

    // 衝撃波（フェーズ3）
    this.shockwaveCooldown = 0;
    this.shockwaveCooldownMax = 3.0;  // 波動の頻度UP
    this.shockwaveTimer = 0;
    this.shockwaveDuration = 0.5;
    this.shockwaveActive = false;

    // ダメージ
    this.hurtTimer = 0;
    this.hurtDuration = 0.3;

    // 死亡
    this.deathTimer = 0;
    this.deathDuration = 2.0;
    this.deathExplosionInterval = 0.3;
    this.deathExplosionTimer = 0;

    // 攻撃判定フラグ
    this.hasHitMelee = false;
    this.hasHitCharge = false;

    // クッパ風移動
    this.groundY = y;           // 着地Y座標
    this.vy = 0;                // 垂直速度
    this.isJumping = false;
    this.jumpCooldown = 0;
    this.jumpCooldownMax = 3.0; // ジャンプ間隔
    this.walkDir = -1;          // -1=左, 1=右
    this.walkSpeed = 60;        // 歩行速度
    this.turnX = 0;             // 折り返しX
  }

  update(dt, playerX, playerY, effects, audio) {
    if (this.isDefeated) return;

    // アニメーション
    this.frameCounter++;
    if (this.frameCounter % 6 === 0) {
      this.animFrame++;
    }

    // 登場演出
    if (this.isIntro) {
      this._updateIntro(dt);
      return;
    }

    // 死亡演出
    if (!this.isAlive) {
      this._updateDeath(dt, effects, audio);
      return;
    }

    // フェーズ更新
    this._updatePhase();

    // クールダウン更新
    this._updateCooldowns(dt);

    // 飛び道具更新
    this._updateProjectiles(dt);

    // 召喚した部下の更新
    this._updateSummonedEnemies(dt, playerX, playerY, effects, audio);

    // 状態ごとの更新
    switch (this.state) {
      case 'hurt':
        this._updateHurt(dt);
        break;
      case 'throw':
        this._updateThrow(dt);
        break;
      case 'summon':
        this._updateSummon(dt, effects, audio);
        break;
      case 'shockwave':
        this._updateShockwave(dt, effects, audio);
        break;
      default:
        this._updateAI(dt, playerX, playerY, effects, audio);
        break;
    }

    // プレイヤーより右に留まる（カメラ外に出ないよう）＋右端クランプ
    if (this.isAlive) this.x = Math.max(playerX + 40, Math.min(960 - this.width - 20, this.x));
  }

  _updatePhase() {
    if (this.hp > this.maxHp * 0.66) {
      this.phase = 1;
      this.walkSpeed = 60;
      this.jumpCooldownMax = 3.5;
    } else if (this.hp > this.maxHp * 0.33) {
      this.phase = 2;
      this.walkSpeed = 90;
      this.jumpCooldownMax = 2.5;
    } else {
      this.phase = 3;
      this.walkSpeed = 130;
      this.jumpCooldownMax = 1.8;
    }
  }

  _updateCooldowns(dt) {
    if (this.throwCooldown > 0) this.throwCooldown -= dt;
    if (this.meleeCooldown > 0) this.meleeCooldown -= dt;
    if (this.chargeCooldown > 0) this.chargeCooldown -= dt;
    if (this.summonCooldown > 0) this.summonCooldown -= dt;
    if (this.shockwaveCooldown > 0) this.shockwaveCooldown -= dt;
  }

  _updateIntro(dt) {
    this.introTimer += dt;
    const progress = Math.min(this.introTimer / this.introDuration, 1);

    // ゆっくり減速しながら右からスライドイン（easeOutQuad）
    const eased = 1 - Math.pow(1 - progress, 2);
    this.x = this.introStartX + (this.introTargetX - this.introStartX) * eased;
    this.y = this.introTargetY;
    this.facingRight = false;

    if (this.introTimer >= this.introDuration) {
      this.isIntro = false;
      this.x = this.introTargetX;
    }
  }

  _updateAI(dt, playerX, playerY, effects, audio) {
    this.facingRight = this.walkDir > 0;

    // ── ジャンプ物理 ──
    const gravity = 900;
    if (this.isJumping) {
      this.vy += gravity * dt;
      this.y += this.vy * dt;
      if (this.y >= this.groundY) {
        this.y = this.groundY;
        this.vy = 0;
        this.isJumping = false;
        // 着地衝撃波（フェーズ2以上）
        if (this.phase >= 2 && this.shockwaveCooldown <= 0) {
          this.shockwaveActive = true;
          this.shockwaveTimer = this.shockwaveDuration;
          this.state = 'shockwave';
          this.shockwaveCooldown = this.shockwaveCooldownMax;
          return;
        }
      }
    }

    // ── ジャンプタイマー更新 ──
    if (this.jumpCooldown > 0) this.jumpCooldown -= dt;

    // ── プレイヤーとの距離 ──
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // ── 札束投げ優先（遠隔攻撃を重視）──
    if (this.throwCooldown <= 0) {
      this.state = 'throw';
      this.throwTimer = this.throwDuration;
      this.throwCooldown = this.throwCooldownMax;
      this._fireMoneyProjectiles(playerX, playerY);
      if (audio && audio.play) audio.play('bossThrow');
      return;
    }

    // ── フェーズ2+: 突進攻撃（距離が遠い時）──
    if (this.phase >= 2 && this.chargeCooldown <= 0 && dist > 150 && !this.isJumping) {
      this.isCharging = true;
      this.chargeTimer = this.chargeDuration;
      this.chargeDirectionX = dx > 0 ? 1 : -1;
      this.chargeDirectionY = dy / (Math.abs(dx) + 0.001);
      this.chargeDirectionY = Math.max(-1, Math.min(1, this.chargeDirectionY));
      this.chargeCooldown = this.chargeCooldownMax;
      this.hasHitCharge = false;
      return;
    }

    // ── フェーズ2+: 部下召喚 ──
    if (this.phase >= 2 && this.summonCooldown <= 0 && !this.isJumping) {
      this.state = 'summon';
      this.summonTimer = this.summonDuration;
      this.summonCooldown = this.summonCooldownMax;
      return;
    }

    // ── 近接防御壁：近づかれたら衝撃波で反撃 ──
    if (dist < 120 && this.shockwaveCooldown <= 0) {
      this.state = 'shockwave';
      this.shockwaveTimer = this.shockwaveDuration;
      this.shockwaveActive = true;
      this.shockwaveCooldown = this.shockwaveCooldownMax;
      return;
    }

    // ── フェーズ3: 着地衝撃波 ──
    if (this.phase >= 3 && this.shockwaveCooldown <= 0 && !this.isJumping && Math.random() < 0.3) {
      const jumpPower = -520;
      this.vy = jumpPower;
      this.isJumping = true;
      return;
    }

    // ── X方向の歩行（プレイヤーから距離を保つ）──
    const preferredDist = 200; // 保ちたい距離
    const leftLimit  = playerX + 50;
    const rightLimit = Math.min(playerX + 500, 940 - this.width);

    // 距離が近すぎたら離れる、遠すぎたら近づく
    if (dist < preferredDist && dx > 0) {
      this.walkDir = 1;  // 右へ
    } else if (dist < preferredDist && dx < 0) {
      this.walkDir = -1; // 左へ
    } else if (dist > preferredDist + 100 && dx > 0) {
      this.walkDir = -1; // 左へ（近づく）
    } else if (dist > preferredDist + 100 && dx < 0) {
      this.walkDir = 1;  // 右へ（近づく）
    }

    this.x += this.walkDir * this.walkSpeed * dt;

    // 左端に達したら右へ折り返す
    if (this.x <= leftLimit) {
      this.x = leftLimit;
      this.walkDir = 1;
    }
    // 右端に達したら左へ折り返す
    if (this.x >= rightLimit) {
      this.x = rightLimit;
      this.walkDir = -1;
    }

    // ── ジャンプ発動（クールダウン明け・地面にいるとき・ランダム）──
    if (!this.isJumping && this.jumpCooldown <= 0 && Math.random() < 0.4) {
      const jumpPower = this.phase >= 3 ? -540 : -450;
      this.vy = jumpPower;
      this.isJumping = true;
      this.jumpCooldown = this.jumpCooldownMax;
    }

    // ── 近接攻撃（距離が近い時のみ）──
    if (dist < 100 && this.meleeCooldown <= 0) {
      this.hasHitMelee = true;
      this.meleeCooldown = this.meleeCooldownMax;
    }

    this.y = Math.max(this.groundY - 200, Math.min(this.groundY, this.y));
    this.x = Math.max(playerX + 40, Math.min(940 - this.width, this.x));

    this.state = 'idle';
  }

  _fireMoneyProjectiles(playerX, playerY) {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const projSpeed = 220;

    // 基本角度：プレイヤーの方向
    const baseAngle = Math.atan2(playerY - cy, playerX - cx);

    // 方向数と間隔（フェーズで増加）
    let directions, spread;
    if (this.phase >= 3) {
      directions = 7;             // フェーズ3: 7方向
      spread = Math.PI / 8;       // 22.5度間隔
    } else if (this.phase >= 2) {
      directions = 5;             // フェーズ2: 5方向
      spread = Math.PI / 6;       // 30度間隔
    } else {
      directions = 3;             // フェーズ1: 3方向
      spread = Math.PI / 6;       // 30度間隔
    }

    for (let i = 0; i < directions; i++) {
      const offset = (i - Math.floor(directions / 2)) * spread;
      const angle = baseAngle + offset;

      this.projectiles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * projSpeed,
        vy: Math.sin(angle) * projSpeed,
        width: 20,
        height: 16,
        damage: 10,
        active: true,
        frame: 0,
        frameCounter: 0,
        type: 'money'
      });
    }
  }

  _updateThrow(dt) {
    this.throwTimer -= dt;
    if (this.throwTimer <= 0) {
      this.state = 'idle';
    }
  }

  _updateSummon(dt, effects, audio) {
    this.summonTimer -= dt;
    if (this.summonTimer <= 0) {
      // ZombieEmployee x2 をスポーン
      const spawnX1 = this.x + (this.facingRight ? -100 : 100);
      const spawnX2 = this.x + (this.facingRight ? -60 : 60);
      const spawnY1 = this.y + 20;
      const spawnY2 = this.y - 20;

      const e1 = new ZombieEmployee(
        Math.max(50, Math.min(900, spawnX1)),
        Math.max(320, Math.min(460, spawnY1))
      );
      const e2 = new ZombieEmployee(
        Math.max(50, Math.min(900, spawnX2)),
        Math.max(320, Math.min(460, spawnY2))
      );

      this.summonedEnemies.push(e1, e2);

      if (effects && effects.emit) {
        effects.emit(e1.x + e1.width / 2, e1.y + e1.height / 2, 'summon', 8);
        effects.emit(e2.x + e2.width / 2, e2.y + e2.height / 2, 'summon', 8);
      }
      if (audio && audio.play) {
        audio.play('bossSummon');
      }

      this.state = 'idle';
    }
  }

  _updateShockwave(dt, effects, audio) {
    this.shockwaveTimer -= dt;

    if (this.shockwaveActive && this.shockwaveTimer <= this.shockwaveDuration * 0.5) {
      // 衝撃波発動エフェクト
      if (effects && effects.emit) {
        effects.emit(this.x + this.width / 2, this.y + this.height, 'shockwave', 20);
      }
      if (effects && effects.screenFlash) {
        effects.screenFlash('rgba(255, 0, 0, 0.3)');
      }
      if (audio && audio.play) {
        audio.play('bossShockwave');
      }
      this.shockwaveActive = false; // エフェクトは1回だけ
    }

    if (this.shockwaveTimer <= 0) {
      this.state = 'idle';
    }
  }

  _updateHurt(dt) {
    this.hurtTimer -= dt;
    if (this.hurtTimer <= 0) {
      this.state = 'idle';
    }
  }

  _updateDeath(dt, effects, audio) {
    this.state = 'die';
    this.deathTimer += dt;

    // 断続的な爆発エフェクト
    this.deathExplosionTimer += dt;
    if (this.deathExplosionTimer >= this.deathExplosionInterval) {
      this.deathExplosionTimer = 0;
      if (effects && effects.emit) {
        const ex = this.x + Math.random() * this.width;
        const ey = this.y + Math.random() * this.height;
        effects.emit(ex, ey, 'explosion', 10);
      }
      if (audio && audio.play) {
        audio.play('explosion');
      }
    }

    if (this.deathTimer >= this.deathDuration) {
      this.isDefeated = true;
    }
  }

  _updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) {
        this.projectiles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      p.frameCounter++;
      if (p.frameCounter % 6 === 0) {
        p.frame++;
      }

      // 画面外で削除
      if (p.x < -50 || p.x > 1010 || p.y < -50 || p.y > 590) {
        p.active = false;
      }
    }
  }

  _updateSummonedEnemies(dt, playerX, playerY, effects, audio) {
    for (let i = this.summonedEnemies.length - 1; i >= 0; i--) {
      const enemy = this.summonedEnemies[i];
      enemy.update(dt, playerX, playerY, effects, audio);

      // 完全に死亡したら削除
      if (enemy.isDead) {
        this.summonedEnemies.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    if (this.isDefeated) return;

    // ボス本体描画
    drawCEOBoss(ctx, this.x, this.y, this.state, this.animFrame, this.facingRight, this.phase);

    // 飛び道具描画
    for (const p of this.projectiles) {
      if (p.active) {
        drawProjectile(ctx, p.x, p.y, p.type, p.frame);
      }
    }

    // 召喚した部下の描画
    for (const enemy of this.summonedEnemies) {
      enemy.draw(ctx);
    }

    // 衝撃波の視覚表示
    if (this.state === 'shockwave' && this.shockwaveTimer > 0) {
      this._drawShockwaveEffect(ctx);
    }
  }

  _drawShockwaveEffect(ctx) {
    const progress = 1 - (this.shockwaveTimer / this.shockwaveDuration);
    const alpha = Math.max(0, 1 - progress);
    const waveWidth = 400 * progress;

    ctx.save();
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = '#ff4444';

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height;

    ctx.beginPath();
    ctx.ellipse(cx, cy, waveWidth / 2, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  takeDamage(amount, effects, audio) {
    if (!this.isAlive) return;
    if (this.isIntro) return; // 登場演出中は無敵

    this.hp -= amount;

    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      this.deathTimer = 0;
      this.deathExplosionTimer = 0;
      this.state = 'die';

      // 飛び道具をすべて無効化
      for (const p of this.projectiles) {
        p.active = false;
      }

      if (audio && audio.play) {
        audio.play('bossDefeat');
      }
    } else {
      // hurt状態に遷移（ただし突進中は中断しない）
      if (!this.isCharging) {
        this.state = 'hurt';
        this.hurtTimer = this.hurtDuration;
      }

      // ダメージ時にジャンプして距離を確保
      if (!this.isJumping) {
        this.vy = -500;
        this.isJumping = true;
        this.jumpCooldown = 0;
      }

      if (effects && effects.emit) {
        effects.emit(this.x + this.width / 2, this.y + this.height / 2, 'hit', 8);
      }
      if (audio && audio.play) {
        audio.play('bossHurt');
      }
    }
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
    // 近接攻撃判定
    if (this.state === 'idle' && this.hasHitMelee) {
      this.hasHitMelee = false;
      const aw = 60;
      const ah = 60;
      const hx = this.facingRight
        ? this.x + this.width
        : this.x - aw;
      return {
        x: hx,
        y: this.y + this.height / 2 - ah / 2,
        w: aw,
        h: ah,
        damage: this.meleeDamage
      };
    }

    // 突進中の攻撃判定
    if (this.isCharging) {
      return {
        x: this.x,
        y: this.y,
        w: this.width,
        h: this.height,
        damage: 20
      };
    }

    return null;
  }

  getShockwaveHitbox() {
    // 衝撃波判定（shockwave状態の中盤で有効）
    if (this.state !== 'shockwave') return null;

    const progress = 1 - (this.shockwaveTimer / this.shockwaveDuration);
    // 判定は衝撃波の発動タイミング付近でのみ有効（40%~70%）
    if (progress < 0.4 || progress > 0.7) return null;

    const cx = this.x + this.width / 2;
    const waveWidth = 400;

    return {
      x: cx - waveWidth / 2,
      y: this.y + this.height - 40,
      w: waveWidth,
      h: 60,
      damage: 25
    };
  }
}
