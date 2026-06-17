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

  static getAuditLogs(): AuditLog[] {
    return this.get<AuditLog[]>("audit_logs", initialAuditLogs);
  }
  static setAuditLogs(logs: AuditLog[], skipSync = false): void {
    this.set("audit_logs", logs, skipSync);
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
