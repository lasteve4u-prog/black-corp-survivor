# ブラック企業サバイバー ～経営者ゾンビ殲滅戦～

ブラック企業を舞台にした2Dベルトスクロールアクションゲーム。Canvas 2D APIで実装。

## 遊び方

- **移動**：矢印キー / WASD
- **攻撃**：Z / Space
- **特殊攻撃**：X（辞表スラッシュ）
- **ダッシュ**：Shift
- **決定**：Enter
- **ポーズ**：Esc / P

## ゲーム内容

- 3つのエリアを進み、ゾンビ化した社員・上司・役員と戦う
- ラスボスCEOを倒してクリア
- 役職の敵を倒すと札束（最大HPアップ）が確定ドロップ
- コンボを繋げてスコア倍率UP

## 技術

- Pure Vanilla JavaScript（ES Modules）
- Canvas 2D API
- Web Audio API（BGM・効果音すべてプログラム生成）
- ライブラリ・フレームワークなし

## デプロイ

Vercelに静的サイトとしてデプロイ。`index.html` をエントリポイントとする。

```bash
# ローカル起動
python3 -m http.server 8000
# または
npx serve
```
