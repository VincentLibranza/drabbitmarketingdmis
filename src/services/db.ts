import { User, UserRole, UserStatus, Product, Customer, Order, AuditLog } from "../types";

const initialUsers: User[] = [
  { userId: "USR-001", username: "admin", name: "Rufino N. Libranza Jr.", role: UserRole.Proprietor, status: UserStatus.Active }
];

export class LocalDB {
  // Safe LocalStorage Getter
  static get<T>(key: string, initialData: T): T {
    try {
      const data = localStorage.getItem(`dmis_${key}`);
      if (!data) return initialData;
      const parsed = JSON.parse(data);
      // Return initialData if parsed isn't an array (to prevent crashes)
      return Array.isArray(initialData) && !Array.isArray(parsed) ? initialData : parsed;
    } catch { return initialData; }
  }

  // Safe LocalStorage Setter + Auto Cloud Sync
  static set<T>(key: string, data: T, skipSync = false): void {
    localStorage.setItem(`dmis_${key}`, JSON.stringify(data));
    if (!skipSync) {
      fetch("/api/db/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: key, rows: data })
      }).catch(err => console.warn(`Cloud Sync Delayed for ${key}:`, err));
    }
  }

  // Cloud Pull
  static async pullFromTurso(): Promise<void> {
    try {
      const res = await fetch("/api/db/pull");
      if (!res.ok) return;
      const result = await res.json();
      if (result.success && result.data) {
        if (result.data.users) this.setUsers(result.data.users, true);
        if (result.data.products) this.setProducts(result.data.products, true);
        if (result.data.customers) this.setCustomers(result.data.customers, true);
        if (result.data.orders) this.setOrders(result.data.orders, true);
      }
    } catch (e) { console.error("Cloud Pull Failed:", e); }
  }

  // Typed Handlers
  static getUsers(): User[] { return this.get("users", initialUsers); }
  static setUsers(u: User[], s = false) { this.set("users", u, s); }
  
  static getProducts(): Product[] { return this.get("products", []); }
  static setProducts(p: Product[], s = false) { this.set("products", p, s); }
  
  static getCustomers(): Customer[] { return this.get("customers", []); }
  static setCustomers(c: Customer[], s = false) { this.set("customers", c, s); }
  
  static getOrders(): Order[] { return this.get("orders", []); }
  static setOrders(o: Order[], s = false) { this.set("orders", o, s); }

  static getAuditLogs(): any[] { return this.get("audit_logs", []); }
  static appendLog(username: string, action: string, tableRef: string) {
    const logs = this.getAuditLogs();
    logs.unshift({ logId: `LOG-${Date.now()}`, username, action, timestamp: new Date().toISOString(), tableRef });
    this.set("audit_logs", logs, true);
  }
}