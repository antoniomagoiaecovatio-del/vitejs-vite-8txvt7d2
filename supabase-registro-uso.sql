-- Registro de uso de Soltrack: quién usó qué herramienta y cuándo.
-- Cada vez que una persona genera algo (una estimación, un PDF, un Excel, una solicitud) se guarda una fila.
-- Solo los administradores pueden LEER el registro (pestaña "Uso del programa" de Accesos y uso); cualquier usuario
-- con sesión puede ANOTAR su propio uso, pero no ver ni modificar lo de los demás.
--
-- CÓMO EJECUTARLO (una sola vez): Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
-- Requisito: haber ejecutado antes supabase-permisos.sql (usa la función es_admin).

begin;

do $$
begin
  if to_regprocedure('public.es_admin()') is null then
    raise exception 'Primero ejecutá supabase-permisos.sql (falta la función es_admin). No se cambió nada.';
  end if;
end $$;

create table if not exists public.registro_uso (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  email       text not null check (email = lower(email)),
  herramienta text not null,
  accion      text not null,
  detalle     jsonb
);

create index if not exists registro_uso_fecha_idx on public.registro_uso (created_at desc);
create index if not exists registro_uso_email_idx on public.registro_uso (email, created_at desc);

grant select, insert on public.registro_uso to authenticated;
revoke all on public.registro_uso from anon;
alter table public.registro_uso enable row level security;

-- Cada persona solo puede anotar usos a su nombre
drop policy if exists "registro_uso_anotar" on public.registro_uso;
create policy "registro_uso_anotar" on public.registro_uso
  for insert to authenticated
  with check (email = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Solo los administradores leen el registro
drop policy if exists "registro_uso_leer" on public.registro_uso;
create policy "registro_uso_leer" on public.registro_uso
  for select to authenticated
  using (public.es_admin());

commit;
