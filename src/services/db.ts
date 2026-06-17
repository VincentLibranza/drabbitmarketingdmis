// --- SEED DATA ---
const initialUsers = [
  { userId: "USR-001", username: "admin", name: "Rufino N. Libranza Jr.", role: "Proprietor", status: "Active" }
];

export class LocalDB {
  // 1. PULL DATA FROM CLOUD
  static async pullFromTurso(): Promise<void> {
    try {
      const res = await fetch("/api/db/pull");
      const result = await res.json();
      if (result.success && result.data) {
        // Automatically save all tables (users, products, customers, etc.)
        Object.entries(result.data).forEach(([table, rows]) => {
          localStorage.setItem(`dmis_${table}`, JSON.stringify(rows));
        });
        console.log("✅ Cloud Data Synced Successfully");
      }
    } catch (e) {
      console.error("Cloud Pull Failed:", e);
    }
  }

  // 2. CORE STORAGE HELPER (Safe against crashes)
  static get<T>(key: string, initialData: T): T {
    try {
      const data = localStorage.getItem(`dmis_${key}`);
      if (!data) return initialData;
      const parsed = JSON.parse(data);
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
      }).catch(err => console.error("Sync Push Error:", err));
    }
  }

  // 4. FIXED GETTERS (Now uses the safe 'get' helper)
  static getUsers() { return this.get("users", initialUsers); }
  static getProducts() { return this.get("products", []); }
  static getCustomers() { return this.get("customers", []); }
  static getOrders() { return this.get("orders", []); }
  static getDeliveries() { return this.get("deliveries", []); }
  static getComplaints() { return this.get("complaints", []); }
  static getAuditLogs() { return this.get("audit_logs", []); }

  // 5. SETTERS
  static setUsers(d: any[], s = false) { this.set("users", d, s); }
  static setProducts(d: any[], s = false) { this.set("products", d, s); }
  static setCustomers(d: any[], s = false) { this.set("customers", d, s); }
  static setOrders(d: any[], s = false) { this.set("orders", d, s); }
  static setDeliveries(d: any[], s = false) { this.set("deliveries", d, s); }
  static setComplaints(d: any[], s = false) { this.set("complaints", d, s); }
  static setAuditLogs(d: any[], s = false) { this.set("audit_logs", d, s); }
  
  // 6. AUDIT LOG (Fixed casing to match UI)
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