-- Catalogue cum Order Book — run this whole file in Supabase > SQL Editor.
-- Safe to run again: it only adds what is missing.
-- All tables start with "cob_" so this can sit safely inside an existing Supabase project.

create extension if not exists pgcrypto;

create table if not exists cob_businesses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  logo_url text,
  contact_person text,
  contact_number text,
  address text,
  description text,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists cob_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references cob_businesses(id) on delete cascade,
  name text not null,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists cob_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references cob_businesses(id) on delete cascade,
  category_id uuid references cob_categories(id) on delete set null,
  art_no text not null,
  photo_url text,
  colours jsonb not null default '[]'::jsonb, -- e.g. [{"type":"swatch","value":"#1a2b3c"},{"type":"photo","value":"https://..."}]
  price_type text not null default 'WSP',     -- 'WSP' or 'MRP'
  sizes jsonb not null default '[]'::jsonb,   -- e.g. [{"size":"S","wsp":250,"mrp":499}]
  in_stock boolean not null default true,
  created_at timestamptz not null default now()
);

-- Update 2 (colours, price type) for databases created earlier
alter table cob_businesses add column if not exists description text;
alter table cob_products add column if not exists colours jsonb not null default '[]'::jsonb;
alter table cob_products add column if not exists price_type text not null default 'WSP';

-- Update 3 (Brand Page, WSP and MRP per product)
alter table cob_businesses add column if not exists whatsapp text;
alter table cob_businesses add column if not exists instagram text;
alter table cob_businesses add column if not exists facebook text;
alter table cob_businesses add column if not exists youtube text;
alter table cob_businesses add column if not exists about_brand text;
alter table cob_businesses add column if not exists about_company text;
alter table cob_products add column if not exists use_wsp boolean not null default true;
alter table cob_products add column if not exists use_mrp boolean not null default false;

-- Update 4 (GST slabs per brand)
-- Update 5 (size lists per brand; empty = default 0-38 and XS-6XL)
alter table cob_businesses add column if not exists size_groups jsonb;

alter table cob_businesses add column if not exists gst_slabs jsonb not null default '[{"upto":2500,"pct":5},{"upto":null,"pct":18}]'::jsonb;

create index if not exists cob_categories_business_idx on cob_categories(business_id);
create index if not exists cob_products_business_idx on cob_products(business_id);

-- Lock the tables: only the app's server (secret key) can read/write them
alter table cob_businesses enable row level security;
alter table cob_categories enable row level security;
alter table cob_products enable row level security;

-- Public storage folder for logos and product photos
insert into storage.buckets (id, name, public)
values ('cob-images', 'cob-images', true)
on conflict (id) do nothing;
