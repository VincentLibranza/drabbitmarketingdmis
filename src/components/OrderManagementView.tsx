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
import { Order, OrderStatus, PaymentStatus, Product, Customer, OrderItem } from "../types";
import { LocalDB } from "../services/db";
import { jsPDF } from "jspdf";

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
              <div className="p-8 overflow-y-auto space-y-6 text-slate-700 print:text-black">
                
                {/* Header coordinates */}
                <div className="flex justify-between items-start pb-6 border-b border-slate-200">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-950 font-sans">DRABBIT MARKETING</h1>
                    <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider font-mono">SUPPLY & DISTRIBUTION CENTER</p>
                    <p className="text-xs text-slate-400 mt-1.5">Plainview Village KM.10 Sasa, Davao City</p>
                    <p className="text-xs text-slate-405">Proprietor: Rufino N. Libranza Jr.</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg font-bold text-slate-900">INVOICE</h2>
                    <p className="text-xs font-mono font-medium text-slate-500 mt-1">Ref: {selectedInvoiceOrder.orderRefNo}</p>
                    <div className="mt-3 inline-block px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700">
                      Payment Status: {selectedInvoiceOrder.paymentStatus}
                    </div>
                  </div>
                </div>

                {/* Bill To & Bill details info panel */}
                <div className="grid grid-cols-2 gap-6 text-xs">
                  <div>
                    <p className="text-slate-400 uppercase tracking-wider font-semibold text-[10px]">BILLED CLIENT</p>
                    <div className="mt-2 text-slate-900 font-bold text-sm">
                      {customers.find(c => c.customerId === selectedInvoiceOrder.customerId)?.customerName || "Walk-In buyer"}
                    </div>
                    <p className="mt-1 text-slate-500">
                      Address: {customers.find(c => c.customerId === selectedInvoiceOrder.customerId)?.address || "Davao City Local Customer"}
                    </p>
                    <p className="mt-0.5 text-slate-400">
                      Phone: {customers.find(c => c.customerId === selectedInvoiceOrder.customerId)?.contact || "N/A"}
                    </p>
                    {customers.find(c => c.customerId === selectedInvoiceOrder.customerId)?.tin && (
                      <p className="mt-1 text-emerald-800 font-mono text-[10px] bg-emerald-50/50 border border-emerald-100/50 rounded px-1.5 py-0.5 inline-block">
                        TIN: <strong className="font-bold text-slate-900">{customers.find(c => c.customerId === selectedInvoiceOrder.customerId)?.tin}</strong>
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 uppercase tracking-wider font-semibold text-[10px]">TRANSACTION DETAILS</p>
                    <p className="mt-2 text-slate-900">
                      Date Issued: <strong className="font-semibold font-mono">{new Date(selectedInvoiceOrder.orderDate).toLocaleDateString()}</strong>
                    </p>
                    <p className="mt-1 text-slate-900">
                      Due Date: <strong className="font-semibold font-mono text-rose-500">{selectedInvoiceOrder.dueDate}</strong>
                    </p>
                    <p className="mt-1 text-slate-900">
                      Logistics Mode: <strong className="font-semibold">{selectedInvoiceOrder.status}</strong>
                    </p>
                  </div>
                </div>

                {/* Line Items bill table */}
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-bold border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Product Description</th>
                      <th className="py-2.5 px-3 text-center">Qty Purchased</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoiceOrder.items.map((item, idx) => {
                      const prod = products.find(p => p.productId === item.productId);
                      return (
                        <tr key={idx}>
                          <td className="py-3 px-3 font-medium text-slate-900">{prod?.productName || "Packaging Item"}</td>
                          <td className="py-3 px-3 text-center font-mono">{item.quantity} units</td>
                          <td className="py-3 px-3 text-right font-mono">₱{item.unitPrice.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right font-bold font-mono text-slate-950">₱{(item.quantity * item.unitPrice).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Total box block */}
                <div className="pt-4 border-t border-slate-250 flex flex-col items-end spacing-y-1.5 text-xs">
                  <div className="flex justify-between w-64 text-slate-500">
                    <span>Vatable Sales</span>
                    <span className="font-mono">₱{(selectedInvoiceOrder.totalAmount / 1.12).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between w-64 text-slate-500 mt-1">
                    <span>Value Added Tax (12% VAT)</span>
                    <span className="font-mono">₱{((selectedInvoiceOrder.totalAmount / 1.12) * 0.12).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between w-64 text-slate-900 font-bold text-base border-t border-slate-200 mt-2 pt-2">
                    <span>TOTAL PAYABLE</span>
                    <span className="font-mono text-indigo-600">₱{selectedInvoiceOrder.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="pt-8 border-t border-slate-100 text-center text-[10px] text-slate-400 space-y-1 mt-6">
                  <p>Thank you for buying packaging supplies from Drabbit Marketing!</p>
                  <p>Invoices are automatically generated by the Drabbit DMIS server.</p>
                  <p className="font-mono">Plainview Village KM.10 Sasa, Davao City, Philippines</p>
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
