-- Private storage for job applicants' CVs.
--
-- Applications arrive from the public careers page, so the files are personal
-- data belonging to people who are not clients and have no account. They cannot
-- live in `website-assets`, which is public and image-only, and they do not
-- belong in `client-documents`, whose policies key on a client id the applicant
-- does not have.
--
-- The bucket is private: the API writes with the service role and hands out
-- short-lived signed URLs, so no anonymous read policy is needed.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  (
    'career-applications',
    'career-applications',
    false,
    5242880,
    '{"application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}'
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Recruiting staff may read a CV. Nobody signed in may write one: applications
-- come through the public endpoint, which uses the service role.
drop policy if exists "career_applications_read" on storage.objects;
create policy "career_applications_read" on storage.objects for select to authenticated
  using (bucket_id = 'career-applications' and public.is_staff());

drop policy if exists "career_applications_delete" on storage.objects;
create policy "career_applications_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'career-applications' and public.is_admin());
