/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  User,
  UserRole,
  UserStatus,
  Product,
  Customer,
  Order,
  OrderStatus,
  PaymentStatus,
  Delivery,
  DeliveryStatus,
  Complaint,
  ComplaintStatus,
  AuditLog
} from "./types";

// Seed Users
const initialUsers: User[] = [
  {
    userId: "USR-001",
    username: "admin",
    name: "Rufino N. Libranza Jr.",
    role: UserRole.Proprietor,
    status: UserStatus.Active
  },
  {
    userId: "USR-002",
    username: "staff",
    name: "Zian Wayne Matunding",
    role: UserRole.Staff,
    status: UserStatus.Active
  },
  {
    userId: "USR-003",
    username: "vincent",
    name: "Vincent Jon Libranza",
    role: UserRole.Staff,
    status: UserStatus.Active
  }
];

// Seed Products
const initialProducts: Product[] = [
  {
    productId: "PRD-101",
    productName: "HDPE T-Shirt Plastic Bag (Medium - 50pcs)",
    category: "Plastic Bags",
    unitPrice: 45.00,
    stockQuantity: 120,
    reorderThreshold: 30
  },
  {
    productId: "PRD-102",
    productName: "LDPE Plain Shopping Bag (Large - 100pcs)",
    category: "Plastic Bags",
    unitPrice: 120.00,
    stockQuantity: 15, // Trigger low stock alert!
    reorderThreshold: 20
  },
  {
    productId: "PRD-103",
    productName: "Heavy Duty Black Trash Bag (Large - 10pcs)",
    category: "Trash Bags",
    unitPrice: 85.00,
    stockQuantity: 200,
    reorderThreshold: 50
  },
  {
    productId: "PRD-104",
    productName: "Yellow Premium Biohazard Trash Bag (Medium)",
    category: "Trash Bags",
    unitPrice: 110.00,
    stockQuantity: 9, // Trigger low stock alert!
    reorderThreshold: 15
  },
  {
    productId: "PRD-105",
    productName: "Microwavable Plastic Container (500ml - 5pcs)",
    category: "Plastic Containers",
    unitPrice: 65.00,
    stockQuantity: 450,
    reorderThreshold: 100
  },
  {
    productId: "PRD-106",
    productName: "Food-Grade Cling Wrap Roll (30cm x 100m)",
    category: "Cling Wrap",
    unitPrice: 180.00,
    stockQuantity: 80,
    reorderThreshold: 25
  },
  {
    productId: "PRD-107",
    productName: "Aluminum Foil Premium Wrap (12in x 75m)",
    category: "Aluminum Foil",
    unitPrice: 220.00,
    stockQuantity: 42,
    reorderThreshold: 15
  }
];

// Seed Customers
const initialCustomers: Customer[] = [
  {
    customerId: "CST-201",
    customerName: "Sasa Bakery Hub",
    contact: "+63 912 345 6789",
    address: "KM 10.5, Sasa, Davao City",
    email: "sasabakery@gmail.com",
    tin: "401-229-301-000"
  },
  {
    customerId: "CST-202",
    customerName: "Davao Fresh Fishery",
    contact: "+63 945 888 1234",
    address: "Daliao Fish Port, Toril, Davao City",
    email: "orders@davaofresh.ph",
    tin: "112-983-049-000"
  },
  {
    customerId: "CST-203",
    customerName: "Agdao Supermart",
    contact: "+63 928 777 9900",
    address: "Agdao Public Market, Davao City",
    email: "agdaomart@yahoo.com",
    tin: "561-220-431-000"
  },
  {
    customerId: "CST-204",
    customerName: "MMCM Cafeteria",
    contact: "+63 917 555 4321",
    address: "Mapua Malayan Colleges Mindanao, MacArthur Highway, Davao City",
    email: "canteen@mmcm.edu.ph",
    tin: "990-210-994-000"
  }
];

// Seed Orders
const initialOrders: Order[] = [
  {
    orderId: "ORD-301",
    orderRefNo: "DMIS-ORD-1001",
    customerId: "CST-201",
    orderDate: "2026-06-11T09:30:00",
    status: OrderStatus.Delivered,
    paymentStatus: PaymentStatus.Paid,
    totalAmount: 1550.00,
    dueDate: "2026-06-18",
    items: [
      { itemId: "ITEM-301-1", orderId: "ORD-301", productId: "PRD-101", quantity: 10, unitPrice: 45.00 },
      { itemId: "ITEM-301-2", orderId: "ORD-301", productId: "PRD-106", quantity: 5, unitPrice: 180.00 },
      { itemId: "ITEM-301-3", orderId: "ORD-301", productId: "PRD-107", quantity: 1, unitPrice: 200.00 }
    ]
  },
  {
    orderId: "ORD-302",
    orderRefNo: "DMIS-ORD-1002",
    customerId: "CST-202",
    orderDate: "2026-06-13T14:15:00",
    status: OrderStatus.Dispatched,
    paymentStatus: PaymentStatus.Partial,
    totalAmount: 2470.00,
    dueDate: "2026-06-20",
    items: [
      { itemId: "ITEM-302-1", orderId: "ORD-302", productId: "PRD-103", quantity: 20, unitPrice: 85.00 },
      { itemId: "ITEM-302-2", orderId: "ORD-302", productId: "PRD-105", quantity: 10, unitPrice: 65.00 },
      { itemId: "ITEM-302-3", orderId: "ORD-302", productId: "PRD-107", quantity: 4, unitPrice: 220.00 }
    ]
  },
  {
    orderId: "ORD-303",
    orderRefNo: "DMIS-ORD-1003",
    customerId: "CST-204",
    orderDate: "2026-06-15T11:00:00",
    status: OrderStatus.Pending,
    paymentStatus: PaymentStatus.Unpaid,
    totalAmount: 495.00,
    dueDate: "2026-06-22",
    items: [
      { itemId: "ITEM-303-1", orderId: "ORD-303", productId: "PRD-101", quantity: 11, unitPrice: 45.00 }
    ]
  }
];

// Seed Deliveries
const initialDeliveries: Delivery[] = [
  {
    deliveryId: "DLV-401",
    orderId: "ORD-301",
    scheduledDate: "2026-06-12",
    deliveryDate: "2026-06-12 15:45",
    status: DeliveryStatus.Delivered,
    assignedDriver: "Benny Santos (Truck A)"
  },
  {
    deliveryId: "DLV-402",
    orderId: "ORD-302",
    scheduledDate: "2026-06-16",
    status: DeliveryStatus.InTransit,
    assignedDriver: "Jun-Jun Alcantara (Multi-cab B)"
  }
];

// Seed Complaints
const initialComplaints: Complaint[] = [
  {
    complaintId: "CMP-501",
    customerId: "CST-202",
    productId: "PRD-103",
    description: "Item carton damaged during delivery. Requesting replacement for 2 units.",
    status: ComplaintStatus.InProgress,
    dateLogged: "2026-06-14T08:00:00"
  },
  {
    complaintId: "CMP-502",
    customerId: "CST-201",
    productId: "PRD-106",
    description: "Wrong size of cling wrap delivered vs ordered. Quickly resolved by swapping size.",
    status: ComplaintStatus.Resolved,
    resolution: "Swapped standard 30cm cling wrap with correct size. Customer satisfied.",
    dateLogged: "2026-06-12T13:20:00"
  }
];

// Seed Audit Logs
const initialAuditLogs: AuditLog[] = [
  {
    logId: "LOG-601",
    username: "admin",
    action: "System Initialization and Seed Data Loaded Successfully",
    timestamp: "2026-06-15T14:02:54-07:00",
    tableRef: "SYSTEM"
  }
];

// Localstorage state manager and Turso DB synchronization layer
export class LocalDB {
  static get<T>(key: string, initialData: T): T {
    try {
      const data = localStorage.getItem(`dmis_${key}`);
      if (!data) {
        localStorage.setItem(`dmis_${key}`, JSON.stringify(initialData));
        return initialData;
      }
      return JSON.parse(data);
    } catch {
      return initialData;
    }
  }

  static set<T>(key: string, data: T): void {
    try {
      localStorage.setItem(`dmis_${key}`, JSON.stringify(data));
    } catch (e) {
      console.error("Failed saving state: ", e);
    }
  }

  static pushToDB(table: string, rows: any[]) {
    fetch("/api/db/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ table, rows }),
    })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        console.error(`[Turso Sync Fail] Failed to sync table "${table}" to Turso backend:`, text);
      } else {
        console.log(`[Turso Sync Success] Synced ${rows.length} rows to table "${table}" on Turso.`);
      }
    })
    .catch(err => {
      console.error(`Offline or background network error syncing ${table} table to Turso:`, err);
    });
  }

  static getDBInfo() {
    return {
      connectionType: localStorage.getItem("dmis_db_connection_type") || "Local SQLite Fallback File",
      databaseUrl: localStorage.getItem("dmis_db_url") || "file:local.db",
      isRemote: localStorage.getItem("dmis_db_is_remote") === "true",
    };
  }

  static async pullFromDB(): Promise<boolean> {
    try {
      const res = await fetch("/api/db/pull");
      if (!res.ok) return false;
      const json = await res.json();
      if (json.success && json.data) {
        if (json.connectionType) localStorage.setItem("dmis_db_connection_type", json.connectionType);
        if (json.databaseUrl) localStorage.setItem("dmis_db_url", json.databaseUrl);
        localStorage.setItem("dmis_db_is_remote", String(!!json.isRemote));

        const { users, products, customers, orders, deliveries, complaints, auditLogs } = json.data;
        if (users) this.set("users", users);
        if (products) this.set("products", products);
        if (customers) this.set("customers", customers);
        if (orders) this.set("orders", orders);
        if (deliveries) this.set("deliveries", deliveries);
        if (complaints) this.set("complaints", complaints);
        if (auditLogs) this.set("audit_logs", auditLogs);
        return true;
      }
    } catch (e) {
      console.error("Failed to pull fresh state from Turso backend:", e);
    }
    return false;
  }

  static reset() {
    fetch("/api/db/reset", { method: "POST" })
      .catch(err => console.error("Could not reset backend database:", err))
      .finally(() => {
        localStorage.clear();
        location.reload();
      });
  }

  // Typed getters/setters with async background propagation
  static getUsers(): User[] {
    return this.get<User[]>("users", initialUsers);
  }
  static setUsers(users: User[]): void {
    this.set("users", users);
    this.pushToDB("users", users);
  }

  static getProducts(): Product[] {
    return this.get<Product[]>("products", initialProducts);
  }
  static setProducts(products: Product[]): void {
    this.set("products", products);
    this.pushToDB("products", products);
  }

  static getCustomers(): Customer[] {
    return this.get<Customer[]>("customers", initialCustomers);
  }
  static setCustomers(customers: Customer[]): void {
    this.set("customers", customers);
    this.pushToDB("customers", customers);
  }

  static getOrders(): Order[] {
    return this.get<Order[]>("orders", initialOrders);
  }
  static setOrders(orders: Order[]): void {
    this.set("orders", orders);
    this.pushToDB("orders", orders);
  }

  static getDeliveries(): Delivery[] {
    return this.get<Delivery[]>("deliveries", initialDeliveries);
  }
  static setDeliveries(deliveries: Delivery[]): void {
    this.set("deliveries", deliveries);
    this.pushToDB("deliveries", deliveries);
  }

  static getComplaints(): Complaint[] {
    return this.get<Complaint[]>("complaints", initialComplaints);
  }
  static setComplaints(complaints: Complaint[]): void {
    this.set("complaints", complaints);
    this.pushToDB("complaints", complaints);
  }

  static getAuditLogs(): AuditLog[] {
    return this.get<AuditLog[]>("audit_logs", initialAuditLogs);
  }
  static setAuditLogs(logs: AuditLog[]): void {
    this.set("audit_logs", logs);
    this.pushToDB("audit_logs", logs);
  }

  static appendLog(username: string, action: string, tableRef: string): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      logId: `LOG-${Date.now().toString().slice(-6)}`,
      username,
      action,
      timestamp: new Date().toISOString(),
      tableRef
    };
    logs.unshift(newLog); // Put news first
    this.setAuditLogs(logs);
  }
}
