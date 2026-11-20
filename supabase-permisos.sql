-- Accesos por herramienta del Panel de Obras Solares.
-- Cada usuario (email de Supabase Authentication) tiene una lista de herramientas autorizadas:
--   solicitudes · cables · presupuestador · admin (admin = todo + administrar accesos).
--
-- CÓMO EJECUTARLO (una sola vez): Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
-- ANTES de ejecutarlo, reemplazá abajo REEMPLAZAR_POR_TU_EMAIL por tu email de ingreso al panel.
-- Si te olvidás, el script avisa y se cancela sin cambiar nada.
--
-- Qué hace:
--   1) Crea la tabla de permisos y las funciones de control.
--   2) Te carga a vos como administrador.
--   3) Cambia las políticas de seguridad de las tablas de Solicitudes y del Presupuestador para que la
--      base de datos rechace leer o guardar datos a quien no esté autorizado.
-- A partir de ahí, nadie entra a una herramienta con clave hasta que lo autorices en la pestaña "Accesos de usuarios".

begin;

-- ───────────── 1) Tabla y funciones ─────────────
create table if not exists public.permisos_herramientas (
  email       text not null check (email = lower(email)),
  herramienta text not null check (herramienta in ('solicitudes', 'cables', 'presupuestador', 'admin')),
  created_at  timestamptz not null default now(),
  primary key (email, herramienta)
);

create or replace function public.tiene_acceso(h text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.permisos_herramientas p
    where p.email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and p.herramienta in (h, 'admin')
  );
$$;

create or replace function public.es_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.permisos_herramientas p
    where p.email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and p.herramienta = 'admin'
  );
$$;

-- Lista de usuarios para la pantalla de accesos (solo la ve un administrador)
create or replace function public.usuarios_panel()
returns table (email text, creado timestamptz, ultimo_acceso timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select u.email::text, u.created_at, u.last_sign_in_at
  from auth.users u
  where public.es_admin()
  order by u.email;
$$;

revoke all on function public.tiene_acceso(text), public.es_admin(), public.usuarios_panel() from public, anon;
grant execute on function public.tiene_acceso(text), public.es_admin(), public.usuarios_panel() to authenticated;

grant select, insert, update, delete on public.permisos_herramientas to authenticated;
revoke all on public.permisos_herramientas from anon;
alter table public.permisos_herramientas enable row level security;

drop policy if exists "permisos_ver" on public.permisos_herramientas;
create policy "permisos_ver" on public.permisos_herramientas
  for select to authenticated using (email = lower(coalesce(auth.jwt() ->> 'email', '')) or public.es_admin());

drop policy if exists "permisos_alta" on public.permisos_herramientas;
create policy "permisos_alta" on public.permisos_herramientas
  for insert to authenticated with check (public.es_admin());

drop policy if exists "permisos_baja" on public.permisos_herramientas;
create policy "permisos_baja" on public.permisos_herramientas
  for delete to authenticated using (public.es_admin());

drop policy if exists "permisos_cambio" on public.permisos_herramientas;
create policy "permisos_cambio" on public.permisos_herramientas
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- ───────────── 2) Tu usuario como administrador ─────────────
do $$
declare mi_email text := lower('REEMPLAZAR_POR_TU_EMAIL');
begin
  if mi_email like 'reemplazar%' then
    raise exception 'Falta reemplazar REEMPLAZAR_POR_TU_EMAIL por tu email en este archivo. No se cambió nada.';
  end if;
  if not exists (select 1 from auth.users where lower(email) = mi_email) then
    raise exception 'No existe un usuario con el email % en Authentication → Users. No se cambió nada.', mi_email;
  end if;
  insert into public.permisos_herramientas (email, herramienta) values (mi_email, 'admin') on conflict do nothing;
end $$;

-- ───────────── 3) Políticas de las tablas ─────────────
-- Vehículos, combustibles y ajustes: leen quienes tengan Solicitudes o Presupuestador (el presupuestador usa la flota,
-- los precios y las tarifas de viáticos); escribe solo Solicitudes.
do $$
declare t text;
begin
  foreach t in array array['combustibles', 'vehiculos', 'ajustes'] loop
    execute format('drop policy if exists "autenticados" on public.%I', t);
    execute format('drop policy if exists "leer_solicitudes_o_presupuestador" on public.%I', t);
    execute format('drop policy if exists "alta_solicitudes" on public.%I', t);
    execute format('drop policy if exists "cambio_solicitudes" on public.%I', t);
    execute format('drop policy if exists "baja_solicitudes" on public.%I', t);
    execute format('create policy "leer_solicitudes_o_presupuestador" on public.%I for select to authenticated using (public.tiene_acceso(''solicitudes'') or public.tiene_acceso(''presupuestador''))', t);
    execute format('create policy "alta_solicitudes" on public.%I for insert to authenticated with check (public.tiene_acceso(''solicitudes''))', t);
    execute format('create policy "cambio_solicitudes" on public.%I for update to authenticated using (public.tiene_acceso(''solicitudes'')) with check (public.tiene_acceso(''solicitudes''))', t);
    execute format('create policy "baja_solicitudes" on public.%I for delete to authenticated using (public.tiene_acceso(''solicitudes''))', t);
  end loop;
end $$;

-- Personal: solo Solicitudes
drop policy if exists "autenticados" on public.personal;
drop policy if exists "solo_solicitudes" on public.personal;
create policy "solo_solicitudes" on public.personal
  for all to authenticated using (public.tiene_acceso('solicitudes')) with check (public.tiene_acceso('solicitudes'));

-- Configuración del presupuestador (si la tabla existe): solo Presupuestador
do $$
begin
  if to_regclass('public.presupuestador_config') is not null then
    drop policy if exists "presupuestador_config_leer" on public.presupuestador_config;
    drop policy if exists "presupuestador_config_insertar" on public.presupuestador_config;
    drop policy if exists "presupuestador_config_actualizar" on public.presupuestador_config;
    drop policy if exists "solo_presupuestador" on public.presupuestador_config;
    create policy "solo_presupuestador" on public.presupuestador_config
      for all to authenticated using (public.tiene_acceso('presupuestador')) with check (public.tiene_acceso('presupuestador'));
  end if;
end $$;

commit;
