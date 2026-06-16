/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Users, 
  Truck, 
  AlertTriangle, 
  Terminal, 
  Settings, 
  LogOut, 
  Sparkles,
  RefreshCw,
  FolderLock,
  ChevronRight,
  Menu,
  X
} from "lucide-react";

import { User, Product, Customer, Order, Delivery, Complaint, AuditLog, UserRole } from "./types";
import { LocalDB } from "./db";

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

  // Synchronized state pools
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dbInfo, setDbInfo] = useState(() => LocalDB.getDBInfo());
  const [cloudUrlInput, setCloudUrlInput] = useState(dbInfo.savedUrl || "");
  const [cloudTokenInput, setCloudTokenInput] = useState(dbInfo.savedToken || "");
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [dbConfigError, setDbConfigError] = useState<string | null>(null);
  const [dbConfigSuccess, setDbConfigSuccess] = useState<string | null>(null);

  // Function to pull latest state from LocalDB
  const refreshData = () => {
    setUsers(LocalDB.getUsers());
    setProducts(LocalDB.getProducts());
    setCustomers(LocalDB.getCustomers());
    setOrders(LocalDB.getOrders());
    setDeliveries(LocalDB.getDeliveries());
    setComplaints(LocalDB.getComplaints());
    setAuditLogs(LocalDB.getAuditLogs());
    
    const info = LocalDB.getDBInfo();
    setDbInfo(info);
    if (info.savedUrl && info.savedUrl !== "Unconfigured (Pending Connection)") {
      setCloudUrlInput(info.savedUrl);
    }
    if (info.savedToken) {
      setCloudTokenInput(info.savedToken);
    }
  };

  // Sync state on boot
  useEffect(() => {
    // Initial display of cached localized data
    refreshData();
    
    const initBoot = async () => {
      let isCloudJustConnected = false;
      try {
        // Query the backend status to see if database environment variables are already active
        const statusRes = await fetch("/api/db/status");
        if (statusRes.ok) {
          const statusJson = await statusRes.json();
          if (statusJson.isRemote) {
            const wasRemoteBefore = localStorage.getItem("dmis_db_is_remote") === "true";
            localStorage.setItem("dmis_db_is_remote", "true");
            localStorage.setItem("dmis_db_url", statusJson.databaseUrl);
            localStorage.setItem("dmis_db_connection_type", statusJson.connectionType);
            if (!localStorage.getItem("dmis_db_saved_url")) {
              localStorage.setItem("dmis_db_saved_url", statusJson.databaseUrl);
            }
            if (!wasRemoteBefore) {
              isCloudJustConnected = true;
            }
          } else {
            // Restore dynamic cloud database reference on backend if saved
            const savedUrl = localStorage.getItem("dmis_db_saved_url");
            const savedToken = localStorage.getItem("dmis_db_saved_token");
            if (savedUrl && savedUrl !== "Unconfigured (Pending Connection)") {
              console.log("Restoring active cloud Turso DB on Express instance...");
              await LocalDB.configureCloudDB(savedUrl, savedToken || undefined);
            }
          }
        }
      } catch (err) {
        console.error("Failed checking backend database connection status on boot:", err);
      }

      // Safe cloud database sync logic
      try {
        const isRemote = localStorage.getItem("dmis_db_is_remote") === "true";
        if (isRemote) {
          const hasInitSynced = localStorage.getItem("dmis_db_has_init_sync") === "true";
          if (!hasInitSynced || isCloudJustConnected) {
            console.log("Newly connected or un-migrated cloud Turso DB. Migrating current browser data as default seed snapshot...");
            await LocalDB.pushAllLocalToCloud();
            localStorage.setItem("dmis_db_has_init_sync", "true");
          } else {
            console.log("Pulling latest cloud database state...");
            const success = await LocalDB.pullFromDB();
            if (success) {
              refreshData();
            }
          }
        }
      } catch (err) {
        console.error("Failed syncing cloud state on boot:", err);
      }
    };

    initBoot();
    
    // Automatically retrieve previous session if active in localStorage
    const savedUser = localStorage.getItem("dmis_logged_in_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
      } catch {
        // Safe discard
      }
    }
  }, []);

  // Secure Sign-in handler
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("dmis_logged_in_user", JSON.stringify(user));
    refreshData();
  };

  // Secure Sign-out handler
  const handleLogout = () => {
    if (currentUser) {
      LocalDB.appendLog(currentUser.username, "User logged out successfully.", "USER");
    }
    setCurrentUser(null);
    localStorage.removeItem("dmis_logged_in_user");
  };

  const handleConnectCloudDb = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbConfigError(null);
    setDbConfigSuccess(null);
    setIsConfiguring(true);

    if (!cloudUrlInput.trim()) {
      setDbConfigError("Connection URL is required.");
      setIsConfiguring(false);
      return;
    }

    try {
      const result = await LocalDB.configureCloudDB(cloudUrlInput.trim(), cloudTokenInput.trim() || undefined);
      if (result.success) {
        setDbConfigSuccess("Connected. Sycing existing records to cloud...");
        await LocalDB.pushAllLocalToCloud();
        setDbConfigSuccess("Successfully connected and synced to Turso cloud database!");
        refreshData();
        setTimeout(() => {
          setDbConfigSuccess(null);
          location.reload();
        }, 1500);
      } else {
        setDbConfigError(result.error || "Failed to connect to cloud database.");
      }
    } catch (err: any) {
      setDbConfigError(err.message || "An unexpected error occurred.");
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleDisconnectCloudDb = async () => {
    if (confirm("Reset current Turso cloud database connection details? This will clear the configuration.")) {
      await LocalDB.disconnectCloudDB();
    }
  };

  // Resets local storage and restores all original seeds
  const handleResetDatabase = () => {
    if (confirm("Restore System Defaults? This resets all customer records, inventory balances, and order histories to the baseline Davao Sasa S.A.D. project specs!")) {
      LocalDB.reset();
    }
  };

  // Returns to Login if no active session
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Define sidebar menu options depending on roles
  const menuItems = [
    { id: "Dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "Orders", label: "Orders Intake & Invoices", icon: ShoppingBag },
    { id: "Inventory", label: "Inventory Monitoring", icon: Package },
    { id: "Customers", label: "Customer Profiles", icon: Users },
    { id: "Deliveries", label: "Logistics Tracking", icon: Truck },
    { id: "Complaints", label: "Complaints & Returns", icon: AlertTriangle },
    { id: "Users", label: "Proprietor Management", icon: FolderLock, restricted: true },
    { id: "Audit", label: "System Audits Trail", icon: Terminal }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Professional Header Navigation */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm shadow-slate-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Branding Logo coordinates */}
            <div className="flex items-center gap-3">
              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black tracking-widest text-lg shadow shadow-indigo-200">
                D
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 text-sm tracking-tight leading-none block uppercase font-sans">
                  DRABBIT MARKETING
                </span>
                <span className="text-[10px] text-slate-400 font-semibold font-mono tracking-wider block leading-none">
                  SASA, DAVAO CENTRAL HUB
                </span>
              </div>
            </div>

            {/* Logged in Employee details */}
            <div className="flex items-center gap-4 text-xs">
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="font-bold text-slate-800">{currentUser.name}</span>
                <span className={`text-[10px] px-2 py-0.5 mt-0.5 rounded font-bold uppercase tracking-wider ${
                  currentUser.role === UserRole.Proprietor ? "bg-purple-100 text-purple-800" : "bg-teal-100 text-teal-800"
                }`}>
                  {currentUser.role} Account
                </span>
              </div>
              
              <button
                onClick={handleLogout}
                className="bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-100 p-2 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 font-semibold"
                title="Sign Out Session"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        
        {/* Responsive Desktop Left Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-1">
            <span className="block px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              Business Intelligence Modules
            </span>
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              // Skip if restricted and current user is not admin
              if (item.restricted && currentUser.role !== UserRole.Proprietor) return null;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    isActive ? 
                    "bg-indigo-600 text-white shadow-sm" : 
                    "text-slate-650 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? "rotate-90" : "opacity-40"}`} />
                </button>
              );
            })}
          </div>

          {/* Database Connection Status Diagnostic Panel */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-950 block text-[11px] uppercase tracking-wider text-slate-400 font-mono">Turso Database</span>
              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                dbInfo.isRemote ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dbInfo.isRemote ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                {dbInfo.isRemote ? "Connected" : "Unconfigured"}
              </span>
            </div>
            
            <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Type:</span>
                <span className="font-semibold text-slate-700">{dbInfo.connectionType}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-400 font-sans">Remote URL:</span>
                <span className="font-semibold text-indigo-600 truncate block font-mono" title={dbInfo.databaseUrl}>
                  {dbInfo.databaseUrl}
                </span>
              </div>
            </div>

            {/* Cloud Connection Form */}
            <form onSubmit={handleConnectCloudDb} className="space-y-2 pt-2 border-t border-slate-100">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Connect Turso Cloud</span>
              
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-mono block font-bold">DATABASE CONNECTION URL</label>
                <input
                  type="text"
                  value={cloudUrlInput}
                  onChange={(e) => setCloudUrlInput(e.target.value)}
                  placeholder="libsql://your-database.turso.io"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-indigo-500"
                  disabled={isConfiguring}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-mono block font-bold">AUTHORIZATION TOKEN</label>
                <input
                  type="password"
                  value={cloudTokenInput}
                  onChange={(e) => setCloudTokenInput(e.target.value)}
                  placeholder="Enter Turso auth token"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-indigo-500"
                  disabled={isConfiguring}
                />
              </div>

              {dbConfigError && (
                <div className="text-[10px] text-rose-600 font-sans leading-tight bg-rose-50 p-1.5 rounded border border-rose-100">
                  ⚠️ {dbConfigError}
                </div>
              )}

              {dbConfigSuccess && (
                <div className="text-[10px] text-emerald-600 font-sans leading-tight bg-emerald-50 p-1.5 rounded border border-emerald-100">
                  ✨ {dbConfigSuccess}
                </div>
              )}

              <div className="flex gap-1.5 pt-1">
                <button
                  type="submit"
                  disabled={isConfiguring}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] py-1 px-1.5 rounded-lg text-center transition cursor-pointer disabled:opacity-50"
                >
                  {isConfiguring ? "Connecting..." : dbInfo.isRemote ? "Update Cloud URL" : "Connect Turso Cloud"}
                </button>
                
                {dbInfo.isRemote && (
                  <button
                    type="button"
                    onClick={handleDisconnectCloudDb}
                    className="bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-100 text-slate-600 font-bold text-[10px] py-1 px-1.5 rounded-lg text-center transition cursor-pointer"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </form>

            {!dbInfo.isRemote && (
              <div className="bg-red-50/75 border border-red-200/70 p-2.5 rounded-xl text-[10px] text-red-800 space-y-1 leading-normal">
                <span className="font-bold block">💡 Connection Required:</span>
                <span>
                  Please enter your Turso Cloud connection URL and authorization token below to configure and sync your live remote database.
                </span>
              </div>
            )}
          </div>

          {/* Quick instructions and Reset DB features */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-xs text-slate-500 space-y-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <Settings className="w-4 h-4 text-indigo-600 animate-spin-slow" />
              <span>SAD Development Control</span>
            </div>
            <p className="leading-relaxed text-slate-400">
              This system implements a fully reactive offline database. Your modifications persist dynamically in browser local storage.
            </p>
            <button
              onClick={handleResetDatabase}
              className="w-full bg-slate-50 border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-100 py-2 rounded-xl transition-all cursor-pointer font-bold text-center block text-[11px]"
            >
              Reset Database Coordinates
            </button>
          </div>
        </aside>

        {/* Mobile Flyout Sidebar Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              
              {/* Drawer Content */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.25 }}
                className="relative flex flex-col w-full max-w-xs bg-white h-full p-6 shadow-2xl space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm">
                      D
                    </div>
                    <span className="font-bold text-slate-900 text-xs tracking-tight">DRABBIT DMIS PORTAL</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="block pb-2 text-[10px] font-bold text-slate-405 uppercase tracking-widest">Modules</span>
                  {menuItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    if (item.restricted && currentUser.role !== UserRole.Proprietor) return null;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                          isActive ? "bg-indigo-600 text-white font-bold" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="w-4.5 h-4.5 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-3">
                  <button
                    onClick={() => {
                      handleResetDatabase();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full bg-slate-50 hover:bg-rose-50 hover:text-rose-600 py-2.5 rounded-xl border border-slate-200 text-xs font-bold transition-all cursor-pointer text-center block"
                  >
                    Reset baseline spec seeds
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Dynamic Display workspace panels */}
        <main className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 sm:p-6 shadow-sm min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "Dashboard" && (
                <DashboardView 
                  products={products} 
                  orders={orders} 
                  complaints={complaints} 
                  currentUser={currentUser}
                  onRefreshData={refreshData} 
                />
              )}
              {activeTab === "Orders" && (
                <OrderManagementView
                  orders={orders}
                  products={products}
                  customers={customers}
                  currentUser={currentUser}
                  onRefreshData={refreshData}
                />
              )}
              {activeTab === "Inventory" && (
                <InventoryView
                  products={products}
                  currentUser={currentUser}
                  onRefreshData={refreshData}
                />
              )}
              {activeTab === "Customers" && (
                <CustomerView
                  customers={customers}
                  currentUser={currentUser}
                  onRefreshData={refreshData}
                />
              )}
              {activeTab === "Deliveries" && (
                <DeliveryView
                  deliveries={deliveries}
                  orders={orders}
                  customers={customers}
                  currentUser={currentUser}
                  onRefreshData={refreshData}
                />
              )}
              {activeTab === "Complaints" && (
                <ComplaintsView
                  complaints={complaints}
                  customers={customers}
                  products={products}
                  currentUser={currentUser}
                  onRefreshData={refreshData}
                />
              )}
              {activeTab === "Users" && (
                <UserManagementView
                  users={users}
                  currentUser={currentUser}
                  onRefreshData={refreshData}
                />
              )}
              {activeTab === "Audit" && (
                <AuditView
                  logs={auditLogs}
                  onRefreshData={refreshData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>

      {/* Corporate Professional Sasa Footer coordinates */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-sans font-semibold text-slate-800">DRABBIT MARKETING SYSTEM (DMIS)</p>
          <p className="mt-1 text-slate-450 leading-relaxed max-w-xl mx-auto">
            Authorized for university system review. Davao Sasa distribution channels. All transactional activities are audited in accordance with SAD guidelines.
          </p>
          <div className="mt-3 flex justify-center items-center gap-4 font-mono text-[10px] text-slate-350">
            <span>Prepared by Team Honda ADV</span>
            <span>•</span>
            <span>Mapua Malayan Colleges Mindanao</span>
            <span>•</span>
            <span>CS103P S.A.D. Program</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
