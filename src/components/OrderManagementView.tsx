/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  User, 
  Calendar, 
  CreditCard, 
  Trash2, 
  Eye, 
  Package, 
  CheckCircle,
  FileCheck,
  AlertTriangle,
  X,
  Printer,
  ChevronDown,
  Download
} from "lucide-react";
import { Order, OrderStatus, PaymentStatus, Product, Customer, OrderItem, Invoice } from "../types";
import { LocalDB } from "../services/db";
import { jsPDF } from "jspdf";
// @ts-ignore
import drabbitLogo from "../assets/images/drabbit_logo_1781809598838.jpg";

interface OrderManagementViewProps {
  orders: Order[];
  products: Product[];
  customers: Customer[];
  currentUser: { username: string; name: string };
  onRefreshData: () => void;
}

export default function OrderManagementView({
  orders,
  products,
  customers,
  currentUser,
  onRefreshData
}: OrderManagementViewProps) {
  
  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<"orders" | "invoices">("orders");

  const downloadPDFInvoice = () => {
    if (!selectedInvoiceOrder) return;
    
    const client = customers.find(c => c.customerId === selectedInvoiceOrder.customerId);
    const clientName = client?.customerName || "Walk-In buyer";
    const clientAddress = client?.address || "Davao City Local Customer";
    const clientPhone = client?.contact || "N/A";
    const clientTin = client?.tin || "Not Registered";

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const primaryColor = [79, 70, 229]; // Indigo-600
    const darkColor = [15, 23, 42]; // Slate-900
    const lightGrey = [100, 116, 139]; // Slate-500
    const lineGrey = [226, 232, 240]; // Slate-200

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text("DRABBIT MARKETING", 20, 25);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("SUPPLY & DISTRIBUTION CENTER", 20, 31);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(lightGrey[0], lightGrey[1], lightGrey[2]);
    doc.text("Plainview Village KM.10 Sasa, Davao City", 20, 37);
    doc.text("Proprietor: Rufino N. Libranza Jr.", 20, 42);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text("INVOICE", 190, 25, { align: "right" });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(lightGrey[0], lightGrey[1], lightGrey[2]);
    doc.text(`Ref: ${selectedInvoiceOrder.orderRefNo}`, 190, 31, { align: "right" });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`PAYMENT STATUS: ${selectedInvoiceOrder.paymentStatus.toUpperCase()}`, 190, 37, { align: "right" });

    doc.setDrawColor(lineGrey[0], lineGrey[1], lineGrey[2]);
    doc.setLineWidth(0.5);
    doc.line(20, 48, 190, 48);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(lightGrey[0], lightGrey[1], lightGrey[2]);
    doc.text("BILLED CLIENT:", 20, 58);
    doc.text("TRANSACTION DETAILS:", 110, 58);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(clientName, 20, 64);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(lightGrey[0], lightGrey[1], lightGrey[2]);
    
    const addressLines = doc.splitTextToSize(`Address: ${clientAddress}`, 80);
    doc.text(addressLines, 20, 70);
    
    const contactY = 70 + (addressLines.length * 4.5);
    doc.text(`Phone: ${clientPhone}`, 20, contactY);
    
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(`TIN: ${clientTin}`, 20, contactY + 5);

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(9.5);
    doc.text(`Date Issued: ${new Date(selectedInvoiceOrder.orderDate).toLocaleDateString()}`, 110, 64);
    doc.text(`Due Date: ${selectedInvoiceOrder.dueDate}`, 110, 70);
    doc.text(`Logistics: ${selectedInvoiceOrder.status}`, 110, 76);

    const tableStartY = Math.max(contactY + 12, 84);
    doc.line(20, tableStartY, 190, tableStartY);

    doc.setFillColor(248, 250, 252);
    doc.rect(20, tableStartY + 2, 170, 8, "F");
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(lightGrey[0], lightGrey[1], lightGrey[2]);
    doc.text("PRODUCT DESCRIPTION", 23, tableStartY + 7.5);
    doc.text("QTY PURCHASED", 110, tableStartY + 7.5, { align: "center" });
    doc.text("UNIT PRICE", 150, tableStartY + 7.5, { align: "right" });
    doc.text("LINE TOTAL", 185, tableStartY + 7.5, { align: "right" });

    let currentY = tableStartY + 15;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);

    selectedInvoiceOrder.items.forEach((item) => {
      const prod = products.find(p => p.productId === item.productId);
      const prodName = prod?.productName || "Packaging Item";
      
      doc.setFont("Helvetica", "bold");
      doc.text(prodName, 23, currentY);
      
      doc.setFont("Helvetica", "normal");
      doc.text(`${item.quantity} units`, 110, currentY, { align: "center" });
      doc.text(`P${item.unitPrice.toFixed(2)}`, 150, currentY, { align: "right" });
      
      doc.setFont("Helvetica", "bold");
      doc.text(`P${(item.quantity * item.unitPrice).toFixed(2)}`, 185, currentY, { align: "right" });

      currentY += 8;
    });

    doc.line(20, currentY, 190, currentY);
    currentY += 6;

    const subtotalVal = selectedInvoiceOrder.totalAmount / 1.12;
    const vatVal = (selectedInvoiceOrder.totalAmount / 1.12) * 0.12;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(lightGrey[0], lightGrey[1], lightGrey[2]);
    doc.text("Vatable Sales:", 135, currentY, { align: "right" });
    doc.text(`P${subtotalVal.toFixed(2)}`, 185, currentY, { align: "right" });

    currentY += 5;
    doc.text("Value Added Tax (12% VAT):", 135, currentY, { align: "right" });
    doc.text(`P${vatVal.toFixed(2)}`, 185, currentY, { align: "right" });

    currentY += 7;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("TOTAL PAYABLE:", 135, currentY, { align: "right" });
    doc.text(`P${selectedInvoiceOrder.totalAmount.toFixed(2)}`, 185, currentY, { align: "right" });

    currentY = Math.max(currentY + 20, 260);
    doc.line(20, currentY, 190, currentY);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(lightGrey[0], lightGrey[1], lightGrey[2]);
    doc.text("Thank you for buying packaging supplies from Drabbit Marketing!", 105, currentY + 5, { align: "center" });
    doc.text("Invoices are automatically generated by the Drabbit DMIS server in accordance with SAD regulations.", 105, currentY + 8.5, { align: "center" });
    doc.text("Plainview Village KM.10 Sasa, Davao City, Philippines", 105, currentY + 12, { align: "center" });

    doc.save(`Invoice_${selectedInvoiceOrder.orderRefNo}.pdf`);
  };

  // Form states for new order
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formItems, setFormItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: "", quantity: 1 }
  ]);
  const [formPaymentStatus, setFormPaymentStatus] = useState<PaymentStatus>(PaymentStatus.Unpaid);
  const [formError, setFormError] = useState<string | null>(null);

  // 1. Filtering
  const filteredOrders = orders.filter(o => {
    const customer = customers.find(c => c.customerId === o.customerId);
    const matchesSearch = 
      o.orderRefNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer && customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (statusFilter === "All") return matchesSearch;
    return matchesSearch && o.status === statusFilter;
  });

  // Export Current Filtered Orders list to CSV
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
      "Order Reference",
      "Customer Name",
      "Customer Contact",
      "Date Placed",
      "Total Amount (PHP)",
      "Fulfillment Status",
      "Payment Status",
      "Due Date",
      "Total Items Ordered",
      "Purchased Sku Details"
    ];

    const rows = filteredOrders.map(o => {
      const customer = customers.find(c => c.customerId === o.customerId);
      const totalItems = o.items.reduce((acc, item) => acc + item.quantity, 0);
      
      const itemDetailsStr = o.items.map(item => {
        const prod = products.find(p => p.productId === item.productId);
        const prodLabel = prod ? prod.productName : "Unlisted Product";
        return `${prodLabel} (${item.quantity} units @ ₱${item.unitPrice})`;
      }).join("; ");

      return [
        o.orderRefNo,
        customer?.customerName || "Walk-In buyer",
        customer?.contact || "N/A",
        new Date(o.orderDate).toLocaleString("en-US"),
        o.totalAmount,
        o.status,
        o.paymentStatus,
        o.dueDate,
        totalItems,
        itemDetailsStr
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
    link.setAttribute("download", `Order_Ledger_Report_${new Date().toISOString().split("T")[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);

    LocalDB.appendLog(
      currentUser.username,
      `Exported filtered order book of ${filteredOrders.length} records as CSV`,
      "ORDER"
    );
  };

  // Calculate Form Basket Totals
  const calculateFormTotal = () => {
    return formItems.reduce((sum, item) => {
      const prod = products.find(p => p.productId === item.productId);
      if (!prod) return sum;
      return sum + prod.unitPrice * item.quantity;
    }, 0);
  };

  // Add Item row in checkout basket
  const handleAddFormItem = () => {
    setFormItems([...formItems, { productId: "", quantity: 1 }]);
  };

  // Remove item row
  const handleRemoveFormItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  // Change item product or quantity
  const handleItemChange = (index: number, field: "productId" | "quantity", value: any) => {
    const updated = [...formItems];
    if (field === "productId") {
      updated[index].productId = value;
    } else {
      updated[index].quantity = Math.max(1, parseInt(value) || 1);
    }
    setFormItems(updated);
  };

  // Submit new order action
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formCustomerId) {
      setFormError("Please select a customer.");
      return;
    }

    if (formItems.some(i => !i.productId)) {
      setFormError("Point of Sale: Ensure all line items have a product selected.");
      return;
    }

    // Verify Stock Availability (UC-03 / Verification)
    for (const item of formItems) {
      const prod = products.find(p => p.productId === item.productId);
      if (prod && prod.stockQuantity < item.quantity) {
        setFormError(
          `Insufficient Stock: Only ${prod.stockQuantity} units left for "${prod.productName}". Requested: ${item.quantity}.`
        );
        return;
      }
    }

    // Prepare line items
    const idSeed = Date.now();
    const finalItems: OrderItem[] = formItems.map((item, idx) => {
      const prod = products.find(p => p.productId === item.productId)!;
      return {
        itemId: `ITEM-${idSeed}-${idx}`,
        orderId: `ORD-${idSeed}`,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: prod.unitPrice
      };
    });

    const totalCost = finalItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    const newOrder: Order = {
      orderId: `ORD-${idSeed}`,
      orderRefNo: `DMIS-ORD-${orders.length + 1001}`,
      customerId: formCustomerId,
      orderDate: new Date().toISOString(),
      status: OrderStatus.Pending,
      paymentStatus: formPaymentStatus,
      totalAmount: totalCost,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      items: finalItems
    };

    // Save to Database
    const currentOrders = LocalDB.getOrders();
    LocalDB.setOrders([newOrder, ...currentOrders]);

    // Create and save invoice in database
    const newInvoice: Invoice = {
      invoiceId: `INV-${idSeed}`,
      orderId: newOrder.orderId,
      invoiceDate: newOrder.orderDate.split("T")[0],
      totalAmount: newOrder.totalAmount,
      paymentStatus: newOrder.paymentStatus,
      dueDate: newOrder.dueDate
    };
    const currentInvoices = LocalDB.getInvoices();
    LocalDB.setInvoices([newInvoice, ...currentInvoices]);

    // Append to system delivery scheduler automatically if status is pending/confirmed
    const currentDeliveries = LocalDB.getDeliveries();
    const newDelivery = {
      deliveryId: `DLV-${idSeed}`,
      orderId: newOrder.orderId,
      scheduledDate: newOrder.dueDate,
      status: "Pending" as any,
      assignedDriver: "Unassigned - Click Schedule"
    };
    LocalDB.setDeliveries([...currentDeliveries, newDelivery]);

    // Audit log
    LocalDB.appendLog(
      currentUser.username,
      `Recorded new customer order ${newOrder.orderRefNo} (Total: ₱${totalCost})`,
      "ORDER"
    );

    // Success resetting
    setShowAddForm(false);
    setFormCustomerId("");
    setFormItems([{ productId: "", quantity: 1 }]);
    setFormPaymentStatus(PaymentStatus.Unpaid);
    onRefreshData();
  };

  // Update Status Level
  const handleUpdateOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    const currentOrders = LocalDB.getOrders();
    let affectedOrderRef = "";
    
    const updatedOrders = currentOrders.map(o => {
      if (o.orderId === orderId) {
        affectedOrderRef = o.orderRefNo;
        
        // If transitioning to "Delivered", automatically decrement Stock (DUC-05)
        if (nextStatus === OrderStatus.Delivered) {
          const currentProducts = LocalDB.getProducts();
          const updatedProducts = currentProducts.map(p => {
            const lineItem = o.items.find(i => i.productId === p.productId);
            if (lineItem) {
              const remainingStock = Math.max(0, p.stockQuantity - lineItem.quantity);
              return { ...p, stockQuantity: remainingStock };
            }
            return p;
          });
          LocalDB.setProducts(updatedProducts);
        }

        // Auto transition delivery table too
        const deliveries = LocalDB.getDeliveries();
        const updatedDeliveries = deliveries.map(d => {
          if (d.orderId === orderId) {
            return {
              ...d,
              status: nextStatus === OrderStatus.Delivered ? "Delivered" : "In Transit" as any,
              deliveryDate: nextStatus === OrderStatus.Delivered ? new Date().toISOString().replace("T", " ").substring(0, 16) : undefined
            };
          }
          return d;
        });
        LocalDB.setDeliveries(updatedDeliveries);

        return { ...o, status: nextStatus };
      }
      return o;
    });

    LocalDB.setOrders(updatedOrders);
    LocalDB.appendLog(
      currentUser.username,
      `State transition on ${affectedOrderRef} to status: ${nextStatus}`,
      "ORDER"
    );
    onRefreshData();
  };

  // Toggle Payment Details
  const handleTogglePayment = (orderId: string, nextPay: PaymentStatus) => {
    const currentOrders = LocalDB.getOrders();
    const updated = currentOrders.map(o => {
      if (o.orderId === orderId) {
        return { ...o, paymentStatus: nextPay };
      }
      return o;
    });
    LocalDB.setOrders(updated);

    // Also update corresponding invoice payment status
    const currentInvoices = LocalDB.getInvoices();
    const updatedInvoices = currentInvoices.map(inv => {
      if (inv.orderId === orderId) {
        return { ...inv, paymentStatus: nextPay };
      }
      return inv;
    });
    LocalDB.setInvoices(updatedInvoices);

    onRefreshData();
  };

  const handleDeleteOrder = (orderId: string) => {
    const currentOrders = LocalDB.getOrders();
    const orderToDelete = currentOrders.find(o => o.orderId === orderId);
    if (!orderToDelete) return;

    // Delete the order
    const updatedOrders = currentOrders.filter(o => o.orderId !== orderId);
    LocalDB.setOrders(updatedOrders);

    // Delete corresponding deliveries
    const currentDeliveries = LocalDB.getDeliveries();
    const updatedDeliveries = currentDeliveries.filter(d => d.orderId !== orderId);
    LocalDB.setDeliveries(updatedDeliveries);

    // Delete corresponding invoices
    const currentInvoices = LocalDB.getInvoices();
    const updatedInvoices = currentInvoices.filter(i => i.orderId !== orderId);
    LocalDB.setInvoices(updatedInvoices);

    // Add audit log
    LocalDB.appendLog(
      currentUser.username,
      `Permanently deleted customer order ${orderToDelete.orderRefNo} and removed corresponding dispatch route`,
      "ORDER"
    );

    // Clear delete confirmation state
    setDeleteConfirmId(null);
    onRefreshData();
  };

  return (
    <div className="space-y-6">
      
      {/* View Switcher Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveViewMode("orders")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeViewMode === "orders"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Orders Log Book
        </button>
        <button
          onClick={() => setActiveViewMode("invoices")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeViewMode === "invoices"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Invoices Registry Table (DB Synced)
        </button>
      </div>

      {activeViewMode === "orders" ? (
        <>
          {/* Header bar controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-transparent border-none text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value={OrderStatus.Pending}>Pending</option>
              <option value={OrderStatus.Confirmed}>Confirmed</option>
              <option value={OrderStatus.Dispatched}>In Transit (Dispatched)</option>
              <option value={OrderStatus.Delivered}>Delivered</option>
              <option value={OrderStatus.Cancelled}>Cancelled</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="border border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-705 font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 flex-1 sm:flex-initial justify-center transition-all shadow-sm"
            title="Export standard CSV reports of current filtered order log"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-indigo-600 hover:bg-indigo-500 cursor-pointer text-white font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 flex-1 sm:flex-initial justify-center transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Order
          </button>
        </div>
      </div>

      {/* Orders Grid/Table Display */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">Order Ledgers ({filteredOrders.length})</span>
          <span className="text-xs text-slate-400 font-mono">DTI Compliant Logs</span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-450 border-t border-slate-50">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold">No Orders Recorded</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your filters or creating a new checkout sheet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm text-slate-705">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-xs font-bold border-b border-slate-100 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Ref Number</th>
                  <th className="py-3.5 px-4">Customer File</th>
                  <th className="py-3.5 px-4">Date Placed</th>
                  <th className="py-3.5 px-4 text-right">Total Payable</th>
                  <th className="py-3.5 px-4 text-center">Fulfillment Status</th>
                  <th className="py-3.5 px-4 text-center">Invoicing Status</th>
                  <th className="py-3.5 px-4 text-center">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map(order => {
                  const customer = customers.find(c => c.customerId === order.customerId);
                  return (
                    <tr key={order.orderId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 font-semibold text-slate-900 font-mono text-xs">{order.orderRefNo}</td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-800">{customer?.customerName || "Walk-In buyer"}</div>
                        <div className="text-[11px] text-slate-400">{customer?.contact}</div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-slate-500">
                        {new Date(order.orderDate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-slate-900">
                        ₱{order.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          order.status === OrderStatus.Delivered ? "bg-emerald-50 text-emerald-700" :
                          order.status === OrderStatus.Dispatched ? "bg-blue-50 text-blue-700" :
                          order.status === OrderStatus.Confirmed ? "bg-purple-150 text-purple-700" :
                          order.status === OrderStatus.Cancelled ? "bg-rose-50 text-rose-700 text-slate-400" :
                          "bg-amber-50 text-amber-700"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            order.status === OrderStatus.Delivered ? "bg-emerald-500" :
                            order.status === OrderStatus.Dispatched ? "bg-blue-500" :
                            order.status === OrderStatus.Confirmed ? "bg-purple-500" :
                            order.status === OrderStatus.Cancelled ? "bg-rose-450" :
                            "bg-amber-500"
                          }`} />
                          {order.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <div className="flex justify-center items-center gap-1">
                          <select
                            value={order.paymentStatus}
                            onChange={(e) => handleTogglePayment(order.orderId, e.target.value as PaymentStatus)}
                            className={`text-xs font-semibold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                              order.paymentStatus === PaymentStatus.Paid ? "bg-teal-50 text-teal-700 border-teal-200" :
                              order.paymentStatus === PaymentStatus.Partial ? "bg-orange-50 text-orange-700 border-orange-200" :
                              "bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            <option value={PaymentStatus.Unpaid}>Unpaid</option>
                            <option value={PaymentStatus.Partial}>Partial</option>
                            <option value={PaymentStatus.Paid}>Paid</option>
                          </select>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          {/* Invoice Review Shortcut */}
                          <button
                            onClick={() => setSelectedInvoiceOrder(order)}
                            className="p-1 py-1 px-2.5 rounded-lg border border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                            title="Generate and Print Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Invoice</span>
                          </button>

                          {/* Trigger state changes */}
                          {order.status !== OrderStatus.Delivered && order.status !== OrderStatus.Cancelled && (
                            <div className="relative group">
                              <button className="p-1 px-2.5 rounded-lg border border-indigo-600 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all text-xs font-semibold inline-flex items-center gap-1 cursor-pointer">
                                <span>Transition</span>
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              <div className="absolute right-0 bottom-full pb-2 w-36 hidden group-hover:block z-20">
                                <div className="bg-white border border-slate-200 rounded-lg shadow-xl py-1">
                                  {order.status === OrderStatus.Pending && (
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order.orderId, OrderStatus.Confirmed)}
                                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer"
                                    >
                                      Confirm Order
                                    </button>
                                  )}
                                  {(order.status === OrderStatus.Pending || order.status === OrderStatus.Confirmed) && (
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order.orderId, OrderStatus.Dispatched)}
                                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer"
                                    >
                                      Dispatch (Transit)
                                    </button>
                                  )}
                                  {order.status === OrderStatus.Dispatched && (
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order.orderId, OrderStatus.Delivered)}
                                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer text-emerald-600"
                                    >
                                      Delivered (Fulfill)
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.orderId, OrderStatus.Cancelled)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-slate-50 cursor-pointer border-t border-slate-100"
                                  >
                                    Cancel Order
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Delete Order with Inline Confirmation */}
                          {deleteConfirmId === order.orderId ? (
                            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-lg p-1 animate-pulse">
                              <button
                                onClick={() => handleDeleteOrder(order.orderId)}
                                className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] transition-all cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-350 text-slate-700 font-bold text-[10px] transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setDeleteConfirmId(order.orderId);
                              }}
                              className="p-1 px-1.5 py-1 px-2.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-all text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              title="Delete Order (To prevent database full)"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm animate-fadeIn">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">Live Database Table: INVOICES</span>
              <p className="text-xs text-slate-400 mt-1 font-mono">Synced Schema: INVOICE(InvoiceID, OrderID, InvoiceDate, TotalAmount, PaymentStatus)</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold flex items-center gap-1.5 border border-emerald-100">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              Live Synced
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm text-slate-750">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-xs font-bold border-b border-slate-100 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Invoice ID</th>
                  <th className="py-3.5 px-6">Order ID Reference</th>
                  <th className="py-3.5 px-6">Invoice Date</th>
                  <th className="py-3.5 px-6 text-right">Total Amount Due</th>
                  <th className="py-3.5 px-6 text-center">Payment Status</th>
                  <th className="py-3.5 px-6 text-center">Due Date</th>
                  <th className="py-3.5 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {LocalDB.getInvoices().length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-semibold">No Invoice Data Found</p>
                      <p className="text-xs mt-1">Invoice records are populated in real-time when orders are placed.</p>
                    </td>
                  </tr>
                ) : (
                  LocalDB.getInvoices().map((inv) => {
                    const linkedOrder = orders.find(o => o.orderId === inv.orderId);
                    return (
                      <tr key={inv.invoiceId} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6 font-mono font-medium text-slate-900">{inv.invoiceId}</td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-indigo-600">{inv.orderId}</span>
                            {linkedOrder && (
                              <span className="text-xs text-slate-400 font-mono italic">({linkedOrder.orderRefNo})</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 font-mono text-slate-600">
                          {inv.invoiceDate || "N/A"}
                        </td>
                        <td className="py-4 px-6 text-right font-mono font-bold text-slate-900">
                          ₱{Number(inv.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                            inv.paymentStatus === PaymentStatus.Paid
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : inv.paymentStatus === PaymentStatus.Partial
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}>
                            {inv.paymentStatus}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center font-mono text-rose-500 font-medium">
                          {inv.dueDate || "N/A"}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {linkedOrder ? (
                            <button
                              onClick={() => setSelectedInvoiceOrder(linkedOrder)}
                              className="p-1 px-3.5 py-1.5 rounded-xl border border-indigo-100 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                              title="Print and preview invoice"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>View Invoice PDF</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Order not found</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Generator printable sheet modal */}
      <AnimatePresence>
        {selectedInvoiceOrder && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100"
            >
              {/* Controls bar */}
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <span className="font-semibold text-sm">Official Billing Receipt Invoice</span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={downloadPDFInvoice}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                  <button 
                    onClick={() => setSelectedInvoiceOrder(null)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Invoice Printable Body */}
              <div className="p-6 overflow-y-auto bg-[#f9a4a4] text-slate-900 border-t border-b border-rose-300 print:bg-white print:text-black">
                
                {/* Physical receipt book look with pink color and black typewriter-style borders */}
                <div className="relative font-serif max-w-2xl mx-auto p-4 md:p-6 bg-[#fca3a3] border-4 border-double border-[#8b3535] rounded-xl shadow-inner space-y-4 print:border-none print:shadow-none print:bg-white">
                  
                  {/* Subtle cartoon watermarked logo inside sheet */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.06] pointer-events-none select-none">
                    <img src={drabbitLogo} alt="Watermark Rabbit" className="w-80 h-80 object-contain mix-blend-multiply" />
                  </div>

                  {/* Header containing rabbit logo, name and official title */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-3 border-b-2 border-dashed border-[#8b3535] relative">
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-16 bg-white rounded-xl flex items-center justify-center border border-rose-300 overflow-hidden shrink-0 shadow-sm">
                        <img 
                          src={drabbitLogo} 
                          alt="Drabbit Logo" 
                          className="h-full w-full object-contain mix-blend-multiply"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <h1 className="text-xl font-extrabold tracking-tight text-slate-950 font-sans leading-none">DRABBIT MARKETING</h1>
                        <p className="text-[10px] font-mono font-bold text-slate-800 uppercase tracking-widest mt-1">Supply & Distribution Center</p>
                        <p className="text-[9px] text-slate-800 tracking-tight">KM. 10 Sasa, Davao City, Philippines</p>
                        <p className="text-[9px] text-slate-800 tracking-tight font-mono">VAT Reg. TIN: 168-925-306-00000</p>
                      </div>
                    </div>
                    <div className="text-right mt-3 md:mt-0 md:self-end">
                      <h2 className="text-xl font-black text-[#a61c1c] tracking-widest font-sans underline decoration-double">CHARGE INVOICE</h2>
                      <p className="text-sm font-mono font-black text-[#dc2626] mt-1 bg-white/60 px-2 py-0.5 rounded border border-[#8b3535]/30 inline-block">
                        No. {selectedInvoiceOrder.orderRefNo.replace(/\D/g, "") ? selectedInvoiceOrder.orderRefNo.replace(/\D/g, "") : "4574"}
                      </p>
                    </div>
                  </div>

                  {/* Customer Information Sheet details shaped like physical lined blanks */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-y-2 gap-x-4 text-xs font-serif text-slate-900 border-b border-[#8b3535] pb-3">
                    
                    <div className="md:col-span-8 flex items-baseline">
                      <span className="font-bold text-slate-950 uppercase text-[10px] shrink-0 mr-1.5 font-mono">CHARGED to:</span>
                      <span className="border-b border-[#8b3535] border-dotted flex-1 px-2 font-bold text-slate-950 font-sans">
                        {customers.find(c => c.customerId === selectedInvoiceOrder.customerId)?.customerName || "Walk-In buyer"}
                      </span>
                    </div>
                    
                    <div className="md:col-span-4 flex items-baseline">
                      <span className="font-bold text-slate-950 uppercase text-[10px] shrink-0 mr-1.5 font-mono">Date:</span>
                      <span className="border-b border-[#8b3535] border-dotted flex-1 px-2 font-mono font-semibold">
                        {new Date(selectedInvoiceOrder.orderDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }).toUpperCase()}
                      </span>
                    </div>

                    <div className="md:col-span-8 flex items-baseline">
                      <span className="font-bold text-slate-950 uppercase text-[10px] shrink-0 mr-1.5 font-mono">Address:</span>
                      <span className="border-b border-[#8b3535] border-dotted flex-1 px-2 font-sans overflow-hidden text-ellipsis whitespace-nowrap">
                        {customers.find(c => c.customerId === selectedInvoiceOrder.customerId)?.address || "Davao City Local Customer"}
                      </span>
                    </div>

                    <div className="md:col-span-4 flex items-baseline">
                      <span className="font-bold text-slate-950 uppercase text-[10px] shrink-0 mr-1.5 font-mono">Terms:</span>
                      <span className="border-b border-[#8b3535] border-dotted flex-1 px-2 font-mono font-bold">
                        30 DAYS
                      </span>
                    </div>

                    <div className="md:col-span-4 flex items-baseline">
                      <span className="font-bold text-slate-950 uppercase text-[10px] shrink-0 mr-1.5 font-mono">TIN:</span>
                      <span className="border-b border-[#8b3535] border-dotted flex-1 px-2 font-mono">
                        {customers.find(c => c.customerId === selectedInvoiceOrder.customerId)?.tin || "000-000-000-000"}
                      </span>
                    </div>

                    <div className="md:col-span-5 flex items-baseline">
                      <span className="font-bold text-slate-950 uppercase text-[10px] shrink-0 mr-1.5 font-mono">Business Style:</span>
                      <span className="border-b border-[#8b3535] border-dotted flex-1 px-2">
                        {customers.find(c => c.customerId === selectedInvoiceOrder.customerId)?.customerName?.toUpperCase().includes("HOTEL") ? "HOTEL" : "RETAILER"}
                      </span>
                    </div>

                    <div className="md:col-span-3 flex items-baseline">
                      <span className="font-bold text-slate-950 uppercase text-[10px] shrink-0 mr-1.5 font-mono">P.O. No.:</span>
                      <span className="border-b border-[#8b3535] border-dotted flex-1 px-2 font-mono">
                        N/A
                      </span>
                    </div>
                  </div>

                  {/* Main physical grid bill table */}
                  <div className="border border-slate-950 overflow-hidden bg-rose-50/50">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#e28a8a] text-slate-950 font-bold border-b border-slate-950 font-mono text-[9px] uppercase tracking-wider">
                          <th className="py-1.5 px-2 border-r border-slate-950 text-center w-14">Quantity</th>
                          <th className="py-1.5 px-2 border-r border-slate-950 text-center w-14">Unit</th>
                          <th className="py-1.5 px-3 border-r border-slate-950">Description</th>
                          <th className="py-1.5 px-3 border-r border-slate-950 text-right w-24">Unit Price</th>
                          <th className="py-1.5 px-3 text-right w-28">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Render active items */}
                        {selectedInvoiceOrder.items.map((item, idx) => {
                          const prod = products.find(p => p.productId === item.productId);
                          const isClingWrap = prod?.productName?.toLowerCase().includes("cling") || prod?.productName?.toLowerCase().includes("wrap");
                          const unitStr = isClingWrap ? "ROLL" : "PCS";
                          return (
                            <tr key={idx} className="border-b border-slate-950 font-sans text-[11px] text-slate-950">
                              <td className="py-2.5 px-2 border-r border-slate-950 text-center font-mono font-bold">{item.quantity}</td>
                              <td className="py-2.5 px-2 border-r border-slate-950 text-center font-mono">{unitStr}</td>
                              <td className="py-2.5 px-3 border-r border-slate-950 font-semibold">{prod?.productName || "Packaging Item"}</td>
                              <td className="py-2.5 px-3 border-r border-slate-950 text-right font-mono">₱{item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold">₱{(item.quantity * item.unitPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        })}
                        {/* Pad with empty table rows to fill typical receipt paper height (Total: 8 rows) */}
                        {Array.from({ length: Math.max(0, 8 - selectedInvoiceOrder.items.length) }).map((_, idx) => (
                          <tr key={`empty-${idx}`} className="border-b border-slate-950 h-7">
                            <td className="border-r border-slate-950"></td>
                            <td className="border-r border-slate-950"></td>
                            <td className="border-r border-slate-950"></td>
                            <td className="border-r border-slate-950"></td>
                            <td></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary & Tax break-ups block */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    
                    {/* Left Hand Grid: VAT summary box & Remarks */}
                    <div className="space-y-4">
                      <div className="border border-slate-950 rounded bg-rose-50/50 text-xs p-3 md:p-4 leading-relaxed">
                        <table className="w-full font-mono">
                          <thead>
                            <tr className="border-b border-slate-950 text-[10px] md:text-xs uppercase">
                              <th className="pb-1.5 text-left font-black">Tax Details</th>
                              <th className="pb-1.5 text-right font-black">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="py-1">Vatable Sales</td>
                              <td className="text-right font-bold">₱{(selectedInvoiceOrder.totalAmount / 1.12).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <td className="py-1">VAT-Exempt Sales</td>
                              <td className="text-right font-bold">—</td>
                            </tr>
                            <tr>
                              <td className="py-1">Zero Rated Sales</td>
                              <td className="text-right font-bold">—</td>
                            </tr>
                            <tr className="border-t border-slate-950/40">
                              <td className="pt-2 font-bold">VAT Amount</td>
                              <td className="pt-2 text-right font-black">₱{((selectedInvoiceOrder.totalAmount / 1.12) * 0.12).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="border border-slate-950 p-3 md:p-4 font-mono min-h-[110px] relative bg-rose-50/50 text-xs">
                        <span className="font-bold underline text-[10px] tracking-wide block uppercase text-slate-800">REMARKS:</span>
                        <div className="mt-1.5 text-xs select-none italic text-slate-800 leading-normal">
                          {selectedInvoiceOrder.paymentStatus === PaymentStatus.Paid ? "PAYMENT SECURED IN FULL — THANK YOU FOR YOUR BUSINESS." : "TERMS: 30 DAYS DISPATCHED LOGISTICS CARRIER CORRESPONDENCE."}
                        </div>
                        <div className="absolute bottom-1 right-2 text-[9px] text-slate-800">
                          Sr. Citizen TIN / PWD ID: ______________
                        </div>
                      </div>
                    </div>

                    {/* Right Hand Grid: Total summary list & Authorized signature banner */}
                    <div className="space-y-4">
                      <div className="border border-slate-950 bg-rose-50/50 p-3.5 md:p-4.5 leading-relaxed text-xs md:text-sm font-mono text-slate-900">
                        <div className="flex justify-between font-mono py-0.5">
                          <span>Total Sales (VAT Inc.)</span>
                          <span className="font-bold">₱{selectedInvoiceOrder.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between font-mono text-[10px] md:text-xs text-slate-700 py-0.5">
                          <span>Less: VAT (12%)</span>
                          <span>-₱{((selectedInvoiceOrder.totalAmount / 1.12) * 0.12).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between font-mono text-[10px] md:text-xs text-slate-700 py-0.5">
                          <span>Amount Net of VAT</span>
                          <span>₱{(selectedInvoiceOrder.totalAmount / 1.12).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between font-mono text-[10px] md:text-xs text-slate-650 py-0.5">
                          <span>Less: SC/PWD Discount</span>
                          <span>—</span>
                        </div>
                        <div className="flex justify-between font-bold border-t border-dashed border-slate-950/40 my-1 pt-1.5 pb-0.5">
                          <span>Amount Due</span>
                          <span>₱{selectedInvoiceOrder.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between border-t-2 border-slate-950 pt-1.5 text-sm md:text-base font-black text-[#a61c1c]">
                          <span>TOTAL AMOUNT DUE</span>
                          <span className="underline decoration-double">₱{selectedInvoiceOrder.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      {/* Official Signature Acceptance Oval Frame */}
                      <div className="border border-slate-950 p-3 rounded-lg bg-rose-50/50 flex flex-col justify-between items-center text-center min-h-[110px] relative">
                        <div className="text-[10px] leading-tight font-sans text-slate-900 uppercase">
                          Received the above mentioned GOODS in good order and condition.
                        </div>
                        <div className="w-11/12 border-b border-slate-950 border-solid mt-6 min-h-[1.5rem]">
                          {/* Blank line for manual customer/receiver signature */}
                        </div>
                        <div className="text-[10px] font-bold text-slate-900 mt-1 uppercase">
                          Authorized Representative
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Footnotes booklet metadata */}
                  <div className="flex flex-col md:flex-row justify-between pt-3 border-t-2 border-dashed border-[#8b3535] text-[7.5px] text-slate-800 font-mono tracking-tighter leading-tight mt-1">
                    <div className="space-y-0.5">
                      <p>50 Bklts (3x) 2701-3200 — BIR Authority to Print No. 132AU20220000008286</p>
                      <p>Date issued: 10/13/2022 — POJE PRINTING PRESS — Km. 10 Sasa, Davao City</p>
                      <p>TIN: 168-925-306-00000</p>
                    </div>
                    <div className="text-right space-y-0.5 mt-1 md:mt-0">
                      <p>Printer's Accreditation No.: 132MP20180000000014</p>
                      <p>Date Issued: 8/1/2018 — Expiry Date: 8/1/2023</p>
                    </div>
                  </div>

                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Slide overlay for Creating a New Order (Checkouts Basket) */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="bg-white tracking-normal h-full w-full max-w-xl shadow-2xl flex flex-col border-l border-slate-100"
            >
              {/* Form head controls */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-55">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-slate-900 text-base">Point of Sale Ordering Checkout</h3>
                  <p className="text-xs text-slate-400">Autogenerates invoice records dynamically</p>
                </div>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form panel body */}
              <form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {formError && (
                  <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs text-rose-700 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Select Customer */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Select Customer Profile</label>
                  <select
                    value={formCustomerId}
                    onChange={(e) => setFormCustomerId(e.target.value)}
                    required
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 text-sm transition-all"
                  >
                    <option value="">-- Choose registered customer file --</option>
                    {customers.map(c => (
                      <option key={c.customerId} value={c.customerId}>
                        {c.customerName} ({c.contact})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Interactive Basket Selector */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <label className="block text-xs font-bold text-slate-510 uppercase tracking-wider">Purchase Basket Items</label>
                    <button
                      type="button"
                      onClick={handleAddFormItem}
                      className="text-indigo-650 hover:text-indigo-500 flex items-center gap-1 text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Line Product
                    </button>
                  </div>

                  {formItems.map((item, index) => {
                    const selectedProd = products.find(p => p.productId === item.productId);
                    const linePriceSum = selectedProd ? selectedProd.unitPrice * item.quantity : 0;
                    
                    return (
                      <div key={index} className="flex items-start gap-3 p-3 border border-slate-100 rounded-xl bg-slate-50 bg-opacity-30 relative group">
                        
                        {/* Select product */}
                        <div className="flex-1 space-y-1">
                          <select
                            value={item.productId}
                            onChange={(e) => handleItemChange(index, "productId", e.target.value)}
                            required
                            className="block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 text-xs transition-all"
                          >
                            <option value="">-- Select Product item --</option>
                            {products.map(p => (
                              <option key={p.productId} value={p.productId}>
                                {p.productName} (₱{p.unitPrice.toFixed(2)} / Stock: {p.stockQuantity})
                              </option>
                            ))}
                          </select>
                          
                          {selectedProd && selectedProd.stockQuantity <= selectedProd.reorderThreshold && (
                            <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1 mt-1">
                              <AlertTriangle className="w-3 h-3" />
                              Low Stock Warning! Threshold is {selectedProd.reorderThreshold}
                            </span>
                          )}
                        </div>

                        {/* Quantity input */}
                        <div className="w-20">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                            required
                            placeholder="Qty"
                            className="block w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 text-xs text-xs"
                          />
                        </div>

                        {/* Calc Price indicator */}
                        <div className="w-24 text-right pt-2 font-semibold text-xs text-slate-800 font-mono">
                          ₱{linePriceSum.toFixed(2)}
                        </div>

                        {/* Remove item row */}
                        {formItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFormItem(index)}
                            className="p-1 px-1.5 mt-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Predeclared payment details */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-510 uppercase tracking-wider">Initial Payment Status</label>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.values(PaymentStatus).map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setFormPaymentStatus(status)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold cursor-pointer border text-center transition-all ${
                          formPaymentStatus === status ? 
                          "bg-indigo-600 border-indigo-600 text-white shadow-sm" :
                          "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Total summary Box */}
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100/50 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-indigo-700 font-semibold block uppercase tracking-wider">Estimated Total Due</span>
                    <span className="text-xs text-indigo-400">Payment term: Net 7 Days</span>
                  </div>
                  <div className="text-xl font-black text-indigo-950 font-mono">
                    ₱{calculateFormTotal().toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pt-4 flex items-center gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 cursor-pointer text-white font-semibold text-sm py-3 rounded-xl text-center transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <FileCheck className="w-5 h-5" />
                    Complete Order & Issue Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 cursor-pointer text-slate-750 font-semibold text-sm rounded-xl text-center transition-all"
                  >
                    Back
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
