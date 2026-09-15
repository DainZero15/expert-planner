-- Tijdelijke MVP-toegang voor ingelogde planners. Verfijnen we vóór brede uitrol per rol.
grant select, insert, update, delete on table public.experts to authenticated;
create policy "authenticated users can view experts" on public.experts for select to authenticated using (true);
create policy "authenticated users can add experts" on public.experts for insert to authenticated with check (true);
