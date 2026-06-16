/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  TrendingUp, 
  ShoppingBag, 
  AlertTriangle, 
  MessageSquare, 
  CheckCircle2, 
  Package, 
  HelpCircle,
  Truck,
  ArrowUpRight,
  Sparkles,
  Database,
  RefreshCw,
  Plus
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  Cell
} from "recharts";
import { 
  Product, 
  Order, 
  Complaint, 
  OrderStatus, 
  PaymentStatus, 
  Customer, 
  Delivery, 
  DeliveryStatus, 
  ComplaintStatus 
} from "../types";
import { LocalDB } from "../db";

interface DashboardViewProps {
  products: Product[];
  orders: Order[];
  complaints: Complaint[];
  currentUser: { username: string; name: string };
  onRefreshData: () => void;
}

export default function DashboardView({ 
  products, 
  orders, 
  complaints, 
  currentUser,
  onRefreshData
}: DashboardViewProps) {
  
  const [restockAmount, setRestockAmount] = useState<{ [id: string]: number }>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulation suite state
  const [genType, setGenType] = useState<string>("orders");
  const [genCount, setGenCount] = useState<number>(5);
  const [generating, setGenerating] = useState<boolean>(false);
  const [lastGeneratedNotes, setLastGeneratedNotes] = useState<string[]>([]);

  // 1. Calculations
  const totalRevenue = orders
    .filter(o => o.status !== OrderStatus.Cancelled)
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const pendingOrdersCount = orders.filter(o => o.status === OrderStatus.Pending).length;
  const dispatchingOrdersCount = orders.filter(o => o.status === OrderStatus.Dispatched).length;
  const lowStockItems = products.filter(p => p.stockQuantity <= p.reorderThreshold);
  const openComplaintsCount = complaints.filter(c => c.status !== "Resolved").length;

  // 2. Chart Data 1: Sales trends over time (from orders list)
  const sortedOrdersByDate = [...orders].sort((a,b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime());
  const salesHistoryMap: { [date: string]: number } = {};
  
  sortedOrdersByDate.forEach(order => {
    if (order.status !== OrderStatus.Cancelled) {
      const dateStr = new Date(order.orderDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      salesHistoryMap[dateStr] = (salesHistoryMap[dateStr] || 0) + order.totalAmount;
    }
  });

  const salesTrendData = Object.keys(salesHistoryMap).map(date => ({
    date,
    Amount: salesHistoryMap[date]
  }));

  // Chart Data fallback if empty
  const finalSalesTrendData = salesTrendData.length > 0 ? salesTrendData : [
    { date: "June 10", Amount: 2450 },
    { date: "June 11", Amount: 1550 },
    { date: "June 12", Amount: 3200 },
    { date: "June 13", Amount: 2470 },
    { date: "June 14", Amount: 4100 },
    { date: "June 15", Amount: 495 }
  ];

  // 3. Chart Data 2: Inventory Stock Level vs Reorder Threshold
  const stockChartData = products.map(p => ({
    name: p.productName.slice(0, 16) + "...",
    Stock: p.stockQuantity,
    Threshold: p.reorderThreshold
  }));

  // Handle Quick Restock action
  const handleQuickRestock = (productId: string) => {
    const amount = restockAmount[productId] || 50;
    const currentProducts = LocalDB.getProducts();
    const updatedProducts = currentProducts.map(p => {
      if (p.productId === productId) {
        const newQty = p.stockQuantity + amount;
        LocalDB.appendLog(
          currentUser.username, 
          `Quick restocked item ${p.productName} by +${amount} (New qty: ${newQty})`, 
          "PRODUCT"
        );
        return { ...p, stockQuantity: newQty };
      }
      return p;
    });
    LocalDB.setProducts(updatedProducts);
    setSuccessMsg("Stock successfully replenished!");
    setTimeout(() => setSuccessMsg(null), 3000);
    onRefreshData();
  };

  // Generate Simulation Values Logic
  const handleGenerateValues = () => {
    setGenerating(true);
    setLastGeneratedNotes([]);

    setTimeout(() => {
      const notes: string[] = [];
      const now = new Date();

      if (genType === "customers") {
        const davaoNames = [
          "Matina Food Plaza", "Lanang Bakers Guild", "Bajada Retail Express", 
          "Toril Commercial Sea", "Agdao Wetmarket Vendor Assoc", "Magsaysay Fruit Stand", 
          "MMCM Student Lounge Canteen", "Calinan Veggie Wholesaler", "Damosa Techno Bistro", 
          "Sandawa General Store", "Buhangin Packaging House", "Ma-a Feed Mill Supplies"
        ];
        const suburbs = ["Matina", "Lanang", "Bajada", "Toril", "Agdao", "Magsaysay", "Calinan", "Damosa", "Buhangin", "Ma-a"];
        const streets = ["McArthur Highway", "J.P. Laurel Ave", "F. Torres St", "Daliao Road", "Leon Garcia St", "Ramon Magsaysay Ave", "Bypass Road"];

        const currentCusts = LocalDB.getCustomers();
        const newCusts = [...currentCusts];

        for (let i = 0; i < genCount; i++) {
          const name = davaoNames[Math.floor(Math.random() * davaoNames.length)] + " " + (Math.floor(Math.random() * 900) + 100);
          const suburb = suburbs[Math.floor(Math.random() * suburbs.length)];
          const street = streets[Math.floor(Math.random() * streets.length)];
          const address = `${Math.floor(Math.random() * 150) + 1}, ${street}, ${suburb}, Davao City`;
          const prefix = name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 10);
          const email = `${prefix}@davaosupplies.ph`;
          const contact = `+63 9${Math.floor(Math.random() * 99) + 10} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`;
          const tin = `${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-000`;
          const customerId = `CST-${Math.floor(Math.random() * 9000) + 1000}`;

          const newObj: Customer = {
            customerId,
            customerName: name,
            contact,
            address,
            email,
            tin
          };
          newCusts.push(newObj);
          notes.push(`Registered Customer: "${name}" (${customerId})`);
        }

        LocalDB.setCustomers(newCusts);
        LocalDB.appendLog(currentUser.username, `Auto-generated ${genCount} wholesale customer records via Simulation Suite`, "CUSTOMER");

      } else if (genType === "products") {
        const packagingGoods = [
          { name: "HDPE Sando Bags (Large - 50pcs)", category: "Plastic Bags", price: 60 },
          { name: "Degradable Cling Film (40cm x 150m)", category: "Cling Wrap", price: 210 },
          { name: "Eco Kraft Soup Cup (250ml - 25pcs)", category: "Eco-Packaging", price: 115 },
          { name: "Heavy Duty Green Garden Bags (10pcs)", category: "Trash Bags", price: 95 },
          { name: "Bento Box 2-Compartment (50pcs)", category: "Plastic Containers", price: 140 },
          { name: "Pre-cut Premium Aluminum Sheet Rolls", category: "Aluminum Foil", price: 245 },
          { name: "Clear PET Cup Flat Lids (100pcs)", category: "Plastic Cups", price: 55 },
          { name: "Microwavable Food Round Tub (750ml)", category: "Plastic Containers", price: 85 }
        ];

        const currentPrds = LocalDB.getProducts();
        const newPrds = [...currentPrds];

        for (let i = 0; i < genCount; i++) {
          const item = packagingGoods[Math.floor(Math.random() * packagingGoods.length)];
          const productId = `PRD-${Math.floor(Math.random() * 900) + 100}`;
          const nameWithCode = `${item.name} v${Math.floor(Math.random() * 9) + 2}`;
          const stock = Math.floor(Math.random() * 300) + 10;
          const threshold = Math.floor(Math.random() * 40) + 15;

          const newObj: Product = {
            productId,
            productName: nameWithCode,
            category: item.category,
            unitPrice: item.price,
            stockQuantity: stock,
            reorderThreshold: threshold
          };
          newPrds.push(newObj);
          notes.push(`Added Product: "${nameWithCode}" (${productId}) Price: ₱${item.price}`);
        }

        LocalDB.setProducts(newPrds);
        LocalDB.appendLog(currentUser.username, `Auto-generated ${genCount} packaging product inventory categories`, "PRODUCT");

      } else if (genType === "orders") {
        const currentCusts = LocalDB.getCustomers();
        const currentPrds = LocalDB.getProducts();

        if (currentCusts.length === 0 || currentPrds.length === 0) {
          notes.push("Error: Please seed/register at least 1 customer and 1 product first!");
        } else {
          const currentOrders = LocalDB.getOrders();
          const currentDeliveries = LocalDB.getDeliveries();
          
          const newOrders = [...currentOrders];
          const newDeliveries = [...currentDeliveries];

          const orderStatuses = [OrderStatus.Pending, OrderStatus.Confirmed, OrderStatus.Dispatched, OrderStatus.Delivered];
          const paymentStatuses = [PaymentStatus.Unpaid, PaymentStatus.Paid, PaymentStatus.Partial];
          const drivers = ["Benny Santos (Truck A)", "Jun-Jun Alcantara (Multi-cab B)", "Danny Boy (Truck C)", "Mark Anthony (Van D)"];

          for (let i = 0; i < genCount; i++) {
            const customer = currentCusts[Math.floor(Math.random() * currentCusts.length)];
            const orderId = `ORD-${Math.floor(Math.random() * 90000) + 10000}`;
            const orderRefNo = `DMIS-ORD-${newOrders.length + 1002}`;
            
            const daysAgo = Math.floor(Math.random() * 10);
            const orderDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

            const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
            const paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];

            const itemCount = Math.floor(Math.random() * 2) + 1;
            const finalItems = [];
            let totalAmount = 0;

            const selectedProducts = [...currentPrds].sort(() => 0.5 - Math.random()).slice(0, itemCount);
            selectedProducts.forEach((p, idx) => {
              const qty = Math.floor(Math.random() * 5) + 2;
              finalItems.push({
                itemId: `ITEM-${orderId}-${idx}`,
                orderId,
                productId: p.productId,
                quantity: qty,
                unitPrice: p.unitPrice
              });
              totalAmount += p.unitPrice * qty;
            });

            const dueDate = new Date(Date.parse(orderDate) + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

            const newOrdObj: Order = {
              orderId,
              orderRefNo,
              customerId: customer.customerId,
              orderDate,
              status,
              paymentStatus,
              totalAmount,
              dueDate,
              items: finalItems
            };

            newOrders.unshift(newOrdObj);

            let deliveryStatus = DeliveryStatus.Pending;
            if (status === OrderStatus.Dispatched) deliveryStatus = DeliveryStatus.InTransit;
            if (status === OrderStatus.Delivered) deliveryStatus = DeliveryStatus.Delivered;

            const newDelObj: Delivery = {
              deliveryId: `DLV-${Math.floor(Math.random() * 9000) + 1000}`,
              orderId,
              scheduledDate: dueDate,
              deliveryDate: status === OrderStatus.Delivered ? dueDate + " 14:00" : undefined,
              status: deliveryStatus,
              assignedDriver: deliveryStatus !== DeliveryStatus.Pending ? drivers[Math.floor(Math.random() * drivers.length)] : "Unassigned - Click Schedule"
            };

            newDeliveries.push(newDelObj);
            notes.push(`Created Transaction: "${orderRefNo}" of ₱${totalAmount.toLocaleString()} for "${customer.customerName}"`);
          }

          LocalDB.setOrders(newOrders);
          LocalDB.setDeliveries(newDeliveries);
          LocalDB.appendLog(currentUser.username, `Auto-generated ${genCount} simulated wholesale transactions`, "ORDER");
        }

      } else if (genType === "complaints") {
        const currentCusts = LocalDB.getCustomers();
        const currentPrds = LocalDB.getProducts();

        if (currentCusts.length === 0 || currentPrds.length === 0) {
          notes.push("Error: Please seed/register at least 1 customer and 1 product first!");
        } else {
          const currentComplaints = LocalDB.getComplaints();
          const newComplaints = [...currentComplaints];

          const issues = [
            "Cardboard structural damage occurred during cargo handling.",
            "Moisture penetrated the seal, damaging the paper cup integrity.",
            "Wrong variant delivered (medium instead of large shopping bags).",
            "The quantity count of container boxes delivered was short by 3 bags.",
            "Delivery delayed by 6 hours; caused warehouse gridlock.",
            "Requested custom brand print had low-contrast colors vs design specs."
          ];
          const statuses = [ComplaintStatus.Open, ComplaintStatus.InProgress, ComplaintStatus.Resolved];
          const resolutions = [
            "Swapped damaged cartons with freshly verified safety units.",
            "Issued standard credit invoice note v09 to billing profile.",
            "Expedited standard replacement cargo via direct van courier same-day.",
            "Granted administrative discount discount of 15% on upcoming purchase."
          ];

          for (let i = 0; i < genCount; i++) {
            const customer = currentCusts[Math.floor(Math.random() * currentCusts.length)];
            const product = currentPrds[Math.floor(Math.random() * currentPrds.length)];
            const complaintId = `CMP-${Math.floor(Math.random() * 9000) + 1000}`;
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const resolution = status === ComplaintStatus.Resolved ? resolutions[Math.floor(Math.random() * resolutions.length)] : undefined;
            const daysAgo = Math.floor(Math.random() * 5);
            const dateLogged = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

            const newObj: Complaint = {
              complaintId,
              customerId: customer.customerId,
              productId: product.productId,
              description: issues[Math.floor(Math.random() * issues.length)],
              status,
              resolution,
              dateLogged
            };

            newComplaints.unshift(newObj);
            notes.push(`Logged Complaint: "${complaintId}" regarding "${product.productName}"`);
          }

          LocalDB.setComplaints(newComplaints);
          LocalDB.appendLog(currentUser.username, `Auto-generated ${genCount} wholesale support tickets`, "COMPLAINT");
        }
      }

      setLastGeneratedNotes(notes);
      setGenerating(false);
      onRefreshData();
    }, 800);
  };

  const handleGenerateEverything = () => {
    setGenerating(true);
    setLastGeneratedNotes([]);

    setTimeout(() => {
      // 1. Generate 3 Customers
      const davaoNames = ["Buhangin Bakery Hub", "Damosa Fish & Crabs", "Matina Mini-Mart", "Cabantian Cake Palace", "Lanang Meat Depot"];
      const currentCusts = LocalDB.getCustomers();
      const newCusts = [...currentCusts];
      const addedCusts = [];
      for (let i = 0; i < 3; i++) {
        const id = `CST-${Math.floor(Math.random() * 9000) + 1000}`;
        const name = davaoNames[i % davaoNames.length] + " (" + (Math.floor(Math.random() * 90) + 10) + ")";
        const newObj: Customer = {
          customerId: id,
          customerName: name,
          contact: `+63 919 443 ${1000 + i}`,
          address: `San Pedro St, Davao City`,
          email: `${name.toLowerCase().replace(/[^a-z]/g, "")}@davao.org`,
          tin: "112-223-334-000"
        };
        newCusts.push(newObj);
        addedCusts.push(newObj);
      }
      LocalDB.setCustomers(newCusts);

      // 2. Generate 3 Products
      const currentPrds = LocalDB.getProducts();
      const newPrds = [...currentPrds];
      const addedPrds = [];
      const extraPrds = [
        { name: "Heavy Duty Recycled Cups (50pcs)", cat: "Plastic Cups", pr: 50 },
        { name: "Eco Brown Paper Bowls (500ml - 10pcs)", cat: "Eco-Packaging", pr: 75 },
        { name: "Industrial Shrink Wrap Roll (Large)", cat: "Cling Wrap", pr: 310 }
      ];
      for (let i = 0; i < 3; i++) {
        const id = `PRD-${Math.floor(Math.random() * 900) + 100}`;
        const p = extraPrds[i];
        const newObj: Product = {
          productId: id,
          productName: p.name,
          category: p.cat,
          unitPrice: p.pr,
          stockQuantity: Math.floor(Math.random() * 150) + 50,
          reorderThreshold: 20
        };
        newPrds.push(newObj);
        addedPrds.push(newObj);
      }
      LocalDB.setProducts(newPrds);

      // 3. Generate 3 Orders & Deliveries
      const currentOrders = LocalDB.getOrders();
      const currentDeliveries = LocalDB.getDeliveries();
      const newOrders = [...currentOrders];
      const newDeliveries = [...currentDeliveries];

      for (let i = 0; i < 3; i++) {
        const cust = addedCusts[i % addedCusts.length];
        const prod = addedPrds[i % addedPrds.length];
        const orderId = `ORD-${Math.floor(Math.random() * 90000) + 10000}`;
        const refNo = `DMIS-ORD-${newOrders.length + 1002}`;
        const orderDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString();
        const qty = 5 + i * 2;
        const total = prod.unitPrice * qty;

        const newOrd: Order = {
          orderId,
          orderRefNo: refNo,
          customerId: cust.customerId,
          orderDate,
          status: OrderStatus.Confirmed,
          paymentStatus: PaymentStatus.Unpaid,
          totalAmount: total,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          items: [{
            itemId: `ITEM-${orderId}-0`,
            orderId,
            productId: prod.productId,
            quantity: qty,
            unitPrice: prod.unitPrice
          }]
        };
        newOrders.unshift(newOrd);

        const newDel: Delivery = {
          deliveryId: `DLV-${Math.floor(Math.random() * 9000) + 1000}`,
          orderId,
          scheduledDate: newOrd.dueDate,
          status: DeliveryStatus.Pending,
          assignedDriver: "Unassigned - Click Schedule"
        };
        newDeliveries.push(newDel);
      }

      LocalDB.setOrders(newOrders);
      LocalDB.setDeliveries(newDeliveries);
      LocalDB.appendLog(currentUser.username, "Instantly seeded a robust set of wholesale simulation values across all tables!", "SYSTEM");

      setLastGeneratedNotes([
        "Success: Generated 3 fresh Wholesale Customer Accounts",
        "Success: Seeded 3 fresh Catalog Products in warehouse stock",
        "Success: Recorded 3 fresh Customer Orders with matched Logistics workflows",
        "Values successfully dispatched live into the Turso Database!"
      ]);
      setGenerating(false);
      onRefreshData();
    }, 1000);
  };

  return (
    <div className="space-y-8">
      {/* Upper Welcomer */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center justify-center">
          <Sparkles className="w-64 h-64 text-indigo-200 rotate-12" />
        </div>
        <div className="space-y-1 z-10">
          <p className="text-indigo-400 text-xs font-semibold tracking-wider font-mono">DRABBIT MARKETING SYSTEM (DMIS)</p>
          <h1 className="text-2xl font-bold tracking-tight">Kumusta, {currentUser.name}!</h1>
          <p className="text-slate-300 text-sm">Welcome to your real-time administrative intelligence board.</p>
        </div>
        <div className="mt-4 md:mt-0 bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-center text-xs text-white min-w-[140px]">
          <span className="block text-slate-400 font-medium">Current Local Time</span>
          <span className="font-mono font-bold text-sm tracking-wide block">
            {currentTime.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            })}
          </span>
          <span className="font-mono text-[11px] text-indigo-300 font-bold block mt-0.5">
            {currentTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true
            })}
          </span>
        </div>
      </div>

      {/* Sasa Smart Simulation Suite & Values Generator */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
              <Database className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>Davao Central Hub - Sasa Simulation Suite</span>
            </div>
            <p className="text-xs text-slate-400">Generate fully customized, realistic business values or restore specifications</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleGenerateEverything}
              disabled={generating}
              className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer inline-flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Quick Seed Everything
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-bold text-slate-500 block">Select Data Dimension</label>
            <select
              value={genType}
              onChange={(e) => setGenType(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl py-2 px-3 focus:outline-indigo-500 bg-white"
            >
              <option value="orders">Orders & Logistics Deliveries</option>
              <option value="customers">Wholesale Customer Profiles</option>
              <option value="products">Catalog Products & Safety Limits</option>
              <option value="complaints">Wholesale Support Complaints</option>
            </select>
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold text-slate-500 block">Quantity to Sprout</label>
            <div className="flex gap-1.5">
              {[5, 10, 20].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setGenCount(val)}
                  className={`flex-1 text-xs py-2 px-1 rounded-xl font-bold transition-all border ${
                    genCount === val
                      ? "bg-indigo-600 border-indigo-650 text-white"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-4">
            <button
              onClick={handleGenerateValues}
              disabled={generating}
              className="w-full bg-indigo-650 text-white hover:bg-indigo-700 disabled:opacity-50 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing values...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Generate +{genCount} {genType === 'orders' ? 'Transactions' : genType === 'customers' ? 'Clients' : genType === 'products' ? 'Products' : 'Complaints'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Showcase Box */}
        {lastGeneratedNotes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50/70 border border-emerald-150 rounded-xl p-4 text-xs text-slate-700"
          >
            <p className="font-bold mb-1.5 text-emerald-900 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Synthesized values loaded and dispatched to Turso database:</span>
            </p>
            <ul className="list-disc pl-4 space-y-1 font-mono text-[11px] leading-relaxed text-emerald-800">
              {lastGeneratedNotes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="h-12 w-12 bg-indigo-50 border border-indigo-100/50 rounded-xl flex items-center justify-center text-indigo-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Gross Revenue</span>
            <span className="text-2xl font-bold text-slate-900">₱{totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="h-12 w-12 bg-amber-50 border border-amber-100/50 rounded-xl flex items-center justify-center text-amber-600">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Active Deliveries</span>
            <span className="text-2xl font-bold text-slate-900">{dispatchingOrdersCount} <span className="text-xs text-slate-400 font-normal">in transit</span></span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="h-12 w-12 bg-rose-50 border border-rose-100/50 rounded-xl flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Low Stock Warnings</span>
            <span className={`text-2xl font-bold ${lowStockItems.length > 0 ? "text-rose-600" : "text-slate-900"}`}>
              {lowStockItems.length} items
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="h-12 w-12 bg-emerald-50 border border-emerald-100/50 rounded-xl flex items-center justify-center text-emerald-600">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Open Complaints</span>
            <span className="text-2xl font-bold text-slate-900">{openComplaintsCount} cases</span>
          </div>
        </div>
      </div>

      {/* Interactive Stock alerts block */}
      {lowStockItems.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <h3 className="text-sm font-bold text-amber-900">Critical Stock Threshold Violations</h3>
          </div>
          <p className="text-xs text-amber-800 mb-4">
            The following products have dropped below their reorder threshold levels. Replenish immediately to avoid delivery disruptions:
          </p>
          
          {successMsg && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs py-2 px-3 rounded-lg mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockItems.map(p => (
              <div key={p.productId} className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-xs font-semibold text-slate-800 line-clamp-1">{p.productName}</span>
                    <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-mono font-medium shrink-0">{p.productId}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs mt-2 text-slate-500">
                    <div>
                      <span>Stock: </span>
                      <strong className="text-rose-600 font-bold">{p.stockQuantity}</strong>
                    </div>
                    <div>
                      <span>Min Threshold: </span>
                      <strong className="text-slate-700 font-medium">{p.reorderThreshold}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 w-24">
                    <span className="text-[10px] text-slate-400">Qty:</span>
                    <input 
                      type="number" 
                      min="10"
                      step="10"
                      value={restockAmount[p.productId] || 50} 
                      onChange={(e) => setRestockAmount({
                        ...restockAmount,
                        [p.productId]: parseInt(e.target.value) || 0
                      })}
                      className="border border-slate-200 text-center rounded text-xs py-0.5 px-1 bg-slate-50 w-full focus:outline-indigo-500" 
                    />
                  </div>
                  <button
                    onClick={() => handleQuickRestock(p.productId)}
                    className="bg-indigo-650 hover:bg-indigo-600 cursor-pointer text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all w-full justify-center"
                  >
                    <Package className="w-3.5 h-3.5" />
                    Action Restock
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recharts Analytics Displays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sales Performance Chart */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Dynamic Sales History Matrix</h3>
              <p className="text-xs text-slate-400">Fulfillment value trends sorted by transaction date</p>
            </div>
            <span className="bg-indigo-50 text-indigo-650 text-xs px-2 py-1 rounded-lg font-semibold font-mono flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Sales ₱
            </span>
          </div>

          <div className="h-68">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={finalSalesTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip formatter={(value) => [`₱${value}`, "Amount"]} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="Amount" stroke="#4f46e5" strokeWidth={3} dot={{ fill: "#4f46e5", strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="pt-2 border-t border-slate-50 flex justify-between items-center text-xs text-slate-400">
            <span>Cumulative Sales Period Status</span>
            <span className="text-indigo-600 font-semibold font-mono">100% Digital Data Capture</span>
          </div>
        </div>

        {/* Product Stock Analysis Chart */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Real-Time Inventory Levels</h3>
              <p className="text-xs text-slate-400">Current quantities vs. defined safety reorder thresholds</p>
            </div>
            <span className="bg-emerald-50 text-emerald-600 text-xs px-2 py-1 rounded-lg font-semibold font-mono flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              Units
            </span>
          </div>

          <div className="h-68">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "11px" }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: "11px", pt: 10 }} />
                <Bar dataKey="Stock" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Threshold" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="pt-2 border-t border-slate-50 flex justify-between items-center text-xs text-slate-400">
            <span>Current Safety Stock Level Alerts</span>
            <span className="text-emerald-600 font-semibold font-mono">Auto-checked On Checkout</span>
          </div>
        </div>

      </div>

      {/* System Quick Instructions / References */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 text-sm mb-4">Drabbit Marketing Sasa Core Objectives</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-3 border border-slate-50 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>Digital Order Entry</span>
            </div>
            <p className="text-[11px] text-slate-400">Replaces error-prone manual paper slip recordings. Automates reference numbering and tracking.</p>
          </div>
          <div className="p-3 border border-slate-50 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
              <Truck className="w-4 h-4 text-indigo-600" />
              <span>Real-Time Stock Check</span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">Stocks automatically decrement upon order delivery. Threshold triggers flag prompt reorder requests in Sasa hub.</p>
          </div>
          <div className="p-3 border border-slate-50 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span>Invoicing & Returns</span>
            </div>
            <p className="text-[11px] text-slate-400">Auto-build formatted billing records and track complaints to improve customer retention with audit paths.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
