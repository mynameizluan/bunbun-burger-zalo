// Build cho zmp deploy: tạo dist/ + đặt listSyncJS thủ công.
// KHÔNG dùng `zmp sync-config` (nó nhồi <script> vào template literal → backtick
// trong code làm vỡ cú pháp). Nạp SDK Zalo (browser build) TRƯỚC inline.js để
// inline.js dùng được window.ZaloMiniAppSDK.openWebview/openOutApp.
import fs from 'fs';
const s = fs.readFileSync('index.html','utf8');
const js = s.match(/<script>\n([\s\S]*)\n<\/script>/)[1];
fs.mkdirSync('dist',{recursive:true});
fs.writeFileSync('dist/index.html', s);
fs.writeFileSync('dist/inline.js', js);
fs.copyFileSync('node_modules/zmp-sdk/browser.min.js', 'dist/zmp-sdk.js');
const c = JSON.parse(fs.readFileSync('app-config.json','utf8'));
c.listSyncJS=['zmp-sdk.js','inline.js']; c.listCSS=[]; c.listAsyncJS=[];
fs.writeFileSync('app-config.json', JSON.stringify(c,null,2));
console.log('OK: dist/{zmp-sdk.js, inline.js} ('+js.length+'B). listSyncJS=', c.listSyncJS, '\nGiờ chạy: zmp deploy (chọn dist).');
