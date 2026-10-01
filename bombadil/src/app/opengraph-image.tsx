import { ImageResponse } from "next/og";

export const alt = "Bombadil: entiende tus exámenes y mejora tu salud, un hábito a la vez";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Preview card for WhatsApp, LinkedIn and search results. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#2457a6", padding: 72, color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "#e3b23c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, fontWeight: 800, color: "#1b2433" }}>B</div>
          <div style={{ fontSize: 44, fontWeight: 800 }}>Bombadil</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.08, maxWidth: 1000 }}>Entiende tus exámenes y mejora tu salud, un hábito a la vez.</div>
          <div style={{ fontSize: 30, color: "rgba(255,255,255,0.85)" }}>Colesterol, glucosa, triglicéridos e hígado en palabras simples · Colombia</div>
        </div>
        <div style={{ display: "flex", height: 14, width: 320, borderRadius: 7, background: "#e3b23c" }} />
      </div>
    ),
    size,
  );
}
