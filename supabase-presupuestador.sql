-- Presupuestador de visitas postventa: configuración compartida por todo el equipo.
-- Ejecutar UNA VEZ en Supabase (menú "SQL Editor" → New query → pegar → Run).
-- Guarda un solo registro con los parámetros (tipo de cambio, ganancia, combustible, viáticos, vehículos, etc.).
-- Los presupuestos en sí NO se guardan.

create table if not exists public.presupuestador_config (
  clave      text primary key,
  valor      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.presupuestador_config enable row level security;

-- Solo usuarios con sesión iniciada (los mismos de Solicitudes y Cables) pueden leer y modificar.
drop policy if exists "presupuestador_config_leer" on public.presupuestador_config;
create policy "presupuestador_config_leer" on public.presupuestador_config
  for select to authenticated using (true);

drop policy if exists "presupuestador_config_insertar" on public.presupuestador_config;
create policy "presupuestador_config_insertar" on public.presupuestador_config
  for insert to authenticated with check (true);

drop policy if exists "presupuestador_config_actualizar" on public.presupuestador_config;
create policy "presupuestador_config_actualizar" on public.presupuestador_config
  for update to authenticated using (true) with check (true);
