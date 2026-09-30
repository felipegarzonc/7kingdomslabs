import { NextResponse } from "next/server";
import { logAdminAccess } from "@/lib/audit";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const v = await getViewer();
  if (!v?.isAdmin) return new NextResponse("No autorizado", { status: 403 });
  const supabase = await createClient();
  const { data: doc } = await supabase.from("lab_documents").select("storage_path, participant_id").eq("id", id).maybeSingle();
  if (!doc) return new NextResponse("No encontrado", { status: 404 });
  await logAdminAccess(supabase, v.userId, "view_lab_pdf", doc.participant_id, { document_id: id });
  const { data, error } = await supabase.storage.from("lab-pdfs").createSignedUrl(doc.storage_path, 120);
  if (error || !data) return new NextResponse("No disponible", { status: 404 });
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
