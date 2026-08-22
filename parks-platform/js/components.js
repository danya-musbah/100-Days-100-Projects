/* =========================================================
   components.js — عناصر مشتركة: Navbar / Footer / Toast / Modal / Icons
   ========================================================= */
'use strict';

const PPIcons = {
  ticket: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z"/></svg>',
  search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 6-12 12M6 6l12 12"/></svg>',
  star: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  map: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s7-7.58 7-13a7 7 0 1 0-14 0c0 5.42 7 13 7 13Z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  clock: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  empty: '<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16v12H8l-4 4V4Z"/></svg>',
  check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m20 6-11 11-5-5"/></svg>',
  alert: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>'
};

/* ================= Navbar ================= */
function ppRenderNavbar(activePage){
  const root = document.getElementById('navbar-root');
  if (!root) return;
  const session = PPStorage.getSession();
  const base = ppBasePath();

  let links = '';
  let cta = '';

  if (!session){
    links = [
      ['index.html','الرئيسية'], ['parks.html','المنتزهات'], ['parks.html','استكشف']
    ].map(([href,label]) => `<a href="${base}${href}" class="${activePage===label?'active':''}">${label}</a>`).join('');
    cta = `<a href="${base}login.html" class="btn btn-outline btn-sm">تسجيل الدخول</a>
           <a href="${base}register.html" class="btn btn-primary btn-sm">إنشاء حساب</a>`;
  } else if (session.role === 'visitor'){
    links = [
      ['index.html','الرئيسية'], ['parks.html','المنتزهات'], ['my-bookings.html','حجوزاتي'], ['profile.html','حسابي']
    ].map(([href,label]) => `<a href="${base}${href}" class="${activePage===label?'active':''}">${label}</a>`).join('');
    cta = `<div class="nav-user-pill"><span class="avatar">${(session.name||'ز')[0]}</span><span>${session.name}</span></div>
           <button class="icon-btn" onclick="ppLogout()" title="تسجيل الخروج" aria-label="تسجيل الخروج">${PPIcons.close}</button>`;
  } else if (session.role === 'park_admin'){
    links = [
      ['admin/park-dashboard.html','لوحة التحكم'], ['admin/park-settings.html','المنتزه'],
      ['admin/rides.html','الألعاب'], ['admin/services.html','الخدمات'],
      ['admin/tickets.html','التذاكر'], ['admin/bookings.html','الحجوزات']
    ].map(([href,label]) => `<a href="${base}${href}" class="${activePage===label?'active':''}">${label}</a>`).join('');
    cta = `<div class="nav-user-pill"><span class="avatar">${(session.name||'م')[0]}</span><span>${session.name}</span></div>
           <button class="icon-btn" onclick="ppLogout()" title="تسجيل الخروج" aria-label="تسجيل الخروج">${PPIcons.close}</button>`;
  } else if (session.role === 'super_admin'){
    links = [
      ['super-admin/dashboard.html','لوحة التحكم'], ['super-admin/parks.html','المنتزهات'],
      ['super-admin/managers.html','مديرو المنتزهات'], ['super-admin/statistics.html','الإحصائيات']
    ].map(([href,label]) => `<a href="${base}${href}" class="${activePage===label?'active':''}">${label}</a>`).join('');
    cta = `<div class="nav-user-pill"><span class="avatar">${(session.name||'س')[0]}</span><span>${session.name}</span></div>
           <button class="icon-btn" onclick="ppLogout()" title="تسجيل الخروج" aria-label="تسجيل الخروج">${PPIcons.close}</button>`;
  }

  root.innerHTML = `
  <nav class="navbar" aria-label="التنقل الرئيسي">
    <div class="container">
      <a href="${base}index.html" class="brand">
        <span class="brand-mark">${PPIcons.ticket}</span>
        منتزهات
      </a>
      <div class="nav-links" id="navLinks">${links}</div>
      <div class="nav-cta">
        ${cta}
        <button class="nav-toggle" id="navToggle" aria-label="القائمة" aria-expanded="false">${PPIcons.menu}</button>
      </div>
    </div>
  </nav>`;

  const toggle = document.getElementById('navToggle');
  const navLinksEl = document.getElementById('navLinks');
  if (toggle){
    toggle.addEventListener('click', () => {
      navLinksEl.classList.toggle('open');
      const expanded = navLinksEl.classList.contains('open');
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.innerHTML = expanded ? PPIcons.close : PPIcons.menu;
    });
  }
}

function ppBasePath(){
  const path = window.location.pathname;
  if (path.includes('/admin/') || path.includes('/super-admin/')) return '../';
  return '';
}

function ppLogout(){
  PPStorage.clearSession();
  window.location.href = ppBasePath() + 'index.html';
}

/* ================= Footer ================= */
function ppRenderFooter(){
  const root = document.getElementById('footer-root');
  if (!root) return;
  const base = ppBasePath();
  root.innerHTML = `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <div class="brand" style="color:#fff;margin-bottom:14px;">
            <span class="brand-mark">${PPIcons.ticket}</span> منتزهات
          </div>
          <p style="color:rgba(255,255,255,.7);font-size:.92rem;max-width:280px;">
            منصتك الأولى لاستكشاف أفضل المنتزهات الترفيهية في ليبيا وحجز تذاكرك بكل سهولة وأمان.
          </p>
        </div>
        <div>
          <h4>روابط سريعة</h4>
          <ul>
            <li><a href="${base}index.html">الرئيسية</a></li>
            <li><a href="${base}parks.html">المنتزهات</a></li>
            <li><a href="${base}my-bookings.html">حجوزاتي</a></li>
          </ul>
        </div>
        <div>
          <h4>حسابي</h4>
          <ul>
            <li><a href="${base}login.html">تسجيل الدخول</a></li>
            <li><a href="${base}register.html">إنشاء حساب</a></li>
            <li><a href="${base}profile.html">الملف الشخصي</a></li>
          </ul>
        </div>
        <div>
          <h4>تواصل معنا</h4>
          <ul>
            <li>الدعم الفني: support@parks.demo</li>
            <li>خط المساعدة: 1900-XXX</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 منتزهات | Parks Platform — مشروع تخرج تجريبي</span>
        <span>صُنع بشغف في ليبيا 🇱🇾</span>
      </div>
    </div>
  </footer>`;
}

/* ================= Toast notifications ================= */
function ppToast(message, type = 'info'){
  let container = document.querySelector('.toast-container');
  if (!container){
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icon = type === 'success' ? PPIcons.check : type === 'error' ? PPIcons.alert : PPIcons.ticket;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .25s ease';
    setTimeout(() => toast.remove(), 260);
  }, 3200);
}

/* ================= Confirm modal ================= */
function ppConfirm({ title, message, confirmLabel = 'تأكيد', cancelLabel = 'إلغاء', danger = true }){
  return new Promise((resolve) => {
    let overlay = document.getElementById('ppConfirmOverlay');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.id = 'ppConfirmOverlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="ppConfirmTitle">
        <h3 id="ppConfirmTitle">${title}</h3>
        <p>${message}</p>
        <div class="modal-actions">
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="ppConfirmYes">${confirmLabel}</button>
          <button class="btn btn-outline" id="ppConfirmNo">${cancelLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('ppConfirmYes').onclick = () => { overlay.remove(); resolve(true); };
    document.getElementById('ppConfirmNo').onclick = () => { overlay.remove(); resolve(false); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay){ overlay.remove(); resolve(false); } });
  });
}

/* ================= Small helpers ================= */
function ppStatusBadgeClass(status){
  const map = {
    'مفتوح': 'badge-open', 'مغلق': 'badge-closed', 'مغلق مؤقتًا': 'badge-temp',
    'متاحة': 'badge-available', 'متوقفة مؤقتًا': 'badge-temp', 'تحت الصيانة': 'badge-maintenance',
    'مؤكد': 'badge-confirmed', 'مستخدم': 'badge-used', 'ملغى': 'badge-cancelled', 'منتهي': 'badge-expired',
    'مغلقة مؤقتًا': 'badge-temp', 'نشط': 'badge-available'
  };
  return map[status] || 'badge-temp';
}

function ppFormatArabicDate(isoDate){
  if (!isoDate) return '—';
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const [y,m,d] = isoDate.split('-').map(Number);
  return `${d} ${months[m-1]} ${y}`;
}

function ppEscape(str){
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function ppRequireRole(allowedRoles){
  const session = PPStorage.getSession();
  const base = ppBasePath();
  if (!session || !allowedRoles.includes(session.role)){
    window.location.href = base + 'login.html';
    return null;
  }
  return session;
}

document.addEventListener('DOMContentLoaded', () => {
  const active = document.body.getAttribute('data-active-link');
  ppRenderNavbar(active);
  ppRenderFooter();
});
