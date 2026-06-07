// input.js - キーボード入力の状態管理モジュール

// 現在のキー状態
const keys = {};
// 前フレームのキー状態
const prevKeys = {};

/**
 * キーが「今フレーム押された」かどうか（エッジ検出）
 */
function justPressed(key) {
  return !!keys[key] && !prevKeys[key];
}

/**
 * 複数キーのいずれかが押されているか
 */
function anyHeld(...keyNames) {
  return keyNames.some(k => !!keys[k]);
}

/**
 * 複数キーのいずれかが「今フレーム押された」か
 */
function anyJustPressed(...keyNames) {
  return keyNames.some(k => justPressed(k));
}

export const Input = {
  /**
   * イベントリスナー登録
   */
  init() {
    window.addEventListener('keydown', (e) => {
      keys[e.code] = true;
      // ゲーム中のデフォルト動作を防止（スクロール等）
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Escape'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      keys[e.code] = false;
    });

    // タブ切り替え時にキーリセット
    window.addEventListener('blur', () => {
      for (const key in keys) {
        keys[key] = false;
      }
    });
  },

  /**
   * フレーム終了時に呼ぶ（前フレームの入力保持用）
   */
  update() {
    for (const key in keys) {
      prevKeys[key] = keys[key];
    }
  },

  // ── 方向入力（押している間true） ──

  get left() {
    return anyHeld('ArrowLeft', 'KeyA');
  },

  get right() {
    return anyHeld('ArrowRight', 'KeyD');
  },

  get up() {
    return anyHeld('ArrowUp', 'KeyW');
  },

  get down() {
    return anyHeld('ArrowDown', 'KeyS');
  },

  // ── アクション入力（押した瞬間だけtrue） ──

  /** 攻撃 - Z / Space */
  get attack() {
    return anyJustPressed('KeyZ', 'Space');
  },

  /** 必殺技 - X */
  get special() {
    return anyJustPressed('KeyX');
  },

  // ── ダッシュ（押している間true） ──

  /** ダッシュ - Shift */
  get dash() {
    return anyHeld('ShiftLeft', 'ShiftRight');
  },

  // ── 決定キー（押した瞬間だけtrue） ──

  /** 決定 - Enter / Space */
  get confirm() {
    return anyJustPressed('Enter', 'Space');
  }
};
