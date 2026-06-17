import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Globe, WifiOff, LayoutDashboard, ShoppingBag, Package, Users, Truck, AlertTriangle, Terminal, FolderLock, LogOut, ChevronRight, Menu, X } from "lucide-react";
import { User, Product, Customer, Order, UserRole } from "./types";
import { LocalDB } from "./services/db";

// View Imports
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const refreshData = () => {
    setUsers(LocalDB.getUsers() || []);
    setProducts(LocalDB.getProducts() || []);
    setCustomers(LocalDB.getCustomers() || []);
    setOrders(LocalDB.getOrders() || []);
  };

  useEffect(() => {
    refreshData();
    // Auto-Init Connection
    fetch("/api/db/status")
      .then(r => r.json())
      .then(status => {
        setDbStatus(status);
        if (status.isRemote) {
          LocalDB.pullFromTurso().then(refreshData);
        }
      }).catch(() => setDbStatus({ isRemote: false }));

    const saved = localStorage.getItem("dmis_logged_in_user");
    if (saved) setCurrentUser(JSON.parse(saved));
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
      {/* Banner */}
      {dbStatus && (
        <div className={`text-[10px] py-1 px-4 font-bold text-center uppercase tracking-widest text-white flex justify-center items-center gap-2 ${dbStatus.isRemote ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {dbStatus.isRemote ? <Globe className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {dbStatus.isRemote ? "Live Turso Cloud Connected" : "Offline Mode - Check Connection"}
        </div>
      )}

      <header className="bg-white border-b border-slate-100 h-16 flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black">D</div>
          <span className="font-bold text-slate-900 uppercase text-sm">Drabbit Marketing</span>
        </div>
        <button onClick={() => { setCurrentUser(null); localStorage.removeItem("dmis_logged_in_user"); }} className="text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center gap-2">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col lg:flex-row gap-6">
        <aside className="w-64 shrink-0 hidden lg:block bg-white border border-slate-100 rounded-2xl p-4 shadow-sm h-fit">
          {menuItems.map(item => {
             const Icon = item.icon;
             if (item.restricted && currentUser.role !== UserRole.Proprietor) return null;
             return (
               <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all mb-1 ${activeTab === item.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                 <div className="flex items-center gap-2"><Icon className="w-4 h-4" /> {item.label}</div>
                 <ChevronRight className={`w-3 h-3 ${activeTab === item.id ? 'rotate-90' : 'opacity-30'}`} />
               </button>
             );
          })}
        </aside>

        <main className="flex-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm min-h-[600px]">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {activeTab === "Dashboard" && <DashboardView products={products} orders={orders} currentUser={currentUser} onRefreshData={refreshData} complaints={[]} />}
              {activeTab === "Orders" && <OrderManagementView orders={orders} products={products} customers={customers} currentUser={currentUser} onRefreshData={refreshData} />}
              {activeTab === "Inventory" && <InventoryView products={products} currentUser={currentUser} onRefreshData={refreshData} />}
              {activeTab === "Customers" && <CustomerView customers={customers} currentUser={currentUser} onRefreshData={refreshData} />}
              {activeTab === "Users" && <UserManagementView users={users} currentUser={currentUser} onRefreshData={refreshData} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}