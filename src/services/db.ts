import { User, UserRole, UserStatus, Product, Customer, Order, AuditLog } from "../types";

const initialUsers: User[] = [
  { userId: "USR-001", username: "admin", name: "Rufino N. Libranza Jr.", role: UserRole.Proprietor, status: UserStatus.Active }
];

export class LocalDB {
  static async pullFromTurso(): Promise<void> {
    try {
      const response = await fetch("/api/db/pull");
      const result = await response.json();
      if (result.success && result.data) {
        // Use skipSync=true to avoid infinite loop
        if (result.data.users) this.setUsers(result.data.users, true);
        if (result.data.products) this.setProducts(result.data.products, true);
        if (result.data.customers) this.setCustomers(result.data.customers, true);
        if (result.data.orders) this.setOrders(result.data.orders, true);
        console.log("✅ Synced from Turso Cloud");
      }
    } catch (err) {
      console.error("Pull failed:", err);
    }
  }

  // Helpers
  static get<T>(key: string, initialData: T): T {
    const data = localStorage.getItem(`dmis_${key}`);
    return data ? JSON.parse(data) : initialData;
  }

  static set<T>(key: string, data: T, skipSync = false): void {
    localStorage.setItem(`dmis_${key}`, JSON.stringify(data));
    if (!skipSync) {
       fetch("/api/db/push", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ table: key, rows: data })
       }).catch(console.error);
    }
  }

  static getUsers(): User[] { return this.get("users", initialUsers); }
  static setUsers(u: User[], s = false) { this.set("users", u, s); }
  static getProducts(): Product[] { return this.get("products", []); }
  static setProducts(p: Product[], s = false) { this.set("products", p, s); }
  static getCustomers(): Customer[] { return this.get("customers", []); }
  static setCustomers(c: Customer[], s = false) { this.set("customers", c, s); }
  static getOrders(): Order[] { return this.get("orders", []); }
  static setOrders(o: Order[], s = false) { this.set("orders", o, s); }
}