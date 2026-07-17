// microbit-bridge.js(標準版) と microbit-bridge-neopixel.js(LEDテープ対応版)を
// index.html の表示用コピーに流し込む。直したら  node build-embed.js  で同期。
const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
for (const [file, id] of [['microbit-bridge.js', 'bridgeSrc'], ['microbit-bridge-neopixel.js', 'bridgeNpSrc']]) {
  const src = fs.readFileSync(file, 'utf8').trim();
  if (src.includes('</script')) throw new Error(file + ' に </script が含まれています');
  const re = new RegExp(`(<script type="text/plain" id="${id}">)[\\s\\S]*?(</script>)`);
  if (!re.test(html)) throw new Error(id + ' の埋め込み先が見つかりません');
  html = html.replace(re, `$1\n${src}\n$2`);
  console.log('embedded', file, src.length, 'chars');
}
fs.writeFileSync('index.html', html);
