import { NextResponse } from "next/server";
import { exportParticipantData } from "@/lib/account";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const v = await getViewer();
  if (!v?.participant) return new NextResponse("No autorizado", { status: 401 });
  const supabase = await createClient();
  const data = await exportParticipantData(supabase, v.participant.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="bombadil-mis-datos-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
