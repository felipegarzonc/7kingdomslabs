import { useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LEVELS = ["IC", "Senior / Lead", "Manager", "Director+"];

const CONCERN_PRESETS = [
  { id: "comp",     label: "Comp feels low",      icon: "💰" },
  { id: "benefits", label: "Benefits unclear",     icon: "🏥" },
  { id: "growth",   label: "No growth path",       icon: "📈" },
  { id: "remote",   label: "Flexibility concerns", icon: "🌍" },
  { id: "startup",  label: "Comparing to startup", icon: "⚡" },
  { id: "offer",    label: "Competing offer",      icon: "🤝" },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  mono:  { fontFamily: "monospace" },
  label: { display: "block", fontFamily: "monospace", fontSize: 10, letterSpacing: "0.15em", color: "#b49a60", textTransform: "uppercase", marginBottom: 7 },
  input: { width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 2, padding: "11px 14px", color: "#e8e4dc", fontSize: 14, fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box" },
  card:  { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 2 },
  gold:  { color: "#b49a60" },
  muted: { color: "#8a8278" },
  dim:   { color: "#5a5650" },
};

function fmt(n) {
  if (!n || isNaN(n)) return "—";
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n)}`;
}

function fmtFull(n) {
  if (!n || isNaN(n)) return "—";
  return `$${Number(n).toLocaleString()}`;
}

// ─── Scarcity logic ───────────────────────────────────────────────────────────

const SCARCITY_MAP = {
  "machine learning": "red", "ml engineer": "red", "ai engineer": "red", "llm": "red",
  "quantum": "red", "vlsi": "red", "chip design": "red", "embedded": "red", "firmware": "red",
  "cybersecurity": "red", "security engineer": "red", "security researcher": "red",
  "principal engineer": "red", "staff engineer": "red", "distinguished": "red",
  "cloud architect": "red", "solutions architect": "red",
  "data scientist": "red", "research scientist": "red",
  "full stack": "red", "fullstack": "red",
  "devops": "red", "sre": "red", "site reliability": "red", "platform engineer": "red",
  "cto": "red", "vp engineering": "red", "ciso": "red",
  "software engineer": "yellow", "software developer": "yellow",
  "backend": "yellow", "frontend": "yellow",
  "mobile developer": "yellow", "ios": "yellow", "android": "yellow",
  "product manager": "yellow", "product owner": "yellow",
  "data engineer": "yellow", "analytics engineer": "yellow",
  "ux": "yellow", "ui designer": "yellow",
  "tech lead": "yellow", "technical lead": "yellow", "engineering manager": "yellow",
  "hrbp": "yellow", "hr business partner": "yellow",
  "talent acquisition": "yellow", "recruiter": "yellow",
  "compensation": "yellow", "total rewards": "yellow",
  "finance manager": "yellow", "fp&a": "yellow",
  "project manager": "green", "program manager": "green",
  "business analyst": "green", "systems analyst": "green",
  "customer success": "green", "account manager": "green",
  "marketing": "green", "content": "green",
  "hr coordinator": "green", "hr generalist": "green",
  "operations": "green", "administrative": "green",
  "support": "green", "help desk": "green",
  "qa": "green", "quality assurance": "green",
};

const SCARCITY_CFG = {
  red:    { label: "Critical Scarcity",  dot: "#ef4444", urgency: "high",   ttf: "60–90 days", competition: "Very high — candidates hold multiple offers simultaneously." },
  yellow: { label: "High Demand",        dot: "#f59e0b", urgency: "medium", ttf: "30–60 days", competition: "Active market — strong candidates are off the market within 2–3 weeks." },
  green:  { label: "Broad Pool",         dot: "#22c55e", urgency: "low",    ttf: "15–30 days", competition: "Good availability — quality still requires a compelling offer story." },
};

const URGENCY_CFG = {
  high:   { label: "Move in 48–72h",     color: "#ef4444", bg: "rgba(239,68,68,0.06)",   border: "rgba(239,68,68,0.2)",   advice: "Don't wait for a perfect interview. Compress your process. A strong candidate at red-level scarcity won't sit idle." },
  medium: { label: "Act within the week", color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.2)", advice: "Keep momentum. Schedule next steps before ending each call. Silence reads as disinterest to high-demand candidates." },
  low:    { label: "Standard pace OK",   color: "#22c55e", bg: "rgba(34,197,94,0.06)",   border: "rgba(34,197,94,0.2)",   advice: "You have flexibility, but a sharp total rewards story still differentiates you from commodity offers." },
};

function getScarcity(role) {
  if (!role || role.length < 2) return null;
  const lower = role.toLowerCase();
  for (const [key, val] of Object.entries(SCARCITY_MAP)) {
    if (lower.includes(key)) return val;
  }
  if (lower.includes("senior") || lower.includes("principal") || lower.includes("lead")) return "yellow";
  return "green";
}

// ─── Band visualization ───────────────────────────────────────────────────────

function compaStatus(r) {
  if (r < 0.80) return { text: "Below Range",    color: "#ef4444" };
  if (r < 0.90) return { text: "Entry Zone",     color: "#f59e0b" };
  if (r < 1.00) return { text: "Developing",     color: "#c8b44a" };
  if (r < 1.05) return { text: "Market Rate",    color: "#22c55e" };
  if (r < 1.15) return { text: "Above Midpoint", color: "#60a0b4" };
  return              { text: "Top of Band",      color: "#9060c8" };
}

function BandViz({ bandMin, bandMax, offer, setOffer, candidateAsk }) {
  const mid      = (bandMin + bandMax) / 2;
  const bw       = bandMax - bandMin;
  const offerPct = Math.max(2, Math.min(98, ((offer - bandMin) / bw) * 100));
  const askPct   = candidateAsk > 0 ? Math.max(0, Math.min(100, ((candidateAsk - bandMin) / bw) * 100)) : null;
  const ratio    = offer / mid;
  const status   = compaStatus(ratio);
  const gap      = candidateAsk > 0 ? candidateAsk - offer : null;
  const sMin     = Math.round(bandMin * 0.75);
  const sMax     = Math.round(bandMax * 1.25);

  return (
    <div>
      {/* Band bar */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontFamily: "monospace", fontSize: 10, color: "#4a4840" }}>{fmt(bandMin)}</span>
          <span style={{ fontFamily: "monospace", fontSize: 10, color: "#6a6258" }}>Mid {fmt(mid)}</span>
          <span style={{ fontFamily: "monospace", fontSize: 10, color: "#4a4840" }}>{fmt(bandMax)}</span>
        </div>

        <div style={{ position: "relative", height: 44 }}>
          {/* Zones */}
          <div style={{ position: "absolute", inset: "0 0 8px 0", display: "flex", borderRadius: 2, overflow: "hidden" }}>
            {[
              { l: "P10–P33", bg: "rgba(239,68,68,0.10)" },
              { l: "P33–P66", bg: "rgba(34,197,94,0.09)" },
              { l: "P66–P90", bg: "rgba(96,160,180,0.09)" },
            ].map(z => (
              <div key={z.l} style={{ flex: 1, background: z.bg, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 2 }}>
                <span style={{ fontFamily: "monospace", fontSize: 7, color: "#2a2820", letterSpacing: "0.06em" }}>{z.l}</span>
              </div>
            ))}
          </div>
          {/* Mid line */}
          <div style={{ position: "absolute", left: "50%", top: 0, height: 36, width: 1, background: "rgba(255,255,255,0.08)" }} />
          {/* Ask marker */}
          {askPct !== null && (
            <div style={{ position: "absolute", left: `${askPct}%`, top: 0, transform: "translateX(-50%)", zIndex: 2 }}>
              <div style={{ width: 2, height: 36, background: "#ef4444", opacity: 0.7 }} />
              <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", fontFamily: "monospace", fontSize: 8, color: "#ef4444", whiteSpace: "nowrap" }}>ASK</div>
            </div>
          )}
          {/* Offer marker */}
          <div style={{ position: "absolute", left: `${offerPct}%`, top: 0, transform: "translateX(-50%)", zIndex: 3 }}>
            <div style={{ width: 3, height: 36, background: "#b49a60" }} />
            <div style={{ position: "absolute", top: -15, left: "50%", transform: "translateX(-50%)", background: "#b49a60", color: "#0a0a0f", fontFamily: "monospace", fontSize: 8, padding: "1px 6px", whiteSpace: "nowrap", fontWeight: 700, borderRadius: 1 }}>{fmt(offer)}</div>
          </div>
        </div>

        <input type="range" min={sMin} max={sMax} value={offer}
          onChange={e => setOffer(Number(e.target.value))}
          style={{ width: "100%", marginTop: 2 }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "monospace", fontSize: 8, color: "#2a2820" }}>{fmt(sMin)}</span>
          <span style={{ fontFamily: "monospace", fontSize: 8, color: "#2a2820" }}>{fmt(sMax)}</span>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
        {[
          { l: "Compa-Ratio",   v: `${(ratio * 100).toFixed(1)}%`, sub: status.text, color: status.color },
          { l: "Band Position", v: `${((offer - bandMin) / bw * 100).toFixed(0)}th pct`, sub: offer < mid ? "Below mid" : "Above mid", color: "#e8e4dc" },
          { l: "vs Ask",        v: gap === null ? "—" : gap > 0 ? `+${fmt(gap)}` : gap === 0 ? "Matched" : fmt(gap), sub: gap === null ? "No ask set" : gap > 0 ? "Gap to close" : "Offer ≥ ask", color: gap === null ? "#5a5650" : gap > 0 ? "#f59e0b" : "#22c55e" },
        ].map(m => (
          <div key={m.l} style={{ ...S.card, padding: "10px 12px" }}>
            <div style={{ fontFamily: "monospace", fontSize: 8, color: "#5a5650", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{m.l}</div>
            <div style={{ fontSize: 17, color: m.color, marginBottom: 1 }}>{m.v}</div>
            <div style={{ fontFamily: "monospace", fontSize: 9, color: "#5a5650" }}>{m.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  // Inputs
  const [role,          setRole]          = useState("");
  const [level,         setLevel]         = useState("");

  // Intelligence state
  const [intel,         setIntel]         = useState(null);
  const [loadingIntel,  setLoadingIntel]  = useState(false);
  const [intelError,    setIntelError]    = useState(null);

  // Band interaction
  const [offer,         setOffer]         = useState(0);
  const [candidateAsk,  setCandidateAsk]  = useState("");
  const [showAsk,       setShowAsk]       = useState(false);

  // Pitch
  const [concern,       setConcern]       = useState("");
  const [customConcern, setCustomConcern] = useState("");
  const [pitch,         setPitch]         = useState(null);
  const [loadingPitch,  setLoadingPitch]  = useState(false);
  const [pitchTab,      setPitchTab]      = useState("script");
  const [copied,        setCopied]        = useState(false);

  const scarcity     = getScarcity(role);
  const scarcityCfg  = scarcity ? SCARCITY_CFG[scarcity] : null;
  const urgencyCfg   = scarcityCfg ? URGENCY_CFG[scarcityCfg.urgency] : null;

  const canLoadIntel = role.trim().length > 2 && level;
  const activeConcern = concern === "custom" ? customConcern : CONCERN_PRESETS.find(c => c.id === concern)?.label || "";
  const canPitch = !!intel && activeConcern.trim().length > 2;

  // ── Load full market intelligence ──────────────────────────────────────────

  const loadIntel = async () => {
    if (!canLoadIntel || loadingIntel) return;
    setLoadingIntel(true);
    setIntel(null);
    setIntelError(null);
    setPitch(null);
    setConcern("");

    const prompt = `You are a senior Total Rewards and talent market specialist. Given a role and seniority level, return a complete compensation and market intelligence brief.

Role: ${role}
Level: ${level}

Return ONLY valid JSON with no markdown, no text outside the object:
{
  "band_min": <integer USD annual base salary, P10 market>,
  "band_max": <integer USD annual base salary, P90 market>,
  "band_midpoint": <integer, P50>,
  "p25": <integer, P25>,
  "p75": <integer, P75>,

  "total_comp_components": [
    {
      "name": "component name (e.g. Annual Bonus, Equity / RSU, Health Insurance, PTO, Learning Budget, Remote Work, etc.)",
      "typical_value": "short description or dollar range (e.g. '10–15% of base', '4 weeks', '$2,000/yr')",
      "pitch_note": "one sentence on how a recruiter should mention this to maximize appeal"
    }
  ],

  "market_context": "2–3 sentences on current demand, supply, and hiring dynamics for this role at this level. Be specific and current.",

  "top_competitors": ["3 to 5 companies actively hiring this profile right now"],

  "candidate_priorities": ["3 to 4 things candidates at this level typically care most about beyond base salary"],

  "negotiation_watch": "One sentence: the most common sticking point when closing this role at this level"
}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 1800,
          system: "You are a senior Total Rewards and compensation intelligence specialist. Return only valid JSON as instructed.",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data  = await res.json();
      const raw   = (data.content?.find(b => b.type === "text")?.text || "").trim();
      const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(clean);
      setIntel(parsed);
      setOffer(parsed.band_midpoint || Math.round((parsed.band_min + parsed.band_max) / 2));
    } catch (err) {
      setIntelError(`Could not load market data. ${err.message}`);
    }
    setLoadingIntel(false);
  };

  // ── Generate pitch ─────────────────────────────────────────────────────────

  const generatePitch = async () => {
    if (!canPitch || loadingPitch) return;
    setLoadingPitch(true);
    setPitch(null);

    const context = intel ? `
Salary band: ${fmtFull(intel.band_min)} – ${fmtFull(intel.band_max)} (mid: ${fmtFull(intel.band_midpoint)})
Key offer components: ${intel.total_comp_components?.map(c => c.name).join(", ")}
Candidate priorities: ${intel.candidate_priorities?.join(", ")}
Market context: ${intel.market_context}` : "";

    const prompt = `You are a Total Rewards strategist coaching a recruiter to close a strong candidate.

Role: ${role}
Level: ${level}
Candidate concern: "${activeConcern}"
${context}

Return ONLY valid JSON, no markdown:
{
  "headline": "One punchy reframe of the concern as a strength — max 15 words",
  "script": "Two or three short paragraphs. Conversational. Something a recruiter can say out loud. Address the concern head-on, then zoom to the full TR picture.",
  "proof_points": ["3–5 short, specific, quotable TR proof points tailored to this role and concern"],
  "objection_handler": "One sentence for when the candidate still pushes back",
  "closing_hook": "One forward-moving question to end on"
}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 1000,
          system: "You are a Total Rewards strategist. Return only valid JSON as instructed.",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data  = await res.json();
      const raw   = (data.content?.find(b => b.type === "text")?.text || "").trim();
      const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      setPitch(JSON.parse(clean));
      setPitchTab("script");
    } catch (err) {
      setPitch({ error: `Could not generate pitch. ${err.message}` });
    }
    setLoadingPitch(false);
  };

  const copyPitch = () => {
    if (!pitch || pitch.error) return;
    const text = [
      pitch.headline, "",
      pitch.script, "",
      "Proof points:",
      ...(pitch.proof_points || []).map(p => `• ${p}`), "",
      `Push back: ${pitch.objection_handler}`,
      `Close: ${pitch.closing_hook}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e8e4dc", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 80% 60% at 15% 10%, rgba(180,140,80,0.06) 0%, transparent 55%), radial-gradient(ellipse 60% 80% at 85% 90%, rgba(80,120,180,0.04) 0%, transparent 55%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 20px 100px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "monospace", color: "#b49a60", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 10 }}>Total Rewards · Talent Attraction Suite</div>
          <h1 style={{ fontSize: "clamp(22px, 3.5vw, 34px)", fontWeight: 400, lineHeight: 1.1, margin: "0 0 8px", letterSpacing: "-0.02em" }}>TA Intelligence Kit</h1>
          <p style={{ fontFamily: "monospace", color: "#8a8278", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
            Enter a role and level. Get the full market picture — band, components, scarcity, urgency — then generate a tailored TR pitch.
          </p>
        </div>

        {/* ── Step 1: Role + Level ─────────────────────────────────────────── */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 2, padding: "24px", marginBottom: 16 }}>
          <div style={{ fontFamily: "monospace", color: "#b49a60", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16 }}>Step 1 — Define the Role</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={S.label}>Role Title</label>
              <input value={role} onChange={e => setRole(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
                style={S.input}
                onFocus={e => e.target.style.borderColor = "rgba(180,154,96,0.5)"}
                onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                onKeyDown={e => e.key === "Enter" && canLoadIntel && loadIntel()} />
            </div>
            <div>
              <label style={S.label}>Seniority Level</label>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {ROLE_LEVELS.map(l => (
                  <button key={l} onClick={() => setLevel(l)}
                    style={{ padding: "9px 14px", border: `1px solid ${level === l ? "rgba(180,154,96,0.6)" : "rgba(255,255,255,0.08)"}`, background: level === l ? "rgba(180,154,96,0.1)" : "transparent", color: level === l ? "#b49a60" : "#8a8278", borderRadius: 2, cursor: "pointer", fontSize: 12, fontFamily: "monospace", transition: "all 0.12s" }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live alerts before loading */}
          {role.length > 2 && scarcityCfg && urgencyCfg && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {/* Scarcity */}
              <div style={{ display: "flex", gap: 10, padding: "11px 13px", background: `rgba(${scarcity === "red" ? "239,68,68" : scarcity === "yellow" ? "245,158,11" : "34,197,94"},0.05)`, border: `1px solid ${scarcityCfg.dot}22`, borderLeft: `3px solid ${scarcityCfg.dot}`, borderRadius: 2 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: scarcityCfg.dot, flexShrink: 0, marginTop: 3, boxShadow: `0 0 6px ${scarcityCfg.dot}99` }} />
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: 9, color: scarcityCfg.dot, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>Talent Scarcity · {scarcityCfg.label}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 10, color: "#7a7268", lineHeight: 1.5 }}>{scarcityCfg.competition}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 10, color: "#5a5650", marginTop: 3 }}>Est. TTF: {scarcityCfg.ttf}</div>
                </div>
              </div>
              {/* Urgency */}
              <div style={{ display: "flex", gap: 10, padding: "11px 13px", background: urgencyCfg.bg, border: `1px solid ${urgencyCfg.border}`, borderLeft: `3px solid ${urgencyCfg.color}`, borderRadius: 2 }}>
                <div style={{ width: 8, height: 8, borderRadius: 1, background: urgencyCfg.color, flexShrink: 0, marginTop: 3, boxShadow: `0 0 6px ${urgencyCfg.color}88` }} />
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: 9, color: urgencyCfg.color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>Req. Urgency · {urgencyCfg.label}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 10, color: "#7a7268", lineHeight: 1.5 }}>{urgencyCfg.advice}</div>
                </div>
              </div>
            </div>
          )}

          <button onClick={loadIntel} disabled={!canLoadIntel || loadingIntel}
            style={{ width: "100%", padding: "13px", background: canLoadIntel && !loadingIntel ? "#b49a60" : "rgba(255,255,255,0.04)", border: "none", borderRadius: 2, color: canLoadIntel && !loadingIntel ? "#0a0a0f" : "#333", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "monospace", cursor: canLoadIntel && !loadingIntel ? "pointer" : "not-allowed", fontWeight: 700, transition: "all 0.18s" }}>
            {loadingIntel ? "Loading market intelligence..." : "Load Full Market Profile →"}
          </button>

          {loadingIntel && (
            <div style={{ textAlign: "center", padding: "20px 0 4px", fontFamily: "monospace", color: "#8a8278", fontSize: 11 }}>
              <div style={{ marginBottom: 7 }}>Pulling band, components, and market context for {role} · {level}...</div>
              <div style={{ width: 32, height: 2, background: "linear-gradient(90deg, transparent, #b49a60, transparent)", margin: "0 auto", animation: "slide 1.2s ease-in-out infinite" }} />
            </div>
          )}
          {intelError && <div style={{ fontFamily: "monospace", color: "#c06060", fontSize: 11, marginTop: 10, padding: "10px 13px", background: "rgba(192,96,96,0.05)", border: "1px solid rgba(192,96,96,0.15)", borderRadius: 2 }}>{intelError}</div>}
        </div>

        {/* ── Step 2: Market Profile ───────────────────────────────────────── */}
        {intel && (
          <>
            {/* Band + Offer Components in one row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>

              {/* Salary Band */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 2, padding: "20px" }}>
                <div style={{ fontFamily: "monospace", color: "#b49a60", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 14 }}>Salary Band — {role} · {level}</div>

                {/* Percentile scale */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6, marginBottom: 16 }}>
                  {[
                    { p: "P10", v: intel.band_min },
                    { p: "P25", v: intel.p25 },
                    { p: "P50", v: intel.band_midpoint, hi: true },
                    { p: "P75", v: intel.p75 },
                    { p: "P90", v: intel.band_max },
                  ].map(({ p, v, hi }) => (
                    <div key={p} style={{ textAlign: "center", padding: "8px 4px", background: hi ? "rgba(180,154,96,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${hi ? "rgba(180,154,96,0.25)" : "rgba(255,255,255,0.05)"}`, borderRadius: 2 }}>
                      <div style={{ fontFamily: "monospace", fontSize: 8, color: hi ? "#b49a60" : "#5a5650", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{p}</div>
                      <div style={{ fontFamily: "monospace", fontSize: 12, color: hi ? "#b49a60" : "#c8c4bc" }}>{fmt(v)}</div>
                    </div>
                  ))}
                </div>

                {/* Candidate ask input */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: showAsk ? 8 : 0 }}>
                    <button onClick={() => setShowAsk(!showAsk)}
                      style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: showAsk ? "#b49a60" : "#5a5650", padding: "4px 10px", borderRadius: 2, cursor: "pointer" }}>
                      {showAsk ? "✓ Ask set" : "+ Candidate Ask"}
                    </button>
                    {showAsk && candidateAsk && (
                      <span style={{ fontFamily: "monospace", fontSize: 10, color: Number(candidateAsk) > offer ? "#f59e0b" : "#22c55e" }}>
                        {Number(candidateAsk) > offer ? `Gap: ${fmt(Number(candidateAsk) - offer)}` : "Offer ≥ ask ✓"}
                      </span>
                    )}
                  </div>
                  {showAsk && (
                    <input type="number" value={candidateAsk} onChange={e => setCandidateAsk(e.target.value)}
                      placeholder="Candidate expected salary"
                      style={{ ...S.input, maxWidth: 220, fontSize: 13 }}
                      onFocus={e => e.target.style.borderColor = "rgba(180,154,96,0.5)"}
                      onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                  )}
                </div>

                <BandViz
                  bandMin={intel.band_min}
                  bandMax={intel.band_max}
                  offer={offer}
                  setOffer={setOffer}
                  candidateAsk={showAsk && candidateAsk ? Number(candidateAsk) : 0}
                />
              </div>

              {/* What you can offer */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 2, padding: "20px" }}>
                <div style={{ fontFamily: "monospace", color: "#b49a60", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 14 }}>What You Can Offer</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(intel.total_comp_components || []).map((comp, i) => (
                    <div key={i} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 2 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                        <span style={{ fontFamily: "monospace", fontSize: 10, color: "#c8c4bc", letterSpacing: "0.04em" }}>{comp.name}</span>
                        <span style={{ fontFamily: "monospace", fontSize: 10, color: "#b49a60", marginLeft: 8, flexShrink: 0 }}>{comp.typical_value}</span>
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: 9, color: "#5a5650", lineHeight: 1.5, fontStyle: "italic" }}>{comp.pitch_note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Market context + candidate priorities + watch */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>

              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 2, padding: "18px" }}>
                <div style={{ fontFamily: "monospace", color: "#b49a60", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>Market Context</div>
                <p style={{ fontFamily: "monospace", fontSize: 11, color: "#8a8278", lineHeight: 1.7, margin: "0 0 12px" }}>{intel.market_context}</p>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#5a5650", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Active competitors</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {(intel.top_competitors || []).map((c, i) => (
                    <span key={i} style={{ fontFamily: "monospace", fontSize: 9, color: "#7a7268", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 1 }}>{c}</span>
                  ))}
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 2, padding: "18px" }}>
                <div style={{ fontFamily: "monospace", color: "#b49a60", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>Candidate Priorities</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(intel.candidate_priorities || []).map((p, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 9, color: "#b49a60", flexShrink: 0, marginTop: 1 }}>{String(i + 1).padStart(2, "0")}</span>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#8a8278", lineHeight: 1.5 }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 2, padding: "18px" }}>
                <div style={{ fontFamily: "monospace", color: "#ef4444", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>Negotiation Watch</div>
                <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)", borderLeft: "3px solid #ef4444", padding: "10px 12px" }}>
                  <p style={{ fontFamily: "monospace", fontSize: 11, color: "#8a8278", lineHeight: 1.7, margin: 0 }}>{intel.negotiation_watch}</p>
                </div>
              </div>
            </div>

            {/* ── Step 3: Pitch Generator ─────────────────────────────────── */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 2, padding: "24px" }}>
              <div style={{ fontFamily: "monospace", color: "#b49a60", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16 }}>Step 2 — Generate TR Pitch</div>

              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>What's the candidate's concern?</label>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
                  {CONCERN_PRESETS.map(c => (
                    <button key={c.id} onClick={() => setConcern(c.id)}
                      style={{ padding: "7px 12px", border: `1px solid ${concern === c.id ? "rgba(180,154,96,0.6)" : "rgba(255,255,255,0.08)"}`, background: concern === c.id ? "rgba(180,154,96,0.1)" : "transparent", color: concern === c.id ? "#b49a60" : "#8a8278", borderRadius: 2, cursor: "pointer", fontSize: 11, fontFamily: "monospace", transition: "all 0.12s", display: "flex", alignItems: "center", gap: 5 }}>
                      <span>{c.icon}</span>{c.label}
                    </button>
                  ))}
                  <button onClick={() => setConcern("custom")}
                    style={{ padding: "7px 12px", border: `1px solid ${concern === "custom" ? "rgba(180,154,96,0.6)" : "rgba(255,255,255,0.08)"}`, background: concern === "custom" ? "rgba(180,154,96,0.1)" : "transparent", color: concern === "custom" ? "#b49a60" : "#8a8278", borderRadius: 2, cursor: "pointer", fontSize: 11, fontFamily: "monospace" }}>
                    ✏️ Custom
                  </button>
                </div>
                {concern === "custom" && (
                  <input value={customConcern} onChange={e => setCustomConcern(e.target.value)}
                    placeholder="Describe the concern in your own words..."
                    style={{ ...S.input, marginTop: 4 }}
                    onFocus={e => e.target.style.borderColor = "rgba(180,154,96,0.5)"}
                    onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                )}
              </div>

              <button onClick={generatePitch} disabled={!canPitch || loadingPitch}
                style={{ width: "100%", padding: "13px", background: canPitch && !loadingPitch ? "#b49a60" : "rgba(255,255,255,0.04)", border: "none", borderRadius: 2, color: canPitch && !loadingPitch ? "#0a0a0f" : "#333", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "monospace", cursor: canPitch && !loadingPitch ? "pointer" : "not-allowed", fontWeight: 700, transition: "all 0.18s", marginBottom: loadingPitch ? 14 : 0 }}>
                {loadingPitch ? "Generating pitch..." : "Generate TR Pitch →"}
              </button>

              {loadingPitch && (
                <div style={{ textAlign: "center", fontFamily: "monospace", color: "#8a8278", fontSize: 11 }}>
                  <div style={{ marginBottom: 6 }}>Building pitch using market context for {role}...</div>
                  <div style={{ width: 32, height: 2, background: "linear-gradient(90deg, transparent, #b49a60, transparent)", margin: "0 auto", animation: "slide 1.2s ease-in-out infinite" }} />
                </div>
              )}

              {pitch?.error && (
                <div style={{ fontFamily: "monospace", color: "#c06060", fontSize: 11, marginTop: 12, padding: "10px 13px", background: "rgba(192,96,96,0.05)", border: "1px solid rgba(192,96,96,0.15)", borderRadius: 2 }}>{pitch.error}</div>
              )}

              {pitch && !pitch.error && (
                <div style={{ marginTop: 16, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(180,154,96,0.15)", borderRadius: 2, overflow: "hidden" }}>
                  {/* Headline */}
                  <div style={{ background: "rgba(180,154,96,0.06)", borderBottom: "1px solid rgba(180,154,96,0.1)", padding: "14px 18px" }}>
                    <div style={{ fontFamily: "monospace", color: "#b49a60", fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 5 }}>Positioning Headline</div>
                    <div style={{ fontSize: 15, lineHeight: 1.4, fontStyle: "italic", color: "#e8e4dc" }}>"{pitch.headline}"</div>
                  </div>

                  {/* Tabs */}
                  <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {[{ id: "script", l: "Pitch Script" }, { id: "proof", l: "Proof Points" }, { id: "close", l: "Handle & Close" }].map(tab => (
                      <button key={tab.id} onClick={() => setPitchTab(tab.id)}
                        style={{ flex: 1, padding: "10px", background: "transparent", border: "none", borderBottom: `2px solid ${pitchTab === tab.id ? "#b49a60" : "transparent"}`, color: pitchTab === tab.id ? "#b49a60" : "#5a5650", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", cursor: "pointer", marginBottom: -1 }}>
                        {tab.l}
                      </button>
                    ))}
                  </div>

                  <div style={{ padding: "18px" }}>
                    {pitchTab === "script" && (
                      <div>
                        <div style={{ fontFamily: "monospace", color: "#5a5650", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Say this — adapt as the conversation moves</div>
                        <div style={{ fontSize: 13, lineHeight: 1.85, color: "#c8c4bc", whiteSpace: "pre-wrap" }}>{pitch.script}</div>
                      </div>
                    )}
                    {pitchTab === "proof" && (
                      <div>
                        <div style={{ fontFamily: "monospace", color: "#5a5650", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Anchor points to weave in</div>
                        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                          {(pitch.proof_points || []).map((p, i) => (
                            <li key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < pitch.proof_points.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", fontSize: 13, color: "#c8c4bc", lineHeight: 1.55 }}>
                              <span style={{ fontFamily: "monospace", color: "#b49a60", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {pitchTab === "close" && (
                      <div>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontFamily: "monospace", color: "#5a5650", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>If they push back</div>
                          <div style={{ background: "rgba(255,255,255,0.02)", borderLeft: "3px solid #b49a60", padding: "11px 14px", fontSize: 13, color: "#c8c4bc", lineHeight: 1.6, fontStyle: "italic" }}>"{pitch.objection_handler}"</div>
                        </div>
                        <div>
                          <div style={{ fontFamily: "monospace", color: "#5a5650", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Move it forward</div>
                          <div style={{ background: "rgba(180,154,96,0.05)", border: "1px solid rgba(180,154,96,0.12)", padding: "11px 14px", fontSize: 13, color: "#c8c4bc", lineHeight: 1.6 }}>{pitch.closing_hook}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: "0 18px 18px" }}>
                    <button onClick={copyPitch}
                      style={{ padding: "7px 14px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2, color: copied ? "#b49a60" : "#5a5650", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", cursor: "pointer" }}>
                      {copied ? "✓ Copied" : "Copy full pitch"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes slide{0%{transform:translateX(-20px);opacity:0}50%{opacity:1}100%{transform:translateX(20px);opacity:0}}
        input[type="range"]{-webkit-appearance:none;width:100%;height:3px;background:rgba(255,255,255,0.08);border-radius:2px;outline:none;cursor:pointer}
        input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;border-radius:50%;background:#b49a60;cursor:pointer;border:2px solid #0a0a0f}
        input::placeholder{color:#2a2820}
        *{box-sizing:border-box}
      `}</style>
    </div>
  );
}
