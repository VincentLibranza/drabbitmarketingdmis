export class LocalDB {
  // 1. PULL DATA FROM CLOUD
  static async pullFromTurso(): Promise<void> {
    try {
      const res = await fetch("/api/db/pull");
      const result = await res.json();
      if (result.success && result.data) {
        // Automatically save all 9 tables to browser storage
        Object.entries(result.data).forEach(([table, rows]) => {
          localStorage.setItem(`dmis_${table}`, JSON.stringify(rows));
        });
        console.log("✅ All Database Tables Synced from Cloud");
      }
    } catch (e) {
      console.error("Cloud Pull Error:", e);
    }
  }

  // 2. CORE STORAGE HELPER
  static get<T>(key: string, initialData: T): T {
    try {
      const data = localStorage.getItem(`dmis_${key}`);
      return data ? JSON.parse(data) : initialData;
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
      }).catch(err => console.warn(`Cloud sync delayed for ${table}`));
    }
  }

  // 4. GETTERS (Matches your UI Component expectations)
  static getUsers() { return this.get("users", []); }
  static getProducts() { return this.get("products", []); }
  static getCustomers() { return this.get("customers", []); }
  static getOrders() { return this.get("orders", []); }
  static getDeliveries() { return this.get("deliveries", []); }
  static getComplaints() { return this.get("complaints", []); }
  static getAuditLogs() { return this.get("audit_logs", []); }

  // 5. SETTERS (Triggers automatic Cloud saving)
  static setUsers(d: any[], s = false) { this.set("users", d, s); }
  static setProducts(d: any[], s = false) { this.set("products", d, s); }
  static setCustomers(d: any[], s = false) { this.set("customers", d, s); }
  static setOrders(d: any[], s = false) { this.set("orders", d, s); }
  static setDeliveries(d: any[], s = false) { this.set("deliveries", d, s); }
  static setComplaints(d: any[], s = false) { this.set("complaints", d, s); }
  static setAuditLogs(d: any[], s = false) { this.set("audit_logs", d, s); }
  
  // 6. FIXED AUDIT LOG (Uses lowercase keys to prevent UI White Screen)
  static appendLog(userId: string, action: string, tableRef: string) {
    const logs = this.getAuditLogs();
    const newLog = { 
      logId: `LOG-${Date.now()}`, 
      userId: userId, 
      action: action, 
      timestamp: new Date().toLocaleString(), 
      tableRef: tableRef 
    };
    logs.unshift(newLog);
    this.setAuditLogs(logs); // Triggers auto-push
  }

  static reset() {
    localStorage.clear();
    location.reload();
  }
}