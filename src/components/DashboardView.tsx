/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  TrendingUp, 
  ShoppingBag, 
  AlertTriangle, 
  MessageSquare, 
  CheckCircle2, 
  Package, 
  HelpCircle,
  Truck,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  Cell
} from "recharts";
import { Product, Order, Complaint, OrderStatus } from "../types";
import { LocalDB } from "../db";

interface DashboardViewProps {
  products: Product[];
  orders: Order[];
  complaints: Complaint[];
  currentUser: { username: string; name: string };
  onRefreshData: () => void;
}

export default function DashboardView({ 
  products, 
  orders, 
  complaints, 
  currentUser,
  onRefreshData
}: DashboardViewProps) {
  
  const [restockAmount, setRestockAmount] = useState<{ [id: string]: number }>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Calculations
  const totalRevenue = orders
    .filter(o => o.status !== OrderStatus.Cancelled)
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const pendingOrdersCount = orders.filter(o => o.status === OrderStatus.Pending).length;
  const dispatchingOrdersCount = orders.filter(o => o.status === OrderStatus.Dispatched).length;
  const lowStockItems = products.filter(p => p.stockQuantity <= p.reorderThreshold);
  const openComplaintsCount = complaints.filter(c => c.status !== "Resolved").length;

  // 2. Chart Data 1: Sales trends over time (from orders list)
  const sortedOrdersByDate = [...orders].sort((a,b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime());
  const salesHistoryMap: { [date: string]: number } = {};
  
  sortedOrdersByDate.forEach(order => {
    if (order.status !== OrderStatus.Cancelled) {
      const dateStr = new Date(order.orderDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      salesHistoryMap[dateStr] = (salesHistoryMap[dateStr] || 0) + order.totalAmount;
    }
  });

  const salesTrendData = Object.keys(salesHistoryMap).map(date => ({
    date,
    Amount: salesHistoryMap[date]
  }));

  // Chart Data fallback if empty
  const finalSalesTrendData = salesTrendData.length > 0 ? salesTrendData : [
    { date: "June 10", Amount: 2450 },
    { date: "June 11", Amount: 1550 },
    { date: "June 12", Amount: 3200 },
    { date: "June 13", Amount: 2470 },
    { date: "June 14", Amount: 4100 },
    { date: "June 15", Amount: 495 }
  ];

  // 3. Chart Data 2: Inventory Stock Level vs Reorder Threshold
  const stockChartData = products.map(p => ({
    name: p.productName.slice(0, 16) + "...",
    Stock: p.stockQuantity,
    Threshold: p.reorderThreshold
  }));

  // Handle Quick Restock action
  const handleQuickRestock = (productId: string) => {
    const amount = restockAmount[productId] || 50;
    const currentProducts = LocalDB.getProducts();
    const updatedProducts = currentProducts.map(p => {
      if (p.productId === productId) {
        const newQty = p.stockQuantity + amount;
        LocalDB.appendLog(
          currentUser.username, 
          `Quick restocked item ${p.productName} by +${amount} (New qty: ${newQty})`, 
          "PRODUCT"
        );
        return { ...p, stockQuantity: newQty };
      }
      return p;
    });
    LocalDB.setProducts(updatedProducts);
    setSuccessMsg("Stock successfully replenished!");
    setTimeout(() => setSuccessMsg(null), 3000);
    onRefreshData();
  };

  return (
    <div className="space-y-8">
      {/* Upper Welcomer */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center justify-center">
          <Sparkles className="w-64 h-64 text-indigo-200 rotate-12" />
        </div>
        <div className="space-y-1 z-10">
          <p className="text-indigo-400 text-xs font-semibold tracking-wider font-mono">DRABBIT MARKETING SYSTEM (DMIS)</p>
          <h1 className="text-2xl font-bold tracking-tight">Kumusta, {currentUser.name}!</h1>
          <p className="text-slate-300 text-sm">Welcome to your real-time administrative intelligence board.</p>
        </div>
        <div className="mt-4 md:mt-0 bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-center text-xs text-white">
          <span className="block text-slate-400">Current Local Time</span>
          <span className="font-mono font-bold text-sm tracking-wide">June 15, 2026</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="h-12 w-12 bg-indigo-50 border border-indigo-100/50 rounded-xl flex items-center justify-center text-indigo-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Gross Revenue</span>
            <span className="text-2xl font-bold text-slate-900">₱{totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="h-12 w-12 bg-amber-50 border border-amber-100/50 rounded-xl flex items-center justify-center text-amber-600">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Active Deliveries</span>
            <span className="text-2xl font-bold text-slate-900">{dispatchingOrdersCount} <span className="text-xs text-slate-400 font-normal">in transit</span></span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="h-12 w-12 bg-rose-50 border border-rose-100/50 rounded-xl flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Low Stock Warnings</span>
            <span className={`text-2xl font-bold ${lowStockItems.length > 0 ? "text-rose-600" : "text-slate-900"}`}>
              {lowStockItems.length} items
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="h-12 w-12 bg-emerald-50 border border-emerald-100/50 rounded-xl flex items-center justify-center text-emerald-600">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Open Complaints</span>
            <span className="text-2xl font-bold text-slate-900">{openComplaintsCount} cases</span>
          </div>
        </div>
      </div>

      {/* Interactive Stock alerts block */}
      {lowStockItems.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <h3 className="text-sm font-bold text-amber-900">Critical Stock Threshold Violations</h3>
          </div>
          <p className="text-xs text-amber-800 mb-4">
            The following products have dropped below their reorder threshold levels. Replenish immediately to avoid delivery disruptions:
          </p>
          
          {successMsg && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs py-2 px-3 rounded-lg mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockItems.map(p => (
              <div key={p.productId} className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-xs font-semibold text-slate-800 line-clamp-1">{p.productName}</span>
                    <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-mono font-medium shrink-0">{p.productId}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs mt-2 text-slate-500">
                    <div>
                      <span>Stock: </span>
                      <strong className="text-rose-600 font-bold">{p.stockQuantity}</strong>
                    </div>
                    <div>
                      <span>Min Threshold: </span>
                      <strong className="text-slate-700 font-medium">{p.reorderThreshold}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 w-24">
                    <span className="text-[10px] text-slate-400">Qty:</span>
                    <input 
                      type="number" 
                      min="10"
                      step="10"
                      value={restockAmount[p.productId] || 50} 
                      onChange={(e) => setRestockAmount({
                        ...restockAmount,
                        [p.productId]: parseInt(e.target.value) || 0
                      })}
                      className="border border-slate-200 text-center rounded text-xs py-0.5 px-1 bg-slate-50 w-full focus:outline-indigo-500" 
                    />
                  </div>
                  <button
                    onClick={() => handleQuickRestock(p.productId)}
                    className="bg-indigo-650 hover:bg-indigo-600 cursor-pointer text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all w-full justify-center"
                  >
                    <Package className="w-3.5 h-3.5" />
                    Action Restock
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recharts Analytics Displays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sales Performance Chart */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Dynamic Sales History Matrix</h3>
              <p className="text-xs text-slate-400">Fulfillment value trends sorted by transaction date</p>
            </div>
            <span className="bg-indigo-50 text-indigo-650 text-xs px-2 py-1 rounded-lg font-semibold font-mono flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Sales ₱
            </span>
          </div>

          <div className="h-68">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={finalSalesTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip formatter={(value) => [`₱${value}`, "Amount"]} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="Amount" stroke="#4f46e5" strokeWidth={3} dot={{ fill: "#4f46e5", strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="pt-2 border-t border-slate-50 flex justify-between items-center text-xs text-slate-400">
            <span>Cumulative Sales Period Status</span>
            <span className="text-indigo-600 font-semibold font-mono">100% Digital Data Capture</span>
          </div>
        </div>

        {/* Product Stock Analysis Chart */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Real-Time Inventory Levels</h3>
              <p className="text-xs text-slate-400">Current quantities vs. defined safety reorder thresholds</p>
            </div>
            <span className="bg-emerald-50 text-emerald-600 text-xs px-2 py-1 rounded-lg font-semibold font-mono flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              Units
            </span>
          </div>

          <div className="h-68">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "11px" }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: "11px", pt: 10 }} />
                <Bar dataKey="Stock" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Threshold" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="pt-2 border-t border-slate-50 flex justify-between items-center text-xs text-slate-400">
            <span>Current Safety Stock Level Alerts</span>
            <span className="text-emerald-600 font-semibold font-mono">Auto-checked On Checkout</span>
          </div>
        </div>

      </div>

      {/* System Quick Instructions / References */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 text-sm mb-4">Drabbit Marketing Sasa Core Objectives</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-3 border border-slate-50 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>Digital Order Entry</span>
            </div>
            <p className="text-[11px] text-slate-400">Replaces error-prone manual paper slip recordings. Automates reference numbering and tracking.</p>
          </div>
          <div className="p-3 border border-slate-50 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
              <Truck className="w-4 h-4 text-indigo-600" />
              <span>Real-Time Stock Check</span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">Stocks automatically decrement upon order delivery. Threshold triggers flag prompt reorder requests in Sasa hub.</p>
          </div>
          <div className="p-3 border border-slate-50 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span>Invoicing & Returns</span>
            </div>
            <p className="text-[11px] text-slate-400">Auto-build formatted billing records and track complaints to improve customer retention with audit paths.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
