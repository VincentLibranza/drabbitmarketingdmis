import React from 'react';
import { Terminal, Clock, User, ShieldCheck } from 'lucide-react';

export default function AuditView({ logs }: { logs: any[] }) {
  // Safe check to ensure logs is always an array
  const safeLogs = Array.isArray(logs) ? logs : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-600" />
            System Audit Trail
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">Real-time DTI compliant transaction logging</p>
        </div>
        <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
          Total Logs: {safeLogs.length}
        </div>
      </div>

      <div className="space-y-3">
        {safeLogs.map((log: any, index: number) => (
          <div key={log.LogID || log.logId || index} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-start gap-4 hover:shadow-sm transition-all group">
            <div className="bg-slate-50 p-2 rounded-xl group-hover:bg-indigo-50 transition-colors">
              <Clock className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-800 text-sm">{log.Action || log.action}</span>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg font-bold uppercase tracking-widest">
                  {log.TableRef || log.tableRef || 'SYSTEM'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-400 font-medium">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Actor: <span className="text-slate-600 font-bold">{log.UserID || log.userId || log.username || 'System'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Ref: <span className="text-slate-600 font-bold">{log.LogID || log.logId}</span>
                </div>
                <div className="ml-auto text-slate-400">
                  {log.Timestamp || log.timestamp}
                </div>
              </div>
            </div>
          </div>
        ))}

        {safeLogs.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-3xl">
            <Terminal className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-bold text-sm">No audited operations found in cloud.</p>
          </div>
        )}
      </div>
    </div>
  );
}