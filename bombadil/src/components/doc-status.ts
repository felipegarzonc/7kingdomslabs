export const DOC_STATUS: Record<string, { label: string; tone: "neutral" | "good" | "warn" | "info" | "danger" }> = {
  uploaded: { label: "Recibido", tone: "neutral" },
  extracting: { label: "Transcribiendo", tone: "info" },
  extracted: { label: "Revisión manual pendiente", tone: "warn" },
  reviewed: { label: "Analizado", tone: "good" },
  failed: { label: "En revisión manual", tone: "warn" },
};
