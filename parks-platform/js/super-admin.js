/* =========================================================
   super-admin.js — لوحة تحكم مدير المنصة
   ========================================================= */
'use strict';

function ppInitSuperAdminShell(){
  const session = ppRequireRole(['super_admin']);
  if (!session) return null;
  const toggle = document.getElementById('dashMobileToggle');
  const sidebar = document.getElementById('dashSidebar');
  const overlay = document.getElementById('dashOverlay');
  if (toggle && sidebar && overlay){
    toggle.addEventListener('click', () => { sidebar.classList.add('open'); overlay.classList.add('open'); });
    overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); });
  }
  return session;
}

/* ---------------- Dashboard ---------------- */
function ppRenderSuperAdminDashboard(){
  const parks = PPStorage.getParks();
  const bookings = PPStorage.getBookings();
  const admins = PPStorage.getAdmins().park_admins;
  const openParks = parks.filter(p => p.status === 'مفتوح').length;
  const closedParks = parks.length - openParks;

  document.getElementById('dashStats').innerHTML = `
    <div class="dash-stat-card"><div class="dash-stat-icon" style="background:rgba(22,35,63,.08);color:var(--navy)">${PPIcons.map}</div><div><b>${parks.length}</b><span>إجمالي المنتزهات</span></div></div>
    <div class="dash-stat-card"><div class="dash-stat-icon" style="background:rgba(0,168,150,.12);color:var(--teal-dark)">${PPIcons.check}</div><div><b>${openParks}</b><span>المنتزهات المفتوحة</span></div></div>
    <div class="dash-stat-card"><div class="dash-stat-icon" style="background:rgba(225,79,48,.12);color:var(--danger)">${PPIcons.alert}</div><div><b>${closedParks}</b><span>المنتزهات المغلقة</span></div></div>
    <div class="dash-stat-card"><div class="dash-stat-icon" style="background:rgba(255,182,39,.18);color:#92650a">${PPIcons.star}</div><div><b>${admins.length}</b><span>مديرو المنتزهات</span></div></div>
    <div class="dash-stat-card"><div class="dash-stat-icon" style="background:rgba(255,107,74,.12);color:var(--coral)">${PPIcons.ticket}</div><div><b>${bookings.length}</b><span>إجمالي الحجوزات</span></div></div>`;

  const wrap = document.getElementById('parksOverview');
  wrap.innerHTML = `
  <div class="table-wrap"><table class="data-table">
    <thead><tr><th>المنتزه</th><th>المدينة</th><th>الحالة</th><th>التقييم</th></tr></thead>
    <tbody>${parks.slice(0,8).map(p => `
      <tr><td>${ppEscape(p.name)}</td><td>${p.city}</td>
      <td><span class="badge ${ppStatusBadgeClass(p.status)}">${p.status}</span></td>
      <td>${p.rating.toFixed(1)}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

/* ---------------- Parks management ---------------- */
function ppRenderSuperAdminParks(){
  const parks = PPStorage.getParks();
  const wrap = document.getElementById('parksTableWrap');
  wrap.innerHTML = `
  <div class="table-wrap"><table class="data-table">
    <thead><tr><th>اسم المنتزه</th><th>المدينة</th><th>الحالة</th><th>المدير المسؤول</th><th>إجراءات</th></tr></thead>
    <tbody>${parks.map(p => {
      const admin = PPStorage.getAdmins().park_admins.find(a => a.park_id === p.id);
      return `<tr>
        <td>${ppEscape(p.name)}</td><td>${p.city}</td>
        <td><span class="badge ${ppStatusBadgeClass(p.status)}">${p.status}</span></td>
        <td>${admin ? ppEscape(admin.name) : '<span style="color:var(--muted)">غير معيّن</span>'}</td>
        <td class="table-actions">
          <button class="btn btn-outline btn-sm" onclick="ppOpenParkModal('${p.id}')">تعديل</button>
          <button class="btn btn-danger btn-sm" onclick="ppDeleteParkFlow('${p.id}')">حذف</button>
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

function ppOpenParkModal(parkId){
  const park = parkId ? PPStorage.getParkById(parkId) : null;
  document.getElementById('parkModalOverlay').classList.add('open');
  document.getElementById('parkModalTitle').textContent = park ? 'تعديل منتزه' : 'إضافة منتزه';
  const form = document.getElementById('parkForm');
  form.dataset.editId = park ? park.id : '';
  form.name.value = park?.name || '';
  form.city.value = park?.city || '';
  form.address.value = park?.address || '';
  form.phone.value = park?.phone || '';
  form.hours.value = park?.hours || '10:00 ص - 10:00 م';
  form.price_from.value = park?.price_from || 25;
  form.description.value = park?.description || '';
}
function ppCloseParkModal(){ document.getElementById('parkModalOverlay').classList.remove('open'); }

function ppSubmitParkForm(e){
  e.preventDefault();
  const form = e.target;
  const payload = {
    name: form.name.value.trim(),
    city: form.city.value.trim(),
    address: form.address.value.trim(),
    phone: form.phone.value.trim(),
    hours: form.hours.value.trim(),
    price_from: parseFloat(form.price_from.value || '0'),
    description: form.description.value.trim(),
    images: ['assets/images/park-1.svg']
  };
  if (!payload.name || !payload.city){ ppToast('الرجاء إدخال اسم المنتزه والمدينة', 'error'); return; }

  if (form.dataset.editId){
    PPStorage.updatePark(form.dataset.editId, payload);
    ppToast('تم تحديث بيانات المنتزه', 'success');
  } else {
    PPStorage.addPark(payload);
    ppToast('تمت إضافة المنتزه بنجاح', 'success');
  }
  ppCloseParkModal();
  ppRenderSuperAdminParks();
}

async function ppDeleteParkFlow(id){
  const confirmed = await ppConfirm({ title: 'حذف المنتزه', message: 'سيتم حذف المنتزه وجميع الألعاب والخدمات المرتبطة به. هل أنت متأكد؟' });
  if (!confirmed) return;
  PPStorage.deletePark(id);
  ppToast('تم حذف المنتزه', 'success');
  ppRenderSuperAdminParks();
}

/* ---------------- Managers management ---------------- */
function ppRenderSuperAdminManagers(){
  const admins = PPStorage.getAdmins().park_admins;
  const parks = PPStorage.getParks();
  const wrap = document.getElementById('managersTableWrap');
  if (!admins.length){
    wrap.innerHTML = `<div class="state-block"><div class="state-icon">${PPIcons.empty}</div><h3>لا يوجد مديرو منتزهات</h3></div>`;
    return;
  }
  wrap.innerHTML = `
  <div class="table-wrap"><table class="data-table">
    <thead><tr><th>اسم المدير</th><th>البريد الإلكتروني</th><th>المنتزه المسؤول عنه</th><th>الحالة</th><th>إجراءات</th></tr></thead>
    <tbody>${admins.map(a => {
      const park = parks.find(p => p.id === a.park_id);
      return `<tr>
        <td>${ppEscape(a.name)}</td><td>${a.email}</td>
        <td>${park ? ppEscape(park.name) : '—'}</td>
        <td><span class="badge ${ppStatusBadgeClass(a.status)}">${a.status}</span></td>
        <td class="table-actions">
          <button class="btn btn-outline btn-sm" onclick="ppOpenManagerModal('${a.id}')">تعديل</button>
          <button class="btn btn-danger btn-sm" onclick="ppDeleteManagerFlow('${a.id}')">حذف</button>
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

function ppPopulateParkSelect(selectEl, selectedParkId){
  const parks = PPStorage.getParks();
  selectEl.innerHTML = parks.map(p => `<option value="${p.id}" ${p.id === selectedParkId ? 'selected' : ''}>${ppEscape(p.name)}</option>`).join('');
}

function ppOpenManagerModal(adminId){
  const admin = adminId ? PPStorage.getAdmins().park_admins.find(a => a.id === adminId) : null;
  document.getElementById('managerModalOverlay').classList.add('open');
  document.getElementById('managerModalTitle').textContent = admin ? 'تعديل مدير منتزه' : 'إضافة مدير منتزه';
  const form = document.getElementById('managerForm');
  form.dataset.editId = admin ? admin.id : '';
  form.name.value = admin?.name || '';
  form.email.value = admin?.email || '';
  form.password.value = admin?.password || '123456';
  ppPopulateParkSelect(form.park_id, admin?.park_id);
}
function ppCloseManagerModal(){ document.getElementById('managerModalOverlay').classList.remove('open'); }

function ppSubmitManagerForm(e){
  e.preventDefault();
  const form = e.target;
  const payload = {
    name: form.name.value.trim(),
    email: form.email.value.trim().toLowerCase(),
    password: form.password.value,
    park_id: form.park_id.value
  };
  if (!payload.name || !payload.email){ ppToast('الرجاء تعبئة جميع الحقول', 'error'); return; }

  if (form.dataset.editId){
    PPStorage.updateAdmin(form.dataset.editId, payload);
    ppToast('تم تحديث بيانات المدير', 'success');
  } else {
    PPStorage.addAdmin(payload);
    ppToast('تمت إضافة مدير المنتزه بنجاح', 'success');
  }
  ppCloseManagerModal();
  ppRenderSuperAdminManagers();
}

async function ppDeleteManagerFlow(id){
  const confirmed = await ppConfirm({ title: 'حذف المدير', message: 'هل أنت متأكد من حذف حساب هذا المدير؟' });
  if (!confirmed) return;
  PPStorage.deleteAdmin(id);
  ppToast('تم حذف المدير', 'success');
  ppRenderSuperAdminManagers();
}

/* ---------------- Statistics ---------------- */
function ppRenderSuperAdminStatistics(){
  const parks = PPStorage.getParks();
  const bookings = PPStorage.getBookings();
  const cities = {};
  parks.forEach(p => { cities[p.city] = (cities[p.city] || 0) + 1; });

  const wrap = document.getElementById('statsWrap');
  const totalRevenue = bookings.filter(b => b.status !== 'ملغى').reduce((s,b) => s + b.total_price, 0);

  wrap.innerHTML = `
    <div class="dash-stats">
      <div class="dash-stat-card"><div class="dash-stat-icon" style="background:rgba(22,35,63,.08);color:var(--navy)">${PPIcons.map}</div><div><b>${parks.length}</b><span>منتزهات على المنصة</span></div></div>
      <div class="dash-stat-card"><div class="dash-stat-icon" style="background:rgba(0,168,150,.12);color:var(--teal-dark)">${PPIcons.ticket}</div><div><b>${bookings.length}</b><span>إجمالي الحجوزات</span></div></div>
      <div class="dash-stat-card"><div class="dash-stat-icon" style="background:rgba(255,182,39,.18);color:#92650a">${PPIcons.check}</div><div><b>${totalRevenue}</b><span>إجمالي المبيعات (د.ل) — تقديري</span></div></div>
    </div>
    <div class="dash-panel">
      <h3>توزيع المنتزهات حسب المدينة</h3>
      <div class="chip-group">${Object.entries(cities).map(([city,count]) => `<span class="chip">${city}: ${count}</span>`).join('')}</div>
    </div>`;
}
