# Expert Planner

MVP voor het plannen van klantbezoeken en efficiënte routes voor experts.

## Fase 1 starten

1. Maak een nieuw Supabase-project en schakel Email/Password in onder Authentication.
2. Voer `supabase/migrations/202609150001_initial_schema.sql` uit in de Supabase SQL Editor.
3. Kopieer `.env.example` naar `.env.local` en vul de twee Supabase-waarden in.
4. Installeer de pakketten met `pnpm install` en start met `pnpm dev`.

Na het aanmaken van het eerste account, kent u dat account eenmalig de rol administrator toe in de SQL Editor:
`update public.users set role = 'administrator' where id = '<uw-auth-user-id>';`

Geen echte klantinformatie of API-sleutels in de repository opslaan.
