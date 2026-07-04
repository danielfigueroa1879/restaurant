// ============================================================
// CONFIGURACIÓN DE SUPABASE — Reemplaza estos valores por los
// de tu proyecto (los encuentras en Supabase → Project Settings → API).
// ============================================================

const SUPABASE_URL = 'https://vqlmjqmagflbwbbojfqh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbG1qcW1hZ2ZsYndiYm9qZnFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNjE0ODgsImV4cCI6MjA5ODYzNzQ4OH0.6vXrkK5D5psISqnkGUTM2arQgwEitJflXm4jcBMZn4c';

// Email del usuario administrador (el que creaste en Supabase → Authentication → Users).
// La dueña solo ingresa su contraseña; el email queda fijo aquí.
const ADMIN_EMAIL = 'duena@gmail.com';

// ============================================================
// A partir de aquí no necesitas cambiar nada.
// ============================================================

const { createClient: _createSupabase } = window.supabase;
const db = _createSupabase(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
    bebidas: row.bebidas || [],
    postres: row.postres || [],
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
    bebidas: m.bebidas || [],
    postres: m.postres || [],
    notas: m.notas || '',
    updated_at: new Date().toISOString()
  };
}

async function fetchMenu() {
  const { data, error } = await db
    .from('menu_config')
    .select('*')
    .eq('id', 1)
    .single();
  if (error) throw error;
  return dbToMenu(data);
}

async function saveMenu(menu) {
  const { data, error } = await db
    .from('menu_config')
    .update(menuToDb(menu))
    .eq('id', 1)
    .select()
    .single();
  if (error) throw error;
  return dbToMenu(data);
}

function subscribeToMenu(callback) {
  return db
    .channel('menu-realtime')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'menu_config', filter: 'id=eq.1' },
      (payload) => callback(dbToMenu(payload.new))
    )
    .subscribe();
}

async function signInAdmin(password) {
  const { error } = await db.auth.signInWithPassword({ email: ADMIN_EMAIL, password });
  return error;
}

async function getAdminSession() {
  const { data: { session } } = await db.auth.getSession();
  return session;
}
