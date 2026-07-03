// ============================================================
// CONFIGURACIÓN DE SUPABASE — Reemplaza estos valores por los
// de tu proyecto (los encuentras en Supabase → Project Settings → API).
// ============================================================

const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU_ANON_KEY_AQUI';

// Email del usuario administrador (el que creaste en Supabase → Authentication → Users).
// La dueña solo ingresa su contraseña; el email queda fijo aquí.
const ADMIN_EMAIL = 'dueña@mi-restaurante.cl';

// ============================================================
// A partir de aquí no necesitas cambiar nada.
// ============================================================

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

function dbToMenu(row) {
  if (!row) return null;
  return {
    restaurantName: row.restaurant_name || '',
    date: row.date || '',
    menuPrice: row.menu_price || '5000',
    whatsappNumber: row.whatsapp_number || '',
    theme: row.theme || 'clasico',
    menusDelDia: row.menus_del_dia || [],
    agregados: row.agregados || [],
    adicionales: row.adicionales || [],
    notas: row.notas || '',
    updatedAt: row.updated_at || null
  };
}

function menuToDb(m) {
  return {
    restaurant_name: m.restaurantName || '',
    date: m.date || '',
    menu_price: m.menuPrice || '5000',
    whatsapp_number: (m.whatsappNumber || '').replace(/\D/g, ''),
    theme: m.theme || 'clasico',
    menus_del_dia: m.menusDelDia || [],
    agregados: m.agregados || [],
    adicionales: m.adicionales || [],
    notas: m.notas || '',
    updated_at: new Date().toISOString()
  };
}

async function fetchMenu() {
  const { data, error } = await supabase
    .from('menu_config')
    .select('*')
    .eq('id', 1)
    .single();
  if (error) throw error;
  return dbToMenu(data);
}

async function saveMenu(menu) {
  const { data, error } = await supabase
    .from('menu_config')
    .update(menuToDb(menu))
    .eq('id', 1)
    .select()
    .single();
  if (error) throw error;
  return dbToMenu(data);
}

function subscribeToMenu(callback) {
  return supabase
    .channel('menu-realtime')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'menu_config', filter: 'id=eq.1' },
      (payload) => callback(dbToMenu(payload.new))
    )
    .subscribe();
}
