// Build cho zmp deploy: tạo dist/ + đặt listSyncJS thủ công.
// KHÔNG dùng `zmp sync-config` (nó nhồi <script> vào template literal → backtick
// trong code làm vỡ cú pháp). Nạp SDK Zalo (browser build) TRƯỚC inline.js để
// inline.js dùng được window.ZaloMiniAppSDK.openWebview/openOutApp.
import fs from 'fs';
const s = fs.readFileSync('index.html','utf8');
const js = s.match(/<script>\n([\s\S]*)\n<\/script>/)[1];
const c = JSON.parse(fs.readFileSync('app-config.json','utf8'));
c.listSyncJS=['zmp-sdk.js','inline.js']; c.listCSS=[]; c.listAsyncJS=[];
fs.writeFileSync('app-config.json', JSON.stringify(c,null,2));
// Xuất ra CẢ dist/ và www/ (zmp deploy mặc định tìm www/) — app-config.json nằm cùng thư mục assets.
for(const dir of ['dist','www']){
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(dir+'/index.html', s);
  fs.writeFileSync(dir+'/inline.js', js);
  fs.copyFileSync('node_modules/zmp-sdk/browser.min.js', dir+'/zmp-sdk.js');
  fs.writeFileSync(dir+'/app-config.json', JSON.stringify(c,null,2));
}
console.log('OK: www/ + dist/ {app-config.json, zmp-sdk.js, inline.js} ('+js.length+'B). listSyncJS=', c.listSyncJS);
