-- ============================================================
-- Configuración de la base de datos para el menú del restaurante.
-- Ejecuta este script COMPLETO una sola vez en:
--    Supabase → SQL Editor → New query → Pegas esto → Run
-- ============================================================

-- 1. Tabla única con toda la configuración del menú
create table if not exists public.menu_config (
  id                integer primary key,
  restaurant_name   text     default 'Restaurante',
  date              text     default '',
  menu_price        text     default '5000',
  whatsapp_number   text     default '',
  theme             text     default 'clasico',
  menus_del_dia     jsonb    default '[]'::jsonb,
  agregados         jsonb    default '[]'::jsonb,
  adicionales       jsonb    default '[]'::jsonb,
  bebidas           jsonb    default '[]'::jsonb,
  postres           jsonb    default '[]'::jsonb,
  notas             text     default '',
  updated_at        timestamptz default now()
);

-- Migración: si la tabla ya existía, agrega las columnas nuevas (bebidas y postres)
alter table public.menu_config
  add column if not exists bebidas jsonb default '[]'::jsonb;
alter table public.menu_config
  add column if not exists postres jsonb default '[]'::jsonb;

-- 2. Fila única con id = 1 (todos leen y escriben aquí)
insert into public.menu_config (id) values (1)
  on conflict (id) do nothing;

-- 3. Row Level Security: los clientes solo pueden LEER; solo la dueña autenticada puede escribir
alter table public.menu_config enable row level security;

drop policy if exists "public_read"   on public.menu_config;
drop policy if exists "auth_update"   on public.menu_config;

create policy "public_read" on public.menu_config
  for select
  using ( true );

create policy "auth_update" on public.menu_config
  for update
  using ( auth.role() = 'authenticated' );

-- 4. Activar Realtime (para que la vista pública reciba cambios en vivo)
alter publication supabase_realtime add table public.menu_config;
