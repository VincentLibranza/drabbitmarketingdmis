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
  Delivery,
  Complaint,
  AuditLog
} from "../types";

// --- BASELINE SEED DATA ---
// This is used only if LocalStorage is completely empty
const initialUsers: User[] = [
  {
    userId: "USR-001",
    username: "admin",
    name: "Rufino N. Libranza Jr.",
    role: UserRole.Proprietor,
    status: UserStatus.Active
  }
];

export class LocalDB {
  
  // --- 1. CLOUD SYNC: PULL DATA FROM TURSO ---
  // This is called when the app starts to sync cloud data down to the browser
  static async pullFromTurso(): Promise<void> {
    try {
      console.log("[Turso] Requesting cloud data snapshot...");
      const response = await fetch("/api/db/pull");
      
      // If the server crashes or returns 404/500, we stop here and don't crash the app
      if (!response.ok) {
        const errorText = await response.text();
        console.warn("⚠️ Cloud Sync Pull Failed. Server returned:", response.status, errorText);
        return;
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const { users, products, customers, orders, deliveries, complaints, auditLogs } = result.data;
        
        // Save to localStorage
        // We use skipSync=true (the 2nd argument) to prevent the app 
        // from immediately trying to push this data back up to the cloud.
        if (users && users.length > 0) this.setUsers(users, true);
        if (products && products.length > 0) this.setProducts(products, true);
        if (customers && customers.length > 0) this.setCustomers(customers, true);
        if (orders && orders.length > 0) this.setOrders(orders, true);
        if (deliveries && deliveries.length > 0) this.setDeliveries(deliveries, true);
        if (complaints && complaints.length > 0) this.setComplaints(complaints, true);
        if (auditLogs && auditLogs.length > 0) this.setAuditLogs(auditLogs, true);
        
        console.log("✅ Successfully synced latest cloud data to LocalStorage.");
      }
    } catch (err) {
      console.error("❌ Critical error during Turso pull:", err);
    }
  }

  // --- 2. LOCAL STORAGE CORE HELPERS ---
  static get<T>(key: string, initialData: T): T {
    try {
      const data = localStorage.getItem(`dmis_${key}`);
      if (!data) {
        localStorage.setItem(`dmis_${key}`, JSON.stringify(initialData));
        return initialData;
      }
      return JSON.parse(data);
    } catch (e) {
      return initialData;
    }
  }

  static set<T>(key: string, data: T, skipSync = false): void {
    try {
      localStorage.setItem(`dmis_${key}`, JSON.stringify(data));
      
      // If skipSync is false, we try to push this change up to Turso
      if (Array.isArray(data) && !skipSync) {
        this.syncToTurso(key, data);
      }
    } catch (e) {
      console.error(`Failed saving ${key} to state: `, e);
    }
  }

  // --- 3. CLOUD SYNC: PUSH DATA TO TURSO ---
  static async syncToTurso(table: string, rows: any[]): Promise<void> {
    // Dispatch an event so the UI (App.tsx) can show the syncing spinner
    const triggerEvent = (status: "syncing" | "success" | "error", errorMsg?: string) => {
      window.dispatchEvent(
        new CustomEvent("dmis-sync-status", {
          detail: { table, status, error: errorMsg, count: rows.length, timestamp: new Date() }
        })
      );
    };

    triggerEvent("syncing");

    try {
      const response = await fetch("/api/db/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, rows }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        triggerEvent("error", errorJson.error || "Server push failed");
      } else {
        triggerEvent("success");
      }
    } catch (err: any) {
      triggerEvent("error", err.message || "Network error");
    }
  }

  // --- 4. TYPED GETTERS AND SETTERS ---
  static getUsers(): User[] { return this.get<User[]>("users", initialUsers); }
  static setUsers(users: User[], skipSync = false): void { this.set("users", users, skipSync); }

  static getProducts(): Product[] { return this.get<Product[]>("products", []); }
  static setProducts(products: Product[], skipSync = false): void { this.set("products", products, skipSync); }

  static getCustomers(): Customer[] { return this.get<Customer[]>("customers", []); }
  static setCustomers(customers: Customer[], skipSync = false): void { this.set("customers", customers, skipSync); }

  static getOrders(): Order[] { return this.get<Order[]>("orders", []); }
  static setOrders(orders: Order[], skipSync = false): void { this.set("orders", orders, skipSync); }

  static getDeliveries(): Delivery[] { return this.get<Delivery[]>("deliveries", []); }
  static setDeliveries(deliveries: Delivery[], skipSync = false): void { this.set("deliveries", deliveries, skipSync); }

  static getComplaints(): Complaint[] { return this.get<Complaint[]>("complaints", []); }
  static setComplaints(complaints: Complaint[], skipSync = false): void { this.set("complaints", complaints, skipSync); }

  static getAuditLogs(): AuditLog[] { return this.get<AuditLog[]>("audit_logs", []); }
  static setAuditLogs(logs: AuditLog[], skipSync = false): void { this.set("audit_logs", logs, skipSync); }

  // --- 5. UTILITIES ---
  static reset() {
    localStorage.clear();
    location.reload();
  }

  static appendLog(username: string, action: string, tableRef: string): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      logId: `LOG-${Date.now()}`,
      username,
      action,
      timestamp: new Date().toISOString(),
      tableRef
    };
    logs.unshift(newLog);
    this.setAuditLogs(logs);
  }

  static exportAsJSON(): string {
    const data = {
      users: this.getUsers(),
      products: this.getProducts(),
      customers: this.getCustomers(),
      orders: this.getOrders(),
      deliveries: this.getDeliveries(),
      complaints: this.getComplaints(),
      audit_logs: this.getAuditLogs(),
      timestamp: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  static importFromJSON(jsonStr: string): boolean {
    try {
      const p = JSON.parse(jsonStr);
      if (p.users) this.setUsers(p.users);
      if (p.products) this.setProducts(p.products);
      if (p.customers) this.setCustomers(p.customers);
      if (p.orders) this.setOrders(p.orders);
      if (p.deliveries) this.setDeliveries(p.deliveries);
      if (p.complaints) this.setComplaints(p.complaints);
      if (p.audit_logs) this.setAuditLogs(p.audit_logs);
      return true;
    } catch {
      return false;
    }
  }

  static hasBackup(): boolean { return !!localStorage.getItem("dmis_reset_backup"); }
  
  static restoreBackup(): boolean {
    const b = localStorage.getItem("dmis_reset_backup");
    if (!b) return false;
    this.importFromJSON(b);
    return true;
  }
}