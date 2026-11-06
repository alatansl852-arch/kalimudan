/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const peso = n => '₱' + Math.round(n).toLocaleString('en-PH');
const key = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
const parse = k => { const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); };
const fmtD = k => parse(k).toLocaleDateString('en-PH', {weekday:'short', month:'long', day:'numeric', year:'numeric'});
const today = new Date(); today.setHours(0,0,0,0);
const addDays = (d,n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const nowT = () => new Date().toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});

/* ---------- data ---------- */
const HALLS = [
  {id:'h1', name:'Lake Lanao Pavilion', area:'Brgy. Saduc', cap:500, base:45000, hue:['#12305A','#2F6BFF'], am:['Air-conditioned','Bridal room','Parking for 80 cars','Generator']},
  {id:'h2', name:'Dansalan Hall', area:'Brgy. Dansalan', cap:300, base:28000, hue:['#0B1F3A','#3A7BD5'], am:['Air-conditioned','Stage','Kitchen access','Prayer room']},
  {id:'h3', name:'Banggolo Events Place', area:'Brgy. Banggolo', cap:200, base:18000, hue:['#16324F','#2BB3C0'], am:['Garden venue','Sound system','Parking for 40 cars']},
  {id:'h4', name:'Raya Garden Function Room', area:'Brgy. Raya Madaya', cap:150, base:12000, hue:['#1D2B64','#6C8CFF'], am:['Air-conditioned','Projector','Wi-Fi']}
];
const EVENTS = {
  wedding:   {label:'Maranao wedding', mult:1.6, inc:['Bridal stage and backdrop','Full-capacity table setup','12 hours of use']},
  kandori:   {label:'Kandori', mult:1.4, inc:['Long-table feast layout','Serving area and kitchen access','10 hours of use']},
  graduation:{label:'Graduation', mult:1.2, inc:['Stage, podium and banner space','Projector and screen','6 hours of use']},
  company:   {label:'Company event', mult:1.1, inc:['Podium and projector','Wi-Fi and coffee station','8 hours of use']},
  birthday:  {label:'Birthday / other', mult:1, inc:['Tables and chairs','Basic lighting','6 hours of use']}
};
const ADDONS = {sound:{label:'Sound system', price:3500}, decor:{label:'Stage décor', price:6000}};

let bookings = [], msgs = [], seq = 1000;
const isDeal = d => d.getDay() >= 1 && d.getDay() <= 4;   // Mon–Thu = discounted open dates
const hallOf = id => HALLS.find(h => h.id === id);

function calc(h, ev, k, add) {
  const base = h.base * EVENTS[ev].mult;
  const deal = isDeal(parse(k)) ? base * 0.15 : 0;
  const ad = Object.keys(add).filter(a => add[a]).reduce((s,a) => s + ADDONS[a].price, 0);
  const total = base - deal + ad;
  return {base, deal, ad, total, down: total * 0.3};
}
function addBooking(o) { seq++; const b = Object.assign({id:seq, ref:'KM-' + seq, status:'pending'}, o); bookings.push(b); return b; }
[['h1',4,'wedding','Norhana M.','confirmed'],['h1',9,'graduation','Sittie A.','pending'],['h1',11,'kandori','Jamal S.','confirmed'],['h1',18,'company','Acmad D.','confirmed'],
 ['h2',5,'graduation','Fatima L.','confirmed'],['h2',12,'wedding','Rasid P.','pending'],
 ['h3',3,'birthday','Aisha K.','confirmed'],['h3',8,'kandori','Omar B.','confirmed'],['h4',6,'company','Hadji T.','confirmed']
].forEach(([h,o,ev,name,st]) => {
  const k = key(addDays(today,o)), c = calc(hallOf(h), ev, k, {});
  addBooking({hall:h, date:k, event:ev, name, phone:'09xx xxx xxxx', guests:100, total:c.total, down:c.down, pay:'GCash', status:st});
});

const bookingOn = (h,k) => bookings.find(b => b.hall === h && b.date === k && b.status !== 'declined');
function dstat(h, d) {
  if (d < today) return 'past';
  const b = bookingOn(h, key(d));
  if (b) return b.status === 'pending' ? 'held' : 'booked';
  return isDeal(d) ? 'deal' : 'open';
}
function nextOpen(h) { for (let i = 0; i < 150; i++) { const s = dstat(h, addDays(today,i)); if (s === 'open' || s === 'deal') return key(addDays(today,i)); } return null; }
function dealCount(h) { let n = 0; for (let i = 0; i < 30; i++) if (dstat(h, addDays(today,i)) === 'deal') n++; return n; }

/* ---------- state ---------- */
const S = {role:'customer', view:'browse', q:'', cap:0, budget:0, sort:'rec', cmp:[], hall:null,
  y:today.getFullYear(), m:today.getMonth(), sel:null, ev:'wedding', guests:150, add:{sound:false, decor:false},
  bk:null, ownerHall:'h1', tab:'all'};
const curHall = () => hallOf(S.hall);

function pushMsg(to, text) { msgs.unshift({to, text, t:nowT()}); updateMsgs(); }
function toast(t) { const el = $('#toast'); el.textContent = t; el.style.display = 'block'; clearTimeout(toast.id); toast.id = setTimeout(() => el.style.display = 'none', 2600); }

/* ---------- calendar ---------- */
function calHTML(hid, owner) {
  const first = new Date(S.y, S.m, 1), n = new Date(S.y, S.m + 1, 0).getDate();
  const idx = S.y * 12 + S.m, min = today.getFullYear() * 12 + today.getMonth();
  let cells = '';
  for (let i = 0; i < first.getDay(); i++) cells += '<span></span>';
  for (let d = 1; d <= n; d++) {
    const dt = new Date(S.y, S.m, d), st = dstat(hid, dt), k = key(dt), b = bookingOn(hid, k);
    const dis = st === 'past' || (!owner && (st === 'booked' || st === 'held'));
    const sub = owner ? (b ? esc(b.name.split(' ')[0]) : '') : (st === 'deal' ? '−15%' : '');
    cells += `<button class="day ${st}${S.sel === k ? ' sel' : ''}" data-act="pickday" data-k="${k}" ${dis ? 'disabled' : ''}><b>${d}</b>${sub ? `<i>${sub}</i>` : ''}</button>`;
  }
  return `<div class="calh"><button class="btn sm" data-act="mon" data-d="-1" ${idx <= min ? 'disabled' : ''}>←</button>
    <h3>${first.toLocaleDateString('en-PH',{month:'long',year:'numeric'})}</h3>
    <button class="btn sm" data-act="mon" data-d="1" ${idx >= min + 8 ? 'disabled' : ''}>→</button></div>
    <div class="dow">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x => `<span>${x}</span>`).join('')}</div>
    <div class="days">${cells}</div>
    <div class="legend"><span style="--c:#EAF8F2;--bc:#BFE8D6">Open</span><span style="--c:#FFF5DC;--bc:#F6DC9A">Discounted open date</span><span style="--c:#FFF0D9;--bc:#F6D9A8">Held (awaiting admin)</span><span style="--c:#FBE9EB;--bc:#F2C5C9">Booked</span></div>`;
}

/* ---------- customer: browse ---------- */
function card(h) {
  const nx = nextOpen(h.id), dc = dealCount(h.id);
  return `<article class="hc"><div class="cover" style="--a:${h.hue[0]};--b:${h.hue[1]}">${dc ? `<span class="tag">${dc} discounted dates this month</span>` : ''}</div>
  <div class="hb"><h3>${h.name}</h3><div class="meta">${h.area}, Marawi City · up to ${h.cap} guests</div>
  <div class="price"><small>from </small>${peso(h.base)}<small> / day</small></div>
  <div class="chips">${h.am.slice(0,3).map(a => `<span>${a}</span>`).join('')}</div>
  <div class="next">${nx ? 'Next open: ' + parse(nx).toLocaleDateString('en-PH',{month:'short',day:'numeric'}) : 'No open dates soon'}</div>
  <div class="row"><label class="cmp"><input type="checkbox" data-act="cmp" data-id="${h.id}" ${S.cmp.includes(h.id) ? 'checked' : ''}> Compare</label>
  <button class="btn primary" data-act="open" data-id="${h.id}">View calendar</button></div></div></article>`;
}
function gridHTML() {
  let l = HALLS.filter(h => (h.name + h.area).toLowerCase().includes(S.q.toLowerCase()) && h.cap >= S.cap && (!S.budget || h.base <= S.budget));
  if (S.sort === 'price') l.sort((a,b) => a.base - b.base);
  if (S.sort === 'cap') l.sort((a,b) => b.cap - a.cap);
  return l.length ? l.map(card).join('') : '<p class="empty">No halls match those filters. Try a lower capacity or a higher budget.</p>';
}
function renderBrowse() {
  return `<section class="hero"><div class="in"><h1>Is the venue free? Check in seconds.</h1>
  <p>See open dates for function halls across Marawi City in one calendar, book online, and secure your date with a downpayment.</p>
  <div class="pts"><span>Live calendar for every hall</span><span>Maranao wedding and kandori packages</span><span>Pay downpayment by GCash or Maya</span></div></div></section>
  <section class="wrap"><div class="filters">
    <label class="full-w">Search<input id="q" data-bind="q" placeholder="Hall name or barangay" value="${esc(S.q)}"></label>
    <label>Guests<select data-bind="cap"><option value="0">Any</option><option value="100" ${S.cap==100?'selected':''}>100+</option><option value="200" ${S.cap==200?'selected':''}>200+</option><option value="300" ${S.cap==300?'selected':''}>300+</option><option value="500" ${S.cap==500?'selected':''}>500</option></select></label>
    <label>Max budget<select data-bind="budget"><option value="0">Any</option><option value="15000" ${S.budget==15000?'selected':''}>₱15,000</option><option value="30000" ${S.budget==30000?'selected':''}>₱30,000</option><option value="50000" ${S.budget==50000?'selected':''}>₱50,000</option></select></label>
    <label>Sort by<select data-bind="sort"><option value="rec">Recommended</option><option value="price" ${S.sort=='price'?'selected':''}>Lowest price</option><option value="cap" ${S.sort=='cap'?'selected':''}>Largest capacity</option></select></label>
  </div><div class="grid" id="grid">${gridHTML()}</div></section>`;
}

/* ---------- customer: hall detail ---------- */
function bookCard(h) {
  if (!S.sel) return `<div class="card"><p class="eyebrow">Step 1</p><h3>Pick a date</h3><p class="meta">Choose an open date on the calendar to see the price and reserve it.</p></div>`;
  const c = calc(h, S.ev, S.sel, S.add), e = EVENTS[S.ev];
  return `<div class="card book"><p class="eyebrow">Your date</p><h3>${fmtD(S.sel)}</h3>
  <label>Event type<select data-bind="ev">${Object.entries(EVENTS).map(([k,v]) => `<option value="${k}" ${k === S.ev ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
  <ul class="inc">${e.inc.map(i => `<li>${i}</li>`).join('')}</ul>
  <label>Guests (max ${h.cap})<input type="number" min="10" max="${h.cap}" value="${S.guests}" data-bind="guests"></label>
  <div class="addons" style="margin-top:12px">${Object.entries(ADDONS).map(([k,v]) => `<label class="chk"><input type="checkbox" data-bind="add" data-k="${k}" ${S.add[k] ? 'checked' : ''}> ${v.label}<span>+${peso(v.price)}</span></label>`).join('')}</div>
  <dl class="sum"><div><dt>Hall rental</dt><dd>${peso(c.base)}</dd></div>
  ${c.deal ? `<div class="deal"><dt>Open-date discount (15%)</dt><dd>−${peso(c.deal)}</dd></div>` : ''}
  ${c.ad ? `<div><dt>Add-ons</dt><dd>${peso(c.ad)}</dd></div>` : ''}
  <div class="tot"><dt>Total</dt><dd>${peso(c.total)}</dd></div>
  <div class="down"><dt>Downpayment today (30%)</dt><dd>${peso(c.down)}</dd></div></dl>
  <button class="btn primary full" data-act="reserve">Reserve and pay downpayment</button></div>`;
}
function renderDetail() {
  const h = curHall();
  return `<section class="wrap"><button class="link" data-act="back">← All halls</button>
  <div class="dhead" style="--a:${h.hue[0]};--b:${h.hue[1]}"><h1>${h.name}</h1><p style="margin:6px 0 14px;opacity:.85">${h.area}, Marawi City · up to ${h.cap} guests · from ${peso(h.base)} / day</p>
  <div class="chips">${h.am.map(a => `<span>${a}</span>`).join('')}</div></div>
  <div class="cols"><div class="card" id="cal">${calHTML(h.id, false)}</div><div id="bookcard">${bookCard(h)}</div></div></section>`;
}
function refreshDetail() { const h = curHall(); $('#cal').innerHTML = calHTML(h.id, false); $('#bookcard').innerHTML = bookCard(h); }

/* ---------- booking modal ---------- */
function modal(html, wide) { $('#modal').innerHTML = html ? `<div class="ov" data-act="close"><div class="mb ${wide ? 'wide' : ''}">${html}</div></div>` : ''; }
function steps(n) { return `<div class="steps">${[1,2,3].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`; }
function renderBk() {
  const h = curHall(), c = calc(h, S.ev, S.sel, S.add), bk = S.bk;
  if (bk.step === 1) return modal(`${steps(1)}<h2>Your details</h2><p class="meta">${h.name} · ${fmtD(S.sel)} · ${EVENTS[S.ev].label}</p>
    <label>Full name<input id="bn" value="${esc(bk.name)}" placeholder="e.g. Norhana Macaraya"></label>
    <label>Mobile number<input id="bp" value="${esc(bk.phone)}" placeholder="09XX XXX XXXX" inputmode="tel"></label>
    <button class="btn primary full" data-act="next1">Continue to payment</button>`);
  if (bk.step === 2) return modal(`${steps(2)}<h2>Pay downpayment</h2><p class="meta">Choose how you want to pay.</p>
    <div class="pm"><button data-act="method" data-m="GCash" class="${bk.pay === 'GCash' ? 'on' : ''}">GCash</button><button data-act="method" data-m="Maya" class="${bk.pay === 'Maya' ? 'on' : ''}">Maya</button></div>
    <dl class="sum"><div><dt>Total</dt><dd>${peso(c.total)}</dd></div><div class="down"><dt>Pay now (30%)</dt><dd>${peso(c.down)}</dd></div></dl>
    <button class="btn primary full" data-act="pay">Pay ${peso(c.down)} with ${bk.pay}</button>
    <p class="note">Simulated payment for the prototype. No real transaction happens and no financial details are stored.</p>`);
  const b = bk.b;
  modal(`${steps(3)}<div class="rc"><div class="ok-ic">✓</div><h2>Downpayment received</h2><p class="meta">Reference number</p><div class="ref">${b.ref}</div>
    <dl><div><dt>Hall</dt><dd>${h.name}</dd></div><div><dt>Date</dt><dd>${fmtD(b.date)}</dd></div><div><dt>Event</dt><dd>${EVENTS[b.event].label}, ${b.guests} guests</dd></div>
    <div><dt>Total</dt><dd>${peso(b.total)}</dd></div><div><dt>Paid via ${b.pay}</dt><dd>${peso(b.down)}</dd></div><div><dt>Balance on event day</dt><dd>${peso(b.total - b.down)}</dd></div></dl></div>
    <div class="bub"><small>Kalimudan on Messenger</small>${esc(msgs.find(m => m.to === 'customer').text)}</div>
    <button class="btn primary full" data-act="toowner">See it on the admin dashboard</button><button class="btn full" data-act="close">Done</button>`);
}

/* ---------- admin dashboard ---------- */
function renderOwner() {
  const h = hallOf(S.ownerHall), all = bookings.filter(b => b.hall === h.id).sort((a,b) => a.date.localeCompare(b.date));
  const list = all.filter(b => S.tab === 'all' || b.status === S.tab);
  const pend = all.filter(b => b.status === 'pending').length;
  const conf30 = all.filter(b => b.status === 'confirmed' && parse(b.date) >= today && parse(b.date) <= addDays(today,30)).length;
  const coll = all.filter(b => b.status !== 'declined').reduce((s,b) => s + b.down, 0);
  let open30 = 0; for (let i = 0; i < 30; i++) { const s = dstat(h.id, addDays(today,i)); if (s === 'open' || s === 'deal') open30++; }
  const rows = list.map(b => `<tr><td><b>${b.ref}</b></td><td>${esc(b.name)}<div class="meta">${b.pay}</div></td><td>${fmtD(b.date)}</td><td>${EVENTS[b.event].label}</td>
    <td>${peso(b.total)}<div class="meta">Down ${peso(b.down)}</div></td><td><span class="pill ${b.status}">${b.status}</span></td>
    <td>${b.status === 'pending' ? `<div class="acts"><button class="btn sm ok" data-act="approve" data-id="${b.id}">Approve</button><button class="btn sm no" data-act="decline" data-id="${b.id}">Decline</button></div>` : ''}</td></tr>`).join('');
  return `<section class="wrap"><div class="ohead"><div><p class="eyebrow">Admin dashboard</p><h1 style="font-size:34px">${h.name}</h1></div>
  <div style="display:flex;gap:10px;align-items:end"><label style="margin:0">Viewing hall<select data-bind="ownerHall">${HALLS.map(x => `<option value="${x.id}" ${x.id === h.id ? 'selected' : ''}>${x.name}</option>`).join('')}</select></label>
  <button class="btn dark" data-act="walk">+ Walk-in booking</button></div></div>
  <div class="stats"><div class="stat"><b>${pend}</b><span>Pending requests</span></div><div class="stat"><b>${conf30}</b><span>Confirmed, next 30 days</span></div>
  <div class="stat"><b>${peso(coll)}</b><span>Downpayments collected</span></div><div class="stat"><b>${open30}</b><span>Open dates, next 30 days</span></div></div>
  <div class="banner">Every booking, online or walk-in, lands here. No more paper logbook, and customers can no longer double-book a date.</div>
  <div class="cols" style="margin-top:18px"><div class="card"><div class="tabs">${['all','pending','confirmed','declined'].map(t => `<button data-act="tab" data-t="${t}" class="${S.tab === t ? 'on' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
  <div class="tw"><table><thead><tr><th>Ref</th><th>Guest</th><th>Date</th><th>Event</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="meta">No bookings here yet.</td></tr>'}</tbody></table></div></div>
  <div class="card" id="cal">${calHTML(h.id, true)}</div></div></section>`;
}

/* ---------- render ---------- */
function render() {
  document.querySelectorAll('#seg button').forEach(b => b.classList.toggle('on', b.dataset.r === S.role));
  $('#app').innerHTML = S.role === 'owner' ? renderOwner() : (S.view === 'detail' ? renderDetail() : renderBrowse());
  updateCmp(); updateMsgs(); window.scrollTo(0, 0);
}
function updateCmp() { $('#cmpbar').classList.toggle('on', S.cmp.length > 0 && S.role === 'customer' && S.view === 'browse'); $('#cmpn').textContent = S.cmp.length + ' of 3 halls selected'; }
function updateMsgs() {
  const mine = msgs.filter(m => m.to === S.role);
  $('#badge').textContent = mine.length;
  $('#msgp').innerHTML = `<header>Kalimudan · Messenger (${S.role === 'owner' ? 'admin phone' : 'customer phone'})</header>` +
    (mine.length ? mine.map(m => `<div class="bub"><small>Kalimudan · ${m.t}</small>${esc(m.text)}</div>`).join('') : '<p class="meta" style="padding:16px">No messages yet. Make or approve a booking to see alerts here.</p>');
}
function compareModal() {
  const hs = S.cmp.map(hallOf);
  const row = (l, f) => `<tr><td>${l}</td>${hs.map(h => `<td>${f(h)}</td>`).join('')}</tr>`;
  modal(`<h2>Compare halls</h2><div class="tw"><table class="ctable"><thead><tr><th></th>${hs.map(h => `<th>${h.name}</th>`).join('')}</tr></thead><tbody>
  ${row('Location', h => h.area)}${row('Capacity', h => h.cap + ' guests')}${row('Hall rental from', h => peso(h.base))}
  ${row('Rental per guest', h => peso(h.base / h.cap))}${row('Next open date', h => nextOpen(h.id) ? fmtD(nextOpen(h.id)) : 'None soon')}
  ${row('Discounted dates (30 days)', h => dealCount(h.id))}${row('Amenities', h => h.am.join(', '))}
  ${row('', h => `<button class="btn primary sm" data-act="open" data-id="${h.id}">View calendar</button>`)}</tbody></table></div>
  <button class="btn full" data-act="close">Close</button>`, true);
}
function walkModal() {
  const h = hallOf(S.ownerHall);
  modal(`<h2>Walk-in booking</h2><p class="meta">Log a booking made in person at ${h.name}.</p>
  <label>Guest name<input id="wn" placeholder="Full name"></label><label>Date<input id="wd" type="date" min="${key(today)}"></label>
  <label>Event type<select id="we">${Object.entries(EVENTS).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></label>
  <button class="btn primary full" data-act="walksave">Save booking</button><button class="btn full" data-act="close">Cancel</button>`);
}

/* ---------- actions ---------- */
const ACT = {
  role(el) { S.role = el.dataset.r; S.view = 'browse'; S.sel = null; S.y = today.getFullYear(); S.m = today.getMonth(); render(); },
  open(el) { modal(''); S.hall = el.dataset.id; S.view = 'detail'; S.role = 'customer'; S.sel = null; S.y = today.getFullYear(); S.m = today.getMonth(); S.guests = Math.min(150, curHall().cap); render(); },
  back() { S.view = 'browse'; render(); },
  pickday(el) {
    const k = el.dataset.k;
    if (S.role === 'owner') { const b = bookingOn(S.ownerHall, k); toast(b ? `${b.name} · ${EVENTS[b.event].label} · ${b.status}` : fmtD(k) + ' is open'); return; }
    S.sel = k; refreshDetail();
  },
  mon(el) { S.m += +el.dataset.d; if (S.m > 11) { S.m = 0; S.y++; } if (S.m < 0) { S.m = 11; S.y--; } $('#cal').innerHTML = calHTML(S.role === 'owner' ? S.ownerHall : S.hall, S.role === 'owner'); },
  cmp(el) {
    const id = el.dataset.id;
    if (S.cmp.includes(id)) S.cmp = S.cmp.filter(x => x !== id);
    else if (S.cmp.length < 3) S.cmp.push(id);
    else { el.checked = false; toast('You can compare up to 3 halls'); }
    updateCmp();
  },
  cmpopen() { if (S.cmp.length < 2) return toast('Select at least 2 halls to compare'); compareModal(); },
  cmpclear() { S.cmp = []; document.querySelectorAll('[data-act=cmp]').forEach(c => c.checked = false); updateCmp(); },
  reserve() {
    const h = curHall();
    if (!S.sel) return toast('Pick a date first');
    if (S.guests > h.cap || S.guests < 10) return toast(`Guests must be between 10 and ${h.cap}`);
    S.bk = {step:1, name:'', phone:'', pay:'GCash', b:null}; renderBk();
  },
  next1() {
    const n = $('#bn').value.trim(), p = $('#bp').value.trim();
    if (n.length < 2) return toast('Enter your full name');
    if (p.replace(/\D/g, '').length < 10) return toast('Enter a valid mobile number');
    S.bk.name = n; S.bk.phone = p; S.bk.step = 2; renderBk();
  },
  method(el) { S.bk.pay = el.dataset.m; renderBk(); },
  pay(el) {
    el.disabled = true; el.textContent = 'Processing payment…';
    setTimeout(() => {
      const h = curHall(), c = calc(h, S.ev, S.sel, S.add);
      if (bookingOn(h.id, S.sel)) { toast('Sorry, someone just booked this date'); S.sel = null; modal(''); refreshDetail(); return; }
      const b = addBooking({hall:h.id, date:S.sel, event:S.ev, name:S.bk.name, phone:S.bk.phone, guests:S.guests, total:c.total, down:c.down, pay:S.bk.pay});
      pushMsg('owner', `New booking request ${b.ref}: ${b.name}, ${EVENTS[b.event].label} on ${fmtD(b.date)}. Downpayment ${peso(b.down)} paid via ${b.pay}. Open your dashboard to approve.`);
      pushMsg('customer', `Hi ${b.name.split(' ')[0]}! We received your ${peso(b.down)} downpayment for ${h.name} on ${fmtD(b.date)}. Ref ${b.ref}. The hall admin will confirm shortly.`);
      S.bk.b = b; S.bk.step = 3; S.sel = null; renderBk(); refreshDetail();
    }, 1200);
  },
  toowner() { modal(''); S.role = 'owner'; S.ownerHall = S.hall; S.tab = 'pending'; S.y = today.getFullYear(); S.m = today.getMonth(); render(); },
  close() { modal(''); },
  approve(el) {
    const b = bookings.find(x => x.id == el.dataset.id); b.status = 'confirmed'; const h = hallOf(b.hall);
    pushMsg('customer', `Confirmed! Your ${EVENTS[b.event].label} at ${h.name} on ${fmtD(b.date)} is booked. Ref ${b.ref}.`);
    pushMsg('customer', `Reminder (scheduled 3 days before): your event at ${h.name} is coming up on ${fmtD(b.date)}. Balance due: ${peso(b.total - b.down)}.`);
    toast('Approved. Confirmation sent via Messenger'); render();
  },
  decline(el) {
    const b = bookings.find(x => x.id == el.dataset.id); b.status = 'declined';
    pushMsg('customer', `Sorry, ${hallOf(b.hall).name} cannot accommodate ${fmtD(b.date)}. Your downpayment ${peso(b.down)} will be refunded. Ref ${b.ref}.`);
    toast('Declined. Customer notified'); render();
  },
  tab(el) { S.tab = el.dataset.t; render(); },
  walk() { walkModal(); },
  walksave() {
    const n = $('#wn').value.trim(), d = $('#wd').value, ev = $('#we').value;
    if (n.length < 2) return toast('Enter the guest name');
    if (!d || parse(d) < today) return toast('Pick today or a future date');
    if (bookingOn(S.ownerHall, d)) return toast('That date is already taken');
    const c = calc(hallOf(S.ownerHall), ev, d, {});
    addBooking({hall:S.ownerHall, date:d, event:ev, name:n, phone:'-', guests:0, total:c.total, down:0, pay:'Walk-in', status:'confirmed'});
    modal(''); toast('Walk-in saved. The date is now blocked online'); render();
  },
  msg() { $('#msgp').classList.toggle('on'); }
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (el.dataset.act === 'close' && e.target !== el) return;   // clicking inside the modal should not close it
  if (ACT[el.dataset.act]) ACT[el.dataset.act](el);
});
document.addEventListener('input', e => { if (e.target.dataset.bind === 'q') { S.q = e.target.value; $('#grid').innerHTML = gridHTML(); } });
document.addEventListener('change', e => {
  const t = e.target, b = t.dataset.bind; if (!b) return;
  if (b === 'cap' || b === 'budget') { S[b] = +t.value; $('#grid').innerHTML = gridHTML(); }
  else if (b === 'sort') { S.sort = t.value; $('#grid').innerHTML = gridHTML(); }
  else if (b === 'ownerHall') { S.ownerHall = t.value; S.tab = 'all'; render(); }
  else if (b === 'ev') { S.ev = t.value; $('#bookcard').innerHTML = bookCard(curHall()); }
  else if (b === 'guests') { S.guests = Math.max(10, Math.min(curHall().cap, +t.value || 10)); $('#bookcard').innerHTML = bookCard(curHall()); }
  else if (b === 'add') { S.add[t.dataset.k] = t.checked; $('#bookcard').innerHTML = bookCard(curHall()); }
});

render();