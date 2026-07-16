// microbit-bridge.js を index.html の <script type="text/plain" id="bridgeSrc"> に流し込む。
// 受信役プログラムを直したら  node build-embed.js  を実行して同期させること。
const fs = require('fs');
const src = fs.readFileSync('microbit-bridge.js', 'utf8').trim();
if (src.includes('</script')) throw new Error('bridge に </script が含まれています');
let html = fs.readFileSync('index.html', 'utf8');
const re = /(<script type="text\/plain" id="bridgeSrc">)[\s\S]*?(<\/script>)/;
if (!re.test(html)) throw new Error('index.html に bridgeSrc の埋め込み先が見つかりません');
html = html.replace(re, `$1\n${src}\n$2`);
fs.writeFileSync('index.html', html);
console.log('embedded', src.length, 'chars');
