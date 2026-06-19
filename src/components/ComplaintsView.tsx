/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  Search, 
  Plus, 
  HelpCircle, 
  CheckCircle, 
  AlertCircle,
  X,
  PlusCircle,
  ChevronRight,
  FileText
} from "lucide-react";
import { Complaint, ComplaintStatus, Customer, Product } from "../types";
import { LocalDB } from "../services/db";

interface ComplaintsViewProps {
  complaints: Complaint[];
  customers: Customer[];
  products: Product[];
  currentUser: { username: string; name: string };
  onRefreshData: () => void;
}

export default function ComplaintsView({
  complaints,
  customers,
  products,
  currentUser,
  onRefreshData
}: ComplaintsViewProps) {
  
  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states for new Complaint
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formProductId, setFormProductId] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStatus, setFormStatus] = useState<ComplaintStatus>(ComplaintStatus.Open);
  const [formResolution, setFormResolution] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Filters
  const filteredComplaints = complaints.filter(c => {
    const customer = customers.find(cust => cust.customerId === c.customerId);
    const matchesSearch = 
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (customer && customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = statusFilter === "All" || c.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  // Start Create Mode
  const handleStartNew = () => {
    setEditingComplaint(null);
    setFormCustomerId("");
    setFormProductId("");
    setFormDesc("");
    setFormStatus(ComplaintStatus.Open);
    setFormResolution("");
    setFormError(null);
    setShowAddForm(true);
  };

  // Start Edit Mode
  const handleStartEdit = (c: Complaint) => {
    setEditingComplaint(c);
    setFormCustomerId(c.customerId);
    setFormProductId(c.productId || "");
    setFormDesc(c.description);
    setFormStatus(c.status);
    setFormResolution(c.resolution || "");
    setFormError(null);
    setShowAddForm(true);
  };

  // Submit Handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formCustomerId) {
      setFormError("Must select an associated customer record.");
      return;
    }

    if (!formDesc.trim()) {
      setFormError("Complaint description or product defect report is required.");
      return;
    }

    const currentLocalComplaints = LocalDB.getComplaints();

    if (editingComplaint) {
      // Edit Mode
      const finalStatus = (formResolution && formResolution.trim() !== "") ? ComplaintStatus.Resolved : formStatus;
      const updated = currentLocalComplaints.map(compl => {
        if (compl.complaintId === editingComplaint.complaintId) {
          
          LocalDB.appendLog(
            currentUser.username, 
            `Updated dispute claim case ${compl.complaintId} (Status set to: ${finalStatus})`, 
            "COMPLAINT"
          );

          return {
            ...compl,
            customerId: formCustomerId,
            productId: formProductId || undefined,
            description: formDesc,
            status: finalStatus,
            resolution: formResolution || undefined
          };
        }
        return compl;
      });
      LocalDB.setComplaints(updated);
      setSuccessMsg("Dispute case records updated successfully.");
    } else {
      // Create Mode
      const newId = `CMP-${Date.now().toString().slice(-4)}`;
      const newCompl: Complaint = {
        complaintId: newId,
        customerId: formCustomerId,
        productId: formProductId || undefined,
        description: formDesc,
        status: statusFilter === "All" ? ComplaintStatus.Open : formStatus,
        dateLogged: new Date().toISOString()
      };
      LocalDB.setComplaints([newCompl, ...currentLocalComplaints]);
      LocalDB.appendLog(
        currentUser.username, 
        `Logged customer service dispute case ${newId} regarding packaging quality`, 
        "COMPLAINT"
      );
      setSuccessMsg("Dispute incident filed. Handled tickets path recorded!");
    }

    setShowAddForm(false);
    onRefreshData();
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-805 border border-emerald-250 p-4 rounded-xl flex items-center gap-2.5 text-xs font-semibold">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* filter toolbars */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search complaint description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
            <span className="text-xs text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold bg-transparent border-none text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="All">All cases</option>
              <option value={ComplaintStatus.Open}>Open</option>
              <option value={ComplaintStatus.InProgress}>In Progress</option>
              <option value={ComplaintStatus.Resolved}>Resolved</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleStartNew}
          className="bg-indigo-650 hover:bg-indigo-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 self-stretch sm:self-auto justify-center transition-all shadow-sm cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Log Customer Complaint
        </button>
      </div>

      {/* Grid listing complaints */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredComplaints.length === 0 ? (
          <div className="col-span-full bg-white p-12 border border-slate-100 rounded-2xl text-center space-y-3">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Perfect Record: No Customer Service Incidents</p>
            <p className="text-xs text-slate-400">All registered clients currently express full satisfaction.</p>
          </div>
        ) : (
          filteredComplaints.map(compl => {
            const customer = customers.find(cust => cust.customerId === compl.customerId);
            const product = products.find(prod => prod.productId === compl.productId);
            const isResolved = compl.status === ComplaintStatus.Resolved || (compl.resolution && compl.resolution.trim() !== "");
            const displayStatus = isResolved ? ComplaintStatus.Resolved : compl.status;
            
            return (
              <motion.div
                layout
                key={compl.complaintId}
                className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-200 transition-all ${
                  displayStatus === ComplaintStatus.Resolved ? "border-slate-100 bg-slate-50/25" : "border-rose-100"
                }`}
              >
                {/* Header info */}
                <div className="flex justify-between items-start">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    displayStatus === ComplaintStatus.Resolved ? "bg-emerald-50 text-emerald-850" :
                    displayStatus === ComplaintStatus.InProgress ? "bg-amber-50 text-amber-850" :
                    "bg-rose-50 text-rose-850"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      displayStatus === ComplaintStatus.Resolved ? "bg-emerald-500" :
                      displayStatus === ComplaintStatus.InProgress ? "bg-amber-500" :
                      "bg-rose-500"
                    }`} />
                    {displayStatus}
                  </span>

                  <span className="text-[10px] text-slate-400 font-mono">Case Code: {compl.complaintId}</span>
                </div>

                {/* Dispute descriptions */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Incident Details</span>
                  <div className="text-xs font-semibold text-slate-800">
                    Client: {customer?.customerName || "Retail Walk-In Client"}
                  </div>
                  {product && (
                    <div className="text-[11px] text-slate-500">
                      Product Item: <strong className="font-semibold text-slate-700">{product.productName}</strong> ({product.productId})
                    </div>
                  )}
                  <p className="p-3 bg-slate-50 rounded-lg text-slate-600 text-xs italic border border-slate-100">
                    "{compl.description}"
                  </p>
                </div>

                {/* Resolution field */}
                {compl.resolution ? (
                  <div className="p-3 bg-emerald-50/30 border border-emerald-100 text-slate-700 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-emerald-800 flex items-center gap-1 uppercase tracking-wider text-[9px]">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-650" />
                      Audited Resolution Notes
                    </span>
                    <p className="italic font-medium">"{compl.resolution}"</p>
                  </div>
                ) : (
                  <div className="text-xs text-rose-600/90 font-medium flex items-center gap-1 bg-rose-50/50 p-2 border border-rose-100 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Dispute unresolved. Action and resolution notes required.</span>
                  </div>
                )}

                {/* Logs metadata and buttons */}
                <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[10px] font-mono">Logged: {new Date(compl.dateLogged).toLocaleDateString()}</span>
                  <button
                    onClick={() => handleStartEdit(compl)}
                    className="p-1 px-3.5 rounded-lg border border-slate-200 text-slate-700 hover:text-indigo-650 hover:bg-slate-50 hover:border-indigo-150 transition-all font-bold cursor-pointer text-[11px]"
                  >
                    {displayStatus === ComplaintStatus.Resolved ? "Manage ticket" : "Resolve ticket"}
                  </button>
                </div>

              </motion.div>
            );
          })
        )}
      </div>

      {/* sliding overlay Resolution Form */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="bg-white tracking-normal h-full w-full max-w-lg shadow-2xl flex flex-col border-l border-slate-100"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingComplaint ? `Manage service dispute: ${editingComplaint.complaintId}` : "File New Dispute Ticket"}
                  </h3>
                  <p className="text-xs text-slate-400">Log customer feedback and document swap details</p>
                </div>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-750">
                
                {formError && (
                  <div className="rounded-lg bg-rose-50 border border-rose-100 p-3.5 text-rose-700 text-xs flex items-start gap-2">
                    <X className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Cliente profile */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Select Client claimant</label>
                  <select
                    value={formCustomerId}
                    onChange={(e) => setFormCustomerId(e.target.value)}
                    required
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-650 text-xs"
                  >
                    <option value="">-- Choose client profile --</option>
                    {customers.map(c => (
                      <option key={c.customerId} value={c.customerId}>
                        {c.customerName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Product SKU selection */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Option: Defective / Linked SKU</label>
                  <select
                    value={formProductId}
                    onChange={(e) => setFormProductId(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-650 text-xs"
                  >
                    <option value="">-- No associated catalog item --</option>
                    {products.map(p => (
                      <option key={p.productId} value={p.productId}>
                        {p.productName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Issue details comments */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Detailed Incident Description</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="e.g. Broken packages delivered, wrong quantities, or quality defects..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-650 text-xs leading-relaxed"
                  />
                </div>

                {/* Status choice & Resolution writing */}
                {editingComplaint && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider">Ticket Status Selection</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as ComplaintStatus)}
                        className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-650 text-xs font-bold"
                      >
                        <option value={ComplaintStatus.Open}>Open</option>
                        <option value={ComplaintStatus.InProgress}>In Progress</option>
                        <option value={ComplaintStatus.Resolved}>Resolved (Dispute Finished)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider">Fulfillment Resolution Notes</label>
                      <textarea
                        rows={3}
                        placeholder="Describe replacement details, credit memo info, or adjustments applied..."
                        value={formResolution}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormResolution(val);
                          if (val.trim() !== "" && formStatus !== ComplaintStatus.Resolved) {
                            setFormStatus(ComplaintStatus.Resolved);
                          }
                        }}
                        className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-650 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Buttons footer */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow transition-all text-sm block cursor-pointer text-center"
                  >
                    {editingComplaint ? "Save Ticket Resolution" : "File Ticket Case"}
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
