/* =========================================================
   park-admin.js — لوحة تحكم مدير المنتزه
   ========================================================= */
'use strict';

let ppAdminPark = null;

function ppInitAdminShell(){
  const session = ppRequireRole(['park_admin']);
  if (!session) return null;
  ppAdminPark = PPStorage.getParkById(session.parkId);

  const toggle = document.getElementById('dashMobileToggle');
  const sidebar = document.getElementById('dashSidebar');
  const overlay = document.getElementById('dashOverlay');
  if (toggle && sidebar && overlay){
    toggle.addEventListener('click', () => { sidebar.classList.add('open'); overlay.classList.add('open'); });
    overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); });
  }
  const parkPill = document.getElementById('dashParkPill');
  if (parkPill && ppAdminPark) parkPill.innerHTML = `منتزهك الحالي<b>${ppEscape(ppAdminPark.name)}</b>`;
  return session;
}

/* ---------------- Dashboard home ---------------- */
function ppRenderAdminDashboard(){
  if (!ppAdminPark) return;
  const bookings = PPStorage.getBookingsByPark(ppAdminPark.id);
  const rides = PPStorage.getRidesByPark(ppAdminPark.id);
  const services = PPStorage.getServicesByPark(ppAdminPark.id);
  const today = new Date().toISOString().slice(0,10);
  const todayBookings = bookings.filter(b => b.date === today);
  const ticketsSold = bookings.filter(b => b.status !== 'ملغى').reduce((s,b) => s + b.quantity, 0);

  document.getElementById('dashStats').innerHTML = `
    <div class="dash-stat-card"><div class="dash-stat-icon" style="background:rgba(0,168,150,.12);color:var(--teal-dark)">${PPIcons.ticket}</div><div><b>${bookings.length}</b><span>إجمالي الحجوزات</span></div></div>
    <div class="dash-stat-card"><div class="dash-stat-icon" style="background:rgba(255,107,74,.12);color:var(--coral)">${PPIcons.clock}</div><div><b>${todayBookings.length}</b><span>الحجوزات اليوم</span></div></div>
    <div class="dash-stat-card"><div class="dash-stat-icon" style="background:rgba(255,182,39,.18);color:#92650a">${PPIcons.check}</div><div><b>${ticketsSold}</b><span>التذاكر المباعة</span></div></div>
    <div class="dash-stat-card"><div class="dash-stat-icon" style="background:rgba(22,35,63,.08);color:var(--navy)">${PPIcons.star}</div><div><b>${rides.length}</b><span>الألعاب</span></div></div>
    <div class="dash-stat-card"><div class="dash-stat-icon" style="background:rgba(0,168,150,.12);color:var(--teal-dark)">${PPIcons.map}</div><div><b>${services.length}</b><span>الخدمات</span></div></div>`;

  const recentWrap = document.getElementById('recentBookings');
  const recent = [...bookings].sort((a,b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 6);
  recentWrap.innerHTML = recent.length ? `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>رقم الحجز</th><th>الزائر</th><th>التاريخ</th><th>النوع</th><th>العدد</th><th>الحالة</th></tr></thead>
      <tbody>${recent.map(b => `<tr>
        <td>${b.id}</td><td>${ppEscape(b.user_name||'')}</td><td>${b.date}</td>
        <td>${ppEscape(b.ticket_type)}</td><td>${b.quantity}</td>
        <td><span class="badge ${ppStatusBadgeClass(b.status)}">${b.status}</span></td>
      </tr>`).join('')}</tbody>
    </table></div>` : `<div class="state-block"><div class="state-icon">${PPIcons.empty}</div><h3>لا توجد حجوزات بعد</h3></div>`;
}

/* ---------------- Rides CRUD ---------------- */
function ppRenderAdminRides(){
  const rides = PPStorage.getRidesByPark(ppAdminPark.id);
  const wrap = document.getElementById('ridesTableWrap');
  if (!rides.length){
    wrap.innerHTML = `<div class="state-block"><div class="state-icon">${PPIcons.empty}</div><h3>لا توجد ألعاب مضافة</h3><p>أضف أول لعبة لمنتزهك.</p></div>`;
    return;
  }
  wrap.innerHTML = `
  <div class="table-wrap"><table class="data-table">
    <thead><tr><th>اسم اللعبة</th><th>الحالة</th><th>الفئة العمرية</th><th>مستوى الإثارة</th><th>آخر تحديث</th><th>إجراءات</th></tr></thead>
    <tbody>${rides.map(r => `
      <tr>
        <td>${ppEscape(r.name)}</td>
        <td><span class="badge ${ppStatusBadgeClass(r.status)}">${r.status}</span></td>
        <td>${r.age_min}+</td>
        <td>${r.thrill_level}</td>
        <td>${r.last_updated}</td>
        <td class="table-actions">
          <button class="btn btn-outline btn-sm" onclick="ppOpenRideModal('${r.id}')">تعديل</button>
          <button class="btn btn-danger btn-sm" onclick="ppDeleteRideFlow('${r.id}')">حذف</button>
        </td>
      </tr>`).join('')}</tbody>
  </table></div>`;
}

function ppOpenRideModal(rideId){
  const ride = rideId ? PPStorage.getRides().find(r => r.id === rideId) : null;
  const overlay = document.getElementById('rideModalOverlay');
  overlay.classList.add('open');
  document.getElementById('rideModalTitle').textContent = ride ? 'تعديل لعبة' : 'إضافة لعبة';
  const form = document.getElementById('rideForm');
  form.dataset.editId = ride ? ride.id : '';
  form.name.value = ride?.name || '';
  form.description.value = ride?.description || '';
  form.category.value = ride?.category || 'عائلية';
  form.age_min.value = ride?.age_min ?? 5;
  form.height_min.value = ride?.height_min ?? 0;
  form.thrill_level.value = ride?.thrill_level || 'متوسط';
  form.status.value = ride?.status || 'متاحة';
}
function ppCloseRideModal(){ document.getElementById('rideModalOverlay').classList.remove('open'); }

function ppSubmitRideForm(e){
  e.preventDefault();
  const form = e.target;
  const payload = {
    park_id: ppAdminPark.id,
    name: form.name.value.trim(),
    description: form.description.value.trim(),
    category: form.category.value,
    age_min: parseInt(form.age_min.value || '0', 10),
    height_min: parseInt(form.height_min.value || '0', 10),
    thrill_level: form.thrill_level.value,
    status: form.status.value
  };
  if (!payload.name){ ppToast('الرجاء إدخال اسم اللعبة', 'error'); return; }

  if (form.dataset.editId){
    PPStorage.updateRide(form.dataset.editId, payload);
    ppToast('تم تحديث بيانات اللعبة', 'success');
  } else {
    PPStorage.addRide(payload);
    ppToast('تمت إضافة اللعبة بنجاح', 'success');
  }
  ppCloseRideModal();
  ppRenderAdminRides();
  ppRenderAdminDashboard();
}

async function ppDeleteRideFlow(id){
  const confirmed = await ppConfirm({ title: 'حذف اللعبة', message: 'هل أنت متأكد من حذف هذه اللعبة؟ لا يمكن التراجع عن هذا الإجراء.' });
  if (!confirmed) return;
  PPStorage.deleteRide(id);
  ppToast('تم حذف اللعبة', 'success');
  ppRenderAdminRides();
}

/* ---------------- Services CRUD ---------------- */
const SERVICE_TYPES = ['مطعم','مقهى','متجر','موقف سيارات','ألعاب أطفال','خدمة طبية','أخرى'];

function ppRenderAdminServices(){
  const services = PPStorage.getServicesByPark(ppAdminPark.id);
  const wrap = document.getElementById('servicesTableWrap');
  if (!services.length){
    wrap.innerHTML = `<div class="state-block"><div class="state-icon">${PPIcons.empty}</div><h3>لا توجد خدمات مضافة</h3></div>`;
    return;
  }
  wrap.innerHTML = `
  <div class="table-wrap"><table class="data-table">
    <thead><tr><th>اسم الخدمة</th><th>النوع</th><th>الموقع</th><th>الحالة</th><th>إجراءات</th></tr></thead>
    <tbody>${services.map(s => `
      <tr>
        <td>${ppEscape(s.name)}</td><td>${s.type}</td><td>${ppEscape(s.location)}</td>
        <td><span class="badge ${ppStatusBadgeClass(s.status)}">${s.status}</span></td>
        <td class="table-actions">
          <button class="btn btn-outline btn-sm" onclick="ppOpenServiceModal('${s.id}')">تعديل</button>
          <button class="btn btn-danger btn-sm" onclick="ppDeleteServiceFlow('${s.id}')">حذف</button>
        </td>
      </tr>`).join('')}</tbody>
  </table></div>`;
}

function ppOpenServiceModal(serviceId){
  const service = serviceId ? PPStorage.getServices().find(s => s.id === serviceId) : null;
  document.getElementById('serviceModalOverlay').classList.add('open');
  document.getElementById('serviceModalTitle').textContent = service ? 'تعديل خدمة' : 'إضافة خدمة';
  const form = document.getElementById('serviceForm');
  form.dataset.editId = service ? service.id : '';
  form.name.value = service?.name || '';
  form.type.value = service?.type || SERVICE_TYPES[0];
  form.location.value = service?.location || '';
  form.description.value = service?.description || '';
  form.status.value = service?.status || 'متاحة';
}
function ppCloseServiceModal(){ document.getElementById('serviceModalOverlay').classList.remove('open'); }

function ppSubmitServiceForm(e){
  e.preventDefault();
  const form = e.target;
  const payload = {
    park_id: ppAdminPark.id,
    name: form.name.value.trim(),
    type: form.type.value,
    location: form.location.value.trim(),
    description: form.description.value.trim(),
    status: form.status.value
  };
  if (!payload.name){ ppToast('الرجاء إدخال اسم الخدمة', 'error'); return; }

  if (form.dataset.editId){
    PPStorage.updateService(form.dataset.editId, payload);
    ppToast('تم تحديث الخدمة', 'success');
  } else {
    PPStorage.addService(payload);
    ppToast('تمت إضافة الخدمة بنجاح', 'success');
  }
  ppCloseServiceModal();
  ppRenderAdminServices();
  ppRenderAdminDashboard();
}

async function ppDeleteServiceFlow(id){
  const confirmed = await ppConfirm({ title: 'حذف الخدمة', message: 'هل أنت متأكد من حذف هذه الخدمة؟' });
  if (!confirmed) return;
  PPStorage.deleteService(id);
  ppToast('تم حذف الخدمة', 'success');
  ppRenderAdminServices();
}

/* ---------------- Tickets & pricing ---------------- */
function ppRenderAdminTickets(){
  const tickets = PPStorage.getTicketsByPark(ppAdminPark.id);
  const wrap = document.getElementById('ticketsTableWrap');
  wrap.innerHTML = `
  <div class="table-wrap"><table class="data-table">
    <thead><tr><th>الباقة</th><th>السعر (د.ل)</th><th>عدد الأشخاص</th><th>الوصف</th><th>الحالة</th><th>إجراءات</th></tr></thead>
    <tbody>${tickets.map(t => `
      <tr>
        <td>${ppEscape(t.name)}</td>
        <td><input type="number" min="0" value="${t.price}" class="ticket-price-input" data-ticket-id="${t.id}" style="width:100px;padding:8px;border:1px solid var(--line);border-radius:8px;"></td>
        <td>${t.people_count}</td>
        <td>${ppEscape(t.description)}</td>
        <td><span class="badge ${ppStatusBadgeClass(t.status)}">${t.status}</span></td>
        <td class="table-actions">
          <button class="btn btn-outline btn-sm" onclick="ppToggleTicketStatus('${t.id}')">${t.status === 'متاحة' ? 'إيقاف' : 'تفعيل'}</button>
          <button class="btn btn-danger btn-sm" onclick="ppDeleteTicketFlow('${t.id}')">حذف</button>
        </td>
      </tr>`).join('')}</tbody>
  </table></div>
  <button class="btn btn-primary" style="margin-top:16px;" onclick="ppOpenTicketModal()">إضافة باقة جديدة</button>`;

  wrap.querySelectorAll('.ticket-price-input').forEach(input => {
    input.addEventListener('change', () => {
      PPStorage.updateTicket(input.dataset.ticketId, { price: parseFloat(input.value || '0') });
      ppToast('تم تحديث السعر', 'success');
    });
  });
}

function ppToggleTicketStatus(id){
  const t = PPStorage.getTickets().find(x => x.id === id);
  PPStorage.updateTicket(id, { status: t.status === 'متاحة' ? 'غير متاحة' : 'متاحة' });
  ppRenderAdminTickets();
}

async function ppDeleteTicketFlow(id){
  const confirmed = await ppConfirm({ title: 'حذف الباقة', message: 'هل تريد حذف هذه الباقة السعرية؟' });
  if (!confirmed) return;
  PPStorage.deleteTicket(id);
  ppToast('تم حذف الباقة', 'success');
  ppRenderAdminTickets();
}

function ppOpenTicketModal(){
  document.getElementById('ticketModalOverlay').classList.add('open');
  const form = document.getElementById('ticketForm');
  form.reset();
}
function ppCloseTicketModal(){ document.getElementById('ticketModalOverlay').classList.remove('open'); }

function ppSubmitTicketForm(e){
  e.preventDefault();
  const form = e.target;
  const payload = {
    park_id: ppAdminPark.id,
    name: form.name.value.trim(),
    price: parseFloat(form.price.value || '0'),
    people_count: parseInt(form.people_count.value || '1', 10),
    description: form.description.value.trim()
  };
  if (!payload.name){ ppToast('الرجاء إدخال اسم الباقة', 'error'); return; }
  PPStorage.addTicket(payload);
  ppToast('تمت إضافة الباقة بنجاح', 'success');
  ppCloseTicketModal();
  ppRenderAdminTickets();
}

/* ---------------- Bookings view ---------------- */
function ppRenderAdminBookings(){
  const statusFilter = document.getElementById('bookingStatusFilter')?.value || '';
  const dateFilter = document.getElementById('bookingDateFilter')?.value || '';
  let bookings = PPStorage.getBookingsByPark(ppAdminPark.id);
  if (statusFilter) bookings = bookings.filter(b => b.status === statusFilter);
  if (dateFilter) bookings = bookings.filter(b => b.date === dateFilter);
  bookings.sort((a,b) => (a.date < b.date ? 1 : -1));

  const wrap = document.getElementById('adminBookingsTableWrap');
  if (!bookings.length){
    wrap.innerHTML = `<div class="state-block"><div class="state-icon">${PPIcons.empty}</div><h3>لا توجد حجوزات مطابقة</h3></div>`;
    return;
  }
  wrap.innerHTML = `
  <div class="table-wrap"><table class="data-table">
    <thead><tr><th>رقم الحجز</th><th>اسم الزائر</th><th>التاريخ</th><th>نوع التذكرة</th><th>العدد</th><th>المبلغ</th><th>الحالة</th></tr></thead>
    <tbody>${bookings.map(b => `
      <tr>
        <td>${b.id}</td><td>${ppEscape(b.user_name||'')}</td><td>${b.date}</td>
        <td>${ppEscape(b.ticket_type)}</td><td>${b.quantity}</td><td>${b.total_price} د.ل</td>
        <td><span class="badge ${ppStatusBadgeClass(b.status)}">${b.status}</span></td>
      </tr>`).join('')}</tbody>
  </table></div>`;
}

/* ---------------- Park settings / status ---------------- */
function ppRenderAdminParkSettings(){
  const form = document.getElementById('parkSettingsForm');
  form.name.value = ppAdminPark.name;
  form.city.value = ppAdminPark.city;
  form.address.value = ppAdminPark.address;
  form.phone.value = ppAdminPark.phone;
  form.hours.value = ppAdminPark.hours;
  form.description.value = ppAdminPark.description;
  document.getElementById('statusSelect').value = ppAdminPark.status;
  document.getElementById('statusMessage').value = ppAdminPark.status_message || '';
  ppToggleStatusMessageField();
}

function ppToggleStatusMessageField(){
  const status = document.getElementById('statusSelect').value;
  document.getElementById('statusMessageField').style.display = status === 'مفتوح' ? 'none' : 'block';
}

function ppSubmitParkSettingsForm(e){
  e.preventDefault();
  const form = e.target;
  PPStorage.updatePark(ppAdminPark.id, {
    name: form.name.value.trim(),
    city: form.city.value.trim(),
    address: form.address.value.trim(),
    phone: form.phone.value.trim(),
    hours: form.hours.value.trim(),
    description: form.description.value.trim()
  });
  ppAdminPark = PPStorage.getParkById(ppAdminPark.id);
  ppToast('تم تحديث معلومات المنتزه', 'success');
}

function ppSubmitStatusForm(e){
  e.preventDefault();
  const status = document.getElementById('statusSelect').value;
  const message = document.getElementById('statusMessage').value.trim();
  PPStorage.updatePark(ppAdminPark.id, { status, status_message: status === 'مفتوح' ? '' : message });
  ppAdminPark = PPStorage.getParkById(ppAdminPark.id);
  ppToast('تم تحديث حالة المنتزه', 'success');
}
