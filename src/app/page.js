"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

/* ─── Pacific Time helpers ─── */
const getPT = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
const fmt = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const getToday = () => fmt(getPT());
const until = (target) => Math.max(0, Math.ceil((new Date(target) - getPT()) / 864e5));

/* ─── STYLES (only visual constants — no data) ─── */
const font = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace";
const bg = "#0a0a0f";
const cardBg = "#111118";
const borderColor = "#1e1e2e";
const muted = "#6b7280";
const bright = "#e5e7eb";

const css = {
  root: { fontFamily: font, background: bg, color: bright, minHeight: "100vh", padding: "16px", maxWidth: 820, margin: "0 auto", fontSize: 13 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, padding: "12px 16px", background: "linear-gradient(135deg, #1a1a2e, #16213e)", borderRadius: 10, border: `1px solid ${borderColor}` },
  tabs: { display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" },
  tab: (a) => ({ padding: "8px 14px", borderRadius: 8, border: `1px solid ${a ? "#7c3aed" : borderColor}`, background: a ? "#7c3aed22" : cardBg, color: a ? "#a78bfa" : muted, cursor: "pointer", fontSize: 12, fontWeight: a ? 700 : 400, transition: "all 0.2s" }),
  card: (accent) => ({ background: cardBg, border: `1px solid ${accent || borderColor}33`, borderRadius: 10, padding: 14, marginBottom: 10 }),
  badge: (c) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: `${c}22`, color: c, letterSpacing: "0.5px" }),
  schedRow: () => ({ display: "flex", gap: 10, padding: "6px 0", borderBottom: `1px solid ${borderColor}44`, alignItems: "flex-start" }),
  dot: (c) => ({ width: 8, height: 8, borderRadius: "50%", background: c, marginTop: 5, flexShrink: 0 }),
  btn: (c) => ({ padding: "6px 12px", borderRadius: 6, border: `1px solid ${c}55`, background: `${c}15`, color: c, cursor: "pointer", fontSize: 11, fontWeight: 600, transition: "all 0.15s" }),
  check: (done) => ({ width: 20, height: 20, borderRadius: 6, border: `2px solid ${done ? "#10b981" : borderColor}`, background: done ? "#10b98133" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }),
};

/* ─── API helpers ─── */
const api = {
  getConfig: () => fetch('/api/config').then(r => r.json()),
  getData: () => fetch('/api/data').then(r => r.json()),
  saveData: (d) => fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(r => r.ok),
  seed: () => fetch('/api/seed', { method: 'POST' }).then(r => r.json()),
};

/* ─── MAIN COMPONENT ─── */
export default function CommandCenter() {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState("today");
  const [showChange, setShowChange] = useState(false);

  // Config from DB
  const [config, setConfig] = useState(null);
  const [configured, setConfigured] = useState(null);

  // User data from DB
  const [entries, setEntries] = useState({});
  const [weekPlan, setWeekPlan] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  const TODAY = getToday();

  // Load everything on auth
  useEffect(() => {
    if (status !== "authenticated") return;

    Promise.all([api.getConfig(), api.getData()]).then(([cfg, data]) => {
      if (cfg.configured) {
        setConfig(cfg);
        setConfigured(true);
      } else {
        setConfigured(false);
      }
      setEntries(data.entries || {});
      setWeekPlan(data.weekPlan || {});
      setLoaded(true);
    }).catch(err => {
      console.error("Load error:", err);
      setLoaded(true);
      setConfigured(false);
    });
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const interval = setInterval(() => {
      api.getData().then(data => {
        setEntries(data.entries || {});
        setWeekPlan(data.weekPlan || {});
      }).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [status]);

  // Save helper
  const save = useCallback(async (newEntries, newWeekPlan) => {
    setSaveStatus("saving");
    const ok = await api.saveData({ entries: newEntries, weekPlan: newWeekPlan });
    setSaveStatus(ok ? "saved" : "error");
    setTimeout(() => setSaveStatus(""), 2000);
  }, []);

  const toggleCheck = useCallback((id) => {
    const today = getToday();
    setEntries(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[today]) next[today] = { checks: {}, dt: "" };
      if (!next[today].checks) next[today].checks = {};
      next[today].checks[id] = !next[today].checks[id];
      save({ [today]: next[today] }, {});
      return next;
    });
  }, [save]);

  const setDayType = useCallback((date, type) => {
    const newWP = { [date]: type };
    setWeekPlan(prev => ({ ...prev, ...newWP }));
    setEntries(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[date]) next[date] = { checks: {}, dt: "" };
      next[date].dt = type;
      save({ [date]: next[date] }, newWP);
      return next;
    });
  }, [save]);

  // Seed handler for new users
  const handleSeed = async () => {
    setSaveStatus("saving");
    const result = await api.seed();
    if (result.seeded || result.message === "Already configured") {
      const cfg = await api.getConfig();
      setConfig(cfg);
      setConfigured(true);
    }
    setSaveStatus("");
  };

  // ─── LOADING / LOGIN ───
  if (status === "loading") {
    return <div style={{ ...css.root, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: muted }}>Loading...</div></div>;
  }

  if (status === "unauthenticated") {
    return (
      <div style={{ ...css.root, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 20 }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-1px", background: "linear-gradient(135deg, #7c3aed, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>COMMAND CENTER</div>
        <div style={{ color: muted, fontSize: 12, textAlign: "center", maxWidth: 300, lineHeight: 1.6 }}>Personal dashboard &amp; habit tracker.<br />Sign in to access your data.</div>
        <div style={{ ...css.btn("#7c3aed"), padding: "12px 24px", fontSize: 14 }} onClick={() => signIn("google")}>Sign in with Google</div>
      </div>
    );
  }

  // ─── SETUP WIZARD (no config in DB yet) ───
  if (loaded && configured === false) {
    return (
      <div style={{ ...css.root, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Welcome to Command Center</div>
        <div style={{ color: muted, fontSize: 12, textAlign: "center", maxWidth: 400, lineHeight: 1.6 }}>
          No dashboard configured yet. Choose an option below to get started.
        </div>
        <div style={{ ...css.btn("#7c3aed"), padding: "12px 24px", fontSize: 13 }} onClick={handleSeed}>
          🚀 Load Default Dashboard
        </div>
        <div style={{ color: muted, fontSize: 10, textAlign: "center", maxWidth: 350, lineHeight: 1.5 }}>
          This loads all day types, phases, office schedule, and checklist into your account. You can edit everything later.
        </div>
        <div style={{ ...css.btn("#ef4444"), fontSize: 9, padding: "4px 10px", marginTop: 10 }} onClick={() => signOut()}>Sign Out</div>
      </div>
    );
  }

  if (!loaded || !config) {
    return <div style={{ ...css.root, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: muted }}>Loading dashboard...</div></div>;
  }

  // ─── EXTRACT CONFIG ───
  const TYPES = config.dayTypes || {};
  const PHASES = config.phases || [];
  const CHECKS = config.checks || [];
  const COLORS = config.colorMap || {};
  const OFFICE = config.officeSchedule || [];
  const title = config.dashboardTitle || "COMMAND CENTER";
  const gradDate = config.graduationDate;
  const interviewDate = config.interviewReadyDate;
  const footerText = config.footerText || "";
  const officeRules = config.officeRules || "";
  
  const todayType = weekPlan[TODAY] || entries[TODAY]?.dt || "";
  const ty = TYPES[todayType];

  const getWeekDates = () => {
    const now = getPT();
    const dow = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((dow + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return fmt(d); });
  };
  const weekDates = getWeekDates();

  // Stats
  const streak = (() => {
    let s = 0;
    const todayEntry = entries[TODAY];
    const todayDone = todayEntry ? Object.values(todayEntry.checks || {}).filter(Boolean).length >= 4 : false;
    if (todayDone) s = 1;
    const d = new Date(getPT());
    d.setDate(d.getDate() - 1);
    while (true) {
      const key = fmt(d);
      const e = entries[key];
      if (e && Object.values(e.checks || {}).filter(Boolean).length >= 4) { s++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return s;
  })();

  const allDates = Object.keys(entries);
  const totalDays = allDates.filter(k => Object.values(entries[k]?.checks || {}).filter(Boolean).length > 0).length;
  const dsaDays = allDates.filter(k => entries[k]?.checks?.dsa).length;
  const gymDays = allDates.filter(k => entries[k]?.checks?.gym).length;

  // Phase calculation from DB dates
  const phaseStarts = PHASES.map(p => new Date(p.startDate));
  const now = getPT();
  let currentPhase = 0;
  for (let i = phaseStarts.length - 1; i >= 0; i--) { if (now >= phaseStarts[i]) { currentPhase = i; break; } }

  const TABS = [
    { id: "today", label: "Today" },
    { id: "week", label: "Week" },
    { id: "schedule", label: "Day Types" },
    { id: "office", label: "Office" },
    { id: "phases", label: "Phases" },
    { id: "stats", label: "Stats" },
  ];

  return (
    <div style={css.root}>
      {/* HEADER */}
      <div style={css.header}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.5px" }}>{title}</div>
          <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
            {getPT().toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "long", month: "short", day: "numeric", year: "numeric" })}
            {" · "}Pacific Time
            {saveStatus && <span style={{ marginLeft: 8, fontSize: 10, color: saveStatus === "saved" ? "#10b981" : saveStatus === "error" ? "#ef4444" : "#f59e0b" }}>
              {saveStatus === "saving" ? "⏳ saving..." : saveStatus === "saved" ? "✓ saved" : "⚠ save failed"}
            </span>}
          </div>
          <div style={{ fontSize: 10, color: muted, marginTop: 2 }}>{session?.user?.email}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          {gradDate && <>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#7c3aed" }}>{until(gradDate)}</div>
            <div style={{ fontSize: 10, color: muted }}>days to graduation</div>
          </>}
          <div style={{ ...css.btn("#ef4444"), fontSize: 9, padding: "2px 6px", display: "inline-block", marginTop: 4 }} onClick={() => signOut()}>Sign Out</div>
        </div>
      </div>

      {/* COUNTDOWN BAR */}
      <div style={{ ...css.card(), display: "flex", gap: 20, justifyContent: "center", padding: "10px 16px", flexWrap: "wrap" }}>
        {interviewDate && <div style={{ textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#ef4444" }}>{until(interviewDate)}</div><div style={{ fontSize: 10, color: muted }}>Interview Ready</div></div>}
        {PHASES.length > 0 && <div style={{ textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: PHASES[currentPhase]?.cl || "#a855f7" }}>{Math.max(1, Math.floor((now - phaseStarts[currentPhase]) / 864e5) + 1)}</div><div style={{ fontSize: 10, color: muted }}>Phase {currentPhase} Day</div></div>}
        <div style={{ textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>{streak}</div><div style={{ fontSize: 10, color: muted }}>Streak</div></div>
      </div>

      {/* TABS */}
      <div style={css.tabs}>
        {TABS.map(t => <div key={t.id} style={css.tab(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</div>)}
      </div>

      {/* ═══ TODAY TAB ═══ */}
      {tab === "today" && (
        <div>
          {(!todayType || showChange) && (
            <div style={{ ...css.card("#7c3aed"), marginBottom: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: "#a78bfa" }}>{todayType ? "🔄 Change today's day type:" : "⚠ Tag today's day type:"}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.entries(TYPES).map(([k, v]) => (
                  <div key={k} style={{ ...css.btn(v.color), opacity: todayType === k ? 1 : 0.75, border: todayType === k ? `2px solid ${v.color}` : `1px solid ${v.color}55` }} onClick={() => { setDayType(TODAY, k); setShowChange(false); }}>{v.name}</div>
                ))}
              </div>
              {todayType && <div style={{ marginTop: 8, fontSize: 11, color: muted, cursor: "pointer" }} onClick={() => setShowChange(false)}>✕ Cancel</div>}
            </div>
          )}

          {ty && (<>
            <div style={{ ...css.card(ty.color), marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{ty.name}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {!showChange && <div style={{ ...css.btn(muted), fontSize: 10, padding: "3px 8px" }} onClick={() => setShowChange(true)}>Change</div>}
                  <span style={css.badge(ty.color)}>{ty.tag}</span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{ty.desc}</div>
              <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, flexWrap: "wrap" }}>
                {ty.wake && <span><span style={{ color: muted }}>Wake:</span> {ty.wake}</span>}
                {ty.dsaHrs && <span><span style={{ color: muted }}>DSA:</span> {ty.dsaHrs}</span>}
                {ty.gymSlot && <span><span style={{ color: muted }}>Gym:</span> {ty.gymSlot}</span>}
              </div>
              {ty.rule && <div style={{ marginTop: 6, fontSize: 11, color: ty.color, fontStyle: "italic" }}>{ty.rule}</div>}
            </div>

            <div style={css.card()}>
              <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>📋 Today&apos;s Schedule</div>
              {(ty.sched || []).map((s, i) => (
                <div key={i} style={css.schedRow()}>
                  <div style={css.dot(COLORS[s.c] || muted)} />
                  <div style={{ width: 100, flexShrink: 0, color: muted, fontSize: 11 }}>{s.t}</div>
                  <div style={{ fontSize: 12, color: s.c === "dsa" ? "#a78bfa" : s.c === "office" ? "#38bdf8" : bright }}>{s.a}</div>
                </div>
              ))}
            </div>
          </>)}

          {CHECKS.length > 0 && (
            <div style={{ ...css.card("#7c3aed"), marginTop: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>✅ Non-Negotiables</div>
              {CHECKS.map(ch => {
                const done = entries[TODAY]?.checks?.[ch.id];
                return (
                  <div key={ch.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", cursor: "pointer" }} onClick={() => toggleCheck(ch.id)}>
                    <div style={css.check(done)}>{done ? "✓" : ""}</div>
                    <span style={{ fontSize: 15, marginRight: 4 }}>{ch.icon}</span>
                    <span style={{ fontSize: 12, color: done ? "#10b981" : bright, textDecoration: done ? "line-through" : "none" }}>{ch.label}</span>
                  </div>
                );
              })}
              <div style={{ marginTop: 10, fontSize: 11, color: muted }}>
                {Object.values(entries[TODAY]?.checks || {}).filter(Boolean).length}/{CHECKS.length} completed today
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ WEEK TAB ═══ */}
      {tab === "week" && (
        <div>
          <div style={{ fontSize: 11, color: muted, marginBottom: 12, lineHeight: 1.5 }}>Tag each day based on your schedule. All days are manually adjustable.</div>
          {weekDates.map((d, i) => {
            const dn = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i];
            const assigned = weekPlan[d] || entries[d]?.dt || "";
            const t = TYPES[assigned];
            const isToday = d === TODAY;
            const checks = entries[d]?.checks || {};
            const done = Object.values(checks).filter(Boolean).length;
            return (
              <div key={d} style={{ ...css.card(isToday ? "#7c3aed" : t?.color), borderWidth: isToday ? 2 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{dn}</span>
                    <span style={{ color: muted, fontSize: 11, marginLeft: 8 }}>{d}</span>
                    {isToday && <span style={{ ...css.badge("#7c3aed"), marginLeft: 8 }}>TODAY</span>}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {assigned && <span style={css.badge(t?.color || muted)}>{t?.tag}</span>}
                    {done > 0 && <span style={{ fontSize: 11, color: "#10b981" }}>{done}/{CHECKS.length}</span>}
                  </div>
                </div>
                {assigned && <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>{t?.name}</div>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {Object.entries(TYPES).map(([k, v]) => (
                    <div key={k} style={{ ...css.btn(assigned === k ? v.color : muted + "66"), fontSize: 10, padding: "3px 8px", opacity: assigned === k ? 1 : 0.6 }} onClick={() => setDayType(d, k)}>
                      {v.name.split(" ")[0]}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ DAY TYPES TAB ═══ */}
      {tab === "schedule" && (
        <div>
          <div style={{ fontSize: 11, color: muted, marginBottom: 12 }}>All {Object.keys(TYPES).length} day types — assign any to any day.</div>
          {Object.entries(TYPES).map(([k, v]) => (
            <div key={k} style={css.card(v.color)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{v.name}</div>
                <span style={css.badge(v.color)}>{v.tag}</span>
              </div>
              <div style={{ fontSize: 11, color: muted, margin: "6px 0" }}>{v.desc}</div>
              <div style={{ display: "flex", gap: 14, fontSize: 11, margin: "6px 0", flexWrap: "wrap" }}>
                {v.wake && <span><span style={{ color: muted }}>Wake:</span> {v.wake}</span>}
                {v.sleep && <span><span style={{ color: muted }}>Sleep:</span> {v.sleep}</span>}
                {v.dsaHrs && <span><span style={{ color: muted }}>DSA:</span> {v.dsaHrs}</span>}
                {v.gymSlot && <span><span style={{ color: muted }}>Gym:</span> {v.gymSlot}</span>}
              </div>
              {v.rule && <div style={{ fontSize: 11, color: v.color, fontStyle: "italic", marginBottom: 10 }}>{v.rule}</div>}
              <details>
                <summary style={{ fontSize: 11, color: muted, cursor: "pointer" }}>View full schedule →</summary>
                <div style={{ marginTop: 8 }}>
                  {(v.sched || []).map((s, i) => (
                    <div key={i} style={css.schedRow()}>
                      <div style={css.dot(COLORS[s.c] || muted)} />
                      <div style={{ width: 100, flexShrink: 0, color: muted, fontSize: 11 }}>{s.t}</div>
                      <div style={{ fontSize: 11 }}>{s.a}</div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))}
        </div>
      )}

      {/* ═══ OFFICE TAB ═══ */}
      {tab === "office" && (
        <div>
          <div style={css.card("#0ea5e9")}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🏢 Fixed Office Schedule</div>
            <div style={{ fontSize: 11, color: muted, marginBottom: 12, lineHeight: 1.5 }}>
              Two-tier system — NO negotiation:<br />
              • Non-recovery days → <span style={{ color: "#38bdf8", fontWeight: 700 }}>10:00 AM</span><br />
              • Recovery days → <span style={{ color: "#ef4444", fontWeight: 700 }}>12:30 PM</span>
            </div>
            {OFFICE.length > 0 && (
              <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${borderColor}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "50px 80px 65px 80px 1fr", background: "#1a1a2e", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: muted }}>
                  <span>Day</span><span>Arrive</span><span>Leave</span><span>Class</span><span>Note</span>
                </div>
                {OFFICE.map(r => (
                  <div key={r.day} style={{ display: "grid", gridTemplateColumns: "50px 80px 65px 80px 1fr", padding: "8px 10px", fontSize: 11, borderTop: `1px solid ${borderColor}44` }}>
                    <span style={{ fontWeight: 600 }}>{r.day}</span>
                    <span style={{ color: r.arrive === "—" ? muted : "#38bdf8" }}>{r.arrive}</span>
                    <span style={{ color: muted }}>{r.leave}</span>
                    <span style={{ color: r.class === "—" ? muted : "#f59e0b" }}>{r.class}</span>
                    <span style={{ color: muted }}>{r.note}</span>
                  </div>
                ))}
              </div>
            )}
            {officeRules && <div style={{ marginTop: 12, fontSize: 11, color: muted, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: officeRules.replace(/<b>/g, `<strong style="color:${bright}">`).replace(/<\/b>/g, '</strong>') }} />}
          </div>
        </div>
      )}

      {/* ═══ PHASES TAB ═══ */}
      {tab === "phases" && (
        <div>
          {PHASES.map((p, i) => (
            <div key={i} style={{ ...css.card(p.cl), borderWidth: i === currentPhase ? 2 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{p.n}</div>
                {i === currentPhase && <span style={css.badge(p.cl)}>CURRENT</span>}
              </div>
              <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>{p.w}</div>
              <div style={{ fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>{p.d}</div>
              {(p.resources || []).map((r, j) => (
                <div key={j} style={{ display: "flex", gap: 8, padding: "4px 0", fontSize: 11, borderTop: `1px solid ${borderColor}33` }}>
                  <span style={{ ...css.badge(p.cl), flexShrink: 0, fontSize: 9 }}>{r.type}</span>
                  <span style={{ fontWeight: 600, minWidth: 120 }}>{r.name}</span>
                  <span style={{ color: muted }}>{r.use}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ═══ STATS TAB ═══ */}
      {tab === "stats" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Current Streak", value: streak, color: "#10b981" },
              { label: "Days Tracked", value: totalDays, color: "#7c3aed" },
              { label: "DSA Days", value: dsaDays, color: "#3b82f6" },
              { label: "Gym Days", value: gymDays, color: "#22c55e" },
            ].map(s => (
              <div key={s.label} style={css.card(s.color)}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: muted }}>{s.label}</div>
              </div>
            ))}
          </div>

          {PHASES.length > 0 && (
            <div style={css.card()}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>📊 Phase Progress</div>
              <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>Phase {currentPhase}: {PHASES[currentPhase]?.n}</div>
              <div style={{ background: "#1a1a24", borderRadius: 6, height: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, ((now - phaseStarts[currentPhase]) / (phaseStarts[Math.min(currentPhase + 1, phaseStarts.length - 1)] - phaseStarts[currentPhase])) * 100)}%`, background: PHASES[currentPhase]?.cl, borderRadius: 6, transition: "width 0.5s" }} />
              </div>
            </div>
          )}

          <div style={{ ...css.card(), marginTop: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>🎯 Key Targets</div>
            {[
              { label: "LeetCode independent solves", target: "Goal: build from 0", color: "#ef4444" },
              { label: "GitHub projects deployed", target: "Phase 3: 2–3 projects", color: "#f59e0b" },
              { label: "Gym sessions / week", target: "Target: 2–3 (Tue/Thu/Fri)", color: "#10b981" },
              { label: "Fall 2026 applications", target: "New Grad SDE roles", color: "#7c3aed" },
            ].map(t => (
              <div key={t.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${borderColor}33`, fontSize: 12 }}>
                <span>{t.label}</span>
                <span style={{ color: t.color, fontSize: 11 }}>{t.target}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER */}
      {footerText && <div style={{ textAlign: "center", padding: "20px 0 8px", fontSize: 10, color: muted }}>{footerText}</div>}
    </div>
  );
}
