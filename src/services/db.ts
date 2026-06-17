// Call this when the App first loads to get data from Turso
  static async pullFromTurso(): Promise<void> {
    try {
      const response = await fetch("/api/db/pull");
      if (!response.ok) return;
      
      const result = await response.json();
      if (result.success && result.data) {
        const { users, products, customers, orders, deliveries, complaints, auditLogs } = result.data;
        
        // Save cloud data to localStorage (silent save, don't trigger a push back)
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