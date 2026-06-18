/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Package, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  CheckCircle,
  X,
  Sparkles,
  ArrowDownToLine,
  TrendingUp
} from "lucide-react";
import { Product } from "../types";
import { LocalDB } from "../services/db";

interface InventoryViewProps {
  products: Product[];
  currentUser: { username: string; name: string };
  onRefreshData: () => void;
}

export default function InventoryView({
  products,
  currentUser,
  onRefreshData
}: InventoryViewProps) {
  
  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states for adding/editing
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Plastic Bags");
  const [formPrice, setFormPrice] = useState(1);
  const [formStock, setFormStock] = useState(0);
  const [formThreshold, setFormThreshold] = useState(10);
  const [formError, setFormError] = useState<string | null>(null);

  // Categories list
  const categories = ["All", "Plastic Bags", "Trash Bags", "Plastic Containers", "Cling Wrap", "Aluminum Foil"];

  // Filters
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.productId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Export Current Filtered Inventory to CSV
  const handleExportCSV = () => {
    const escapeCSV = (str: string) => {
      if (str === null || str === undefined) return "";
      const s = String(str);
      if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const headers = [
      "Product ID",
      "Product Name",
      "Category",
      "Unit Price (PHP)",
      "Available Stock",
      "Safety Threshold",
      "Stock Status"
    ];

    const rows = filteredProducts.map(p => {
      const isLowStock = p.stockQuantity <= p.reorderThreshold;
      return [
        p.productId,
        p.productName,
        p.category,
        p.unitPrice,
        p.stockQuantity,
        p.reorderThreshold,
        isLowStock ? "REORDER" : "NORMAL"
      ];
    });

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map(row => row.map(cell => escapeCSV(String(cell))).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Inventory_Report_${new Date().toISOString().split("T")[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);

    LocalDB.appendLog(
      currentUser.username,
      `Exported filtered inventory log of ${filteredProducts.length} items as CSV`,
      "PRODUCT"
    );

    setSuccessMsg(`Successfully exported ${filteredProducts.length} catalog items as CSV.`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Open Form as Edit Mode
  const handleStartEdit = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.productName);
    setFormCategory(p.category);
    setFormPrice(p.unitPrice);
    setFormStock(p.stockQuantity);
    setFormThreshold(p.reorderThreshold);
    setFormError(null);
    setShowAddForm(true);
  };

  // Open Form as New Mode
  const handleStartNew = () => {
    setEditingProduct(null);
    setFormName("");
    setFormCategory("Plastic Bags");
    setFormPrice(10);
    setFormStock(50);
    setFormThreshold(15);
    setFormError(null);
    setShowAddForm(true);
  };

  // Submit product creation/editing form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError("Product name cannot be empty.");
      return;
    }

    if (formPrice < 0) {
      setFormError("Unit price must be positive.");
      return;
    }

    const currentLocalProducts = LocalDB.getProducts();

    if (editingProduct) {
      // Edit mode
      const updated = currentLocalProducts.map(p => {
        if (p.productId === editingProduct.productId) {
          LocalDB.appendLog(
            currentUser.username, 
            `Updated inventory specs for ${p.productName} (Qty: ${formStock}, Price: ₱${formPrice})`, 
            "PRODUCT"
          );
          return {
            ...p,
            productName: formName,
            category: formCategory,
            unitPrice: formPrice,
            stockQuantity: formStock,
            reorderThreshold: formThreshold
          };
        }
        return p;
      });
      LocalDB.setProducts(updated);
      setSuccessMsg("Product specifications successfully updated!");
    } else {
      // New Product Mode
      const newId = `PRD-${Date.now().toString().slice(-4)}`;
      const newProduct: Product = {
        productId: newId,
        productName: formName,
        category: formCategory,
        unitPrice: formPrice,
        stockQuantity: formStock,
        reorderThreshold: formThreshold
      };
      LocalDB.setProducts([...currentLocalProducts, newProduct]);
      LocalDB.appendLog(
        currentUser.username, 
        `Added new product category: ${formName} with code ${newId}`, 
        "PRODUCT"
      );
      setSuccessMsg("New product registered successfully!");
    }

    setShowAddForm(false);
    onRefreshData();
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Delete product row
  const handleDeleteProduct = (productId: string) => {
    if (confirm("Are you sure you want to retire this product from circulation?")) {
      const currentPrds = LocalDB.getProducts();
      const matched = currentPrds.find(p => p.productId === productId);
      const filtered = currentPrds.filter(p => p.productId !== productId);
      
      LocalDB.setProducts(filtered);
      LocalDB.appendLog(
        currentUser.username, 
        `Retired product ${matched?.productName || productId} from catalog listings`, 
        "PRODUCT"
      );
      onRefreshData();
      setSuccessMsg("Product retired successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Alerts Banner */}
      {successMsg && (
        <div className="bg-emerald-55 text-emerald-800 border border-emerald-250 p-4 rounded-2xl flex items-center gap-2.5 shadow-sm text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Control row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-105 p-4 rounded-2xl shadow-sm">
        
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search ID or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
            <span className="text-xs text-slate-400 font-medium font-sans">Cat:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-semibold bg-transparent border-none text-slate-700 focus:outline-none cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="border border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-705 font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 flex-1 sm:flex-initial justify-center transition-all shadow-sm"
            title="Export standard CSV reports of current filtered inventory"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleStartNew}
            className="bg-indigo-600 hover:bg-indigo-500 cursor-pointer text-white font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 flex-1 sm:flex-initial justify-center transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Catalog Item
          </button>
        </div>
      </div>

      {/* Product Catalog Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProducts.map(p => {
          const isLowStock = p.stockQuantity <= p.reorderThreshold;
          
          return (
            <motion.div
              layout
              key={p.productId}
              className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden transition-all duration-250 ${
                isLowStock ? "border-amber-200 shadow-amber-50/20 shadow-md" : "border-slate-100 hover:border-slate-200"
              }`}
            >
              {/* Badge label background indicators */}
              {isLowStock && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-white text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-bl-xl tracking-wider flex items-center gap-1 shadow-sm">
                  <AlertTriangle className="w-3 h-3" />
                  REORDER
                </div>
              )}

              {/* Product Profile Top */}
              <div className="space-y-1">
                <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold font-mono tracking-wide uppercase">
                  {p.category}
                </span>
                <p className="font-bold text-slate-900 text-sm line-clamp-2 md:h-10 pr-14 select-all pt-1">
                  {p.productName}
                </p>
                <p className="text-[10px] text-slate-400 font-mono tracking-wider font-semibold uppercase">ID: {p.productId}</p>
              </div>

              {/* Current Metrics displays */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100/50">
                  <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Unit Price</span>
                  <span className="font-bold text-slate-900 text-sm font-mono">₱{p.unitPrice.toFixed(2)}</span>
                </div>

                <div className={`p-2 rounded-xl border ${
                  isLowStock ? "bg-amber-50/50 border-amber-100" : "bg-emerald-50 bg-opacity-30 border-slate-100"
                }`}>
                  <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Avail Stock</span>
                  <div className="flex items-baseline gap-1">
                    <span className={`font-black text-sm font-mono ${isLowStock ? "text-rose-600" : "text-emerald-700"}`}>
                      {p.stockQuantity}
                    </span>
                    <span className="text-[9px] text-slate-400 font-normal">units</span>
                  </div>
                </div>
              </div>

              {/* Reorder and operations controls bottom */}
              <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <span className="text-[10px]">Min Safety: </span>
                  <span className="font-semibold text-slate-700 font-mono text-[11px]">{p.reorderThreshold}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStartEdit(p)}
                    className="p-1 px-2.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-150 transition-all cursor-pointer font-semibold inline-flex items-center gap-1 text-[11px]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(p.productId)}
                    className="p-1 px-1.5 rounded-lg border border-rose-100 hover:bg-rose-50 text-rose-550 transition-all cursor-pointer"
                    title="Retire Catalog Item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Embedded Slider form panel (Add / Edit item) */}
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
                    {editingProduct ? `Edit product: ${editingProduct.productId}` : "Register New Packaging SKU"}
                  </h3>
                  <p className="text-xs text-slate-400">Configure catalog properties and threshold limits</p>
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
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Product Name / Sizing</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PE Clear Plastic Bag 10x15 (100pcs)"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-650 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Product Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-650 text-xs"
                    >
                      {categories.filter(c => c !== "All").map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Unit Sales Price (₱)</label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="0.01"
                      value={formPrice}
                      onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-650 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Initial Stock Quantity</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formStock}
                      onChange={(e) => setFormStock(parseInt(e.target.value) || 0)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-650 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Safety Safety Limit (Threshold)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formThreshold}
                      onChange={(e) => setFormThreshold(parseInt(e.target.value) || 0)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-650 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-sm transition-all text-sm block cursor-pointer text-center"
                  >
                    {editingProduct ? "Save Changes" : "Register Product"}
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
