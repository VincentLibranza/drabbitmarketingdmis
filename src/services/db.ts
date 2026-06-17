import {
  User, UserRole, UserStatus, Product, Customer, Order,
  Delivery, Complaint, AuditLog
} from "../types";

// Baseline Seed Data
const initialUsers: User[] = [
  { userId: "USR-001", username: "admin", name: "Rufino N. Libranza Jr.", role: UserRole.Proprietor, status: UserStatus.Active }
];

export class LocalDB {
  // --- 1. CLOUD SYNC PULL METHOD ---
  static async pullFromTurso(): Promise<void> {
    try {
      console.log("[Turso] Pulling cloud snapshot...");
      const response = await fetch("/api/db/pull");
      if (!response.ok) return;
      
      const result = await response.json();
      if (result.success && result.data) {
        const { users, products, customers, orders, deliveries, complaints, auditLogs } = result.data;
        
        // Save cloud data to localStorage (skipSync=true to prevent infinite loops)
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

  // --- 2. LOCALSTORAGE HELPERS ---
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
      // Only push to Turso if it's not a 'pull' action from the cloud
      if (Array.isArray(data) && !skipSync) {
        this.syncToTurso(key, data);
      }
    } catch (e) { console.error("Failed saving state: ", e); }
  }

  static async syncToTurso(table: string, rows: any[]): Promise<void> {
    if (typeof window === "undefined") return;
    
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
      if (!response.ok) throw new Error("Cloud push failed");
      triggerEvent("success");
    } catch (err: any) {
      triggerEvent("error", err.message);
    }
  }

  // --- 3. GETTERS AND SETTERS ---
  static getUsers(): User[] { return this.get<User[]>("users", initialUsers); }
  static setUsers(users: User[], skipSync = false): void { this.set("users", users, skipSync); }
  
  static getProducts(): Product[] { return this.get<Product[]>("products", []); }
  static setProducts(p: Product[], skipSync = false): void { this.set("products", p, skipSync); }
  
  static getCustomers(): Customer[] { return this.get<Customer[]>("customers", []); }
  static setCustomers(c: Customer[], skipSync = false): void { this.set("customers", c, skipSync); }
  
  static getOrders(): Order[] { return this.get<Order[]>("orders", []); }
  static setOrders(o: Order[], skipSync = false): void { this.set("orders", o, skipSync); }
  
  static getDeliveries(): Delivery[] { return this.get<Delivery[]>("deliveries", []); }
  static setDeliveries(d: Delivery[], skipSync = false): void { this.set("deliveries", d, skipSync); }
  
  static getComplaints(): Complaint[] { return this.get<Complaint[]>("complaints", []); }
  static setComplaints(c: Complaint[], skipSync = false): void { this.set("complaints", c, skipSync); }
  
  static getAuditLogs(): AuditLog[] { return this.get<AuditLog[]>("audit_logs", []); }
  static setAuditLogs(l: AuditLog[], skipSync = false): void { this.set("audit_logs", l, skipSync); }

  static reset() { localStorage.clear(); location.reload(); }
  static appendLog(username: string, action: string, tableRef: string): void {
    const logs = this.getAuditLogs();
    logs.unshift({ logId: `LOG-${Date.now()}`, username, action, timestamp: new Date().toISOString(), tableRef });
    this.setAuditLogs(logs);
  }
}