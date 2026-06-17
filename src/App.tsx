import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, WifiOff, LogOut, LayoutDashboard, ShoppingBag, Package, 
  Users, Truck, AlertTriangle, Terminal, FolderLock, ChevronRight,
  Database, RefreshCw, FileJson, Download, Upload, ShieldCheck
} from "lucide-react";
import { LocalDB } from "./services/db";
import { UserRole } from "./types";

// Import Views
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [dbStatus, setDbStatus] = useState<any>(null);

  // States for all views
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const refreshData = () => {
    setProducts(LocalDB.getProducts());
    setCustomers(LocalDB.getCustomers());
    setOrders(LocalDB.getOrders());
    setDeliveries(LocalDB.getDeliveries());
    setComplaints(LocalDB.getComplaints());
    setAuditLogs(LocalDB.getAuditLogs());
  };

  useEffect(() => {
    refreshData();
    // Auto-Connect on start
    fetch("/api/db/status")
      .then(r => r.json())
      .then(status => {
        setDbStatus(status);
        if (status.isRemote) LocalDB.pullFromTurso().then(refreshData);
      })
      .catch(() => setDbStatus({ isRemote: false }));

    const saved = localStorage.getItem("dmis_logged_in_user");
    if (saved) setCurrentUser(JSON.parse(saved));
  }, []);

  if (!currentUser) return (
    <LoginScreen onLoginSuccess={(u) => { 
      setCurrentUser(u); 
      localStorage.setItem("dmis_logged_in_user", JSON.stringify(u)); 
      LocalDB.appendLog(u.username, "User Access Granted", "USER");
      refreshData(); 
    }} />
  );

  const menuItems = [
    { id: "Dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "Orders", label: "Orders Intake & Invoices", icon: ShoppingBag },
    { id: "Inventory", label: "Inventory Monitoring", icon: Package },
    { id: "Customers", label: "Customer Profiles", icon: Users },
    { id: "Deliveries", label: "Logistics Tracking", icon: Truck },
    { id: "Complaints", label: "Complaints & Returns", icon: AlertTriangle },
    { id: "Users", label: "User Management", icon: FolderLock, restricted: true },
    { id: "Audit", label: "System Audits Trail", icon: Terminal }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100">
      {/* Turso Cloud Status Banner */}
      {dbStatus && (
        <div className={`text-[10px] py-1 px-4 font-bold text-center uppercase tracking-widest text-white flex justify-center items-center gap-2 transition-colors ${dbStatus.isRemote ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {dbStatus.isRemote ? <Globe className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {dbStatus.isRemote ? "Live Turso Cloud Sync Active" : "Offline Reactive Mode - Storage Local"}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-100 h-20 flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100">D</div>
          <div>
            <h1 className="font-black text-slate-900 uppercase text-lg leading-none tracking-tight">Drabbit Marketing</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] mt-1 uppercase">Sasa, Davao Central Hub</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 mt-1">
              {currentUser.role === UserRole.Proprietor ? "Proprietor Account" : "Staff Account"}
            </span>
          </div>
          <button 
            onClick={() => { setCurrentUser(null); localStorage.removeItem("dmis_logged_in_user"); }} 
            className="text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-[1600px] w-full mx-auto p-8 flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-72 shrink-0 space-y-6">
          <div className="bg-white border border-slate-100 rounded-[2rem] p-5 shadow-xl shadow-slate-200/50">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-4 block mb-5">Business Intelligence Modules</span>
            <nav className="space-y-1">
              {menuItems.map(item => {
                 const Icon = item.icon;
                 if (item.restricted && currentUser.role !== UserRole.Proprietor) return null;
                 return (
                   <button 
                     key={item.id} 
                     onClick={() => setActiveTab(item.id)} 
                     className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-bold transition-all ${
                       activeTab === item.id 
                       ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 translate-x-2' 
                       : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                     }`}
                   >
                     <div className="flex items-center gap-3">
                       <Icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} /> 
                       {item.label}
                     </div>
                     <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === item.id ? 'rotate-90 opacity-100' : 'opacity-0'}`} />
                   </button>
                 );
              })}
            </nav>
          </div>

          {/* Restored SAD Development Control Panel */}
          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-xl shadow-slate-200/50">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-slate-900" />
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">SAD Development Control</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed mb-5 font-medium">
              This system implements a fully reactive offline local database. Your modifications persist dynamically inside browser localStorage.
            </p>
            <button 
              onClick={() => { if(window.confirm("Restore baseline seeds?")) { LocalDB.reset(); }}}
              className="w-full py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all mb-4"
            >
              Restore Baseline Spec Seeds
            </button>
            
            <div className="space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Backup & Migrations</p>
              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-100 rounded-lg text-[9px] font-black text-slate-600 hover:bg-slate-50">
                  <Download className="w-3 h-3" /> Export JSON
                </button>
                <button className="flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-100 rounded-lg text-[9px] font-black text-slate-600 hover:bg-slate-50">
                  <Upload className="w-3 h-3" /> Import JSON
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/40 min-h-[800px] relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab} 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }} 
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full"
            >
               {activeTab === "Dashboard" && <DashboardView products={products} orders={orders} currentUser={currentUser} onRefreshData={refreshData} complaints={complaints} />}
               {activeTab === "Orders" && <OrderManagementView orders={orders} products={products} customers={customers} currentUser={currentUser} onRefreshData={refreshData} />}
               {activeTab === "Inventory" && <InventoryView products={products} currentUser={currentUser} onRefreshData={refreshData} />}
               {activeTab === "Customers" && <CustomerView customers={customers} currentUser={currentUser} onRefreshData={refreshData} />}
               {activeTab === "Deliveries" && <DeliveryView deliveries={deliveries} orders={orders} customers={customers} currentUser={currentUser} onRefreshData={refreshData} />}
               {activeTab === "Complaints" && <ComplaintsView complaints={complaints} customers={customers} products={products} currentUser={currentUser} onRefreshData={refreshData} />}
               {activeTab === "Audit" && <AuditView logs={auditLogs} onRefreshData={refreshData} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Full Professional Footer */}
      <footer className="bg-white border-t border-slate-100 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <h3 className="text-slate-900 font-black text-xs uppercase tracking-[0.3em] mb-3">Drabbit Marketing System (DMIS)</h3>
          <p className="text-slate-400 text-[10px] font-medium max-w-2xl mx-auto leading-relaxed mb-6">
            Authorized for university system review. Davao Sasa distribution channels. All transactional activities 
            are audited in accordance with SAD guidelines.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Prepared by Team Honda ADV</span>
            <span className="h-1 w-1 bg-slate-200 rounded-full" />
            <span>Mapua Malayan Colleges Mindanao</span>
            <span className="h-1 w-1 bg-slate-200 rounded-full" />
            <span>CS103P S.A.D. Program</span>
          </div>
        </div>
      </footer>
    </div>
  );
}