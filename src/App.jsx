import React, { useEffect, useMemo, useRef, useState } from "react";
import { HashRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";

// ----------------------------- Utils: seed, RNG, shuffle -----------------------------
function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0];
}
function mulberry32(a) {
  return function () {
    var t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngFromSeed(seed) {
  const [n] = cyrb128(String(seed));
  return mulberry32(n);
}
function shuffleWithSeed(arr, seed) {
  const rng = rngFromSeed(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ----------------------------- Demo Deck (set01) -----------------------------
// En tu proyecto final esto leerá: public/decks/set01.deck.json
const DECK_SET01 = [
  "El gallo", "El diablo", "La dama", "El catrín", "El paraguas", "La sirena", "La escalera", "La botella",
  "El barril", "El árbol", "El melón", "El valiente", "El gorrito", "La muerte", "La pera", "La bandera",
  "El bandolón", "El violoncello", "La garza", "El pájaro", "La mano", "La bota", "La luna", "El cotorro",
  "El borracho", "El negrito", "El corazón", "La sandía", "El tambor", "El camarón", "Las jaras", "El músico",
  "La araña", "El soldado", "La estrella", "El cazo", "El mundo", "El apache", "El nopal", "El alacrán",
  "La rosa", "La calavera", "La campana", "El cantarito", "El venado", "El sol", "La corona", "La chalupa",
  "El pino", "El pescado", "La palma", "La maceta", "El arpa", "La rana"
];

// ----------------------------- LocalStorage helpers -----------------------------
function lsGet(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ----------------------------- Layout -----------------------------
function Shell({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 backdrop-blur bg-slate-900/70 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🃏</span>
          <h1 className="text-xl font-semibold tracking-tight">Lotería Makako</h1>
          <nav className="ml-auto flex items-center gap-2 text-sm">
            <Link className="hover:underline" to="/">Caller</Link>
            <Link className="hover:underline" to="/admin">Admin</Link>
            <a className="hover:underline" href="#/player">Player</a>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">{children}</main>
      <footer className="max-w-6xl mx-auto p-4 text-xs text-slate-400">Seeded • Persistente • SPA</footer>
    </div>
  );
}

// ----------------------------- Caller -----------------------------
function Caller() {
  const [seed, setSeed] = useState(() => lsGet("lm:seed", "20250928"));
  const [index, setIndex] = useState(() => lsGet("lm:index", 0));
  const [shuffled, setShuffled] = useState(() => shuffleWithSeed(DECK_SET01, seed));
  const [history, setHistory] = useState(() => lsGet("lm:history", []));

  useEffect(() => {
    const s = shuffleWithSeed(DECK_SET01, seed);
    setShuffled(s);
    setIndex(lsGet(`lm:index:${seed}`, 0));
    setHistory(lsGet(`lm:history:${seed}`, []));
    lsSet("lm:seed", seed);
  }, [seed]);

  useEffect(() => {
    lsSet("lm:index", index);
    lsSet(`lm:index:${seed}`, index);
  }, [index, seed]);

  useEffect(() => {
    lsSet("lm:history", history);
    lsSet(`lm:history:${seed}`, history);
  }, [history, seed]);

  const current = shuffled[index] || "";

  const next = () => {
    if (index >= shuffled.length) return;
    const card = shuffled[index];
    setHistory((h) => [...h, card]);
    setIndex((i) => Math.min(i + 1, shuffled.length));
  };
  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const restart = () => { setIndex(0); setHistory([]); };

  // Shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space") { e.preventDefault(); next(); }
      if (e.code === "ArrowLeft") { prev(); }
      if (e.code === "ArrowRight") { next(); }
      if (e.key?.toLowerCase() === "f") { toggleFullscreen(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
    else document.exitFullscreen?.();
  };

  return (
    <Shell>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm opacity-80">Semilla</label>
            <input value={seed} onChange={(e)=>setSeed(e.target.value)} className="px-2 py-1 bg-slate-900 border border-slate-700 rounded" />
            <button onClick={restart} className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500">Reiniciar</button>
            <button onClick={toggleFullscreen} className="px-3 py-1 rounded bg-slate-800 border border-slate-700">Fullscreen (F)</button>
          </div>

          <div className="aspect-video rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 flex items-center justify-center text-center p-6 shadow-lg">
            {index < shuffled.length ? (
              <div>
                <div className="text-6xl font-bold mb-2">{current}</div>
                <div className="text-slate-400">Carta {index + 1} / {shuffled.length}</div>
              </div>
            ) : (
              <div className="text-4xl font-bold">¡Lotería terminada! 🎉</div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button onClick={prev} className="px-4 py-2 rounded-2xl bg-slate-800 border border-slate-700">← Anterior</button>
            <button onClick={next} className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500">Siguiente →</button>
            <span className="ml-auto text-sm text-slate-400">Espacio / Flechas / F</span>
          </div>
        </div>

        <aside className="md:col-span-1">
          <h3 className="text-sm uppercase tracking-wider text-slate-400 mb-2">Historial</h3>
          <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-slate-800">
            {history.length === 0 ? (
              <div className="p-4 text-slate-400">Aún no hay cartas cantadas.</div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {history.map((h, i) => (
                  <li key={i} className="p-3 text-sm">{i + 1}. {h}</li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </Shell>
  );
}

// ----------------------------- Player -----------------------------
function useQuery() {
  const { search, hash } = useLocation();
  // soporta tanto #/player?code=...&seed=... como #/player&code=...&seed=...
  const qs = search || (hash.includes("?") ? hash.slice(hash.indexOf("?")) : "");
  return useMemo(() => new URLSearchParams(qs), [qs]);
}
function Player() {
  const q = useQuery();
  const code = q.get("code") || "guest";
  const seed = q.get("seed") || "20250928";
  const shuffled = useMemo(() => shuffleWithSeed(DECK_SET01, seed + ":" + code), [seed, code]);
  const grid = shuffled.slice(0, 16);
  const key = `lm:player:${code}:${seed}`;
  const [beans, setBeans] = useState(() => lsGet(key, {}));

  useEffect(() => { lsSet(key, beans); }, [beans]);

  const toggle = (idx) => setBeans((b) => ({ ...b, [idx]: !b[idx] }));

  return (
    <Shell>
      <div className="flex items-center gap-3 mb-4">
        <div className="text-sm text-slate-400">Code: <span className="text-slate-200 font-mono">{code}</span></div>
        <div className="text-sm text-slate-400">Seed: <span className="text-slate-200 font-mono">{seed}</span></div>
        <button onClick={()=>setBeans({})} className="ml-auto px-3 py-1 rounded bg-slate-800 border border-slate-700">Limpiar frijolitos</button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {grid.map((name, i) => (
          <button key={i} onClick={()=>toggle(i)} className={`relative aspect-square rounded-2xl border border-slate-700 p-2 text-center flex items-center justify-center text-sm font-medium transition ${beans[i] ? "bg-emerald-700/40 ring-2 ring-emerald-400" : "bg-slate-900 hover:bg-slate-800"}`}>
            <span className="px-2">{name}</span>
            {beans[i] && <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-400/90"></span>}
          </button>
        ))}
      </div>
    </Shell>
  );
}

// ----------------------------- Admin -----------------------------
function downloadCSV(filename, rows) {
  const processRow = (row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',');
  const csv = ["name,code,link"].concat(rows.map(processRow)).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1500);
}
function Admin() {
  const [seed, setSeed] = useState(() => lsGet("lm:admin:seed", "20250928"));
  const [names, setNames] = useState(() => lsGet("lm:admin:names", "Juan\nMaría\nKarla\nPepe"));
  useEffect(()=>{ lsSet("lm:admin:seed", seed); }, [seed]);
  useEffect(()=>{ lsSet("lm:admin:names", names); }, [names]);

  const list = names.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const rows = list.map((n) => {
    const code = (Math.abs(cyrb128(n + ":" + seed)[0]).toString(36)).slice(0,6);
    const link = `${location.origin}${location.pathname}#/player?code=${code}&seed=${encodeURIComponent(seed)}`;
    return [n, code, link];
  });

  const copyAll = async () => {
    const txt = rows.map(r => r.join("\t")).join("\n");
    try { await navigator.clipboard.writeText(txt); alert("Copiado ✔"); } catch { alert("No se pudo copiar"); }
  };

  return (
    <Shell>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Generador de links</h2>
          <label className="block text-sm mb-1 text-slate-400">Semilla</label>
          <input value={seed} onChange={(e)=>setSeed(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded mb-3" />
          <label className="block text-sm mb-1 text-slate-400">Nombres (uno por línea)</label>
          <textarea value={names} onChange={(e)=>setNames(e.target.value)} rows={10} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded"></textarea>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">Resultados</h2>
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60">
                <tr>
                  <th className="py-2 px-3 text-left">Nombre</th>
                  <th className="py-2 px-3 text-left">Code</th>
                  <th className="py-2 px-3 text-left">Link</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([n,c,l], i) => (
                  <tr key={i} className="border-t border-slate-800">
                    <td className="py-2 px-3">{n}</td>
                    <td className="py-2 px-3 font-mono">{c}</td>
                    <td className="py-2 px-3"><a className="text-indigo-400 hover:underline break-all" href={l}>{l}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex gap-2">
            <button onClick={copyAll} className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500">Copiar todos</button>
            <button onClick={()=>downloadCSV(`loteria_links_${seed}.csv`, rows)} className="px-3 py-2 rounded bg-slate-800 border border-slate-700">Descargar CSV</button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ----------------------------- App -----------------------------
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Caller/>} />
        <Route path="/player" element={<Player/>} />
        <Route path="/admin" element={<Admin/>} />
        <Route path="*" element={<NotFound/>} />
      </Routes>
    </HashRouter>
  );
}
function NotFound(){
  const nav = useNavigate();
  useEffect(()=>{ const t=setTimeout(()=>nav("/"), 1000); return ()=>clearTimeout(t); },[]);
  return <Shell><div className="p-6">Redirigiendo…</div></Shell>;
}
