/* Sửa danh sách specialEvents: date theo MM-DD, title và content là văn bản thuần.
 * Sự kiện âm lịch trong danh sách này cần cập nhật ngày dương lịch mỗi năm.
 * Dữ liệu dưới đây giữ nguyên nội dung người dùng cung cấp.
 */
(() => {
  'use strict';
  const specialEvents = [
  {
    "date": "10-20",
    "title": "🌸 Chúc mừng Ngày Phụ nữ Việt Nam 20/10!",
    "content": "Nhân ngày 20/10, chúc một nửa thế giới luôn xinh đẹp, hạnh phúc và thành công. Hãy dành những lời chúc tốt đẹp nhất đến những người phụ nữ yêu thương của bạn nhé!"
  },
  {
    "date": "11-20",
    "title": "📚 Chúc mừng Ngày Nhà giáo Việt Nam 20/11!",
    "content": "Tôn sư trọng đạo là truyền thống quý báu. Hôm nay là dịp để tri ân những người lái đò thầm lặng. Chúc các thầy cô giáo luôn dồi dào sức khỏe và nhiệt huyết với sự nghiệp trồng người."
  },
  {
    "date": "12-22",
    "title": "🇻🇳 Ngày thành lập Quân đội Nhân dân Việt Nam 22/12",
    "content": "Kỷ niệm ngày thành lập Quân đội Nhân dân Việt Nam và Ngày hội Quốc phòng toàn dân. Tự hào truyền thống vẻ vang, ghi nhớ công ơn của các thế hệ cha anh đã bảo vệ Tổ quốc!"
  },
  {
    "date": "01-01",
    "title": "🎆 Chúc mừng Năm Mới 2027!",
    "content": "Tạm biệt 2026, chào đón 2027! Một năm mới với nhiều cơ hội mới và niềm vui mới. Chỉ còn một khoảng thời gian ngắn nữa là đến Tết Nguyên Đán, hãy cùng đếm ngược nào!"
  },
  {
    "date": "01-09",
    "title": "🎓 Ngày Truyền thống Học sinh, Sinh viên 09/01",
    "content": "Kỷ niệm ngày truyền thống HSSV Việt Nam! Chúc các bạn học sinh, sinh viên luôn tràn đầy năng lượng, học tập thật tốt và vững bước trên con đường chinh phục ước mơ."
  },
  {
    "date": "01-29",
    "title": "🐟 Tiễn Ông Công Ông Táo (23 Tháng Chạp)",
    "content": "Hôm nay là 23 tháng Chạp năm Bính Ngọ! Theo phong tục, đây là ngày tiễn Ông Công, Ông Táo về trời. Không khí Tết đã thực sự gõ cửa rồi, bạn đã dọn dẹp nhà cửa chưa?"
  },
  {
    "date": "02-03",
    "title": "🚩 Kỷ niệm Ngày thành lập Đảng 03/02",
    "content": "Kỷ niệm 97 năm Ngày thành lập Đảng Cộng sản Việt Nam (03/02/1930 - 03/02/2027). Một cột mốc lịch sử quan trọng của dân tộc. Mùa xuân đang đến rất gần!"
  },
  {
    "date": "02-05",
    "title": "🎇 Giao thừa Tết Đinh Mùi đã đến!",
    "content": "Hôm nay là 30 Tết! Tối nay chúng ta sẽ cùng đón khoảnh khắc chuyển giao năm mới. Hãy hoàn tất mọi công việc để quây quần bên gia đình và đón một cái Tết thật đầm ấm nhé!"
  }
];
  const STORAGE_KEY = 'lastPopupDate';
  const native = window.Neutralino || null;
  // Phiên kiểm thử riêng không ghi đè lịch sử popup của người dùng.
  const nativeKey = new URLSearchParams(location.search).has('test')
    ? 'daily-event-popup-test-date' : STORAGE_KEY;
  // localStorage của Electron ổn định. Neutralino dùng cổng ngẫu nhiên,
  // nên lưu thêm bằng native storage để không hiện lại khi đổi origin.
  const nativeReady = native
    ? new Promise(resolve => native.events.on('ready', () => resolve(native)))
    : Promise.resolve(null);
  let overlay, closeButton, title, content;
  let previousFocus = null, background = [], closeTimer = null;
  let queue = Promise.resolve(false);

  function dateInfo(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const value = type => parts.find(part => part.type === type).value;
    const monthDay = value('month') + '-' + value('day');
    return { monthDay, fullDate: value('year') + '-' + monthDay };
  }

  function finishClose() {
    clearTimeout(closeTimer);
    overlay.hidden = true;
    overlay.classList.remove('is-visible', 'is-closing');
    overlay.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('daily-event-open');
    for (const [element, wasInert] of background) element.inert = wasInert;
    background = [];
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }

  function close() {
    if (!overlay || overlay.hidden || overlay.classList.contains('is-closing')) return;
    overlay.classList.add('is-closing');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finishClose();
    else closeTimer = setTimeout(finishClose, 260);
  }

  function show(event) {
    // textContent không thực thi HTML/script trong dữ liệu sự kiện.
    title.textContent = event.title;
    content.textContent = event.content;
    previousFocus = document.activeElement;
    background = [...document.body.children]
      .filter(element => element !== overlay && element.tagName !== 'SCRIPT')
      .map(element => [element, element.inert]);
    for (const [element] of background) element.inert = true;
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-visible');
    document.documentElement.classList.add('daily-event-open');
    closeButton.focus({ preventScroll: true });
  }

  async function checkOnce(now) {
    if (!overlay || !overlay.hidden) return false;
    const { monthDay, fullDate } = dateInfo(now);
    const event = specialEvents.find(item => item.date === monthDay);
    if (!event) return false;
    try {
      if (localStorage.getItem(STORAGE_KEY) === fullDate) return false;
      const api = await nativeReady;
      if (api) {
        let stored = null;
        try { stored = await api.storage.getData(nativeKey); }
        catch (error) { if (error.code !== 'NE_ST_NOSTKEX') throw error; }
        if (stored === fullDate) {
          localStorage.setItem(STORAGE_KEY, fullDate);
          return false;
        }
        await api.storage.setData(nativeKey, fullDate);
      }
      // Ghi ngay lúc hiện, không đợi người dùng bấm Đóng.
      localStorage.setItem(STORAGE_KEY, fullDate);
      show(event);
      return true;
    } catch (error) {
      // Nếu không lưu được thì bỏ qua, tránh spam mỗi lần mở app.
      console.warn('[DailyEventPopup] Không lưu được ngày đã thông báo:', error);
      return false;
    }
  }

  function check(now = new Date()) {
    queue = queue.then(() => checkOnce(now));
    return queue;
  }

  function init() {
    overlay = document.getElementById('daily-event-popup');
    closeButton = document.getElementById('daily-event-confirm');
    title = document.getElementById('daily-event-title');
    content = document.getElementById('daily-event-content');
    if (!overlay || !closeButton || !title || !content) return false;
    overlay.querySelectorAll('[data-daily-event-close]').forEach(button => button.addEventListener('click', close));
    overlay.addEventListener('animationend', event => {
      if (event.target === overlay && event.animationName === 'daily-event-fade-out') finishClose();
    });
    // Capture chặn phím tắt của app khi modal đang mở, đặc biệt Escape.
    window.addEventListener('keydown', event => {
      if (overlay.hidden) return;
      event.stopImmediatePropagation();
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const buttons = [...overlay.querySelectorAll('button')];
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }, true);
    return check();
  }

  const ready = document.readyState === 'loading'
    ? new Promise(resolve => document.addEventListener('DOMContentLoaded', () => resolve(init()), { once: true }))
    : Promise.resolve(init());
  window.DailyEventPopup = { specialEvents, check, close, dateInfo, ready };
})();
