-- Private bucket for lab PDFs. Paths: {participant_id}/{uuid}.pdf
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lab-pdfs', 'lab-pdfs', false, 15728640, array['application/pdf'])
on conflict (id) do nothing;

create policy lab_pdfs_insert_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lab-pdfs'
    and (storage.foldername(name))[1] = public.current_participant_id()::text
    and public.is_active_participant()
  );

create policy lab_pdfs_read on storage.objects for select to authenticated
  using (
    bucket_id = 'lab-pdfs'
    and ((storage.foldername(name))[1] = public.current_participant_id()::text or public.is_admin())
  );

create policy lab_pdfs_admin_all on storage.objects for all to authenticated
  using (bucket_id = 'lab-pdfs' and public.is_admin())
  with check (bucket_id = 'lab-pdfs' and public.is_admin());
