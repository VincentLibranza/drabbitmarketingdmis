/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { ShieldAlert, LogIn, Sparkles, AlertCircle } from "lucide-react";
import { User, UserRole } from "../types";
import { LocalDB } from "../services/db";

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Please key in your username.");
      return;
    }

    const users = LocalDB.getUsers();
    const userMatched = users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (!userMatched) {
      setError("Username not found. Use 'admin' or 'staff' to test.");
      return;
    }

    if (userMatched.status !== "Active") {
      setError("This account is currently deactivated. Contact Proprietor.");
      return;
    }

    // Capture sign-in
    LocalDB.appendLog(userMatched.username, "User logged in successfully", "USER");

    // Clear error & login
    onLoginSuccess(userMatched);
  };

  const handleQuickSelect = (userType: string) => {
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
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-950 font-sans">
          Drabbit DMIS
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 max-w-xs mx-auto">
          Marketing Information System & Dashboard
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-rose-50 p-3 border border-rose-100 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                Username Identifier
              </label>
              <div className="mt-2.5">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  placeholder="e.g. admin, staff"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-2.5">
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Sign In to Portal
              </button>
            </div>
          </form>

          {/* Quick-Access Test Panel */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <span className="block text-center text-xs text-slate-400 uppercase tracking-wider font-medium mb-3">
              Developer Quick-Access
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <button
                type="button"
                onClick={() => handleQuickSelect("admin")}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 hover:border-indigo-200 transition-all text-slate-700 cursor-pointer text-center"
              >
                <ShieldAlert className="w-5 h-5 text-indigo-600 mb-1" />
                <span className="font-semibold block">Proprietor</span>
                <span className="text-[10px] text-slate-400 mt-1">Username: admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect("staff")}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 hover:border-indigo-200 transition-all text-slate-700 cursor-pointer text-center"
              >
                <Sparkles className="w-5 h-5 text-teal-600 mb-1" />
                <span className="font-semibold block">Staff Worker</span>
                <span className="text-[10px] text-slate-400 mt-1">Username: staff</span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-slate-400 text-xs">
          <p>© 2026 Drabbit Marketing — Plainview Village KM.10 Sasa, Davao City</p>
          <p className="mt-1 font-mono text-[10px] text-slate-300">Prepared by Team Honda ADV</p>
        </div>
      </motion.div>
    </div>
  );
}
