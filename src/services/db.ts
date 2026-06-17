export class LocalDB {
  // Pull all ERD tables from Cloud
  static async pullFromTurso(): Promise<void> {
    try {
      const res = await fetch("/api/db/pull");
      const result = await res.json();
      if (result.success && result.data) {
        Object.entries(result.data).forEach(([table, rows]) => {
          localStorage.setItem(`dmis_${table}`, JSON.stringify(rows));
        });
        console.log("✅ ERD Database Synced");
      }
    } catch (e) { console.error(e); }
  }

  // Generic Push
  static set(table: string, data: any[], skipSync = false) {
    localStorage.setItem(`dmis_${table}`, JSON.stringify(data));
    if (!skipSync) {
      fetch("/api/db/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, rows: data })
      });
    }
  }

  // Getters for ERD Tables
  static getUsers() { return JSON.parse(localStorage.getItem("dmis_users") || "[]"); }
  static getProducts() { return JSON.parse(localStorage.getItem("dmis_products") || "[]"); }
  static getCustomers() { return JSON.parse(localStorage.getItem("dmis_customers") || "[]"); }
  static getOrders() { return JSON.parse(localStorage.getItem("dmis_orders") || "[]"); }
  static getOrderItems() { return JSON.parse(localStorage.getItem("dmis_order_items") || "[]"); }
  static getInvoices() { return JSON.parse(localStorage.getItem("dmis_invoices") || "[]"); }
  static getDeliveries() { return JSON.parse(localStorage.getItem("dmis_deliveries") || "[]"); }
  static getComplaints() { return JSON.parse(localStorage.getItem("dmis_complaints") || "[]"); }
  static getAuditLogs() { return JSON.parse(localStorage.getItem("dmis_audit_logs") || "[]"); }

  // Setters (Auto-Sync)
  static setUsers(d: any[]) { this.set("users", d); }
  static setProducts(d: any[]) { this.set("products", d); }
  static setCustomers(d: any[]) { this.set("customers", d); }
  static setOrders(d: any[]) { this.set("orders", d); }
  static setOrderItems(d: any[]) { this.set("order_items", d); }
  static setInvoices(d: any[]) { this.set("invoices", d); }
  static setDeliveries(d: any[]) { this.set("deliveries", d); }
  static setComplaints(d: any[]) { this.set("complaints", d); }
  
  static appendLog(UserID: string, Action: string, TableRef: string) {
    const logs = this.getAuditLogs();
    logs.unshift({ LogID: `LOG-${Date.now()}`, UserID, Action, Timestamp: new Date().toISOString(), TableRef });
    this.set("audit_logs", logs);
  }
}