/* =========================================================
   app.js — منطق الصفحة الرئيسية (index.html)
   ========================================================= */
'use strict';

function ppParkCardHTML(park){
  const badgeClass = ppStatusBadgeClass(park.status);
  return `
  <a href="park-details.html?id=${park.id}" class="card" aria-label="عرض تفاصيل ${ppEscape(park.name)}">
    <div class="card-media">
      <img src="${park.images[0]}" alt="صورة منتزه ${ppEscape(park.name)}" loading="lazy">
      <span class="badge ${badgeClass}">${park.status}</span>
    </div>
    <div class="card-body">
      <div class="card-title">${ppEscape(park.name)}</div>
      <div class="card-meta">
        <span>${PPIcons.map} ${park.city}</span>
        <span class="rating">${PPIcons.star} ${park.rating.toFixed(1)} <span class="count">(${park.reviews_count})</span></span>
      </div>
      <div class="card-meta"><span>${PPIcons.clock} ${park.hours}</span></div>
      <div class="card-footer">
        <span class="price-tag">${park.price_from} د.ل <small>ابتداءً من</small></span>
        <span class="btn btn-outline btn-sm">عرض المنتزه</span>
      </div>
    </div>
  </a>`;
}

function ppRenderHomeStats(){
  const parks = PPStorage.getParks();
  const rides = PPStorage.getRides();
  const bookings = PPStorage.getBookings();
  const openCount = parks.filter(p => p.status === 'مفتوح').length;

  const wrap = document.getElementById('homeStats');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="hero-stat"><b>${parks.length}+</b><span>منتزه ترفيهي</span></div>
    <div class="hero-stat"><b>${rides.length}+</b><span>لعبة متنوعة</span></div>
    <div class="hero-stat"><b>${openCount}</b><span>منتزه مفتوح الآن</span></div>
    <div class="hero-stat"><b>${bookings.length}+</b><span>حجز تم تأكيده</span></div>`;
}

function ppRenderFeaturedParks(){
  const wrap = document.getElementById('featuredParks');
  if (!wrap) return;
  const parks = PPStorage.getParks();
  const top = [...parks].sort((a,b) => b.rating - a.rating).slice(0, 6);
  wrap.innerHTML = top.map(ppParkCardHTML).join('');
}

function ppHandleHeroSearch(e){
  e.preventDefault();
  const q = document.getElementById('heroSearchInput').value.trim();
  window.location.href = 'parks.html' + (q ? `?q=${encodeURIComponent(q)}` : '');
}

document.addEventListener('DOMContentLoaded', () => {
  ppRenderHomeStats();
  ppRenderFeaturedParks();
  const heroForm = document.getElementById('heroSearchForm');
  if (heroForm) heroForm.addEventListener('submit', ppHandleHeroSearch);
});
