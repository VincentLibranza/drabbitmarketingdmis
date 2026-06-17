import { User, UserRole, UserStatus } from "../types";

// --- BASELINE SEED DATA (Ensures tabs aren't empty on first load) ---
const initialUsers = [
  { userId: "USR-001", username: "admin", name: "Rufino N. Libranza Jr.", role: "Proprietor", status: "Active" }
];

const initialProducts = [
  { productId: "PRD-101", productName: "HDPE T-Shirt Plastic Bag (Medium)", category: "Plastic Bags", unitPrice: 45.0, stockQuantity: 120, reorderThreshold: 30 },
  { productId: "PRD-102", productName: "LDPE Plain Shopping Bag (Large)", category: "Plastic Bags", unitPrice: 120.0, stockQuantity: 15, reorderThreshold: 20 },
  { productId: "PRD-103", productName: "Heavy Duty Black Trash Bag", category: "Trash Bags", unitPrice: 85.0, stockQuantity: 200, reorderThreshold: 50 }
];

const initialCustomers = [
  { customerId: "CST-201", customerName: "Sasa Bakery Hub", contact: "09123456789", address: "KM 10.5, Sasa, Davao City", email: "sasabakery@gmail.com" },
  { customerId: "CST-202", customerName: "Vincent Corp", contact: "09617617843", address: "Davao City", email: "vincent@corp.ph" }
];

export class LocalDB {
  // 1. PULL DATA FROM CLOUD
  static async pullFromTurso(): Promise<void> {
    try {
      const res = await fetch("/api/db/pull");
      const result = await res.json();
      if (result.success && result.data) {
        Object.entries(result.data).forEach(([table, rows]) => {
          localStorage.setItem(`dmis_${table}`, JSON.stringify(rows));
        });
        console.log("✅ Cloud Sync Success");
      }
    } catch (e) {
      console.error("Cloud Pull Failed:", e);
    }
  }

  // 2. CORE STORAGE HELPER (Crash-Proof)
  static get<T>(key: string, initialData: T): T {
    try {
      const data = localStorage.getItem(`dmis_${key}`);
      if (!data) {
        localStorage.setItem(`dmis_${key}`, JSON.stringify(initialData));
        return initialData;
      }
      const parsed = JSON.parse(data);
      // Ensure we return the correct type (usually array)
      return Array.isArray(initialData) && !Array.isArray(parsed) ? initialData : parsed;
    } catch {
      return initialData;
    }
  }

  // 3. UNIVERSAL SYNC PUSH
  static set(table: string, data: any[], skipSync = false) {
    localStorage.setItem(`dmis_${table}`, JSON.stringify(data));
    if (!skipSync) {
      fetch("/api/db/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, rows: data })
      }).catch(err => console.warn(`Cloud push delayed for ${table}`));
    }
  }

  // 4. GETTERS (Wired to Seeds)
  static getUsers() { return this.get("users", initialUsers); }
  static getProducts() { return this.get("products", initialProducts); }
  static getCustomers() { return this.get("customers", initialCustomers); }
  static getOrders() { return this.get("orders", []); }
  static getDeliveries() { return this.get("deliveries", []); }
  static getComplaints() { return this.get("complaints", []); }
  static getAuditLogs() { return this.get("audit_logs", []); }

  // 5. SETTERS (Universal Sync)
  static setUsers(d: any[], s = false) { this.set("users", d, s); }
  static setProducts(d: any[], s = false) { this.set("products", d, s); }
  static setCustomers(d: any[], s = false) { this.set("customers", d, s); }
  static setOrders(d: any[], s = false) { this.set("orders", d, s); }
  static setDeliveries(d: any[], s = false) { this.set("deliveries", d, s); }
  static setComplaints(d: any[], s = false) { this.set("complaints", d, s); }
  static setAuditLogs(d: any[], s = false) { this.set("audit_logs", d, s); }
  
  // 6. AUDIT LOG (Fixed casing for UI)
  static appendLog(userId: string, action: string, tableRef: string) {
    const logs = this.getAuditLogs();
    const newLog = { 
      logId: `LOG-${Date.now()}`, 
      userId, 
      action, 
      timestamp: new Date().toLocaleString(), 
      tableRef 
    };
    logs.unshift(newLog);
    this.setAuditLogs(logs); 
  }

  static reset() {
    localStorage.clear();
    location.reload();
  }
}