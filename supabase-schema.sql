-- ============================================================
-- FamilyFlow — Schema SQL
-- Ejecuta este script en Supabase > SQL Editor > New Query
-- ============================================================

-- 1. Perfiles de usuario (extensión de auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null,
  avatar_color text default '#2D6A4F',
  created_at timestamptz default now()
);

-- 2. Categorías (predefinidas + personalizadas por familia)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid,                        -- null = global/predefinida
  name text not null,
  icon text not null default '📦',
  color text not null default '#ADB5BD',
  type text not null check (type in ('income','expense')),
  is_custom boolean default false,
  sort_order int default 99,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 3. Familias (grupo compartido entre usuarios)
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Mi familia',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 4. Miembros de familia
create table if not exists public.family_members (
  family_id uuid references public.families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member',
  joined_at timestamptz default now(),
  primary key (family_id, user_id)
);

-- 5. Transacciones
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  type text not null check (type in ('income','expense')),
  amount numeric(12,2) not null check (amount > 0),
  category_id uuid references public.categories(id),
  description text,
  date date not null default current_date,
  has_receipt boolean default false,
  notes text,
  is_recurring boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. Presupuestos mensuales por categoría
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null,
  category_id uuid references public.categories(id) not null,
  month text not null,   -- formato YYYY-MM
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz default now(),
  unique (family_id, category_id, month)
);

-- ── RLS (Row Level Security) ──────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

-- Profiles: cada usuario ve/edita solo el suyo
create policy "profiles_self" on public.profiles for all using (auth.uid() = id);

-- Categories: ve las globales (family_id IS NULL) y las de su familia
create policy "categories_read" on public.categories for select
  using (family_id is null or family_id in (
    select family_id from public.family_members where user_id = auth.uid()
  ));
create policy "categories_write" on public.categories for insert
  with check (created_by = auth.uid());
create policy "categories_update" on public.categories for update
  using (created_by = auth.uid());
create policy "categories_delete" on public.categories for delete
  using (created_by = auth.uid());

-- Families
create policy "families_read" on public.families for select
  using (id in (select family_id from public.family_members where user_id = auth.uid()));
create policy "families_insert" on public.families for insert
  with check (created_by = auth.uid());

-- Family members
create policy "members_read" on public.family_members for select
  using (family_id in (select family_id from public.family_members where user_id = auth.uid()));
create policy "members_insert" on public.family_members for insert
  with check (user_id = auth.uid() or family_id in (
    select family_id from public.family_members where user_id = auth.uid()
  ));

-- Transactions: solo miembros de la misma familia
create policy "transactions_family" on public.transactions for all
  using (family_id in (
    select family_id from public.family_members where user_id = auth.uid()
  ));

-- Budgets: solo miembros de la misma familia
create policy "budgets_family" on public.budgets for all
  using (family_id in (
    select family_id from public.family_members where user_id = auth.uid()
  ));

-- ── Trigger: updated_at en transactions ──────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ── Trigger: auto-crear perfil al registrarse ─────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Datos iniciales: categorías globales predefinidas ─────────────────────────
insert into public.categories (name, icon, color, type, sort_order) values
  ('Salario',        '💼', '#2D6A4F', 'income',  1),
  ('Freelance',      '💻', '#40916C', 'income',  2),
  ('Otros ingresos', '💰', '#52B788', 'income',  3),
  ('Vivienda',       '🏠', '#E07A5F', 'expense', 1),
  ('Alimentación',   '🛒', '#F2CC8F', 'expense', 2),
  ('Transporte',     '🚗', '#81B29A', 'expense', 3),
  ('Salud',          '🏥', '#B5838D', 'expense', 4),
  ('Educación',      '📚', '#6B4226', 'expense', 5),
  ('Ocio',           '🎭', '#F4A261', 'expense', 6),
  ('Ropa',           '👕', '#9B5DE5', 'expense', 7),
  ('Suministros',    '💡', '#00BBF9', 'expense', 8),
  ('Restaurantes',   '🍽️', '#E9C46A', 'expense', 9),
  ('Mascotas',       '🐾', '#A8C5A0', 'expense', 10),
  ('Otros',          '📦', '#ADB5BD', 'expense', 99)
on conflict do nothing;
