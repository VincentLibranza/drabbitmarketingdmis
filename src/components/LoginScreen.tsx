/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, LogIn, Sparkles, AlertCircle, UserPlus, User as UserIcon } from "lucide-react";
import { User, UserRole, UserStatus } from "../types";
import { LocalDB } from "../services/db";

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState(""); // Used for registration
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
      // --- REGISTRATION LOGIC ---
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
        userId: `USR-${Date.now().toString().slice(-4)}`, // Generate simple ID
        username: username.trim().toLowerCase(),
        name: fullName.trim(),
        role: UserRole.Staff, // New users default to Staff
        status: UserStatus.Active
      };

      // Save to LocalDB (This triggers the auto-sync to Turso)
      LocalDB.setUsers([...allUsers, newUser]);
      
      // Log the event
      LocalDB.appendLog(newUser.username, "New account registered successfully", "USER");

      // Brief pause to simulate network/sync feel
      setTimeout(() => {
        onLoginSuccess(newUser);
      }, 1000);

    } else {
      // --- LOGIN LOGIC ---
      const userMatched = allUsers.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase()
      );

      if (!userMatched) {
        setError("Username not found. Check spelling or create an account.");
        return;
      }

      if (userMatched.status !== "Active") {
        setError("This account is currently deactivated. Contact Proprietor.");
        return;
      }

      LocalDB.appendLog(userMatched.username, "User logged in successfully", "USER");
      onLoginSuccess(userMatched);
    }
  };

  const handleQuickSelect = (userType: string) => {
    setIsRegistering(false);
    if (userType === "admin") {
      setUsername("admin");
      setPassword("password123");
    } else {
      setUsername("staff");
      setPassword("password123");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <span className="text-3xl font-bold text-white tracking-widest font-sans">D</span>
          </div>
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-950 font-sans uppercase">
          {isRegistering ? "Create Account" : "Drabbit DMIS"}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 max-w-xs mx-auto">
          {isRegistering ? "Join the Davao Sasa distribution network" : "Marketing Information System & Dashboard"}
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 rounded-3xl sm:px-10 border border-slate-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl bg-rose-50 p-3 border border-rose-100 text-rose-700 text-[11px] font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {isRegistering && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5"
                >
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Juan Dela Cruz"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 text-sm transition-all"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Username Identifier</label>
              <input
                type="text"
                required
                placeholder="Unique username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 text-sm transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Secure Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 text-sm transition-all"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center items-center gap-2 rounded-xl bg-indigo-600 px-4 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-500 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <span className="animate-pulse">Syncing...</span>
                ) : (
                  <>
                    {isRegistering ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                    {isRegistering ? "Complete Registration" : "Sign In to Portal"}
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              {isRegistering ? "Already have an account? Back to Login" : "New staff member? Create an account"}
            </button>
          </div>

          {/* Quick-Access Test Panel - Only show on Login Mode */}
          {!isRegistering && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <span className="block text-center text-[10px] text-slate-400 uppercase tracking-widest font-black mb-3">
                Developer Fast-Lane
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickSelect("admin")}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 hover:border-indigo-200 transition-all text-slate-700 cursor-pointer"
                >
                  <ShieldAlert className="w-5 h-5 text-indigo-600 mb-1" />
                  <span className="font-bold block">Proprietor</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">User: admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickSelect("staff")}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 hover:border-indigo-200 transition-all text-slate-700 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-teal-600 mb-1" />
                  <span className="font-bold block">Staff</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">User: staff</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-8 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
          <p>© 2026 Drabbit Marketing — Davao City</p>
          <p className="mt-1 text-slate-300">CS103P S.A.D. Final Project</p>
        </div>
      </motion.div>
    </div>
  );
}