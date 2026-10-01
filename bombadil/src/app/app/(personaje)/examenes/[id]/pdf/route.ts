import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Short-lived signed URL; RLS on lab_documents and storage decides access. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("lab_documents").select("storage_path").eq("id", id).maybeSingle();
  if (!doc) return new NextResponse("No encontrado", { status: 404 });
  const { data, error } = await supabase.storage.from("lab-pdfs").createSignedUrl(doc.storage_path, 60);
  if (error || !data) return new NextResponse("No disponible", { status: 404 });
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
