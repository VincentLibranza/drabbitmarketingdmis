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
  X,
  Upload,
  Download,
  Undo2
} from "lucide-react";

import { User, Product, Customer, Order, Delivery, Complaint, AuditLog, UserRole, Invoice } from "./types";
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
  // Synchronized state pools
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Database connection engine states
  const [syncLoading, setSyncLoading] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  
  // Turso status & configuration states
  const [dbStatus, setDbStatus] = useState<{ connectionType: string; databaseUrl: string; isRemote: boolean } | null>(null);
  const [configDbUrl, setConfigDbUrl] = useState("");
  const [configAuthToken, setConfigAuthToken] = useState("");
  const [showConfigForm, setShowConfigForm] = useState(false);

  // Real-time background sync state log
  const [backgroundSyncs, setBackgroundSyncs] = useState<
    Record<string, { status: "syncing" | "success" | "error"; error?: string; count: number; timestamp: Date }>
  >({});

  useEffect(() => {
    const handleSyncEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { table, status, error, count, timestamp } = customEvent.detail;
      setBackgroundSyncs((prev) => ({
        ...prev,
        [table]: { status, error, count, timestamp }
      }));
    };

    window.addEventListener("dmis-sync-status", handleSyncEvent);
    return () => {
      window.removeEventListener("dmis-sync-status", handleSyncEvent);
    };
  }, []);

  // Function to pull latest state from LocalDB
  const refreshData = () => {
    setUsers(LocalDB.getUsers());
    setProducts(LocalDB.getProducts());
    setCustomers(LocalDB.getCustomers());
    setOrders(LocalDB.getOrders());
    setDeliveries(LocalDB.getDeliveries());
    setComplaints(LocalDB.getComplaints());
    setAuditLogs(LocalDB.getAuditLogs());
    setInvoices(LocalDB.getInvoices());
  };

  const fetchDbStatus = async () => {
    try {
      const res = await fetch("/api/db/status");
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
        if (data.rawDatabaseUrl) {
          setConfigDbUrl(data.rawDatabaseUrl);
        } else if (data.databaseUrl && data.databaseUrl !== "Unconfigured (Pending Connection)" && !data.databaseUrl.includes("***")) {
          setConfigDbUrl(data.databaseUrl);
        }
      }
    } catch (e) {
      console.warn("Failed fetching Turso connection status:", e);
    }
  };

  const handleManualPull = async (silent = false) => {
    setSyncLoading(true);
    setSyncStatus("Downloading Turso cloud snapshot...");
    try {
      const res = await fetch("/api/db/pull");
      if (!res.ok) throw new Error("Server pull endpoint returned failure");
      const json = await res.json();
      if (json.success && json.data) {
        const { users, products, customers, orders, deliveries, complaints, invoices } = json.data;
        const auditLogs = json.data.audit_logs || json.data.auditLogs;
        if (users) LocalDB.setUsers(users, true);
        if (products) LocalDB.setProducts(products, true);
        if (customers) LocalDB.setCustomers(customers, true);
        if (orders) LocalDB.setOrders(orders, true);
        if (deliveries) LocalDB.setDeliveries(deliveries, true);
        if (complaints) LocalDB.setComplaints(complaints, true);
        if (auditLogs) LocalDB.setAuditLogs(auditLogs, true);
        if (invoices) LocalDB.setInvoices(invoices, true);
        
        refreshData();
        if (!silent) {
          alert("All live Turso cloud database datasets successfully pooled down into local storage!");
        }
      } else {
        throw new Error(json.error || "Malformed pull response");
      }
    } catch (err: any) {
      if (!silent) {
        alert(`Failed to pull Turso datasets: ${err.message || err}. Tip: Ensure you have configured a valid TURSO_DATABASE_URL/token via server-environment or the settings panel.`);
      } else {
        console.warn("Silent initial Turso pull failed:", err);
      }
    } finally {
      setSyncLoading(false);
      setSyncStatus(null);
    }
  };

  const handleManualUpload = async () => {
    if (!confirm("UPLOAD your current browser offline database up into your remote Turso instance? This will overwrite remote records to match your browser exactly!")) {
      return;
    }
    setSyncLoading(true);
    setSyncStatus("Syncing local dataset to Turso...");
    try {
      const tables = [
        { name: "users", data: LocalDB.getUsers() },
        { name: "products", data: LocalDB.getProducts() },
        { name: "customers", data: LocalDB.getCustomers() },
        { name: "orders", data: LocalDB.getOrders() },
        { name: "deliveries", data: LocalDB.getDeliveries() },
        { name: "complaints", data: LocalDB.getComplaints() },
        { name: "audit_logs", data: LocalDB.getAuditLogs() },
        { name: "invoices", data: LocalDB.getInvoices() },
      ];
      for (const t of tables) {
        const response = await fetch("/api/db/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: t.name, rows: t.data })
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Push failed for table ${t.name}`);
        }
      }
      alert("All local database records successfully uploaded to Turso cloud SQL database!");
    } catch (err: any) {
      alert(`Manual upload failed. Turso error: ${err.message || err}`);
    } finally {
      setSyncLoading(false);
      setSyncStatus(null);
    }
  };

  const handleConfigureDb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configDbUrl.trim()) {
      alert("Please provide a Turso database URL.");
      return;
    }
    setSyncLoading(true);
    setSyncStatus("Connecting and initializing Turso database...");
    try {
      const response = await fetch("/api/db/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseUrl: configDbUrl.trim(),
          authToken: configAuthToken.trim() || undefined
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed registration");
      }
      alert("Successfully connected backend SQLite proxy to live cloud Turso instance and deployed schemas!");
      await fetchDbStatus();
      setShowConfigForm(false);
      await handleManualPull(true);
    } catch (err: any) {
      alert(`Database config failed: ${err.message || err}`);
    } finally {
      setSyncLoading(false);
      setSyncStatus(null);
    }
  };

  // Sync state on boot
  useEffect(() => {
    // 1. Refresh UI from local storage first (No white screen)
    refreshData();

    // 2. Set and guarantee Turso database mode
    localStorage.setItem("dmis_db_mode", "turso");

    // 3. Check status and pull cloud data asynchronously
    fetch("/api/db/status")
      .then(res => res.json())
      .then(status => {
        setDbStatus(status);
        if (status.isRemote) {
          // Pull cloud data and then update UI
          LocalDB.pullFromTurso().then(() => refreshData());
        } else {
          // If local/offline, trigger initial pull to ensure baseline is populated
          handleManualPull(true).then(() => refreshData());
        }
      })
      .catch((err) => {
        console.warn("DB Status evaluation error on build:", err);
        setDbStatus({ isRemote: false });
        handleManualPull(true).then(() => refreshData());
      });

    // 4. Automatically retrieve previous session if active in localStorage
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

  // Resets local storage and restores all original seeds
  const handleResetDatabase = () => {
    if (confirm("Restore System Defaults? This resets all customer records, inventory balances, and order histories to the baseline Davao Sasa S.A.D. project specs!")) {
      LocalDB.reset();
    }
  };

  const [hasDbBackup, setHasDbBackup] = useState(() => LocalDB.hasBackup());

  const handleRestoreBackup = () => {
    if (confirm("Restore your previous database state from the auto-backup created before the reset? This will reload all your past custom configurations!")) {
      if (LocalDB.restoreBackup()) {
        refreshData();
        setHasDbBackup(false);
        localStorage.removeItem("dmis_reset_backup");
      }
    }
  };

  const handleExportBackup = () => {
    const backupJson = LocalDB.exportAsJSON();
    const blob = new Blob([backupJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Sasa_DMIS_Backup_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    if (currentUser) {
      LocalDB.appendLog(currentUser.username, "Downloaded full local database backup file", "SYSTEM");
      refreshData();
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (LocalDB.importFromJSON(result)) {
        refreshData();
        setHasDbBackup(LocalDB.hasBackup());
        alert("Database successfully restored from JSON backup!");
      } else {
        alert("Invalid database backup file. Please verify content format.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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

          {/* Quick instructions and Reset DB features */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-xs text-slate-500 space-y-3.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs text-indigo-600">
              <Settings className="w-4 h-4" />
              <span>SAD Development Control</span>
            </div>
            <p className="leading-relaxed text-slate-400">
              Sasa Portal DMIS is fully integrated with Turso Cloud Database as the primary source of truth. All your records are securely stored and fetched server-side from your remote LibSQL/SQLite engine.
            </p>

            {/* Active Connection Status Badge */}
            {dbStatus && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 mt-2 space-y-2 text-[10px]">
                <div className="flex justify-between items-center gap-1.5">
                  <span className="font-semibold text-slate-700">Connection:</span>
                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase transition-colors ${
                    dbStatus.isRemote 
                      ? "text-emerald-700 bg-emerald-50 border-emerald-100 font-black animate-pulse" 
                      : "text-amber-700 bg-amber-50 border-amber-100"
                  }`}>
                    {dbStatus.isRemote ? "TURSO CLOUD (LIVE)" : "LOCAL SQL FILE (OFL)"}
                  </span>
                </div>
                <div className="text-[9px] text-slate-500 truncate" title={dbStatus.databaseUrl}>
                  <span className="font-semibold text-slate-605">URL:</span> {dbStatus.databaseUrl}
                </div>

                {/* Real-time background syncs */}
                {Object.keys(backgroundSyncs).length > 0 && (
                  <div className="pt-2 border-t border-slate-200/50 space-y-1">
                    <span className="block font-bold text-slate-400 text-[8px] uppercase tracking-wide">Sync Telemetry</span>
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                      {Object.keys(backgroundSyncs).map((table) => {
                        const sync = backgroundSyncs[table] as any;
                        return (
                          <div key={table} className="flex justify-between items-center text-[8.5px] leading-tight">
                            <span className="font-mono text-slate-500">{table}</span>
                            {sync.status === "syncing" && (
                              <span className="text-amber-600 font-semibold animate-pulse">syncing...</span>
                            )}
                            {sync.status === "success" && (
                              <span className="text-emerald-600 font-semibold">✓ synced</span>
                            )}
                            {sync.status === "error" && (
                              <span className="text-rose-600 font-bold" title={sync.error}>✗ error</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={handleManualUpload}
                    disabled={syncLoading}
                    className="bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-750 hover:border-blue-100 py-1 px-1 rounded-lg font-bold text-center transition-all cursor-pointer text-slate-705 text-[10px] disabled:opacity-50"
                    title="Force upload browser local data into Turso"
                  >
                    Force Push
                  </button>
                  <button
                    onClick={() => handleManualPull(false)}
                    disabled={syncLoading}
                    className="bg-white border border-slate-200 hover:bg-amber-50 hover:text-amber-750 hover:border-amber-100 py-1 px-1 rounded-lg font-bold text-center transition-all cursor-pointer text-slate-705 text-[10px] disabled:opacity-50"
                    title="Pull latest live datasets from Turso into the browser cache"
                  >
                    Force Refresh
                  </button>
                </div>

                <div className="pt-1.5 border-t border-slate-200/50 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setShowConfigForm(!showConfigForm)}
                    className="text-indigo-650 hover:text-indigo-800 font-bold transition-colors cursor-pointer text-[9px]"
                  >
                    {showConfigForm ? "Close Form ✕" : "Config Connection ⚙️"}
                  </button>
                  {syncStatus && (
                    <span className="text-[8px] text-indigo-600 font-semibold animate-pulse">{syncStatus}</span>
                  )}
                </div>

                {showConfigForm && (
                  <form onSubmit={handleConfigureDb} className="pt-2 border-t border-slate-200 space-y-2 mt-1">
                    <div className="space-y-0.5">
                      <label className="text-[8px] uppercase tracking-wide font-bold text-slate-400 block">Turso Database URL</label>
                      <input
                        type="text"
                        value={configDbUrl}
                        onChange={(e) => setConfigDbUrl(e.target.value)}
                        placeholder="libsql://your-db-name.turso.io"
                        className="w-full text-[10px] px-1.5 py-1 rounded border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
                        required
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[8px] uppercase tracking-wide font-bold text-slate-400 block">Auth Token</label>
                      <input
                        type="password"
                        value={configAuthToken}
                        onChange={(e) => setConfigAuthToken(e.target.value)}
                        placeholder="Turso Authorization Token"
                        className="w-full text-[10px] px-1.5 py-1 rounded border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={syncLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 rounded text-[9px] cursor-pointer"
                    >
                      Apply & Initialize
                    </button>
                  </form>
                )}
              </div>
            )}
            
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <button
                onClick={handleResetDatabase}
                className="w-full bg-slate-50 border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-100 py-2 rounded-xl transition-all cursor-pointer font-bold text-center block text-[11px]"
                title="Saves a snapshot backup and reverts active dataset to baseline specs"
              >
                Restore Baseline Spec Seeds
              </button>

              {hasDbBackup && (
                <button
                  onClick={handleRestoreBackup}
                  className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-2 rounded-xl transition-all cursor-pointer font-bold text-center flex items-center justify-center gap-1.5 text-[11px]"
                  title="Undo previous reset and bring back your custom records"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Restore Pre-Reset Backup
                </button>
              )}
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Backup & Migrations</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={handleExportBackup}
                  className="bg-slate-50 border border-slate-200 hover:bg-slate-100 py-1.5 px-1 rounded-lg transition-all cursor-pointer font-bold text-center flex items-center justify-center gap-1 text-[10px] text-slate-700"
                  title="Export live local DB as JSON for offline reporting"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  Export JSON
                </button>
                <label
                  className="bg-slate-50 border border-slate-200 hover:bg-slate-100 py-1.5 px-1 rounded-lg transition-all cursor-pointer font-bold text-center flex items-center justify-center gap-1 text-[10px] text-slate-700 cursor-pointer"
                  title="Import and reload a previously exported JSON backup"
                >
                  <Upload className="w-3 h-3 text-slate-500" />
                  Import JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
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

                  <div className="pt-6 border-t border-slate-100 space-y-3 text-xs">
                    {/* Database Engine Status for Mobile */}
                    <div className="space-y-2 border-b border-slate-100 pb-3">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-slate-400 uppercase tracking-wide">Database Connection</span>
                        <span className="px-1.5 py-0.5 rounded font-bold uppercase text-[9px] bg-blue-50 text-blue-800 border border-blue-105">
                          TURSO CLOUD
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          onClick={() => {
                            handleManualUpload();
                            setMobileMenuOpen(false);
                          }}
                          className="bg-white border border-slate-200 py-1.5 px-1 rounded-lg font-bold text-center text-slate-705 text-[10px] cursor-pointer"
                        >
                          Force Push
                        </button>
                        <button
                          onClick={() => {
                            handleManualPull();
                            setMobileMenuOpen(false);
                          }}
                          className="bg-white border border-slate-200 py-1.5 px-1 rounded-lg font-bold text-center text-slate-750 text-[10px] cursor-pointer"
                        >
                          Force Refresh
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        handleResetDatabase();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full bg-slate-50 hover:bg-rose-50 hover:text-rose-600 py-2 rounded-xl border border-slate-200 text-xs font-bold transition-all cursor-pointer text-center block"
                      title="Saves backup and clears customizations"
                    >
                      Reset baseline spec seeds
                    </button>

                    {hasDbBackup && (
                      <button
                        onClick={() => {
                          handleRestoreBackup();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-250 py-2 rounded-xl transition-all cursor-pointer font-bold text-center flex items-center justify-center gap-1.5 text-xs"
                      >
                        <Undo2 className="w-4 h-4" />
                        Restore Pre-Reset Backup
                      </button>
                    )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={handleExportBackup}
                      className="bg-slate-50 border border-slate-200 hover:bg-slate-100 py-2 rounded-xl transition-all cursor-pointer font-bold text-center flex items-center justify-center gap-1 text-[11px] text-slate-705"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export JSON
                    </button>
                    <label
                      className="bg-slate-50 border border-slate-200 hover:bg-slate-100 py-2 rounded-xl transition-all cursor-pointer font-bold text-center flex items-center justify-center gap-1 text-[11px] text-slate-705"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Import JSON
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportBackup}
                        className="hidden"
                      />
                    </label>
                  </div>
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
