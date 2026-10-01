import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtDate } from "@/components/format";
import { ImagingView, imagingTitle } from "@/components/imaging-view";
import { PageHeader } from "@/components/ui";
import type { StoredImaging } from "@/lib/llm/imaging";
import { requireParticipant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Informe de imágenes" };

export default async function ImagingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { participant: p } = await requireParticipant();
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("lab_documents")
    .select("id, kind, imaging, sampled_on, lab_name")
    .eq("id", id)
    .eq("participant_id", p.id)
    .maybeSingle();
  if (!doc || doc.kind !== "imaging" || !doc.imaging) notFound();
  const imaging = doc.imaging as StoredImaging;

  return (
    <>
      <PageHeader
        title={imagingTitle(imaging)}
        subtitle={
          <>
            <Link href="/app/examenes" className="text-accent">
              ← Exámenes
            </Link>
            {` · ${fmtDate(doc.sampled_on)}${doc.lab_name ? ` · ${doc.lab_name}` : ""} · `}
            <a href={`/app/examenes/${doc.id}/pdf`} target="_blank" rel="noopener" className="text-accent">
              Ver PDF
            </a>
          </>
        }
      />
      <ImagingView imaging={imaging} />
    </>
  );
}
