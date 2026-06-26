// Build cho zmp deploy: tạo dist/inline.js = script trong index.html (KHÔNG dùng zmp sync-config,
// vì nó nhồi <script> vào template literal → backtick trong code làm vỡ cú pháp).
import fs from 'fs';
const s = fs.readFileSync('index.html','utf8');
const js = s.match(/<script>\n([\s\S]*)\n<\/script>/)[1];
fs.mkdirSync('dist',{recursive:true});
fs.writeFileSync('dist/index.html', s);
fs.writeFileSync('dist/inline.js', js);
const c = JSON.parse(fs.readFileSync('app-config.json','utf8'));
c.listSyncJS=['inline.js']; c.listCSS=[]; c.listAsyncJS=[];
fs.writeFileSync('app-config.json', JSON.stringify(c,null,2));
console.log('OK: dist/inline.js', js.length, 'bytes. Giờ chạy: zmp deploy (chọn dist).');
