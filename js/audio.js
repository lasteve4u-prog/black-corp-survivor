// audio.js - Web Audio API で効果音とBGMをプログラム生成

let audioCtx = null;
let masterGain = null;
let bgmPlaying = false;
let bgmNodes = [];

/**
 * ノイズバッファを生成するヘルパー
 */
function createNoiseBuffer(duration = 0.5) {
  const sampleRate = audioCtx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * 単発のトーンを再生するヘルパー
 */
function playTone(freq, type, duration, volume = 0.3, detune = 0) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + duration);
}

/**
 * ノイズを再生するヘルパー
 */
function playNoise(duration, volume = 0.2, filterFreq = 2000) {
  if (!audioCtx) return;
  const buffer = createNoiseBuffer(duration);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  source.start(audioCtx.currentTime);
}

/**
 * 周波数スイープ
 */
function playSweep(startFreq, endFreq, type, duration, volume = 0.2) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + duration);
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + duration);
}

export const AudioManager = {
  /**
   * AudioContext初期化（ユーザージェスチャー後に呼ぶ）
   */
  init() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.3; // 控えめな音量
    masterGain.connect(audioCtx.destination);
  },

  /**
   * パンチ/攻撃ヒット音
   * 歪んだインパクト＋ピッチ急降下＋広帯域ノイズ
   */
  playHit() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    // ── 低音インパクト（ドスッ）：ピッチ急降下 ──
    const impOsc = audioCtx.createOscillator();
    const impGain = audioCtx.createGain();
    const impDist = audioCtx.createWaveShaper();
    // ハードクリップでディストーション
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = Math.max(-0.7, Math.min(0.7, x * 3));
    }
    impDist.curve = curve;
    impOsc.type = 'sawtooth';
    impOsc.frequency.setValueAtTime(200, now);
    impOsc.frequency.exponentialRampToValueAtTime(35, now + 0.12);
    impGain.gain.setValueAtTime(0.9, now);
    impGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    impOsc.connect(impDist);
    impDist.connect(impGain);
    impGain.connect(masterGain);
    impOsc.start(now);
    impOsc.stop(now + 0.2);

    // ── 中音のパンチ感（スクエア波） ──
    const punchOsc = audioCtx.createOscillator();
    const punchGain = audioCtx.createGain();
    punchOsc.type = 'square';
    punchOsc.frequency.setValueAtTime(320, now);
    punchOsc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
    punchGain.gain.setValueAtTime(0.5, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    punchOsc.connect(punchGain);
    punchGain.connect(masterGain);
    punchOsc.start(now);
    punchOsc.stop(now + 0.12);

    // ── 広帯域ノイズ（バシッ）：高域＋中域の2層 ──
    playNoise(0.06, 0.7, 8000);
    playNoise(0.1,  0.4, 1200);

    // ── 超高音のアタック感（パキッ） ──
    playTone(1800, 'square', 0.025, 0.3);
  },

  /**
   * プレイヤーダメージ音
   * 下降トーン + ノイズ
   */
  playDamage() {
    if (!audioCtx) return;
    playSweep(400, 100, 'sawtooth', 0.3, 0.3);
    playNoise(0.15, 0.2, 1500);
    // 不快感を表現する不協和音
    playTone(300, 'square', 0.15, 0.1, 50);
  },

  /**
   * 辞表スラッシュ音（鋭い金属斬撃）
   * 超高周波スイープ + 倍音の鋭い響き + 歪み
   */
  playSpecial() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    // ── 鋭い上昇スイープ（1000→4500Hz） ──
    playSweep(1000, 4500, 'square', 0.12, 0.4);

    // ── 超高周波倍音群（鋭い金属感） ──
    playTone(3600, 'square', 0.38, 0.2);
    playTone(5200, 'square', 0.35, 0.18);
    playTone(7200, 'square', 0.28, 0.12);

    // ── 中高周波の鋸波（エッジ感） ──
    const saw = audioCtx.createOscillator();
    const sawGain = audioCtx.createGain();
    saw.type = 'sawtooth';
    saw.frequency.value = 2400;
    sawGain.gain.setValueAtTime(0.3, now);
    sawGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    saw.connect(sawGain);
    sawGain.connect(masterGain);
    saw.start(now);
    saw.stop(now + 0.1);

    // ── ハイパスノイズ（シュキーン） ──
    const noiseBuffer = createNoiseBuffer(0.15);
    const noiseSrc = audioCtx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    const noiseFilt = audioCtx.createBiquadFilter();
    const noiseGain = audioCtx.createGain();
    noiseFilt.type = 'highpass';
    noiseFilt.frequency.value = 9000;
    noiseFilt.Q.value = 4;
    noiseGain.gain.setValueAtTime(0.45, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    noiseSrc.connect(noiseFilt);
    noiseFilt.connect(noiseGain);
    noiseGain.connect(masterGain);
    noiseSrc.start(now);

    // ── 超高周波パルス（キラッ感） ──
    playTone(9500, 'square', 0.02, 0.15);
  },

  /**
   * アイテム取得音
   * キラキラ上昇音
   */
  playPickup() {
    if (!audioCtx) return;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const startTime = audioCtx.currentTime + i * 0.06;
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  },

  /**
   * チーン（お葬式の鐘）
   * 打撃クリック + 3層サイン波倍音でゆっくり減衰
   */
  playFuneralBell() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    // 打撃の瞬間（短いノイズクリック）
    playNoise(0.018, 0.6, 6000);

    // 基音 880Hz (A5) — 4.5秒かけて消える
    const b1 = audioCtx.createOscillator();
    const g1 = audioCtx.createGain();
    b1.type = 'sine';
    b1.frequency.value = 880;
    g1.gain.setValueAtTime(0.55, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 4.5);
    b1.connect(g1);
    g1.connect(masterGain);
    b1.start(now);
    b1.stop(now + 4.5);

    // 第2倍音 1760Hz (A6) — 2.5秒
    const b2 = audioCtx.createOscillator();
    const g2 = audioCtx.createGain();
    b2.type = 'sine';
    b2.frequency.value = 1760;
    g2.gain.setValueAtTime(0.22, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    b2.connect(g2);
    g2.connect(masterGain);
    b2.start(now);
    b2.stop(now + 2.5);

    // 低い倍音 440Hz (A4) — 3.5秒（厚みを出す）
    const b3 = audioCtx.createOscillator();
    const g3 = audioCtx.createGain();
    b3.type = 'sine';
    b3.frequency.value = 440;
    g3.gain.setValueAtTime(0.18, now);
    g3.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
    b3.connect(g3);
    g3.connect(masterGain);
    b3.start(now);
    b3.stop(now + 3.5);
  },

  /**
   * ボス登場時の咆哮
   * 低音のグロウル + ノイズ + 不気味なうねり
   */
  playBossRoar() {
    if (!audioCtx) return;
    // 低音グロウル
    playSweep(60, 40, 'sawtooth', 1.0, 0.4);
    // ディストーション的なノイズ
    playNoise(0.8, 0.3, 800);
    // 不気味なうねり
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 80;
    lfo.type = 'sine';
    lfo.frequency.value = 5;
    lfoGain.gain.value = 30;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(audioCtx.currentTime);
    lfo.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 1.2);
    lfo.stop(audioCtx.currentTime + 1.2);
  },

  /**
   * ボス撃破音
   * 爆発的な低音 + 上昇する勝利音
   */
  playBossDeath() {
    if (!audioCtx) return;
    // 爆発
    playNoise(0.5, 0.5, 600);
    playSweep(100, 30, 'sawtooth', 0.6, 0.4);
    // 勝利ファンファーレ風
    setTimeout(() => {
      if (!audioCtx) return;
      const victory = [523, 659, 784, 1047, 1319];
      victory.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        const startTime = audioCtx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    }, 500);
  },

  /**
   * BGMループ開始
   * 暗めのテクノ/インダストリアル風ベースライン
   */
  /**
   * ボスBGM：重厚なダークオーケストラ風
   * 低音ブラス＋不穏なストリングス＋重いドラム
   */
  startBossBGM() {
    if (!audioCtx || bgmPlaying) return;
    bgmPlaying = true;
    masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGain.gain.setValueAtTime(0.3, audioCtx.currentTime);

    const bpm = 100;
    const beat = 60 / bpm;
    const bar = beat * 4;

    // ── 低音ブラス（重厚なホーン）──
    const brassDistCurve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      brassDistCurve[i] = Math.max(-0.8, Math.min(0.8, x * 2.5));
    }
    const brassDist = audioCtx.createWaveShaper();
    brassDist.curve = brassDistCurve;
    const brassGain = audioCtx.createGain();
    const brassFilter = audioCtx.createBiquadFilter();
    brassFilter.type = 'lowpass';
    brassFilter.frequency.value = 600;
    brassGain.gain.value = 0;
    brassDist.connect(brassFilter);
    brassFilter.connect(brassGain);
    brassGain.connect(masterGain);

    const brassOsc1 = audioCtx.createOscillator();
    const brassOsc2 = audioCtx.createOscillator();
    brassOsc1.type = 'sawtooth';
    brassOsc2.type = 'sawtooth';
    brassOsc1.connect(brassDist);
    brassOsc2.connect(brassDist);
    brassOsc1.start();
    brassOsc2.start();

    // Dマイナー進行：Dm - Bb - C - Dm
    const brassChords = [
      { r: 73.4, f: 110.0 },  // Dm (D2+A2)
      { r: 58.3, f: 87.3  },  // Bb (Bb1+F2)
      { r: 65.4, f: 98.0  },  // C  (C2+G2)
      { r: 73.4, f: 110.0 },  // Dm
    ];

    const scheduleBrass = () => {
      if (!bgmPlaying) return;
      const now = audioCtx.currentTime;
      brassChords.forEach((chord, i) => {
        const t = now + i * beat;
        brassOsc1.frequency.setValueAtTime(chord.r, t);
        brassOsc2.frequency.setValueAtTime(chord.f, t);
        brassGain.gain.setValueAtTime(0.22, t);
        brassGain.gain.setValueAtTime(0.14, t + beat * 0.7);
        brassGain.gain.linearRampToValueAtTime(0.05, t + beat * 0.95);
      });
      brassTimerId = setTimeout(scheduleBrass, bar * 1000 * 0.9);
    };

    // ── 不穏なストリングス（トレモロ）──
    const strGain = audioCtx.createGain();
    strGain.gain.value = 0.06;
    strGain.connect(masterGain);
    const strOsc = audioCtx.createOscillator();
    strOsc.type = 'sawtooth';
    strOsc.frequency.value = 293.7; // D4
    strOsc.connect(strGain);
    strOsc.start();

    // トレモロLFO
    const tremoloLFO = audioCtx.createOscillator();
    const tremoloGain = audioCtx.createGain();
    tremoloLFO.frequency.value = 10;
    tremoloGain.gain.value = 0.05;
    tremoloLFO.connect(tremoloGain);
    tremoloGain.connect(strGain.gain);
    tremoloLFO.start();

    const strMelody = [293.7, 261.6, 277.2, 246.9]; // D4 C4 C#4 B3
    const scheduleStrings = () => {
      if (!bgmPlaying) return;
      const now = audioCtx.currentTime;
      strMelody.forEach((freq, i) => {
        strOsc.frequency.setValueAtTime(freq, now + i * beat);
      });
      stringsTimerId = setTimeout(scheduleStrings, bar * 1000 * 0.9);
    };

    // ── 重いバスドラム ──
    const kickOsc = audioCtx.createOscillator();
    const kickGain = audioCtx.createGain();
    kickOsc.type = 'sine';
    kickGain.gain.value = 0;
    kickOsc.connect(kickGain);
    kickGain.connect(masterGain);
    kickOsc.start();
    const kickNoise = createNoiseBuffer(0.1);

    const fireKick = (t) => {
      kickOsc.frequency.setValueAtTime(120, t);
      kickOsc.frequency.exponentialRampToValueAtTime(28, t + 0.15);
      kickGain.gain.setValueAtTime(0.6, t);
      kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      const ns = audioCtx.createBufferSource();
      const ng = audioCtx.createGain();
      const nf = audioCtx.createBiquadFilter();
      ns.buffer = kickNoise; nf.type = 'lowpass'; nf.frequency.value = 150;
      ng.gain.setValueAtTime(0.3, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      ns.connect(nf); nf.connect(ng); ng.connect(masterGain);
      ns.start(t);
    };

    const scheduleKick = () => {
      if (!bgmPlaying) return;
      const now = audioCtx.currentTime;
      // 1拍目と3拍目に重いキック、2拍目に弱めのキック
      fireKick(now);
      fireKick(now + beat * 1.5);
      fireKick(now + beat * 2);
      fireKick(now + beat * 3);
      kickTimerId = setTimeout(scheduleKick, bar * 1000 * 0.9);
    };

    // ── 重いスネア（2拍・4拍）──
    const snareNoise = createNoiseBuffer(0.1);
    const fireSnare = (t) => {
      const ns = audioCtx.createBufferSource();
      const ng = audioCtx.createGain();
      const nf = audioCtx.createBiquadFilter();
      ns.buffer = snareNoise; nf.type = 'bandpass'; nf.frequency.value = 2000; nf.Q.value = 0.5;
      ng.gain.setValueAtTime(0.45, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      ns.connect(nf); nf.connect(ng); ng.connect(masterGain);
      ns.start(t);
    };

    const scheduleSnare = () => {
      if (!bgmPlaying) return;
      const now = audioCtx.currentTime;
      fireSnare(now + beat * 1);
      fireSnare(now + beat * 3);
      snareTimerId = setTimeout(scheduleSnare, bar * 1000 * 0.9);
    };

    // ── 低音うねり（オルガン風パッド）──
    const padOsc = audioCtx.createOscillator();
    const padGain = audioCtx.createGain();
    padOsc.type = 'sine';
    padOsc.frequency.value = 55; // A1（超低音）
    padGain.gain.value = 0.12;
    padOsc.connect(padGain);
    padGain.connect(masterGain);
    padOsc.start();

    // うねりLFO
    const padLFO = audioCtx.createOscillator();
    const padLFOGain = audioCtx.createGain();
    padLFO.frequency.value = 0.3;
    padLFOGain.gain.value = 0.04;
    padLFO.connect(padLFOGain);
    padLFOGain.connect(padGain.gain);
    padLFO.start();

    let brassTimerId = null;
    let stringsTimerId = null;
    let kickTimerId = null;
    let snareTimerId = null;

    bgmNodes = [
      { node: brassOsc1, gain: brassGain },
      { node: brassOsc2, gain: brassGain },
      { node: strOsc,    gain: strGain   },
      { node: kickOsc,   gain: kickGain  },
      { node: padOsc,    gain: padGain   },
      { node: tremoloLFO },
      { node: padLFO    },
      {
        stop: () => {
          clearTimeout(brassTimerId);
          clearTimeout(stringsTimerId);
          clearTimeout(kickTimerId);
          clearTimeout(snareTimerId);
        }
      }
    ];

    scheduleBrass();
    scheduleStrings();
    scheduleKick();
    scheduleSnare();
  },

  /**
   * エリアBGM開始（エリアインデックスに応じて雰囲気を変える）
   * @param {number} areaIndex 0,1,2 のいずれか
   */
  startBGM(areaIndex = 0) {
    if (!audioCtx || bgmPlaying) return;
    bgmPlaying = true;
    masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGain.gain.setValueAtTime(0.3, audioCtx.currentTime);

    // ── エリアごとの音楽プリセット ──
    // AREA 0: エントランス（不気味なテクノ、Am、BPM130）
    // AREA 1: オープンフロア（緊迫感のあるダーク、Cm、BPM145）
    // AREA 2: 役員フロア（激しいインダストリアル、Em、BPM160）
    let bpm, bassNotes, padFreq1, padFreq2, filterBase, filterPeak;
    switch (areaIndex) {
      case 1: // オープンフロア（より緊迫、より速い）
        bpm = 145;
        bassNotes = [65, 65, 73, 65, 78, 65, 58, 65]; // Cm ベースライン
        padFreq1 = 261; // C4
        padFreq2 = 311; // Eb4（マイナー3rd）
        filterBase = 350;
        filterPeak = 750;
        break;
      case 2: // 役員フロア（激しい、最も速い）
        bpm = 160;
        bassNotes = [82, 82, 98, 82, 110, 82, 73, 82]; // Em ベースライン
        padFreq1 = 329; // E4
        padFreq2 = 392; // G4（マイナー3rd）
        filterBase = 400;
        filterPeak = 900;
        break;
      default: // AREA 0: エントランス（元のテクノ）
        bpm = 130;
        bassNotes = [55, 55, 65, 55, 55, 55, 49, 55]; // Am ベースライン
        padFreq1 = 220; // A3
        padFreq2 = 261; // C4（マイナー3rd）
        filterBase = 300;
        filterPeak = 600;
        break;
    }

    const beatDuration = 60 / bpm;
    const barDuration = beatDuration * 4;
    const bassOsc = audioCtx.createOscillator();
    const bassGain = audioCtx.createGain();
    const bassFilter = audioCtx.createBiquadFilter();

    bassOsc.type = 'sawtooth';
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = filterBase;
    bassFilter.Q.value = 8;
    bassGain.gain.value = 0.15;

    bassOsc.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(masterGain);
    bassOsc.start();

    // ベースラインのシーケンス
    const scheduleBaseline = () => {
      if (!bgmPlaying) return;
      const now = audioCtx.currentTime;
      for (let i = 0; i < bassNotes.length; i++) {
        const time = now + i * beatDuration * 0.5;
        bassOsc.frequency.setValueAtTime(bassNotes[i], time);
        // 8分音符のパルス
        bassGain.gain.setValueAtTime(0.15, time);
        bassGain.gain.setValueAtTime(0.02, time + beatDuration * 0.4);
      }
      // フィルターのうねり（エリアごとに違う周波数）
      bassFilter.frequency.setValueAtTime(filterBase, now);
      bassFilter.frequency.linearRampToValueAtTime(filterPeak, now + barDuration * 0.5);
      bassFilter.frequency.linearRampToValueAtTime(filterBase, now + barDuration);

      bgmTimerId = setTimeout(scheduleBaseline, barDuration * 1000 * 0.9);
    };

    // ── キック（低音パルス） ──
    const kickOsc = audioCtx.createOscillator();
    const kickGain = audioCtx.createGain();
    kickOsc.type = 'sine';
    kickGain.gain.value = 0;
    kickOsc.connect(kickGain);
    kickGain.connect(masterGain);
    kickOsc.start();

    const scheduleKick = () => {
      if (!bgmPlaying) return;
      const now = audioCtx.currentTime;
      for (let i = 0; i < 4; i++) {
        const time = now + i * beatDuration;
        kickOsc.frequency.setValueAtTime(150, time);
        kickOsc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
        kickGain.gain.setValueAtTime(0.2, time);
        kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      }
      kickTimerId = setTimeout(scheduleKick, barDuration * 1000 * 0.9);
    };

    // ── ハイハット（ノイズベース） ──
    const hatBuffer = createNoiseBuffer(0.05);
    let hatTimerId = null;

    const scheduleHat = () => {
      if (!bgmPlaying) return;
      const now = audioCtx.currentTime;
      for (let i = 0; i < 8; i++) {
        const time = now + i * beatDuration * 0.5;
        const src = audioCtx.createBufferSource();
        const hatGain = audioCtx.createGain();
        const hatFilter = audioCtx.createBiquadFilter();
        src.buffer = hatBuffer;
        hatFilter.type = 'highpass';
        hatFilter.frequency.value = 8000;
        hatGain.gain.setValueAtTime(i % 2 === 0 ? 0.08 : 0.04, time);
        hatGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        src.connect(hatFilter);
        hatFilter.connect(hatGain);
        hatGain.connect(masterGain);
        src.start(time);
      }
      hatTimerId = setTimeout(scheduleHat, barDuration * 1000 * 0.9);
    };

    // ── パッド（不気味な雰囲気） ──
    const padOsc1 = audioCtx.createOscillator();
    const padOsc2 = audioCtx.createOscillator();
    const padGain = audioCtx.createGain();
    padOsc1.type = 'sine';
    padOsc2.type = 'sine';
    padOsc1.frequency.value = padFreq1;
    padOsc2.frequency.value = padFreq2;
    padGain.gain.value = 0.04;
    padOsc1.connect(padGain);
    padOsc2.connect(padGain);
    padGain.connect(masterGain);
    padOsc1.start();
    padOsc2.start();

    // ── エリア1+: スネアでテンション追加 ──
    let snareTimerId = null;
    const snareBuffer = createNoiseBuffer(0.06);
    if (areaIndex >= 1) {
      const scheduleSnare = () => {
        if (!bgmPlaying) return;
        const now = audioCtx.currentTime;
        // 2拍目と4拍目にスネア
        [1, 3].forEach((beatIdx) => {
          const t = now + beatIdx * beatDuration;
          const src = audioCtx.createBufferSource();
          const sg = audioCtx.createGain();
          const sf = audioCtx.createBiquadFilter();
          src.buffer = snareBuffer;
          sf.type = 'bandpass';
          sf.frequency.value = 2500;
          sf.Q.value = 0.7;
          sg.gain.setValueAtTime(0.18, t);
          sg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          src.connect(sf); sf.connect(sg); sg.connect(masterGain);
          src.start(t);
        });
        snareTimerId = setTimeout(scheduleSnare, barDuration * 1000 * 0.9);
      };
      scheduleSnare();
    }

    // ── エリア2: リードシンセメロディ（緊迫感UP）──
    let leadOsc = null, leadGain = null, leadTimerId = null;
    if (areaIndex >= 2) {
      leadOsc = audioCtx.createOscillator();
      leadGain = audioCtx.createGain();
      const leadFilter = audioCtx.createBiquadFilter();
      leadOsc.type = 'square';
      leadFilter.type = 'lowpass';
      leadFilter.frequency.value = 2000;
      leadGain.gain.value = 0;
      leadOsc.connect(leadFilter);
      leadFilter.connect(leadGain);
      leadGain.connect(masterGain);
      leadOsc.start();

      // Eマイナー系の暗いメロディ
      const leadNotes = [659, 587, 494, 587, 659, 784, 659, 494];

      const scheduleLead = () => {
        if (!bgmPlaying) return;
        const now = audioCtx.currentTime;
        for (let i = 0; i < leadNotes.length; i++) {
          const t = now + i * beatDuration * 0.5;
          leadOsc.frequency.setValueAtTime(leadNotes[i], t);
          leadGain.gain.setValueAtTime(0.06, t);
          leadGain.gain.exponentialRampToValueAtTime(0.001, t + beatDuration * 0.4);
        }
        leadTimerId = setTimeout(scheduleLead, barDuration * 1000 * 0.9);
      };
      scheduleLead();
    }

    // 記録用
    let bgmTimerId = null;
    let kickTimerId = null;

    bgmNodes = [
      { node: bassOsc, gain: bassGain },
      { node: kickOsc, gain: kickGain },
      { node: padOsc1, gain: padGain },
      { node: padOsc2, gain: padGain },
      {
        stop: () => {
          clearTimeout(bgmTimerId);
          clearTimeout(kickTimerId);
          clearTimeout(hatTimerId);
          clearTimeout(snareTimerId);
          clearTimeout(leadTimerId);
        }
      }
    ];

    if (leadOsc) bgmNodes.push({ node: leadOsc, gain: leadGain });

    scheduleBaseline();
    scheduleKick();
    scheduleHat();
  },

  /**
   * BGM一時停止（AudioContext ごと止めるので全音が止まる）
   */
  pauseBGM() {
    if (audioCtx && audioCtx.state === 'running') {
      audioCtx.suspend();
    }
  },

  /**
   * BGM再開
   */
  resumeBGM() {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  },

  /**
   * BGM停止
   */
  stopBGM() {
    bgmPlaying = false;
    for (const entry of bgmNodes) {
      try {
        if (entry.stop) {
          entry.stop();
        }
        if (entry.node) {
          entry.node.stop();
        }
        if (entry.gain) {
          entry.gain.disconnect();
        }
      } catch (e) {
        // 既に停止済みの場合は無視
      }
    }
    bgmNodes = [];
  },

  /**
   * ヘビーメタル勝利BGM（ゲームクリア用）
   * パワーコード＋ダブルバスドラム＋激しいリフ
   */
  startVictoryBGM() {
    if (!audioCtx) return;
    this.stopBGM();
    bgmPlaying = true;
    masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGain.gain.setValueAtTime(0.24, audioCtx.currentTime); // 0.3の80%

    const bpm = 180;
    const beat = 60 / bpm;
    const bar = beat * 4;

    // ── 共通ディストーション（ハードクリップ）──
    const makeDistortion = (amount) => {
      const curve = new Float32Array(512);
      for (let i = 0; i < 512; i++) {
        const x = (i * 2) / 512 - 1;
        curve[i] = Math.max(-1, Math.min(1, x * amount));
      }
      const node = audioCtx.createWaveShaper();
      node.curve = curve;
      return node;
    };

    // ── リズムギター（パワーコードリフ）──
    const rhythmDist = makeDistortion(10);
    const rhythmGain = audioCtx.createGain();
    rhythmGain.gain.value = 0.15;
    rhythmDist.connect(rhythmGain);
    rhythmGain.connect(masterGain);

    const riffNotes = [82, 82, 110, 82, 92, 82, 73, 82];
    const riffOsc = audioCtx.createOscillator();
    riffOsc.type = 'sawtooth';
    riffOsc.connect(rhythmDist);
    riffOsc.start();

    // パワーコードの5th（1オクターブ上の5度音）
    const riffOsc5th = audioCtx.createOscillator();
    riffOsc5th.type = 'sawtooth';
    riffOsc5th.connect(rhythmDist);
    riffOsc5th.start();

    const scheduleRiff = () => {
      if (!bgmPlaying) return;
      const now = audioCtx.currentTime;
      for (let i = 0; i < riffNotes.length; i++) {
        const t = now + i * beat * 0.5;
        riffOsc.frequency.setValueAtTime(riffNotes[i], t);
        riffOsc5th.frequency.setValueAtTime(riffNotes[i] * 1.5, t); // 5度上
        rhythmGain.gain.setValueAtTime(0.15, t);
        rhythmGain.gain.setValueAtTime(0.04, t + beat * 0.38);
      }
      riffTimerId = setTimeout(scheduleRiff, bar * 1000 * 0.9);
    };

    // ── リードギター（メロディーライン）──
    // Eマイナーペンタ: E4=330, G4=392, A4=440, B4=494, D5=587, E5=659
    const leadDist = makeDistortion(14);
    const leadFilter = audioCtx.createBiquadFilter();
    leadFilter.type = 'peaking';
    leadFilter.frequency.value = 2400;
    leadFilter.gain.value = 8;
    const leadGain = audioCtx.createGain();
    leadGain.gain.value = 0;
    const leadOsc = audioCtx.createOscillator();
    leadOsc.type = 'sawtooth';
    leadOsc.connect(leadDist);
    leadDist.connect(leadFilter);
    leadFilter.connect(leadGain);
    leadGain.connect(masterGain);
    leadOsc.start();

    // ビブラート用LFO
    const vibratoLFO = audioCtx.createOscillator();
    const vibratoGain = audioCtx.createGain();
    vibratoLFO.frequency.value = 6;
    vibratoGain.gain.value = 4;
    vibratoLFO.connect(vibratoGain);
    vibratoGain.connect(leadOsc.frequency);
    vibratoLFO.start();

    const leadMelody = [
      { f: 659, d: 0.5 },  // E5
      { f: 587, d: 0.25 }, // D5
      { f: 659, d: 0.25 }, // E5
      { f: 494, d: 0.5 },  // B4
      { f: 440, d: 0.25 }, // A4
      { f: 494, d: 0.25 }, // B4
      { f: 392, d: 0.5 },  // G4
      { f: 330, d: 0.5 },  // E4（シュレッド下降）
    ];

    const scheduleLead = () => {
      if (!bgmPlaying) return;
      const now = audioCtx.currentTime;
      let t = now;
      for (const note of leadMelody) {
        const dur = note.d * beat;
        leadOsc.frequency.setValueAtTime(note.f, t);
        leadGain.gain.setValueAtTime(0.22, t);
        leadGain.gain.setValueAtTime(0.18, t + dur * 0.7); // サスティン
        leadGain.gain.linearRampToValueAtTime(0.05, t + dur * 0.95);
        t += dur;
      }
      leadTimerId = setTimeout(scheduleLead, bar * 1000 * 0.9);
    };

    // ── ピッキングハーモニクス（甲高いキュイーン）──
    const harmDist = makeDistortion(20);
    const harmGain = audioCtx.createGain();
    harmGain.gain.value = 0;
    const harmOsc = audioCtx.createOscillator();
    harmOsc.type = 'sine';
    harmOsc.connect(harmDist);
    harmDist.connect(harmGain);
    harmGain.connect(masterGain);
    harmOsc.start();

    const scheduleHarmonics = () => {
      if (!bgmPlaying) return;
      const now = audioCtx.currentTime;
      // 2拍目と4拍目にピッキングハーモニクス
      [beat, beat * 3].forEach((offset) => {
        const t = now + offset;
        harmOsc.frequency.setValueAtTime(1320, t);         // E6（高音スクリーム）
        harmOsc.frequency.exponentialRampToValueAtTime(990, t + 0.18);
        harmGain.gain.setValueAtTime(0.12, t);
        harmGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      });
      harmTimerId = setTimeout(scheduleHarmonics, bar * 1000 * 0.9);
    };

    let riffTimerId = null;
    let leadTimerId = null;
    let harmTimerId = null;

    // ── ダブルバスドラム（ノイズ＋サイン合成）──
    const kickNoiseBuf = createNoiseBuffer(0.15);
    const kickOsc = audioCtx.createOscillator();
    const kickGain = audioCtx.createGain();
    kickOsc.type = 'sine';
    kickGain.gain.value = 0;
    kickOsc.connect(kickGain);
    kickGain.connect(masterGain);
    kickOsc.start();

    const fireKick = (t) => {
      // 低音サイン（ドスッ）
      kickOsc.frequency.setValueAtTime(180, t);
      kickOsc.frequency.exponentialRampToValueAtTime(30, t + 0.1);
      kickGain.gain.setValueAtTime(0.55, t);
      kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      // ノイズ成分（アタック感）
      const ns = audioCtx.createBufferSource();
      const ng = audioCtx.createGain();
      const nf = audioCtx.createBiquadFilter();
      ns.buffer = kickNoiseBuf;
      nf.type = 'lowpass';
      nf.frequency.value = 200;
      ng.gain.setValueAtTime(0.4, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      ns.connect(nf); nf.connect(ng); ng.connect(masterGain);
      ns.start(t);
    };

    const scheduleKick = () => {
      if (!bgmPlaying) return;
      const now = audioCtx.currentTime;
      // ダブルバス16分パターン（metal風）
      const pattern = [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1];
      for (let i = 0; i < 16; i++) {
        if (pattern[i]) fireKick(now + i * beat * 0.25);
      }
      kickTimerId2 = setTimeout(scheduleKick, bar * 1000 * 0.9);
    };

    // ── スネア（クラック）──
    const snareNoiseBuf = createNoiseBuffer(0.08);
    const snareOsc = audioCtx.createOscillator();
    const snareOscGain = audioCtx.createGain();
    snareOsc.type = 'triangle';
    snareOsc.frequency.value = 200;
    snareOscGain.gain.value = 0;
    snareOsc.connect(snareOscGain);
    snareOscGain.connect(masterGain);
    snareOsc.start();

    const fireSnare = (t) => {
      // ボディ（タム成分）
      snareOsc.frequency.setValueAtTime(220, t);
      snareOsc.frequency.exponentialRampToValueAtTime(120, t + 0.05);
      snareOscGain.gain.setValueAtTime(0.25, t);
      snareOscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      // スナッピー（ノイズ）
      const ns = audioCtx.createBufferSource();
      const ng = audioCtx.createGain();
      const nf = audioCtx.createBiquadFilter();
      ns.buffer = snareNoiseBuf;
      nf.type = 'bandpass';
      nf.frequency.value = 3000;
      nf.Q.value = 0.8;
      ng.gain.setValueAtTime(0.5, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      ns.connect(nf); nf.connect(ng); ng.connect(masterGain);
      ns.start(t);
    };

    const scheduleSnare = () => {
      if (!bgmPlaying) return;
      const now = audioCtx.currentTime;
      // 2拍・4拍にスネア＋裏にゴーストノート
      fireSnare(now + beat * 1);       // 2拍
      fireSnare(now + beat * 3);       // 4拍
      // ゴーストノート（弱め）
      const ghostT = now + beat * 2.75;
      const ns = audioCtx.createBufferSource();
      const ng = audioCtx.createGain();
      const nf = audioCtx.createBiquadFilter();
      ns.buffer = snareNoiseBuf;
      nf.type = 'bandpass';
      nf.frequency.value = 3000;
      ng.gain.setValueAtTime(0.15, ghostT);
      ng.gain.exponentialRampToValueAtTime(0.001, ghostT + 0.08);
      ns.connect(nf); nf.connect(ng); ng.connect(masterGain);
      ns.start(ghostT);
      snareTimerId = setTimeout(scheduleSnare, bar * 1000 * 0.9);
    };

    // ── ハイハット（16分刻み、オープン混じり）──
    const hatBuf = createNoiseBuffer(0.05);
    const scheduleHat = () => {
      if (!bgmPlaying) return;
      const now = audioCtx.currentTime;
      for (let i = 0; i < 16; i++) {
        const t = now + i * beat * 0.25;
        const isOpen = (i % 4 === 3); // 16分の最後をオープン
        const src = audioCtx.createBufferSource();
        const hg = audioCtx.createGain();
        const hf = audioCtx.createBiquadFilter();
        src.buffer = hatBuf;
        hf.type = 'highpass';
        hf.frequency.value = isOpen ? 7000 : 10000;
        hg.gain.setValueAtTime(i % 2 === 0 ? 0.12 : 0.07, t);
        hg.gain.exponentialRampToValueAtTime(0.001, t + (isOpen ? 0.08 : 0.025));
        src.connect(hf); hf.connect(hg); hg.connect(masterGain);
        src.start(t);
      }
      hatTimerId2 = setTimeout(scheduleHat, bar * 1000 * 0.9);
    };

    // ── クラッシュシンバル（1小節に1回）──
    const crashBuf = createNoiseBuffer(0.5);
    const scheduleCrash = () => {
      if (!bgmPlaying) return;
      const now = audioCtx.currentTime;
      const cs = audioCtx.createBufferSource();
      const cg = audioCtx.createGain();
      const cf = audioCtx.createBiquadFilter();
      cs.buffer = crashBuf;
      cf.type = 'highpass';
      cf.frequency.value = 5000;
      cg.gain.setValueAtTime(0.18, now);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      cs.connect(cf); cf.connect(cg); cg.connect(masterGain);
      cs.start(now);
      crashTimerId = setTimeout(scheduleCrash, bar * 1000 * 0.9);
    };

    let kickTimerId2 = null;
    let snareTimerId = null;
    let hatTimerId2 = null;
    let crashTimerId = null;

    bgmNodes = [
      { node: riffOsc,   gain: rhythmGain },
      { node: riffOsc5th, gain: rhythmGain },
      { node: leadOsc,   gain: leadGain },
      { node: harmOsc,   gain: harmGain },
      { node: kickOsc,   gain: kickGain },
      { node: snareOsc,  gain: snareOscGain },
      { node: vibratoLFO },
      {
        stop: () => {
          clearTimeout(riffTimerId);
          clearTimeout(leadTimerId);
          clearTimeout(harmTimerId);
          clearTimeout(kickTimerId2);
          clearTimeout(snareTimerId);
          clearTimeout(hatTimerId2);
          clearTimeout(crashTimerId);
        }
      }
    ];

    scheduleRiff();
    scheduleLead();
    scheduleHarmonics();
    scheduleKick();
    scheduleSnare();
    scheduleHat();
    scheduleCrash();

    // 10秒後に3秒かけてフェードアウトし、小音量で止める
    const fadeStartDelay = 3000;
    const fadeDuration = 3;
    const fadeOutTimerId = setTimeout(() => {
      if (!bgmPlaying) return;
      bgmPlaying = false; // スケジューラーの次回起動を止める
      const now = audioCtx.currentTime;
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(0.01, now + fadeDuration);
    }, fadeStartDelay);

    // bgmNodesのstopにfadeOutTimerも登録
    bgmNodes.push({
      stop: () => clearTimeout(fadeOutTimerId)
    });
  }
};
