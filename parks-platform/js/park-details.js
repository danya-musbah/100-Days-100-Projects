/* =========================================================
   park-details.js — تفاصيل المنتزه، الألعاب، الخدمات، والحجز
   ========================================================= */
'use strict';

let ppCurrentPark = null;
let ppSelectedTicketId = null;

function ppRideCardHTML(ride){
  return `
  <div class="card">
    <div class="card-media">
      <img src="${ride.image}" alt="لعبة ${ppEscape(ride.name)}" loading="lazy">
      <span class="badge ${ppStatusBadgeClass(ride.status)}">${ride.status}</span>
    </div>
    <div class="card-body">
      <div class="card-title">${ppEscape(ride.name)}</div>
      <p class="card-desc">${ppEscape(ride.description)}</p>
      <div class="card-meta">
        <span>الفئة العمرية: ${ride.age_min}+ سنوات</span>
      </div>
      <div class="card-meta">
        ${ride.height_min ? `<span>الطول المطلوب: ${ride.height_min} سم</span>` : '<span>لا يوجد شرط طول</span>'}
      </div>
      <div class="card-footer">
        <span class="chip">مستوى الإثارة: ${ride.thrill_level}</span>
      </div>
    </div>
  </div>`;
}

function ppServiceCardHTML(service){
  return `
  <div class="card">
    <div class="card-body">
      <div class="card-title">${ppEscape(service.name)}</div>
      <div class="card-meta"><span class="chip">${service.type}</span> <span class="badge ${ppStatusBadgeClass(service.status)}">${service.status}</span></div>
      <p class="card-desc">${ppEscape(service.description)}</p>
      <div class="card-meta">${PPIcons.map} ${service.location}</div>
    </div>
  </div>`;
}

function ppTicketOptionHTML(ticket){
  return `
  <div class="ticket-option" data-ticket-id="${ticket.id}" role="button" tabindex="0" aria-pressed="false">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
      <div>
        <h4>${ppEscape(ticket.name)}</h4>
        <p class="card-desc">${ppEscape(ticket.description)}</p>
      </div>
      <div class="price">${ticket.price} د.ل</div>
    </div>
  </div>`;
}

function ppRenderParkDetails(park){
  document.title = `${park.name} | منتزهات`;
  const hero = document.getElementById('parkHero');
  hero.innerHTML = `
    <div class="park-hero-media"><img src="${park.images[0]}" alt="صورة منتزه ${ppEscape(park.name)}"></div>
    <div class="park-hero-info">
      <div>
        <h1>${ppEscape(park.name)}</h1>
        <div class="park-hero-meta">
          <span>${PPIcons.map} ${park.city} — ${ppEscape(park.address)}</span>
          <span class="rating">${PPIcons.star} ${park.rating.toFixed(1)} <span class="count">(${park.reviews_count} تقييم)</span></span>
          <span class="badge ${ppStatusBadgeClass(park.status)}">${park.status}</span>
        </div>
        ${park.status !== 'مفتوح' && park.status_message ? `<div class="park-status-note">${ppEscape(park.status_message)}</div>` : ''}
      </div>
    </div>`;

  document.getElementById('parkInfoList').innerHTML = `
    <div class="info-item"><span class="label">ساعات العمل</span><span class="value">${park.hours}</span></div>
    <div class="info-item"><span class="label">رقم الهاتف</span><span class="value">${park.phone}</span></div>
    <div class="info-item"><span class="label">التقييم</span><span class="value">${park.rating.toFixed(1)} / 5</span></div>
    <div class="info-item"><span class="label">السعر يبدأ من</span><span class="value">${park.price_from} د.ل</span></div>
  `;
  document.getElementById('parkDescription').textContent = park.description;
}

function ppInitTabs(){
  const buttons = document.querySelectorAll('.details-tabs button');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

function ppUpdateBookingSummary(){
  const summary = document.getElementById('bookingSummary');
  const ticket = PPStorage.getTickets().find(t => t.id === ppSelectedTicketId);
  const qty = parseInt(document.getElementById('ticketQty').value || '1', 10);
  const date = document.getElementById('visitDate').value;
  const confirmBtn = document.getElementById('confirmBookingBtn');

  if (!ticket){
    summary.innerHTML = `<p class="card-desc">اختر نوع التذكرة لعرض ملخص الحجز.</p>`;
    confirmBtn.disabled = true;
    return;
  }

  const total = ticket.price * qty;
  summary.innerHTML = `
    <div class="summary-row"><span>المنتزه</span><b>${ppEscape(ppCurrentPark.name)}</b></div>
    <div class="summary-row"><span>التاريخ</span><b>${date ? ppFormatArabicDate(date) : '—'}</b></div>
    <div class="summary-row"><span>${ppEscape(ticket.name)}</span><b>${qty}</b></div>
    <div class="summary-row"><span>السعر للتذكرة</span><b>${ticket.price} د.ل</b></div>
    <div class="summary-total"><span>الإجمالي</span><span>${total} د.ل</span></div>`;

  confirmBtn.disabled = !date;
}

function ppConfirmBooking(){
  const session = PPStorage.getSession();
  if (!session || session.role !== 'visitor'){
    ppToast('الرجاء تسجيل الدخول كزائر لإتمام الحجز', 'error');
    setTimeout(() => window.location.href = `login.html?redirect=park-details.html?id=${ppCurrentPark.id}`, 900);
    return;
  }
  const ticket = PPStorage.getTickets().find(t => t.id === ppSelectedTicketId);
  const qty = parseInt(document.getElementById('ticketQty').value || '1', 10);
  const date = document.getElementById('visitDate').value;
  if (!ticket || !date){
    ppToast('الرجاء استكمال بيانات الحجز', 'error');
    return;
  }

  const btn = document.getElementById('confirmBookingBtn');
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'جاري تأكيد الحجز...';

  setTimeout(() => {
    const booking = PPStorage.createBooking({
      user_email: session.email,
      user_name: session.name,
      park_id: ppCurrentPark.id,
      park_name: ppCurrentPark.name,
      date,
      ticket_id: ticket.id,
      ticket_type: ticket.name,
      quantity: qty,
      total_price: ticket.price * qty
    });
    ppToast(`✓ تم تأكيد الحجز بنجاح — رقم الحجز: ${booking.id}`, 'success');
    setTimeout(() => window.location.href = `ticket.html?id=${booking.id}`, 900);
  }, 600);
}

document.addEventListener('DOMContentLoaded', () => {
  const heroEl = document.getElementById('parkHero');
  if (!heroEl) return;

  const parkId = new URLSearchParams(window.location.search).get('id');
  const park = parkId ? PPStorage.getParkById(parkId) : null;

  if (!park){
    document.getElementById('parkDetailsRoot').innerHTML = `
      <div class="state-block">
        <div class="state-icon">${PPIcons.empty}</div>
        <h3>لم يتم العثور على هذا المنتزه</h3>
        <p>ربما تم حذفه أو أن الرابط غير صحيح.</p>
        <a href="parks.html" class="btn btn-primary" style="margin-top:16px;">تصفح كل المنتزهات</a>
      </div>`;
    return;
  }

  ppCurrentPark = park;
  ppRenderParkDetails(park);
  ppInitTabs();

  document.getElementById('ridesGrid').innerHTML = PPStorage.getRidesByPark(park.id).map(ppRideCardHTML).join('') || '<p class="card-desc">لا توجد ألعاب مضافة حاليًا لهذا المنتزه.</p>';
  document.getElementById('servicesGrid').innerHTML = PPStorage.getServicesByPark(park.id).map(ppServiceCardHTML).join('') || '<p class="card-desc">لا توجد خدمات مضافة حاليًا لهذا المنتزه.</p>';

  const ticketsWrap = document.getElementById('ticketsGrid');
  const tickets = PPStorage.getTicketsByPark(park.id);
  ticketsWrap.innerHTML = tickets.map(ppTicketOptionHTML).join('');

  ticketsWrap.querySelectorAll('.ticket-option').forEach(opt => {
    const select = () => {
      ticketsWrap.querySelectorAll('.ticket-option').forEach(o => { o.classList.remove('selected'); o.setAttribute('aria-pressed','false'); });
      opt.classList.add('selected');
      opt.setAttribute('aria-pressed','true');
      ppSelectedTicketId = opt.dataset.ticketId;
      ppUpdateBookingSummary();
    };
    opt.addEventListener('click', select);
    opt.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); select(); } });
  });

  const dateInput = document.getElementById('visitDate');
  const today = new Date().toISOString().slice(0,10);
  dateInput.min = today;
  dateInput.addEventListener('change', ppUpdateBookingSummary);
  document.getElementById('ticketQty').addEventListener('input', ppUpdateBookingSummary);
  document.getElementById('confirmBookingBtn').addEventListener('click', ppConfirmBooking);

  ppUpdateBookingSummary();
});
