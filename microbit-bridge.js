// ============================================================
//  micro:bit ブリッジ 標準版  v1.2  【拡張機能なしでそのまま動く】
//  PC の「micro:bit リアルタイムスタジオ」「計測・制御スタジオ」から
//  送られてくる命令を実行し、センサー値を送り返す受信役。
//
//  【使い方】
//   1. https://makecode.microbit.org/ →「新しいプロジェクト」
//   2. 画面上の「JavaScript」に切り替える
//   3. エディタの中身を全部消して、これを丸ごと貼り付ける
//   4. 「ダウンロード」して micro:bit に書き込む
//
//  ※LEDテープ(NeoPixel)を使いたい人だけ、代わりに
//    「LEDテープ対応版」(microbit-bridge-neopixel.js)を使ってください。
//    そちらは貼り付ける前に「拡張機能」から neopixel の追加が必要です。
//    この標準版では C/N/F/W(LEDテープ命令)は無視されます。
//
//  【通信のきまり】(PC → micro:bit / 1行1命令)
//    M + 25桁(0-9)   LED画面の明るさを一括指定
//    T + 文字列       文字をスクロール表示
//    S ピン,角度      サーボ
//    A ピン,値        アナログ出力 (0-1023)
//    D ピン,0/1       デジタル出力
//    B 周波数,長さms  音 (長さ0=鳴らしっぱなし / 周波数0=停止)
//    R 0/1            センサー送信のON/OFF
//    P マスク         端子読み取り (bit0=P0,bit1=P1,bit2=P2)
//    X                全リセット
//    ?                生存確認 → "OK" を返す
//  (micro:bit → PC)
//    D:ax,ay,az,温度,明るさ,A,B,p0,p1,p2   ※20回/秒
// ============================================================

serial.redirectToUSB()
serial.setBaudRate(BaudRate.BaudRate115200)
// 受信バッファを拡大(標準は約20バイトで、M+25桁=26文字の命令が
// 途中で切れてLED画面の下の行が点かなくなる)
serial.setRxBufferSize(254)
serial.setTxBufferSize(254)

let streaming = false
let pinMask = 0
let buf = ""
let pos = 0

// ---- 数値の読み取り（MakeCode に split が無いので自前）----
function readNum(): number {
    let sign = 1
    if (pos < buf.length && buf.charAt(pos) == "-") {
        sign = -1
        pos++
    }
    let v = 0
    while (pos < buf.length) {
        let ch = buf.charCodeAt(pos)
        if (ch < 48 || ch > 57) break
        v = v * 10 + (ch - 48)
        pos++
    }
    while (pos < buf.length && buf.charAt(pos) != ",") {
        pos++
    }
    if (pos < buf.length) {
        pos++
    }
    return sign * v
}

function apin(n: number): AnalogPin {
    if (n == 1) return AnalogPin.P1
    if (n == 2) return AnalogPin.P2
    return AnalogPin.P0
}

function dpin(n: number): DigitalPin {
    if (n == 1) return DigitalPin.P1
    if (n == 2) return DigitalPin.P2
    return DigitalPin.P0
}

function resetAll() {
    basic.clearScreen()
    pins.analogPitch(0, 0)
    pins.digitalWritePin(DigitalPin.P0, 0)
    pins.digitalWritePin(DigitalPin.P1, 0)
    pins.digitalWritePin(DigitalPin.P2, 0)
    streaming = false
    pinMask = 0
}

// ---- 命令の実行 ----
function handle(line: string) {
    if (line.length == 0) return
    buf = line
    pos = 1
    let c = line.charAt(0)

    if (c == "M") {
        for (let i = 0; i < 25; i++) {
            let v = line.charCodeAt(1 + i) - 48
            if (v < 0) v = 0
            if (v > 9) v = 9
            led.plotBrightness(i % 5, Math.idiv(i, 5), v * 28)
        }
    } else if (c == "T") {
        let msg = line.substr(1, line.length - 1)
        control.inBackground(function () {
            basic.showString(msg)
        })
    } else if (c == "S") {
        let sp = readNum()
        let sa = readNum()
        pins.servoWritePin(apin(sp), sa)
    } else if (c == "A") {
        let ap = readNum()
        let av = readNum()
        pins.analogWritePin(apin(ap), av)
    } else if (c == "D") {
        let dp = readNum()
        let dv = readNum()
        pins.digitalWritePin(dpin(dp), dv)
    } else if (c == "B") {
        let f = readNum()
        let ms = readNum()
        if (f <= 0) {
            pins.analogPitch(0, 0)
        } else if (ms > 0) {
            control.inBackground(function () {
                pins.analogPitch(f, ms)
            })
        } else {
            pins.analogPitch(f, 0)
        }
    } else if (c == "R") {
        streaming = readNum() == 1
    } else if (c == "P") {
        pinMask = readNum()
    } else if (c == "X") {
        resetAll()
    } else if (c == "?") {
        serial.writeLine("OK")
    }
    // C/N/F/W (LEDテープ) はこの標準版では何もしない
}

// ---- 受信 ----
serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    handle(serial.readUntil(serial.delimiters(Delimiters.NewLine)))
})

// ---- センサー値の送信（20回/秒）----
control.inBackground(function () {
    while (true) {
        if (streaming) {
            let p0 = -1
            let p1 = -1
            let p2 = -1
            if ((pinMask & 1) != 0) p0 = pins.analogReadPin(AnalogPin.P0)
            if ((pinMask & 2) != 0) p1 = pins.analogReadPin(AnalogPin.P1)
            if ((pinMask & 4) != 0) p2 = pins.analogReadPin(AnalogPin.P2)
            serial.writeLine("D:"
                + input.acceleration(Dimension.X) + ","
                + input.acceleration(Dimension.Y) + ","
                + input.acceleration(Dimension.Z) + ","
                + input.temperature() + ","
                + input.lightLevel() + ","
                + (input.buttonIsPressed(Button.A) ? 1 : 0) + ","
                + (input.buttonIsPressed(Button.B) ? 1 : 0) + ","
                + p0 + "," + p1 + "," + p2)
        }
        basic.pause(50)
    }
})

// ---- 起動 ----
basic.showIcon(IconNames.Yes)
basic.pause(300)
basic.clearScreen()
serial.writeLine("READY")
