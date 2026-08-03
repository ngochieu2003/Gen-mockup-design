// ==UserScript==
// @name         Cendo → Raccoonie | Tạo & tải mockup clicker tại chỗ
// @namespace    raccoonie.tools
// @version      5.4.0
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
  │   *HRT* heart  *STR* star  *FLW* flower  *DOG* dog_feet  *LCK* cỏ 4 lá │
  │   *CAM* máy ảnh  *TNS* tennis  *BMT* cầu lông  *PLN* máy bay          │
  │   *PKB* pickleball  *SUN* mặt trời  *HDP* tai nghe  *MON* trăng       │
  │   *BOW* nơ                                                            │
  │   VD: "*HRT*Hieu*STR*" → ♥ H i e u ★ (6 phím). Kiểu cũ *HRT vẫn hiểu. │
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
      { id: 'reu-kem',    trayNames: ['xanh matcha', 'xanh rêu', 'rêu'], keyNames: ['trắng', 'kem'],
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
    maxKeys: 15,

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
  // Icon canh theo viewBox (giống hệt cách web hiển thị), tô từng path riêng
  // theo thứ tự (tái hiện chuẩn path lồng nhau). Màu icon = màu chữ của bộ màu.
  const ICON_VB = 2551.18;          // cạnh viewBox
  const ICON_VB_C = ICON_VB / 2;    // tâm viewBox
  const ICONS = {
    heart: { paths: ['M1273.22,726.71c9.52,1.7,5.65-1.4,7.6-5.2c52.02-101.09,106.39-172.93,204.75-234c276.38-171.6,617.66-75.84,736.44,231.94c216.78,561.74-382.9,1169.24-845.74,1391.96c-69.56,33.48-102.8,56.79-175.9,13.62C760.49,1865.24,110.61,1314,326.06,732.12c109.14-294.77,425.73-413.47,705.34-266.42C1135.73,520.56,1230.92,616.14,1273.22,726.71z'] },
    star: { paths: ['M1264.76,330.45c42.57-8.95,81.22,48.62,103.03,79.03c88.1,122.83,144.96,269.32,227.14,395.08c45.98,70.36,68.5,74,148.35,93.32c132.33,32,272.3,44.45,402.81,83.3c28.55,8.51,111.52,34.75,120.98,65.12c10.95,35.07-32.8,92.19-53.21,119.31c-84.77,112.67-195.55,206.71-285.87,314.12c-31.31,37.22-59.82,66.53-62.58,117.97c-5.14,95.91,24.91,227.01,35.88,325.45c8.1,72.66,23.62,181.35,7.38,251.13c-14.74,63.33-64.28,49.1-113.77,35.79c-139.23-37.46-281.7-128.1-416.42-183.6c-93.37-38.46-108.12-39.14-201.8-0.81c-132.94,54.41-266.93,138.15-403.48,179.86c-42.05,12.84-107.5,34.96-126.43-19.6c-20.65-59.54-4.77-181.09,2.36-246.11c11.49-104.77,42.32-236.66,38.65-339.35c-2.33-65.22-77.72-137.5-120.91-184.63c-60.45-65.96-271.82-268.28-281.74-346.01c-3.94-30.88,12.11-43.62,36.78-57.19c117.63-64.7,350.28-81.69,488.01-114.78c71.4-17.15,97.16-19.83,140-82.22c58.54-85.25,104.88-188.94,156.71-279.39C1131.7,492.67,1218.02,340.27,1264.76,330.45z'] },
    flower: { paths: ['M1696.99,756.56c341.63-129.96,672.79,200.54,541.21,544.57c-48.91,127.87-152.11,209.39-277.16,257.15c109.12,140.39,118.25,346.12,18.42,493.73c-168.86,249.68-535.44,246.9-701.55-1.95c-350.32,465.31-1023.47-16.57-683.01-494.95c-166.16-45.71-298.48-198.5-310.39-372.67c-20.91-305.47,276.9-534.27,564.54-426.07c7.51-5.12,6.91-6.08,7.16-13.76c5.59-170.94,79.96-317.82,240.95-391.16C1389.56,218.23,1706.94,440.53,1696.99,756.56z M1260.14,1002.63c-422.48,22.67-378.29,672.4,50.7,631.53C1707,1596.42,1668.11,980.72,1260.14,1002.63z'] },
    dog_feet: { paths: ['M1653.79,2219.78h-136.15c-30.42-7.12-61.24-12.21-91.59-19.97c-146.53-37.46-157.82-36.57-303.94,0.77c-29.34,7.5-59.21,12.14-88.57,19.2c-43.88-3.04-92.95,4.1-136.15,0c-210.66-20.01-377.09-197.47-310.19-413.91c48.58-157.15,176.52-214.15,274.32-330.58c69.23-82.42,102.58-177.58,193.53-241.24c166.72-116.71,398.44-84.49,522.46,77.43c32.12,41.93,50.47,91.88,79.97,135.51c93.04,137.64,238.85,167.59,301.7,344.78C2037.54,2012.72,1871.1,2199.18,1653.79,2219.78z', 'M1052.45,330.09c84.73,26.85,115.18,120.54,131.25,199.54c38.73,190.32,44.53,513.19-176.68,595.98c-215.89,80.8-361.98-172.86-351.64-358.95c9.56-171.97,175.64-390.14,344.13-436.56H1052.45z', 'M1551.68,330.09c167.07,45.41,332.81,262.82,344.12,432.79c13.33,200.3-159.11,471.95-382.01,347.73c-191.83-106.91-184.37-393.93-146.31-580.98c15.97-78.48,46.58-173.85,131.25-199.54H1551.68z', 'M2281.6,1206.91v90.71c-7.75,184.3-246.52,414.07-423.27,273.69c-178.39-141.68-44.64-440.75,75.43-577.83C2123.97,776.31,2265.87,1012.66,2281.6,1206.91z', 'M269.58,1297.61v-90.71c21.23-191.89,154.22-434.59,347.84-213.43c119.66,136.68,254.23,437.01,75.43,577.83C512.2,1713.57,285.41,1483.57,269.58,1297.61z'] },
    lucky_leaf: { paths: ['M1519.24,2318.96c-167.15-15.66-264.98-166.48-308.55-314.05c-29.2-98.92-25.09-184.94-21.34-286.49c0.99-26.73,1.08-53.46,3.61-80.08l-5.71,24.21c-27.83,129.32-28.91,294.42-132.94,390.07c-35.24,32.4-90.2,66.86-136.98,78.08c-61.31,14.72-186.17,0.48-244.52-25.36c-68.19-30.2-139.64-123.75-176.58-187.57c-10.76-18.6-27.76-61.44-38.87-74.77c-6.1-7.32-21.41-17.3-29.37-24.41c-39.82-35.56-74.88-75.38-106.07-118.76c-31.22-43.42-37.66-53.16-35.68-108.54c4.16-115.82,25.79-206.02,113.64-285.94c103.09-93.77,194.48-97.61,328.07-103.28c18.88-0.81,37.98-0.56,56.87-1.19l-12.83-2.42c-155.19-10.99-365.16-44.89-459.85-182.91c-39.4-57.43-32.37-163.04-9.11-226.17c36.28-98.49,133.98-158.78,211.77-222.04c92.79-126.53,198.93-279.99,367.36-303.51c101.61-14.18,223.04,47.3,286.34,125.11c65.69,80.74,68.2,190.59,82.08,289.4c0.49,3.47,0.94,7.18,1.64,10.6c0.27,1.32,0.07,3.94,1.85,3.62c6.17-57.41,7.04-116.94,17.51-173.74c7.53-40.86,36.06-79.72,60.94-112.58c104.81-138.45,299.23-233.84,461.11-127.95c72.09,47.16,101.95,105.36,153.38,169.23c68.07,84.53,177.36,104.69,237.04,196.76c55.68,85.9,48.32,166.5,22.84,262.4c-37.12,139.73-166.77,217.81-293.85,267.03c-11.97,4.63-31.25,9.04-41.51,14.69c-1.39,0.77-2.08-0.07-1.55,2.73c140.25,1.72,284.36,36.88,360.7,164.15c24.52,40.88,35.7,67.47,37.67,115.68v19.55c-2.03,1.27-1.22,4.63-1.25,6.7c-0.49,46.04-7.74,108.66-22.63,152.11c-11.03,32.17-32.35,57.95-45.22,89.2c-62.02,29.97-103.59,86.75-137.18,145.09c-25.21,43.77-47.2,100.2-82.08,136.65c-10.06,10.52-22.47,18.23-33.04,28.05c-15.35,14.27-24.28,25.85-42.86,37.79c-72.14,46.43-147.17,53.41-229.34,29.14c-103.96-30.69-210.89-150.14-267.67-239.45c-26.42-41.56-32.08-93.34-44.2-140.37c-0.53-2.02,1.25-3.58-2.46-2.97c4.67,94.76,13.88,189.27,50.74,277.34c20.65,49.33,39.57,81.46,76.93,119.8c52.17,53.56,90.74,73.39,65.29,159.35c-4.21,14.22-10.63,20.74-21.9,30.03C1527.47,2318.71,1523.19,2319.34,1519.24,2318.96z'] },
    camera: { paths: ['M1626.05,483.87c33.01,9.48,64.43,29.54,78.46,62.05c2.57,5.96,10.82,30.84,10.82,35.46v47.93 c80.07,3.13,163.29-4.22,243.02,0.03c168.08,8.97,292.35,119.9,309.36,289.06l-0.18,866.13 c-13.53,148.83-130.67,267.63-279.26,282.79l-1428.64-0.18c-118-13.73-223.37-95.48-260.59-208.9 c-7.02-21.4-10.05-43.7-15.59-65.4V903.66c27.49-162.56,144.6-265.53,309.23-274.32c79.73-4.26,162.96,3.1,243.02-0.03v-51.23 c0-2.23,9.65-30.5,11.59-34.69c14.21-30.69,46.21-50.46,77.7-59.51H1626.05z M1228.56,858.37 c-385.25,31.5-580.36,493.14-339.8,797.15c239.67,302.89,722.32,222.35,850.62-141.1 C1860.32,1171.82,1587.67,829.01,1228.56,858.37z M596.96,874.74c-137.15,10.78-120.23,223.21,25.17,203.83 C745.84,1062.09,726.95,864.52,596.96,874.74z', 'M1241.78,954.22c320.28-24.39,541.04,319.13,375.74,597.05c-141.76,238.34-476.41,262.6-651.23,46.59 C767.06,1351.7,927.61,978.14,1241.78,954.22z'] },
    tennis: { paths: ['M1330.39,273.82c319.97,18.53,619.31,193.71,790.77,463.69c100.49,158.23,154.08,342.2,156.51,530.41 c-364.14-36.92-700.72-301.37-873.58-615.76c-63.29-115.11-109.62-246.68-120.67-378.35 C1298.96,274.46,1314.88,272.92,1330.39,273.82z', 'M1267.76,2277.65h-46.97l-9.47-4.08c-516.51-21.67-938.9-474.78-937.81-990.03 C768.22,1340.74,1208.29,1784.25,1267.76,2277.65z', 'M1200.8,278.18c55.13,496.44,480.19,952.73,966.52,1055.03c35.38,7.44,71.84,9.84,106.65,19.28 c-30.95,447.54-373.26,827.16-813.52,908.44c-14.88,2.75-106.4,16.85-110.93,10.52c-52.06-490.85-481.92-952.37-962.34-1052.6 c-14.85-3.1-108.57-14.62-109.88-20.08C309.49,713.68,714.92,307.71,1200.8,278.18z'] },
    badminton: { paths: ['M658.8,1599.51l998.69-801.16c2.45-2.19,3.92-1.29,6.42,0c4.38,2.26,67.54,65.34,69.75,69.74l1.15,4.35L936.3,1842.99 c-4.58,2.52-9.43,1.91-14.37,1.76c-36.33-1.07-124.38-15.72-155.94-31.86C685.32,1771.64,675.6,1679.15,658.8,1599.51z', 'M1553.1,693.84c4.82-0.75,5.57,0.55,9.08,2.61c3.76,2.21,59.56,57.8,61.52,61.69l1.18,4.37l-995.85,802.56 c-80.84-16.3-158.67-65.93-167.67-155.74c-2.47-24.7-3.76-86.11-0.54-109.7c0.6-4.43,0.53-8.56,4.83-11.33L1553.1,693.84z', 'M1769.48,907.11l69.3,65.93l1.72,11.51l-620.99,1086.7l-6.78,2.98c-64.53-3.84-118.45,1.72-171.24-42.07 c-34.33-28.49-64.51-101.13-68.89-144.76c-0.68-6.81-1.47-12.07,2.95-18.08L1769.48,907.11z', 'M1878.98,1013.65c16.91,22.64,55.17,47.42,69.75,69.34c1.99,2.98,3.91,5.09,2.54,9.01l-441.06,1134.14 c-10.53,30.62-30.76,39.62-61.38,42.1c-117.86,9.57-145.99-83.5-187.6-171.6L1878.98,1013.65z', 'M1892.88,283.72c254.04-22.52,441.46,218.78,352.31,459.03c-29.38,79.18-88,129.44-146.77,186.52l-479.71-476.75 C1696.82,368.69,1771.71,294.46,1892.88,283.72z', 'M326.28,1200.01c-36.27-35.25-68.33-126.21-13.1-157.96l1146.01-445.09l62.39,59.3L441.62,1248.2 c-13.12,3.4-50.73-10.42-64.68-16.39C360.27,1224.68,339.24,1212.6,326.28,1200.01z', 'M1597.42,498.1c130.12,125.87,257.16,258.34,385.02,386.01l77.82,77.76l-0.01,6.42l-81.03,77.75l-475.56-472.27v-6.41 l79.42-79.4l6.58-0.07C1592.92,490.74,1594.37,495.14,1597.42,498.1z'] },
    plane: { paths: ['M2167.43,283.46c13.5,6.35,28.68,6.82,42.95,12.56c41.48,16.68,45.83,48.91,57.34,87.72v46.56 c-14.78,79.29-56.25,148.96-105.6,211.37l-359.39,338.86l305.87,1088.49l-2.38,6.43c-22.88,19.12-90.72,126.92-113.3,130.74 c-5.11,0.86-10.35-0.72-14.27-4.08l-575.91-847.68l-384.37,357.11l71.11,447.05c0.91,16.76-9.26,26.8-18.15,39.16 c-17.21,23.93-42.98,49.64-64.37,69.95h-14.33l-234.6-365.27c-44.94,37.82-99.86,79.83-158.58,92.08 c-29.6,6.18-50.3,15.68-46.92-21.86c5.93-65.96,55.28-130.36,96.2-179.52l-365.27-234.6v-14.33 c22.19-22.66,49.94-50.91,75.53-69.53c12.41-9.03,21.18-14.23,37.28-14.44l443.32,72.65l357.14-384.45L349.52,570.23l-5.36-12.59 c38.09-44.12,91.97-79.39,137.98-115.07l13.29,3.06l1072.14,302.25c16.63-15.07,32.77-31,48.43-47.09 c117.67-120.89,268.16-327.39,421.2-391.75l83.66-25.58H2167.43z'] },
    pickle: { paths: ['M1974.76,761.49c-101.75-113.74-225.63-216.35-329.3-329.3c-133.25-118.72-336.86-106.7-467.49,9.66L740.52,879.31 c-115.93,128.89-117.7,290.55-85.94,453c13.39,68.49,41.1,142.3,21.33,212.45c-8.47,30.05-30.01,37.69-20.9,72.95 c14.84,57.4,78.21,106.78,87.5,168.42c2.14,0.43,3.78-0.21,5.71-1.01c11.84-4.88,33.46-22.65,47.05-30.22 c108.11-60.26,165.66-27.12,275.53-2.55c160.89,35.99,333.75,43.46,464.56-72.4l443.25-443.25 C2095.92,1100.59,2094.81,895.69,1974.76,761.49z', 'M1920.7,1528.19c-8.39,0.6-25.52,2.97-40.53,5.96c-2.39,0.43-5.33,1.05-8.92,1.91c-0.01,0-0.03,0.01-0.04,0.01 c-0.25,0.06-0.48,0.11-0.74,0.18c-0.02,0.01-0.05,0.01-0.07,0.02c-4.98,1.18-9.32,2.41-12.49,3.63 c-24.01,7.96-48.03,20.92-48.03,20.92l0,0.01c-157.79,79.04-209.95,287.26-99.51,434.53c118.93,158.6,362.06,152.71,473.59-10.78 C2322.16,1781.97,2163.71,1510.72,1920.7,1528.19z M1987.78,1540.22c7.92-7.65,38.38,2.11,48.29,5.81 c11.03,4.12,27.51,8.84,26.29,23.24c-2.8,10.25-32.35,2.76-40.23,0.37C2014.69,1567.38,1975.83,1551.77,1987.78,1540.22z M1988.26,1607.34c28.12-19.88,79.83,13.53,59.79,44.34c-13.68,21.03-46.62,15.14-61.98-0.6 C1974.07,1638.78,1973.48,1617.79,1988.26,1607.34z M2010.07,1727.54c50.55-5.54,58.06,70.35,10.88,76.62 C1966.21,1811.44,1961.26,1732.89,2010.07,1727.54z M1834.71,1656.62c-18.4-21.77,7.87-51.19,30.46-54.56 c15.52-2.31,34.59-0.34,39.71,17.2C1915.06,1654.19,1857.07,1683.08,1834.71,1656.62z M1874.16,1804.17 c-53.76,7.15-61.92-70.58-10.88-76.62C1912.49,1721.73,1921.15,1797.91,1874.16,1804.17z M1866.14,1568.26 c-7.59,2.34-44.81,12.12-44.73-2.09c-0.06-9.78,22.39-18.26,38.6-23.1c11.54-2.48,28.64-10.12,37.94-0.89 C1908.19,1552.34,1872.57,1566.28,1866.14,1568.26z M1711.05,1965.69c-3.66-9.58-7.86-31.5,5.3-35.4 c20.81-6.17,49,24.55,52.26,43.51C1777.22,2023.92,1722.87,1996.66,1711.05,1965.69z M1718.81,1774.37 c3.01-3.45,8.54-9.23,13.03-10.22c35.38-7.73,50.29,56.77,23.76,79.84C1721.4,1873.73,1689.08,1808.5,1718.81,1774.37z M1769.99,1653.66c-5.11,14.69-36.2,52.43-51.2,33.9c-14.51-17.93,15.96-61.96,36.22-66.25 C1777.29,1616.6,1775.19,1638.71,1769.99,1653.66z M1826,1939.59c-16.95-22.13-9.61-55.28,19.86-59.4 c20.96-2.93,41.63,9.72,48.31,29.86C1909.31,1955.66,1852.98,1974.81,1826,1939.59z M1900.4,2056.41 c-14.57-22.07,17.53-37.99,36.35-39.1c13.79-0.81,34.93,3.67,42.85,15.9C2003.13,2069.56,1924.13,2092.36,1900.4,2056.41z M2050.04,1953.02c-20.78,17.99-55.6,10.1-64.1-16.93c-6.86-21.83,6.66-49.35,29.82-54.05 C2061.16,1872.81,2083.77,1923.8,2050.04,1953.02z M2121.98,1627.04c19.66-4.26,46.25,25.06,48.63,43.24 c4.16,31.87-26.86,21.3-41.33,6.59C2119.7,1667.12,2100.38,1631.72,2121.98,1627.04z M2144.72,1846.88 c-38.46,0-40.33-78.12-1.45-80.68C2183.41,1763.56,2185.87,1846.87,2144.72,1846.88z M2171.15,1969.84 c-6.18,15.23-40.48,51.23-54.47,28.66c-12.63-20.37,18.27-64.78,40.14-68.27C2179.05,1926.68,2176.52,1956.59,2171.15,1969.84z', 'M303.1,1967.68l-5.36-1.68c-7.12,1.1-16.84,16.54-23.87,20.7c-6.89,4.08-17.14,5.47-25.18,9.58 c-21.42,10.94-43.95,35.48-54.3,57.02l126.04,140.39c8.44,12,30.47-6.87,38.65-13.64c28.72-23.77,35.36-38.74,21.27-75.23 C361.86,2057.02,319.06,2017.39,303.1,1967.68z', 'M413.84,1922.62c-4.37-7.6-21.6-46.22-23.72-47.84c-1.13-0.86-2-1.86-3.62-1.48c-5.64,0.58-35.69,25.74-41.18,31.31 c-8.07,8.18-27.85,31.48-27.56,42.58c0.27,10.39,11.68,33.14,16.9,43.02c16.72,31.65,41.03,59.03,57.07,91.64 c3.55,7.23,11.02,31.08,13.75,34.54c4.84,6.16,20.05-8.93,24.17-12.54c11.02-9.62,46.09-47.25,47.88-60.32 c1.51-11.04-14.64-43.15-20.53-53.99C444.31,1966.24,427.07,1945.62,413.84,1922.62z', 'M483.97,1810c-2.22-4.7-5.86-20.77-10.84-21.32c-12.61-1.39-58.91,46.57-63.27,59.77c-5.45,16.48,7.61,40.31,15.57,54.86 c19.62,35.93,44.21,65.09,62.48,103.61c2.36,4.97,4.17,18.6,10.2,18.72c14.38,0.28,66.97-55.36,66.6-70.28 c-0.72-28.84-47.43-85.94-63.26-112.62C495.2,1832.19,489.22,1821.09,483.97,1810z', 'M558.79,1707.19c-5.93-3.84-24.73,10.96-29.75,15.16c-9.67,8.1-37.22,36.58-37.08,48.93 c0.13,11.26,12.67,36.46,18.45,47.05c19.79,36.24,45.59,65.84,63.08,104.95c2.89,6.47,2.12,18.27,11.48,17.41 c13.72-1.25,52.01-43.49,56.87-57.25c5.67-16.03-5-36.36-12.28-50.99C608.24,1789.6,572.34,1754.18,558.79,1707.19z', 'M636.1,1620.22c-3.29-1.03-5.81-0.05-8.62,1.65c-10.33,6.25-37.18,39.26-44.15,50.47c-11.26,18.1-9.9,20.18-2.06,40.36 c15.76,40.55,50.47,78.26,70.18,119.09c2.3,4.76,8.76,26.95,12.8,27.27c16.48-7.3,30.82-18.8,42.54-32.34 c19.43-22.44,20.59-29.47,9.59-57.93C696.42,1717.06,648.63,1676.07,636.1,1620.22z'] },
    sun: { paths: ['M1262.24,803.2c378-7.32,613.02,406.98,410.05,727.57c-181.4,286.51-604.58,288.82-791.69,6.81 C676.13,1229.4,892.67,810.36,1262.24,803.2z', 'M1792.4,1730.13c20.38-2.12,40.27,7.09,55.84,19.26c73.92,57.82,142.24,153.62,215.3,215.66 c45.05,58.43-11.86,138.69-82.54,110.9c-85.24-68.8-157.9-154.43-237.34-230.47C1708.67,1801.83,1737.2,1735.88,1792.4,1730.13z', 'M743.43,1730.2c63.33-5.61,99.3,70.69,58.43,118.11l-216.9,216.9c-69.33,52.18-152.24-30.84-100.16-100.16 c55.61-74.03,156.39-143.55,216.62-217.17C712.59,1738.54,728.99,1731.48,743.43,1730.2z', 'M1996.42,471.31c69.2-10.76,109.59,66.95,63.06,119.76c-70.23,57.9-134.18,129.81-204.05,187.22 c-11.19,9.19-26.86,21.78-41.4,23.81c-67.45,9.43-111.33-59.51-69.14-114.51c71.97-60.09,139.49-138.35,212.54-195.74 C1969.09,482.7,1981.24,473.67,1996.42,471.31z', 'M524.92,471.3c25.31-4.34,45.16,4.19,64.45,19.26c73.17,57.14,140.37,135.93,212.77,195.51 c54.81,69.3-29.92,157.82-106.39,95.05C624.47,722.6,559.2,648.63,487.37,589.73C449.93,550.99,471.72,480.42,524.92,471.3z', 'M320.91,1205.75c47.02-5.92,149.29-4.7,197.77-0.9c92.01,7.22,91.84,131.5,5.26,141.56 c-45.79,5.32-148.61,4.44-195.43,0.41C236.12,1338.86,237.23,1216.29,320.91,1205.75z', 'M2022.06,1205.75c47.02-5.92,149.29-4.7,197.77-0.9c92.01,7.22,91.84,131.5,5.26,141.56 c-45.79,5.32-148.61,4.44-195.43,0.41C1937.27,1338.86,1938.38,1216.29,2022.06,1205.75z', 'M1259.25,261.49c44.58-7.64,81.39,21.63,85.77,65.98c4.38,44.34,5.11,157.4-0.71,200.54 c-11.3,83.81-131.31,81.51-141-2.14c5.89-64.28-8.33-143.75,0.71-206.2C1207.96,292.53,1231.87,266.19,1259.25,261.49z', 'M1259.25,1962.64c44.58-7.64,81.39,21.63,85.77,65.98c4.38,44.34,5.11,157.4-0.71,200.54 c-11.3,83.81-131.31,81.51-141-2.14c5.89-64.28-8.33-143.75,0.71-206.2C1207.96,1993.67,1231.87,1967.33,1259.25,1962.64z'] },
    headphone: { paths: ['M1356.8,302.31c287.05,32.38,553.6,147.06,692.52,412.71c114.83,219.58,103.88,461.28,101.63,702.74 c172.52,146.29,159.83,619.92-78.08,696.09c-13.23,4.24-94.72,24.93-94.72,7.95V1356.7c0-1.69,18.58,7.68,21.9-18.65 c7.05-55.96,2.92-168.18-0.06-227.59c-13.77-274.55-137.1-505.05-402.65-602.77c-297.99-109.66-739.27-64.23-927.95,217.86 c-124.32,185.86-123.44,411.5-117.99,627.84l21.97,11.43v757c0,3.44-8.64,7.78-13.44,8.28c-15.56,1.6-67.61-11.9-85.22-17.69 c-233.83-76.89-245.58-544.93-76.96-690.83l2.76-8.05c1.02-202.87-13.09-407.53,59.29-600.33 c122.58-326.49,400.36-478.65,737.14-505.87l8.58-5.01H1356.8z', 'M1837.68,2248.87h-75.64c-53.1-22.35-85.91-56.69-91.8-116.3c-24.76-250.5,18.59-540.34-0.24-794.99 c11.94-161.38,245.35-166.38,259.73,0c21.9,253.46-16.73,538.22-0.25,794.97C1923.22,2188.51,1889.31,2229.02,1837.68,2248.87z', 'M784.08,2248.87h-70.24c-49.82-19.19-81.73-52.01-91.39-105.9l-0.65-805.39c14-162.13,246.17-167.72,259.73,5.4 c19.74,251.98-15.13,529.5-0.25,784.18C875.06,2189.89,842.82,2228.64,784.08,2248.87z'] },
    moon: { paths: ['M1393.64,158.05l-143.25,100.19c-783.09,662.95-177.98,1958.11,838.59,1739.36l178.74-54.79 c-269.3,356.62-705.79,524.73-1146.39,419.17c-417.16-99.95-745.6-460.57-819.96-881.49C179.93,793.08,690.9,154.2,1393.64,158.05 z'] },
    ribbon: { paths: ['M1079.78,860.59C953.39,778.98,814.41,701.47,660.7,693.05c94.29,110.12,504.65,162.9,412.32,363.15 c-24.49,53.12-226.03,270.92-277.52,316.5c-114.45,101.3-332.37,149.59-434.27,3.97c-107.85-154.11,17.4-325.04,18.62-496.62 c0.98-137.31-142.82-458.92,67.22-505.65c224.05-49.85,397.08,125.06,520.48,284.16C991.61,689.57,1104.01,828.13,1079.78,860.59z M870.31,944.58c-98.59,3.77-208.08,22.83-279.48,97.54C681.49,1022.88,797.74,1002.07,870.31,944.58z', 'M2179.55,417.68c97.45,109.92-9.08,318.11-9.66,449.91c-0.56,127.07,83.11,297.58,66.67,401.81 c-32.4,205.37-262.29,241.56-420.79,147.94c-56.73-33.51-284.88-274.15-322.99-333.73c-139.08-217.46,294.51-277.54,397.63-390.56 c-146.37,13.61-295.13,78.09-412.3,167.48c-14.3-3.73-7.03-34.49-3.42-45.34c21.03-63.3,217.72-292.28,275.83-339.04 C1851.32,395.03,2076.53,301.47,2179.55,417.68z M1960.29,1042.12c-67.53-78.81-181.7-91.42-279.48-97.54 C1753.38,1002.07,1869.62,1022.87,1960.29,1042.12z', 'M2267.72,2006.33c-61.2,5.79-112.27-2.16-170.62-17.89c-54.76-14.76-257.32-128.34-281.82-120.93 c-37.11,11.22-50.63,195.07-71.63,236.72l-34.96,77.07c-169.4-279.6-308.72-666.59-333.87-994.4 c-4.86-63.32,13.6-99.11,82.2-67.56c45.08,20.73,163.14,181.52,217.18,229.98c73.44,65.85,182.18,104.77,237.38,153.89 c41.83,37.23,107.98,171.09,149.1,228.2C2127.76,1824.56,2197.2,1915.96,2267.72,2006.33z', 'M842.18,2188.03c-21.84-12.78-30.79-69.33-37.81-94.67c-11.67-42.18-38.91-216.89-68.53-225.85 c-42.99-13-356.47,204.43-452.38,132.04c47.8-54.78,94.45-111.44,137.12-170.31c52.86-72.94,170.19-282.64,218.96-326.03 c55.2-49.13,163.94-88.04,237.38-153.89c54.11-48.52,171.99-209.16,217.18-229.98c69.02-31.79,86.85,4.67,82.21,67.56 c-9.52,129.04-66.55,355.53-103.41,484.16C1019.52,1857.39,937.11,2020.77,842.18,2188.03z', 'M1429.27,1049.24c-14.53,48.3-248.36,44.71-284.16,22.08c-31.85-20.14-32.02-220.49-16.35-252.72 c21.28-43.76,261.45-44.91,300.51,7.05V1049.24z'] },
  };

  // Vẽ 1 icon: scale viewBox vào `size`, căn giữa (cx,cy), tô từng path riêng.
  function drawIcon(ctx, name, cx, cy, size, col) {
    const ic = ICONS[name];
    if (!ic) return;
    const k = size / ICON_VB;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(k, k);
    ctx.translate(-ICON_VB_C, -ICON_VB_C);
    ctx.fillStyle = col;
    for (const d of ic.paths) ctx.fill(new Path2D(d));
    ctx.restore();
  }

  // Mã trong External note (giữa 2 dấu *) → tên icon
  const ICON_CODES = {
    HRT: 'heart', STR: 'star', FLW: 'flower', DOG: 'dog_feet', LCK: 'lucky_leaf',
    CAM: 'camera', TNS: 'tennis', BMT: 'badminton', PLN: 'plane', PKB: 'pickle',
    SUN: 'sun', HDP: 'headphone', MON: 'moon', BOW: 'ribbon',
  };

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
        const size = targetCap * 2.15; // canh theo viewBox nên cần lớn hơn để icon hiện rõ
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
