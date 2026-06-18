/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { ShieldAlert, LogIn, Sparkles, AlertCircle, ArrowLeft, UserPlus, CheckCircle2 } from "lucide-react";
import { User, UserRole, UserStatus } from "../types";
import { LocalDB } from "../services/db";

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Registration state
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regRole, setRegRole] = useState<UserRole>(UserRole.Staff);
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

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
      setError("Username not found. Please verify your credentials or register a new account.");
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

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanUsername = regUsername.trim().toLowerCase();
    const cleanName = regName.trim();

    if (!cleanName) {
      setError("Please key in your full name.");
      return;
    }

    if (!cleanUsername) {
      setError("Please select a username identifier.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const currentUsers = LocalDB.getUsers();
    if (currentUsers.some(u => u.username.toLowerCase() === cleanUsername)) {
      setError("An account with that username already exists. Please choose another username.");
      return;
    }

    const newId = `USR-${Math.floor(100 + Math.random() * 900)}`;
    const newUser: User = {
      userId: newId,
      username: cleanUsername,
      name: cleanName,
      role: regRole,
      status: UserStatus.Active
    };

    // Save user
    const updatedUsers = [...currentUsers, newUser];
    LocalDB.setUsers(updatedUsers);

    // Logging action
    LocalDB.appendLog(
      cleanUsername,
      `Registered new user account: ${cleanName} (Role: ${regRole})`,
      "USER"
    );

    setSuccess("Account successfully registered! You can now log in.");
    
    // Auto-fill username & shift to login screen with success message
    setUsername(cleanUsername);
    setIsRegistering(false);
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
          {!isRegistering ? (
            <>
              {success && (
                <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-150 text-emerald-800 text-xs flex items-start gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span>{success}</span>
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-rose-50 p-3 border border-rose-100 text-rose-700 text-xs flex items-start gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
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

              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-2">
                <span className="text-xs text-center text-slate-400">
                  Don't have an account yet?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setError(null);
                    setSuccess(null);
                    setRegUsername("");
                    setRegName("");
                    setRegPassword("");
                    setRegConfirmPassword("");
                    setRegRole(UserRole.Staff);
                  }}
                  className="flex w-full justify-center items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  Create New Account
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Create Account</h3>
              </div>

              {error && (
                <div className="rounded-lg bg-rose-50 p-3 border border-rose-100 text-rose-700 text-xs flex items-start gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Full Name
                  </label>
                  <div className="mt-2 text-slate-900">
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Username Identifier
                  </label>
                  <div className="mt-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. johndoe"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Access Role Group
                  </label>
                  <div className="mt-2">
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as UserRole)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 text-sm transition-all bg-white"
                    >
                      <option value={UserRole.Staff}>Staff Worker (Fills Orders, Catalog View)</option>
                      <option value={UserRole.Proprietor}>Proprietor Owner (Unrestricted Administration Access)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="mt-2">
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <div className="mt-2">
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 text-sm transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="flex w-full justify-center items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    Register Account
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-6 text-slate-400 text-xs">
          <p>© 2026 Drabbit Marketing — Plainview Village KM.10 Sasa, Davao City</p>
          <p className="mt-1 font-mono text-[10px] text-slate-300">Prepared by Team Honda ADV</p>
        </div>
      </motion.div>
    </div>
  );
}
