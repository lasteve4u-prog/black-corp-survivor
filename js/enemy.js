// enemy.js - ザコ敵クラスとウェーブスポーン関数
import { drawZombieEmployee, drawMiddleManager, drawHarassingOfficer, drawProjectile } from './sprites.js';

// ============================================================
// ZombieEmployee - ゾンビ化社員
// ============================================================
export class ZombieEmployee {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 44;
    this.height = 60;

    this.hp = 30;
    this.maxHp = 30;

    this.state = 'walk';      // 'walk' | 'attack' | 'hurt' | 'die'
    this.facingRight = false;
    this.isAlive = true;
    this.isDead = false;       // 死亡アニメーション完了後true
    this.scoreValue = 150;
    this.damage = 10;

    // 移動
    this.speed = 60;           // px/s

    // アニメーション
    this.frameCounter = 0;
    this.animFrame = 0;

    // 攻撃
    this.attackTimer = 0;       // 攻撃動作タイマー
    this.attackDuration = 0.4;  // 攻撃動作時間
    this.attackCooldown = 0;    // 攻撃クールダウン残り
    this.attackCooldownMax = 1.5;
    this.hasHitThisAttack = false;

    // ダメージ
    this.hurtTimer = 0;
    this.hurtDuration = 0.3;

    // 死亡
    this.deathTimer = 0;
    this.deathDuration = 0.5;
  }

  update(dt, playerX, playerY, effects, audio) {
    if (this.isDead) return;

    // アニメーション
    this.frameCounter++;
    if (this.frameCounter % 6 === 0) {
      this.animFrame++;
    }

    // 死亡アニメーション
    if (!this.isAlive) {
      this._updateDeath(dt);
      return;
    }

    // 状態ごとの更新
    switch (this.state) {
      case 'hurt':
        this._updateHurt(dt);
        break;
      case 'attack':
        this._updateAttack(dt);
        break;
      case 'walk':
      default:
        this._updateWalk(dt, playerX, playerY);
        break;
    }

    // 常にプレイヤーの右側に留まる
    if (this.isAlive) this.x = Math.max(playerX + 1, this.x);

    // クールダウン更新
    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }
  }

  _updateWalk(dt, playerX, playerY) {
    // プレイヤーの方を向く
    this.facingRight = playerX > this.x;

    // プレイヤーとの距離
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 攻撃距離内
    if (dist < 50 && this.attackCooldown <= 0) {
      this.state = 'attack';
      this.attackTimer = this.attackDuration;
      this.hasHitThisAttack = false;
      return;
    }

    // プレイヤーに向かって移動
    if (dist > 30) {
      const nx = dx / dist;
      const ny = dy / dist;
      this.x += nx * this.speed * dt;
      this.y += ny * this.speed * dt;
    }

    // Y軸移動制限
    this.y = Math.max(300, Math.min(480, this.y));
  }

  _updateAttack(dt) {
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      this.state = 'walk';
      this.attackCooldown = this.attackCooldownMax;
    }
  }

  _updateHurt(dt) {
    this.hurtTimer -= dt;
    if (this.hurtTimer <= 0) {
      this.state = 'walk';
    }
  }

  _updateDeath(dt) {
    this.state = 'die';
    this.deathTimer += dt;
    if (this.deathTimer >= this.deathDuration) {
      this.isDead = true;
    }
  }

  draw(ctx) {
    if (this.isDead) return;
    drawZombieEmployee(ctx, this.x, this.y, this.state, this.animFrame, this.facingRight);
  }

  takeDamage(amount, effects, audio) {
    if (!this.isAlive) return;

    this.hp -= amount;

    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      this.deathTimer = 0;
      this.state = 'die';

      if (effects && effects.emit) {
        effects.emit(this.x + this.width / 2, this.y + this.height / 2, 'death', 10);
      }
      if (audio && audio.play) {
        audio.play('enemyDeath');
      }
    } else {
      this.state = 'hurt';
      this.hurtTimer = this.hurtDuration;

      // ノックバック
      this.x += this.facingRight ? -15 : 15;

      if (audio && audio.play) {
        audio.play('enemyHurt');
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
    if (this.state !== 'attack') return null;
    // 攻撃判定は攻撃動作の前半でのみ有効
    if (this.attackTimer < this.attackDuration * 0.3) return null;

    const aw = 40;
    const ah = 36;
    const hx = this.facingRight
      ? this.x + this.width
      : this.x - aw;

    return {
      x: hx,
      y: this.y + this.height / 2 - ah / 2,
      w: aw,
      h: ah
    };
  }
}

// ============================================================
// MiddleManager - 中間管理職ゾンビ
// ============================================================
export class MiddleManager {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 52;
    this.height = 68;

    this.hp = 60;
    this.maxHp = 60;

    this.state = 'walk';       // 'walk' | 'attack' | 'charge' | 'hurt' | 'die'
    this.facingRight = false;
    this.isAlive = true;
    this.isDead = false;
    this.scoreValue = 500;
    this.damage = 15;

    // 移動
    this.speed = 100;           // px/s
    this.chargeSpeed = 300;     // 突進速度

    // アニメーション
    this.frameCounter = 0;
    this.animFrame = 0;

    // 攻撃
    this.attackTimer = 0;
    this.attackDuration = 0.5;
    this.attackCooldown = 0;
    this.attackCooldownMax = 2;
    this.hasHitThisAttack = false;

    // 突進
    this.chargeTimer = 0;
    this.chargeDuration = 0.6;   // 突進の持続時間
    this.chargeCooldown = 0;
    this.chargeCooldownMax = 4;
    this.chargeDirection = 0;    // 突進方向X

    // ダメージ
    this.hurtTimer = 0;
    this.hurtDuration = 0.3;

    // 死亡
    this.deathTimer = 0;
    this.deathDuration = 0.5;
  }

  update(dt, playerX, playerY, effects, audio) {
    if (this.isDead) return;

    // アニメーション
    this.frameCounter++;
    if (this.frameCounter % 6 === 0) {
      this.animFrame++;
    }

    // 死亡アニメーション
    if (!this.isAlive) {
      this._updateDeath(dt);
      return;
    }

    // 状態ごとの更新
    switch (this.state) {
      case 'hurt':
        this._updateHurt(dt);
        break;
      case 'attack':
        this._updateAttack(dt);
        break;
      case 'charge':
        this._updateCharge(dt);
        break;
      case 'walk':
      default:
        this._updateWalk(dt, playerX, playerY);
        break;
    }

    // 常にプレイヤーの右側に留まる
    if (this.isAlive) this.x = Math.max(playerX + 1, this.x);

    // クールダウン
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.chargeCooldown > 0) this.chargeCooldown -= dt;
  }

  _updateWalk(dt, playerX, playerY) {
    this.facingRight = playerX > this.x;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 突進判定: 距離200-350でランダムに発動
    if (dist >= 200 && dist <= 350 && this.chargeCooldown <= 0) {
      if (Math.random() < 0.02) { // フレームごとに2%の確率
        this.state = 'charge';
        this.chargeTimer = this.chargeDuration;
        this.chargeDirection = dx > 0 ? 1 : -1;
        this.hasHitThisAttack = false;
        this.chargeCooldown = this.chargeCooldownMax;
        return;
      }
    }

    // 通常攻撃: 距離60px以内
    if (dist < 60 && this.attackCooldown <= 0) {
      this.state = 'attack';
      this.attackTimer = this.attackDuration;
      this.hasHitThisAttack = false;
      return;
    }

    // プレイヤーに向かって移動
    if (dist > 40) {
      const nx = dx / dist;
      const ny = dy / dist;
      this.x += nx * this.speed * dt;
      this.y += ny * this.speed * dt;
    }

    this.y = Math.max(300, Math.min(480, this.y));
  }

  _updateAttack(dt) {
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      this.state = 'walk';
      this.attackCooldown = this.attackCooldownMax;
    }
  }

  _updateCharge(dt) {
    this.chargeTimer -= dt;
    this.x += this.chargeDirection * this.chargeSpeed * dt;

    // 画面外制限
    this.x = Math.max(-20, Math.min(980, this.x));

    if (this.chargeTimer <= 0) {
      this.state = 'walk';
    }
  }

  _updateHurt(dt) {
    this.hurtTimer -= dt;
    if (this.hurtTimer <= 0) {
      this.state = 'walk';
    }
  }

  _updateDeath(dt) {
    this.state = 'die';
    this.deathTimer += dt;
    if (this.deathTimer >= this.deathDuration) {
      this.isDead = true;
    }
  }

  draw(ctx) {
    if (this.isDead) return;
    drawMiddleManager(ctx, this.x, this.y, this.state, this.animFrame, this.facingRight);
  }

  takeDamage(amount, effects, audio) {
    if (!this.isAlive) return;

    this.hp -= amount;

    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      this.deathTimer = 0;
      this.state = 'die';

      if (effects && effects.emit) {
        effects.emit(this.x + this.width / 2, this.y + this.height / 2, 'death', 12);
      }
      if (audio && audio.play) {
        audio.play('enemyDeath');
      }
    } else {
      this.state = 'hurt';
      this.hurtTimer = this.hurtDuration;

      // ノックバック（MiddleManagerは少しだけ）
      this.x += this.facingRight ? -10 : 10;

      if (audio && audio.play) {
        audio.play('enemyHurt');
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
    if (this.state === 'attack') {
      if (this.attackTimer < this.attackDuration * 0.3) return null;

      const aw = 48;
      const ah = 44;
      const hx = this.facingRight
        ? this.x + this.width
        : this.x - aw;

      return {
        x: hx,
        y: this.y + this.height / 2 - ah / 2,
        w: aw,
        h: ah
      };
    }

    // 突進中も攻撃判定を出す
    if (this.state === 'charge') {
      return {
        x: this.x,
        y: this.y,
        w: this.width,
        h: this.height
      };
    }

    return null;
  }
}

// ============================================================
// パワハラ係長 - ホチキスを投擲するレンジ型
// ============================================================
export class HarassingOfficer {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 46;
    this.height = 62;

    this.hp = 45;
    this.maxHp = 45;

    this.state = 'walk';
    this.facingRight = false;
    this.isAlive = true;
    this.isDead = false;
    this.scoreValue = 400;
    this.damage = 12;

    this.speed = 65;

    this.frameCounter = 0;
    this.animFrame = 0;

    // 投擲
    this.throwCooldown = 0;
    this.throwCooldownMax = 2.5;
    this.throwTimer = 0;
    this.throwDuration = 0.45;
    this.hasHitThisAttack = false;
    this.projectiles = [];

    // 近接
    this.attackTimer = 0;
    this.attackDuration = 0.45;
    this.attackCooldown = 0;
    this.attackCooldownMax = 2.0;

    // ダメージ
    this.hurtTimer = 0;
    this.hurtDuration = 0.3;

    // 死亡
    this.deathTimer = 0;
    this.deathDuration = 0.5;
  }

  update(dt, playerX, playerY, effects, audio) {
    if (this.isDead) return;

    this.frameCounter++;
    if (this.frameCounter % 6 === 0) this.animFrame++;

    if (!this.isAlive) {
      this._updateDeath(dt);
      return;
    }

    if (this.throwCooldown > 0) this.throwCooldown -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    switch (this.state) {
      case 'hurt':   this._updateHurt(dt); break;
      case 'attack': this._updateAttack(dt); break;
      case 'throw':  this._updateThrow(dt, audio); break;
      default:       this._updateWalk(dt, playerX, playerY); break;
    }

    this._updateProjectiles(dt);

    // 常にプレイヤーの右側に留まる
    if (this.isAlive) this.x = Math.max(playerX + 1, this.x);

    this.y = Math.max(300, Math.min(480, this.y));
  }

  _updateWalk(dt, playerX, playerY) {
    this.facingRight = playerX > this.x;
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 55 && this.attackCooldown <= 0) {
      this.state = 'attack';
      this.attackTimer = this.attackDuration;
      this.hasHitThisAttack = false;
      return;
    }

    if (dist >= 100 && dist <= 320 && this.throwCooldown <= 0) {
      this.state = 'throw';
      this.throwTimer = this.throwDuration;
      this.hasHitThisAttack = false;
      this.throwCooldown = this.throwCooldownMax;
      return;
    }

    if (dist > 180) {
      const nx = dx / dist;
      const ny = dy / dist;
      this.x += nx * this.speed * dt;
      this.y += ny * this.speed * dt;
    } else if (dist < 90) {
      const nx = dx / dist;
      const ny = dy / dist;
      this.x -= nx * this.speed * 0.5 * dt;
    }
  }

  _updateAttack(dt) {
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      this.state = 'walk';
      this.attackCooldown = this.attackCooldownMax;
    }
  }

  _updateThrow(dt, audio) {
    this.throwTimer -= dt;

    if (this.throwTimer <= this.throwDuration * 0.5 && !this.hasHitThisAttack) {
      this.hasHitThisAttack = true;
      const dirX = this.facingRight ? 1 : -1;
      const projX = this.facingRight ? this.x + this.width : this.x;
      const projY = this.y + this.height * 0.35;
      this.projectiles.push({
        x: projX,
        y: projY,
        vx: dirX * 330,
        vy: 15,
        width: 18,
        height: 10,
        damage: this.damage,
        active: true,
        frame: 0,
        frameCounter: 0,
        type: 'stapler',
      });
      if (audio) audio.play('bossThrow');
    }

    if (this.throwTimer <= 0) {
      this.state = 'walk';
      this.hasHitThisAttack = false;
    }
  }

  _updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) { this.projectiles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.frameCounter++;
      if (p.frameCounter % 5 === 0) p.frame++;
      if (p.x < -300 || p.x > 5000) p.active = false;
    }
  }

  _updateHurt(dt) {
    this.hurtTimer -= dt;
    if (this.hurtTimer <= 0) this.state = 'walk';
  }

  _updateDeath(dt) {
    this.state = 'die';
    this.deathTimer += dt;
    if (this.deathTimer >= this.deathDuration) this.isDead = true;
  }

  draw(ctx) {
    if (this.isDead) return;
    drawHarassingOfficer(ctx, this.x, this.y, this.state, this.animFrame, this.facingRight);
    for (const p of this.projectiles) {
      if (p.active) drawProjectile(ctx, p.x, p.y, p.type, p.frame);
    }
  }

  takeDamage(amount, effects, audio) {
    if (!this.isAlive) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      this.deathTimer = 0;
      this.state = 'die';
      if (effects) effects.emit(this.x + this.width / 2, this.y + this.height / 2, 'death', 10);
      if (audio) audio.play('enemyDeath');
    } else {
      this.state = 'hurt';
      this.hurtTimer = this.hurtDuration;
      this.x += this.facingRight ? -12 : 12;
      if (audio) audio.play('enemyHurt');
    }
  }

  getHitbox() {
    return { x: this.x, y: this.y, w: this.width, h: this.height };
  }

  getAttackHitbox() {
    if (this.state !== 'attack') return null;
    if (this.attackTimer < this.attackDuration * 0.3) return null;
    const aw = 42, ah = 38;
    return {
      x: this.facingRight ? this.x + this.width : this.x - aw,
      y: this.y + this.height / 2 - ah / 2,
      w: aw,
      h: ah,
    };
  }
}

// ============================================================
// ウェーブスポーン関数
// ============================================================
export function createWave(waveIndex) {
  const enemies = [];

  // ランダム座標生成ヘルパー
  const randX = () => 1000 + Math.random() * 200;  // 1000-1200
  const randY = () => 320 + Math.random() * 140;    // 320-460

  switch (waveIndex) {
    case 0:
      // wave 0: ZombieEmployee x3
      for (let i = 0; i < 3; i++) {
        enemies.push(new ZombieEmployee(randX(), randY()));
      }
      break;

    case 1:
      // wave 1: ZombieEmployee x4 + MiddleManager x1
      for (let i = 0; i < 4; i++) {
        enemies.push(new ZombieEmployee(randX(), randY()));
      }
      enemies.push(new MiddleManager(randX(), randY()));
      break;

    case 2:
      // wave 2: ZombieEmployee x3 + MiddleManager x1 + HarassingOfficer x1
      for (let i = 0; i < 3; i++) {
        enemies.push(new ZombieEmployee(randX(), randY()));
      }
      enemies.push(new MiddleManager(randX(), randY()));
      enemies.push(new HarassingOfficer(randX(), randY()));
      break;

    case 3:
      // wave 3: ZombieEmployee x4 + MiddleManager x2 + HarassingOfficer x2
      for (let i = 0; i < 4; i++) {
        enemies.push(new ZombieEmployee(randX(), randY()));
      }
      for (let i = 0; i < 2; i++) {
        enemies.push(new MiddleManager(randX(), randY()));
      }
      for (let i = 0; i < 2; i++) {
        enemies.push(new HarassingOfficer(randX(), randY()));
      }
      break;

    default: {
      // wave 4以降: waveIndexに応じてスケーリング
      const zombieCount = 3 + waveIndex;
      const managerCount = Math.floor(waveIndex / 2) + 1;
      const officerCount = Math.floor(waveIndex / 2);
      for (let i = 0; i < zombieCount; i++) {
        enemies.push(new ZombieEmployee(randX(), randY()));
      }
      for (let i = 0; i < managerCount; i++) {
        enemies.push(new MiddleManager(randX(), randY()));
      }
      for (let i = 0; i < officerCount; i++) {
        enemies.push(new HarassingOfficer(randX(), randY()));
      }
      break;
    }
  }

  return enemies;
}
