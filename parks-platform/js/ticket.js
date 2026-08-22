/* =========================================================
   ticket.js — التذكرة الإلكترونية + توليد QR تجريبي (Mock)
   ملاحظة: هذا رمز QR تجريبي لأغراض العرض فقط وليس رمزًا فعليًا قابلًا للمسح.
   ========================================================= */
'use strict';

function ppHashSeed(str){
  let h = 0;
  for (let i = 0; i < str.length; i++){
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function ppMockRandom(seed){
  let s = seed;
  return function(){
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function ppDrawMockQR(canvas, text){
  const size = 168;
  const cells = 14;
  const cellSize = size / cells;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#16233F';

  const rand = ppMockRandom(ppHashSeed(text));
  const isFinder = (r, c) => (r < 3 && c < 3) || (r < 3 && c >= cells - 3) || (r >= cells - 3 && c < 3);

  for (let r = 0; r < cells; r++){
    for (let c = 0; c < cells; c++){
      if (isFinder(r, c)) continue;
      if (rand() > 0.52){
        ctx.fillRect(c * cellSize, r * cellSize, cellSize - 1, cellSize - 1);
      }
    }
  }

  // Finder patterns (corners) — visual signature of a QR code
  const drawFinder = (rOff, cOff) => {
    ctx.fillStyle = '#16233F';
    ctx.fillRect(rOff * cellSize, cOff * cellSize, cellSize * 3, cellSize * 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect((rOff+0.5) * cellSize, (cOff+0.5) * cellSize, cellSize * 2, cellSize * 2);
    ctx.fillStyle = '#16233F';
    ctx.fillRect((rOff+1) * cellSize, (cOff+1) * cellSize, cellSize, cellSize);
  };
  drawFinder(0, 0);
  drawFinder(0, cells - 3);
  drawFinder(cells - 3, 0);
}

function ppTicketPageRender(){
  const id = new URLSearchParams(window.location.search).get('id');
  const root = document.getElementById('ticketRoot');
  const booking = id ? PPStorage.getBookingById(id) : null;

  if (!booking){
    root.innerHTML = `
      <div class="state-block">
        <div class="state-icon">${PPIcons.empty}</div>
        <h3>لم يتم العثور على هذه التذكرة</h3>
        <p>تأكد من رقم الحجز أو ارجع إلى صفحة حجوزاتي.</p>
        <a href="my-bookings.html" class="btn btn-primary" style="margin-top:16px;">حجوزاتي</a>
      </div>`;
    return;
  }

  const park = PPStorage.getParkById(booking.park_id);
  root.innerHTML = `
    <div class="digital-ticket">
      <div class="dt-top">
        <div class="dt-brand">${PPIcons.ticket} منتزهات</div>
        <div class="dt-park">${ppEscape(booking.park_name)}</div>
        <div class="dt-grid">
          <div><span>اسم الزائر</span><b>${ppEscape(booking.user_name || '')}</b></div>
          <div><span>تاريخ الزيارة</span><b>${ppFormatArabicDate(booking.date)}</b></div>
          <div><span>نوع التذكرة</span><b>${ppEscape(booking.ticket_type)}</b></div>
          <div><span>عدد التذاكر</span><b>${booking.quantity}</b></div>
          <div><span>رقم الحجز</span><b>${booking.id}</b></div>
          <div><span>حالة الحجز</span><b><span class="badge ${ppStatusBadgeClass(booking.status)}">${booking.status}</span></b></div>
        </div>
      </div>
      <div class="dt-perforation"></div>
      <div class="dt-qr-section">
        <canvas id="qrCanvas" aria-label="رمز QR للتذكرة"></canvas>
        <div class="dt-code">${booking.id}</div>
        <span style="opacity:.7;font-size:.82rem;">${park ? ppEscape(park.address) : ''}</span>
      </div>
    </div>
    <div class="ticket-actions">
      <button class="btn btn-primary btn-block" onclick="window.print()">طباعة التذكرة</button>
      <a class="btn btn-outline btn-block" href="my-bookings.html">العودة لحجوزاتي</a>
    </div>`;

  ppDrawMockQR(document.getElementById('qrCanvas'), booking.id);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('ticketRoot')) ppTicketPageRender();
});
