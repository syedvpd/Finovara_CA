-- Immutable, staff-authored timeline entries for client communication.
create table public.communication_logs (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.clients(id) on delete cascade,
    created_by uuid not null references public.users(id) on delete restrict,
    communication_type varchar(20) not null check (communication_type in ('call', 'email', 'handoff')),
    direction varchar(20) not null check (direction in ('inbound', 'outbound', 'internal')),
    subject varchar(200) not null,
    body text not null,
    created_at timestamptz not null default now(),
    check (
      (communication_type = 'handoff' and direction = 'internal') or
      (communication_type in ('call', 'email') and direction in ('inbound', 'outbound'))
    )
);

create index idx_communication_logs_client_created
    on public.communication_logs(client_id, created_at desc);
create index idx_communication_logs_type_created
    on public.communication_logs(communication_type, created_at desc);

alter table public.communication_logs enable row level security;
create policy "staff_read_communication_logs" on public.communication_logs for select to authenticated
    using (public.is_staff() and public.can_access_client(client_id));
create policy "staff_create_communication_logs" on public.communication_logs for insert to authenticated
    with check (public.is_staff() and public.can_access_client(client_id) and created_by = auth.uid());

create trigger trg_communication_logs_audit after insert on public.communication_logs
    for each row execute procedure public.log_activity_event();
