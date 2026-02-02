create table public.posts (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  title text null,
  content text null,
  created_at timestamp with time zone null default now(),
  constraint posts_pkey primary key (id),
  constraint posts_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;