-- Auth and profile columns for users table
alter table users add column if not exists password_hash text;
alter table users add column if not exists school text;
alter table users add column if not exists graduation_year int;
alter table users add column if not exists major text;
alter table users add column if not exists career_interests jsonb default '[]';
alter table users add column if not exists user_current_role text;
alter table users add column if not exists networking_goals text;
alter table users add column if not exists personal_interests jsonb default '[]';
alter table users add column if not exists skills jsonb default '[]';
alter table users add column if not exists onboarding_completed boolean default false;
alter table users add column if not exists profile_summary text;
