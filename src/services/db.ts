import {
  User, UserRole, UserStatus, Product, Customer, Order,
  Delivery, Complaint, AuditLog
} from "../types";

// Seed Data
const initialUsers: User[] = [
  { userId: "USR-001", username: "admin", name: "Rufino N. Libranza Jr.", role: UserRole.Proprietor, status: UserStatus.Active }
];
const initialProducts: Product[] = [];
const initialCustomers: Customer[] = [];
const initialOrders: Order[] = [];
const initialDeliveries: Delivery[] = [];
const initialComplaints: Complaint[] = [];
const initialAuditLogs: AuditLog[] = [
  { logId: "LOG-601", username: "System", action: "System initialized.", timestamp: new Date().toISOString(), tableRef: "SYSTEM" }
];

export class LocalDB {
  // --- NEW: CLOUD SYNC PULL METHOD ---
  static async pullFromTurso(): Promise<void> {
    try {
      console.log("[Turso] Attempting to pull cloud dataset...");
      const response = await fetch("/api/db/pull");
      if (!response.ok) return;
      
      const result = await response.json();
      if (result.success && result.data) {
        const { users, products, customers, orders, deliveries, complaints, auditLogs } = result.data;
        
        // Save to localStorage (silent save, skipSync=true to avoid infinite loops)
        if (users) this.setUsers(users, true);
        if (products) this.setProducts(products, true);
        if (customers) this.setCustomers(customers, true);
        if (orders) this.setOrders(orders, true);
        if (deliveries) this.setDeliveries(deliveries, true);
        if (complaints) this.setComplaints(complaints, true);
        if (auditLogs) this.setAuditLogs(auditLogs, true);
        
        console.log("✅ Successfully synced from Turso Cloud");
      }
    } catch (err) {
      console.error("Failed to pull from Turso:", err);
    }
  }

  // --- EXISTING METHODS ---
  static get<T>(key: string, initialData: T): T {
    try {
      const data = localStorage.getItem(`dmis_${key}`);
      if (!data) {
        localStorage.setItem(`dmis_${key}`, JSON.stringify(initialData));
        return initialData;
      }
      return JSON.parse(data);
    } catch { return initialData; }
  }

  static set<T>(key: string, data: T, skipSync = false): void {
    try {
      localStorage.setItem(`dmis_${key}`, JSON.stringify(data));
      if (Array.isArray(data) && !skipSync) {
        this.syncToTurso(key, data);
      }
    } catch (e) { console.error("Failed saving state: ", e); }
  }

  static async syncToTurso(table: string, rows: any[]): Promise<void> {
    const triggerEvent = (status: "syncing" | "success" | "error", errorMsg?: string) => {
      window.dispatchEvent(new CustomEvent("dmis-sync-status", {
        detail: { table, status, error: errorMsg, count: rows.length, timestamp: new Date() }
      }));
    };

    triggerEvent("syncing");
    try {
      const response = await fetch("/api/db/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, rows }),
      });
      if (!response.ok) throw new Error("Sync failed");
      triggerEvent("success");
    } catch (err: any) {
      triggerEvent("error", err.message);
    }
  }

  static reset() {
    localStorage.clear();
    location.reload();
  }

  static hasBackup(): boolean { return !!localStorage.getItem("dmis_reset_backup"); }

  static restoreBackup(): boolean {
    const backupStr = localStorage.getItem("dmis_reset_backup");
    if (!backupStr) return false;
    const backup = JSON.parse(backupStr);
    if (backup.users) localStorage.setItem("dmis_users", backup.users);
    // ... add other tables as needed
    return true;
  }

  static exportAsJSON(): string {
    return JSON.stringify({
      users: this.getUsers(), products: this.getProducts(), customers: this.getCustomers(),
      orders: this.getOrders(), deliveries: this.getDeliveries(), complaints: this.getComplaints(),
      audit_logs: this.getAuditLogs(), timestamp: new Date().toISOString()
    }, null, 2);
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
      return true;
    } catch { return false; }
  }

  static getUsers(): User[] { return this.get<User[]>("users", initialUsers); }
  static setUsers(users: User[], skipSync = false): void { this.set("users", users, skipSync); }
  static getProducts(): Product[] { return this.get<Product[]>("products", initialProducts); }
  static setProducts(products: Product[], skipSync = false): void { this.set("products", products, skipSync); }
  static getCustomers(): Customer[] { return this.get<Customer[]>("customers", initialCustomers); }
  static setCustomers(customers: Customer[], skipSync = false): void { this.set("customers", customers, skipSync); }
  static getOrders(): Order[] { return this.get<Order[]>("orders", initialOrders); }
  static setOrders(orders: Order[], skipSync = false): void { this.set("orders", orders, skipSync); }
  static getDeliveries(): Delivery[] { return this.get<Delivery[]>("deliveries", initialDeliveries); }
  static setDeliveries(deliveries: Delivery[], skipSync = false): void { this.set("deliveries", deliveries, skipSync); }
  static getComplaints(): Complaint[] { return this.get<Complaint[]>("complaints", initialComplaints); }
  static setComplaints(complaints: Complaint[], skipSync = false): void { this.set("complaints", complaints, skipSync); }
  static getAuditLogs(): AuditLog[] { return this.get<AuditLog[]>("audit_logs", initialAuditLogs); }
  static setAuditLogs(logs: AuditLog[], skipSync = false): void { this.set("audit_logs", logs, skipSync); }

  static appendLog(username: string, action: string, tableRef: string): void {
    const logs = this.getAuditLogs();
    logs.unshift({ logId: `LOG-${Date.now().toString().slice(-6)}`, username, action, timestamp: new Date().toISOString(), tableRef });
    this.setAuditLogs(logs);
  }
}