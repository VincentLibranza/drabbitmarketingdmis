/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  History, 
  Search, 
  Database, 
  Trash2, 
  Clock, 
  User, 
  DownloadCloud, 
  RefreshCw 
} from "lucide-react";
import { AuditLog } from "../types";
import { LocalDB } from "../services/db";

interface AuditViewProps {
  logs: AuditLog[];
  onRefreshData: () => void;
}

export default function AuditView({ logs, onRefreshData }: AuditViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [tableFilter, setTableFilter] = useState("All");

  // Filters
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTable = tableFilter === "All" || log.tableRef === tableFilter;
    return matchesSearch && matchesTable;
  });

  const clearAuditLogs = () => {
    if (confirm("Are you sure you want to purge system log histories? This is non-reversible!")) {
      LocalDB.setAuditLogs([]);
      LocalDB.appendLog("admin", "Audit Trial histories were cleared by administrative decree.", "SYSTEM");
      onRefreshData();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
        
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search actions or logs username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
            <span className="text-xs text-slate-400 font-medium">Type:</span>
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="text-xs font-semibold bg-transparent border-none text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="SYSTEM">System Init</option>
              <option value="ORDER">Orders</option>
              <option value="PRODUCT">Products</option>
              <option value="CUSTOMER">Customers</option>
              <option value="DELIVERY">Deliveries</option>
              <option value="COMPLAINT">Complaints</option>
              <option value="USER">Workers</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            onClick={clearAuditLogs}
            className="px-3.5 py-2.5 rounded-xl border border-rose-250 text-rose-700 hover:bg-rose-50 transition-all font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Clear Log Trails
          </button>
        </div>
      </div>

      {/* Visual Activity Log Feed */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Audited operations feed ({filteredLogs.length})</span>
          <span className="text-[10px] text-slate-400 font-mono">DTI Compliant Audit Logs</span>
        </div>

        <div className="divide-y divide-slate-100 p-2">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Database className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold">No Audit Logs Match Filters</p>
              <p className="text-xs text-slate-400">Perform database actions to record activity trials.</p>
            </div>
          ) : (
            filteredLogs.map(log => {
              
              // Badge colors depending on reference type
              const getBadgeColor = (ref: string) => {
                switch(ref) {
                  case "ORDER": return "bg-indigo-50 text-indigo-750";
                  case "PRODUCT": return "bg-blue-50 text-blue-750 font-bold";
                  case "CUSTOMER": return "bg-teal-50 text-teal-750";
                  case "DELIVERY": return "bg-amber-50 text-amber-750";
                  case "COMPLAINT": return "bg-rose-50 text-rose-750";
                  case "USER": return "bg-purple-50 text-purple-750";
                  default: return "bg-slate-100 text-slate-650";
                }
              };

              return (
                <div key={log.logId} className="p-3.5 hover:bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs rounded-xl transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 shrink-0 text-slate-500">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800 leading-snug">
                        {log.action}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <User className="w-3 h-3" />
                          Actor Username: <strong className="text-slate-600 font-semibold">{log.username}</strong>
                        </span>
                        <span>•</span>
                        <span className="font-mono">Ref Code: {log.logId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col items-start md:items-end justify-between shrink-0 gap-1.5">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono tracking-wide ${getBadgeColor(log.tableRef)}`}>
                      {log.tableRef}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
