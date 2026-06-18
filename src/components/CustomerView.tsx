/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  X, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase 
} from "lucide-react";
import { Customer } from "../types";
import { LocalDB } from "../services/db";

interface CustomerViewProps {
  customers: Customer[];
  currentUser: { username: string; name: string };
  onRefreshData: () => void;
}

export default function CustomerView({
  customers,
  currentUser,
  onRefreshData
}: CustomerViewProps) {
  
  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states for adding/editing
  const [formName, setFormName] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTin, setFormTin] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Filters
  const filteredCustomers = customers.filter(c => 
    c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact.includes(searchTerm) ||
    (c.tin && c.tin.includes(searchTerm))
  );

  // Start Edit Mode
  const handleStartEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormName(c.customerName);
    setFormContact(c.contact);
    setFormAddress(c.address);
    setFormEmail(c.email);
    setFormTin(c.tin || "");
    setFormError(null);
    setShowAddForm(true);
  };

  // Start Create Mode
  const handleStartNew = () => {
    setEditingCustomer(null);
    setFormName("");
    setFormContact("");
    setFormAddress("");
    setFormEmail("");
    setFormTin("");
    setFormError(null);
    setShowAddForm(true);
  };

  // Submit form handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError("Client name is required.");
      return;
    }

    const currentLocalCustomers = LocalDB.getCustomers();

    if (editingCustomer) {
      // Edit Mode
      const updated = currentLocalCustomers.map(c => {
        if (c.customerId === editingCustomer.customerId) {
          LocalDB.appendLog(
            currentUser.username, 
            `Updated contact information of customer: ${formName} (${formTin ? "TIN: " + formTin : "No TIN"})`, 
            "CUSTOMER"
          );
          return {
            ...c,
            customerName: formName,
            contact: formContact,
            address: formAddress,
            email: formEmail,
            tin: formTin
          };
        }
        return c;
      });
      LocalDB.setCustomers(updated);
      setSuccessMsg("Client details successfully updated!");
    } else {
      // Create Mode
      const newId = `CST-${Date.now().toString().slice(-4)}`;
      const newCustomer: Customer = {
        customerId: newId,
        customerName: formName,
        contact: formContact,
        address: formAddress,
        email: formEmail,
        tin: formTin
      };
      LocalDB.setCustomers([...currentLocalCustomers, newCustomer]);
      LocalDB.appendLog(
        currentUser.username, 
        `Registered new wholesale client: ${formName} with code ${newId} (TIN: ${formTin || "N/A"})`, 
        "CUSTOMER"
      );
      setSuccessMsg("New wholesale client registered successfully!");
    }

    setShowAddForm(false);
    onRefreshData();
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Delete Customer
  const handleDeleteCustomer = (customerId: string) => {
    if (confirm("Are you sure you want to delete this customer profile from listings?")) {
      const currentCusts = LocalDB.getCustomers();
      const matched = currentCusts.find(c => c.customerId === customerId);
      const filtered = currentCusts.filter(c => c.customerId !== customerId);

      LocalDB.setCustomers(filtered);
      LocalDB.appendLog(
        currentUser.username, 
        `Deleted customer profile for key details: ${matched?.customerName || customerId}`, 
        "CUSTOMER"
      );
      onRefreshData();
      setSuccessMsg("Customer profile deleted success.");
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Alert toast info overlay */}
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-250 p-4 rounded-2xl flex items-center gap-2.5 shadow-sm text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Control panel row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search client by name, zone, address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
          />
        </div>

        <button
          onClick={handleStartNew}
          className="bg-indigo-600 hover:bg-indigo-500 cursor-pointer text-white font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 self-stretch sm:self-auto justify-center transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Register Customer
        </button>
      </div>

      {/* Grid displaying registered customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => (
          <motion.div
            layout
            key={customer.customerId}
            className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:border-slate-200 transition-all space-y-4"
          >
            {/* Customer Brief Head */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{customer.customerName}</h4>
                  <span className="text-[10px] text-indigo-500 font-mono tracking-wider font-semibold">ID: {customer.customerId}</span>
                </div>
              </div>
            </div>

            {/* Contacts Area */}
            <div className="space-y-2 pt-3 border-t border-slate-50 text-xs text-slate-550">
              <div className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="font-mono font-semibold text-[11px] text-slate-700">TIN: {customer.tin || "Not Registered"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{customer.contact || "No Phone Contact Locked"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{customer.email || "No Email File Ingested"}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <span className="line-clamp-2 leading-relaxed">{customer.address || "Davao City Local Customer"}</span>
              </div>
            </div>

            {/* Quick Operations toolbar bottom */}
            <div className="pt-3 border-t border-slate-50 flex justify-end gap-2 text-xs">
              <button
                onClick={() => handleStartEdit(customer)}
                className="p-1 px-3 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-150 transition-all cursor-pointer font-semibold inline-flex items-center gap-1 text-[11px]"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Record
              </button>
              <button
                onClick={() => handleDeleteCustomer(customer.customerId)}
                className="p-1.5 rounded-lg border border-rose-100 hover:bg-rose-50 text-rose-500 transition-all cursor-pointer"
                title="Delete Customer Profile"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

          </motion.div>
        ))}
      </div>

      {/* embedded sliding overlay form */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="bg-white tracking-normal h-full w-full max-w-md shadow-2xl flex flex-col border-l border-slate-100"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingCustomer ? `Edit details: ${editingCustomer.customerId}` : "Register New Registered Client"}
                  </h3>
                  <p className="text-xs text-slate-400">Add corporate/wholesale accounts in Davao Sasa area</p>
                </div>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
                
                {formError && (
                  <div className="rounded-lg bg-rose-50 border border-rose-100 p-3.5 text-rose-700 text-xs flex items-start gap-2">
                    <X className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Client Corporate Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sasa Bakery Hub, Agdao Mart"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-650 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Tax Identification Number (TIN)</label>
                  <input
                    type="text"
                    placeholder="e.g. 000-123-456-000"
                    value={formTin}
                    onChange={(e) => setFormTin(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-650 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Primary Phone Line</label>
                  <input
                    type="text"
                    placeholder="e.g. +63 912 345 6789"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-650 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. contact@sasabakery.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-650 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Full Delivery Address (Davao Region)</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. KM 10.5, Sasa, Davao City"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-650 text-xs"
                  />
                </div>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-sm transition-all text-sm block cursor-pointer text-center"
                  >
                    {editingCustomer ? "Update Client" : "Register Client Link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-center transition-all text-sm block"
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
