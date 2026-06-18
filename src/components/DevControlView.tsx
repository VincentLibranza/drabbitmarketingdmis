/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { 
  Settings, 
  ShieldAlert, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  Download, 
  Upload, 
  Undo2, 
  Cloud, 
  HardDrive, 
  Layers, 
  AlertTriangle,
  Flame
} from "lucide-react";
import { User, UserRole } from "../types";

interface DevControlViewProps {
  currentUser: User;
  dbStatus: { connectionType: string; databaseUrl: string; isRemote: boolean } | null;
  backgroundSyncs: Record<string, { status: "syncing" | "success" | "error"; error?: string; count: number; timestamp: Date }>;
  syncLoading: boolean;
  syncStatus: string | null;
  configDbUrl: string;
  setConfigDbUrl: (val: string) => void;
  configAuthToken: string;
  setConfigAuthToken: (val: string) => void;
  showConfigForm: boolean;
  setShowConfigForm: (val: boolean) => void;
  hasDbBackup: boolean;
  handleManualUpload: () => void;
  handleManualPull: (silent?: boolean) => Promise<void>;
  handleConfigureDb: (e: React.FormEvent) => Promise<void>;
  handleResetDatabase: () => void;
  handleRestoreBackup: () => void;
  handleExportBackup: () => void;
  handleImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function DevControlView({
  currentUser,
  dbStatus,
  backgroundSyncs,
  syncLoading,
  syncStatus,
  configDbUrl,
  setConfigDbUrl,
  configAuthToken,
  setConfigAuthToken,
  showConfigForm,
  setShowConfigForm,
  hasDbBackup,
  handleManualUpload,
  handleManualPull,
  handleConfigureDb,
  handleResetDatabase,
  handleRestoreBackup,
  handleExportBackup,
  handleImportBackup
}: DevControlViewProps) {

  // Guard access restriction just in case
  if (currentUser.role !== UserRole.Proprietor) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-8 rounded-2xl text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
        <h3 className="font-bold text-lg">Administrative Access Restricted</h3>
        <p className="text-xs text-red-700 max-w-md mx-auto leading-relaxed">
          The SAD Development Control Console is restricted exclusively to user accounts holding the <strong>Proprietor</strong> credential level. Staff roles are barred from configuring backend parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Settings className="w-5 h-5 animate-[spin_5s_linear_infinite]" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 leading-none">SAD Development Control</h1>
          </div>
          <p className="text-xs text-slate-500">
            Configure system datastores, trigger backups, reset baseline simulation values, and monitor real-time sync telemetry.
          </p>
        </div>
        {syncStatus && (
          <div className="bg-indigo-50 border border-indigo-150 rounded-xl px-3 py-1.5 text-xs text-indigo-700 font-medium animate-pulse flex items-center gap-1.5 shrink-0 self-start md:self-auto">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
            <span>{syncStatus}</span>
          </div>
        )}
      </div>

      {/* Grid Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Connection Setup & Operation Actions Card */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="font-bold text-slate-800 text-sm tracking-wide uppercase flex items-center gap-2">
              <Cloud className="w-4 h-4 text-indigo-650" />
              <span>Turso Cloud Database Integration</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              All transactions are automatically written securely using remote SQL-Proxy.
            </p>
          </div>

          {/* Active stats */}
          {dbStatus && (
            <div className="bg-slate-50 border border-slate-150/80 rounded-2xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none">Engine Connection</div>
                    <div className="text-xs font-semibold text-slate-700 mt-1">SQLite via Remote Proxy Layer</div>
                  </div>
                </div>
                <span className={`self-start sm:self-auto text-[10px] font-bold px-2.5 py-1 rounded-xl border uppercase ${
                  dbStatus.isRemote 
                    ? "text-emerald-700 bg-emerald-50 border-emerald-150 font-black" 
                    : "text-amber-700 bg-amber-50 border-amber-150"
                }`}>
                  {dbStatus.isRemote ? "● TURSO CLOUD (LIVE)" : "● LOCAL FILE CACHE"}
                </span>
              </div>
              
              <div className="text-xs space-y-1 pt-2 border-t border-slate-200/50">
                <div className="flex items-start gap-1 font-mono text-[11px] text-slate-600">
                  <span className="font-bold text-slate-400 select-none shrink-0">DB URL:</span>
                  <span className="break-all font-semibold">{dbStatus.databaseUrl}</span>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Form Control */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Configure Driver Connection Parameters</h3>
              <button
                type="button"
                onClick={() => setShowConfigForm(!showConfigForm)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold transition-all cursor-pointer"
              >
                {showConfigForm ? "Minimize Configuration ✕" : "Adjust Connection Parameters ⚙️"}
              </button>
            </div>

            {showConfigForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                onSubmit={handleConfigureDb}
                className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4 overflow-hidden"
              >
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wide font-bold text-slate-500 block">Turso Database String URL</label>
                  <input
                    type="text"
                    value={configDbUrl}
                    onChange={(e) => setConfigDbUrl(e.target.value)}
                    placeholder="libsql://your-database-id.turso.io"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white shadow-sm text-slate-900 transition-all font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wide font-bold text-slate-500 block">Authorization Secret Token</label>
                  <input
                    type="password"
                    value={configAuthToken}
                    onChange={(e) => setConfigAuthToken(e.target.value)}
                    placeholder="e.g. eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white shadow-sm text-slate-900 transition-all font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={syncLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all tracking-wider uppercase cursor-pointer disabled:opacity-50"
                >
                  Save & Initialize Server Interface
                </button>
              </motion.form>
            )}
          </div>

          {/* Sync Operations buttons */}
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Manual Force Integration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <button
                onClick={handleManualUpload}
                disabled={syncLoading}
                className="bg-white border border-slate-200 hover:bg-indigo-50 hover:text-indigo-800 hover:border-indigo-150 p-4 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-slate-700 disabled:opacity-50 group hover:-translate-y-0.5"
                title="Force overwrite remote database storage with your browser local storage data"
              >
                <Upload className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs">Force Push to Cloud</span>
                <span className="text-[9px] text-slate-400 font-normal mt-0.5">Overwrite Turso records with browser data</span>
              </button>
              
              <button
                onClick={() => handleManualPull(false)}
                disabled={syncLoading}
                className="bg-white border border-slate-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-150 p-4 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-slate-700 disabled:opacity-50 group hover:-translate-y-0.5"
                title="Download the latest Turso records into your web storage cache"
              >
                <RefreshCw className="w-5 h-5 text-amber-600 group-hover:rotate-180 transition-transform duration-700" />
                <span className="text-xs">Force Refresh from Cloud</span>
                <span className="text-[9px] text-slate-400 font-normal mt-0.5">Download live records into local cache</span>
              </button>
            </div>
          </div>

        </div>

        {/* Sync Telemetry and Actions Panel */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* Telemetry Indicator List */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-800 text-sm tracking-wide uppercase flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Sync Telemetry Hub</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-time tracking of database table schema synchronizations.
              </p>
            </div>

            <div className="divide-y divide-slate-100/70 border border-slate-100/80 rounded-xl overflow-hidden text-xs">
              {["products", "orders", "customers", "deliveries", "complaints", "audit_logs", "invoices", "users"].map((table) => {
                const sync = backgroundSyncs[table] as any;
                const syncStatus = sync?.status || "success";
                
                return (
                  <div key={table} className="flex justify-between items-center p-3 hover:bg-slate-50/50 transition-colors">
                    <span className="font-mono font-bold text-slate-605">{table}</span>
                    <div className="flex items-center gap-2">
                      {syncStatus === "syncing" && (
                        <span className="text-amber-600 font-semibold animate-pulse flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>syncing...</span>
                        </span>
                      )}
                      {syncStatus === "success" && (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-100/60 leading-none px-2 py-0.5 rounded-lg text-[9px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          <span>synced</span>
                        </span>
                      )}
                      {syncStatus === "error" && (
                        <span className="text-rose-700 bg-rose-50 border border-rose-100 leading-none px-2 py-0.5 rounded-lg text-[9px] font-bold flex items-center gap-1" title={sync?.error}>
                          <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                          <span>✗ error</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Backup Restores Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-800 text-sm tracking-wide uppercase flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-rose-600" />
                <span>Specs Reset & JSON Backups</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Wipe datasets back to the original davao central simulation rules.
              </p>
            </div>

            <div className="space-y-3.5">
              <button
                onClick={handleResetDatabase}
                disabled={syncLoading}
                className="w-full bg-slate-50 border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-150 py-3 rounded-xl transition-all cursor-pointer font-bold text-center block text-xs text-slate-700 disabled:opacity-50"
                title="Saves a snapshot backup and reverts active dataset to baseline specs"
              >
                Restore Baseline Spec Seeds
              </button>

              {hasDbBackup && (
                <button
                  onClick={handleRestoreBackup}
                  disabled={syncLoading}
                  className="w-full bg-indigo-55 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-3 rounded-xl transition-all cursor-pointer font-bold text-center flex items-center justify-center gap-1.5 text-xs disabled:opacity-50"
                  title="Undo previous reset and bring back your custom records"
                >
                  <Undo2 className="w-4 h-4 text-indigo-500" />
                  Restore Pre-Reset Backup
                </button>
              )}

              {/* JSON export/import details */}
              <div className="pt-3 border-t border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">JSON Offline Backups</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportBackup}
                    className="bg-slate-50 border border-slate-205 hover:bg-slate-100 py-2.5 px-3 rounded-xl transition-all cursor-pointer font-semibold text-center flex items-center justify-center gap-1.5 text-[11px] text-slate-700"
                    title="Export live local DB as JSON for offline reporting"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Export JSON</span>
                  </button>
                  <label
                    className="bg-slate-50 border border-slate-205 hover:bg-slate-100 py-2.5 px-3 rounded-xl transition-all cursor-pointer font-semibold text-center flex items-center justify-center gap-1.5 text-[11px] text-slate-705 cursor-pointer"
                    title="Import and reload a previously exported JSON backup"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Import JSON</span>
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
          </div>

        </div>

      </div>

    </div>
  );
}
