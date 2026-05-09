import './index.css'
import { useState, useEffect } from "react";

const DAYS = ["L", "M", "M", "G", "V", "S", "D"];
const WEATHER = ["☀️", "🌤️", "🌥️", "🌧️", "❄️"];
const MOODS = ["😊", "🙂", "😐", "😔", "😤"];
const MOOD_LABELS = ["Felice", "Ok", "Neutro", "Triste", "Arrabbiata"];

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "diario_entries";
function loadEntries() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function saveEntries(e) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(e)); } catch {}
}
function todayStr() {
  return new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function emptyEntry(dateText) {
  const d = new Date();
  return {
    dateText,
    selectedDay: d.getDay() === 0 ? 6 : d.getDay() - 1,
    sveglia: "", oresonno: "",
    clima: null, umore: null,
    acqua: 0, frutta: 0,
    attivita: [{ tipo: "", durata: "" }, { tipo: "", durata: "" }, { tipo: "", durata: "" }],
    menu: { colazione: "", merenda: "", pranzo: "", cena: "" },
    grata: ["", "", "", "", "", "", ""],
    pensieri: "",
    savedAt: null,
  };
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const IS = {
  background: "transparent", border: "none", borderBottom: "1.5px solid #D0C9BE",
  outline: "none", fontSize: "16px", fontFamily: "'Georgia',serif",
  color: "#2a2a2a", padding: "6px 0", width: "100%",
};
const SL = {
  fontSize: "10px", fontFamily: "'Courier New',monospace", letterSpacing: "1.5px",
  color: "#AAA", textTransform: "uppercase", marginBottom: "4px", display: "block",
};

// ─── UI Primitives ────────────────────────────────────────────────────────────
function Sec({ title, children }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{
        fontSize: "11px", fontFamily: "'Courier New',monospace", letterSpacing: "2px",
        color: "#888", fontWeight: "700", marginBottom: "10px", textTransform: "uppercase",
      }}>{title}</div>
      {children}
    </div>
  );
}
function HR() { return <div style={{ height: "1px", background: "#E8E3DC", margin: "20px 0" }} />; }
function Pill({ children }) {
  return (
    <span style={{
      fontSize: "11px", fontFamily: "'Courier New',monospace", background: "#F5F2ED",
      borderRadius: "20px", padding: "4px 12px", color: "#666", letterSpacing: ".3px",
    }}>{children}</span>
  );
}
function Toast({ msg, visible }) {
  return (
    <div style={{
      position: "fixed", bottom: "80px", left: "50%", transform: "translateX(-50%)",
      background: "#1a1a1a", color: "#FAFAF7", borderRadius: "20px", padding: "10px 22px",
      fontSize: "13px", fontFamily: "'Courier New',monospace", letterSpacing: "1px",
      zIndex: 200, opacity: visible ? 1 : 0, transition: "opacity .4s", pointerEvents: "none",
      whiteSpace: "nowrap",
    }}>{msg}</div>
  );
}

// ─── Entry Card ───────────────────────────────────────────────────────────────
function EntryCard({ entry, onOpen, onDelete }) {
  return (
    <div style={{
      background: "#FFF", borderRadius: "16px", padding: "16px",
      marginBottom: "12px", boxShadow: "0 2px 8px rgba(0,0,0,.06)",
      border: "1px solid #EDE9E2",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'Courier New',monospace", fontWeight: "700", fontSize: "14px", color: "#1a1a1a" }}>
            {entry.dateText}
          </div>
          <div style={{ fontSize: "12px", color: "#AAA", fontFamily: "'Courier New',monospace", marginTop: "3px" }}>
            {DAYS[entry.selectedDay]}
            {entry.clima !== null ? ` · ${WEATHER[entry.clima]}` : ""}
            {entry.umore !== null ? ` · ${MOODS[entry.umore]}` : ""}
            {entry.sveglia ? ` · ⏰ ${entry.sveglia}` : ""}
            {entry.oresonno ? ` · 💤 ${entry.oresonno}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onOpen} style={{
            background: "#1a1a1a", color: "#FAFAF7", border: "none", borderRadius: "10px",
            padding: "8px 14px", fontSize: "12px", fontFamily: "'Courier New',monospace", cursor: "pointer",
          }}>Apri</button>
          <button onClick={onDelete} style={{
            background: "#FFF0EE", color: "#C0392B", border: "1px solid #F5C6C0",
            borderRadius: "10px", padding: "8px 10px", fontSize: "16px", cursor: "pointer",
          }}>🗑</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
        {entry.acqua > 0 && <Pill>💧 {(entry.acqua * .5).toFixed(1)}L</Pill>}
        {entry.frutta > 0 && <Pill>🍎 {entry.frutta}/7</Pill>}
        {entry.attivita.filter(a => a.tipo).map((a, i) =>
          <Pill key={i}>🏃 {a.tipo}{a.durata ? ` ${a.durata}` : ""}</Pill>)}
        {(entry.pensieri || entry.grata.some(g => g.trim())) && <Pill>📝 Note</Pill>}
      </div>
    </div>
  );
}

// ─── Archive Page ─────────────────────────────────────────────────────────────
function ArchivePage({ entries, onOpen, onDelete }) {
  const [query, setQuery] = useState("");
  const [filterMood, setFilterMood] = useState(null);
  const [sortDesc, setSortDesc] = useState(true);

  function parseDate(d) {
    const [dd, mm, yyyy] = (d || "").split("/");
    return new Date(`${yyyy}-${mm}-${dd}`);
  }

  const keys = Object.keys(entries).filter(k => {
    const e = entries[k];
    const q = query.toLowerCase();
    const textMatch = !q || e.dateText.includes(q) || e.pensieri.toLowerCase().includes(q) ||
      e.grata.some(g => g.toLowerCase().includes(q)) ||
      Object.values(e.menu).some(m => m.toLowerCase().includes(q)) ||
      e.attivita.some(a => a.tipo.toLowerCase().includes(q));
    const moodMatch = filterMood === null || e.umore === filterMood;
    return textMatch && moodMatch;
  }).sort((a, b) => {
    try { const diff = parseDate(entries[b].dateText) - parseDate(entries[a].dateText); return sortDesc ? diff : -diff; }
    catch { return 0; }
  });

  return (
    <div style={{ padding: "0 20px 100px" }}>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div style={{ fontSize: "24px", letterSpacing: "6px", fontFamily: "'Courier New',monospace", fontWeight: "700", color: "#1a1a1a" }}>
          ARCHIVIO
        </div>
        <div style={{ fontSize: "11px", letterSpacing: "3px", fontFamily: "'Courier New',monospace", color: "#999", marginTop: "4px" }}>
          {Object.keys(entries).length} giorni salvati
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#EDEAE4", borderRadius: "14px", padding: "12px 16px", marginBottom: "14px" }}>
        <span style={{ fontSize: "16px", opacity: .5 }}>🔍</span>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cerca nel diario..."
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "16px", fontFamily: "'Georgia',serif", color: "#2a2a2a" }} />
        {query && <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#AAA" }}>✕</button>}
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "18px", alignItems: "center" }}>
        <span style={{ ...SL, margin: 0, whiteSpace: "nowrap" }}>Filtro:</span>
        {MOODS.map((m, i) => (
          <button key={i} onClick={() => setFilterMood(filterMood === i ? null : i)} style={{
            fontSize: "22px", background: "none", border: "none", cursor: "pointer",
            opacity: filterMood === null || filterMood === i ? 1 : .25,
            transform: filterMood === i ? "scale(1.3)" : "scale(1)",
            transition: "all .15s", padding: "4px",
          }}>{m}</button>
        ))}
        <button onClick={() => setSortDesc(!sortDesc)} style={{
          marginLeft: "auto", background: "#EDEAE4", border: "none", borderRadius: "10px",
          padding: "6px 12px", fontSize: "11px", fontFamily: "'Courier New',monospace",
          cursor: "pointer", color: "#666", whiteSpace: "nowrap",
        }}>{sortDesc ? "↓ Recenti" : "↑ Vecchi"}</button>
      </div>

      {keys.length === 0 ? (
        <div style={{ textAlign: "center", color: "#CCC", marginTop: "80px", fontFamily: "'Courier New',monospace", fontSize: "13px", letterSpacing: "1px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
          Nessuna voce trovata
        </div>
      ) : keys.map(k => (
        <EntryCard key={k} entry={entries[k]} onOpen={() => onOpen(k)} onDelete={() => onDelete(k)} />
      ))}
    </div>
  );
}

// ─── View Entry ───────────────────────────────────────────────────────────────
function ViewEntry({ entry, onClose, onEdit }) {
  const Badge = ({ children }) => (
    <span style={{
      fontSize: "12px", fontFamily: "'Courier New',monospace", background: "#F0EDE8",
      borderRadius: "20px", padding: "6px 14px", color: "#444",
    }}>{children}</span>
  );
  return (
    <div style={{ position: "fixed", inset: 0, background: "#FAFAF7", overflowY: "auto", zIndex: 100, padding: "0 20px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", paddingTop: "16px" }}>
        <button onClick={onClose} style={{
          background: "#EDEAE4", border: "none", borderRadius: "12px",
          padding: "10px 16px", fontSize: "14px", fontFamily: "'Courier New',monospace",
          cursor: "pointer", color: "#666",
        }}>← Indietro</button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontFamily: "'Courier New',monospace", fontWeight: "700", fontSize: "14px", color: "#1a1a1a" }}>{entry.dateText}</div>
          <div style={{ fontSize: "11px", color: "#AAA", fontFamily: "'Courier New',monospace" }}>{DAYS[entry.selectedDay]}</div>
        </div>
        <button onClick={onEdit} style={{
          background: "#1a1a1a", color: "#FAFAF7", border: "none", borderRadius: "12px",
          padding: "10px 16px", fontSize: "14px", fontFamily: "'Courier New',monospace", cursor: "pointer",
        }}>✏️ Modifica</button>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", marginBottom: "24px" }}>
        {entry.clima !== null && <Badge>{WEATHER[entry.clima]}</Badge>}
        {entry.umore !== null && <Badge>{MOODS[entry.umore]} {MOOD_LABELS[entry.umore]}</Badge>}
        {entry.sveglia && <Badge>⏰ {entry.sveglia}</Badge>}
        {entry.oresonno && <Badge>💤 {entry.oresonno}</Badge>}
        {entry.acqua > 0 && <Badge>💧 {(entry.acqua * .5).toFixed(1)} L</Badge>}
        {entry.frutta > 0 && <Badge>🍎 {entry.frutta} porz.</Badge>}
      </div>

      {entry.attivita.some(a => a.tipo) && <><HR /><Sec title="Esercizio Fisico">
        {entry.attivita.filter(a => a.tipo).map((a, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "15px", fontFamily: "'Georgia',serif" }}>{a.tipo}</span>
            <span style={{ fontSize: "13px", color: "#888", fontFamily: "'Courier New',monospace" }}>{a.durata}</span>
          </div>
        ))}
      </Sec></>}

      {Object.values(entry.menu).some(v => v) && <><HR /><Sec title="Menu">
        {[["colazione", "☕"], ["merenda", "🍪"], ["pranzo", "🍽️"], ["cena", "🌙"]]
          .filter(([k]) => entry.menu[k]).map(([k, icon]) => (
            <div key={k} style={{ marginBottom: "12px" }}>
              <span style={SL}>{icon} {k.charAt(0).toUpperCase() + k.slice(1)}</span>
              <div style={{ fontSize: "15px", fontFamily: "'Georgia',serif", color: "#2a2a2a" }}>{entry.menu[k]}</div>
            </div>
          ))}
      </Sec></>}

      {entry.grata.some(g => g.trim()) && <><HR /><Sec title="Oggi sono grata per">
        {entry.grata.filter(g => g.trim()).map((g, i) => (
          <div key={i} style={{ display: "flex", gap: "12px", marginBottom: "10px", alignItems: "flex-start" }}>
            <div style={{ width: "16px", height: "16px", background: "#1a1a1a", borderRadius: "3px", flexShrink: 0, marginTop: "3px" }} />
            <span style={{ fontSize: "15px", fontFamily: "'Georgia',serif", color: "#2a2a2a" }}>{g}</span>
          </div>
        ))}
      </Sec></>}

      {entry.pensieri && <><HR /><Sec title="Pensieri di fine giornata">
        <div style={{ background: "#F5F2ED", borderRadius: "16px", padding: "18px", backgroundImage: "radial-gradient(circle,#C5BDB3 1px,transparent 1px)", backgroundSize: "18px 18px" }}>
          <p style={{ fontSize: "15px", fontFamily: "'Georgia',serif", color: "#2a2a2a", lineHeight: "1.8", margin: 0, whiteSpace: "pre-wrap" }}>
            {entry.pensieri}
          </p>
        </div>
      </Sec></>}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("diario");
  const [entries, setEntries] = useState(() => loadEntries());
  const [entry, setEntry] = useState(() => {
    const saved = loadEntries();
    return saved[todayStr()] || emptyEntry(todayStr());
  });
  const [toast, setToast] = useState({ msg: "", visible: false });
  const [viewKey, setViewKey] = useState(null);
  const [editMode, setEditMode] = useState(false);

  // Safe area for iPhone notch
  const safeTop = "env(safe-area-inset-top, 44px)";
  const safeBottom = "env(safe-area-inset-bottom, 20px)";

  useEffect(() => {
    if (!entry.dateText) return;
    const updated = { ...entries, [entry.dateText]: entry };
    setEntries(updated);
    saveEntries(updated);
  }, [entry]);

  function showToast(msg) {
    setToast({ msg, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2000);
  }
  function saveEntry() {
    const updated = { ...entries, [entry.dateText]: { ...entry, savedAt: new Date().toISOString() } };
    setEntries(updated); saveEntries(updated); showToast("✓ Salvato!");
  }
  function deleteEntry(key) {
    if (!window.confirm(`Eliminare il giorno ${key}?`)) return;
    const updated = { ...entries }; delete updated[key];
    setEntries(updated); saveEntries(updated);
    setViewKey(null); showToast("🗑 Eliminato");
  }
  function openForEdit(key) {
    setEntry(entries[key]); setViewKey(null);
    setTab("diario"); setEditMode(true);
    showToast(`✏️ Modifica: ${key}`);
  }
  function newEntry() {
    setEntry(emptyEntry(todayStr())); setEditMode(false); showToast("📄 Nuovo giorno");
  }
  function upd(field, val) { setEntry(e => ({ ...e, [field]: val })); }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#f0ede8,#e8e3dc)",
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
    }}>
      <Toast msg={toast.msg} visible={toast.visible} />

      {viewKey && entries[viewKey] && (
        <ViewEntry entry={entries[viewKey]} onClose={() => setViewKey(null)} onEdit={() => openForEdit(viewKey)} />
      )}

      {/* Main scrollable content */}
      <div style={{ paddingTop: `calc(${safeTop} + 16px)`, paddingBottom: `calc(${safeBottom} + 70px)` }}>
        {tab === "archivio" ? (
          <ArchivePage entries={entries} onOpen={k => setViewKey(k)} onDelete={deleteEntry} />
        ) : (
          <div style={{ padding: "0 20px" }}>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "26px", letterSpacing: "8px", fontFamily: "'Courier New',monospace", fontWeight: "700", color: "#1a1a1a" }}>
                DIARIO
              </div>
              <div style={{ fontSize: "11px", letterSpacing: "4px", fontFamily: "'Courier New',monospace", color: "#999", marginTop: "3px" }}>
                GIORNALIERO
              </div>
              {editMode && (
                <div style={{ marginTop: "6px", fontSize: "11px", fontFamily: "'Courier New',monospace", color: "#C0392B", letterSpacing: "1px" }}>
                  ✏️ MODIFICA: {entry.dateText}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <button onClick={saveEntry} style={{
                flex: 2, background: "#1a1a1a", color: "#FAFAF7", border: "none",
                borderRadius: "14px", padding: "14px", fontSize: "13px",
                fontFamily: "'Courier New',monospace", cursor: "pointer", letterSpacing: "1px",
              }}>💾 SALVA GIORNATA</button>
              <button onClick={newEntry} style={{
                flex: 1, background: "#EDEAE4", color: "#666", border: "none",
                borderRadius: "14px", padding: "14px", fontSize: "13px",
                fontFamily: "'Courier New',monospace", cursor: "pointer", letterSpacing: "1px",
              }}>+ NUOVO</button>
            </div>

            {/* Data */}
            <Sec title="Data & Risveglio">
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                <div style={{ flex: 2 }}>
                  <span style={SL}>Data</span>
                  <input style={IS} value={entry.dateText} onChange={e => upd("dateText", e.target.value)} placeholder="gg/mm/aaaa" />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={SL}>Sveglia</span>
                  <input style={IS} value={entry.sveglia} onChange={e => upd("sveglia", e.target.value)} placeholder="07:00" />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={SL}>Ore sonno</span>
                  <input style={IS} value={entry.oresonno} onChange={e => upd("oresonno", e.target.value)} placeholder="8h" />
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "center" }}>
                {DAYS.map((d, i) => (
                  <button key={i} onClick={() => upd("selectedDay", i)} style={{
                    width: "38px", height: "38px", borderRadius: "50%", border: "none",
                    background: entry.selectedDay === i ? "#1a1a1a" : "#EDEAE4",
                    color: entry.selectedDay === i ? "#FAFAF7" : "#666",
                    fontFamily: "'Courier New',monospace", fontSize: "12px", fontWeight: "700",
                    cursor: "pointer", transition: "all .15s",
                  }}>{d}</button>
                ))}
              </div>
            </Sec>

            <HR />

            <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
              <div style={{ flex: 1 }}>
                <span style={SL}>Clima</span>
                <div style={{ display: "flex", gap: "5px", marginTop: "8px", flexWrap: "wrap" }}>
                  {WEATHER.map((w, i) => (
                    <button key={i} onClick={() => upd("clima", entry.clima === i ? null : i)} style={{
                      fontSize: "24px", background: "none", border: "none", cursor: "pointer",
                      opacity: entry.clima === i ? 1 : .3, transition: "all .15s",
                      transform: entry.clima === i ? "scale(1.25)" : "scale(1)", padding: "3px",
                    }}>{w}</button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <span style={SL}>Umore</span>
                <div style={{ display: "flex", gap: "5px", marginTop: "8px" }}>
                  {MOODS.map((m, i) => (
                    <button key={i} onClick={() => upd("umore", entry.umore === i ? null : i)} style={{
                      fontSize: "24px", background: "none", border: "none", cursor: "pointer",
                      opacity: entry.umore === i ? 1 : .3, transition: "all .15s",
                      transform: entry.umore === i ? "scale(1.3)" : "scale(1)", padding: "3px",
                    }}>{m}</button>
                  ))}
                </div>
              </div>
            </div>

            <HR />

            <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
              <div style={{ flex: 1 }}>
                <span style={SL}>Acqua (1 = 0,5 L)</span>
                <div style={{ display: "flex", gap: "4px", marginTop: "10px", flexWrap: "wrap" }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <button key={i} onClick={() => upd("acqua", i < entry.acqua ? i : i + 1)} style={{
                      width: "32px", height: "32px", background: "none", border: "none",
                      cursor: "pointer", padding: 0, fontSize: "24px",
                      opacity: i < entry.acqua ? 1 : .25, transition: "all .15s",
                    }}>💧</button>
                  ))}
                </div>
                <div style={{ fontSize: "12px", color: "#888", marginTop: "6px", fontFamily: "'Courier New',monospace" }}>
                  {(entry.acqua * .5).toFixed(1)} L
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <span style={SL}>Frutta & Verdura</span>
                <div style={{ display: "flex", gap: "4px", marginTop: "10px", flexWrap: "wrap" }}>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <button key={i} onClick={() => upd("frutta", i < entry.frutta ? i : i + 1)} style={{
                      width: "32px", height: "32px", background: "none", border: "none",
                      cursor: "pointer", padding: 0, fontSize: "24px",
                      opacity: i < entry.frutta ? 1 : .25, transition: "all .15s",
                    }}>🍎</button>
                  ))}
                </div>
                <div style={{ fontSize: "12px", color: "#888", marginTop: "6px", fontFamily: "'Courier New',monospace" }}>
                  {entry.frutta}/7 porzioni
                </div>
              </div>
            </div>

            <HR />

            <Sec title="Esercizio Fisico">
              {entry.attivita.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                  <div style={{ flex: 3 }}>
                    <input style={{ ...IS, fontSize: "15px" }} value={a.tipo}
                      onChange={e => upd("attivita", entry.attivita.map((x, j) => j === i ? { ...x, tipo: e.target.value } : x))}
                      placeholder="Tipo di attività" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input style={{ ...IS, fontSize: "15px" }} value={a.durata}
                      onChange={e => upd("attivita", entry.attivita.map((x, j) => j === i ? { ...x, durata: e.target.value } : x))}
                      placeholder="Durata" />
                  </div>
                </div>
              ))}
            </Sec>

            <HR />

            <Sec title="Menu">
              {[["colazione", "☕ Colazione"], ["merenda", "🍪 Merenda"], ["pranzo", "🍽️ Pranzo"], ["cena", "🌙 Cena"]].map(([k, label]) => (
                <div key={k} style={{ marginBottom: "16px" }}>
                  <span style={SL}>{label}</span>
                  <textarea value={entry.menu[k]}
                    onChange={e => upd("menu", { ...entry.menu, [k]: e.target.value })}
                    placeholder="..."
                    style={{ ...IS, resize: "none", height: "50px", lineHeight: "1.6", fontSize: "15px", borderBottom: "1.5px solid #D0C9BE", display: "block", paddingTop: "4px" }} />
                </div>
              ))}
            </Sec>

            <HR />

            <Sec title="Oggi sono grata per">
              {entry.grata.map((g, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div style={{
                    width: "18px", height: "18px", border: "1.5px solid #C5BDB3", borderRadius: "4px",
                    flexShrink: 0, background: g.trim() ? "#1a1a1a" : "transparent", transition: "background .2s",
                  }} />
                  <input style={{ ...IS, flex: 1, fontSize: "15px" }} value={g}
                    onChange={e => upd("grata", entry.grata.map((x, j) => j === i ? e.target.value : x))}
                    placeholder={`${i + 1}.`} />
                </div>
              ))}
            </Sec>

            <HR />

            <Sec title="Pensieri di fine giornata">
              <div style={{ background: "#F5F2ED", borderRadius: "16px", padding: "18px", backgroundImage: "radial-gradient(circle,#C5BDB3 1px,transparent 1px)", backgroundSize: "18px 18px", minHeight: "200px" }}>
                <textarea value={entry.pensieri}
                  onChange={e => upd("pensieri", e.target.value)}
                  placeholder="Scrivi i tuoi pensieri di fine giornata..."
                  style={{ width: "100%", minHeight: "170px", background: "transparent", border: "none", outline: "none", resize: "none", fontFamily: "'Georgia',serif", fontSize: "16px", lineHeight: "1.8", color: "#2a2a2a", padding: 0, boxSizing: "border-box" }} />
              </div>
            </Sec>

            <button onClick={saveEntry} style={{
              width: "100%", background: "#1a1a1a", color: "#FAFAF7", border: "none",
              borderRadius: "16px", padding: "16px", fontSize: "13px",
              fontFamily: "'Courier New',monospace", cursor: "pointer",
              letterSpacing: "2px", marginTop: "10px",
            }}>💾 SALVA GIORNATA</button>
          </div>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(250,250,247,.95)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid #E8E3DC",
        paddingTop: "10px",
        paddingBottom: `calc(${safeBottom} + 6px)`,
        display: "flex", zIndex: 50,
      }}>
        {[
          { id: "diario", icon: "📋", label: "Oggi" },
          { id: "archivio", icon: "🗂️", label: "Archivio" },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setViewKey(null); }} style={{
            flex: 1, background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", padding: "4px 0",
          }}>
            <span style={{ fontSize: "24px", opacity: tab === t.id ? 1 : .35, transition: "opacity .2s" }}>{t.icon}</span>
            <span style={{ fontSize: "10px", fontFamily: "'Courier New',monospace", letterSpacing: "1px", color: tab === t.id ? "#1a1a1a" : "#AAA" }}>
              {t.label.toUpperCase()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
