-- Imaging reports (MRI, ultrasound, X-ray, CT) are uploaded like lab PDFs and
-- interpreted into plain language instead of being transcribed into values.
alter table public.lab_documents
  add column kind text not null default 'lab' check (kind in ('lab', 'imaging')),
  -- {modality, body_region, study_date, summary, findings[], impression, questions_for_doctor[], prompt_version, model}
  add column imaging jsonb;
