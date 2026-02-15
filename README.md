# Simulated Stocks & Crypto Game

A browser-based **paper trading** game that simulates a live market for both **stocks and crypto**, letting you practice trading without real money. Prices move in real time using a lightweight market model (volatility + sentiment + news/events), and the UI includes charts, an order book, trade history, and portfolio analytics.

> No real market data is used — everything is simulated for learning and experimentation.

---

## What this project does

This app creates a “live” trading environment where you can:

- Watch multiple assets update continuously (price, % change, volume, daily high/low)
- Place simulated trades (buy/sell) and manage an open portfolio
- See a live **bid/ask spread** and a simulated **order book**
- Track your trade history and performance metrics (profit, win rate, Sharpe ratio, drawdown)
- React to simulated “market news” events that temporarily affect specific assets or entire sectors

---

## Key features

### Market watch (stocks + crypto)
- A built-in watchlist of popular **stocks** and **crypto** assets
- Each asset includes a sector tag and a volatility profile
- Prices tick frequently to mimic an active market

### Trading panel
- Buy and sell assets from a single trading panel
- Order types supported in the UI:
  - Market
  - Limit
  - Stop

**Important behavior note:** order types are simulated as part of gameplay/UI. Market orders use the bid/ask, while limit/stop orders use the entered price (this project does not attempt to implement a full matching engine).

### Interactive charting
- Price charting with selectable ranges:
  - 1D, 1W, 1M, ALL
- History is generated so charts have meaningful movement from the start (not just a flat line)

### Market events (“news”)
- Random positive/negative events appear as a news ticker
- Events can impact:
  - a single symbol, or
  - an entire sector
- Events expire automatically after a short duration

### Portfolio + analytics dashboard
- Portfolio overview: cash, positions, unrealized P/L per asset
- Equity curve tracking (portfolio value over time)
- Performance metrics, including:
  - total profit
  - total trades
  - win rate
  - Sharpe ratio
  - max drawdown

### Order book + recent trades
- A simulated order book (bids and asks) updates continuously
- Recent trades list shows your latest activity (time, side, quantity, price)

---

## How the simulation works (high level)

### Price movement model
Each asset’s price evolves using a simplified market model that blends:
- a small long-term drift component
- a mean-reversion tendency
- a random “shock” scaled by the asset’s volatility
- global market sentiment
- temporary event impact (news)

This is designed to feel “market-like” (noisy, trend changes, occasional jumps) while staying stable enough to be playable.

### Update loops (real-time feel)
The app runs multiple timed loops to keep the experience “alive,” such as:
- frequent price ticks
- less frequent market news events
- periodic order book refreshes

---

## Tech stack

- **React** (UI + state)
- **Vite** (tooling/dev server/bundling)
- **Tailwind CSS** (styling)
- **Recharts** (charts and visualizations)

---

## Project structure (what to read first)

- `src/App.jsx`  
  Contains the core simulator: market model, event logic, trading actions, portfolio updates, chart preparation, and the main UI.

- `src/index.css` + Tailwind config  
  Tailwind CSS setup and styling base.

- `public/`  
  Static assets (if any).

---

## Limitations (by design)

- This is a **simulation**, not a real broker or real-time market-data terminal.
- Limit/stop orders are represented for gameplay/UI and do not implement a full “wait until triggered then fill” exchange workflow.
- The order book is generated to look realistic, but it is not derived from real market depth.
- No accounts, backend, or persistence layer is included by default (session state resets on refresh unless you add storage).

---

## Roadmap ideas (high-impact improvements)

- Persist portfolio + trade history (LocalStorage or a small backend)
- Add true trigger-based limit/stop behavior (condition checking + simulated fills/slippage)
- Add candlesticks + indicators (VWAP, RSI, moving averages)
- Add leaderboards, achievements, and scenario modes (bull/bear/sideways presets)
- Add configurable difficulty (volatility, event frequency, spreads)

---
