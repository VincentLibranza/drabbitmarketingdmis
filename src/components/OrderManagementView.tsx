/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Plus, Search, Filter, Package, AlertTriangle,
  X, Printer, ChevronDown, Download, Trash2, FileCheck, ShoppingBag
} from "lucide-react";
import { Order, OrderStatus, PaymentStatus, Product, Customer, OrderItem } from "../types";
import { LocalDB } from "../services/db";
import { jsPDF } from "jspdf";

interface OrderManagementViewProps {
  orders: Order[];
  products: Product[];
  customers: Customer[];
  currentUser: { username: string; name: string };
  onRefreshData: () => void;
}

export default function OrderManagementView({
  orders,
  products,
  customers,
  currentUser,
  onRefreshData
}: OrderManagementViewProps) {
  
  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  // Form states for POS Checkout
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formItems, setFormItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: "", quantity: 1 }
  ]);
  const [formPaymentStatus, setFormPaymentStatus] = useState<PaymentStatus>(PaymentStatus.Unpaid);
  const [formError, setFormError] = useState<string | null>(null);

  // --- Logic Fixes ---

  const handleUpdateOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    const updated = orders.map(o => o.orderId === orderId ? { ...o, status: nextStatus } : o);
    LocalDB.setOrders(updated);
    LocalDB.appendLog(currentUser.username, `Updated Order Status to ${nextStatus}`, "ORDER");
    onRefreshData();
  };

  const handleTogglePayment = (orderId: string, nextPay: PaymentStatus) => {
    const updated = orders.map(o => o.orderId === orderId ? { ...o, paymentStatus: nextPay } : o);
    LocalDB.setOrders(updated);
    LocalDB.appendLog(currentUser.username, `Updated Payment to ${nextPay}`, "ORDER");
    onRefreshData();
  };

  // --- Filtering ---
  const filteredOrders = orders.filter(o => {
    const customer = customers.find(c => c.customerId === o.customerId);
    const matchesSearch = 
      o.orderRefNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer && customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
    if (statusFilter === "All") return matchesSearch;
    return matchesSearch && o.status === statusFilter;
  });

  // --- POS Basket Calculations ---
  const calculateFormTotal = () => {
    return formItems.reduce((sum, item) => {
      const prod = products.find(p => p.productId === item.productId);
      return sum + (prod ? prod.unitPrice * item.quantity : 0);
    }, 0);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerId || formItems.some(i => !i.productId)) {
      setFormError("Validation Failed: Ensure customer and all products are selected.");
      return;
    }

    const idSeed = Date.now();
    const finalItems: OrderItem[] = formItems.map((item, idx) => {
      const prod = products.find(p => p.productId === item.productId)!;
      return {
        itemId: `ITEM-${idSeed}-${idx}`,
        orderId: `ORD-${idSeed}`,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: prod.unitPrice
      };
    });

    const newOrder: Order = {
      orderId: `ORD-${idSeed}`,
      orderRefNo: `DMIS-ORD-${orders.length + 1001}`,
      customerId: formCustomerId,
      orderDate: new Date().toISOString(),
      status: OrderStatus.Pending,
      paymentStatus: formPaymentStatus,
      totalAmount: finalItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      items: finalItems
    };

    LocalDB.setOrders([newOrder, ...orders]);
    LocalDB.appendLog(currentUser.username, `Recorded Order ${newOrder.orderRefNo}`, "ORDER");
    setShowAddForm(false);
    onRefreshData();
  };

  return (
    <div className="space-y-8">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm shadow-slate-200/50"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-100 px-4 py-3 rounded-2xl shadow-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-black uppercase tracking-widest text-slate-700 outline-none cursor-pointer bg-transparent"
            >
              <option value="All">All Statuses</option>
              {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-white border border-slate-100 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => setShowAddForm(true)} className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            <Plus className="w-4 h-4" /> Create Order
          </button>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/40">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Order Ledgers ({filteredOrders.length})</h3>
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">DTI Compliant Logs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-50">
                <th className="py-5 px-6">Ref Number</th>
                <th className="py-5 px-6">Customer File</th>
                <th className="py-5 px-6 text-right">Total</th>
                <th className="py-5 px-6 text-center">Fulfillment</th>
                <th className="py-5 px-6 text-center">Invoicing</th>
                <th className="py-5 px-6 text-center">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.map(order => (
                <tr key={order.orderId} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-5 px-6 font-mono text-[11px] font-black text-slate-900">{order.orderRefNo}</td>
                  <td className="py-5 px-6">
                    <p className="font-black text-slate-900 text-xs">{customers.find(c => c.customerId === order.customerId)?.customerName || "Walk-In Buyer"}</p>
                    <span className="text-[9px] font-bold text-slate-400">{customers.find(c => c.customerId === order.customerId)?.contact}</span>
                  </td>
                  <td className="py-5 px-6 text-right font-black text-slate-900 text-xs">₱{order.totalAmount.toLocaleString()}</td>
                  <td className="py-5 px-6 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 mx-auto w-fit ${
                      order.status === OrderStatus.Delivered ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${order.status === OrderStatus.Delivered ? "bg-emerald-500" : "bg-amber-500"}`} />
                      {order.status}
                    </span>
                  </td>
                  <td className="py-5 px-6 text-center">
                    <select
                      value={order.paymentStatus}
                      onChange={(e) => handleTogglePayment(order.orderId, e.target.value as PaymentStatus)}
                      className="text-[10px] font-black uppercase tracking-widest border border-slate-100 rounded-lg px-2 py-1 bg-slate-50 outline-none cursor-pointer"
                    >
                        <option value="Unpaid">Unpaid</option>
                        <option value="Partial">Partial</option>
                        <option value="Paid">Paid</option>
                    </select>
                  </td>
                  <td className="py-5 px-6 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => setSelectedInvoiceOrder(order)} className="p-1.5 px-3 border border-slate-100 rounded-xl text-slate-500 hover:bg-slate-100 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all">
                        <Printer className="w-3.5 h-3.5" /> Invoice
                      </button>
                      
                      {/* FIX: Transition Dropdown matching image 2 */}
                      <div className="relative group/menu">
                        <button className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all">
                          Transition <ChevronDown className="w-3 h-3" />
                        </button>
                        <div className="absolute right-0 bottom-full mb-1 w-40 bg-white border border-slate-100 rounded-2xl shadow-2xl hidden group-hover/menu:block z-50 overflow-hidden text-left">
                          {Object.values(OrderStatus).map(status => (
                            <button 
                              key={status}
                              onClick={() => handleUpdateOrderStatus(order.orderId, status)}
                              className="w-full px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border-b border-slate-50 last:border-0 transition-colors"
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* POS Checkout Modal (Preserved UI) */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              className="bg-white h-full w-full max-w-xl shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 text-xl uppercase tracking-tight">Checkout</h3>
                  <p className="text-xs text-slate-400 font-medium">Create new order entry</p>
                </div>
                <button onClick={() => setShowAddForm(false)} className="p-2"><X className="w-6 h-6 text-slate-400" /></button>
              </div>

              <form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Customer</label>
                  <select
                    value={formCustomerId}
                    onChange={(e) => setFormCustomerId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-bold outline-none"
                  >
                    <option value="">-- Choose customer --</option>
                    {customers.map(c => <option key={c.customerId} value={c.customerId}>{c.customerName}</option>)}
                  </select>
                </div>

                {/* Basket List */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Basket Items</label>
                    <button type="button" onClick={() => setFormItems([...formItems, { productId: "", quantity: 1 }])} className="text-indigo-600 font-black text-[10px] uppercase">Add Line</button>
                  </div>
                  {formItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                       <select className="flex-1 border rounded-xl p-2 text-xs font-bold" onChange={(e) => {
                          const n = [...formItems]; n[idx].productId = e.target.value; setFormItems(n);
                       }}>
                         <option value="">Select SKU</option>
                         {products.map(p => <option key={p.productId} value={p.productId}>{p.productName}</option>)}
                       </select>
                       <input type="number" className="w-16 border rounded-xl p-2 text-center font-bold" value={item.quantity} onChange={(e) => {
                          const n = [...formItems]; n[idx].quantity = parseInt(e.target.value); setFormItems(n);
                       }} />
                       <button type="button" onClick={() => setFormItems(formItems.filter((_, i) => i !== idx))}><Trash2 className="w-4 h-4 text-rose-400" /></button>
                    </div>
                  ))}
                </div>

                <div className="bg-indigo-50 p-6 rounded-3xl flex justify-between items-center">
                  <span className="text-[10px] font-black text-indigo-700 uppercase">Total Due</span>
                  <span className="text-2xl font-black text-indigo-950 font-mono">₱{calculateFormTotal().toLocaleString()}</span>
                </div>

                <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Complete Order</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}