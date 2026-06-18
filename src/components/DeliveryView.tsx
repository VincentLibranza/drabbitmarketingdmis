/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Truck, 
  Search, 
  Calendar, 
  User, 
  MapPin, 
  Clock, 
  CheckCircle, 
  Compass, 
  AlertCircle,
  X,
  FileCheck
} from "lucide-react";
import { Delivery, DeliveryStatus, Order, Customer } from "../types";
import { LocalDB } from "../services/db";

interface DeliveryViewProps {
  deliveries: Delivery[];
  orders: Order[];
  customers: Customer[];
  currentUser: { username: string; name: string };
  onRefreshData: () => void;
}

export default function DeliveryView({
  deliveries,
  orders,
  customers,
  currentUser,
  onRefreshData
}: DeliveryViewProps) {
  
  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("All");
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states for scheduling
  const [formDriver, setFormDriver] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStatus, setFormStatus] = useState<DeliveryStatus>(DeliveryStatus.Pending);
  const [formError, setFormError] = useState<string | null>(null);

  // Filters
  const filteredDeliveries = deliveries.filter(d => {
    if (!d) return false;
    const order = orders.find(o => o.orderId === d.orderId);
    const customer = order ? customers.find(c => c.customerId === order.customerId) : null;
    
    const driverName = d.assignedDriver || "Unassigned";
    const orderRef = order?.orderRefNo || d.orderId || "";
    const customerName = customer?.customerName || "Walk-In Customer / Guest";

    const matchesSearch = 
      orderRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driverName.toLowerCase().includes(searchTerm.toLowerCase());

    const deliveryStatus = d.status || "Pending";

    if (activeTab === "All") return matchesSearch;
    return matchesSearch && deliveryStatus === activeTab;
  });

  // Start Edit Mode
  const handleStartEdit = (d: Delivery) => {
    setEditingDelivery(d);
    setFormDriver(d.assignedDriver);
    setFormDate(d.scheduledDate);
    setFormStatus(d.status);
    setFormError(null);
  };

  // Submit Schedule updates
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formDriver.trim()) {
      setFormError("Must input driver or vehicle description.");
      return;
    }

    if (!formDate) {
      setFormError("Scheduled delivery date is required.");
      return;
    }

    const currentDeliveries = LocalDB.getDeliveries();
    const updatedDeliveries = currentDeliveries.map(d => {
      if (d.deliveryId === editingDelivery?.deliveryId) {
        
        // Log state changes inside Audit Trails
        LocalDB.appendLog(
          currentUser.username, 
          `Scheduled delivery route ${d.deliveryId} to driver: ${formDriver} on ${formDate} (Status: ${formStatus})`, 
          "DELIVERY"
        );

        // Also sync order status to delivered if selected "Delivered"
        if (formStatus === DeliveryStatus.Delivered) {
          const currentOrders = LocalDB.getOrders();
          const pProducts = LocalDB.getProducts();

          const updatedOrders = currentOrders.map(o => {
            if (o.orderId === d.orderId) {
              
              // Only decrement products if not already matching Delivered
              if (o.status !== "Delivered") {
                const updatedProducts = pProducts.map(p => {
                  const lineItem = o.items.find(i => i.productId === p.productId);
                  if (lineItem) {
                    const remainingStock = Math.max(0, p.stockQuantity - lineItem.quantity);
                    return { ...p, stockQuantity: remainingStock };
                  }
                  return p;
                });
                LocalDB.setProducts(updatedProducts);
              }

              return { ...o, status: "Delivered" as any };
            }
            return o;
          });
          LocalDB.setOrders(updatedOrders);
        } else if (formStatus === DeliveryStatus.InTransit) {
          const currentOrders = LocalDB.getOrders();
          const updatedOrders = currentOrders.map(o => {
            if (o.orderId === d.orderId) {
              return { ...o, status: "Dispatched" as any };
            }
            return o;
          });
          LocalDB.setOrders(updatedOrders);
        }

        return {
          ...d,
          assignedDriver: formDriver,
          scheduledDate: formDate,
          status: formStatus,
          deliveryDate: formStatus === DeliveryStatus.Delivered ? new Date().toISOString().replace("T", " ").substring(0, 16) : d.deliveryDate
        };
      }
      return d;
    });

    LocalDB.setDeliveries(updatedDeliveries);
    setEditingDelivery(null);
    setSuccessMsg("Logistics routing configuration successfully updated!");
    onRefreshData();
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-250 p-4 rounded-xl flex items-center gap-2.5 text-xs font-semibold">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* filter bar coordinates */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
        
        {/* tabs */}
        <div className="flex gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-xl">
          {["All", "Pending", "In Transit", "Delivered"].map(tabName => (
            <button
              key={tabName}
              onClick={() => setActiveTab(tabName)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                activeTab === tabName ? 
                "bg-indigo-600 text-white shadow" :
                "text-slate-550 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              {tabName}
            </button>
          ))}
        </div>

        {/* Searching bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search driver, company, order..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all text-slate-850"
          />
        </div>
      </div>

      {/* Grid listing Active Routes */}
      {filteredDeliveries.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-500 space-y-4 shadow-sm max-w-lg mx-auto mt-6">
          <div className="mx-auto w-12 h-12 bg-slate-50 border border-slate-200 text-indigo-500 rounded-xl flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">No active dispatch routes</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              We couldn't find any logistics tracking records matching your active tab or search term. Create a new customer order to automatically generate its dispatch route.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDeliveries.map(d => {
            const order = orders.find(o => o.orderId === d.orderId);
            const customer = order ? customers.find(c => c.customerId === order.customerId) : null;
            
            return (
              <motion.div
                layout
                key={d.deliveryId}
                className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-350 transition-all ${
                  d.status === DeliveryStatus.Delivered ? 'border-slate-100 bg-slate-50/20' : 'border-indigo-100'
                }`}
              >
                {/* Card top bar */}
                <div className="flex justify-between items-start">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                    d.status === DeliveryStatus.Delivered ? "bg-emerald-50 text-emerald-800" :
                    d.status === DeliveryStatus.InTransit ? "bg-indigo-50 text-indigo-800" :
                    "bg-amber-50 text-amber-800"
                  }`}>
                    <Truck className="w-3 h-3" />
                    {d.status}
                  </span>

                  <span className="text-[10px] text-slate-400 font-mono font-medium">Route: {d.deliveryId}</span>
                </div>

                {/* Order Info Panel */}
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-404 tracking-wider">Client Recipient</p>
                  <h4 className="font-bold text-slate-900 text-sm">{customer?.customerName || "Drabbit Walk-in Customer"}</h4>
                  <div className="flex items-start gap-1 text-slate-500 text-xs mt-1 leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 text-slate-500">{customer?.address || "Wait Counter Sasa Retail Desk"}</span>
                  </div>
                </div>

                {/* Logistik Handler Details */}
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Assignee: <strong className="font-semibold text-slate-800">{d.assignedDriver}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Scheduled Date: <strong className="font-mono text-slate-700">{d.scheduledDate}</strong></span>
                  </div>
                  {d.deliveryDate && (
                    <div className="flex items-center gap-2 text-emerald-700 font-medium">
                      <Clock className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Fulfilled Time: <span className="font-mono text-xs">{d.deliveryDate}</span></span>
                    </div>
                  )}
                </div>

                {/* Action Trigger */}
                <div className="pt-2 border-t border-slate-50 flex justify-between items-center text-xs">
                  <span className="text-[10px] font-mono text-slate-400">Order: {order?.orderRefNo || d.orderId}</span>
                  <button
                    onClick={() => handleStartEdit(d)}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-750 font-bold tracking-tight transition-all cursor-pointer"
                  >
                    Schedule Dispatch
                  </button>
                </div>

              </motion.div>
            );
          })}
        </div>
      )}

      {/* Editing Scheduler overlay Dialog */}
      <AnimatePresence>
        {editingDelivery && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl overflow-hidden max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-slate-900 text-sm">Schedule Delivery routing</span>
                </div>
                <button 
                  onClick={() => setEditingDelivery(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-5 text-xs text-slate-700">
                
                {formError && (
                  <div className="rounded-lg bg-rose-50 p-3.5 text-rose-700 border border-rose-100 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Logistics Handler</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Benny Santos (Truck A), City Dispatch"
                    value={formDriver}
                    onChange={(e) => setFormDriver(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Scheduled Departure Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Current Logistics status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as DeliveryStatus)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 text-xs font-semibold"
                  >
                    <option value={DeliveryStatus.Pending}>Pending (Preparation)</option>
                    <option value={DeliveryStatus.InTransit}>In Transit (Dispatched)</option>
                    <option value={DeliveryStatus.Delivered}>Delivered (Route Finished)</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow transition-all flex justify-center items-center gap-1.5 cursor-pointer text-sm"
                  >
                    <FileCheck className="w-4 h-4" />
                    Save Dispatch Route
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingDelivery(null)}
                    className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-center text-sm"
                  >
                    Cancel
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
