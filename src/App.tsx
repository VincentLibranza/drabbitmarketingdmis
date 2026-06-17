import React, { useState, useEffect } from "react";
import { Globe, WifiOff, LogOut, LayoutDashboard, ShoppingBag, Package, Users, Truck, AlertTriangle, Terminal, FolderLock, ChevronRight } from "lucide-react";
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
    fetch("/api/db/status").then(r => r.json()).then(status => {
      setDbStatus(status);
      if (status.isRemote) LocalDB.pullFromTurso().then(refreshData);
    });

    const saved = localStorage.getItem("dmis_logged_in_user");
    if (saved) setCurrentUser(JSON.parse(saved));
  }, []);

  if (!currentUser) return <LoginScreen onLoginSuccess={(u) => { 
    setCurrentUser(u); 
    localStorage.setItem("dmis_logged_in_user", JSON.stringify(u)); 
    LocalDB.appendLog(u.username, "User Access Granted", "USER");
    refreshData(); 
  }} />;

  const menuItems = [
    { id: "Dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "Orders", label: "Orders Intake", icon: ShoppingBag },
    { id: "Inventory", label: "Inventory", icon: Package },
    { id: "Customers", label: "Customers", icon: Users },
    { id: "Deliveries", label: "Logistics Tracking", icon: Truck },
    { id: "Complaints", label: "Complaints & Returns", icon: AlertTriangle },
    { id: "Users", label: "Management", icon: FolderLock, restricted: true },
    { id: "Audit", label: "Audit Log Trail", icon: Terminal }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Dynamic Status Banner */}
      {dbStatus && (
        <div className={`text-[10px] py-1 px-4 font-bold text-center uppercase tracking-widest text-white flex justify-center items-center gap-2 ${dbStatus.isRemote ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {dbStatus.isRemote ? <Globe className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {dbStatus.isRemote ? "Live Turso Sync Active" : "Offline Storage Mode"}
        </div>
      )}

      <header className="bg-white border-b border-slate-100 h-16 flex items-center justify-between px-8 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-100">D</div>
          <span className="font-bold text-slate-900 uppercase text-sm tracking-tight">Drabbit Marketing Hub</span>
        </div>
        <button onClick={() => { setCurrentUser(null); localStorage.removeItem("dmis_logged_in_user"); }} className="text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center gap-2 transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col lg:flex-row gap-6">
        <aside className="w-64 shrink-0 hidden lg:block bg-white border border-slate-100 rounded-2xl p-4 shadow-sm h-fit">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 block mb-4">Proposed System Modules</span>
          {menuItems.map(item => {
             const Icon = item.icon;
             if (item.restricted && currentUser.role !== UserRole.Proprietor) return null;
             return (
               <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all mb-1 ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                 <div className="flex items-center gap-2.5"><Icon className="w-4 h-4" /> {item.label}</div>
                 <ChevronRight className={`w-3 h-3 ${activeTab === item.id ? 'rotate-90' : 'opacity-30'}`} />
               </button>
             );
          })}
        </aside>

        <main className="flex-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm min-h-[700px]">
           {activeTab === "Dashboard" && <DashboardView products={products} orders={orders} currentUser={currentUser} onRefreshData={refreshData} complaints={complaints} />}
           {activeTab === "Orders" && <OrderManagementView orders={orders} products={products} customers={customers} currentUser={currentUser} onRefreshData={refreshData} />}
           {activeTab === "Inventory" && <InventoryView products={products} currentUser={currentUser} onRefreshData={refreshData} />}
           {activeTab === "Customers" && <CustomerView customers={customers} currentUser={currentUser} onRefreshData={refreshData} />}
           {activeTab === "Deliveries" && <DeliveryView deliveries={deliveries} orders={orders} customers={customers} currentUser={currentUser} onRefreshData={refreshData} />}
           {activeTab === "Complaints" && <ComplaintsView complaints={complaints} customers={customers} products={products} currentUser={currentUser} onRefreshData={refreshData} />}
           {activeTab === "Audit" && <AuditView logs={auditLogs} onRefreshData={refreshData} />}
        </main>
      </div>
    </div>
  );
}