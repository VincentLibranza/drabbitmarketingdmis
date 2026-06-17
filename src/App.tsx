import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, LayoutDashboard, ShoppingBag, Package, Users, Truck, 
  AlertTriangle, Terminal, Settings, LogOut, RefreshCw, FolderLock, 
  ChevronRight, Menu, X, Upload, Download, Undo2, WifiOff, Globe
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
  // States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Data pools
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Connection states
  const [syncLoading, setSyncLoading] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{ connectionType: string; databaseUrl: string; isRemote: boolean } | null>(null);
  
  // Form states
  const [configDbUrl, setConfigDbUrl] = useState("");
  const [configAuthToken, setConfigAuthToken] = useState("");
  const [showConfigForm, setShowConfigForm] = useState(false);

  const [backgroundSyncs, setBackgroundSyncs] = useState<Record<string, any>>({});

  // 1. DATA REFRESH LOGIC
  const refreshData = () => {
    setUsers(LocalDB.getUsers());
    setProducts(LocalDB.getProducts());
    setCustomers(LocalDB.getCustomers());
    setOrders(LocalDB.getOrders());
    setDeliveries(LocalDB.getDeliveries());
    setComplaints(LocalDB.getComplaints());
    setAuditLogs(LocalDB.getAuditLogs());
  };

  // 2. STATUS CHECK LOGIC
  const fetchDbStatus = async () => {
    try {
      const res = await fetch("/api/db/status");
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
        if (data.rawDatabaseUrl) setConfigDbUrl(data.rawDatabaseUrl);
      }
    } catch (e) {
      console.warn("API Status check failed:", e);
    }
  };

  // 3. PULL FROM CLOUD LOGIC
  const handleManualPull = async (silent = false) => {
    if (!silent) setSyncLoading(true);
    try {
      const res = await fetch("/api/db/pull");
      const json = await res.json();
      if (json.success && json.data) {
        const { users, products, customers, orders, deliveries, complaints, auditLogs } = json.data;
        if (users) LocalDB.setUsers(users, true);
        if (products) LocalDB.setProducts(products, true);
        if (customers) LocalDB.setCustomers(customers, true);
        if (orders) LocalDB.setOrders(orders, true);
        if (deliveries) LocalDB.setDeliveries(deliveries, true);
        if (complaints) LocalDB.setComplaints(complaints, true);
        if (auditLogs) LocalDB.setAuditLogs(auditLogs, true);
        refreshData();
        if (!silent) alert("Successfully pooled data from Turso Cloud!");
      }
    } catch (err) {
      if (!silent) alert("Failed to pull from Turso Cloud.");
    } finally {
      setSyncLoading(false);
    }
  };

  // INITIAL BOOT
  useEffect(() => {
    refreshData();
    fetchDbStatus();
    handleManualPull(true);
    
    const savedUser = localStorage.getItem("dmis_logged_in_user");
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  // Event listener for background sync status
  useEffect(() => {
    const handleSyncEvent = (e: any) => {
      const { table, status, error, count, timestamp } = e.detail;
      setBackgroundSyncs(prev => ({ ...prev, [table]: { status, error, count, timestamp } }));
    };
    window.addEventListener("dmis-sync-status", handleSyncEvent);
    return () => window.removeEventListener("dmis-sync-status", handleSyncEvent);
  }, []);

  if (!currentUser) return <LoginScreen onLoginSuccess={(u) => { setCurrentUser(u); localStorage.setItem("dmis_logged_in_user", JSON.stringify(u)); refreshData(); }} />;

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
      
      {/* ⚠️ CRITICAL CONNECTION WARNING BANNER */}
      {dbStatus && !dbStatus.isRemote && (
        <div className="bg-rose-600 text-white text-[10px] py-1.5 px-4 font-black flex items-center justify-center gap-2 uppercase tracking-widest z-50">
          <WifiOff className="w-3 h-3" />
          <span>Warning: App is NOT connected to Turso Cloud. Using transient local storage. Data will be lost!</span>
          <button onClick={() => setShowConfigForm(true)} className="underline ml-4 hover:text-white/80">Configure Now</button>
        </div>
      )}

      {dbStatus && dbStatus.isRemote && (
        <div className="bg-emerald-600 text-white text-[10px] py-1 px-4 font-bold flex items-center justify-center gap-2 uppercase tracking-widest z-50">
          <Globe className="w-3 h-3" />
          <span>Connected to Turso Cloud Database (Live Sync Active)</span>
        </div>
      )}

      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-500"><Menu className="w-5 h-5" /></button>
            <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg">D</div>
            <div>
              <span className="font-bold text-slate-900 text-sm block uppercase">DRABBIT MARKETING</span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider">SASA, DAVAO HUB</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => { setCurrentUser(null); localStorage.removeItem("dmis_logged_in_user"); }} className="text-xs bg-slate-100 px-3 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-rose-50 hover:text-rose-600">
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
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${activeTab === item.id ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
                  <Icon className="w-4.5 h-4.5" /> {item.label}
                </button>
              );
            })}
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-4">
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Sync Telemetry</div>
             
             {/* Sync Logs */}
             <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {Object.entries(backgroundSyncs).map(([table, sync]: any) => (
                  <div key={table} className="flex justify-between text-[9px] font-mono">
                    <span className="text-slate-500 uppercase">{table}</span>
                    <span className={sync.status === 'success' ? 'text-emerald-600' : 'text-amber-600'}>
                      {sync.status === 'syncing' ? '...' : '✓'}
                    </span>
                  </div>
                ))}
             </div>

             <button onClick={() => handleManualPull()} className="w-full text-[10px] bg-slate-100 py-2 rounded-lg font-bold hover:bg-indigo-50 hover:text-indigo-600">
               Force Cloud Sync Pull
             </button>
          </div>
        </aside>

        <main className="flex-1 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
           {/* Current View Render logic remains same as yours */}
           {activeTab === "Dashboard" && <DashboardView products={products} orders={orders} complaints={complaints} currentUser={currentUser} onRefreshData={refreshData} />}
           {activeTab === "Orders" && <OrderManagementView orders={orders} products={products} customers={customers} currentUser={currentUser} onRefreshData={refreshData} />}
           {activeTab === "Inventory" && <InventoryView products={products} currentUser={currentUser} onRefreshData={refreshData} />}
           {activeTab === "Customers" && <CustomerView customers={customers} currentUser={currentUser} onRefreshData={refreshData} />}
           {activeTab === "Deliveries" && <DeliveryView deliveries={deliveries} orders={orders} customers={customers} currentUser={currentUser} onRefreshData={refreshData} />}
           {activeTab === "Complaints" && <ComplaintsView complaints={complaints} customers={customers} products={products} currentUser={currentUser} onRefreshData={refreshData} />}
           {activeTab === "Users" && <UserManagementView users={users} currentUser={currentUser} onRefreshData={refreshData} />}
           {activeTab === "Audit" && <AuditView logs={auditLogs} onRefreshData={refreshData} />}
        </main>
      </div>
    </div>
  );
}