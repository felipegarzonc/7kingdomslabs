export const DOC_STATUS: Record<string, { label: string; tone: "neutral" | "good" | "warn" | "info" | "danger" }> = {
  uploaded: { label: "Recibido", tone: "neutral" },
  extracting: { label: "Transcribiendo", tone: "info" },
  extracted: { label: "En revisión", tone: "info" },
  reviewed: { label: "Revisado", tone: "good" },
  failed: { label: "En revisión manual", tone: "warn" },
};
