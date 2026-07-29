// ==UserScript==
// @name         Cendo → Raccoonie | Tạo & tải mockup clicker tại chỗ
// @namespace    raccoonie.tools
// @version      5.1.0
// @description  Vẽ mockup clicker bằng canvas ngay trên trang đơn Cendo và ĐÍNH thẳng vào ô Mockup/Design (không cần tải + upload lại). Có xem trước & tải PNG dự phòng.
// @author       Raccoonie
// @match        *://cendo.work/*
// @match        *://*.cendo.work/*
// @grant        none
// @run-at       document-idle
// --- ĐỂ CẢ TEAM TỰ ĐỘNG CẬP NHẬT: bỏ dấu // ở 2 dòng dưới rồi thay bằng link raw của bạn ---
// @updateURL    https://raw.githubusercontent.com/TAI-KHOAN/REPO/main/cendo-to-raccoonie.user.js
// @downloadURL  https://raw.githubusercontent.com/TAI-KHOAN/REPO/main/cendo-to-raccoonie.user.js
// ==/UserScript==

/*
  ┌──────────────────────────────────────────────────────────────────────┐
  │  ĐỌC TRƯỚC KHI DÙNG                                                   │
  │                                                                       │
  │  1. Sửa @match ở trên cho đúng tên miền trang quản lý đơn của bạn.    │
  │  2. Phần RENDERER (mục 2) đã được đo pixel-by-pixel từ ảnh mẫu của    │
  │     web custom-clicker → không cần sửa gì, ảnh ra giống hệt.          │
  │  3. Phần PARSER (mục 3) là chỗ duy nhất phụ thuộc HTML của Cendo.     │
  │     Nếu nút bấm không tự đọc được External note, mở Console xem log   │
  │     rồi điền selector vào CONFIG.noteSelectors.                       │
  │  4. Bấm nút → mở bảng xem trước, sửa tay được. Shift+bấm → tải PNG.   │
  │                                                                       │
  │  ICON trong External note: viết *MÃ* (dấu sao HAI ĐẦU), mỗi mã=1 phím. │
  │  Icon dùng ĐÚNG path SVG của shop (viewBox 2551), màu theo màu chữ:   │
  │     *HRT* = heart   *STR* = star   *FLW* = flower                     │
  │     *DOG* = dog_feet   *LCK* = lucky_leaf (cỏ 4 lá)                   │
  │     VD: "*HRT*Hieu*STR*" → ♥ H i e u ★ (6 phím). Kiểu cũ *HRT vẫn hiểu.│
  └──────────────────────────────────────────────────────────────────────┘
*/

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════
     1. CẤU HÌNH
     ═══════════════════════════════════════════════════════════════════ */

  const CONFIG = {
    // Độ phân giải xuất ra. 1 = 216px/phím (bằng đúng ảnh mẫu). 2 = ảnh gấp đôi, nét hơn khi in.
    scale: 1,

    // Nền ảnh PNG. Đặt null để nền trong suốt.
    background: '#FFFFFF',

    // ── MÀU: tách riêng MÀU KHAY và MÀU PHÍM, đúng như Cendo ghi ──────
    // Cendo ghi kiểu "Màu: Khay Trắng Phím Tím" → khay = Trắng, phím = Tím.
    // Chỉ tổ hợp "Khay Trắng + Phím Tím" là màu CHUẨN đo từ ảnh mẫu của bạn.
    // Các màu còn lại là ước lượng — cứ sửa mã hex cho khớp sản phẩm thật của shop.

    // Màu chữ mặc định trên phím (vàng gold như ảnh mẫu).
    // Màu chữ mặc định giờ nằm trong từng bộ màu (combos.text), không dùng biến chung nữa.

    // Màu KHAY, khớp theo chữ sau "Khay ..."
    // ── BỘ MÀU TRỌN GÓI (khay + phím + chữ), đo pixel từ ảnh mẫu ──────
    // Mỗi bộ khớp theo tên khay + tên phím Cendo ghi ("Màu: Khay X Phím Y").
    // trayNames / keyNames: các từ khoá (không dấu cũng khớp) để nhận diện.
    // Cạnh 3D của phím (side) được tính tự động = face tối đi 12%.
    combos: [
      { id: 'do-hong',    trayNames: ['đỏ'],                keyNames: ['hồng'],
        tray: '#C23B3B', face: '#F3C2CB', text: '#8A2E3A' },
      { id: 'reu-kem',    trayNames: ['xanh rêu', 'rêu'],    keyNames: ['trắng', 'kem'],
        tray: '#5E6E45', face: '#F7F5EE', text: '#4A5A36' },
      { id: 'kem-do',     trayNames: ['kem', 'trắng'],       keyNames: ['đỏ'],
        tray: '#ECDFC7', face: '#A31F1F', text: '#FDF6EE' },
      { id: 'den-kem',    trayNames: ['đen'],                keyNames: ['trắng', 'kem'],
        tray: '#1F1F1F', face: '#F5F0E8', text: '#1F1F1F' },
      { id: 'trang-tim',  trayNames: ['trắng', 'kem'],       keyNames: ['tím'],
        tray: '#F5F0E8', face: '#B9A6D6', text: '#C8A200' },
      { id: 'sage-cam',   trayNames: ['xanh', 'sage', 'lá'], keyNames: ['cam'],
        tray: '#A8CDB0', face: '#E8772E', text: '#FFF5EA' },
      { id: 'trang-vang', trayNames: ['trắng', 'kem'],       keyNames: ['vàng'],
        tray: '#F5F0E8', face: '#E8C84A', text: '#5A4220' },
    ],
    comboDefault: 'trang-tim',

    // Font chữ trên phím.
    // Kích thước chữ được tính TỰ ĐỘNG theo chiều cao chữ hoa đo từ ảnh mẫu,
    // nên dù đổi font thì chữ vẫn cao đúng bằng mẫu.
    fontFamily: '"Nunito","Baloo 2","Poppins","Segoe UI",system-ui,-apple-system,Arial,sans-serif',
    fontWeight: 800,
    // Nạp font qua CSS Google Fonts (URL bền, tự hết hạn woff2). Đặt fontCssUrl=null nếu không cần.
    fontName: 'Nunito',
    fontCssUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@800&display=swap',

    // Selector trỏ tới ô External note. Để trống thì script tự dò theo nhãn.
    noteSelectors: [
      // ví dụ: '[data-testid="external-note"]', '.order-note-external .content',
    ],

    // Nhãn dùng để tự dò External note khi không có selector.
    noteLabels: [/external\s*note/i, /ghi\s*ch[úu]\s*(ngo[àa]i|kh[áa]ch|đơn)/i, /note\s*kh[áa]ch/i],

    // Số phím tối đa cho phép trên 1 khay.
    maxKeys: 8,

    // ── ĐÍNH ẢNH VÀO WEB ─────────────────────────────────────────────
    // Nhãn của 2 ô upload trong phần Media. Script tìm input file gần các nhãn này.
    uploadTargets: {
      mockup: [/^mockup$/i, /\bmockup\b/i],
      design: [/^design$/i, /\bdesign\b/i, /thi[ếe]t\s*k[ếe]/i],
    },
    // Nếu tự dò sai, điền selector input file trực tiếp vào đây (ưu tiên cao nhất).
    uploadSelectors: {
      mockup: [], // ví dụ: ['#mockup-file-input']
      design: [],
    },
    // Đính ảnh giống nhau vào cả Mockup lẫn Design? true = cả hai.
    fillBoth: true,

    // true = luôn mở bảng xem trước thay vì làm ngay.
    // Đang bật để bạn kiểm tra. Khi ổn rồi đổi thành false để chạy 1 chạm.
    alwaysConfirm: true,
  };

  /* ═══════════════════════════════════════════════════════════════════
     2. RENDERER — đo từ ảnh mẫu, KHÔNG SỬA
     ═══════════════════════════════════════════════════════════════════ */

  // Mọi số dưới đây lấy từ ảnh mẫu ở scale = 1
  const U = {
    key: 216,          // bề rộng phím = chiều cao tổng của phím (gồm cạnh 3D)
    faceH: 208,        // chiều cao mặt phím
    lift: 8,           // độ dày cạnh 3D dưới đáy phím
    radius: 36,        // bo góc phím
    gap: 16,           // khoảng cách giữa 2 phím
    pad: 24,           // đệm quanh khay
    trayRadius: 56,    // bo góc khay
    margin: 74,        // lề trắng quanh khay (chừa chỗ đổ bóng)
    topInset: 6,       // dày viền sáng trong ở đỉnh phím
    capRatio: 0.2176,  // chiều cao chữ hoa / bề rộng phím  (47 / 216)
    maxTextW: 0.72,    // chữ không rộng quá 72% bề rộng phím
  };

  // Path2D bo góc, có fallback cho trình duyệt cũ
  function roundRect(x, y, w, h, r) {
    const p = new Path2D();
    if (typeof p.roundRect === 'function') { p.roundRect(x, y, w, h, r); return p; }
    r = Math.min(r, w / 2, h / 2);
    p.moveTo(x + r, y);
    p.lineTo(x + w - r, y); p.arcTo(x + w, y, x + w, y + r, r);
    p.lineTo(x + w, y + h - r); p.arcTo(x + w, y + h, x + w - r, y + h, r);
    p.lineTo(x + r, y + h); p.arcTo(x, y + h, x, y + h - r, r);
    p.lineTo(x, y + r); p.arcTo(x, y, x + r, y, r);
    p.closePath();
    return p;
  }

  // Bóng lõm (inset shadow): tô phần NGOÀI hình, bóng của nó hắt vào trong vùng clip
  function insetShadow(ctx, path, box, { color, blur, offsetX = 0, offsetY = 0 }) {
    ctx.save();
    ctx.clip(path);
    const outer = new Path2D();
    outer.rect(box.x - 200, box.y - 200, box.w + 400, box.h + 400);
    outer.addPath(path);
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = offsetX;
    ctx.shadowOffsetY = offsetY;
    ctx.fillStyle = '#000';
    ctx.fill(outer, 'evenodd');
    ctx.restore();
  }

  // ── ICON: dùng ĐÚNG path SVG do shop cung cấp (viewBox 2551.18) ────
  // Mỗi icon = { paths: [d,...], w, h } với w,h là bbox nội dung (đã đo)
  // để căn giữa và cỡ đồng đều. Icon tô bằng màu chữ của bộ màu.
  const ICON_VB = 1275.59; // tâm viewBox (nội dung các icon đều căn quanh đây)
  const ICONS = {
    heart:      { w: 1983, h: 1746, paths: ['M1273.22,726.71c9.52,1.7,5.65-1.4,7.6-5.2c52.02-101.09,106.39-172.93,204.75-234c276.38-171.6,617.66-75.84,736.44,231.94c216.78,561.74-382.9,1169.24-845.74,1391.96c-69.56,33.48-102.8,56.79-175.9,13.62C760.49,1865.24,110.61,1314,326.06,732.12c109.14-294.77,425.73-413.47,705.34-266.42C1135.73,520.56,1230.92,616.14,1273.22,726.71z'] },
    star:       { w: 1984, h: 1892, paths: ['M1264.76,330.45c42.57-8.95,81.22,48.62,103.03,79.03c88.1,122.83,144.96,269.32,227.14,395.08c45.98,70.36,68.5,74,148.35,93.32c132.33,32,272.3,44.45,402.81,83.3c28.55,8.51,111.52,34.75,120.98,65.12c10.95,35.07-32.8,92.19-53.21,119.31c-84.77,112.67-195.55,206.71-285.87,314.12c-31.31,37.22-59.82,66.53-62.58,117.97c-5.14,95.91,24.91,227.01,35.88,325.45c8.1,72.66,23.62,181.35,7.38,251.13c-14.74,63.33-64.28,49.1-113.77,35.79c-139.23-37.46-281.7-128.1-416.42-183.6c-93.37-38.46-108.12-39.14-201.8-0.81c-132.94,54.41-266.93,138.15-403.48,179.86c-42.05,12.84-107.5,34.96-126.43-19.6c-20.65-59.54-4.77-181.09,2.36-246.11c11.49-104.77,42.32-236.66,38.65-339.35c-2.33-65.22-77.72-137.5-120.91-184.63c-60.45-65.96-271.82-268.28-281.74-346.01c-3.94-30.88,12.11-43.62,36.78-57.19c117.63-64.7,350.28-81.69,488.01-114.78c71.4-17.15,97.16-19.83,140-82.22c58.54-85.25,104.88-188.94,156.71-279.39C1131.7,492.67,1218.02,340.27,1264.76,330.45z'] },
    flower:     { w: 1982, h: 1926, paths: ['M1696.99,756.56c341.63-129.96,672.79,200.54,541.21,544.57c-48.91,127.87-152.11,209.39-277.16,257.15c109.12,140.39,118.25,346.12,18.42,493.73c-168.86,249.68-535.44,246.9-701.55-1.95c-350.32,465.31-1023.47-16.57-683.01-494.95c-166.16-45.71-298.48-198.5-310.39-372.67c-20.91-305.47,276.9-534.27,564.54-426.07c7.51-5.12,6.91-6.08,7.16-13.76c5.59-170.94,79.96-317.82,240.95-391.16C1389.56,218.23,1706.94,440.53,1696.99,756.56z M1260.14,1002.63c-422.48,22.67-378.29,672.4,50.7,631.53C1707,1596.42,1668.11,980.72,1260.14,1002.63z'] },
    dog_feet:   { w: 2012, h: 1891, paths: ['M1653.79,2219.78h-136.15c-30.42-7.12-61.24-12.21-91.59-19.97c-146.53-37.46-157.82-36.57-303.94,0.77c-29.34,7.5-59.21,12.14-88.57,19.2c-43.88-3.04-92.95,4.1-136.15,0c-210.66-20.01-377.09-197.47-310.19-413.91c48.58-157.15,176.52-214.15,274.32-330.58c69.23-82.42,102.58-177.58,193.53-241.24c166.72-116.71,398.44-84.49,522.46,77.43c32.12,41.93,50.47,91.88,79.97,135.51c93.04,137.64,238.85,167.59,301.7,344.78C2037.54,2012.72,1871.1,2199.18,1653.79,2219.78z','M1052.45,330.09c84.73,26.85,115.18,120.54,131.25,199.54c38.73,190.32,44.53,513.19-176.68,595.98c-215.89,80.8-361.98-172.86-351.64-358.95c9.56-171.97,175.64-390.14,344.13-436.56H1052.45z','M1551.68,330.09c167.07,45.41,332.81,262.82,344.12,432.79c13.33,200.3-159.11,471.95-382.01,347.73c-191.83-106.91-184.37-393.93-146.31-580.98c15.97-78.48,46.58-173.85,131.25-199.54H1551.68z','M2281.6,1206.91v90.71c-7.75,184.3-246.52,414.07-423.27,273.69c-178.39-141.68-44.64-440.75,75.43-577.83C2123.97,776.31,2265.87,1012.66,2281.6,1206.91z','M269.58,1297.61v-90.71c21.23-191.89,154.22-434.59,347.84-213.43c119.66,136.68,254.23,437.01,75.43,577.83C512.2,1713.57,285.41,1483.57,269.58,1297.61z'] },
    lucky_leaf: { w: 1984, h: 2086, paths: ['M1519.24,2318.96c-167.15-15.66-264.98-166.48-308.55-314.05c-29.2-98.92-25.09-184.94-21.34-286.49c0.99-26.73,1.08-53.46,3.61-80.08l-5.71,24.21c-27.83,129.32-28.91,294.42-132.94,390.07c-35.24,32.4-90.2,66.86-136.98,78.08c-61.31,14.72-186.17,0.48-244.52-25.36c-68.19-30.2-139.64-123.75-176.58-187.57c-10.76-18.6-27.76-61.44-38.87-74.77c-6.1-7.32-21.41-17.3-29.37-24.41c-39.82-35.56-74.88-75.38-106.07-118.76c-31.22-43.42-37.66-53.16-35.68-108.54c4.16-115.82,25.79-206.02,113.64-285.94c103.09-93.77,194.48-97.61,328.07-103.28c18.88-0.81,37.98-0.56,56.87-1.19l-12.83-2.42c-155.19-10.99-365.16-44.89-459.85-182.91c-39.4-57.43-32.37-163.04-9.11-226.17c36.28-98.49,133.98-158.78,211.77-222.04c92.79-126.53,198.93-279.99,367.36-303.51c101.61-14.18,223.04,47.3,286.34,125.11c65.69,80.74,68.2,190.59,82.08,289.4c0.49,3.47,0.94,7.18,1.64,10.6c0.27,1.32,0.07,3.94,1.85,3.62c6.17-57.41,7.04-116.94,17.51-173.74c7.53-40.86,36.06-79.72,60.94-112.58c104.81-138.45,299.23-233.84,461.11-127.95c72.09,47.16,101.95,105.36,153.38,169.23c68.07,84.53,177.36,104.69,237.04,196.76c55.68,85.9,48.32,166.5,22.84,262.4c-37.12,139.73-166.77,217.81-293.85,267.03c-11.97,4.63-31.25,9.04-41.51,14.69c-1.39,0.77-2.08-0.07-1.55,2.73c140.25,1.72,284.36,36.88,360.7,164.15c24.52,40.88,35.7,67.47,37.67,115.68v19.55c-2.03,1.27-1.22,4.63-1.25,6.7c-0.49,46.04-7.74,108.66-22.63,152.11c-11.03,32.17-32.35,57.95-45.22,89.2c-62.02,29.97-103.59,86.75-137.18,145.09c-25.21,43.77-47.2,100.2-82.08,136.65c-10.06,10.52-22.47,18.23-33.04,28.05c-15.35,14.27-24.28,25.85-42.86,37.79c-72.14,46.43-147.17,53.41-229.34,29.14c-103.96-30.69-210.89-150.14-267.67-239.45c-26.42-41.56-32.08-93.34-44.2-140.37c-0.53-2.02,1.25-3.58-2.46-2.97c4.67,94.76,13.88,189.27,50.74,277.34c20.65,49.33,39.57,81.46,76.93,119.8c52.17,53.56,90.74,73.39,65.29,159.35c-4.21,14.22-10.63,20.74-21.9,30.03C1527.47,2318.71,1523.19,2319.34,1519.24,2318.96z'] },
  };

  // Vẽ 1 icon SVG: fit cạnh lớn của bbox nội dung vào `size`, căn giữa (cx,cy).
  function drawIcon(ctx, name, cx, cy, size, col) {
    const ic = ICONS[name];
    if (!ic) return;
    const k = size / Math.max(ic.w, ic.h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(k, k);
    ctx.translate(-ICON_VB, -ICON_VB);
    ctx.fillStyle = col;
    const p = new Path2D();
    for (const d of ic.paths) p.addPath(new Path2D(d));
    ctx.fill(p);
    ctx.restore();
  }

  // Mã trong External note (sau dấu *) → tên icon
  const ICON_CODES = { HRT: 'heart', STR: 'star', FLW: 'flower', DOG: 'dog_feet', LCK: 'lucky_leaf' };

  /**
   * Vẽ mockup clicker.
   * @param {Object} opt
   * @param {Array<string|{icon:string}>} opt.keys  nội dung từng phím, vd ['H','U','Y','E','N'] hoặc [{icon:'heart'}]
   * @param {Object} opt.palette  { tray, face, side, text }
   * @param {number} [opt.scale]
   * @param {string|null} [opt.background]
   * @returns {HTMLCanvasElement}
   */
  function renderClicker(opt) {
    const S = opt.scale || 1;
    const keys = opt.keys.slice(0, CONFIG.maxKeys);
    const P = opt.palette;
    const n = keys.length;

    const key = U.key * S, faceH = U.faceH * S, lift = U.lift * S;
    const rad = U.radius * S, gap = U.gap * S, pad = U.pad * S;
    const trayR = U.trayRadius * S, mg = U.margin * S, inset = U.topInset * S;

    const trayW = n * key + (n - 1) * gap + 2 * pad;
    const trayH = key + 2 * pad;
    const W = Math.round(trayW + 2 * mg);
    const H = Math.round(trayH + 2 * mg);

    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');

    // ── Nền ─────────────────────────────────────────────────────────
    if (opt.background) { ctx.fillStyle = opt.background; ctx.fillRect(0, 0, W, H); }

    // ── Khay + bóng đổ ──────────────────────────────────────────────
    const tx = mg, ty = mg;
    const trayPath = roundRect(tx, ty, trayW, trayH, trayR);

    ctx.save();
    ctx.shadowColor = 'rgba(60,45,30,0.13)';
    ctx.shadowBlur = 36 * S;
    ctx.shadowOffsetY = 12 * S;
    ctx.fillStyle = P.tray;
    ctx.fill(trayPath);
    ctx.restore();

    insetShadow(ctx, trayPath, { x: tx, y: ty, w: trayW, h: trayH }, {
      color: 'rgba(0,0,0,0.155)', blur: 30 * S, offsetY: -12 * S,
    });

    // ── Cỡ chữ: quy về chiều cao chữ hoa đúng bằng ảnh mẫu ─────────
    const targetCap = U.capRatio * key;
    ctx.font = `${CONFIG.fontWeight} 100px ${CONFIG.fontFamily}`;
    const capAt100 = ctx.measureText('H').actualBoundingBoxAscent || 71.6;
    const baseSize = (targetCap / capAt100) * 100;
    const maxW = U.maxTextW * key;

    // ── Từng phím ───────────────────────────────────────────────────
    for (let i = 0; i < n; i++) {
      const kx = tx + pad + i * (key + gap);
      const ky = ty + pad;

      // cạnh 3D (bản sao đẩy xuống)
      ctx.fillStyle = P.side;
      ctx.fill(roundRect(kx, ky + lift, key, faceH, rad));

      // mặt phím
      const face = roundRect(kx, ky, key, faceH, rad);
      ctx.fillStyle = P.face;
      ctx.fill(face);

      // viền sáng trong ở đỉnh, ôm theo bo góc
      ctx.save();
      ctx.clip(face);
      const cut = new Path2D();
      cut.addPath(face);
      cut.addPath(roundRect(kx, ky + inset, key, faceH, rad));
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill(cut, 'evenodd');
      ctx.restore();

      // nội dung
      const cx = kx + key / 2;
      const cy = ky + key / 2 - 1 * S;
      const item = keys[i];

      if (item && typeof item === 'object' && item.icon && ICONS[item.icon]) {
        const size = targetCap * 1.7;
        drawIcon(ctx, item.icon, cx, cy, size, P.text);
      } else {
        const label = String(item == null ? '' : item);
        if (!label) continue;
        let size = baseSize;
        ctx.font = `${CONFIG.fontWeight} ${size}px ${CONFIG.fontFamily}`;
        let m = ctx.measureText(label);
        if (m.width > maxW) {
          size = size * (maxW / m.width);
          ctx.font = `${CONFIG.fontWeight} ${size}px ${CONFIG.fontFamily}`;
          m = ctx.measureText(label);
        }
        const asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
        ctx.fillStyle = P.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(label, cx, cy + (asc - desc) / 2);
      }
    }

    return cv;
  }

  // Nạp font để máy nào cũng cho ra chữ giống nhau
  let fontReady = null;
  function ensureFont() {
    if (fontReady) return fontReady;
    if (!CONFIG.fontCssUrl || !document.fonts) { fontReady = Promise.resolve(false); return fontReady; }
    // Nạp qua CSS của Google Fonts (URL luôn hợp lệ, tự chọn woff2 đúng trình duyệt)
    try {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CONFIG.fontCssUrl;
      document.head.appendChild(link);
    } catch (e) { /* CSP có thể chặn thẻ link */ }
    // Chờ font sẵn sàng; nếu quá 2.5s hoặc bị chặn thì dùng font hệ thống
    const want = `800 40px "${CONFIG.fontName}"`;
    fontReady = Promise.race([
      document.fonts.load(want).then(() => document.fonts.check(want)),
      new Promise(res => setTimeout(() => res(false), 2500)),
    ]).then(ok => {
      if (ok) CONFIG.fontFamily = `"${CONFIG.fontName}",` + CONFIG.fontFamily;
      else console.info('[Raccoonie] Không nạp được font web, dùng font hệ thống (kích thước chữ vẫn đúng).');
      return !!ok;
    }).catch(() => false);
    return fontReady;
  }

  /* ═══════════════════════════════════════════════════════════════════
     3. ĐỌC DỮ LIỆU TỪ TRANG ĐƠN — chỉnh ở đây nếu dò sai
     ═══════════════════════════════════════════════════════════════════ */

  // Chuẩn hoá: bỏ dấu để so khớp tên màu dễ hơn ("Trắng"→"trang")
  function noAccent(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
  }

  // ── 3a. External note = CHỮ trên phím ────────────────────────────
  function getExternalNote() {
    for (const sel of CONFIG.noteSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const v = ('value' in el && el.value) ? el.value : el.textContent;
        if (v && v.trim()) return v.trim();
      }
    }
    // Tự dò: tìm nhãn đúng "External note", lấy giá trị ngay sau nó
    const nodes = document.querySelectorAll('div,span,td,th,p,label,dt,h1,h2,h3,h4,h5,h6');
    for (const el of nodes) {
      const t = (el.textContent || '').trim();
      if (!/^external\s*note$/i.test(t)) continue;
      // ô giá trị thường là phần tử kế tiếp, hoặc input/box trong khối cha
      const scope = el.closest('div,section,li') || el.parentElement || el;
      // ưu tiên input/textarea
      const field = scope.querySelector('input,textarea,[contenteditable="true"]');
      if (field) {
        const v = ('value' in field && field.value) ? field.value : field.textContent;
        if (v && v.trim()) return v.trim();
      }
      // nếu không, lấy khối con có chữ mà không phải chính cái nhãn
      const kids = scope.querySelectorAll('div,span,p');
      for (const k of kids) {
        const kt = (k.textContent || '').trim();
        if (kt && !/^external\s*note$/i.test(kt) && kt.length <= 60 && k.children.length === 0) return kt;
      }
      let sib = el.nextElementSibling;
      while (sib) {
        const s = (sib.textContent || '').trim();
        if (s) return s;
        sib = sib.nextElementSibling;
      }
    }
    return '';
  }

  // ── 3b. Dòng Item = MÀU (khay/phím) + SỐ PHÍM ───────────────────
  // Ví dụ: "Màu: Khay Trắng Phím Tím, Phân loại: 5 Ký tự"
  function getVariantInfo() {
    const body = document.body.innerText || '';
    const out = { trayName: null, keyName: null, count: null, raw: '' };

    // "Màu: Khay <X> Phím <Y>"  — X, Y có thể gồm nhiều từ ("Xanh Dương")
    const mColor = body.match(/M[àa]u\s*[:：]?\s*Khay\s+([^,\n]*?)\s+Ph[íi]m\s+([^,\n]+)/i);
    if (mColor) {
      out.raw = mColor[0].trim();
      out.trayName = mColor[1].trim();
      out.keyName = mColor[2].trim().replace(/[,.;].*$/, '').trim();
    }
    // "Phân loại: 5 Ký tự"  hoặc  "... 5 Ký tự"
    const mCount = body.match(/(\d{1,2})\s*K[ýy]\s*t[ựu]/i);
    if (mCount) out.count = parseInt(mCount[1], 10);
    return out;
  }

  // Làm tối 1 màu hex đi theo tỉ lệ (để tạo cạnh 3D của phím)
  function darken(hex, f = 0.88) {
    const m = hex.replace('#', '');
    const r = Math.round(parseInt(m.slice(0, 2), 16) * f);
    const g = Math.round(parseInt(m.slice(2, 4), 16) * f);
    const b = Math.round(parseInt(m.slice(4, 6), 16) * f);
    return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('');
  }

  // Có chứa 1 trong các từ khoá (không phân biệt dấu) không?
  function nameMatches(name, keywords) {
    if (!name) return 0;
    const n = noAccent(name);
    let best = 0;
    for (const w of keywords) {
      const k = noAccent(w);
      if (n.includes(k) && k.length > best) best = k.length;
    }
    return best;
  }

  // Chọn bộ màu khớp nhất với "Khay X Phím Y"
  function resolveCombo(v) {
    let best = null, bestScore = -1;
    for (const c of CONFIG.combos) {
      const tScore = nameMatches(v.trayName, c.trayNames);
      const kScore = nameMatches(v.keyName, c.keyNames);
      // phải khớp CẢ khay lẫn phím thì mới tính; điểm = tổng độ dài từ khoá khớp
      if (tScore > 0 && kScore > 0) {
        const score = tScore + kScore;
        if (score > bestScore) { best = c; bestScore = score; }
      }
    }
    if (!best) best = CONFIG.combos.find(c => c.id === CONFIG.comboDefault) || CONFIG.combos[0];
    return best;
  }

  function comboToPalette(c) {
    return { tray: c.tray, face: c.face, side: darken(c.face), text: c.text, comboId: c.id };
  }

  function resolvePalette(v) {
    const c = resolveCombo(v);
    return comboToPalette(c);
  }

  // ── 3c. Tách chữ thành các phím (mỗi ký tự / mỗi icon = 1 phím) ──
  // Icon viết dạng *MÃ* (sao hai đầu), vd *HRT*. Vẫn hiểu kiểu cũ *MÃ (không sao đóng).
  function parseToken(tok) {
    // *HRT* hoặc *HRT
    const m = tok.match(/^\*([A-Za-z]{3})(\*?)$/);
    if (m && ICON_CODES[m[1].toUpperCase()]) {
      const code = m[1].toUpperCase();
      return { icon: ICON_CODES[code], code: '*' + code + (m[2] ? '*' : '') };
    }
    return tok;
  }

  function splitKeys(content) {
    const s = (content || '').trim();
    if (!s) return [];
    // Có dấu phân cách rõ ràng: "G | O | A | L | *HRT*"
    if (/[|/,]/.test(s)) {
      return s.split(/[|/,]+/).map(x => x.trim()).filter(Boolean).map(parseToken);
    }
    // Quét từng ký tự; gặp *MÃ* (hoặc *MÃ kiểu cũ) thì gộp thành 1 icon; bỏ khoảng trắng.
    const out = [];
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '*') {
        // kiểu mới: *MÃ* (có sao đóng)
        let m = s.slice(i).match(/^\*([A-Za-z]{3})\*/);
        if (m && ICON_CODES[m[1].toUpperCase()]) {
          const code = m[1].toUpperCase();
          out.push({ icon: ICON_CODES[code], code: '*' + code + '*' });
          i += 5; // '*' + 3 ký tự + '*'
          continue;
        }
        // kiểu cũ: *MÃ (không sao đóng)
        m = s.slice(i).match(/^\*([A-Za-z]{3})/);
        if (m && ICON_CODES[m[1].toUpperCase()]) {
          const code = m[1].toUpperCase();
          out.push({ icon: ICON_CODES[code], code: '*' + code });
          i += 4; // '*' + 3 ký tự
          continue;
        }
        out.push('*'); i++; continue; // * lạ → coi là ký tự thường
      }
      out.push(ch); i++;
    }
    return out;
  }

  // Chuyển mảng phím về chuỗi hiển thị: icon → mã *CODE, chữ giữ nguyên.
  function keyToStr(k) { return (k && typeof k === 'object') ? (k.code || '*?') : String(k); }
  function keysToText(keys) { return keys.map(keyToStr).join(' '); }
  function keysToFilename(keys) {
    return keys.map(k => (k && typeof k === 'object') ? (k.icon || 'icon') : String(k))
      .join('').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 24) || 'clicker';
  }

  function readOrder() {
    const note = getExternalNote();
    const variant = getVariantInfo();
    const keys = splitKeys(note);
    const palette = resolvePalette(variant);
    const code =
      (location.pathname.match(/\/orders\/([a-z0-9]{6,})/i) || [])[1] ||
      (location.pathname.match(/([a-f0-9]{16,})/i) || [])[1] ||
      ((document.body.innerText || '').match(/\b(\d{8,})\b/) || [])[1] ||
      'donhang';
    // cảnh báo nếu số phím đọc được lệch với "N Ký tự"
    const mismatch = variant.count != null && keys.length !== variant.count;
    return { note, variant, keys, palette, code, mismatch };
  }

  /* ═══════════════════════════════════════════════════════════════════
     3b. ĐÍNH ẢNH THẲNG VÀO Ô MOCKUP / DESIGN TRÊN TRANG
     ═══════════════════════════════════════════════════════════════════ */

  function canvasToFile(canvas, name) {
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        resolve(new File([blob], name, { type: 'image/png', lastModified: Date.now() }));
      }, 'image/png');
    });
  }

  // ── CHẶN HỘP THOẠI CHỌN FILE ─────────────────────────────────────
  // Khi "nạp" 1 file, lần bạn bấm Upload tiếp theo trên trang sẽ KHÔNG mở
  // hộp thoại chọn file mà tự đưa ảnh này vào. Dùng được cả khi trang không
  // có <input type=file> sẵn (input được tạo động lúc bấm).
  const Armed = {
    file: null,
    remaining: 0,
    onUse: null,
    load(file, times, onUse) { this.file = file; this.remaining = times; this.onUse = onUse || null; installHooks(); },
    clear() { this.file = null; this.remaining = 0; this.onUse = null; },
    consume() {
      const f = this.file;
      this.remaining--;
      if (this.remaining <= 0) this.clear();
      if (this.onUse) try { this.onUse(f, this.remaining); } catch (e) {}
      return f;
    },
    get active() { return !!this.file && this.remaining > 0; },
  };

  let hooksInstalled = false;
  function installHooks() {
    if (hooksInstalled) return;
    hooksInstalled = true;

    // (a) chặn khi trang gọi input.click() để mở hộp thoại (input có thể chưa nằm trong DOM)
    const origClick = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function () {
      if (Armed.active && this.type === 'file') {
        const f = Armed.consume();
        setTimeout(() => injectFileToInput(this, f), 0);
        console.log('[Raccoonie] chặn input.click(), đưa ảnh vào:', this);
        return;
      }
      return origClick.apply(this, arguments);
    };

    // (b) chặn click thật lên input file trong DOM (kể cả bấm qua <label>)
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (Armed.active && t && t.tagName === 'INPUT' && t.type === 'file') {
        e.preventDefault();
        e.stopImmediatePropagation();
        const f = Armed.consume();
        injectFileToInput(t, f);
        console.log('[Raccoonie] chặn click file input trong DOM:', t);
      }
    }, true);

    // (c) chặn File System Access API (showOpenFilePicker)
    if (window.showOpenFilePicker) {
      const orig = window.showOpenFilePicker.bind(window);
      window.showOpenFilePicker = async (...args) => {
        if (Armed.active) {
          const f = Armed.consume();
          return [{ kind: 'file', name: f.name, getFile: async () => f }];
        }
        return orig(...args);
      };
    }
  }

  // Tìm input[type=file] tương ứng với một nhãn (Mockup/Design)
  function findUploadInput(which) {
    // 1) selector do người dùng cấu hình
    for (const sel of (CONFIG.uploadSelectors[which] || [])) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    const labels = CONFIG.uploadTargets[which] || [];
    const testLabel = t => labels.some(rx => rx.test(t));

    // 2) tìm phần tử có đúng chữ nhãn, rồi lấy input file gần nhất trong cùng cụm
    const nodes = document.querySelectorAll('div,span,p,label,td,th,h1,h2,h3,h4,h5,h6');
    for (const el of nodes) {
      const t = (el.textContent || '').trim();
      if (t.length > 24 || !testLabel(t)) continue;
      // leo lên vài cấp tìm khối chứa cả nhãn lẫn ô upload
      let scope = el;
      for (let i = 0; i < 4 && scope.parentElement; i++) {
        const inp = scope.querySelector('input[type="file"]');
        if (inp) return inp;
        scope = scope.parentElement;
      }
      // thử phần tử kế tiếp
      let sib = el.nextElementSibling;
      while (sib) {
        const inp = sib.querySelector && sib.querySelector('input[type="file"]');
        if (inp) return inp;
        sib = sib.nextElementSibling;
      }
    }
    return null;
  }

  // Nhét file vào input theo cách trang web nhận ra (giả lập người chọn file)
  function injectFileToInput(input, file) {
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      // dùng setter gốc để React/Vue chắc chắn thấy thay đổi
      const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files');
      if (desc && desc.set) desc.set.call(input, dt.files);
      else input.files = dt.files;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('[Raccoonie] đã set file vào input:', input, '→ files:', input.files.length);
      return input.files.length > 0;
    } catch (e) {
      console.warn('[Raccoonie] injectFileToInput lỗi:', e);
      return false;
    }
  }

  // Giả lập kéo-thả file vào một vùng drop (dự phòng khi không có input file)
  function findDropZone(which) {
    const labels = CONFIG.uploadTargets[which] || [];
    const nodes = document.querySelectorAll('div,section');
    for (const el of nodes) {
      const t = (el.textContent || '').trim();
      if (t.length > 40) continue;
      if (labels.some(rx => rx.test(t))) {
        // ưu tiên phần tử con trông giống dropzone (có chữ Upload/kéo thả)
        return el;
      }
    }
    return null;
  }

  function simulateDrop(zone, file) {
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      for (const type of ['dragenter', 'dragover', 'drop']) {
        const ev = new DragEvent(type, { bubbles: true, cancelable: true });
        // một số trình duyệt không cho set dataTransfer qua constructor → gán thủ công
        Object.defineProperty(ev, 'dataTransfer', { value: dt });
        zone.dispatchEvent(ev);
      }
      return true;
    } catch (e) {
      console.warn('[Raccoonie] simulateDrop lỗi:', e);
      return false;
    }
  }

  // Đính ảnh vào 1 slot bằng input file THẬT; trả về 'input' | null.
  // (Không dùng giả lập kéo-thả vì nó báo thành công giả — khi không có input,
  //  ta chuyển sang cơ chế nạp ảnh + chặn nút Upload ở makeAndAttach.)
  async function attachToSlot(which, canvas, filename) {
    const input = findUploadInput(which);
    console.log(`[Raccoonie] slot "${which}": input tìm được =`, input);
    if (input) {
      const file = await canvasToFile(canvas, filename);
      if (injectFileToInput(input, file)) return 'input';
    }
    return null;
  }

  // Đính vào Mockup (và Design nếu fillBoth). Trả về báo cáo trạng thái.
  async function attachToUploads(canvas, state) {
    const safe = keysToFilename(state.keys);
    const fname = `Raccoonie_${state.code}_${safe}.png`;
    const report = {};
    report.mockup = await attachToSlot('mockup', canvas, fname);
    if (CONFIG.fillBoth) report.design = await attachToSlot('design', canvas, fname);
    return { report, filename: fname };
  }

  /* ═══════════════════════════════════════════════════════════════════
     4. TẢI FILE + NÚT BẤM + BẢNG XEM TRƯỚC
     ═══════════════════════════════════════════════════════════════════ */

  function download(canvas, filename) {
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, 'image/png');
  }

  function toast(msg, bad) {
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
      position: 'fixed', bottom: '86px', right: '20px', zIndex: 2147483647,
      background: bad ? '#B3261E' : '#1F1B16', color: '#fff', padding: '10px 14px',
      borderRadius: '10px', font: '500 13px/1.4 system-ui,sans-serif',
      boxShadow: '0 6px 20px rgba(0,0,0,.25)', maxWidth: '320px',
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3800);
  }

  async function makeAndDownload(state) {
    await ensureFont();
    const cv = renderClicker({
      keys: state.keys,
      palette: state.palette,
      scale: CONFIG.scale,
      background: CONFIG.background,
    });
    const safe = keysToFilename(state.keys);
    download(cv, `Raccoonie_${state.code}_${safe}.png`);
    return cv;
  }

  // Vẽ rồi thử đính vào Mockup/Design.
  // - Nếu trang có input file sẵn → điền thẳng.
  // - Nếu không → "nạp" ảnh chờ bạn bấm nút Upload của trang (chặn hộp thoại).
  async function makeAndAttach(state) {
    await ensureFont();
    const cv = renderClicker({
      keys: state.keys, palette: state.palette,
      scale: CONFIG.scale, background: CONFIG.background,
    });
    const { report, filename } = await attachToUploads(cv, state);
    const okMockup = !!report.mockup;
    const okDesign = CONFIG.fillBoth ? !!report.design : true;
    const anyFilled = okMockup || (CONFIG.fillBoth && !!report.design);
    return { cv, report, okMockup, okDesign, anyFilled, filename };
  }

  // Nạp ảnh vào bộ chặn: lần bấm Upload tới trên trang sẽ tự nhận ảnh này.
  async function armForUpload(state, times, onUse) {
    await ensureFont();
    const cv = renderClicker({
      keys: state.keys, palette: state.palette,
      scale: CONFIG.scale, background: CONFIG.background,
    });
    const safe = keysToFilename(state.keys);
    const file = await canvasToFile(cv, `Raccoonie_${state.code}_${safe}.png`);
    Armed.load(file, times, onUse);
    return { cv, file };
  }

  function attachSummary(report) {
    const label = v => v === 'input' ? 'đã điền' : 'chưa điền';
    const parts = [`Mockup: ${label(report.mockup)}`];
    if (CONFIG.fillBoth) parts.push(`Design: ${label(report.design)}`);
    return parts.join(' · ');
  }

  function openPanel(state) {
    document.getElementById('rcn-panel')?.remove();
    const box = document.createElement('div');
    box.id = 'rcn-panel';
    Object.assign(box.style, {
      position: 'fixed', inset: '0', zIndex: 2147483646,
      background: 'rgba(20,16,12,.55)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
    });
    const inp = 'padding:7px 10px;border:1px solid #ddd6cc;border-radius:8px';
    const comboLabel = c => {
      const t = c.trayNames[0], k = c.keyNames[0];
      return `Khay ${t} · Phím ${k}`;
    };
    const comboOpts = CONFIG.combos.map(c =>
      `<option value="${c.id}"${c.id === state.palette.comboId ? ' selected' : ''}>${comboLabel(c)}</option>`).join('');
    const warn = state.mismatch
      ? `<div style="background:#FDECEC;color:#B3261E;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:13px">
           ⚠ Số phím đọc từ note (${state.keys.length}) khác với "Phân loại: ${state.variant.count} Ký tự". Kiểm tra lại nội dung phím.
         </div>` : '';

    box.innerHTML = `
      <div style="background:#fff;border-radius:16px;max-width:900px;width:100%;padding:20px;
                  font:14px/1.5 system-ui,sans-serif;box-shadow:0 24px 60px rgba(0,0,0,.35)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <strong style="font-size:16px">Xem trước mockup</strong>
          <span style="color:#7a7268;font-size:12px">Đơn ${state.code}</span>
          <button id="rcn-x" style="margin-left:auto;border:0;background:#f1eee9;border-radius:8px;
                  padding:6px 10px;cursor:pointer">Đóng</button>
        </div>
        ${warn}
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:end">
          <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;color:#7a7268">Nội dung phím
            <input id="rcn-keys" value="${keysToText(state.keys).replace(/"/g, '&quot;')}" style="${inp};width:220px">
          </label>
          <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;color:#7a7268">Bộ màu (khay · phím · chữ)
            <select id="rcn-combo" style="${inp};min-width:210px">${comboOpts}</select>
          </label>
          <button id="rcn-attach" style="border:0;background:#ED5A8A;color:#fff;border-radius:8px;
                  padding:9px 18px;font-weight:600;cursor:pointer;height:38px">📎 Điền vào Mockup & Design</button>
          <button id="rcn-go" style="border:1px solid #ddd6cc;background:#fff;color:#5a5248;border-radius:8px;
                  padding:9px 14px;font-weight:600;cursor:pointer;height:38px">Tải PNG</button>
          <button id="rcn-diag" style="border:1px solid #ddd6cc;background:#fff;color:#5a5248;border-radius:8px;
                  padding:9px 14px;font-weight:600;cursor:pointer;height:38px" title="Liệt kê các ô upload tìm thấy">🔍 Dò ô upload</button>
        </div>
        <div id="rcn-status" style="min-height:0;margin-bottom:10px;font-size:13px"></div>
        <div id="rcn-prev" style="overflow:auto;background:#faf8f5;border-radius:12px;padding:12px"></div>
        <details style="margin-top:12px;color:#7a7268;font-size:12px">
          <summary style="cursor:pointer">Dữ liệu đọc từ đơn</summary>
          <pre style="white-space:pre-wrap;margin:8px 0 0">External note: ${(state.note || '(trống)').replace(/</g, '&lt;')}
Màu (raw): ${(state.variant.raw || '(không thấy)').replace(/</g, '&lt;')}
Số ký tự: ${state.variant.count == null ? '(không thấy)' : state.variant.count}</pre>
        </details>
      </div>`;
    document.body.appendChild(box);

    const build = () => {
      const keys = splitKeys(box.querySelector('#rcn-keys').value);
      const id = box.querySelector('#rcn-combo').value;
      const c = CONFIG.combos.find(x => x.id === id) || CONFIG.combos[0];
      return { keys, palette: comboToPalette(c) };
    };
    const draw = () => {
      const { keys, palette } = build();
      const cv = renderClicker({ keys, palette, scale: CONFIG.scale, background: CONFIG.background });
      cv.style.maxWidth = '100%'; cv.style.display = 'block';
      const host = box.querySelector('#rcn-prev');
      host.innerHTML = ''; host.appendChild(cv);
    };

    ensureFont().then(draw);
    box.querySelector('#rcn-keys').addEventListener('input', draw);
    box.querySelector('#rcn-combo').addEventListener('change', draw);
    box.querySelector('#rcn-x').onclick = () => box.remove();
    box.onclick = e => { if (e.target === box) box.remove(); };

    const status = box.querySelector('#rcn-status');
    const setStatus = (msg, kind) => {
      const c = kind === 'ok' ? '#0F7B3F' : kind === 'warn' ? '#B26A00' : kind === 'bad' ? '#B3261E' : '#5a5248';
      const bg = kind === 'ok' ? '#E7F5EC' : kind === 'warn' ? '#FBF0DC' : kind === 'bad' ? '#FDECEC' : '#f4f1ec';
      status.innerHTML = `<div style="background:${bg};color:${c};border-radius:8px;padding:8px 12px">${msg}</div>`;
    };

    box.querySelector('#rcn-go').onclick = () => {
      const { keys, palette } = build();
      makeAndDownload({ ...state, keys, palette });
      setStatus('Đã tải PNG về máy.', 'ok');
    };

    box.querySelector('#rcn-diag').onclick = () => {
      const inputs = [...document.querySelectorAll('input[type="file"]')];
      const mk = findUploadInput('mockup');
      const dz = findUploadInput('design');
      const mkZone = findDropZone('mockup');
      const dzZone = findDropZone('design');
      const desc = el => {
        if (!el) return '<span style="color:#B3261E">không thấy</span>';
        const tag = el.tagName.toLowerCase();
        const info = [el.id && `#${el.id}`, el.name && `name=${el.name}`, el.accept && `accept=${el.accept}`,
          el.className && `class=${String(el.className).slice(0, 40)}`].filter(Boolean).join(' ');
        const vis = el.offsetParent === null ? ' (ẩn)' : '';
        return `&lt;${tag}&gt; ${info}${vis}`;
      };
      let html = `<div style="background:#f4f1ec;border-radius:8px;padding:10px 12px;font-size:12px;line-height:1.7;font-family:ui-monospace,monospace">`;
      html += `<b>Tổng số input[type=file]: ${inputs.length}</b><br>`;
      inputs.forEach((el, i) => { html += `&nbsp;&nbsp;[${i}] ${desc(el)}<br>`; });
      html += `<hr style="border:0;border-top:1px solid #ddd6cc;margin:8px 0">`;
      html += `<b>Mockup</b> → ${desc(mk)} · dropzone: ${mkZone ? 'có' : '<span style="color:#B3261E">không</span>'}<br>`;
      html += `<b>Design</b> → ${desc(dz)} · dropzone: ${dzZone ? 'có' : '<span style="color:#B3261E">không</span>'}`;
      html += `</div>`;
      box.querySelector('#rcn-status').innerHTML = html;
    };

    box.querySelector('#rcn-attach').onclick = async (e) => {
      const btn = e.currentTarget;
      const { keys, palette } = build();
      const st = { ...state, keys, palette };
      btn.disabled = true; btn.textContent = 'Đang xử lý…';
      try {
        // 1) thử điền thẳng nếu trang có input file sẵn
        const res = await makeAndAttach(st);
        if (res.anyFilled) {
          setStatus('✅ ' + attachSummary(res.report) + '. Kiểm tra phần Media rồi lưu đơn.', 'ok');
          return;
        }
        // 2) không có input → nạp ảnh, hướng dẫn bấm Upload trên trang
        const need = CONFIG.fillBoth ? 2 : 1;
        await armForUpload(st, need, (file, left) => {
          if (left > 0) setStatus(`✅ Đã đưa ảnh vào 1 ô. Còn lại ${left} ô — bấm nút <b>Upload</b> tiếp trên trang.`, 'ok');
          else setStatus('✅ Đã đưa ảnh vào ô cuối. Kiểm tra phần Media rồi lưu đơn.', 'ok');
        });
        setStatus(
          `📎 <b>Ảnh đã sẵn sàng.</b> Bây giờ bấm nút <b>Upload</b> ở ô <b>Mockup</b>${CONFIG.fillBoth ? ' rồi ô <b>Design</b>' : ''} trên trang. ` +
          `Ảnh sẽ tự vào, KHÔNG mở hộp thoại chọn file. (Còn hiệu lực cho ${need} lần bấm)`,
          'plain');
      } catch (err) {
        console.error('[Raccoonie]', err);
        setStatus('❌ Lỗi, xem Console (F12).', 'bad');
      } finally {
        btn.disabled = false; btn.textContent = '📎 Điền vào Mockup & Design';
      }
    };
  }

  function mountButton() {
    if (document.getElementById('rcn-btn')) return;
    const b = document.createElement('button');
    b.id = 'rcn-btn';
    b.textContent = '⚡ Tạo mockup Raccoonie';
    b.title = 'Bấm: xem trước & điền vào Mockup/Design · Shift+bấm: tải PNG ngay';
    Object.assign(b.style, {
      position: 'fixed', bottom: '24px', right: '20px', zIndex: 2147483647,
      background: '#ED5A8A', color: '#fff', border: '0', borderRadius: '999px',
      padding: '12px 20px', font: '600 14px system-ui,sans-serif', cursor: 'pointer',
      boxShadow: '0 8px 24px rgba(237,90,138,.4)',
    });
    b.onclick = async (e) => {
      const state = readOrder();
      // Shift = tải nhanh PNG (không đính). Thường = mở popup xem trước + đính.
      if (e.shiftKey) {
        if (state.keys.length === 0) { toast('Chưa đọc được External note.', true); return; }
        b.disabled = true; b.textContent = 'Đang vẽ…';
        try { await makeAndDownload(state); toast(`Đã tải: ${keysToText(state.keys)}`); }
        finally { b.disabled = false; b.textContent = '⚡ Tạo mockup Raccoonie'; }
        return;
      }
      if (CONFIG.alwaysConfirm || state.keys.length === 0) {
        if (state.keys.length === 0) toast('Chưa đọc được External note — kiểm tra trong bảng.', true);
        openPanel(state);
        return;
      }
      // chế độ 1-chạm
      b.disabled = true; b.textContent = 'Đang xử lý…';
      try {
        const res = await makeAndAttach(state);
        if (res.anyFilled) {
          toast('✅ ' + attachSummary(res.report));
        } else {
          const need = CONFIG.fillBoth ? 2 : 1;
          await armForUpload(state, need, (f, left) => {
            toast(left > 0 ? `✅ Đã vào 1 ô. Bấm Upload ${left} ô nữa.` : '✅ Đã vào ô cuối.');
          });
          toast(`📎 Ảnh sẵn sàng — bấm nút Upload ở Mockup${CONFIG.fillBoth ? ' & Design' : ''} trên trang.`);
        }
      } catch (err) {
        console.error('[Raccoonie]', err);
        toast('Lỗi, xem Console.', true);
      } finally {
        b.disabled = false; b.textContent = '⚡ Tạo mockup Raccoonie';
      }
    };
    document.body.appendChild(b);
  }

  mountButton();
  // Cendo là SPA → gắn lại nút khi điều hướng
  new MutationObserver(() => mountButton()).observe(document.body, { childList: true, subtree: true });

  // Gọi tay từ Console: __raccoonie.render(['H','U','Y','E','N'],'trang-tim')
  window.__raccoonie = {
    render: (keys, comboId = CONFIG.comboDefault) => {
      const c = CONFIG.combos.find(x => x.id === comboId) || CONFIG.combos[0];
      return renderClicker({ keys, palette: comboToPalette(c), scale: CONFIG.scale, background: CONFIG.background });
    },
    read: readOrder,
    CONFIG,
    // Chẩn đoán: __raccoonie.debug()
    debug() {
      const state = readOrder();
      const combo = CONFIG.combos.find(c => c.id === state.palette.comboId);
      console.log('%c[Raccoonie] Kết quả đọc hiện tại', 'font-weight:bold;color:#ED5A8A');
      console.table({
        'External note': state.note || '(trống)',
        'Các phím': keysToText(state.keys),
        'Số phím': state.keys.length,
        'Màu (raw)': state.variant.raw || '(không thấy)',
        'Bộ màu khớp': combo ? `${combo.trayNames[0]} / ${combo.keyNames[0]} (${combo.id})` : '(mặc định)',
        'Số ký tự (variant)': state.variant.count == null ? '(không thấy)' : state.variant.count,
        'Mã đơn': state.code,
      });
      console.log('%c[Raccoonie] Các ô chữ có thể là External note:', 'font-weight:bold');
      const seen = new Set();
      document.querySelectorAll('div,span,td,th,p,label,dt,dd,li').forEach(el => {
        if (el.children.length > 2) return;
        const t = (el.textContent || '').trim();
        if (!t || t.length > 120 || seen.has(t)) return;
        seen.add(t);
        if (/note|ghi\s*ch|kh[ắa]c|in\s*ch|n[ộo]i\s*dung|t[êe]n|m[àa]u/i.test(t)) {
          console.log('  •', JSON.stringify(t), el);
        }
      });
      console.log('%c→ Copy chuỗi JSON của ô External note đúng, gửi lại để mình viết selector chuẩn.', 'color:#888');
      return state;
    },
    // Chẩn đoán ô upload: __raccoonie.debugUploads()
    debugUploads() {
      const inputs = [...document.querySelectorAll('input[type="file"]')];
      console.log('%c[Raccoonie] Tìm thấy ' + inputs.length + ' input[type=file]:', 'font-weight:bold;color:#ED5A8A');
      inputs.forEach((el, i) => {
        console.log(`  [${i}]`, {
          accept: el.accept, name: el.name, id: el.id,
          class: el.className, hidden: el.offsetParent === null,
        }, el);
      });
      console.log('%c[Raccoonie] Kết quả dò theo nhãn:', 'font-weight:bold');
      console.log('  Mockup input:', findUploadInput('mockup'));
      console.log('  Design input:', findUploadInput('design'));
      console.log('  Mockup dropzone:', findDropZone('mockup'));
      console.log('  Design dropzone:', findDropZone('design'));
      console.log('%c→ Gửi mình ảnh chụp kết quả này để mình chỉnh selector cho khớp.', 'color:#888');
      return inputs;
    },
  };
})();
