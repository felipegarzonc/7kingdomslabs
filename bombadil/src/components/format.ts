export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" }) : "—";
export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" }) : "—";
export const fmtNum = (n: number | null | undefined, digits = 1) => (n === null || n === undefined ? "—" : n.toLocaleString("es-CO", { maximumFractionDigits: digits }));
export const fmtCop = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }));
/** YYYY-MM-DDTHH:mm in Bogotá time, for datetime-local inputs. */
export const nowLocalBogota = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 16);
