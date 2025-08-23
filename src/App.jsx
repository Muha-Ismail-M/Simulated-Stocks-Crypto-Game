import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar
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
const fmtCurrency = (n) => `$${n.toFixed(2)}`;
const fmtPercent = (n) => `${(n * 100).toFixed(2)}%`;
const now = () => Date.now();
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Realistic price generator using Geometric Brownian Motion
function generateRealisticPrice(previousPrice, volatility, marketSentiment, eventImpact = 0) {
  const drift = 0.0001 + (marketSentiment * 0.0003); // Base drift + sentiment influence
  const volatilityFactor = volatility * Math.sqrt(1/252); // Daily volatility
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
          <p className="text-gray-400 text-sm">Volume: {payload[0].payload.volume.toLocaleString()}</p>
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
      acc[asset.symbol] = {
        ...asset,
        price: asset.basePrice,
        history: Array(100).fill(0).map((_, i) => ({
          price: asset.basePrice * (0.95 + Math.random() * 0.1),
          volume: randomInt(100000, 500000),
          timestamp: now() - (100 - i) * 60000
        })),
        dailyHigh: asset.basePrice,
        dailyLow: asset.basePrice,
        change: 0,
        changePercent: 0,
        volume: randomInt(100000, 1000000)
      };
      return acc;
    }, {});
  });

  const [marketStatus, setMarketStatus] = useState({
    sentiment: 0, // -1 to 1
    events: [],
    isMarketOpen: true,
    lastUpdate: now()
  });

  const [portfolio, setPortfolio] = useState({
    cash: 100000,
    positions: {},
    equityHistory: Array(100).fill(0).map((_, i) => ({
      value: 100000,
      timestamp: now() - (100 - i) * 60000
    })),
    totalValue: 100000
  });

  const [tradingState, setTradingState] = useState({
    selectedSymbol: "AAPL",
    quantity: "",
    activeTab: "chart",
    chartRange: "1D",
    orderType: "market"
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

  // Refs for interval management
  const marketIntervalRef = useRef();
  const eventIntervalRef = useRef();

  // Get current asset
  const currentAsset = marketData[tradingState.selectedSymbol];

  // Market simulation engine
  useEffect(() => {
    // Clear any existing intervals
    if (marketIntervalRef.current) clearInterval(marketIntervalRef.current);
    if (eventIntervalRef.current) clearInterval(eventIntervalRef.current);

    // Market data updates (every second)
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
            asset.volatility,
            marketStatus.sentiment,
            eventImpact
          );

          // Update asset data
          newData[symbol] = {
            ...asset,
            price: newPrice,
            history: [
              ...asset.history.slice(1),
              {
                price: newPrice,
                volume: randomInt(50000, 2000000),
                timestamp: now()
              }
            ],
            dailyHigh: Math.max(asset.dailyHigh, newPrice),
            dailyLow: Math.min(asset.dailyLow, newPrice),
            change: newPrice - asset.history[0]?.price || 0,
            changePercent: ((newPrice - asset.history[0]?.price) / asset.history[0]?.price) * 100 || 0,
            volume: randomInt(50000, 2000000)
          };

          totalSentiment += newPrice > asset.price ? 0.1 : -0.1;
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
        sentiment: clamp(prev.sentiment + (Math.random() - 0.5) * 0.1, -1, 1)
      }));

    }, 1000);

    // Market events (every 5-10 seconds)
    eventIntervalRef.current = setInterval(() => {
      if (Math.random() < 0.3) { // 30% chance of event
        const eventType = Math.random() < 0.6 ? "POSITIVE" : "NEGATIVE";
        const events = MARKET_EVENTS[eventType];
        const eventMessage = events[randomInt(0, events.length - 1)];
        
        const impact = eventType === "POSITIVE" ? 
          randomInt(1, 5) / 100 : 
          randomInt(-5, -1) / 100;

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
          duration: randomInt(10, 30) // Event lasts 10-30 seconds
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
    }, randomInt(5000, 10000));

    return () => {
      clearInterval(marketIntervalRef.current);
      clearInterval(eventIntervalRef.current);
    };
  }, [marketData]);

  // Trading functions
  const executeTrade = (action) => {
    const quantity = parseInt(tradingState.quantity);
    if (quantity <= 0) return;

    const asset = marketData[tradingState.selectedSymbol];
    if (!asset) return;

    const tradePrice = asset.price;
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
          positions: newPositions
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

    setTradingState(prev => ({ ...prev, quantity: "" }));
  };

  // Chart data preparation
  const chartData = useMemo(() => {
    if (!currentAsset) return [];
    
    let dataPoints = currentAsset.history;
    const nowTime = now();

    switch (tradingState.chartRange) {
      case "1D":
        dataPoints = dataPoints.filter(point => point.timestamp > nowTime - 24 * 60 * 60 * 1000);
        break;
      case "1W":
        dataPoints = dataPoints.filter(point => point.timestamp > nowTime - 7 * 24 * 60 * 60 * 1000);
        break;
      case "1M":
        dataPoints = dataPoints.filter(point => point.timestamp > nowTime - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        // All data
        break;
    }

    return dataPoints.map(point => ({
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

  // Render component
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-blue-400">📈 Quantum Trader Pro</h1>
            <div className={`px-3 py-1 rounded-full text-sm ${
              marketStatus.sentiment > 0.2 ? "bg-green-500" :
              marketStatus.sentiment < -0.2 ? "bg-red-500" :
              "bg-gray-600"
            }`}>
              {marketStatus.sentiment > 0.2 ? "🐂 BULL MARKET" : 
               marketStatus.sentiment < -0.2 ? "🐻 BEAR MARKET" : "🔄 NEUTRAL"}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-lg">Portfolio Value: <span className="font-bold text-green-400">{fmtCurrency(portfolio.totalValue)}</span></div>
            <div className="text-sm text-gray-400">Cash: {fmtCurrency(portfolio.cash)} • Last Update: {new Date(marketStatus.lastUpdate).toLocaleTimeString()}</div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {/* Market Events Ticker */}
        {marketStatus.events.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-3 mb-6 border-l-4 border-yellow-500">
            <h3 className="font-semibold mb-2">📢 Market News</h3>
            <div className="space-y-2">
              {marketStatus.events.map(event => (
                <div key={event.id} className={`text-sm p-2 rounded ${
                  event.type === 'positive' ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  {event.message} {event.sector && `(${event.sector} Sector)`}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Assets & Trading */}
          <div className="lg:col-span-1 space-y-6">
            {/* Assets List */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">📊 Market Watch</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {Object.values(marketData).map(asset => {
                  const position = portfolio.positions[asset.symbol];
                  return (
                    <div
                      key={asset.symbol}
                      className={`p-3 rounded cursor-pointer transition-all ${
                        tradingState.selectedSymbol === asset.symbol 
                          ? 'bg-blue-600' 
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                      onClick={() => setTradingState(prev => ({ ...prev, selectedSymbol: asset.symbol }))}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold">{asset.symbol}</div>
                          <div className="text-xs text-gray-400">{asset.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{fmtCurrency(asset.price)}</div>
                          <div className={`text-xs ${
                            asset.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {asset.changePercent >= 0 ? '↗' : '↘'} {Math.abs(asset.changePercent).toFixed(2)}%
                          </div>
                          {position && (
                            <div className={`text-xs ${
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
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">🎯 Trade Execution</h2>
              <div className="space-y-4">
                <div className="bg-gray-700 p-3 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{tradingState.selectedSymbol}</span>
                    <span className="text-xl text-green-400">
                      {fmtCurrency(currentAsset?.price || 0)}
                    </span>
                  </div>
                  <div className={`text-sm ${
                    currentAsset?.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {currentAsset?.changePercent >= 0 ? '↗' : '↘'} {Math.abs(currentAsset?.changePercent || 0).toFixed(2)}%
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Quantity</label>
                  <input
                    type="number"
                    value={tradingState.quantity}
                    onChange={(e) => setTradingState(prev => ({ 
                      ...prev, 
                      quantity: e.target.value.replace(/[^0-9]/g, '') 
                    }))}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded focus:border-blue-500 focus:outline-none"
                    placeholder="Enter shares"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => executeTrade('buy')}
                    className="p-3 bg-green-600 hover:bg-green-700 rounded font-semibold transition-colors"
                  >
                    🛒 BUY
                  </button>
                  <button
                    onClick={() => executeTrade('sell')}
                    className="p-3 bg-red-600 hover:bg-red-700 rounded font-semibold transition-colors"
                  >
                    📤 SELL
                  </button>
                </div>

                {tradingState.quantity && (
                  <div className="text-center text-sm text-gray-400">
                    Estimated Cost: {fmtCurrency((currentAsset?.price || 0) * parseInt(tradingState.quantity) || 0)}
                  </div>
                )}
              </div>
            </div>

            {/* Portfolio Summary */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">💼 Portfolio</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-700 p-2 rounded text-center">
                    <div className="text-green-400 font-bold">{fmtCurrency(portfolio.cash)}</div>
                    <div className="text-xs text-gray-400">Cash</div>
                  </div>
                  <div className="bg-gray-700 p-2 rounded text-center">
                    <div className="font-bold">{performanceMetrics.totalTrades}</div>
                    <div className="text-xs text-gray-400">Trades</div>
                  </div>
                </div>
                
                {Object.keys(portfolio.positions).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(portfolio.positions).map(([symbol, position]) => {
                      const asset = marketData[symbol];
                      if (!asset) return null;
                      
                      const marketValue = asset.price * position.quantity;
                      const profit = marketValue - position.totalInvested;
                      const profitPercent = (profit / position.totalInvested) * 100;

                      return (
                        <div key={symbol} className="bg-gray-700 p-2 rounded">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">{symbol}</span>
                            <span className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {fmtCurrency(profit)} ({profitPercent.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {position.quantity} shares @ {fmtCurrency(position.averageCost)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-4">
                    No positions yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Chart Section */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {tradingState.selectedSymbol} - {currentAsset?.name}
                </h2>
                <div className="flex gap-2">
                  {['1D', '1W', '1M', 'ALL'].map(range => (
                    <button
                      key={range}
                      onClick={() => setTradingState(prev => ({ ...prev, chartRange: range }))}
                      className={`px-3 py-1 rounded ${
                        tradingState.chartRange === range ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis 
                      dataKey="time"
                      tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                      stroke="#888"
                    />
                    <YAxis
                      stroke="#888"
                      tickFormatter={(value) => fmtCurrency(value)}
                      domain={['dataMin - dataMin * 0.01', 'dataMax + dataMax * 0.01']}
                    />
                    <Tooltip content={<MarketTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#3B82F6"
                      fill="url(#colorGradient)"
                      strokeWidth={2}
                    />
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Market Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-gray-700 p-3 rounded text-center">
                  <div className="text-lg font-bold">{fmtCurrency(currentAsset?.dailyHigh || 0)}</div>
                  <div className="text-sm text-gray-400">Daily High</div>
                </div>
                <div className="bg-gray-700 p-3 rounded text-center">
                  <div className="text-lg font-bold">{fmtCurrency(currentAsset?.dailyLow || 0)}</div>
                  <div className="text-sm text-gray-400">Daily Low</div>
                </div>
                <div className="bg-gray-700 p-3 rounded text-center">
                  <div className="text-lg font-bold">{(currentAsset?.volume || 0).toLocaleString()}</div>
                  <div className="text-sm text-gray-400">Volume</div>
                </div>
                <div className="bg-gray-700 p-3 rounded text-center">
                  <div className={`text-lg font-bold ${
                    currentAsset?.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {fmtPercent((currentAsset?.changePercent || 0) / 100)}
                  </div>
                  <div className="text-sm text-gray-400">Change</div>
                </div>
              </div>
            </div>

            {/* Performance Analytics */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">📊 Performance Analytics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700 p-4 rounded text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {fmtCurrency(performanceMetrics.totalProfit)}
                  </div>
                  <div className="text-sm text-gray-400">Total Profit</div>
                </div>
                <div className="bg-gray-700 p-4 rounded text-center">
                  <div className="text-2xl font-bold">
                    {performanceMetrics.totalTrades}
                  </div>
                  <div className="text-sm text-gray-400">Total Trades</div>
                </div>
                <div className="bg-gray-700 p-4 rounded text-center">
                  <div className="text-2xl font-bold">
                    {fmtPercent(performanceMetrics.winRate)}
                  </div>
                  <div className="text-sm text-gray-400">Win Rate</div>
                </div>
                <div className="bg-gray-700 p-4 rounded text-center">
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
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold mb-3">📋 Order Book</h3>
                <div className="space-y-1 text-sm">
                  {/* Bid side */}
                  <div className="text-green-400 text-xs text-center">BIDS</div>
                  {[0.998, 0.997, 0.996].map(ratio => (
                    <div key={ratio} className="flex justify-between text-green-400">
                      <span>{fmtCurrency((currentAsset?.price || 0) * ratio)}</span>
                      <span>{randomInt(100, 500)}</span>
                    </div>
                  ))}
                  
                  {/* Spread */}
                  <div className="text-center text-white font-bold my-2">
                    Spread: {fmtCurrency((currentAsset?.price || 0) * 0.002)}
                  </div>
                  
                  {/* Ask side */}
                  <div className="text-red-400 text-xs text-center">ASKS</div>
                  {[1.002, 1.003, 1.004].map(ratio => (
                    <div key={ratio} className="flex justify-between text-red-400">
                      <span>{fmtCurrency((currentAsset?.price || 0) * ratio)}</span>
                      <span>{randomInt(100, 500)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Trades */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold mb-3">🔄 Recent Trades</h3>
                <div className="space-y-1 text-sm max-h-40 overflow-y-auto">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-gray-400">{new Date(now() - i * 60000).toLocaleTimeString()}</span>
                      <span className={Math.random() > 0.5 ? 'text-green-400' : 'text-red-400'}>
                        {fmtCurrency((currentAsset?.price || 0) * (0.99 + Math.random() * 0.02))}
                      </span>
                      <span className="text-gray-400">{randomInt(1, 50)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}