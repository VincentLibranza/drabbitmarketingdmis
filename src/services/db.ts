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
  AuditLog,
  Invoice
} from "../types";

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
const initialProducts: Product[] = [];

// Seed Customers
const initialCustomers: Customer[] = [];

// Seed Orders
const initialOrders: Order[] = [];

// Seed Deliveries
const initialDeliveries: Delivery[] = [];

// Seed Invoices
const initialInvoices: Invoice[] = [];

// Seed Complaints
const initialComplaints: Complaint[] = [];

// Seed Audit Logs
const initialAuditLogs: AuditLog[] = [
  {
    logId: "LOG-601",
    username: "System",
    action: "System initialized with a clean offline database workspace.",
    timestamp: new Date().toISOString(),
    tableRef: "SYSTEM"
  }
];

// Run-once migration to immediately clean up previously cached mock data from active browser session
try {
  if (typeof window !== "undefined" && !localStorage.getItem("dmis_has_purged_mock_seeds_v1")) {
    localStorage.removeItem("dmis_products");
    localStorage.removeItem("dmis_customers");
    localStorage.removeItem("dmis_orders");
    localStorage.removeItem("dmis_deliveries");
    localStorage.removeItem("dmis_complaints");
    localStorage.removeItem("dmis_audit_logs");
    localStorage.setItem("dmis_has_purged_mock_seeds_v1", "true");
  }
} catch (e) {
  console.error("Failed clean-seed localStorage migration check:", e);
}

// Localstorage state manager for offline DMIS operations
function normalizeRow(table: string, row: any): any {
  if (!row || typeof row !== "object") return row;
  
  // Create a lowercase key map for easy lookup
  const lowerRow: any = {};
  for (const k of Object.keys(row)) {
    lowerRow[k.toLowerCase()] = row[k];
  }

  const getVal = (camelKey: string, fallbackKeys: string[] = []): any => {
    if (row[camelKey] !== undefined) return row[camelKey];
    if (lowerRow[camelKey.toLowerCase()] !== undefined) return lowerRow[camelKey.toLowerCase()];
    for (const f of fallbackKeys) {
      if (row[f] !== undefined) return row[f];
      if (lowerRow[f.toLowerCase()] !== undefined) return lowerRow[f.toLowerCase()];
    }
    return undefined;
  };

  if (table === "users") {
    return {
      userId: getVal("userId", ["userid", "UserID"]),
      username: getVal("username"),
      name: getVal("name"),
      role: getVal("role"),
      status: getVal("status"),
    };
  }

  if (table === "products") {
    return {
      productId: getVal("productId", ["productid"]),
      productName: getVal("productName", ["productname"]),
      category: getVal("category"),
      unitPrice: Number(getVal("unitPrice", ["unitprice"]) ?? 0),
      stockQuantity: Number(getVal("stockQuantity", ["stockquantity"]) ?? 0),
      reorderThreshold: Number(getVal("reorderThreshold", ["reorderthreshold"]) ?? 0),
    };
  }

  if (table === "customers") {
    return {
      customerId: getVal("customerId", ["customerid"]),
      customerName: getVal("customerName", ["customername"]),
      address: getVal("address"),
      contact: getVal("contact", ["contactphone", "contactPhone"]),
      email: getVal("email"),
      tin: getVal("tin", ["TIN"]),
    };
  }

  if (table === "orders") {
    let rawItems = getVal("items");
    let items: any[] = [];
    if (rawItems) {
      if (typeof rawItems === "string") {
        try {
          items = JSON.parse(rawItems);
        } catch {
          items = [];
        }
      } else if (Array.isArray(rawItems)) {
        items = rawItems;
      }
    }
    
    // Normalize line items
    items = items.map(item => ({
      itemId: item.itemId ?? item.itemid ?? "",
      orderId: item.orderId ?? item.orderid ?? "",
      productId: item.productId ?? item.productid ?? "",
      quantity: Number(item.quantity ?? 1),
      unitPrice: Number(item.unitPrice ?? item.unitprice ?? 0),
    }));

    return {
      orderId: getVal("orderId", ["orderid"]),
      orderRefNo: getVal("orderRefNo", ["orderrefno"]),
      customerId: getVal("customerId", ["customerid"]),
      orderDate: getVal("orderDate", ["orderdate"]),
      status: getVal("status"),
      paymentStatus: getVal("paymentStatus", ["paymentstatus"]),
      totalAmount: Number(getVal("totalAmount", ["totalamount"]) ?? 0),
      dueDate: getVal("dueDate", ["duedate"]),
      items,
    };
  }

  if (table === "deliveries") {
    return {
      deliveryId: getVal("deliveryId", ["deliveryid"]),
      orderId: getVal("orderId", ["orderid"]),
      scheduledDate: getVal("scheduledDate", ["scheduleddate"]),
      deliveryDate: getVal("deliveryDate", ["deliverydate"]),
      status: getVal("status"),
      assignedDriver: getVal("assignedDriver", ["assigneddriver"]),
    };
  }

  if (table === "complaints") {
    return {
      complaintId: getVal("complaintId", ["complaintid"]),
      customerId: getVal("customerId", ["customerid"]),
      productId: getVal("productId", ["productid"]),
      description: getVal("description"),
      status: getVal("status"),
      resolution: getVal("resolution"),
      dateLogged: getVal("dateLogged", ["datelogged"]),
    };
  }

  if (table === "audit_logs") {
    return {
      logId: getVal("logId", ["logid", "LogID"]),
      username: getVal("username", ["userid", "userId", "UserID"]),
      action: getVal("action", ["Action"]),
      timestamp: getVal("timestamp", ["Timestamp"]),
      tableRef: getVal("tableRef", ["tableref"]),
    };
  }

  if (table === "invoices") {
    return {
      invoiceId: getVal("invoiceId", ["invoiceid", "InvoiceID"]),
      orderId: getVal("orderId", ["orderid", "OrderID"]),
      invoiceDate: getVal("invoiceDate", ["invoicedate", "InvoiceDate"]),
      totalAmount: Number(getVal("totalAmount", ["totalamount", "TotalAmount"]) ?? 0),
      paymentStatus: getVal("paymentStatus", ["paymentstatus", "PaymentStatus"]),
      dueDate: getVal("dueDate", ["duedate", "DueDate"])
    };
  }

  return row;
}

export class LocalDB {
  static get<T>(key: string, initialData: T): T {
    try {
      const data = localStorage.getItem(`dmis_${key}`);
      if (!data) {
        localStorage.setItem(`dmis_${key}`, JSON.stringify(initialData));
        return initialData;
      }
      const parsed = JSON.parse(data);
      if (Array.isArray(initialData) && !Array.isArray(parsed)) {
        return initialData;
      }

      if (Array.isArray(parsed)) {
        return parsed.map((row: any) => normalizeRow(key, row)) as unknown as T;
      }

      return parsed;
    } catch {
      return initialData;
    }
  }

  static async pullFromTurso(): Promise<void> {
    try {
      const res = await fetch("/api/db/pull");
      const result = await res.json();
      if (result.success && result.data) {
        Object.entries(result.data).forEach(([table, rows]) => {
          localStorage.setItem(`dmis_${table}`, JSON.stringify(rows));
        });
      }
    } catch (e) {
      console.error("Sync Pull Failed:", e);
    }
  }

  static set<T>(key: string, data: T, skipSync = false): void {
    try {
      localStorage.setItem(`dmis_${key}`, JSON.stringify(data));
      if (Array.isArray(data) && !skipSync) {
        this.syncToTurso(key, data);
      }
    } catch (e) {
      console.error("Failed saving state: ", e);
    }
  }

  static async syncToTurso(table: string, rows: any[]): Promise<void> {
    const triggerEvent = (status: "syncing" | "success" | "error", errorMsg?: string) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("dmis-sync-status", {
            detail: { table, status, error: errorMsg, count: rows.length, timestamp: new Date() }
          })
        );
      }
    };

    triggerEvent("syncing");
    try {
      const response = await fetch("/api/db/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ table, rows }),
      });
      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        const msg = errorJson.error || response.statusText || "HTTP Error";
        console.error(`[Turso Sync] Failed to sync table ${table}:`, msg);
        triggerEvent("error", msg);
      } else {
        console.log(`[Turso Sync] Synced ${rows.length} rows to Turso cloud table: ${table}`);
        triggerEvent("success");
      }
    } catch (err: any) {
      const msg = err.message || String(err);
      console.warn(`[Turso Sync] Cloud database write failed for ${table}:`, msg);
      triggerEvent("error", msg);
    }
  }

  static reset() {
    try {
      const snapshot = {
        users: localStorage.getItem("dmis_users"),
        products: localStorage.getItem("dmis_products"),
        customers: localStorage.getItem("dmis_customers"),
        orders: localStorage.getItem("dmis_orders"),
        deliveries: localStorage.getItem("dmis_deliveries"),
        complaints: localStorage.getItem("dmis_complaints"),
        audit_logs: localStorage.getItem("dmis_audit_logs"),
        invoices: localStorage.getItem("dmis_invoices"),
        timestamp: new Date().toISOString()
      };
      localStorage.setItem("dmis_reset_backup", JSON.stringify(snapshot));
    } catch (e) {
      console.error("Failed creating pre-reset backup snapshot:", e);
    }

    // Keep only the backup and current active session, remove others
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("dmis_") && key !== "dmis_reset_backup" && key !== "dmis_logged_in_user") {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    location.reload();
  }

  static hasBackup(): boolean {
    try {
      const backupStr = localStorage.getItem("dmis_reset_backup");
      if (!backupStr) return false;
      const backup = JSON.parse(backupStr);
      return !!(backup.users || backup.products || backup.orders);
    } catch {
      return false;
    }
  }

  static restoreBackup(): boolean {
    try {
      const backupStr = localStorage.getItem("dmis_reset_backup");
      if (!backupStr) return false;
      
      const backup = JSON.parse(backupStr);
      if (backup.users) localStorage.setItem("dmis_users", backup.users);
      if (backup.products) localStorage.setItem("dmis_products", backup.products);
      if (backup.customers) localStorage.setItem("dmis_customers", backup.customers);
      if (backup.orders) localStorage.setItem("dmis_orders", backup.orders);
      if (backup.deliveries) localStorage.setItem("dmis_deliveries", backup.deliveries);
      if (backup.complaints) localStorage.setItem("dmis_complaints", backup.complaints);
      if (backup.audit_logs) localStorage.setItem("dmis_audit_logs", backup.audit_logs);
      if (backup.invoices) localStorage.setItem("dmis_invoices", backup.invoices);
      
      this.appendLog("System", "Restored previous custom session database from auto-backup.", "SYSTEM");
      return true;
    } catch (e) {
      console.error("Failed restoring backup:", e);
      return false;
    }
  }

  static exportAsJSON(): string {
    const dataObj = {
      users: this.getUsers(),
      products: this.getProducts(),
      customers: this.getCustomers(),
      orders: this.getOrders(),
      deliveries: this.getDeliveries(),
      complaints: this.getComplaints(),
      audit_logs: this.getAuditLogs(),
      invoices: this.getInvoices(),
      exporter: "Sasa Portal DMIS",
      timestamp: new Date().toISOString()
    };
    return JSON.stringify(dataObj, null, 2);
  }

  static importFromJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.users) this.setUsers(parsed.users);
      if (parsed.products) this.setProducts(parsed.products);
      if (parsed.customers) this.setCustomers(parsed.customers);
      if (parsed.orders) this.setOrders(parsed.orders);
      if (parsed.deliveries) this.setDeliveries(parsed.deliveries);
      if (parsed.complaints) this.setComplaints(parsed.complaints);
      if (parsed.audit_logs) this.setAuditLogs(parsed.audit_logs);
      if (parsed.invoices) this.setInvoices(parsed.invoices);
      
      this.appendLog("System", "Successfully imported external JSON database backup", "SYSTEM");
      return true;
    } catch (e) {
      console.error("JSON parse failure in DB import:", e);
      return false;
    }
  }

  // Typed getters/setters fully integrated into browser localStorage
  static getUsers(): User[] {
    return this.get<User[]>("users", initialUsers);
  }
  static setUsers(users: User[], skipSync = false): void {
    this.set("users", users, skipSync);
  }

  static getProducts(): Product[] {
    return this.get<Product[]>("products", initialProducts);
  }
  static setProducts(products: Product[], skipSync = false): void {
    this.set("products", products, skipSync);
  }

  static getCustomers(): Customer[] {
    return this.get<Customer[]>("customers", initialCustomers);
  }
  static setCustomers(customers: Customer[], skipSync = false): void {
    this.set("customers", customers, skipSync);
  }

  static getOrders(): Order[] {
    return this.get<Order[]>("orders", initialOrders);
  }
  static setOrders(orders: Order[], skipSync = false): void {
    this.set("orders", orders, skipSync);
  }

  static getDeliveries(): Delivery[] {
    return this.get<Delivery[]>("deliveries", initialDeliveries);
  }
  static setDeliveries(deliveries: Delivery[], skipSync = false): void {
    this.set("deliveries", deliveries, skipSync);
  }

  static getComplaints(): Complaint[] {
    return this.get<Complaint[]>("complaints", initialComplaints);
  }
  static setComplaints(complaints: Complaint[], skipSync = false): void {
    this.set("complaints", complaints, skipSync);
  }

  static getInvoices(): Invoice[] {
    let invoices = this.get<Invoice[]>("invoices", initialInvoices);
    const orders = this.getOrders();
    // Auto-generate missing invoices for any orders to ensure we have data
    let changed = false;
    const updatedInvoices = [...invoices];
    orders.forEach(o => {
      const exists = updatedInvoices.some(inv => inv.orderId === o.orderId);
      if (!exists) {
        updatedInvoices.push({
          invoiceId: `INV-${o.orderId.replace("ORD-", "")}`,
          orderId: o.orderId,
          invoiceDate: o.orderDate.split("T")[0],
          totalAmount: o.totalAmount,
          paymentStatus: o.paymentStatus,
          dueDate: o.dueDate
        });
        changed = true;
      }
    });

    if (changed) {
      this.setInvoices(updatedInvoices, false);
      return updatedInvoices;
    }
    return invoices;
  }
  static setInvoices(invoices: Invoice[], skipSync = false): void {
    this.set("invoices", invoices, skipSync);
  }

  static getAuditLogs(): AuditLog[] {
    return this.get<AuditLog[]>("audit_logs", initialAuditLogs);
  }
  static setAuditLogs(logs: AuditLog[], skipSync = false): void {
    this.set("audit_logs", logs, skipSync);
  }

  static appendLog(UserID: string, Action: string, TableRef: string) {
    const logs = this.getAuditLogs();
    const id = `LOG-${Math.floor(Math.random() * 1000000)}`;
    const now = new Date().toISOString();
    const newEntry: AuditLog = { 
      // Lowercase keys
      logId: id,
      username: UserID,
      action: Action,
      timestamp: now,
      tableRef: TableRef,

      // Uppercase keys (ERD compatibility)
      LogID: id,
      UserID: UserID,
      userId: UserID,
      Action: Action,
      Timestamp: now,
      TableRef: TableRef
    };
    logs.unshift(newEntry);
    this.set("audit_logs", logs);
  }
}
