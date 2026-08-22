/* =========================================================
   parks.js — صفحة جميع المنتزهات: بحث / فلترة / ترتيب
   ========================================================= */
'use strict';

let ppAllParks = [];

function ppGetQueryParam(name){
  return new URLSearchParams(window.location.search).get(name);
}

function ppApplyParksFilters(){
  const q = document.getElementById('parkSearch').value.trim().toLowerCase();
  const city = document.getElementById('cityFilter').value;
  const status = document.getElementById('statusFilter').value;
  const sort = document.getElementById('sortSelect').value;

  let list = ppAllParks.filter(p => {
    const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q);
    const matchesCity = !city || p.city === city;
    const matchesStatus = !status || p.status === status;
    return matchesQuery && matchesCity && matchesStatus;
  });

  if (sort === 'rating_desc') list.sort((a,b) => b.rating - a.rating);
  if (sort === 'price_asc') list.sort((a,b) => a.price_from - b.price_from);
  if (sort === 'price_desc') list.sort((a,b) => b.price_from - a.price_from);

  ppRenderParksGrid(list);
}

function ppRenderParksGrid(list){
  const grid = document.getElementById('parksGrid');
  const empty = document.getElementById('parksEmpty');
  const countLabel = document.getElementById('resultsCount');
  if (countLabel) countLabel.textContent = `${list.length} منتزه`;

  if (!list.length){
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = list.map(ppParkCardHTML).join('');
}

function ppPopulateCityFilter(){
  const select = document.getElementById('cityFilter');
  const cities = [...new Set(ppAllParks.map(p => p.city))];
  select.innerHTML = '<option value="">كل المدن</option>' + cities.map(c => `<option value="${c}">${c}</option>`).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('parksGrid');
  if (!grid) return;

  ppAllParks = PPStorage.getParks();
  ppPopulateCityFilter();

  const initialQuery = ppGetQueryParam('q');
  if (initialQuery) document.getElementById('parkSearch').value = initialQuery;

  ppApplyParksFilters();

  ['parkSearch','cityFilter','statusFilter','sortSelect'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', ppApplyParksFilters);
    el.addEventListener('change', ppApplyParksFilters);
  });
});
