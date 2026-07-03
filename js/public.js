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
let cart = { platos: [], platoEnCurso: null, adicionales: {} };

// ---------- cart actions ----------
function pickPrincipal(i) {
  if (cart.platoEnCurso !== null) return;
  cart.platoEnCurso = i;
  renderAll();
}
function pickAgregado(i) {
  if (cart.platoEnCurso === null) return;
  cart.platos.push({ p: cart.platoEnCurso, a: i });
  cart.platoEnCurso = null;
  renderAll();
}
function cancelPlato() { cart.platoEnCurso = null; renderAll(); }
function removePlato(idx) { cart.platos.splice(idx, 1); renderAll(); }
function principalUsedCount(i) { return cart.platos.filter(p => p.p === i).length; }
function agregadoUsedCount(i) { return cart.platos.filter(p => p.a === i).length; }

function changeAdicional(index, delta) {
  const cur = cart.adicionales[index] || 0;
  const next = Math.max(0, cur + delta);
  if (next === 0) delete cart.adicionales[index];
  else cart.adicionales[index] = next;
  renderAll();
}

function cartCount() {
  const sumAdi = Object.values(cart.adicionales).reduce((a, b) => a + b, 0);
  return cart.platos.length + sumAdi;
}
function cartTotal() {
  if (!currentMenu) return 0;
  const price = priceNum(currentMenu.menuPrice || '5000');
  let total = cart.platos.length * price;
  for (const [i, q] of Object.entries(cart.adicionales)) {
    const it = currentMenu.adicionales[i];
    if (it) total += q * priceNum(it.precio);
  }
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

function sendWhatsApp() {
  if (!currentMenu) return;
  if (cart.platoEnCurso !== null) {
    alert('Tienes un plato sin completar. Elige un agregado o cancela ese plato antes de enviar.');
    return;
  }
  const phone = (currentMenu.whatsappNumber || '').replace(/\D/g, '');
  if (!phone) { alert('El restaurante no ha configurado WhatsApp todavía.'); return; }

  const mesa = getMesa();
  const price = priceNum(currentMenu.menuPrice || '5000');
  let msg = 'Hola! Quiero hacer un pedido';
  if (mesa) msg += ' desde la mesa ' + mesa;
  msg += '.\n\n';

  if (cart.platos.length) {
    msg += '*Menú del día:*\n';
    cart.platos.forEach((plato, idx) => {
      const p = currentMenu.menusDelDia[plato.p];
      const a = currentMenu.agregados[plato.a];
      if (!p || !a) return;
      msg += `${idx + 1}. ${p.nombre} + ${a.nombre} — $${price.toLocaleString('es-CL')}\n`;
    });
    msg += '\n';
  }

  const adiItems = Object.entries(cart.adicionales);
  if (adiItems.length) {
    msg += '*Adicionales:*\n';
    for (const [i, q] of adiItems) {
      const it = currentMenu.adicionales[i];
      if (!it) continue;
      msg += `• ${q} × ${it.nombre} — $${(q * priceNum(it.precio)).toLocaleString('es-CL')}\n`;
    }
    msg += '\n';
  }
  msg += `*Total: $${cartTotal().toLocaleString('es-CL')}*`;

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

function qtyControlHtml(index) {
  const q = cart.adicionales[index] || 0;
  return `<div class="qty">
    <button onclick="changeAdicional(${index}, -1)" ${q === 0 ? 'disabled' : ''}>−</button>
    <span class="n">${q}</span>
    <button onclick="changeAdicional(${index}, 1)">+</button>
  </div>`;
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
  const hasAdicionales = Array.isArray(m.adicionales) && m.adicionales.length > 0;
  const hasAny = hasMenus || hasAgregados || hasAdicionales || (m.notas && m.notas.trim());

  if (!hasAny) {
    content.innerHTML = '<div class="card"><div class="empty">El menú de hoy aún no está publicado.<br/>Vuelve en unos minutos.</div></div>';
    document.getElementById('updated').textContent = '';
    return;
  }

  const enCurso = cart.platoEnCurso;
  let html = '';

  if (hasMenus || hasAgregados) {
    html += '<div class="card">';
    html += '<div class="banner">Menú del día</div>';
    html += `<div class="price-tag"><small>Precio por plato</small><strong>${escapeHtml(formatPrice(m.menuPrice || '5000'))}</strong></div>`;

    if (cart.platos.length) {
      html += '<div class="section-title">Tu pedido</div>';
      html += '<ul class="platos-list">';
      cart.platos.forEach((plato, idx) => {
        const p = m.menusDelDia[plato.p], a = m.agregados[plato.a];
        html += `<li>
          <span class="plato-desc"><span class="num">${idx + 1}</span>${escapeHtml((p && p.nombre) || '?')} <span style="color:var(--muted)">+</span> ${escapeHtml((a && a.nombre) || '?')}</span>
          <button class="btn-x" onclick="removePlato(${idx})">Quitar</button>
        </li>`;
      });
      html += '</ul>';
    }

    if (hasMenus) {
      html += '<div class="section-title">Principal</div>';
      if (enCurso !== null) {
        const cur = m.menusDelDia[enCurso];
        html += `<div class="helper-hint">Estás armando el plato con <b>${escapeHtml((cur && cur.nombre) || '?')}</b>. Ahora elige un agregado abajo. <a href="#" onclick="event.preventDefault(); cancelPlato();" style="color:var(--accent);">Cancelar</a></div>`;
      }
      html += '<ul class="options">';
      for (let i = 0; i < m.menusDelDia.length; i++) {
        const opt = m.menusDelDia[i];
        const used = principalUsedCount(i);
        if (opt.agotado) {
          html += `<li class="agotado"><span class="name">${escapeHtml(opt.nombre)}</span><span class="badge-out">Agotado</span></li>`;
        } else if (enCurso === i) {
          html += `<li class="pending-agregado"><span class="name">${escapeHtml(opt.nombre)}</span><span class="badge-pending">Elige agregado ↓</span></li>`;
        } else {
          const disabled = enCurso !== null;
          const chip = used > 0 ? `<span class="count-chip">×${used}</span>` : '';
          html += `<li><span class="name">${escapeHtml(opt.nombre)}</span>${chip}<button class="btn-pick" ${disabled ? 'disabled' : ''} onclick="pickPrincipal(${i})">Elegir</button></li>`;
        }
      }
      html += '</ul>';
    }

    if (hasAgregados) {
      html += '<div class="section-title">Agregado</div>';
      if (enCurso === null && !cart.platos.length) {
        html += '<div class="helper-hint">Primero elige un <b>principal</b> arriba.</div>';
      }
      html += '<ul class="options">';
      for (let i = 0; i < m.agregados.length; i++) {
        const a = m.agregados[i];
        const used = agregadoUsedCount(i);
        if (a.agotado) {
          html += `<li class="agotado"><span class="name">${escapeHtml(a.nombre)}</span><span class="badge-out">Agotado</span></li>`;
        } else {
          const chip = used > 0 ? `<span class="count-chip">×${used}</span>` : '';
          const disabled = enCurso === null;
          html += `<li><span class="name">${escapeHtml(a.nombre)}</span>${chip}<button class="btn-pick" ${disabled ? 'disabled' : ''} onclick="pickAgregado(${i})">Elegir</button></li>`;
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
    html += '<div class="card">';
    html += '<div class="banner">Adicionales a la carta</div>';
    html += '<ul class="adicionales">';
    for (let i = 0; i < m.adicionales.length; i++) {
      const a = m.adicionales[i];
      const p = a.precio ? `<span class="p">${escapeHtml(formatPrice(a.precio))}</span>` : '';
      if (a.agotado) {
        html += `<li class="agotado"><span class="name">${escapeHtml(a.nombre)}</span><span class="badge-out">Agotado</span>${p}</li>`;
      } else {
        html += `<li><span class="name">${escapeHtml(a.nombre)}</span>${p}${qtyControlHtml(i)}</li>`;
      }
    }
    html += '</ul>';
    html += '</div>';
  }

  content.innerHTML = html;
  document.getElementById('updated').textContent = m.updatedAt ? 'Actualizado: ' + fmtDate(m.updatedAt) : '';
}

// ---------- data layer (Supabase) ----------
async function loadMenu() {
  const content = document.getElementById('content');
  if (!currentMenu) content.innerHTML = '<div class="card"><div class="empty">Cargando...</div></div>';
  try {
    currentMenu = await fetchMenu();
    renderMenu(currentMenu);
    renderCart();
  } catch (err) {
    console.error(err);
    content.innerHTML = `<div class="card"><div class="empty">No se pudo cargar el menú.<br/><small>${escapeHtml(err.message || err)}</small></div></div>`;
  }
}

// ---------- bootstrap ----------
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
