export class LocalDB {
  static async pullFromTurso(): Promise<void> {
    try {
      const res = await fetch("/api/db/pull");
      const result = await res.json();
      if (result.success && result.data) {
        Object.entries(result.data).forEach(([table, rows]) => {
          localStorage.setItem(`dmis_${table}`, JSON.stringify(rows));
        });
      }
    } catch (e) { console.error(e); }
  }

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

  // Getters
  static getUsers() { return JSON.parse(localStorage.getItem("dmis_users") || "[]"); }
  static getProducts() { return JSON.parse(localStorage.getItem("dmis_products") || "[]"); }
  static getCustomers() { return JSON.parse(localStorage.getItem("dmis_customers") || "[]"); }
  static getOrders() { return JSON.parse(localStorage.getItem("dmis_orders") || "[]"); }
  static getDeliveries() { return JSON.parse(localStorage.getItem("dmis_deliveries") || "[]"); }
  static getComplaints() { return JSON.parse(localStorage.getItem("dmis_complaints") || "[]"); }
  static getAuditLogs() { return JSON.parse(localStorage.getItem("dmis_audit_logs") || "[]"); }

  // Setters
  static setDeliveries(d: any[]) { this.set("deliveries", d); }
  static setComplaints(d: any[]) { this.set("complaints", d); }
  
  // Logic to prevent the "White Screen"
  static appendLog(UserID: string, Action: string, TableRef: string) {
    const logs = this.getAuditLogs();
    logs.unshift({ 
      LogID: `LOG-${Math.floor(Math.random() * 1000000)}`, 
      UserID: UserID, 
      Action: Action, 
      Timestamp: new Date().toLocaleString(), 
      TableRef: TableRef 
    });
    this.set("audit_logs", logs);
  }
}