import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, ComposedChart, ReferenceLine
} from "recharts";

// ==================== REAL MARKET SIMULATION ENGINE ====================

// Market data structures
const MARKET_SYMBOLS = {
  STOCKS: [
    { symbol: "AAPL", name: "Apple Inc.", sector: "Technology", volatility: 0.22, basePrice: 182.63 },
    { symbol: "MSFT", name: "Microsoft", sector: "Technology", volatility: 0.20, basePrice: 407.54 },
    { symbol: "TSLA", name: "Tesla Inc.", sector: "Automotive", volatility: 0.45, basePrice: 238.59 },
    { symbol: "NVDA", name: "NVIDIA Corp.", sector: "Technology", volatility: 0.38, basePrice: 118.11 },
    { symbol: "JPM", name: "JPMorgan Chase", sector: "Financial", volatility: 0.25, basePrice: 178.23 },
    { symbol: "AMZN", name: "Amazon.com", sector: "E-Commerce", volatility: 0.28, basePrice: 145.18 },
    { symbol: "GOOGL", name: "Alphabet", sector: "Technology", volatility: 0.24, basePrice: 142.56 },
    { symbol: "META", name: "Meta Platforms", sector: "Technology", volatility: 0.32, basePrice: 332.42 }
  ],
  CRYPTO: [
    { symbol: "BTC", name: "Bitcoin", sector: "Cryptocurrency", volatility: 0.55, basePrice: 65120.48 },
    { symbol: "ETH", name: "Ethereum", sector: "Cryptocurrency", volatility: 0.48, basePrice: 3420.65 },
    { symbol: "ADA", name: "Cardano", sector: "Cryptocurrency", volatility: 0.62, basePrice: 0.482 },
    { symbol: "SOL", name: "Solana", sector: "Cryptocurrency", volatility: 0.58, basePrice: 102.34 },
    { symbol: "BNB", name: "Binance Coin", sector: "Cryptocurrency", volatility: 0.42, basePrice: 352.18 },
    { symbol: "XRP", name: "Ripple", sector: "Cryptocurrency", volatility: 0.52, basePrice: 0.623 }
  ]
};

const SECTOR_COLORS = {
  Technology: "#3B82F6",
  Automotive: "#EF4444",
  Financial: "#10B981",
  Cryptocurrency: "#F59E0B",
  "E-Commerce": "#8B5CF6"
};

// Market events that affect prices
const MARKET_EVENTS = {
  POSITIVE: [
    "Strong earnings report exceeds expectations",
    "New product launch receives positive reception",
    "FDA approval for breakthrough treatment",
    "Major partnership announcement",
    "Market expansion into new regions",
    "Dividend increase announced",
    "Analyst upgrade to strong buy",
    "Successful clinical trial results"
  ],
  NEGATIVE: [
    "Earnings miss estimates",
    "Regulatory investigation launched",
    "CEO resigns unexpectedly",
    "Data breach affects millions",
    "Supply chain disruptions",
    "Competitor gains market share",
    "Economic downturn concerns",
    "Product recall announced"
  ],
  SECTOR_WIDE: [
    "Tech sector rally on AI optimism",
    "Financial stocks decline on rate fears",
    "Crypto market surge on institutional adoption",
    "Automotive sector hit by supply issues",
    "E-commerce stocks rise on holiday sales",
    "Market-wide selloff on recession fears"
  ]
};

// Utility functions
const fmtCurrency = (n) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPercent = (n) => `${(n * 100).toFixed(2)}%`;
const fmtNumber = (n) => n.toLocaleString();
const now = () => Date.now();
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Realistic price generator using Geometric Brownian Motion with market microstructure
function generateRealisticPrice(previousPrice, volatility, marketSentiment, eventImpact = 0, timeStep = 1/252/390) {
  const drift = 0.0001 + (marketSentiment * 0.0003); // Base drift + sentiment influence
  const volatilityFactor = volatility * Math.sqrt(timeStep); // Adjusted volatility
  const randomShock = (Math.random() - 0.5) * 2; // Random shock between -1 and 1
  
  // Combine all factors
  const priceChange = drift + volatilityFactor * randomShock + eventImpact;
  const newPrice = previousPrice * Math.exp(priceChange);
  
  return Math.max(0.01, newPrice); // Prevent negative prices
}

// Custom tooltip component
const MarketTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 p-3 border border-gray-600 rounded-lg shadow-xl">
        <p className="text-gray-300 text-sm">{new Date(label).toLocaleString()}</p>
        <p className="text-blue-400 font-bold text-lg">{fmtCurrency(payload[0].value)}</p>
        {payload[0].payload.volume && (
          <p className="text-gray-400 text-sm">Volume: {fmtNumber(payload[0].payload.volume)}</p>
        )}
      </div>
    );
  }
  return null;
};

// ==================== MAIN TRADING SIMULATOR ====================

export default function ProfessionalTradingSimulator() {
  // State management
  const [marketData, setMarketData] = useState(() => {
    const allAssets = [...MARKET_SYMBOLS.STOCKS, ...MARKET_SYMBOLS.CRYPTO];
    return allAssets.reduce((acc, asset) => {
      // Generate 30 days of historical data for proper charting
      const initialHistory = [];
      const days = 30;
      const pointsPerDay = 390; // Trading minutes
      const totalPoints = days * pointsPerDay;
      
      let currentPrice = asset.basePrice;
      for (let i = 0; i < totalPoints; i++) {
        // Generate realistic historical price
        const timeStep = 1/252/pointsPerDay;
        const randomShock = (Math.random() - 0.5) * 2;
        const priceChange = 0.0001 + asset.volatility * Math.sqrt(timeStep) * randomShock;
        currentPrice = currentPrice * Math.exp(priceChange);
        
        initialHistory.push({
          price: currentPrice,
          volume: randomInt(100000, 500000),
          timestamp: now() - (totalPoints - i) * 60000 // 1 minute intervals
        });
      }
      
      acc[asset.symbol] = {
        ...asset,
        price: currentPrice,
        history: initialHistory,
        dailyHigh: Math.max(...initialHistory.slice(-390).map(h => h.price)),
        dailyLow: Math.min(...initialHistory.slice(-390).map(h => h.price)),
        change: 0,
        changePercent: 0,
        volume: initialHistory.slice(-390).reduce((sum, h) => sum + h.volume, 0),
        bid: currentPrice * 0.9995,
        ask: currentPrice * 1.0005,
        spread: currentPrice * 0.001
      };
      return acc;
    }, {});
  });

  const [marketStatus, setMarketStatus] = useState({
    sentiment: 0, // -1 to 1
    events: [],
    isMarketOpen: true,
    lastUpdate: now(),
    marketHours: {
      open: new Date().setHours(9, 30, 0, 0),
      close: new Date().setHours(16, 0, 0, 0)
    }
  });

  const [portfolio, setPortfolio] = useState({
    cash: 100000,
    positions: {},
    equityHistory: Array(390).fill(0).map((_, i) => ({
      value: 100000,
      timestamp: now() - (390 - i) * 60000
    })),
    totalValue: 100000,
    realizedPnL: 0
  });

  const [tradingState, setTradingState] = useState({
    selectedSymbol: "AAPL",
    quantity: "",
    activeTab: "chart",
    chartRange: "1D",
    orderType: "market",
    limitPrice: "",
    stopPrice: ""
  });

  const [performanceMetrics, setPerformanceMetrics] = useState({
    totalTrades: 0,
    totalProfit: 0,
    bestTrade: 0,
    worstTrade: 0,
    winRate: 0,
    sharpeRatio: 0,
    maxDrawdown: 0
  });

  const [orderBook, setOrderBook] = useState({
    bids: [],
    asks: []
  });

  const [tradeHistory, setTradeHistory] = useState([]);

  // Refs for interval management
  const marketIntervalRef = useRef();
  const eventIntervalRef = useRef();
  const orderBookIntervalRef = useRef();

  // Get current asset
  const currentAsset = marketData[tradingState.selectedSymbol];

  // Generate order book data
  const generateOrderBook = useCallback((price) => {
    const bids = [];
    const asks = [];
    const spread = price * 0.0005; // 0.05% spread
    
    // Generate bids (buy orders)
    for (let i = 1; i <= 15; i++) {
      const bidPrice = price - (spread * i);
      bids.push({
        price: bidPrice,
        size: randomInt(10, 1000)
      });
    }
    
    // Generate asks (sell orders)
    for (let i = 1; i <= 15; i++) {
      const askPrice = price + (spread * i);
      asks.push({
        price: askPrice,
        size: randomInt(10, 1000)
      });
    }
    
    return { bids, asks };
  }, []);

  // Market simulation engine
  useEffect(() => {
    // Clear any existing intervals
    if (marketIntervalRef.current) clearInterval(marketIntervalRef.current);
    if (eventIntervalRef.current) clearInterval(eventIntervalRef.current);
    if (orderBookIntervalRef.current) clearInterval(orderBookIntervalRef.current);

    // Market data updates (every 500ms for realistic trading)
    marketIntervalRef.current = setInterval(() => {
      setMarketData(prev => {
        const newData = { ...prev };
        let totalSentiment = 0;

        Object.keys(newData).forEach(symbol => {
          const asset = newData[symbol];
          const eventImpact = marketStatus.events.reduce((impact, event) => {
            if (event.symbols.includes(symbol) || event.sector === asset.sector) {
              return impact + event.impact;
            }
            return impact;
          }, 0);

          const newPrice = generateRealisticPrice(
            asset.price,
            asset.volatility * 0.7, // Reduced volatility for stability
            marketStatus.sentiment * 0.5, // Reduced sentiment impact
            eventImpact * 0.5, // Reduced event impact
            1/252/390/2 // 500ms intervals
          );

          // Update bid/ask prices
          const spread = newPrice * 0.0003; // Tighter spread
          const bid = newPrice - spread;
          const ask = newPrice + spread;

          // Update asset data
          newData[symbol] = {
            ...asset,
            price: newPrice,
            history: [
              ...asset.history.slice(1),
              {
                price: newPrice,
                volume: randomInt(5000, 25000),
                timestamp: now()
              }
            ],
            dailyHigh: Math.max(asset.dailyHigh, newPrice),
            dailyLow: Math.min(asset.dailyLow, newPrice),
            change: newPrice - asset.history[asset.history.length - 390]?.price || 0,
            changePercent: ((newPrice - asset.history[asset.history.length - 390]?.price) / asset.history[asset.history.length - 390]?.price) * 100 || 0,
            volume: asset.volume + randomInt(5000, 25000),
            bid,
            ask,
            spread: ask - bid
          };

          totalSentiment += newPrice > asset.price ? 0.005 : -0.005;
        });

        return newData;
      });

      // Update portfolio value
      setPortfolio(prev => {
        const positionsValue = Object.entries(prev.positions).reduce((total, [symbol, position]) => {
          return total + (marketData[symbol]?.price || 0) * position.quantity;
        }, 0);

        const totalValue = prev.cash + positionsValue;

        return {
          ...prev,
          totalValue,
          equityHistory: [
            ...prev.equityHistory.slice(1),
            { value: totalValue, timestamp: now() }
          ]
        };
      });

      setMarketStatus(prev => ({
        ...prev,
        lastUpdate: now(),
        sentiment: clamp(prev.sentiment + (Math.random() - 0.5) * 0.01, -1, 1)
      }));

    }, 500); // 500ms updates for more stable movement

    // Market events (every 20-40 seconds)
    eventIntervalRef.current = setInterval(() => {
      if (Math.random() < 0.2) { // 20% chance of event
        const eventType = Math.random() < 0.6 ? "POSITIVE" : "NEGATIVE";
        const events = MARKET_EVENTS[eventType];
        const eventMessage = events[randomInt(0, events.length - 1)];
        
        const impact = eventType === "POSITIVE" ? 
          randomInt(1, 5) / 1000 : 
          randomInt(-5, -1) / 1000;

        // Determine affected symbols
        let affectedSymbols = [];
        let sector = null;

        if (Math.random() < 0.4) { // Sector-wide event
          const sectors = Object.keys(SECTOR_COLORS);
          sector = sectors[randomInt(0, sectors.length - 1)];
          affectedSymbols = Object.values(marketData)
            .filter(asset => asset.sector === sector)
            .map(asset => asset.symbol);
        } else { // Single asset event
          const symbols = Object.keys(marketData);
          affectedSymbols = [symbols[randomInt(0, symbols.length - 1)]];
        }

        const newEvent = {
          id: Math.random().toString(36).substr(2, 9),
          message: eventMessage,
          impact,
          type: eventType.toLowerCase(),
          symbols: affectedSymbols,
          sector,
          timestamp: now(),
          duration: randomInt(15, 45) // Event lasts 15-45 seconds
        };

        setMarketStatus(prev => ({
          ...prev,
          events: [newEvent, ...prev.events.slice(0, 4)] // Keep last 5 events
        }));

        // Auto-remove event after duration
        setTimeout(() => {
          setMarketStatus(prev => ({
            ...prev,
            events: prev.events.filter(e => e.id !== newEvent.id)
          }));
        }, newEvent.duration * 1000);
      }
    }, randomInt(20000, 40000));

    // Order book updates (every 1000ms)
    orderBookIntervalRef.current = setInterval(() => {
      if (currentAsset) {
        const newOrderBook = generateOrderBook(currentAsset.price);
        setOrderBook(newOrderBook);
      }
    }, 1000);

    return () => {
      clearInterval(marketIntervalRef.current);
      clearInterval(eventIntervalRef.current);
      clearInterval(orderBookIntervalRef.current);
    };
  }, [marketData, currentAsset, generateOrderBook]);

  // Trading functions
  const executeTrade = (action) => {
    const quantity = parseInt(tradingState.quantity);
    if (quantity <= 0) return;

    const asset = marketData[tradingState.selectedSymbol];
    if (!asset) return;

    let tradePrice;
    if (tradingState.orderType === "market") {
      tradePrice = action === "buy" ? asset.ask : asset.bid;
    } else if (tradingState.orderType === "limit") {
      tradePrice = parseFloat(tradingState.limitPrice);
      if (isNaN(tradePrice)) return;
    } else {
      // Stop order
      tradePrice = parseFloat(tradingState.stopPrice);
      if (isNaN(tradePrice)) return;
    }

    const tradeValue = tradePrice * quantity;

    if (action === 'buy') {
      if (tradeValue > portfolio.cash) {
        alert("Insufficient funds!");
        return;
      }

      setPortfolio(prev => {
        const currentPosition = prev.positions[tradingState.selectedSymbol] || { 
          quantity: 0, 
          averageCost: 0,
          totalInvested: 0 
        };

        const newQuantity = currentPosition.quantity + quantity;
        const newTotalInvested = currentPosition.totalInvested + tradeValue;
        const newAverageCost = newTotalInvested / newQuantity;

        return {
          ...prev,
          cash: prev.cash - tradeValue,
          positions: {
            ...prev.positions,
            [tradingState.selectedSymbol]: {
              quantity: newQuantity,
              averageCost: newAverageCost,
              totalInvested: newTotalInvested
            }
          }
        };
      });

    } else if (action === 'sell') {
      const position = portfolio.positions[tradingState.selectedSymbol];
      if (!position || position.quantity < quantity) {
        alert("Not enough shares to sell!");
        return;
      }

      const profit = (tradePrice - position.averageCost) * quantity;

      setPortfolio(prev => {
        const newQuantity = position.quantity - quantity;
        const newPositions = { ...prev.positions };

        if (newQuantity === 0) {
          delete newPositions[tradingState.selectedSymbol];
        } else {
          newPositions[tradingState.selectedSymbol] = {
            ...position,
            quantity: newQuantity,
            totalInvested: position.averageCost * newQuantity
          };
        }

        return {
          ...prev,
          cash: prev.cash + tradeValue,
          positions: newPositions,
          realizedPnL: prev.realizedPnL + profit
        };
      });

      setPerformanceMetrics(prev => ({
        ...prev,
        totalTrades: prev.totalTrades + 1,
        totalProfit: prev.totalProfit + profit,
        bestTrade: Math.max(prev.bestTrade, profit),
        worstTrade: Math.min(prev.worstTrade, profit),
        winRate: profit > 0 ? (prev.winRate * prev.totalTrades + 1) / (prev.totalTrades + 1) : prev.winRate
      }));
    }

    // Add to trade history
    setTradeHistory(prev => [
      {
        id: Math.random().toString(36).substr(2, 9),
        symbol: tradingState.selectedSymbol,
        action,
        quantity,
        price: tradePrice,
        timestamp: now()
      },
      ...prev.slice(0, 49) // Keep last 50 trades
    ]);

    setTradingState(prev => ({ ...prev, quantity: "" }));
  };

  // Chart data preparation with proper historical data
  const chartData = useMemo(() => {
    if (!currentAsset) return [];
    
    const dataPoints = [...currentAsset.history];
    const nowTime = now();
    let filteredData = [];

    switch (tradingState.chartRange) {
      case "1D":
        // Last 390 minutes (trading day)
        filteredData = dataPoints.filter(point => point.timestamp > nowTime - 24 * 60 * 60 * 1000);
        break;
      case "1W":
        // Last 7 days
        filteredData = dataPoints.filter(point => point.timestamp > nowTime - 7 * 24 * 60 * 60 * 1000);
        break;
      case "1M":
        // Last 30 days
        filteredData = dataPoints.filter(point => point.timestamp > nowTime - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        // All data (30 days)
        filteredData = dataPoints;
        break;
    }

    return filteredData.map(point => ({
      ...point,
      time: point.timestamp,
      value: point.price
    }));
  }, [currentAsset, tradingState.chartRange]);

  // Calculate performance metrics
  const calculatePerformance = useMemo(() => {
    if (portfolio.equityHistory.length < 2) return performanceMetrics;

    const values = portfolio.equityHistory.map(h => h.value);
    const returns = [];
    
    for (let i = 1; i < values.length; i++) {
      returns.push((values[i] - values[i-1]) / values[i-1]);
    }

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252);
    const sharpeRatio = volatility > 0 ? avgReturn / volatility * Math.sqrt(252) : 0;

    let maxDrawdown = 0;
    let peak = values[0];
    
    for (let i = 1; i < values.length; i++) {
      if (values[i] > peak) {
        peak = values[i];
      } else {
        const drawdown = (peak - values[i]) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }

    return {
      ...performanceMetrics,
      sharpeRatio,
      maxDrawdown
    };
  }, [portfolio.equityHistory]);

  // Format timestamp for chart
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    switch (tradingState.chartRange) {
      case "1D":
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case "1W":
      case "1M":
      case "ALL":
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      default:
        return date.toLocaleDateString();
    }
  };

  // Render component
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-blue-400 flex items-center">
              <span className="mr-2">📈</span> Quantum Trader Pro
            </h1>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              marketStatus.sentiment > 0.2 ? "bg-green-500/20 text-green-400" :
              marketStatus.sentiment < -0.2 ? "bg-red-500/20 text-red-400" :
              "bg-gray-600/20 text-gray-400"
            }`}>
              {marketStatus.sentiment > 0.2 ? "牛市" : 
               marketStatus.sentiment < -0.2 ? "熊市" : "震荡"}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-lg font-semibold">Portfolio: <span className="text-green-400">{fmtCurrency(portfolio.totalValue)}</span></div>
            <div className="text-sm text-gray-400 flex items-center justify-end">
              <span className="mr-4">Cash: {fmtCurrency(portfolio.cash)}</span>
              <span className="flex items-center">
                <span className="h-2 w-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                Live
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {/* Market Events Ticker */}
        {marketStatus.events.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-3 mb-6 border-l-4 border-yellow-500">
            <div className="flex items-center mb-2">
              <h3 className="font-semibold flex items-center">
                <span className="mr-2">📢</span> Market News
              </h3>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {marketStatus.events.map(event => (
                <div key={event.id} className={`text-sm p-2 rounded flex items-start ${
                  event.type === 'positive' ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
                }`}>
                  <span className="mr-2">
                    {event.type === 'positive' ? '📈' : '📉'}
                  </span>
                  <span>
                    {event.message} {event.sector && <span className="text-yellow-400">({event.sector})</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Assets & Trading */}
          <div className="lg:col-span-1 space-y-6">
            {/* Assets List */}
            <div className="bg-gray-800 rounded-xl p-4 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <span className="mr-2">📊</span> Market Watch
                </h2>
                <div className="text-xs bg-gray-700 px-2 py-1 rounded">
                  {Object.keys(marketData).length} Assets
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {Object.values(marketData).map(asset => {
                  const position = portfolio.positions[asset.symbol];
                  return (
                    <div
                      key={asset.symbol}
                      className={`p-3 rounded-lg cursor-pointer transition-all border ${
                        tradingState.selectedSymbol === asset.symbol 
                          ? 'bg-blue-600/20 border-blue-500' 
                          : 'bg-gray-700/50 border-gray-700 hover:bg-gray-700 hover:border-gray-600'
                      }`}
                      onClick={() => setTradingState(prev => ({ ...prev, selectedSymbol: asset.symbol }))}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold">{asset.symbol}</div>
                          <div className="text-xs text-gray-400 truncate max-w-[120px]">{asset.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{fmtCurrency(asset.price)}</div>
                          <div className={`text-xs flex items-center justify-end ${
                            asset.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {asset.changePercent >= 0 ? '▲' : '▼'} {Math.abs(asset.changePercent).toFixed(2)}%
                          </div>
                          {position && (
                            <div className={`text-xs flex items-center justify-end ${
                              (asset.price - position.averageCost) >= 0 ? 'text-green-300' : 'text-red-300'
                            }`}>
                              P/L: {fmtCurrency((asset.price - position.averageCost) * position.quantity)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trading Panel */}
            <div className="bg-gray-800 rounded-xl p-4 shadow-lg">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <span className="mr-2">🎯</span> Trade Execution
              </h2>
              <div className="space-y-4">
                <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">{tradingState.selectedSymbol}</span>
                    <span className="text-xl font-bold text-green-400">
                      {fmtCurrency(currentAsset?.price || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <div className="text-green-400 flex items-center">
                      <span className="mr-1">_bid:</span> {fmtCurrency(currentAsset?.bid || 0)}
                    </div>
                    <div className="text-red-400 flex items-center">
                      <span className="mr-1">ask:</span> {fmtCurrency(currentAsset?.ask || 0)}
                    </div>
                  </div>
                  <div className={`text-sm flex items-center ${
                    currentAsset?.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {currentAsset?.changePercent >= 0 ? '▲' : '▼'} {Math.abs(currentAsset?.changePercent || 0).toFixed(2)}%
                    <span className="ml-2 text-gray-400">Spread: {fmtCurrency(currentAsset?.spread || 0)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Order Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['market', 'limit', 'stop'].map(type => (
                        <button
                          key={type}
                          onClick={() => setTradingState(prev => ({ ...prev, orderType: type }))}
                          className={`p-2 rounded-lg text-xs font-medium transition-all ${
                            tradingState.orderType === type 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {tradingState.orderType === 'limit' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Limit Price</label>
                      <input
                        type="number"
                        value={tradingState.limitPrice}
                        onChange={(e) => setTradingState(prev => ({ 
                          ...prev, 
                          limitPrice: e.target.value 
                        }))}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter limit price"
                      />
                    </div>
                  )}

                  {tradingState.orderType === 'stop' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Stop Price</label>
                      <input
                        type="number"
                        value={tradingState.stopPrice}
                        onChange={(e) => setTradingState(prev => ({ 
                          ...prev, 
                          stopPrice: e.target.value 
                        }))}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter stop price"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">Quantity</label>
                    <input
                      type="number"
                      value={tradingState.quantity}
                      onChange={(e) => setTradingState(prev => ({ 
                        ...prev, 
                        quantity: e.target.value.replace(/[^0-9]/g, '') 
                      }))}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter shares"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => executeTrade('buy')}
                      className="p-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors flex items-center justify-center"
                    >
                      <span className="mr-2">🛒</span> BUY
                    </button>
                    <button
                      onClick={() => executeTrade('sell')}
                      className="p-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors flex items-center justify-center"
                    >
                      <span className="mr-2">📤</span> SELL
                    </button>
                  </div>

                  {tradingState.quantity && (
                    <div className="text-center text-sm text-gray-400 bg-gray-700/50 p-2 rounded-lg">
                      Est. Cost: {fmtCurrency((currentAsset?.price || 0) * parseInt(tradingState.quantity) || 0)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Portfolio Summary */}
            <div className="bg-gray-800 rounded-xl p-4 shadow-lg">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <span className="mr-2">💼</span> Portfolio
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-700/50 p-3 rounded-lg text-center border border-gray-700">
                    <div className="text-green-400 font-bold text-lg">{fmtCurrency(portfolio.cash)}</div>
                    <div className="text-xs text-gray-400">Cash</div>
                  </div>
                  <div className="bg-gray-700/50 p-3 rounded-lg text-center border border-gray-700">
                    <div className="font-bold text-lg">{performanceMetrics.totalTrades}</div>
                    <div className="text-xs text-gray-400">Trades</div>
                  </div>
                </div>
                
                {Object.keys(portfolio.positions).length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-400">Positions</div>
                    {Object.entries(portfolio.positions).map(([symbol, position]) => {
                      const asset = marketData[symbol];
                      if (!asset) return null;
                      
                      const marketValue = asset.price * position.quantity;
                      const profit = marketValue - position.totalInvested;
                      const profitPercent = (profit / position.totalInvested) * 100;

                      return (
                        <div key={symbol} className="bg-gray-700/50 p-3 rounded-lg border border-gray-700">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold">{symbol}</span>
                            <span className={`font-medium ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {fmtCurrency(profit)} ({profitPercent.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 flex justify-between">
                            <span>{position.quantity} shares</span>
                            <span>@ {fmtCurrency(position.averageCost)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4 bg-gray-700/30 rounded-lg">
                    No positions yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chart Section */}
            <div className="bg-gray-800 rounded-xl p-5 shadow-lg">
              <div className="flex flex-wrap justify-between items-center mb-5 gap-3">
                <div>
                  <h2 className="text-xl font-bold">
                    {tradingState.selectedSymbol} - {currentAsset?.name}
                  </h2>
                  <div className="flex items-center text-sm text-gray-400">
                    <span className="mr-3">Sector: <span className="text-blue-400">{currentAsset?.sector}</span></span>
                    <span>Volatility: <span className="text-yellow-400">{(currentAsset?.volatility * 100).toFixed(1)}%</span></span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['1D', '1W', '1M', 'ALL'].map(range => (
                    <button
                      key={range}
                      onClick={() => setTradingState(prev => ({ ...prev, chartRange: range }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        tradingState.chartRange === range 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="time"
                      tickFormatter={formatTime}
                      stroke="#9CA3AF"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      tickFormatter={(value) => fmtCurrency(value)}
                      domain={['dataMin - dataMin * 0.005', 'dataMax + dataMax * 0.005']}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<MarketTooltip />} />
                    <ReferenceLine 
                      y={currentAsset?.bid} 
                      stroke="#10B981" 
                      strokeDasharray="3 3" 
                      strokeWidth={1}
                    />
                    <ReferenceLine 
                      y={currentAsset?.ask} 
                      stroke="#EF4444" 
                      strokeDasharray="3 3" 
                      strokeWidth={1}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#3B82F6"
                      fill="url(#colorGradient)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3B82F6"
                      dot={false}
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Market Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                <div className="bg-gray-700/50 p-3 rounded-lg text-center border border-gray-700">
                  <div className="text-green-400 font-bold">{fmtCurrency(currentAsset?.dailyHigh || 0)}</div>
                  <div className="text-xs text-gray-400">Daily High</div>
                </div>
                <div className="bg-gray-700/50 p-3 rounded-lg text-center border border-gray-700">
                  <div className="text-red-400 font-bold">{fmtCurrency(currentAsset?.dailyLow || 0)}</div>
                  <div className="text-xs text-gray-400">Daily Low</div>
                </div>
                <div className="bg-gray-700/50 p-3 rounded-lg text-center border border-gray-700">
                  <div className="font-bold">{fmtNumber(currentAsset?.volume || 0)}</div>
                  <div className="text-xs text-gray-400">Volume</div>
                </div>
                <div className="bg-gray-700/50 p-3 rounded-lg text-center border border-gray-700">
                  <div className={`font-bold ${
                    currentAsset?.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {currentAsset?.changePercent >= 0 ? '▲' : '▼'} {Math.abs(currentAsset?.changePercent || 0).toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-400">Change</div>
                </div>
              </div>
            </div>

            {/* Performance Analytics */}
            <div className="bg-gray-800 rounded-xl p-5 shadow-lg">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <span className="mr-2">📊</span> Performance Analytics
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700/50 p-4 rounded-lg text-center border border-gray-700">
                  <div className="text-2xl font-bold text-green-400">
                    {fmtCurrency(performanceMetrics.totalProfit)}
                  </div>
                  <div className="text-sm text-gray-400">Total Profit</div>
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg text-center border border-gray-700">
                  <div className="text-2xl font-bold">
                    {performanceMetrics.totalTrades}
                  </div>
                  <div className="text-sm text-gray-400">Total Trades</div>
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg text-center border border-gray-700">
                  <div className="text-2xl font-bold">
                    {fmtPercent(performanceMetrics.winRate)}
                  </div>
                  <div className="text-sm text-gray-400">Win Rate</div>
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg text-center border border-gray-700">
                  <div className="text-2xl font-bold">
                    {performanceMetrics.sharpeRatio.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-400">Sharpe Ratio</div>
                </div>
              </div>
            </div>

            {/* Order Book & Trade History */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order Book Simulation */}
              <div className="bg-gray-800 rounded-xl p-4 shadow-lg">
                <h3 className="font-semibold mb-3 flex items-center">
                  <span className="mr-2">📋</span> Order Book
                </h3>
                <div className="space-y-1 text-sm">
                  {/* Bid side */}
                  <div className="text-green-400 text-xs text-center font-semibold mb-1">BIDS</div>
                  <div className="max-h-60 overflow-y-auto">
                    {orderBook.bids.slice(0, 12).map((bid, index) => (
                      <div key={index} className="flex justify-between py-1.5 px-2 hover:bg-gray-700/50 rounded">
                        <span className="text-green-400 font-mono">{fmtCurrency(bid.price)}</span>
                        <span className="text-gray-300 font-mono">{fmtNumber(bid.size)}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Current Price */}
                  <div className="text-center text-white font-bold my-2 py-1 bg-gray-700/50 rounded">
                    {fmtCurrency(currentAsset?.price || 0)}
                    <div className="text-xs text-gray-400 mt-1">Spread: {fmtCurrency(currentAsset?.spread || 0)}</div>
                  </div>
                  
                  {/* Ask side */}
                  <div className="text-red-400 text-xs text-center font-semibold mb-1">ASKS</div>
                  <div className="max-h-60 overflow-y-auto">
                    {orderBook.asks.slice(0, 12).map((ask, index) => (
                      <div key={index} className="flex justify-between py-1.5 px-2 hover:bg-gray-700/50 rounded">
                        <span className="text-red-400 font-mono">{fmtCurrency(ask.price)}</span>
                        <span className="text-gray-300 font-mono">{fmtNumber(ask.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Trades */}
              <div className="bg-gray-800 rounded-xl p-4 shadow-lg">
                <h3 className="font-semibold mb-3 flex items-center">
                  <span className="mr-2">🔄</span> Recent Trades
                </h3>
                <div className="space-y-1 text-sm max-h-80 overflow-y-auto">
                  {tradeHistory.length > 0 ? (
                    tradeHistory.map((trade, index) => (
                      <div key={index} className="flex justify-between py-2 px-2 hover:bg-gray-700/50 rounded">
                        <div className="flex items-center">
                          <span className="text-gray-400 text-xs mr-2">
                            {new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={`font-medium ${trade.action === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                            {trade.action.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-gray-300 mr-2">{trade.quantity}</span>
                          <span className="font-mono">@ {fmtCurrency(trade.price)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No recent trades
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}