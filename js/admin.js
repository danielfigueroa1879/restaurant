let state = {
  restaurantName: '',
  date: '',
  menuPrice: '5000',
  whatsappNumber: '',
  theme: 'clasico',
  menusDelDia: [],
  agregados: [],
  adicionales: [],
  bebidas: [],
  postres: [],
  showAdicionales: true,
  showBebidas: true,
  showPostres: true,
  notas: ''
};

const THEMES = [
  { id: 'clasico', name: 'Clásico', desc: 'Crema y naranja', colors: ['#fff8f0', '#ffffff', '#b8360a', '#2b1a11'] },
  { id: 'oscuro',  name: 'Oscuro',  desc: 'Modo noche',     colors: ['#17181c', '#23252b', '#e8a444', '#f2ede2'] },
  { id: 'bosque',  name: 'Bosque',  desc: 'Verde natural',  colors: ['#f4f7f0', '#ffffff', '#4a7c3a', '#1e2f18'] },
  { id: 'oceano',  name: 'Océano',  desc: 'Azul marino',    colors: ['#f0f5fa', '#ffffff', '#1e5f8b', '#0f2a3f'] },
  { id: 'borgona', name: 'Borgoña', desc: 'Rojo vino',      colors: ['#fbf3f2', '#ffffff', '#8e1e26', '#3a0d10'] }
];

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function renderThemes() {
  document.getElementById('themesGrid').innerHTML = THEMES.map(t => `
    <div class="theme ${state.theme === t.id ? 'active' : ''}" onclick="selectTheme('${t.id}')">
      <div class="swatches">
        <div style="background:${t.colors[0]}"></div>
        <div style="background:${t.colors[1]}"></div>
        <div style="background:${t.colors[2]}"></div>
        <div style="background:${t.colors[3]}"></div>
      </div>
      <div class="theme-name">${t.name}</div>
      <div class="theme-desc">${t.desc}</div>
    </div>
  `).join('');
}
function selectTheme(id) { state.theme = id; renderThemes(); scheduleSave(150); }

function renderList(items, list, kind) {
  if (!items.length) return `<div class="empty-list">Aún no has agregado ${kind}.</div>`;
  return items.map((x, i) => {
    const label = x.agotado ? 'Disponible' : 'Agotado';
    const price = x.precio ? `<span class="item-price">$${escapeHtml(x.precio)}</span>` : '';
    const badge = x.agotado ? '<span class="badge-agotado">Agotado</span>' : '';
    return `<li class="${x.agotado ? 'agotado' : ''}">
      <span class="item-text">${escapeHtml(x.nombre)}</span>
      ${price}
      ${badge}
      <div class="item-actions">
        <button class="btn-toggle ${x.agotado ? 'on' : ''}" onclick="toggle${list}(${i})">${label}</button>
        <button class="btn-del" onclick="remove${list}(${i})">Quitar</button>
      </div>
    </li>`;
  }).join('');
}

function render() {
  document.getElementById('menuList').innerHTML = renderList(state.menusDelDia, 'Menu', 'opciones');
  document.getElementById('agregadoList').innerHTML = renderList(state.agregados, 'Agregado', 'agregados');
  document.getElementById('adicionalList').innerHTML = renderList(state.adicionales, 'Adicional', 'adicionales');
  document.getElementById('bebidaList').innerHTML = renderList(state.bebidas, 'Bebida', 'bebidas');
  document.getElementById('postreList').innerHTML = renderList(state.postres, 'Postre', 'postres');
}

function addMenu() {
  const el = document.getElementById('newMenu');
  const v = el.value.trim();
  if (!v) return;
  state.menusDelDia.push({ nombre: v, agotado: false });
  el.value = ''; el.focus(); render(); scheduleSave();
}
function removeMenu(i) { state.menusDelDia.splice(i, 1); render(); scheduleSave(); }
function toggleMenu(i) { state.menusDelDia[i].agotado = !state.menusDelDia[i].agotado; render(); scheduleSave(); }

function addAgregado() {
  const el = document.getElementById('newAgregado');
  const v = el.value.trim();
  if (!v) return;
  state.agregados.push({ nombre: v, agotado: false });
  el.value = ''; el.focus(); render(); scheduleSave();
}
function removeAgregado(i) { state.agregados.splice(i, 1); render(); scheduleSave(); }
function toggleAgregado(i) { state.agregados[i].agotado = !state.agregados[i].agotado; render(); scheduleSave(); }

function addAdicional() {
  const n = document.getElementById('newAdicionalNombre');
  const p = document.getElementById('newAdicionalPrecio');
  const nombre = n.value.trim();
  const precio = p.value.trim();
  if (!nombre) return;
  state.adicionales.push({ nombre, precio, agotado: false });
  n.value = ''; p.value = ''; n.focus(); render(); scheduleSave();
}
function removeAdicional(i) { state.adicionales.splice(i, 1); render(); scheduleSave(); }
function toggleAdicional(i) { state.adicionales[i].agotado = !state.adicionales[i].agotado; render(); scheduleSave(); }

function addBebida() {
  const n = document.getElementById('newBebidaNombre');
  const p = document.getElementById('newBebidaPrecio');
  const nombre = n.value.trim();
  const precio = p.value.trim();
  if (!nombre) return;
  state.bebidas.push({ nombre, precio, agotado: false });
  n.value = ''; p.value = ''; n.focus(); render(); scheduleSave();
}
function removeBebida(i) { state.bebidas.splice(i, 1); render(); scheduleSave(); }
function toggleBebida(i) { state.bebidas[i].agotado = !state.bebidas[i].agotado; render(); scheduleSave(); }

function addPostre() {
  const n = document.getElementById('newPostreNombre');
  const p = document.getElementById('newPostrePrecio');
  const nombre = n.value.trim();
  const precio = p.value.trim();
  if (!nombre) return;
  state.postres.push({ nombre, precio, agotado: false });
  n.value = ''; p.value = ''; n.focus(); render(); scheduleSave();
}
function removePostre(i) { state.postres.splice(i, 1); render(); scheduleSave(); }
function togglePostre(i) { state.postres[i].agotado = !state.postres[i].agotado; render(); scheduleSave(); }

let loggedIn = false;

async function login() {
  const password = document.getElementById('password').value.trim();
  const msg = document.getElementById('loginMsg');
  msg.className = 'msg';
  if (!password) { msg.className = 'msg err'; msg.textContent = 'Introduce la contraseña.'; return; }

  const error = await signInAdmin(password);
  if (error) {
    msg.className = 'msg err';
    msg.textContent = 'Contraseña incorrecta o error al conectar con Supabase.';
    return;
  }
  await enterEditor();
}

async function enterEditor() {
  try {
    const current = await fetchMenu();
    state = {
      restaurantName: current.restaurantName || '',
      date: current.date || '',
      menuPrice: current.menuPrice || '5000',
      whatsappNumber: current.whatsappNumber || '',
      theme: current.theme || 'clasico',
      menusDelDia: Array.isArray(current.menusDelDia) ? current.menusDelDia.slice() : [],
      agregados: Array.isArray(current.agregados) ? current.agregados.slice() : [],
      adicionales: Array.isArray(current.adicionales) ? current.adicionales.slice() : [],
      bebidas: Array.isArray(current.bebidas) ? current.bebidas.slice() : [],
      postres: Array.isArray(current.postres) ? current.postres.slice() : [],
      showAdicionales: current.showAdicionales !== false,
      showBebidas: current.showBebidas !== false,
      showPostres: current.showPostres !== false,
      notas: current.notas || ''
    };
    document.getElementById('restaurantName').value = state.restaurantName;
    document.getElementById('date').value = state.date;
    document.getElementById('menuPrice').value = state.menuPrice;
    document.getElementById('whatsappNumber').value = state.whatsappNumber;
    document.getElementById('notas').value = state.notas;
    document.getElementById('showAdicionales').checked = state.showAdicionales;
    document.getElementById('showBebidas').checked = state.showBebidas;
    document.getElementById('showPostres').checked = state.showPostres;
    loggedIn = true;
    document.getElementById('loginCard').classList.add('hidden');
    document.getElementById('editor').classList.remove('hidden');
    renderThemes();
    render();
    loadOrders();
  } catch (err) {
    const msg = document.getElementById('loginMsg');
    msg.className = 'msg err';
    msg.textContent = 'Sesión iniciada pero no se pudo cargar el menú: ' + (err.message || err);
  }
}

// ---------- autoguardado ----------
let saveTimer = null;
let saving = false;
let pendingSave = false;

function setStatus(text, kind) {
  const box = document.getElementById('autoStatus');
  document.getElementById('autoStatusText').textContent = text;
  box.classList.remove('saving', 'error');
  if (kind === 'saving') box.classList.add('saving');
  if (kind === 'error') box.classList.add('error');
}

function scheduleSave(delay = 400) {
  if (!loggedIn) return;
  clearTimeout(saveTimer);
  setStatus('Cambios sin guardar…', 'saving');
  saveTimer = setTimeout(doSave, delay);
}

async function doSave() {
  if (saving) { pendingSave = true; return; }
  saving = true;
  setStatus('Guardando…', 'saving');

  const payload = {
    restaurantName: document.getElementById('restaurantName').value,
    date: document.getElementById('date').value,
    menuPrice: document.getElementById('menuPrice').value || '5000',
    whatsappNumber: document.getElementById('whatsappNumber').value,
    theme: state.theme,
    menusDelDia: state.menusDelDia,
    agregados: state.agregados,
    adicionales: state.adicionales,
    bebidas: state.bebidas,
    postres: state.postres,
    showAdicionales: document.getElementById('showAdicionales').checked,
    showBebidas: document.getElementById('showBebidas').checked,
    showPostres: document.getElementById('showPostres').checked,
    notas: document.getElementById('notas').value
  };

  try {
    await saveMenu(payload);
    const now = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setStatus('Guardado · ' + now);
  } catch (err) {
    if (err && (err.code === '42501' || err.message?.includes('permission'))) {
      setStatus('Sesión expirada. Vuelve a iniciar sesión.', 'error');
    } else {
      setStatus('No se pudo guardar. Reintentando…', 'error');
    }
  } finally {
    saving = false;
    if (pendingSave) { pendingSave = false; scheduleSave(100); }
  }
}

// ---------- Pedidos ----------
function dayRangeISO(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  const to   = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0);
  return { fromISO: from.toISOString(), toISO: to.toISOString() };
}

function todayLocalISODate() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function formatOrderTime(iso) {
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function renderOrder(o) {
  const time = formatOrderTime(o.created_at);
  const mesa = o.mesa ? `Mesa ${escapeHtml(o.mesa)}` : 'Sin mesa';
  const pago = o.payment ? `<span class="order-pay">${escapeHtml(o.payment)}</span>` : '';
  const items = (o.items || []).map(it => {
    const cant = it.cantidad && it.cantidad > 1 ? `${it.cantidad} × ` : '';
    const extras = Array.isArray(it.agregados) && it.agregados.length
      ? ` <span class="order-extras">+ ${it.agregados.map(escapeHtml).join(' + ')}</span>`
      : '';
    return `<li>${cant}${escapeHtml(it.nombre)}${extras}</li>`;
  }).join('');
  const total = '$' + Number(o.total || 0).toLocaleString('es-CL');
  return `
    <div class="order" data-id="${o.id}">
      <div class="order-head">
        <div class="order-head-left">
          <span class="order-time">${time}</span>
          <span class="order-mesa">${mesa}</span>
          ${pago}
        </div>
        <div class="order-head-right">
          <span class="order-total">${total}</span>
          <button class="btn-del order-del" onclick="removeOrder(${o.id})">Borrar</button>
        </div>
      </div>
      <ul class="order-items">${items}</ul>
    </div>
  `;
}

async function removeOrder(id) {
  if (!confirm('¿Borrar este pedido? Esta acción no se puede deshacer.')) return;
  try {
    await deleteOrder(id);
    await loadOrders();
  } catch (err) {
    alert('No se pudo borrar el pedido. Intenta de nuevo.');
  }
}

async function loadOrders() {
  const dateInput = document.getElementById('ordersDate');
  if (!dateInput.value) dateInput.value = todayLocalISODate();
  const { fromISO, toISO } = dayRangeISO(dateInput.value);
  const listEl = document.getElementById('ordersList');
  listEl.innerHTML = '<div class="empty-list">Cargando pedidos…</div>';
  try {
    const orders = await fetchOrders({ fromISO, toISO });
    document.getElementById('ordersCount').textContent = orders.length;
    const total = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    document.getElementById('ordersTotal').textContent = '$' + total.toLocaleString('es-CL');
    listEl.innerHTML = orders.length
      ? orders.map(renderOrder).join('')
      : '<div class="empty-list">No hay pedidos ese día.</div>';
  } catch (err) {
    listEl.innerHTML = '<div class="empty-list">No se pudieron cargar los pedidos.</div>';
  }
}

// ---------- listeners ----------
document.getElementById('password').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
document.getElementById('ordersDate').addEventListener('change', loadOrders);
document.getElementById('newMenu').addEventListener('keydown', e => { if (e.key === 'Enter') addMenu(); });
document.getElementById('newAgregado').addEventListener('keydown', e => { if (e.key === 'Enter') addAgregado(); });
document.getElementById('newAdicionalPrecio').addEventListener('keydown', e => { if (e.key === 'Enter') addAdicional(); });
document.getElementById('newAdicionalNombre').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('newAdicionalPrecio').focus();
});
document.getElementById('newBebidaPrecio').addEventListener('keydown', e => { if (e.key === 'Enter') addBebida(); });
document.getElementById('newBebidaNombre').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('newBebidaPrecio').focus();
});
document.getElementById('newPostrePrecio').addEventListener('keydown', e => { if (e.key === 'Enter') addPostre(); });
document.getElementById('newPostreNombre').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('newPostrePrecio').focus();
});
['showAdicionales', 'showBebidas', 'showPostres'].forEach(id => {
  document.getElementById(id).addEventListener('change', () => scheduleSave(100));
});
['restaurantName', 'date', 'menuPrice', 'whatsappNumber', 'notas'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => scheduleSave(800));
});

// ---------- session restore ----------
(async () => {
  const session = await getAdminSession();
  if (session) await enterEditor();
})();
