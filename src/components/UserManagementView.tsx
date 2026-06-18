/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  Plus, 
  ShieldAlert, 
  Sparkles, 
  Trash2, 
  CheckCircle, 
  X, 
  ShieldCheck, 
  UserPlus
} from "lucide-react";
import { User, UserRole, UserStatus } from "../types";
import { LocalDB } from "../services/db";

interface UserManagementViewProps {
  users: User[];
  currentUser: User;
  onRefreshData: () => void;
}

export default function UserManagementView({
  users,
  currentUser,
  onRefreshData
}: UserManagementViewProps) {
  
  // Guard access restriction
  if (currentUser.role !== UserRole.Proprietor) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-8 rounded-2xl text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
        <h3 className="font-bold text-lg">Administrative Access Restricted</h3>
        <p className="text-xs text-red-700 max-w-md mx-auto leading-relaxed">
          The User Administration Console is restricted exclusively to user accounts holding the <strong>Proprietor</strong> credential level. Under SAD methodology, Staff roles are barred from editing core credential directory mappings.
        </p>
      </div>
    );
  }

  // States
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [formUsername, setFormUsername] = useState("");
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState<UserRole>(UserRole.Staff);
  const [formError, setFormError] = useState<string | null>(null);

  // Submit trigger
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const adjustedUsername = formUsername.trim().toLowerCase();

    if (!adjustedUsername) {
      setFormError("Must input credentials name.");
      return;
    }

    if (!formName.trim()) {
      setFormError("Must supply full employee name description.");
      return;
    }

    const currentUsersList = LocalDB.getUsers();
    
    // Check duplication
    if (currentUsersList.some(u => u.username.toLowerCase() === adjustedUsername)) {
      setFormError("An account holding that exact username credentials mapping already exists.");
      return;
    }

    const newId = `USR-${Date.now().toString().slice(-3)}`;
    const newUser: User = {
      userId: newId,
      username: adjustedUsername,
      name: formName.trim(),
      role: formRole,
      status: UserStatus.Active
    };

    LocalDB.setUsers([...currentUsersList, newUser]);
    
    LocalDB.appendLog(
      currentUser.username, 
      `Admin created new credential profile for: ${newUser.name} (Role: ${newUser.role})`, 
      "USER"
    );

    setSuccessMsg(`User directory map configured successfully!`);
    setShowAddForm(false);
    setFormUsername("");
    setFormName("");
    setFormRole(UserRole.Staff);
    onRefreshData();
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Toggle user active status
  const handleToggleStatus = (userId: string) => {
    if (userId === currentUser.userId) {
      alert("Self-Protection Safeguard: You cannot freeze your own Administrator account.");
      return;
    }

    const currentLocalUsers = LocalDB.getUsers();
    let updatedName = "";
    let nextStatus = UserStatus.Active;

    const updated = currentLocalUsers.map(u => {
      if (u.userId === userId) {
        updatedName = u.name;
        nextStatus = u.status === UserStatus.Active ? UserStatus.Inactive : UserStatus.Active;
        return { ...u, status: nextStatus };
      }
      return u;
    });

    LocalDB.setUsers(updated);
    LocalDB.appendLog(
      currentUser.username, 
      `Toggled status of employee ${updatedName} directory record to ${nextStatus}`, 
      "USER"
    );
    onRefreshData();
    setSuccessMsg(`DTI Logs: Account status updated to ${nextStatus}!`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Delete user account permanently
  const handleDeleteUser = (userId: string) => {
    const matched = users.find(u => u.userId === userId);
    if (!matched) return;

    if (userId === currentUser.userId) {
      if (confirm("WARNING: You are about to permanently delete YOUR OWN proprietor account. This will immediately log you out and wipe this credential profile. Do you wish to proceed?")) {
        const currentUsersList = LocalDB.getUsers();
        const filtered = currentUsersList.filter(u => u.userId !== userId);
        LocalDB.setUsers(filtered);
        
        LocalDB.appendLog(
          currentUser.username, 
          `Proprietor permanently deleted their own user account: ${currentUser.name}`, 
          "USER"
        );

        localStorage.removeItem("dmis_logged_in_user");
        window.location.reload();
        return;
      }
      return;
    }

    if (confirm(`Are you absolutely sure you want to PERMANENTLY delete the account of ${matched.name} (${matched.username})?`)) {
      const currentUsersList = LocalDB.getUsers();
      const filtered = currentUsersList.filter(u => u.userId !== userId);
      LocalDB.setUsers(filtered);
      
      LocalDB.appendLog(
        currentUser.username, 
        `Permanently deleted credentials profile for: ${matched.name} (${matched.username})`, 
        "USER"
      );

      setSuccessMsg(`User profile permanently deleted!`);
      onRefreshData();
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-250 p-4 rounded-xl flex items-center gap-2.5 text-xs font-semibold">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Control row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
        <div className="space-y-0.5">
          <h3 className="font-bold text-slate-900 text-sm">Employee Directory mappings</h3>
          <p className="text-xs text-slate-400">Manage credentials pathways and authorization credentials</p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 hover:bg-indigo-500 cursor-pointer text-white font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 self-stretch sm:self-auto justify-center transition-all shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Add Employee Account
        </button>
      </div>

      {/* Table grid directory displaying accounts */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 text-slate-500">
          <span className="text-xs font-bold uppercase tracking-wider">Credential records directory ({users.length})</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm text-slate-705">
             <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-xs font-bold border-b border-slate-100 uppercase tracking-widest font-sans">
                <th className="py-3.5 px-4">User Index</th>
                <th className="py-3.5 px-4">Username ID</th>
                <th className="py-3.5 px-4">Employee Full Name</th>
                <th className="py-3.5 px-4">Role Access Credentials</th>
                <th className="py-3.5 px-4 text-center">Security Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.userId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-semibold text-slate-400 font-mono text-xs">{u.userId}</td>
                  <td className="py-4 px-4 font-mono font-medium text-slate-900">{u.username}</td>
                  <td className="py-4 px-4 font-bold text-slate-800">{u.name}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                      u.role === UserRole.Proprietor ? "bg-purple-50 text-purple-800 border border-purple-150" : "bg-teal-50 text-teal-850"
                    }`}>
                      {u.role === UserRole.Proprietor ? <ShieldCheck className="w-3.5 h-3.5 text-purple-650" /> : <Sparkles className="w-3.5 h-3.5 text-teal-600" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold ${
                      u.status === UserStatus.Active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.status === UserStatus.Active ? "bg-emerald-500" : "bg-rose-500"}`} />
                      {u.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(u.userId)}
                        disabled={u.userId === currentUser.userId}
                        className={`text-xs font-semibold py-1.5 px-3 rounded-lg border cursor-pointer transition-all ${
                          u.userId === currentUser.userId ? 
                          "bg-slate-50 text-slate-350 border-slate-100 cursor-not-allowed opacity-50" :
                          u.status === UserStatus.Active ? 
                          "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100" :
                          "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                        }`}
                        title={u.status === UserStatus.Active ? "Deactivate employee account" : "Re-activate employee account"}
                      >
                        {u.status === UserStatus.Active ? "Deactivate" : "Activate"}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteUser(u.userId)}
                        className="p-1.5 rounded-lg border border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all cursor-pointer inline-flex items-center justify-center"
                        title={u.userId === currentUser.userId ? "Delete your own active proprietor profile" : "Permanently delete account"}
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide overlay for adding a new user account */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="bg-white tracking-normal h-full w-full max-w-md shadow-2xl flex flex-col border-l border-slate-105"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Add employee login account</h3>
                  <p className="text-xs text-slate-400">Define employee username mappings and core role levels</p>
                </div>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-800 transition-colors p-2 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
                
                {formError && (
                  <div className="rounded-lg bg-rose-50 border border-rose-100 p-3.5 text-rose-700 text-xs flex items-start gap-2">
                    <X className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Username ID Identifier</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. jodel, violeta"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-650 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Full Employee Legal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Violeta V. Libranza"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-650 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Administrative Access Role Group</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-650 text-xs font-semibold"
                  >
                    <option value={UserRole.Staff}>Staff Worker (Fills Orders, Catalog View)</option>
                    <option value={UserRole.Proprietor}>Proprietor Owner (Unrestricted Administration Access)</option>
                  </select>
                </div>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow transition-all text-sm block cursor-pointer text-center"
                  >
                    Issue Employee File
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-center text-sm block"
                  >
                    Cancel
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
