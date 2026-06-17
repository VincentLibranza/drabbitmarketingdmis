/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, LayoutDashboard, ShoppingBag, Package, Users, Truck, 
  AlertTriangle, Terminal, Settings, LogOut, Globe, WifiOff,
  ChevronRight, Menu, X, Upload, Download, Undo2
} from "lucide-react";

import { User, Product, Customer, Order, Delivery, Complaint, AuditLog, UserRole } from "./types";
import { LocalDB } from "./services/db";

// Core views
import LoginScreen from "./components/LoginScreen";
import DashboardView from "./components/DashboardView";
import OrderManagementView from "./components/OrderManagementView";
import InventoryView from "./components/InventoryView";
import CustomerView from "./components/CustomerView";
import DeliveryView from "./components/DeliveryView";
import ComplaintsView from "./components/ComplaintsView";
import UserManagementView from "./components/UserManagementView";
import AuditView from "./components/AuditView";

export default function App() {
  
  // App States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Data State Pools
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Connection & Sync States
  const [dbStatus, setDbStatus] = useState<{ connectionType: string; databaseUrl: string; isRemote: boolean } | null>(null);
  const [backgroundSyncs, setBackgroundSyncs] = useState<Record<string, any>>({});

  // 1. REFRESH LOCAL STATE
  const refreshData = () => {
    setUsers(LocalDB.getUsers());
    setProducts(LocalDB.getProducts());
    setCustomers(LocalDB.getCustomers());
    setOrders(LocalDB.getOrders());
    setDeliveries(LocalDB.getDeliveries());
    setComplaints(LocalDB.getComplaints());
    setAuditLogs(LocalDB.getAuditLogs());
  };

  // 2. AUTOMATIC INITIALIZATION (On Boot)
  useEffect(() => {
    // A. Load cached data for instant display
    refreshData();

    // B. Check connection status with Vercel/Turso
    const initConnection = async () => {
      try {
        const res = await fetch("/api/db/status");
        if (res.ok) {
          const data = await res.json();
          setDbStatus(data);
          
          // C. If connected, pull latest data from cloud automatically
          if (data.isRemote) {
            console.log("[Auto-Init] Cloud detected. Syncing...");
            await LocalDB.pullFromTurso();
            refreshData();
          }
        }
      } catch (e) {
        console.warn("Initial connection check failed:", e);
      }
    };

    initConnection();

    // Check for existing login session
    const savedUser = localStorage.getItem("dmis_logged_in_user");
    if (savedUser) {
      try { setCurrentUser(JSON.parse(savedUser)); } catch { }
    }
  }, []);

  // 3. LISTEN FOR BACKGROUND SYNC STATUS
  useEffect(() => {
    const handleSyncEvent = (e: any) => {
      const { table, status, count } = e.detail;
      setBackgroundSyncs((prev) => ({ ...prev, [table]: { status, count, timestamp: new Date() } }));
      // Refresh local UI state after a sync completes
      if (status === "success") refreshData();
    };
    window.addEventListener("dmis-sync-status", handleSyncEvent);
    return () => window.removeEventListener("dmis-sync-status", handleSyncEvent);
  }, []);

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(u) => { 
      setCurrentUser(u); 
      localStorage.setItem("dmis_logged_in_user", JSON.stringify(u)); 
      refreshData(); 
    }} />;
  }

  const menuItems = [
    { id: "Dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "Orders", label: "Orders Intake", icon: ShoppingBag },
    { id: "Inventory", label: "Inventory", icon: Package },
    { id: "Customers", label: "Customers", icon: Users },
    { id: "Deliveries", label: "Logistics", icon: Truck },
    { id: "Complaints", label: "Complaints", icon: AlertTriangle },
    { id: "Users", label: "Management", icon: FolderLock, restricted: true },
    { id: "Audit", label: "Audit Log", icon: Terminal }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* --- AUTOMATIC CONNECTION BANNERS --- */}
      {dbStatus && !dbStatus.isRemote && (
        <div className="bg-rose-600 text-white text-[10px] py-1.5 px-4 font-black flex items-center justify-center gap-2 uppercase tracking-widest z-50">
          <WifiOff className="w-3 h-3" />
          <span>Warning: Database Disconnected. Using temporary local storage.</span>
        </div>
      )}

      {dbStatus && dbStatus.isRemote && (
        <div className="bg-emerald-600 text-white text-[10px] py-1 px-4 font-bold flex items-center justify-center gap-2 uppercase tracking-widest z-50">
          <Globe className="w-3 h-3" />
          <span>Live Turso Cloud Sync Active</span>
        </div>
      )}

      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-500"><Menu className="w-5 h-5" /></button>
            <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg">D</div>
            <div>
              <span className="font-bold text-slate-900 text-sm block uppercase">DRABBIT MARKETING</span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Sasa, Davao Hub</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => { setCurrentUser(null); localStorage.removeItem("dmis_logged_in_user"); }} className="text-xs bg-slate-100 px-3 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-rose-50 hover:text-rose-600 transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        <aside className="hidden lg:block w-64 shrink-0 space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-1">
            {menuItems.map(item => {
              const Icon = item.icon;
              if (item.restricted && currentUser.role !== UserRole.Proprietor) return null;
              return (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === item.id ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
                  <div className="flex items-center gap-2.5"><Icon className="w-4.5 h-4.5" /> <span>{item.label}</span></div>
                  <ChevronRight className={`w-3.5 h-3.5 ${activeTab === item.id ? "rotate-90" : "opacity-40"}`} />
                </button>
              );
            })}
          </div>

          {/* Sync Telemetry Panel */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
             <div className="flex items-center gap-1.5 font-bold text-indigo-600 text-[10px] uppercase tracking-widest">
               <Terminal className="w-3.5 h-3.5" /> Sync Telemetry
             </div>
             <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {Object.entries(backgroundSyncs).map(([table, sync]: any) => (
                  <div key={table} className="flex justify-between text-[9px] font-mono leading-none">
                    <span className="text-slate-400">{table}</span>
                    <span className={sync.status === 'success' ? 'text-emerald-600 font-bold' : 'text-amber-500'}>
                      {sync.status === 'syncing' ? 'UPDATING...' : '✓ LIVE'}
                    </span>
                  </div>
                ))}
                {Object.keys(backgroundSyncs).length === 0 && <div className="text-[9px] text-slate-300 italic">No activity detected...</div>}
             </div>
             <button onClick={() => { LocalDB.pullFromTurso().then(refreshData); }} className="w-full text-[10px] font-black uppercase tracking-tighter bg-slate-50 border border-slate-100 py-2 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 transition-all">
                Force Cloud Refresh
             </button>
          </div>
        </aside>

        <main className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 sm:p-6 shadow-sm min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {activeTab === "Dashboard" && <DashboardView products={products} orders={orders} complaints={complaints} currentUser={currentUser} onRefreshData={refreshData} />}
              {activeTab === "Orders" && <OrderManagementView orders={orders} products={products} customers={customers} currentUser={currentUser} onRefreshData={refreshData} />}
              {activeTab === "Inventory" && <InventoryView products={products} currentUser={currentUser} onRefreshData={refreshData} />}
              {activeTab === "Customers" && <CustomerView customers={customers} currentUser={currentUser} onRefreshData={refreshData} />}
              {activeTab === "Deliveries" && <DeliveryView deliveries={deliveries} orders={orders} customers={customers} currentUser={currentUser} onRefreshData={refreshData} />}
              {activeTab === "Complaints" && <ComplaintsView complaints={complaints} customers={customers} products={products} currentUser={currentUser} onRefreshData={refreshData} />}
              {activeTab === "Users" && <UserManagementView users={users} currentUser={currentUser} onRefreshData={refreshData} />}
              {activeTab === "Audit" && <AuditView logs={auditLogs} onRefreshData={refreshData} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <footer className="bg-white border-t border-slate-100 py-6 text-center text-slate-400 text-[10px] uppercase font-bold tracking-widest">
        Drabbit Marketing System (DMIS) • Davao Sasa Distribution Hub
      </footer>
    </div>
  );
}