import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";

/**
 * TradeQuest Web – single-file starter (React + Tailwind + Recharts)
 *
 * What you get:
 * - Fake market data (stocks + crypto) with a gentle random walk and event shocks
 * - Buy/Sell with virtual cash, positions & P/L, transaction history
 * - Missions/Levels (tutorial-style goals) with progression & badges
 * - Portfolio value chart & watchlist
 * - LocalStorage persistence
 *
 * How to use:
 * - Drop this file into a React project (Vite/Next/Create React App) as App.jsx
 * - Ensure Tailwind is set up (or remove className styles if not using Tailwind)
 * - npm i recharts
 */

// --- Helpers ---------------------------------------------------------------
const fmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const fmtCurrency = (n) => `$${fmt.format(n)}`;
const now = () => new Date().getTime();
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// --- Initial Market Universe ----------------------------------------------
const INITIAL_ASSETS = [
  { symbol: "AAPL", name: "Apple", type: "stock", price: 190 },
  { symbol: "TSLA", name: "Tesla", type: "stock", price: 240 },
  { symbol: "NVDA", name: "Nvidia", type: "stock", price: 120 },
  { symbol: "MSFT", name: "Microsoft", type: "stock", price: 430 },
  { symbol: "BTC", name: "Bitcoin", type: "crypto", price: 65000 },
  { symbol: "ETH", name: "Ethereum", type: "crypto", price: 3400 },
];

// --- Default Game State ----------------------------------------------------
const DEFAULT_STATE = {
  cash: 10000,
  positions: {}, // symbol -> { qty, avg }
  history: [], // [{ t, value }]
  trades: [], // [{ t, side, symbol, qty, price, cost }]
  level: 1,
  badges: [],
  settings: { tickMs: 1200, historyPoints: 240 },
};

const STORAGE_KEY = "tradequest_web_state_v1";
const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const saveState = (s) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
};

// --- Market Simulator ------------------------------------------------------
function useMarket(initial = INITIAL_ASSETS, tickMs = 1200) {
  const [assets, setAssets] = useState(initial);
  const [tick, setTick] = useState(0);
  const [events, setEvents] = useState([]); // {id, tEnd, symbol, impact}

  // Random news shocks occasionally
  useEffect(() => {
    const id = setInterval(() => {
      if (Math.random() < 0.18) {
        const pick = assets[Math.floor(Math.random() * assets.length)];
        const impact = (Math.random() * 0.08 + 0.02) * (Math.random() < 0.5 ? -1 : 1);
        const dur = Math.floor(6 + Math.random() * 12); // ticks
        const evt = {
          id: crypto.randomUUID(),
          symbol: pick.symbol,
          impact,
          tEnd: tick + dur,
          headline:
            impact > 0
              ? `${pick.name} positive catalyst: guidance surprise`
              : `${pick.name} negative headline: regulatory concern`,
        };
        setEvents((e) => [evt, ...e].slice(0, 6));
      }
    }, tickMs * 3);
    return () => clearInterval(id);
  }, [assets, tickMs]);

  // Price evolution (random walk + event drift)
  useEffect(() => {
    const id = setInterval(() => {
      setAssets((prev) =>
        prev.map((a) => {
          const baseDrift = (a.type === "crypto" ? 0.003 : 0.001) * (Math.random() - 0.5);
          const shock = events.reduce((acc, e) => (e.symbol === a.symbol ? acc + e.impact : acc), 0);
          // small mean reversion to initial price
          const anchor = (a.price - a._startPrice) / (a._startPrice || a.price);
          const revert = -0.002 * anchor;
          const pct = clamp(baseDrift + shock * 0.05 + revert, -0.08, 0.08);
          const newPrice = Math.max(0.01, a.price * (1 + pct));
          return { ...a, price: newPrice, _startPrice: a._startPrice ?? a.price };
        })
      );
      setTick((t) => t + 1);
      // purge expired events
      setEvents((ev) => ev.filter((e) => e.tEnd > tick + 1));
    }, tickMs);
    return () => clearInterval(id);
  }, [events, tickMs]);

  return { assets, tick, events };
}

// --- Missions --------------------------------------------------------------
const MISSIONS = [
  {
    id: 1,
    title: "First Steps",
    text: "Make your first purchase.",
    check: (s) => Object.keys(s.positions).length > 0,
    reward: "Badge: First Trade",
  },
  {
    id: 2,
    title: "Don't Put All Eggs in One Basket",
    text: "Hold at least 3 different assets.",
    check: (s) => Object.keys(s.positions).length >= 3,
    reward: "Badge: Diversifier",
  },
  {
    id: 3,
    title: "Green Day",
    text: "Reach a total equity of $10,500.",
    check: (s, equity) => equity >= 10500,
    reward: "Badge: Profit Seeker",
  },
  {
    id: 4,
    title: "Storm Rider",
    text: "End a 60-tick session without a 20% drawdown.",
    // Evaluate over history
    check: (s, equity, history) => {
      if (history.length < 60) return false;
      const recent = history.slice(-60);
      const peak = Math.max(...recent.map((h) => h.value));
      const trough = Math.min(...recent.map((h) => h.value));
      const dd = (peak - trough) / peak;
      return dd < 0.2;
    },
    reward: "Badge: Risk Manager",
  },
];

// --- App -------------------------------------------------------------------
export default function App() {
  // Load or init game state
  const saved = loadState();
  const [state, setState] = useState(saved ?? DEFAULT_STATE);
  const { tick, events, assets } = useMarket(INITIAL_ASSETS, state.settings.tickMs);
  const [selected, setSelected] = useState(INITIAL_ASSETS[0].symbol);
  const [qty, setQty] = useState(1);

  // Derived: prices map & portfolio equity
  const priceMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.symbol, a.price])), [assets]);

  const equity = useMemo(() => {
    const posVal = Object.entries(state.positions).reduce((sum, [sym, p]) => sum + (priceMap[sym] || 0) * p.qty, 0);
    return state.cash + posVal;
  }, [state.positions, state.cash, priceMap]);

  // History for equity curve
  useEffect(() => {
    setState((s) => {
      const nextHist = [...s.history, { t: now(), value: equity }];
      const cap = s.settings.historyPoints;
      return { ...s, history: nextHist.slice(-cap) };
    });
  }, [equity]);

  // Persist
  useEffect(() => { saveState(state); }, [state]);

  // Level/Mission progression
  useEffect(() => {
    const currentMission = MISSIONS.find((m) => m.id === state.level);
    if (!currentMission) return;
    const ok = currentMission.check(state, equity, state.history);
    if (ok) {
      setState((s) => ({
        ...s,
        level: s.level + 1,
        badges: s.badges.includes(currentMission.reward) ? s.badges : [...s.badges, currentMission.reward],
      }));
    }
  }, [state.positions, state.cash, state.history, equity, state.level]);

  // Trading actions
  const placeTrade = (side) => {
    const sym = selected;
    const price = priceMap[sym] || 0;
    const q = Math.max(0, Math.floor(qty));
    if (!q) return;

    setState((s) => {
      const cost = price * q;
      let cash = s.cash;
      const pos = { ...(s.positions[sym] || { qty: 0, avg: price }) };

      if (side === "buy") {
        if (cash < cost) return s; // not enough
        cash -= cost;
        const newQty = pos.qty + q;
        const newAvg = (pos.avg * pos.qty + price * q) / newQty;
        const newPos = { qty: newQty, avg: newAvg };
        return {
          ...s,
          cash,
          positions: { ...s.positions, [sym]: newPos },
          trades: [{ t: now(), side, symbol: sym, qty: q, price, cost: -cost }, ...s.trades].slice(0, 200),
        };
      } else {
        // sell
        if (pos.qty < q) return s; // not enough shares
        const newQty = pos.qty - q;
        cash += cost;
        const positions = { ...s.positions };
        if (newQty === 0) delete positions[sym]; else positions[sym] = { qty: newQty, avg: pos.avg };
        return {
          ...s,
          cash,
          positions,
          trades: [{ t: now(), side, symbol: sym, qty: q, price, cost }, ...s.trades].slice(0, 200),
        };
      }
    });
  };

  const resetGame = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ ...DEFAULT_STATE });
  };

  // Tables
  const positionsRows = Object.entries(state.positions).map(([sym, p]) => {
    const price = priceMap[sym] || 0;
    const value = price * p.qty;
    const pnl = value - p.avg * p.qty;
    const pnlPct = p.avg ? (price - p.avg) / p.avg : 0;
    return { sym, qty: p.qty, avg: p.avg, price, value, pnl, pnlPct };
  });

  const selectedAsset = assets.find((a) => a.symbol === selected) || assets[0];

  const chartData = useMemo(() => {
    // Build a merged history for the selected symbol price + equity curve
    // We'll approximate price history by backfilling from current price with a light random walk
    const n = Math.max(30, state.history.length);
    const seed = selectedAsset.price;
    let price = seed;
    const arr = [];
    for (let i = n - 1; i >= 0; i--) {
      const t = now() - i * state.settings.tickMs;
      price *= 1 + (Math.random() - 0.5) * 0.01;
      arr.push({ t, price, equity: state.history[state.history.length - (n - i)]?.value ?? equity });
    }
    return arr;
  }, [selectedAsset.price, state.history, state.settings.tickMs, equity]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur bg-slate-900/70 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="text-2xl font-bold tracking-tight">TradeQuest</div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="px-2 py-1 rounded-full bg-slate-800/80">Level {state.level}</span>
            <span className="px-2 py-1 rounded-full bg-slate-800/80">Cash: {fmtCurrency(state.cash)}</span>
            <span className="px-2 py-1 rounded-full bg-slate-800/80">Equity: {fmtCurrency(equity)}</span>
            <button onClick={resetGame} className="ml-2 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white">Reset</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 grid md:grid-cols-12 gap-4 py-4">
        {/* Left: Watchlist */}
        <section className="md:col-span-3 space-y-3">
          <div className="p-3 bg-slate-900/70 rounded-2xl shadow border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Watchlist</h2>
              <span className="text-xs text-slate-400">tick #{tick}</span>
            </div>
            <ul className="space-y-1">
              {assets.map((a) => {
                const isSel = a.symbol === selected;
                return (
                  <li key={a.symbol}>
                    <button
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800/60 ${isSel ? "bg-slate-800" : ""}`}
                      onClick={() => setSelected(a.symbol)}
                    >
                      <div className="text-left">
                        <div className="font-medium">{a.symbol} <span className="text-xs text-slate-400">{a.type}</span></div>
                        <div className="text-xs text-slate-400">{a.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{fmtCurrency(a.price)}</div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="p-3 bg-slate-900/70 rounded-2xl shadow border border-slate-800">
            <h2 className="text-lg font-semibold mb-2">News & Events</h2>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {events.length === 0 && <div className="text-sm text-slate-400">Quiet markets... for now.</div>}
              {events.map((e) => (
                <div key={e.id} className="p-2 rounded-xl bg-slate-800/60">
                  <div className="text-xs text-slate-400">Impact until tick {e.tEnd}</div>
                  <div className={`text-sm ${e.impact > 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {e.headline}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Center: Chart */}
        <section className="md:col-span-6 p-3 bg-slate-900/70 rounded-2xl shadow border border-slate-800">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-semibold">{selected} Chart</h2>
              <div className="text-xs text-slate-400">Price (left) & Equity (right)</div>
            </div>
            <div className="text-sm text-slate-400">{selectedAsset.name}</div>
          </div>
          <div className="h-72 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="t" tickFormatter={(v) => new Date(v).toLocaleTimeString()} stroke="#64748b" />
                <YAxis yAxisId="left" stroke="#64748b" domain={["auto", "auto"]} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" domain={["auto", "auto"]} />
                <Tooltip labelFormatter={(v) => new Date(v).toLocaleTimeString()} formatter={(v, n) => n === "equity" ? [fmtCurrency(v), "Equity"] : [fmtCurrency(v), "Price"]} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="price" stroke="#60a5fa" dot={false} name={`${selected} Price`} />
                <Line yAxisId="right" type="monotone" dataKey="equity" stroke="#34d399" dot={false} name="Portfolio Equity" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Right: Trade & Missions */}
        <section className="md:col-span-3 space-y-3">
          <div className="p-3 bg-slate-900/70 rounded-2xl shadow border border-slate-800">
            <h2 className="text-lg font-semibold mb-2">Trade</h2>
            <div className="text-sm mb-2">Selected: <span className="font-semibold">{selected}</span> at <span className="font-semibold">{fmtCurrency(priceMap[selected] || 0)}</span></div>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="number"
                value={qty}
                min={1}
                onChange={(e) => setQty(parseInt(e.target.value || 1))}
                className="w-24 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none"
              />
              <button onClick={() => placeTrade("buy")} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500">Buy</button>
              <button onClick={() => placeTrade("sell")} className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500">Sell</button>
            </div>
            <div className="text-xs text-slate-400">Tip: Complete missions to unlock badges and level up.</div>
          </div>

          <div className="p-3 bg-slate-900/70 rounded-2xl shadow border border-slate-800">
            <h2 className="text-lg font-semibold mb-2">Mission</h2>
            {(() => {
              const m = MISSIONS.find((mm) => mm.id === state.level);
              if (!m) return <div className="text-sm">All missions complete. You beat the tutorial! 🎉</div>;
              const ok = m.check(state, equity, state.history);
              return (
                <div>
                  <div className="text-sm font-medium">{m.title}</div>
                  <div className="text-sm text-slate-300">{m.text}</div>
                  <div className={`mt-2 inline-block text-xs px-2 py-1 rounded-full ${ok ? "bg-emerald-700" : "bg-slate-800"}`}>
                    {ok ? "Ready to level up — will advance automatically" : "In progress"}
                  </div>
                  <div className="text-xs text-slate-400 mt-2">Reward: {m.reward}</div>
                </div>
              );
            })()}
          </div>

          <div className="p-3 bg-slate-900/70 rounded-2xl shadow border border-slate-800">
            <h2 className="text-lg font-semibold mb-2">Badges</h2>
            <div className="flex flex-wrap gap-2">
              {state.badges.length === 0 && <span className="text-sm text-slate-400">No badges yet.</span>}
              {state.badges.map((b) => (
                <span key={b} className="text-xs px-2 py-1 rounded-full bg-indigo-700/60 border border-indigo-600">{b}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom: Portfolio & Trades */}
        <section className="md:col-span-12 grid lg:grid-cols-2 gap-4">
          <div className="p-3 bg-slate-900/70 rounded-2xl shadow border border-slate-800">
            <h2 className="text-lg font-semibold mb-2">Portfolio</h2>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="text-left p-2">Symbol</th>
                    <th className="text-right p-2">Qty</th>
                    <th className="text-right p-2">Avg</th>
                    <th className="text-right p-2">Price</th>
                    <th className="text-right p-2">Value</th>
                    <th className="text-right p-2">P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {positionsRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-3 text-slate-400">No positions yet. Buy something from the watchlist to get started.</td>
                    </tr>
                  )}
                  {positionsRows.map((r) => (
                    <tr key={r.sym} className="border-t border-slate-800">
                      <td className="p-2 font-medium">{r.sym}</td>
                      <td className="p-2 text-right">{r.qty}</td>
                      <td className="p-2 text-right">{fmtCurrency(r.avg)}</td>
                      <td className="p-2 text-right">{fmtCurrency(r.price)}</td>
                      <td className="p-2 text-right">{fmtCurrency(r.value)}</td>
                      <td className={`p-2 text-right ${r.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtCurrency(r.pnl)} ({(r.pnlPct * 100).toFixed(2)}%)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-slate-900/70 rounded-2xl shadow border border-slate-800">
            <h2 className="text-lg font-semibold mb-2">Trades</h2>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Side</th>
                    <th className="text-left p-2">Symbol</th>
                    <th className="text-right p-2">Qty</th>
                    <th className="text-right p-2">Price</th>
                    <th className="text-right p-2">Cash</th>
                  </tr>
                </thead>
                <tbody>
                  {state.trades.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-3 text-slate-400">No trades yet.</td>
                    </tr>
                  )}
                  {state.trades.map((t, i) => (
                    <tr key={i} className="border-t border-slate-800">
                      <td className="p-2">{new Date(t.t).toLocaleTimeString()}</td>
                      <td className={`p-2 font-medium ${t.side === "buy" ? "text-emerald-400" : "text-rose-400"}`}>{t.side}</td>
                      <td className="p-2">{t.symbol}</td>
                      <td className="p-2 text-right">{t.qty}</td>
                      <td className="p-2 text-right">{fmtCurrency(t.price)}</td>
                      <td className={`p-2 text-right ${t.cost >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtCurrency(t.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-6 text-xs text-slate-500">
        Built with ❤️ using React + Recharts. All prices are simulated.
      </footer>
    </div>
  );
}
