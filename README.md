# TetCountdownApp 🧧

Ứng dụng desktop đếm ngược tới **Tết Nguyên Đán 2027 — mùng 1 tháng Giêng năm Đinh Mùi,
tức thứ Bảy ngày 06/02/2027**. Giao diện tông **vàng – đỏ**, bốn tab,
trình phát nhạc, lời chúc mỗi ngày, tự mở cùng Windows.

> **Đã chuyển từ Electron sang Neutralino** để giảm dung lượng từ 148 MB xuống **53,1 MB**.

---


## Tải app và mã nguồn

[![Lượt tải app](https://img.shields.io/github/downloads/khiemdztv/TetCountdownApp/TetCountdown2027-Windows-x64.zip?displayAssetName=false&label=downloads)](https://github.com/khiemdztv/TetCountdownApp/releases)
[![Bản mới nhất](https://img.shields.io/github/v/release/khiemdztv/TetCountdownApp)](https://github.com/khiemdztv/TetCountdownApp/releases/latest)

- **App Windows x64:** mở [Releases](https://github.com/khiemdztv/TetCountdownApp/releases/latest), tải `TetCountdown2027-Windows-x64.zip`, giải nén toàn bộ rồi chạy file exe.
- **Source:** nút **Code → Download ZIP** hoặc `git clone https://github.com/khiemdztv/TetCountdownApp.git`.
- Cần Windows có Microsoft Edge WebView2 Runtime. Bản ZIP kèm cả ba album nhạc.
- Badge cộng lượt tải file ZIP app qua các release; không cộng lượt tải manifest hoặc gói cập nhật. Đây là lượt tải, không phải số người dùng duy nhất. Tên ZIP được giữ cố định qua các phiên bản để cộng được số lượt.

## Cập nhật trực tiếp trong app

Mở **Cài đặt → Kiểm tra cập nhật → Cập nhật và mở lại**. App cũng tự kiểm tra một lần mỗi ngày khi khởi động. Gói `resources.neu` hiện khoảng 6 MB; giữ nguyên thư mục nhạc và dữ liệu người dùng.

App xác minh kích thước, SHA256, nguồn tải và phiên bản trước khi cài. Bộ cập nhật chờ app thoát, thay gói tài nguyên, rồi mở lại. Nếu bản mới không hoàn tất khởi động trong 30 giây, nó khôi phục gói trước. Chạy `npm run test:update` để kiểm chứng tải thật, cài thật, giữ nhạc/storage, từ chối checksum sai và khôi phục khi khởi động lỗi trong một phiên ẩn riêng.

Cơ chế này cập nhật HTML/CSS/JS và trò chơi. Khi thay nhân Neutralino hoặc thay nội dung nhạc, phát hành ZIP đầy đủ; tăng `minimumRuntimeVersion` nếu bản mới cần nhân mới. Không nhúng token GitHub vào app.

## Chuẩn bị source từ máy mới

Cần Node.js 22 và Git. Chạy tại thư mục dự án:

```powershell
npm ci
npm ci --prefix _build
npm run setup:native
npm run sync
npm run build:games
npm test
npm run start:native
```

`setup:native` tải Neutralino 6.10.0 từ release chính thức và kiểm tra SHA256. Font, ảnh và nhạc được chép từ `assets/`. Client Neutralino nằm trong `vendor/`. Các file sinh ra, nhật ký và storage không đưa vào Git.

## Phát hành phiên bản mới

1. Tăng version trong `package.json` bằng `npm version patch --no-git-tag-version`.
2. Chạy `npm run release:native`, `npm test` và `npm run test:update`.
3. Commit thay đổi, tạo tag tương ứng (ví dụ `v1.0.1`) và push code cùng tag.
4. GitHub Actions tạo **draft release** với bốn file: ZIP app, `resources.neu`, `update-manifest.json`, `SHA256SUMS.txt`.
5. Kiểm tra draft rồi bấm **Publish release**. Người dùng sẽ nhận bản mới trong app ở lần kiểm tra tiếp theo.

Bản build local nằm trong `dist/release/v<version>/`. Nếu upload thủ công, dùng tag khớp version và đính kèm đủ bốn file trên. Chỉ release công khai, không phải draft/prerelease, mới được app nhận.

Giấy phép MIT áp dụng cho mã ứng dụng; xem [thông tin thành phần bên ngoài](vendor/NOTICE.md) cho runtime và các tài sản đi kèm.

## Hai phiên bản trong dự án

| | Electron | Neutralino |
|---|---|---|
| Vị trí | `main.js`, `preload.js`, `src/renderer.js` | `native/` |
| Dung lượng | 148 MB (bộ cài) | **53,1 MB** (thư mục chạy) |
| Nhân | Electron 180 MB | Neutralino **2,34 MB** |
| Giao diện | bản tham chiếu cũ | bản chính, đủ 4 tab và 5 game |

**Bản Neutralino là bản chính** (nhẹ hơn nhiều). Bản Electron giữ lại để tham chiếu.

## Điểm nổi bật

| Chức năng | Mô tả |
|---|---|
| **Bốn tab** | Đếm ngược · Lịch Tết · Lời chúc · Trò chơi; ba tab chính vừa màn hình mặc định |
| **Trò chơi dân gian** | Bầu Cua, Tài Xỉu, Tiến Lên, Xì Dách, Poker; Xu ảo, nhạc và âm thanh riêng |
| **Lịch Tết 2 cột** | Lịch tháng bên trái (có ngày âm lịch), các mốc Tết bên phải, kèm thẻ đếm ngược mốc kế tiếp |
| **Trình phát nhạc** | 48 bài / 3 album, mỗi lần mở chọn **ngẫu nhiên**, tự chạy hết danh sách rồi quay lại đầu |
| **Lời chúc mỗi ngày** | 132 lời chúc, 80 bài thơ, 9 dịp lễ — cố định trong ngày, sang ngày mới tự đổi |
| **Nền động** | Pháo hoa nổ liên tục, hoa mai vàng và hoa đào hồng rơi, 3 đèn lồng đung đưa |
| **Tự mở cùng Windows** | Tự bật ở lần chạy đầu; bật/tắt bằng công tắc |
| **Khay hệ thống** | Đóng cửa sổ vẫn chạy và **vẫn phát nhạc**; menu khay có điều khiển nhạc |
| **Icon dê chibi** | Đồng bộ icon file exe, cửa sổ, thanh tác vụ và khay hệ thống |

## Cách dùng

1. Mở `native\TetCountdownApp.exe`.
2. Nhạc tự phát ngay khi dữ liệu sẵn sàng; bấm ▶ để tạm dừng/phát lại.
3. Bấm `☰` để xem danh sách 48 bài; bấm bài bất kỳ để phát.
4. Bấm **✕** hoặc **–** để thu nhỏ xuống khay; nhạc vẫn phát.
5. Nháy đúp icon con dê dưới khay để mở lại.

### Đổi đơn vị hiển thị

Dưới dãy ô đếm ngược có hàng nút nhỏ: **Tất cả · Ngày · Giờ · Phút · Giây**.

- **Tất cả** (mặc định): hiện đủ 4 ô Ngày / Giờ / Phút / Giây.
- **Ngày / Giờ / Phút / Giây**: chỉ hiện **một ô** với **tổng số đơn vị** còn lại
  (ví dụ chọn "Giây" sẽ thấy \`10220906\` — tổng số giây, không chia nhỏ).

Khi chỉ hiện một đơn vị, phần tiêu đề phía trên tự thu gọn để nhường chỗ cho ô số
to hơn, và ô được canh giữa.

Lựa chọn được **ghi nhớ**, mở lại app vẫn giữ nguyên.

Phím tắt **\`U\`** để xoay vòng nhanh giữa các đơn vị.

## Phím tắt

| Phím | Tác dụng |
|---|---|
| `1` `2` `3` | Chuyển tab Đếm ngược / Lịch Tết / Lời chúc |
| `Space` | Bắn một quả pháo hoa |
| `P` | Phát/tạm dừng nhạc |
| `←` `→` | Bài trước / bài kế tiếp |
| `N` | Đổi lời chúc khác |
| `U` | Xoay vòng đơn vị hiển thị |
| `Esc` | Ẩn xuống khay |
| Nháy đúp chuột | Nổ pháo hoa tại vị trí con trỏ |

## Nhạc tự phát khi mở app

Nhạc bắt đầu ngay trong luồng khởi động, trước khi đọc cài đặt và kiểm tra shortcut Startup. Không còn lời nhắc “Bấm để bật nhạc”, nút gợi ý hay hiệu ứng nhấp nháy. Không có thời gian chờ chủ động; âm thanh bắt đầu khi WebView2 tải xong dữ liệu nhạc.

Cấu hình `modes.window.webviewArgs` trong `native/neutralino.config.json` dùng `--autoplay-policy=no-user-gesture-required`. [Neutralino hỗ trợ truyền tham số cho WebView2](https://neutralino.js.org/docs/configuration/neutralino.config.json/#modeswindowwebviewargs-string). Không cần lấy focus hoặc gửi phím F24.

Chạy `npm run test:music` để kiểm tra bằng hai hồ sơ WebView2 mới, cửa sổ ẩn và không cấp user gesture từ DevTools. Test xác nhận nhạc không tắt tiếng, âm lượng lớn hơn 0, thời gian phát tăng, không hiện lời nhắc và nút tạm dừng/phát lại hoạt động. Kết quả ở `verification/music-autoplay.json`.

Các test UI/popup dùng bản cấu hình tạm có thêm cổng debug riêng; không đặt cổng debug vào cấu hình dùng hằng ngày. Nhận định cũ rằng runtime từ chối `webviewArgs` đã được kiểm tra lại: phiên không mở được cổng debug là do cấu hình này thay thế browser arguments trong biến môi trường.

## Kho nhạc — 3 album, 48 bài

App gồm **3 album**, mỗi album là một file mix liền mạch nên mỗi bài được đánh
dấu bằng mốc thời gian bắt đầu (xem `src/playlist-data.js`).

| Album | Số bài | Thời lượng | File |
|---|---:|---|---|
| Tuyển tập Bùi Công Nam | 23 | 76 phút | `tet-mix.opus` |
| Nhạc Xuân Chill 2027 | 18 | 72 phút | `xuan-chill.opus` |
| Playlist Nhạc Tết | 7 | 29 phút | `tet-playlist.opus` |

### Cách chọn bài

- **Mở app:** chọn **ngẫu nhiên một bài trong cả 48 bài** (cả 3 album).
- **Bấm ▶▶ / ◀◀:** đi tuần tự **trong cùng album**; hết album thì sang album kế.
- **Bật ⤨ (ngẫu nhiên):** nhảy ngẫu nhiên giữa **cả 3 album**.
- **Danh sách phát:** nhóm theo album, có tiêu đề từng album.

App tự đổi file khi chuyển sang bài khác album.

### Dò mốc thời gian tự động

Mốc từng bài do `scripts/detect-tracks.js` dò bằng cách tìm khoảng lặng
(ffmpeg silencedetect):

```powershell
node scripts/detect-tracks.js "duong-dan-file.mp3" -25dB
```

Ngưỡng khác nhau cho kết quả khác nhau: **-25dB** tách đúng 18/18 bài cho album
Xuân Chill, nhưng album Playlist crossfade liền mạch nên chỉ tách được 7 mốc.
**Cố tình không chia đều cho đủ tên** — mốc sai sẽ làm bài bị cắt giữa chừng,
nghe khó chịu hơn là ít bài mà trọn vẹn.

### Muốn đổi nhạc

Thay file trong `assets/music/` rồi chạy lại `scripts/detect-tracks.js` để lấy
mốc mới, cập nhật `src/playlist-data.js`.

## Lời chúc mỗi ngày

Nội dung chọn theo **băm của ngày**, nên trong ngày mở lại bao nhiêu lần cũng thấy đúng
một lời chúc; sang ngày mới tự đổi. Bấm **↻ Lời chúc khác** để xem câu khác.

| Dịp | Âm lịch | Dương lịch 2027 |
|---|---|---|
| Ông Công Ông Táo | 23 tháng Chạp | 30/01/2027 |
| Tất niên | 29 tháng Chạp | 05/02/2027 |
| Giao thừa | Mùng 1, trước 6 giờ sáng | 06/02/2027 |
| Mùng 1 / 2 / 3 | 1–3 tháng Giêng | 06–08/02/2027 |
| Lễ tạ, tiễn ông bà | 4 tháng Giêng | 09/02/2027 |
| Rằm tháng Giêng | 15 tháng Giêng | 20/02/2027 |
| Những ngày đầu xuân | 5–10 tháng Giêng | 11–16/02/2027 |

## Về thanh tiêu đề

Bản gốc do Lovable tạo có **nút cửa sổ giả** (– ⛶ ✕) vì nó mô phỏng một cửa sổ
bên trong trang web. Bản Neutralino là **cửa sổ thật**, đã có nút của Windows,
nên các nút giả đó đã được gỡ bỏ (trong `index.html`, `renderer-native.js`
và `styles.css`).

Thanh tiêu đề bên trong app vẫn giữ lại phần nhãn hiệu
"✿ Tết 2027 — Đếm ngược ngày đoàn viên" cho đẹp.

## Chạy khi phát triển

### Bản Neutralino (bản chính)

```powershell
cd native
.\TetCountdownApp.exe
```

Nhật ký khởi động ghi vào `native\neutralinojs.log` — mỗi bước đều có dòng `TET: ...`
nên soi lỗi rất nhanh. Muốn mở DevTools: `node scripts\enable-devtools.js on`.

### Bản Electron

```powershell
Remove-Item env:ELECTRON_RUN_AS_NODE   # bat buoc, xem ghi chu duoi
npm install
npm start
```

> Nếu môi trường có `ELECTRON_RUN_AS_NODE=1` (VS Code thường đặt), Electron chạy như Node
> thuần và báo lỗi `Cannot read properties of undefined (reading 'requestSingleInstanceLock')`.

## Các script hỗ trợ

| Script | Việc |
|---|---|
| `npm run sync` | **Đồng bộ `src/` sang `native/resources/`** (bắt buộc sau khi sửa mã nguồn) |
| `npm test` | Lịch âm, lời chúc, mã hoá và 29 test luật game |
| `npm run build:games` | Build gói game từ `_build/src/` |
| `npm run test:ui` | Tự mở một phiên Neutralino ẩn riêng, thử game, âm thanh và bố cục |
| `npm run assets` | Vẽ lại icon con dê |
| `scripts\sync-native.js` | Chuyển `module.exports` → `window.*`, sửa đường dẫn, kiểm tra mã hoá |
| `scripts\apply-calendar-layout.js` | Ghép bố cục 2 cột cho tab Lịch |
| `scripts\fetch-fonts.js` | Tải font về máy để chạy offline |
| `scripts\check-encoding.js` | **Phát hiện chữ bị vỡ mã hoá** (lỗi từng gặp nhiều lần) |
| `scripts\check-font-coverage.js` | Kiểm tra font có đủ ký tự tiếng Việt |
| `scripts\capture-window.ps1` | Chụp ảnh cửa sổ app để kiểm tra giao diện |
| `scripts\enable-devtools.js` | Bật/tắt DevTools cho Neutralino |
| `scripts\inject-error-catcher.js` | Chèn bộ bắt lỗi hiện lên màn hình |
| `scripts\generate-audio.js` | (không dùng nữa) sinh chuông thông báo |

## Cấu trúc mã nguồn

```
native/                        BẢN CHÍNH (Neutralino)
  TetCountdownApp.exe  nhân Neutralino 2,34 MB
  neutralino.config.json        cấu hình cửa sổ, khay, quyền API
  resources/
    index.html                  4 tab; viewport thiết kế 752x732, bù DPI
    styles.css                  tông vàng-đỏ, bố cục từng tab
    renderer.js                 (sinh ra từ src/renderer-native.js)
    lunar.js                    (sinh ra từ src/lunar-browser.js)
    playlist-data.js            (sinh ra từ src/playlist-data.js)
    wishes-data.js              (sinh ra từ src/wishes-data.js)
    fonts/                      9 font đầy đủ tiếng Việt
    img/tet-goat.jpg            ảnh linh vật dê vàng
    music/tet-mix.opus          nhạc 27,9 MB (Opus 48 kbps)
    icons/                      icon app + icon khay
    js/neutralino.js            thư viện client

src/                           MÃ NGUỒN GỐC (sửa ở đây)
  renderer-native.js            giao diện cho Neutralino
  renderer.js                   giao diện cho Electron
  lunar-browser.js              âm lịch cho trình duyệt
  lunar.js                      âm lịch cho Node
  playlist-data.js              48 bài / 3 album + mốc thời gian
  wishes-data.js                132 lời chúc, 80 bài thơ, 9 dịp
  index.html, styles.css        giao diện
  calendar-layout.css           bố cục 2 cột của tab Lịch
  autostart.js                  tự khởi động (chỉ bản Electron)

main.js, preload.js             tiến trình chính của bản Electron
assets/                         font, ảnh, nhạc, icon (nguồn)
scripts/                        script hỗ trợ và kiểm thử
```

> **Quan trọng:** `native/resources/` là bản **sinh ra tự động**. Mọi sửa đổi phải làm
> trong `src/` rồi chạy `npm run sync`. Sửa trực tiếp trong `native/resources/` sẽ bị ghi đè.

## Bài học kỹ thuật đáng nhớ

Những lỗi đã gặp và cách sửa, ghi lại để không lặp lại:

1. **Chữ vỡ mã hoá (mojibake).** PowerShell 5.1 đọc/ghi file mặc định theo ANSI, làm
   "Tết" thành "Táº¿t". **Luôn dùng Node** để sửa file có tiếng Việt, và chạy
   `check-encoding.js` sau mỗi lần sửa.

2. **`format('ttf')` không hợp lệ.** Trong CSS `@font-face`, phải viết `format('truetype')`.
   Viết sai thì trình duyệt **bỏ qua font** và dùng font dự phòng.

3. **Font chia subset gây hở chữ.** Google Fonts trả về nhiều file (latin, vietnamese…)
   có bảng metrics hơi khác nhau, làm "Lời chúc đầu xuân" bị tách khe. Cách sửa: tải CSS
   **không gửi User-Agent** để nhận 1 file font đầy đủ.

4. **CSP chặn token của Neutralino.** Neutralino chèn token qua thẻ `<script>` **inline**;
   CSP `script-src 'self'` chặn nó → lỗi `NE_CL_IVCTOKEN`. Phải thêm `'unsafe-inline'`.

5. **`NL.init()` không phải Promise.** Nó trả về `void`, nên `await NL.init()` **treo mãi**.
   Phải chờ sự kiện `NL.events.on('ready', ...)`.

6. **Đường dẫn tài nguyên.** `documentRoot` là `/resources/`, không phải `/`.

7. **Windows scaling 125%.** Neutralino đặt kích thước theo pixel vật lý, nên cửa sổ
   752 px chỉ còn 602 CSS px → thiếu chỗ, giao diện tràn. Phải đo `devicePixelRatio`
   rồi nhân bù (xem `fitWindowToDesign`).

8. **Đường dẫn tự khởi động sai.** `(Get-Process -Id $PID).Path` trong PowerShell trả về
   **PowerShell**, không phải app. Phải hỏi tiến trình cha hoặc dò theo tên tiến trình.

9. **Script chụp ảnh phải DPI-aware.** Thiếu `SetProcessDPIAware()` thì toạ độ bị ảo hoá
   và ảnh chụp sai kích thước, dễ dẫn tới kết luận sai về giao diện.

## Kiểm chứng giao diện sau hoàn thiện

Chạy `npm run sync`, `npm run build:games`, `npm test` và `npm run test:ui`. Nếu cài mới dependencies, chạy `npm ci` ở thư mục chính và `npm ci --prefix _build`.

Kiểm thử UI dùng WebView2 thật, hồ sơ tạm riêng và cửa sổ ẩn. Tham số `?test=1` chỉ dùng khi phát triển, bỏ thao tác tự khởi động Windows và khay hệ thống. URL của bản dùng hằng ngày vẫn là `/`. Cách mở phiên riêng dựa trên [tham số CLI của Neutralino](https://neutralino.js.org/docs/cli/internal-cli-arguments/).

Kết quả ở `verification/native-ui.json`: ba tab chính không tràn, cả năm game chơi được, nhạc/âm thanh bật tắt được và AudioContext đóng khi rời tab. Sáu ô Bầu Cua là 102×102 CSS px ở cửa sổ mặc định; cửa sổ thấp dùng vùng cuộn, cửa sổ hẹp dùng bố cục dọc có thể cuộn toàn trang.

Không chụp cửa sổ đang dùng bằng `page.screenshot()` qua DevTools: trong phiên kiểm tra đã xuất hiện cửa sổ trắng/đen dù DOM vẫn đầy đủ. Khởi động lại bản bình thường đã khôi phục giao diện, được người dùng xác nhận. Bộ test UI hiện chỉ đọc DOM và số đo, không gọi thao tác chụp này. Ảnh `verification/bau-cua.png` ghi lại giao diện đã sửa trước sự cố; JSON là kết quả của lần kiểm thử cuối.


## Popup sự kiện trong ngày

Danh sách 8 sự kiện ở đầu `src/daily-event-popup.js`: mỗi mục có `date` (MM-DD), `title`, `content`. HTML đã thêm trong `src/index.html`; thiết kế kính mờ đỏ sẫm, viền vàng và hiệu ứng đóng ở `src/daily-event-popup.css`. Tách CSS/JS thành file riêng để tương thích CSP của app.

Khi DOM tải, popup so ngày theo giờ Việt Nam. `localStorage.lastPopupDate` lưu YYYY-MM-DD ngay khi hiện, nên mở lại cùng ngày không hiện nữa và năm sau vẫn có thể hiện. Bản Neutralino lưu thêm qua native storage vì cổng localhost thay đổi sau mỗi lần mở. Nút “Tuyệt vời”, nút × hoặc Escape đóng với fade-out; focus được giữ trong modal và trả lại sau khi đóng.

Sau khi sửa dữ liệu, chạy `npm run sync`. Kiểm thử bằng `npm run test:popup`: dùng phiên Neutralino ẩn riêng, ngày giả lập và khóa lưu riêng, không sửa lịch sử popup của người dùng. Kết quả ở `verification/daily-event-popup.json`. Nhánh Electron/localStorage đã được kiểm tra bằng cửa sổ ẩn chỉ tải HTML/CSS/JS của popup; kết quả ở `verification/daily-event-popup-electron.json`. Các sự kiện âm lịch đang dùng ngày dương lịch do người dùng cung cấp và cần cập nhật theo từng năm.


## Tên và icon ứng dụng

Tên cửa sổ và thông tin ProductName/FileDescription trong file exe là `TetCountdownApp`. Icon dê chibi có nguồn ở `assets/branding/goat-chibi.png`, tạo bằng imagegen tích hợp. `npm run assets` sinh ICO 7 kích thước 16–256px và PNG cho cửa sổ/khay; `npm run brand:native` nhúng icon/metadata vào một bản sao nhân Neutralino. `npm run setup:native` và build release cũng áp dụng branding này.

`npm run test:branding` kiểm tra file exe đã đóng gói, tên cửa sổ thật, handle icon small/big và so pixel icon cửa sổ với ảnh chibi, không chụp WebView qua DevTools. Bản v1.0.0 đã cài vẫn cập nhật được tiêu đề và icon cửa sổ/khay qua resources; để đổi tên file exe và icon file trong Explorer, dùng ZIP đầy đủ của v1.0.1. Tên ZIP phát hành giữ nguyên để link và badge cộng lượt tải qua các phiên bản.
