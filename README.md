# micro:bit リアルタイムスタジオ

MakeCode とは逆向きの micro:bit 教材。**PC が主役で、micro:bit が手足**。
ブラウザのスライダーを動かすと、その値が USB（Web Serial API）経由で即座に
micro:bit に届き、サーボが回り LED が光る。センサー値は 20回/秒 で返ってきてグラフになる。

書き込み待ちがゼロなので、生徒が「変えて→すぐ試す」を延々と繰り返せるのが狙い。

## ファイル

| ファイル | 中身 |
|---|---|
| `index.html` | アプリ本体（単一HTML・CSS/JS内蔵・外部依存なし） |
| `microbit-bridge.js` | micro:bit に書き込む「受信役」。MakeCode の JavaScript に貼る |
| `build-embed.js` | `microbit-bridge.js` を `index.html` の中の表示用コピーに流し込む |

`index.html` には受信役プログラムのコピーが `<script type="text/plain" id="bridgeSrc">`
として埋め込まれていて、画面上の「コピー」ボタンで取り出せる。
**`microbit-bridge.js` を直したら必ず `node build-embed.js` を実行**して同期させること。

## 使い方

1. micro:bit 側（最初の1回だけ）
   - [makecode.microbit.org](https://makecode.microbit.org/) →「新しいプロジェクト」→「JavaScript」
   - **先に**「拡張機能」から `neopixel` を追加（LEDテープを使わなくても追加が必要）
   - `microbit-bridge.js` を丸ごと貼り付けて「ダウンロード」
2. PC 側（毎回）
   - `index.html` を **Chrome / Edge** で開く（Safari・Firefox は Web Serial 非対応）
   - USB でつないで「つなぐ」→ 一覧から micro:bit を選ぶ

## 通信のきまり

1行1命令のテキスト、115200 baud。

PC → micro:bit

| 命令 | 意味 |
|---|---|
| `M` + 25桁(0-9) | LED画面の明るさを一括指定 |
| `T` + 文字列 | 文字をスクロール表示 |
| `S ピン,角度` | サーボ |
| `A ピン,値` | アナログ出力 (0-1023) |
| `D ピン,0/1` | デジタル出力 |
| `B 周波数,長さms` | 音（長さ0=鳴らしっぱなし / 周波数0=停止） |
| `C ピン,個数` | LEDテープの初期設定 |
| `N 番号,r,g,b` | LEDテープの1粒 |
| `F r,g,b` | LEDテープ全部 |
| `W` | LEDテープに反映 |
| `R 0/1` | センサー送信の ON/OFF |
| `P マスク` | 端子読み取り (bit0=P0, bit1=P1, bit2=P2) |
| `X` | 全リセット |
| `?` | 生存確認 → `OK` が返る |

micro:bit → PC

```
D:ax,ay,az,温度,明るさ,Aボタン,Bボタン,p0,p1,p2      ※20回/秒
```

端子を読んでいないときの `p0`〜`p2` は `-1`。

機能を足したいときは、この表に1行足して `index.html` と `microbit-bridge.js` の
両方に対応する分岐を書けばよい。

## 注意点

- 1つの端子に1つの役割。サーボ・音・LEDテープ・端子読み取りを同じ端子で併用すると取り合いになる
- サーボ複数・LEDテープは micro:bit の 3V では電流が足りない。外部電源＋GND共通で
- MakeCode のタブが開いていると micro:bit を掴んだままで繋がらないことがある
- micro:bit v1 は音のスピーカーが内蔵されていないので P0 と GND にイヤホン等をつなぐ

## テスト

headless Chrome に偽 micro:bit（`navigator.serial` のスタブ）を差し込んで、
UI操作 → 実際に送られる命令、受信 → 表示、を 27項目で検証済み（2026-07-16 時点で全PASS）。
`--dump-dom` の headless はコンポジタが無く `requestAnimationFrame` が1回しか回らないため、
テスト側で `setTimeout` に差し替える必要がある点に注意。
