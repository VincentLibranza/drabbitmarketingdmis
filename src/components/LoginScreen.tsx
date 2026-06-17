/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldAlert, 
  LogIn, 
  Sparkles, 
  AlertCircle, 
  UserPlus, 
  User as UserIcon,
  ShieldCheck,
  Loader2
} from "lucide-react";
import { User, UserRole, UserStatus } from "../types";
import { LocalDB } from "../services/db";

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState(""); 
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Please key in your username.");
      return;
    }

    const allUsers = LocalDB.getUsers();

    if (isRegistering) {
      if (!fullName.trim()) {
        setError("Please provide your full name.");
        return;
      }
      const exists = allUsers.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
      if (exists) {
        setError("This username is already taken.");
        return;
      }

      setLoading(true);
      const newUser: User = {
        userId: `USR-${Date.now().toString().slice(-4)}`,
        username: username.trim().toLowerCase(),
        name: fullName.trim(),
        role: UserRole.Staff, 
        status: UserStatus.Active
      };

      // Save locally and trigger background sync
      LocalDB.setUsers([...allUsers, newUser]);
      LocalDB.appendLog(newUser.username, "New account registered successfully", "USER");

      // FIX: Removed the 1000ms setTimeout to make account creation instant
      onLoginSuccess(newUser);

    } else {
      const userMatched = allUsers.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase()
      );

      if (!userMatched) {
        setError("Username not found. Check spelling or create an account.");
        return;
      }

      if (userMatched.status !== UserStatus.Active) {
        setError("This account is currently deactivated. Contact Proprietor.");
        return;
      }

      LocalDB.appendLog(userMatched.username, "User logged in successfully", "USER");
      onLoginSuccess(userMatched);
    }
  };

  const handleQuickSelect = (userType: string) => {
    setIsRegistering(false);
    setError(null);
    if (userType === "admin") {
      setUsername("admin");
      setPassword("password123");
    } else {
      setUsername("staff");
      setPassword("password123");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-200">
            <span className="text-4xl font-black text-white tracking-tighter">D</span>
          </div>
        </div>
        <h2 className="text-center text-3xl font-black tracking-tight text-slate-900">
          {isRegistering ? "Register Account" : "Drabbit DMIS"}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 font-medium">
          {isRegistering ? "Join the Davao Sasa distribution channel" : "Marketing Information System & Dashboard"}
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-10 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-10 px-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[2.5rem] border border-slate-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-rose-50 p-4 border border-rose-100 text-rose-700 text-xs font-bold flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {isRegistering && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Identity Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vincent Jon Libranza"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 py-4 text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 text-sm font-bold transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Username Identifier</label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. admin, staff"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 py-4 text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 text-sm font-bold transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-4 text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 text-sm font-bold transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center items-center gap-3 rounded-2xl bg-indigo-600 px-4 py-4 text-sm font-black text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              {isRegistering ? "Create Account" : "Sign In to Portal"}
            </button>
          </form>

          <div className="mt-8 flex flex-col items-center gap-6">
            <button
              type="button"
              onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
              className="text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest"
            >
              {isRegistering ? "Back to Secure Login" : "New User? Create Account"}
            </button>

            {!isRegistering && (
              <div className="w-full pt-8 border-t border-slate-100">
                <span className="block text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
                  Developer Quick-Access
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleQuickSelect("admin")}
                    className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-100 transition-all group cursor-pointer"
                  >
                    <ShieldAlert className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-black text-slate-900">Proprietor</span>
                    <span className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Username: admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickSelect("staff")}
                    className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-teal-50 hover:border-teal-100 transition-all group cursor-pointer"
                  >
                    <Sparkles className="w-6 h-6 text-teal-600 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-black text-slate-900">Staff Worker</span>
                    <span className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Username: staff</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-10 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] space-y-2">
          <p>© 2026 Drabbit Marketing — Plainview Village KM.10 Sasa, Davao City</p>
          <p className="text-slate-300">Prepared by Team Honda ADV</p>
        </div>
      </motion.div>
    </div>
  );
}