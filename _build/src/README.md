# Tet Game Tab — Đinh Mùi 2027

Gói mã nguồn 5 trò chơi dân gian (Bầu Cua Tôm Cá, Tài Xỉu, Tiến Lên Miền Nam, Xì Dách, Poker) với chủ đề Tết sơn mài đỏ son – vàng kim. Xu ảo, chỉ chơi trong phiên, không có backend, không tiền thật.

## Cấu trúc

```
tet-game-tab/
├── GameTab.tsx            # Component chính: <GameTab sound motion petals />
├── games.css              # Toàn bộ CSS riêng biệt (theme .tet-games-theme)
├── dependencies.json      # Danh sách dependencies
├── components/
│   ├── games/             # 9 file: FolkGames, BauCua, TaiXiu, TienLen, XiDach,
│   │                      # Poker, PlayingCard, SymbolArt, game-audio
│   └── ui/                # button.tsx, dialog.tsx (shadcn, đã đổi import tương đối)
├── lib/                   # luật chơi thuần: folk-games, taixiu, cards, tienlen,
│   │                      # xidach, poker, utils + 2 bộ test (taixiu, card-games)
├── types/pokersolver.d.ts # Kiểu cho pokersolver
└── assets/                # bát/đĩa sơn mài, linh vật Bầu Cua, mặt bài, bàn bài
```

## Tích hợp

1. Chép thư mục `tet-game-tab/` vào dự án, ví dụ `src/features/tet-game-tab/`.

2. Cài dependencies (xem `dependencies.json`):

```sh
bun add @radix-ui/react-dialog @radix-ui/react-slot class-variance-authority clsx lucide-react pokersolver tailwind-merge
```

3. Thêm fonts vào `<head>` (trang chủ, ví dụ `src/routes/__root.tsx`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Dancing+Script:wght@500;600&display=swap" rel="stylesheet" />
```

4. Tailwind CSS v4: khai báo nguồn để Tailwind quét class trong thư mục mới (trong file CSS chính của dự án):

```css
@source "../src/features/tet-game-tab";
```

Component dùng các class shadcn/Tailwind (`bg-primary`, `text-primary-foreground`, `border-input`, `bg-accent`, `ring-ring`…). Nếu dự án đã có theme shadcn chuẩn thì dùng ngay; nếu chưa, thêm mapping:

```css
@theme inline {
  --color-primary: var(--primary); --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary); --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted); --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent); --color-accent-foreground: var(--accent-foreground);
  --color-border: var(--border); --color-input: var(--input); --color-ring: var(--ring);
  --color-destructive: var(--destructive); --color-destructive-foreground: var(--destructive-foreground);
  --radius-md: 6px; --radius-lg: 8px;
}
:root {
  --primary: oklch(.82 .115 79); --primary-foreground: oklch(.24 .057 28);
  /* … các token còn lại theo hệ shadcn của bạn … */
}
```

Không chép đè stylesheet của app hiện tại bằng `games.css` — file này tự đóng gói trong `.tet-games-theme` và `.tet-games-tab`.

5. Sử dụng:

```tsx
import { GameTab } from '@/features/tet-game-tab/GameTab';

<GameTab sound motion petals />
```

- `sound` (mặc định true): cho phép âm thanh Web Audio (nhạc nền pentatonic + hiệu ứng, có nút tắt/bật và âm lượng trong tab).
- `motion` (mặc định true): tắt để bỏ animation (khớp `prefers-reduced-motion` của host).
- `petals` (mặc định true): hoa đào rơi quanh khu trò chơi.

Kích thước: 720×390px trên desktop, tự giãn tối thiểu 520px dưới 700px.

6. Đường dẫn import bên trong gói đã đổi sang tương đối (`../ui/…`, `../../lib/…`, `../../assets/…`); không cần cấu hình alias `@/`.

## Luật nhanh

- **Tài Xỉu**: 3 xúc xắc; Xỉu 4–10, Tài 11–17; bộ ba cả hai cửa đều thua; trúng hoàn cược + 1:1; bắt đầu 1.000 Xu; chip 10/50/100/500/MAX.
- **Bầu Cua**: trúng 1/2/3 mặt trả 1/2/3 lần cược cộng lại vốn; chip 10/50/100/500/All-in; 1.000 Xu.
- **Tiến Lên**: 13 lá, 3 bích đi trước; 3 đôi thông chặt 2 đơn, tứ quý/bốn đôi thông chặt 2; thắng +150 Xu.
- **Xì Dách**: A = 1/11; Xì Bàn > Xì Dách > Ngũ Linh > điểm; dằn từ 16; Nhà Cái rút tới ≥17.
- **Poker**: Texas Hold'em 5 ghế, blinds 10/20, side pot theo mức góp, đánh giá bộ bài bằng pokersolver.

Chạy test: `bunx vitest run` với `lib/` làm root test (9 test Tài Xỉu + 20 test bài).
