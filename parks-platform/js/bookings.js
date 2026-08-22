/* =========================================================
   bookings.js — صفحة "حجوزاتي": القادمة / السابقة / الملغاة
   ========================================================= */
'use strict';

function ppBookingCardHTML(b){
  return `
  <div class="booking-card" data-booking-id="${b.id}">
    <div class="bk-info">
      <div class="bk-thumb"></div>
      <div>
        <h4>${ppEscape(b.park_name)}</h4>
        <div class="bk-meta">
          <span>${PPIcons.clock} ${ppFormatArabicDate(b.date)}</span>
          <span>${ppEscape(b.ticket_type)} × ${b.quantity}</span>
          <span>${b.total_price} د.ل</span>
          <span class="badge ${ppStatusBadgeClass(b.status)}">${b.status}</span>
        </div>
        <div class="bk-meta"><span>رقم الحجز: ${b.id}</span></div>
      </div>
    </div>
    <div class="bk-actions">
      <a class="btn btn-outline btn-sm" href="ticket.html?id=${b.id}">عرض التذكرة</a>
      ${b.status === 'مؤكد' ? `<button class="btn btn-danger btn-sm" onclick="ppCancelBookingFlow('${b.id}')">إلغاء الحجز</button>` : ''}
    </div>
  </div>`;
}

function ppEmptyStateHTML(text){
  return `<div class="state-block"><div class="state-icon">${PPIcons.empty}</div><h3>لا توجد حجوزات</h3><p>${text}</p></div>`;
}

function ppRenderBookingsTab(tab){
  const session = PPStorage.getSession();
  const bookings = PPStorage.getBookingsByUser(session.email).sort((a,b) => (a.date < b.date ? 1 : -1));
  const today = new Date().toISOString().slice(0,10);

  let list = [];
  if (tab === 'upcoming') list = bookings.filter(b => b.status === 'مؤكد' && b.date >= today);
  if (tab === 'past') list = bookings.filter(b => b.status === 'مستخدم' || (b.status === 'مؤكد' && b.date < today));
  if (tab === 'cancelled') list = bookings.filter(b => b.status === 'ملغى');

  const container = document.getElementById('bookingsList');
  container.innerHTML = list.length ? list.map(ppBookingCardHTML).join('') : ppEmptyStateHTML('لا توجد حجوزات في هذا القسم حاليًا.');
}

async function ppCancelBookingFlow(id){
  const confirmed = await ppConfirm({
    title: 'هل أنت متأكد من إلغاء هذا الحجز؟',
    message: 'لن تتمكن من التراجع عن هذا الإجراء، وستفقد مكانك المحجوز.',
    confirmLabel: 'نعم، إلغاء الحجز',
    cancelLabel: 'العودة'
  });
  if (!confirmed) return;
  PPStorage.cancelBooking(id);
  ppToast('تم إلغاء الحجز', 'success');
  const activeTab = document.querySelector('.chip.active')?.dataset.tab || 'upcoming';
  ppRenderBookingsTab(activeTab);
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('bookingsList');
  if (!container) return;
  const session = ppRequireRole(['visitor']);
  if (!session) return;

  const tabs = document.querySelectorAll('.chip[data-tab]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      ppRenderBookingsTab(tab.dataset.tab);
    });
  });
  ppRenderBookingsTab('upcoming');
});
