import { NextResponse } from "next/server";
import { exportParticipantData } from "@/lib/account";
import { logAdminAccess } from "@/lib/audit";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const v = await getViewer();
  if (!v?.isAdmin) return new NextResponse("No autorizado", { status: 403 });
  const supabase = await createClient();
  await logAdminAccess(supabase, v.userId, "export_participant", id);
  const data = await exportParticipantData(supabase, id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="bombadil-${id.slice(0, 8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
