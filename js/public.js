// ---------- helpers ----------
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function todayInSpanish() {
  return new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function formatPrice(p) {
  if (!p) return '';
  const clean = String(p).trim();
  if (/^\d+$/.test(clean)) return '$' + Number(clean).toLocaleString('es-CL');
  return clean;
}
function priceNum(p) {
  const n = Number(String(p || '').replace(/\D/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function getMesa() {
  const p = new URLSearchParams(location.search).get('mesa');
  return (p || '').trim();
}

// ---------- state ----------
let currentMenu = null;
let cart = { platos: [], platoEnCurso: null, platoEnCursoAgregados: [], adicionales: {}, bebidas: {}, postres: {} };

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.addEventListener('scroll', () => {
  const btn = document.getElementById('toTopBtn');
  if (!btn) return;
  btn.classList.toggle('visible', window.scrollY > 300);
}, { passive: true });

// ---------- cart actions ----------
function pickPrincipal(i) {
  if (cart.platoEnCurso !== null) return;
  cart.platoEnCurso = i;
  cart.platoEnCursoAgregados = [];
  renderAll();
  setTimeout(() => {
    const target = document.getElementById('agregado-section');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 60);
}
function pickAgregado(i) {
  if (cart.platoEnCurso === null) return;
  cart.platoEnCursoAgregados.push(i);
  renderAll();
  setTimeout(() => {
    const el = document.getElementById('confirmar-plato-btn') ||
               document.querySelector('.pending-plato');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 60);
}
function removePendingAgregado(idx) {
  cart.platoEnCursoAgregados.splice(idx, 1);
  renderAll();
}
function confirmPlato() {
  if (cart.platoEnCurso === null || !cart.platoEnCursoAgregados.length) return;
  cart.platos.push({ p: cart.platoEnCurso, as: cart.platoEnCursoAgregados.slice(), justAdded: true });
  cart.platoEnCurso = null;
  cart.platoEnCursoAgregados = [];
  renderAll();
  setTimeout(() => {
    const el = document.querySelector('.platos-list li.just-added');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 60);
}
function cancelPlato() { cart.platoEnCurso = null; cart.platoEnCursoAgregados = []; renderAll(); }
function removePlato(idx) { cart.platos.splice(idx, 1); renderAll(); }
function removeExtra(bucket, index) {
  if (cart[bucket] && cart[bucket][index] !== undefined) {
    delete cart[bucket][index];
    renderAll();
  }
}
function principalUsedCount(i) { return cart.platos.filter(p => p.p === i).length; }
function agregadoUsedCount(i) {
  let count = 0;
  for (const plato of cart.platos) {
    const arr = Array.isArray(plato.as) ? plato.as : (plato.a !== undefined ? [plato.a] : []);
    for (const a of arr) if (a === i) count++;
  }
  for (const a of cart.platoEnCursoAgregados) if (a === i) count++;
  return count;
}

function changeQty(bucket, index, delta) {
  const cur = cart[bucket][index] || 0;
  const next = Math.max(0, cur + delta);
  if (next === 0) delete cart[bucket][index];
  else cart[bucket][index] = next;
  if (delta > 0 && next > cur) {
    cart._justAddedExtra = { bucket, index: String(index) };
  }
  renderAll();
  if (delta > 0 && next > cur) {
    setTimeout(() => {
      const el = document.querySelector('.pedido-extras li.just-added') ||
                 document.querySelector('.pedido-frame');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  }
}
function changeAdicional(index, delta) { changeQty('adicionales', index, delta); }
function changeBebida(index, delta) { changeQty('bebidas', index, delta); }
function changePostre(index, delta) { changeQty('postres', index, delta); }

function sumQty(bucket) {
  return Object.values(cart[bucket]).reduce((a, b) => a + b, 0);
}
function sumBucketTotal(bucket, list) {
  let total = 0;
  for (const [i, q] of Object.entries(cart[bucket])) {
    const it = list && list[i];
    if (it) total += q * priceNum(it.precio);
  }
  return total;
}
function cartCount() {
  return cart.platos.length + sumQty('adicionales') + sumQty('bebidas') + sumQty('postres');
}
function cartTotal() {
  if (!currentMenu) return 0;
  const price = priceNum(currentMenu.menuPrice || '5000');
  let total = cart.platos.length * price;
  total += sumBucketTotal('adicionales', currentMenu.adicionales);
  total += sumBucketTotal('bebidas', currentMenu.bebidas);
  total += sumBucketTotal('postres', currentMenu.postres);
  return total;
}

function renderCart() {
  const bar = document.getElementById('cartBar');
  const n = cartCount();
  if (n === 0) {
    bar.style.display = 'none';
    document.body.classList.remove('has-cart');
    return;
  }
  bar.style.display = 'flex';
  document.body.classList.add('has-cart');
  document.getElementById('cartCount').textContent = n + (n === 1 ? ' ítem' : ' ítems');
  document.getElementById('cartTotal').textContent = '$' + cartTotal().toLocaleString('es-CL');
}

function renderAll() {
  if (currentMenu) renderMenu(currentMenu);
  renderCart();
}

function sendWhatsApp(paymentMethod) {
  if (!currentMenu) return;
  if (cart.platoEnCurso !== null) {
    alert('Tienes un plato sin completar. Confirma o cancela ese plato antes de enviar.');
    return;
  }
  const phone = (currentMenu.whatsappNumber || '').replace(/\D/g, '');
  if (!phone) { alert('El restaurante no ha configurado WhatsApp todavía.'); return; }

  const mesa = getMesa();
  const price = priceNum(currentMenu.menuPrice || '5000');
  let msg = 'Hola! Quiero hacer un pedido';
  if (mesa) msg += ' desde la mesa ' + mesa;
  msg += '.\n\n';
  if (paymentMethod) {
    const label = paymentMethod === 'Efectivo'
      ? 'Efectivo (pago al recibir)'
      : paymentMethod;
    msg += `*Forma de pago:* ${label}\n\n`;
  }

  if (cart.platos.length) {
    msg += '*Menú del día:*\n';
    cart.platos.forEach((plato, idx) => {
      const p = currentMenu.menusDelDia[plato.p];
      if (!p) return;
      const arr = Array.isArray(plato.as) ? plato.as : (plato.a !== undefined ? [plato.a] : []);
      const nombres = arr
        .map(ai => currentMenu.agregados[ai])
        .filter(Boolean)
        .map(a => a.nombre);
      if (!nombres.length) return;
      msg += `${idx + 1}. ${p.nombre} + ${nombres.join(' + ')} — $${price.toLocaleString('es-CL')}\n`;
    });
    msg += '\n';
  }

  const appendBucket = (title, bucket, list) => {
    const items = Object.entries(cart[bucket]);
    if (!items.length) return;
    msg += `*${title}:*\n`;
    for (const [i, q] of items) {
      const it = list && list[i];
      if (!it) continue;
      msg += `• ${q} × ${it.nombre} — $${(q * priceNum(it.precio)).toLocaleString('es-CL')}\n`;
    }
    msg += '\n';
  };
  appendBucket('Adicionales', 'adicionales', currentMenu.adicionales);
  appendBucket('Bebidas', 'bebidas', currentMenu.bebidas);
  appendBucket('Postres', 'postres', currentMenu.postres);
  msg += `*Total: $${cartTotal().toLocaleString('es-CL')}*`;

  saveOrderToDb(paymentMethod, mesa, price).catch(() => {});

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

function buildOrderItems(price) {
  const items = [];
  for (const plato of cart.platos) {
    const p = currentMenu.menusDelDia[plato.p];
    if (!p) continue;
    const arr = Array.isArray(plato.as) ? plato.as : (plato.a !== undefined ? [plato.a] : []);
    const nombres = arr
      .map(ai => currentMenu.agregados[ai])
      .filter(Boolean)
      .map(a => a.nombre);
    items.push({
      tipo: 'menu',
      nombre: p.nombre,
      agregados: nombres,
      cantidad: 1,
      precio: price
    });
  }
  const bucketItems = (bucket, list) => {
    for (const [i, q] of Object.entries(cart[bucket])) {
      const it = list && list[i];
      if (!it) continue;
      items.push({
        tipo: bucket,
        nombre: it.nombre,
        cantidad: Number(q),
        precio: priceNum(it.precio)
      });
    }
  };
  bucketItems('adicionales', currentMenu.adicionales);
  bucketItems('bebidas', currentMenu.bebidas);
  bucketItems('postres', currentMenu.postres);
  return items;
}

async function saveOrderToDb(paymentMethod, mesa, price) {
  if (typeof createOrder !== 'function') return;
  const items = buildOrderItems(price);
  if (!items.length) return;
  await createOrder({
    mesa: mesa || '',
    payment: paymentMethod || '',
    items,
    total: cartTotal()
  });
}

function showTransferModal() {
  const m = document.getElementById('transferModal');
  if (!m) return;
  m.hidden = false;
  document.body.style.overflow = 'hidden';
}
function hideTransferModal() {
  const m = document.getElementById('transferModal');
  if (!m) return;
  m.hidden = true;
  if (!isAnyModalOpen()) document.body.style.overflow = '';
}
function showPaymentModal() {
  const m = document.getElementById('paymentModal');
  if (!m) return;
  m.hidden = false;
  document.body.style.overflow = 'hidden';
}
function hidePaymentModal() {
  const m = document.getElementById('paymentModal');
  if (!m) return;
  m.hidden = true;
  if (!isAnyModalOpen()) document.body.style.overflow = '';
}
function isAnyModalOpen() {
  const t = document.getElementById('transferModal');
  const p = document.getElementById('paymentModal');
  return (t && !t.hidden) || (p && !p.hidden);
}
function askPaymentMethod() {
  if (!currentMenu) return;
  if (cart.platoEnCurso !== null) {
    alert('Tienes un plato sin completar. Confirma o cancela ese plato antes de enviar.');
    return;
  }
  if (cartCount() === 0) return;
  showPaymentModal();
}
function chooseCash() {
  hidePaymentModal();
  sendWhatsApp('Efectivo');
}
function chooseTransfer() {
  hidePaymentModal();
  sendWhatsApp('Transferencia');
}
function copyTransferField(btn) {
  const targetId = btn.getAttribute('data-target');
  const el = document.getElementById(targetId);
  if (!el) return;
  const text = el.textContent.trim();
  const done = () => {
    const original = btn.textContent;
    btn.textContent = 'Copiado ✓';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 1400);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(ta);
      done();
    });
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
    done();
  }
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideTransferModal();
    hidePaymentModal();
  }
});

function qtyControlHtml(index, bucket = 'adicionales') {
  const q = cart[bucket][index] || 0;
  const fnMap = { adicionales: 'changeAdicional', bebidas: 'changeBebida', postres: 'changePostre' };
  const fn = fnMap[bucket];
  return `<div class="qty">
    <button onclick="${fn}(${index}, -1)" ${q === 0 ? 'disabled' : ''}>−</button>
    <span class="n">${q}</span>
    <button onclick="${fn}(${index}, 1)">+</button>
  </div>`;
}

function sortAvailableFirst(list) {
  return list
    .map((item, i) => ({ item, i }))
    .sort((a, b) => (a.item.agotado ? 1 : 0) - (b.item.agotado ? 1 : 0));
}

function renderCartaCard(title, sectionId, list, bucket) {
  if (!Array.isArray(list) || list.length === 0) return '';
  let html = `<div class="card" id="${sectionId}">`;
  html += `<div class="banner">${escapeHtml(title)}</div>`;
  html += '<ul class="adicionales">';
  for (const { item: a, i } of sortAvailableFirst(list)) {
    const p = a.precio ? `<span class="p">${escapeHtml(formatPrice(a.precio))}</span>` : '';
    if (a.agotado) {
      html += `<li class="agotado"><span class="name">${escapeHtml(a.nombre)}</span><span class="badge-out">Agotado</span>${p}</li>`;
    } else {
      html += `<li><span class="name">${escapeHtml(a.nombre)}</span>${p}${qtyControlHtml(i, bucket)}</li>`;
    }
  }
  html += '</ul></div>';
  return html;
}

function applyTheme(name) {
  const themes = ['clasico', 'oscuro', 'bosque', 'oceano', 'borgona'];
  const chosen = themes.includes(name) ? name : 'clasico';
  document.body.classList.remove(...themes.map(t => 'theme-' + t));
  document.body.classList.add('theme-' + chosen);
}

// ---------- render ----------
function renderMenu(m) {
  applyTheme(m.theme);
  const content = document.getElementById('content');
  document.getElementById('brand').textContent = m.restaurantName || 'Restaurante';
  document.getElementById('date').textContent = m.date || todayInSpanish();

  const mesa = getMesa();
  document.getElementById('mesaBadge').innerHTML = mesa
    ? `<div class="mesa-badge">Mesa ${escapeHtml(mesa)}</div>`
    : '';

  const hasMenus = Array.isArray(m.menusDelDia) && m.menusDelDia.length > 0;
  const hasAgregados = Array.isArray(m.agregados) && m.agregados.length > 0;
  const hasAdicionales = m.showAdicionales !== false && Array.isArray(m.adicionales) && m.adicionales.length > 0;
  const hasBebidas = m.showBebidas !== false && Array.isArray(m.bebidas) && m.bebidas.length > 0;
  const hasPostres = m.showPostres !== false && Array.isArray(m.postres) && m.postres.length > 0;
  const hasAny = hasMenus || hasAgregados || hasAdicionales || hasBebidas || hasPostres || (m.notas && m.notas.trim());

  if (!hasAny) {
    content.innerHTML = '<div class="card"><div class="empty">El menú de hoy aún no está publicado.<br/>Vuelve en unos minutos.</div></div>';
    document.getElementById('updated').textContent = '';
    return;
  }

  const enCurso = cart.platoEnCurso;
  let html = '';

  if (hasMenus || hasAgregados || hasAdicionales || hasBebidas || hasPostres) {
    html += '<div class="card nav-card">';
    html += '<div class="banner">Menú</div>';
    const dateStr = m.date || todayInSpanish();
    if (dateStr) html += `<div class="menu-date">${escapeHtml(dateStr)}</div>`;
    html += '<div class="nav-hint">Toca un botón para ir directo a la sección que quieres ver.</div>';
    html += '<div class="nav-buttons">';
    if (hasMenus || hasAgregados) {
      html += `<button class="nav-btn" onclick="scrollToSection('section-menu-dia')">Menú del día</button>`;
    }
    if (hasAdicionales) {
      html += `<button class="nav-btn" onclick="scrollToSection('section-adicionales')">A la carta</button>`;
    }
    if (hasBebidas) {
      html += `<button class="nav-btn" onclick="scrollToSection('section-bebidas')">Bebidas</button>`;
    }
    if (hasPostres) {
      html += `<button class="nav-btn" onclick="scrollToSection('section-postres')">Postres</button>`;
    }
    html += '</div></div>';
  }

  if (hasMenus || hasAgregados) {
    html += '<div class="card" id="section-menu-dia">';
    html += '<div class="banner">Menú del día</div>';
    const priceHtml = escapeHtml(formatPrice(m.menuPrice || '5000'));
    const extraBuckets = [
      { name: 'Bebidas', key: 'bebidas', list: m.bebidas },
      { name: 'Adicionales a la carta', key: 'adicionales', list: m.adicionales },
      { name: 'Postres', key: 'postres', list: m.postres }
    ];
    const hasAnyExtra = extraBuckets.some(b =>
      Array.isArray(b.list) && Object.values(cart[b.key]).some(q => q > 0)
    );
    if (!cart.platos.length && !hasAnyExtra) {
      html += `<div class="price-tag"><small>Precio por plato</small><strong>${priceHtml}</strong></div>`;
    } else {
      const totalStr = '$' + cartTotal().toLocaleString('es-CL');
      html += '<div class="pedido-frame">';
      html += `<div class="pedido-header">
        <div class="pedido-title">Tu pedido</div>
        <div class="pedido-price"><small>Total</small><strong>${escapeHtml(totalStr)}</strong></div>
      </div>`;
      const platoPrice = priceNum(m.menuPrice || '5000');
      const platoPriceStr = '$' + platoPrice.toLocaleString('es-CL');
      if (cart.platos.length) {
        html += '<ul class="platos-list">';
        cart.platos.forEach((plato, idx) => {
          const p = m.menusDelDia[plato.p];
          const arr = Array.isArray(plato.as) ? plato.as : (plato.a !== undefined ? [plato.a] : []);
          const nombres = arr.map(ai => {
            const ag = m.agregados[ai];
            return ag ? ag.nombre : '?';
          });
          const agregadoStr = nombres.length ? nombres.join(' + ') : '?';
          const isNew = !!plato.justAdded;
          if (isNew) plato.justAdded = false;
          const cls = isNew ? ' class="just-added"' : '';
          const badge = isNew ? '<span class="new-badge">Nuevo</span>' : '';
          html += `<li${cls}>
            <span class="plato-desc"><span class="num">${idx + 1}</span>${escapeHtml((p && p.nombre) || '?')} <span style="color:var(--muted)">+</span> ${escapeHtml(agregadoStr)}${badge}</span>
            <span class="pedido-subtotal">${escapeHtml(platoPriceStr)}</span>
            <button class="btn-x" onclick="removePlato(${idx})">Quitar</button>
          </li>`;
        });
        html += '</ul>';
      }
      const justAdded = cart._justAddedExtra;
      for (const bucket of extraBuckets) {
        if (!Array.isArray(bucket.list)) continue;
        const entries = Object.entries(cart[bucket.key]).filter(([, q]) => q > 0);
        if (!entries.length) continue;
        html += `<div class="pedido-subtitle">${bucket.name}</div>`;
        html += '<ul class="platos-list pedido-extras">';
        for (const [i, q] of entries) {
          const item = bucket.list[i];
          if (!item) continue;
          const subtotal = q * priceNum(item.precio);
          const subtotalStr = '$' + subtotal.toLocaleString('es-CL');
          const isNew = justAdded && justAdded.bucket === bucket.key && justAdded.index === String(i);
          const cls = isNew ? ' class="just-added"' : '';
          const badge = isNew ? '<span class="new-badge">Nuevo</span>' : '';
          html += `<li${cls}>
            <span class="plato-desc"><span class="num">${q}</span>${escapeHtml(item.nombre)}${badge}</span>
            <span class="pedido-subtotal">${escapeHtml(subtotalStr)}</span>
            <button class="btn-x" onclick="removeExtra('${bucket.key}', ${i})">Quitar</button>
          </li>`;
        }
        html += '</ul>';
      }
      cart._justAddedExtra = null;
      html += '</div>';
    }

    if (hasMenus) {
      html += '<div class="section-title"><span class="step-num">1</span> Elige tu plato principal</div>';
      html += '<ul class="options">';
      for (const { item: opt, i } of sortAvailableFirst(m.menusDelDia)) {
        const used = principalUsedCount(i);
        if (opt.agotado) {
          html += `<li class="agotado"><span class="name">${escapeHtml(opt.nombre)}</span><span class="badge-out">Agotado</span></li>`;
        } else if (enCurso === i) {
          html += `<li class="pending-agregado"><span class="name">${escapeHtml(opt.nombre)}</span><span class="badge-pending">Elegido ✓</span></li>`;
        } else {
          const disabled = enCurso !== null;
          const chip = used > 0 ? `<span class="count-chip">×${used}</span>` : '';
          html += `<li><span class="name">${escapeHtml(opt.nombre)}</span>${chip}<button class="btn-pick" ${disabled ? 'disabled' : ''} onclick="pickPrincipal(${i})">Elegir</button></li>`;
        }
      }
      html += '</ul>';
    }

    if (hasAgregados) {
      html += '<div id="agregado-section" class="section-title"><span class="step-num">2</span> Ahora elige uno o más agregados</div>';
      if (enCurso !== null) {
        const cur = m.menusDelDia[enCurso];
        const pending = cart.platoEnCursoAgregados;
        if (!pending.length) {
          html += `<div class="step-alert">
            <div class="step-alert-title">Falta 1 paso</div>
            <div class="step-alert-body">Elegiste <b>${escapeHtml((cur && cur.nombre) || '?')}</b>. Ahora toca uno o más <b>agregados</b> abajo para completar tu plato.</div>
            <a href="#" onclick="event.preventDefault(); cancelPlato();" class="step-alert-cancel">Cancelar este plato</a>
          </div>`;
        } else {
          html += `<div class="pending-plato">
            <div class="pending-plato-title">Plato en curso: <b>${escapeHtml((cur && cur.nombre) || '?')}</b></div>
            <ul class="pending-agregados-list">`;
          pending.forEach((ai, pi) => {
            const ag = m.agregados[ai];
            html += `<li><span class="name">${escapeHtml((ag && ag.nombre) || '?')}</span><button class="btn-x" onclick="removePendingAgregado(${pi})">Quitar</button></li>`;
          });
          html += `</ul>
            <div class="pending-plato-actions">
              <button id="confirmar-plato-btn" class="btn-confirm" onclick="confirmPlato()">Agregar plato al pedido</button>
              <a href="#" onclick="event.preventDefault(); cancelPlato();" class="step-alert-cancel">Cancelar plato</a>
            </div>
            <div class="helper-hint">Puedes seguir tocando agregados abajo para añadirlos a este plato.</div>
          </div>`;
        }
      } else if (!cart.platos.length) {
        html += '<div class="helper-hint">Primero elige un <b>principal</b> arriba.</div>';
      }
      const highlight = enCurso !== null ? ' highlight' : '';
      html += `<ul class="options${highlight}">`;
      for (const { item: a, i } of sortAvailableFirst(m.agregados)) {
        const used = agregadoUsedCount(i);
        if (a.agotado) {
          html += `<li class="agotado"><span class="name">${escapeHtml(a.nombre)}</span><span class="badge-out">Agotado</span></li>`;
        } else {
          const chip = used > 0 ? `<span class="count-chip">×${used}</span>` : '';
          const disabled = enCurso === null;
          const label = enCurso !== null && cart.platoEnCursoAgregados.length ? 'Agregar' : 'Elegir';
          html += `<li><span class="name">${escapeHtml(a.nombre)}</span>${chip}<button class="btn-pick" ${disabled ? 'disabled' : ''} onclick="pickAgregado(${i})">${label}</button></li>`;
        }
      }
      html += '</ul>';
    }

    if (m.notas && m.notas.trim()) {
      html += `<div class="notes">${escapeHtml(m.notas)}</div>`;
    }
    html += '</div>';
  }

  if (hasAdicionales) {
    html += renderCartaCard('Adicionales a la carta', 'section-adicionales', m.adicionales, 'adicionales');
  }
  if (hasBebidas) {
    html += renderCartaCard('Bebidas', 'section-bebidas', m.bebidas, 'bebidas');
  }
  if (hasPostres) {
    html += renderCartaCard('Postres', 'section-postres', m.postres, 'postres');
  }

  content.innerHTML = html;
  document.getElementById('updated').textContent = m.updatedAt ? 'Actualizado: ' + fmtDate(m.updatedAt) : '';
}

// ---------- data layer (Supabase) ----------
const MENU_CACHE_KEY = 'menuCacheV1';

function loadMenuFromCache() {
  try {
    const raw = localStorage.getItem(MENU_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) { return null; }
}

function saveMenuToCache(m) {
  try { localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(m)); } catch (_) {}
}

async function loadMenu() {
  const content = document.getElementById('content');
  if (!currentMenu) content.innerHTML = '<div class="card"><div class="empty">Cargando...</div></div>';
  try {
    currentMenu = await fetchMenu();
    saveMenuToCache(currentMenu);
    renderMenu(currentMenu);
    renderCart();
  } catch (err) {
    console.error(err);
    if (!currentMenu) content.innerHTML = `<div class="card"><div class="empty">No se pudo cargar el menú.<br/><small>${escapeHtml(err.message || err)}</small></div></div>`;
  }
}

// ---------- bootstrap ----------
const cachedMenu = loadMenuFromCache();
if (cachedMenu) {
  currentMenu = cachedMenu;
  renderMenu(currentMenu);
  renderCart();
}
loadMenu();
setInterval(loadMenu, 3 * 60 * 1000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') loadMenu();
});

subscribeToMenu(m => {
  currentMenu = m;
  renderMenu(m);
  renderCart();
});
