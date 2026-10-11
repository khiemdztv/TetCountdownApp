/*
 * Điểm vào để build gói trò chơi dân gian thành một bundle duy nhất.
 *
 * VÌ SAO CẦN: gói gốc là React + TypeScript nhiều file, còn app đích
 * (Neutralino) chỉ nạp được file .js thường qua thẻ <script>. esbuild sẽ
 * gộp React + toàn bộ component + logic trò chơi vào một file, đồng thời
 * nhúng luôn ảnh (assets) dưới dạng data URI.
 *
 * Kết quả: window.TetGames.mount(element) để gắn vào app chính.
 */

import { createElement } from 'react';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { FolkGames } from './components/games/FolkGames';

export type TetGamesApi = {
  mount: (
    el: HTMLElement,
    opts?: { sound?: boolean; motion?: boolean; petals?: boolean }
  ) => void;
  unmount: (el: HTMLElement) => void;
  lastError: () => string | null;
};

const roots = new WeakMap<HTMLElement, Root>();

/*
 * Bắt lỗi render.
 *
 * VÌ SAO CẦN: React 19 nuốt lỗi trong quá trình render nếu không có
 * ErrorBoundary, khiến phần tử đích rỗng mà không rõ lý do. Ở đây ghi lại
 * lỗi cuối cùng để app chính hiển thị ra màn hình thay vì im lặng.
 */
let lastError: string | null = null;
let lastInfo: string | null = null;

class GameErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    lastError = error.message;
    lastInfo = info.componentStack || null;
    // Ghi ra console để bộ ghi log của app bắt được
    console.error('[TetGames] loi render:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return createElement(
        'div',
        {
          style: {
            padding: '16px',
            color: '#ffb4a2',
            fontFamily: 'monospace',
            fontSize: '12px',
            whiteSpace: 'pre-wrap',
          },
        },
        'Lỗi trò chơi: ' + this.state.error.message
      );
    }
    return this.props.children;
  }
}

const api: TetGamesApi = {
  /**
   * Gắn tab trò chơi vào một phần tử.
   * Gọi lại nhiều lần trên cùng phần tử sẽ không tạo root trùng.
   */
  mount(el, opts = {}) {
    const { sound = true, motion = true, petals = true } = opts;
    lastError = null;

    let root = roots.get(el);
    if (!root) {
      try {
        root = createRoot(el);
        roots.set(el, root);
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error('[TetGames] createRoot loi:', err);
        return;
      }
    }

    try {
      root.render(
        createElement(
          GameErrorBoundary,
          null,
          createElement(
            'div',
            { className: 'tet-games-theme tet-games-tab' },
            createElement(FolkGames, { sound, motion, petals })
          )
        )
      );
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error('[TetGames] render loi:', err);
    }
  },

  unmount(el) {
    const root = roots.get(el);
    if (root) {
      try {
        root.unmount();
      } catch {
        /* bỏ qua */
      }
      roots.delete(el);
    }
  },

  lastError: () => lastError || lastInfo,
};

declare global {
  interface Window {
    TetGames?: TetGamesApi;
  }
}

window.TetGames = api;
