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
import { Order, OrderStatus, PaymentStatus, Product, Customer, OrderItem, DeliveryStatus } from "../types";
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
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  const [formCustomerId, setFormCustomerId] = useState("");
  const [formItems, setFormItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: "", quantity: 1 }
  ]);
  const [formPaymentStatus, setFormPaymentStatus] = useState<PaymentStatus>(PaymentStatus.Unpaid);
  const [formError, setFormError] = useState<string | null>(null);

  // --- Logic Functions ---

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

  const downloadPDFInvoice = () => {
    if (!selectedInvoiceOrder) return;
    const doc = new jsPDF();
    const client = customers.find(c => c.customerId === selectedInvoiceOrder.customerId);
    doc.setFontSize(22);
    doc.text("DRABBIT MARKETING", 20, 20);
    doc.setFontSize(10);
    doc.text(`Invoice Ref: ${selectedInvoiceOrder.orderRefNo}`, 20, 30);
    doc.text(`Customer: ${client?.customerName || "Walk-in"}`, 20, 40);
    doc.text(`Total Amount: PHP ${selectedInvoiceOrder.totalAmount.toFixed(2)}`, 20, 50);
    doc.save(`Invoice_${selectedInvoiceOrder.orderRefNo}.pdf`);
  };

  const filteredOrders = orders.filter(o => {
    const customer = customers.find(c => c.customerId === o.customerId);
    const matchesSearch = 
      o.orderRefNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer && customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
    if (statusFilter === "All") return matchesSearch;
    return matchesSearch && o.status === statusFilter;
  });

  const calculateFormTotal = () => {
    return formItems.reduce((sum, item) => {
      const prod = products.find(p => p.productId === item.productId);
      return sum + (prod ? prod.unitPrice * item.quantity : 0);
    }, 0);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerId || formItems.some(i => !i.productId)) {
      setFormError("Validation Failed: Ensure customer and products are selected.");
      return;
    }

    const idSeed = Date.now();
    const orderId = `ORD-${idSeed}`;
    const finalItems: OrderItem[] = formItems.map((item, idx) => {
      const prod = products.find(p => p.productId === item.productId)!;
      return {
        itemId: `ITEM-${idSeed}-${idx}`,
        orderId: orderId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: prod.unitPrice
      };
    });

    const newOrder: Order = {
      orderId,
      orderRefNo: `DMIS-ORD-${orders.length + 1001}`,
      customerId: formCustomerId,
      orderDate: new Date().toISOString(),
      status: OrderStatus.Pending,
      paymentStatus: formPaymentStatus,
      totalAmount: finalItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      items: finalItems
    };

    // 1. Save Order
    LocalDB.setOrders([newOrder, ...orders]);

    // 2. FIXED: Create matching Delivery record for Logistics tab
    const newDelivery = {
      deliveryId: `DLV-${idSeed}`,
      orderId: orderId,
      scheduledDate: newOrder.dueDate,
      status: "Pending",
      assignedDriver: "Unassigned - Click Schedule"
    };
    const currentDeliveries = LocalDB.getDeliveries();
    LocalDB.setDeliveries([...currentDeliveries, newDelivery]);

    LocalDB.appendLog(currentUser.username, `Recorded Order ${newOrder.orderRefNo} & Initiated Logistics`, "ORDER");
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
              type="text" placeholder="Search orders..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
            />
          </div>
          <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl shadow-sm">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs font-black uppercase tracking-widest text-slate-700 outline-none bg-transparent">
              <option value="All">All Statuses</option>
              {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => setShowAddForm(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Order
        </button>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Ledgers ({filteredOrders.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                <th className="py-5 px-6">Ref Number</th>
                <th className="py-5 px-6">Customer</th>
                <th className="py-5 px-6">Date</th>
                <th className="py-5 px-6 text-right">Total</th>
                <th className="py-5 px-6 text-center">Fulfillment</th>
                <th className="py-5 px-6 text-center">Invoicing</th>
                <th className="py-5 px-6 text-center">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.map(order => (
                <tr key={order.orderId} className="hover:bg-slate-50/50 group">
                  <td className="py-5 px-6 font-mono text-xs font-black">{order.orderRefNo}</td>
                  <td className="py-5 px-6">
                    <p className="font-black text-slate-900 text-sm">{customers.find(c => c.customerId === order.customerId)?.customerName || "Retail Buyer"}</p>
                  </td>
                  <td className="py-5 px-6 text-[10px] font-bold text-slate-400">{new Date(order.orderDate).toLocaleDateString()}</td>
                  <td className="py-5 px-6 text-right font-black">₱{order.totalAmount.toLocaleString()}</td>
                  <td className="py-5 px-6 text-center">
                    <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{order.status}</span>
                  </td>
                  <td className="py-5 px-6 text-center">
                    <select
                      value={order.paymentStatus}
                      onChange={(e) => handleTogglePayment(order.orderId, e.target.value as PaymentStatus)}
                      className="text-[9px] font-black uppercase border rounded-lg px-2 py-1 bg-slate-50 outline-none cursor-pointer"
                    >
                        <option value="Unpaid">Unpaid</option>
                        <option value="Partial">Partial</option>
                        <option value="Paid">Paid</option>
                    </select>
                  </td>
                  <td className="py-5 px-6 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => setSelectedInvoiceOrder(order)} className="p-2 border rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
                        <Printer className="w-4 h-4 text-slate-400" />
                      </button>
                      
                      {/* FIXED: Stable Dropdown logic */}
                      <div className="relative group">
                        <button className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                          Transition <ChevronDown className="w-3 h-3" />
                        </button>
                        <div className="absolute right-0 bottom-full mb-0 pb-2 w-40 hidden group-hover:block z-50">
                          <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden">
                            {Object.values(OrderStatus).map(status => (
                              <button key={status} onClick={() => handleUpdateOrderStatus(order.orderId, status)} className="w-full px-4 py-2.5 text-[10px] font-black uppercase text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 text-left transition-colors cursor-pointer">
                                {status}
                              </button>
                            ))}
                          </div>
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

      {/* --- INVOICE MODAL (Restored & Crash Proof) --- */}
      <AnimatePresence>
        {selectedInvoiceOrder && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="bg-slate-900 px-8 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <FileText className="w-5 h-5 text-indigo-400" />
                   <span className="text-white text-sm font-bold">Official Billing Receipt Invoice</span>
                </div>
                <div className="flex items-center gap-3">
                   <button onClick={downloadPDFInvoice} className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 cursor-pointer">
                     <Download className="w-3.5 h-3.5" /> Download PDF
                   </button>
                   <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 cursor-pointer">
                     <Printer className="w-3.5 h-3.5" /> Print
                   </button>
                   <button onClick={() => setSelectedInvoiceOrder(null)} className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer">
                     <X className="w-6 h-6" />
                   </button>
                </div>
              </div>

              <div className="p-10 space-y-8 text-slate-700">
                 <div className="flex justify-between items-start border-b border-slate-100 pb-8">
                    <div className="space-y-1">
                       <h1 className="text-2xl font-black text-slate-900 tracking-tight">DRABBIT MARKETING</h1>
                       <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Supply & Distribution Center</p>
                       <p className="text-[11px] text-slate-400 mt-2">Plainview Village KM.10 Sasa, Davao City</p>
                    </div>
                    <div className="text-right space-y-1">
                       <h2 className="text-2xl font-black text-slate-900">INVOICE</h2>
                       <p className="text-[11px] font-mono text-slate-500">Ref: {selectedInvoiceOrder.orderRefNo}</p>
                       <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase mt-2 inline-block">
                         {selectedInvoiceOrder.paymentStatus}
                       </span>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-8 text-[11px]">
                    <div>
                       <p className="font-black text-indigo-600 uppercase mb-1">Billed Client</p>
                       <p className="text-sm font-black text-slate-900">{customers.find(c => c.customerId === selectedInvoiceOrder.customerId)?.customerName || "Retail Client"}</p>
                    </div>
                    <div className="text-right">
                       <p className="font-black text-indigo-600 uppercase mb-1">Details</p>
                       <p className="font-bold">Issued: {new Date(selectedInvoiceOrder.orderDate).toLocaleDateString()}</p>
                       <p className="text-rose-500 font-bold">Due: {selectedInvoiceOrder.dueDate}</p>
                    </div>
                 </div>

                 <table className="w-full text-xs">
                    <thead>
                       <tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                          <th className="py-4 text-left">Description</th>
                          <th className="py-4 text-center">Qty</th>
                          <th className="py-4 text-right">Total</th>
                       </tr>
                    </thead>
                    <tbody>
                       {(selectedInvoiceOrder.items || []).map((item, i) => (
                          <tr key={i} className="border-b border-slate-50">
                             <td className="py-4 font-black">{products.find(p => p.productId === item.productId)?.productName || "Item"}</td>
                             <td className="py-4 text-center">{item.quantity} units</td>
                             <td className="py-4 text-right font-black">P{(item.quantity * item.unitPrice).toFixed(2)}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>

                 <div className="flex flex-col items-end pt-6">
                    <div className="flex justify-between w-64 border-t border-slate-900 pt-4">
                       <span className="font-black text-slate-900 uppercase">Total Payable</span>
                       <span className="font-black text-indigo-600 text-lg">P{selectedInvoiceOrder.totalAmount.toLocaleString()}</span>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}