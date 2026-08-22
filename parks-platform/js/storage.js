/* =========================================================
   storage.js — طبقة الوصول للبيانات (Data Access Layer)
   تعتمد حاليًا على LocalStorage + بيانات ثابتة مُضمّنة في data.js
   قابلة للاستبدال لاحقًا بطلبات fetch حقيقية إلى Flask API
   دون تغيير الواجهة (نفس أسماء الدوال يمكن إعادة تنفيذها لاحقًا)
   ========================================================= */
'use strict';

const PPStorage = (() => {

  const KEYS = {
    parks: 'pp_parks',
    rides: 'pp_rides',
    services: 'pp_services',
    tickets: 'pp_tickets',
    bookings: 'pp_bookings',
    users: 'pp_users',
    admins: 'pp_admins',
    session: 'pp_session',
    seeded: 'pp_seeded_v1'
  };

  function seedIfNeeded(){
    if (localStorage.getItem(KEYS.seeded)) return;
    const d = window.PARKS_PLATFORM_DATA || {};
    localStorage.setItem(KEYS.parks, JSON.stringify(d.parks || []));
    localStorage.setItem(KEYS.rides, JSON.stringify(d.rides || []));
    localStorage.setItem(KEYS.services, JSON.stringify(d.services || []));
    localStorage.setItem(KEYS.tickets, JSON.stringify(d.tickets || []));
    localStorage.setItem(KEYS.bookings, JSON.stringify(d.bookingsSeed || []));
    localStorage.setItem(KEYS.users, JSON.stringify(d.usersSeed || []));
    localStorage.setItem(KEYS.admins, JSON.stringify(d.adminsSeed || { park_admins: [], super_admins: [] }));
    localStorage.setItem(KEYS.seeded, '1');
  }

  function read(key){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }catch(e){
      console.error('PPStorage read error', key, e);
      return null;
    }
  }

  function write(key, value){
    try{
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    }catch(e){
      console.error('PPStorage write error', key, e);
      return false;
    }
  }

  // ---------- Generic getters ----------
  function getParks(){ return read(KEYS.parks) || []; }
  function getRides(){ return read(KEYS.rides) || []; }
  function getServices(){ return read(KEYS.services) || []; }
  function getTickets(){ return read(KEYS.tickets) || []; }
  function getBookings(){ return read(KEYS.bookings) || []; }
  function getUsers(){ return read(KEYS.users) || []; }
  function getAdmins(){ return read(KEYS.admins) || { park_admins: [], super_admins: [] }; }

  function saveParks(v){ return write(KEYS.parks, v); }
  function saveRides(v){ return write(KEYS.rides, v); }
  function saveServices(v){ return write(KEYS.services, v); }
  function saveTickets(v){ return write(KEYS.tickets, v); }
  function saveBookings(v){ return write(KEYS.bookings, v); }
  function saveUsers(v){ return write(KEYS.users, v); }
  function saveAdmins(v){ return write(KEYS.admins, v); }

  // ---------- Scoped helpers ----------
  function getParkById(id){ return getParks().find(p => p.id === id) || null; }
  function getRidesByPark(parkId){ return getRides().filter(r => r.park_id === parkId); }
  function getServicesByPark(parkId){ return getServices().filter(s => s.park_id === parkId); }
  function getTicketsByPark(parkId){ return getTickets().filter(t => t.park_id === parkId); }
  function getBookingsByUser(email){ return getBookings().filter(b => b.user_email === email); }
  function getBookingsByPark(parkId){ return getBookings().filter(b => b.park_id === parkId); }
  function getBookingById(id){ return getBookings().find(b => b.id === id) || null; }
  function getAdminByEmail(email){ return getAdmins().park_admins.find(a => a.email === email) || null; }
  function getParkForAdminEmail(email){
    const admin = getAdminByEmail(email);
    return admin ? getParkById(admin.park_id) : null;
  }

  // ---------- Mutations ----------
  function updatePark(parkId, patch){
    const parks = getParks();
    const idx = parks.findIndex(p => p.id === parkId);
    if (idx === -1) return false;
    parks[idx] = { ...parks[idx], ...patch };
    return saveParks(parks);
  }

  function addPark(park){
    const parks = getParks();
    const newId = 'park-' + String(Date.now()).slice(-6);
    parks.unshift({ id: newId, rating: 0, reviews_count: 0, status: 'مفتوح', status_message: '', ...park, id: newId });
    saveParks(parks);
    return newId;
  }

  function deletePark(parkId){
    saveParks(getParks().filter(p => p.id !== parkId));
    saveRides(getRides().filter(r => r.park_id !== parkId));
    saveServices(getServices().filter(s => s.park_id !== parkId));
    saveTickets(getTickets().filter(t => t.park_id !== parkId));
  }

  function addRide(ride){
    const rides = getRides();
    const id = 'ride-' + String(Date.now()).slice(-6);
    rides.unshift({ id, image: 'assets/images/ride-1.svg', last_updated: new Date().toISOString().slice(0,10), ...ride, id });
    return saveRides(rides);
  }
  function updateRide(id, patch){
    const rides = getRides();
    const idx = rides.findIndex(r => r.id === id);
    if (idx === -1) return false;
    rides[idx] = { ...rides[idx], ...patch, last_updated: new Date().toISOString().slice(0,10) };
    return saveRides(rides);
  }
  function deleteRide(id){ return saveRides(getRides().filter(r => r.id !== id)); }

  function addService(service){
    const services = getServices();
    const id = 'service-' + String(Date.now()).slice(-6);
    services.unshift({ id, ...service, id });
    return saveServices(services);
  }
  function updateService(id, patch){
    const services = getServices();
    const idx = services.findIndex(s => s.id === id);
    if (idx === -1) return false;
    services[idx] = { ...services[idx], ...patch };
    return saveServices(services);
  }
  function deleteService(id){ return saveServices(getServices().filter(s => s.id !== id)); }

  function addTicket(ticket){
    const tickets = getTickets();
    const id = 'ticket-' + String(Date.now()).slice(-6);
    tickets.push({ id, status: 'متاحة', ...ticket, id });
    return saveTickets(tickets);
  }
  function updateTicket(id, patch){
    const tickets = getTickets();
    const idx = tickets.findIndex(t => t.id === id);
    if (idx === -1) return false;
    tickets[idx] = { ...tickets[idx], ...patch };
    return saveTickets(tickets);
  }
  function deleteTicket(id){ return saveTickets(getTickets().filter(t => t.id !== id)); }

  function addAdmin(admin){
    const admins = getAdmins();
    const id = 'admin-' + String(Date.now()).slice(-6);
    admins.park_admins.unshift({ id, status: 'نشط', ...admin, id });
    saveAdmins(admins);
    return id;
  }
  function updateAdmin(id, patch){
    const admins = getAdmins();
    const idx = admins.park_admins.findIndex(a => a.id === id);
    if (idx === -1) return false;
    admins.park_admins[idx] = { ...admins.park_admins[idx], ...patch };
    return saveAdmins(admins);
  }
  function deleteAdmin(id){
    const admins = getAdmins();
    admins.park_admins = admins.park_admins.filter(a => a.id !== id);
    return saveAdmins(admins);
  }

  function createBooking(booking){
    const bookings = getBookings();
    const seq = bookings.length + 1000;
    const id = `PK-2026-${String(seq + Math.floor(Math.random()*90)).padStart(6,'0')}`;
    const record = { id, status: 'مؤكد', created_at: new Date().toISOString().slice(0,10), ...booking, id };
    bookings.unshift(record);
    saveBookings(bookings);
    return record;
  }

  function cancelBooking(id){
    const bookings = getBookings();
    const idx = bookings.findIndex(b => b.id === id);
    if (idx === -1) return false;
    bookings[idx].status = 'ملغى';
    return saveBookings(bookings);
  }

  function registerUser(user){
    const users = getUsers();
    if (users.some(u => u.email === user.email)) return { ok: false, error: 'exists' };
    const id = 'user-' + String(Date.now()).slice(-6);
    users.push({ id, ...user });
    saveUsers(users);
    return { ok: true, id };
  }

  function findUserByEmail(email){ return getUsers().find(u => u.email === email) || null; }

  // ---------- Session ----------
  function setSession(session){ return write(KEYS.session, session); }
  function getSession(){ return read(KEYS.session); }
  function clearSession(){ localStorage.removeItem(KEYS.session); }

  return {
    seedIfNeeded,
    getParks, getRides, getServices, getTickets, getBookings, getUsers, getAdmins,
    saveParks, saveRides, saveServices, saveTickets, saveBookings, saveUsers, saveAdmins,
    getParkById, getRidesByPark, getServicesByPark, getTicketsByPark,
    getBookingsByUser, getBookingsByPark, getBookingById,
    getAdminByEmail, getParkForAdminEmail,
    updatePark, addPark, deletePark,
    addRide, updateRide, deleteRide,
    addService, updateService, deleteService,
    addTicket, updateTicket, deleteTicket,
    addAdmin, updateAdmin, deleteAdmin,
    createBooking, cancelBooking,
    registerUser, findUserByEmail,
    setSession, getSession, clearSession
  };
})();

PPStorage.seedIfNeeded();
