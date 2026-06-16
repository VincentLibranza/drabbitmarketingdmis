import express from "express";
import path from "path";
import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Setup Turso Database client
// Falls back to standard local file:local.db if no env is set
const dbUrl = process.env.TURSO_DATABASE_URL || "file:local.db";
const dbAuthToken = process.env.TURSO_AUTH_TOKEN || undefined;

console.log(`Connecting to Turso Database via: ${dbUrl}`);
const db = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});

// Configure base middleware
app.use(express.json({ limit: "50mb" }));

// Initialize SQLite/Turso tables and seed data
async function initDb() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        userId TEXT PRIMARY KEY,
        username TEXT,
        name TEXT,
        role TEXT,
        status TEXT
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        productId TEXT PRIMARY KEY,
        productName TEXT,
        category TEXT,
        unitPrice REAL,
        stockQuantity INTEGER,
        reorderThreshold INTEGER
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        customerId TEXT PRIMARY KEY,
        customerName TEXT,
        contact TEXT,
        address TEXT,
        email TEXT,
        tin TEXT
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        orderId TEXT PRIMARY KEY,
        orderRefNo TEXT,
        customerId TEXT,
        orderDate TEXT,
        status TEXT,
        paymentStatus TEXT,
        totalAmount REAL,
        dueDate TEXT,
        items TEXT
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS deliveries (
        deliveryId TEXT PRIMARY KEY,
        orderId TEXT,
        scheduledDate TEXT,
        deliveryDate TEXT,
        status TEXT,
        assignedDriver TEXT
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS complaints (
        complaintId TEXT PRIMARY KEY,
        customerId TEXT,
        productId TEXT,
        description TEXT,
        status TEXT,
        resolution TEXT,
        dateLogged TEXT
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        logId TEXT PRIMARY KEY,
        username TEXT,
        action TEXT,
        timestamp TEXT,
        tableRef TEXT
      )
    `);

    // Seed Users if empty
    const userCheck = await db.execute("SELECT COUNT(*) as count FROM users");
    if (Number(userCheck.rows[0].count) === 0) {
      console.log("Seeding users table...");
      const initialUsers = [
        { userId: "USR-001", username: "admin", name: "Rufino N. Libranza Jr.", role: "Proprietor", status: "Active" },
        { userId: "USR-002", username: "staff", name: "Zian Wayne Matunding", role: "Staff", status: "Active" },
        { userId: "USR-003", username: "vincent", name: "Vincent Jon Libranza", role: "Staff", status: "Active" }
      ];
      const statements = initialUsers.map(u => ({
        sql: "INSERT INTO users (userId, username, name, role, status) VALUES (?, ?, ?, ?, ?)",
        args: [u.userId, u.username, u.name, u.role, u.status],
      }));
      await db.batch(statements, "write");
    }

    // Seed Products if empty
    const productCheck = await db.execute("SELECT COUNT(*) as count FROM products");
    if (Number(productCheck.rows[0].count) === 0) {
      console.log("Seeding products table...");
      const initialProducts = [
        { productId: "PRD-101", productName: "HDPE T-Shirt Plastic Bag (Medium - 50pcs)", category: "Plastic Bags", unitPrice: 45.0, stockQuantity: 120, reorderThreshold: 30 },
        { productId: "PRD-102", productName: "LDPE Plain Shopping Bag (Large - 100pcs)", category: "Plastic Bags", unitPrice: 120.0, stockQuantity: 15, reorderThreshold: 20 },
        { productId: "PRD-103", productName: "Heavy Duty Black Trash Bag (Large - 10pcs)", category: "Trash Bags", unitPrice: 85.0, stockQuantity: 200, reorderThreshold: 50 },
        { productId: "PRD-104", productName: "Yellow Premium Biohazard Trash Bag (Medium)", category: "Trash Bags", unitPrice: 110.0, stockQuantity: 9, reorderThreshold: 15 },
        { productId: "PRD-105", productName: "Microwavable Plastic Container (500ml - 5pcs)", category: "Plastic Containers", unitPrice: 65.0, stockQuantity: 450, reorderThreshold: 100 },
        { productId: "PRD-106", productName: "Food-Grade Cling Wrap Roll (30cm x 100m)", category: "Cling Wrap", unitPrice: 180.0, stockQuantity: 80, reorderThreshold: 25 },
        { productId: "PRD-107", productName: "Aluminum Foil Premium Wrap (12in x 75m)", category: "Aluminum Foil", unitPrice: 220.0, stockQuantity: 42, reorderThreshold: 15 }
      ];
      const statements = initialProducts.map(p => ({
        sql: "INSERT INTO products (productId, productName, category, unitPrice, stockQuantity, reorderThreshold) VALUES (?, ?, ?, ?, ?, ?)",
        args: [p.productId, p.productName, p.category, p.unitPrice, p.stockQuantity, p.reorderThreshold]
      }));
      await db.batch(statements, "write");
    }

    // Seed Customers if empty
    const customerCheck = await db.execute("SELECT COUNT(*) as count FROM customers");
    if (Number(customerCheck.rows[0].count) === 0) {
      console.log("Seeding customers table...");
      const initialCustomers = [
        { customerId: "CST-201", customerName: "Sasa Bakery Hub", contact: "+63 912 345 6789", address: "KM 10.5, Sasa, Davao City", email: "sasabakery@gmail.com", tin: "401-229-301-000" },
        { customerId: "CST-202", customerName: "Davao Fresh Fishery", contact: "+63 945 888 1234", address: "Daliao Fish Port, Toril, Davao City", email: "orders@davaofresh.ph", tin: "112-983-049-000" },
        { customerId: "CST-203", customerName: "Agdao Supermart", contact: "+63 928 777 9900", address: "Agdao Public Market, Davao City", email: "agdaomart@yahoo.com", tin: "561-220-431-000" },
        { customerId: "CST-204", customerName: "MMCM Cafeteria", contact: "+63 917 555 4321", address: "Mapua Malayan Colleges Mindanao, MacArthur Highway, Davao City", email: "canteen@mmcm.edu.ph", tin: "990-210-994-000" }
      ];
      const statements = initialCustomers.map(c => ({
        sql: "INSERT INTO customers (customerId, customerName, contact, address, email, tin) VALUES (?, ?, ?, ?, ?, ?)",
        args: [c.customerId, c.customerName, c.contact, c.address, c.email, c.tin]
      }));
      await db.batch(statements, "write");
    }

    // Seed Orders if empty
    const orderCheck = await db.execute("SELECT COUNT(*) as count FROM orders");
    if (Number(orderCheck.rows[0].count) === 0) {
      console.log("Seeding orders table...");
      const initialOrders = [
        {
          orderId: "ORD-301",
          orderRefNo: "DMIS-ORD-1001",
          customerId: "CST-201",
          orderDate: "2026-06-11T09:30:00",
          status: "Delivered",
          paymentStatus: "Paid",
          totalAmount: 1550.0,
          dueDate: "2026-06-18",
          items: JSON.stringify([
            { itemId: "ITEM-301-1", orderId: "ORD-301", productId: "PRD-101", quantity: 10, unitPrice: 45.0 },
            { itemId: "ITEM-301-2", orderId: "ORD-301", productId: "PRD-106", quantity: 5, unitPrice: 180.0 },
            { itemId: "ITEM-301-3", orderId: "ORD-301", productId: "PRD-107", quantity: 1, unitPrice: 200.0 }
          ])
        },
        {
          orderId: "ORD-302",
          orderRefNo: "DMIS-ORD-1002",
          customerId: "CST-202",
          orderDate: "2026-06-13T14:15:00",
          status: "Dispatched",
          paymentStatus: "Partial",
          totalAmount: 2470.0,
          dueDate: "2026-06-20",
          items: JSON.stringify([
            { itemId: "ITEM-302-1", orderId: "ORD-302", productId: "PRD-103", quantity: 20, unitPrice: 85.0 },
            { itemId: "ITEM-302-2", orderId: "ORD-302", productId: "PRD-105", quantity: 10, unitPrice: 65.0 },
            { itemId: "ITEM-302-3", orderId: "ORD-302", productId: "PRD-107", quantity: 4, unitPrice: 220.0 }
          ])
        },
        {
          orderId: "ORD-303",
          orderRefNo: "DMIS-ORD-1003",
          customerId: "CST-204",
          orderDate: "2026-06-15T11:00:00",
          status: "Pending",
          paymentStatus: "Unpaid",
          totalAmount: 495.0,
          dueDate: "2026-06-22",
          items: JSON.stringify([
            { itemId: "ITEM-303-1", orderId: "ORD-303", productId: "PRD-101", quantity: 11, unitPrice: 45.0 }
          ])
        }
      ];
      const statements = initialOrders.map(o => ({
        sql: "INSERT INTO orders (orderId, orderRefNo, customerId, orderDate, status, paymentStatus, totalAmount, dueDate, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [o.orderId, o.orderRefNo, o.customerId, o.orderDate, o.status, o.paymentStatus, o.totalAmount, o.dueDate, o.items]
      }));
      await db.batch(statements, "write");
    }

    // Seed Deliveries if empty
    const deliveryCheck = await db.execute("SELECT COUNT(*) as count FROM deliveries");
    if (Number(deliveryCheck.rows[0].count) === 0) {
      console.log("Seeding deliveries table...");
      const initialDeliveries = [
        { deliveryId: "DLV-401", orderId: "ORD-301", scheduledDate: "2026-06-12", deliveryDate: "2026-06-12 15:45", status: "Delivered", assignedDriver: "Benny Santos (Truck A)" },
        { deliveryId: "DLV-402", orderId: "ORD-302", scheduledDate: "2026-06-16", deliveryDate: null, status: "In Transit", assignedDriver: "Jun-Jun Alcantara (Multi-cab B)" }
      ];
      const statements = initialDeliveries.map(d => ({
        sql: "INSERT INTO deliveries (deliveryId, orderId, scheduledDate, deliveryDate, status, assignedDriver) VALUES (?, ?, ?, ?, ?, ?)",
        args: [d.deliveryId, d.orderId, d.scheduledDate, d.deliveryDate, d.status, d.assignedDriver]
      }));
      await db.batch(statements, "write");
    }

    // Seed Complaints if empty
    const complaintCheck = await db.execute("SELECT COUNT(*) as count FROM complaints");
    if (Number(complaintCheck.rows[0].count) === 0) {
      console.log("Seeding complaints table...");
      const initialComplaints = [
        { complaintId: "CMP-501", customerId: "CST-202", productId: "PRD-103", description: "Item carton damaged during delivery. Requesting replacement for 2 units.", status: "InProgress", resolution: null, dateLogged: "2026-06-14T08:00:00" },
        { complaintId: "CMP-502", customerId: "CST-201", productId: "PRD-106", description: "Wrong size of cling wrap delivered vs ordered. Quickly resolved by swapping size.", status: "Resolved", resolution: "Swapped standard 30cm cling wrap with correct size. Customer satisfied.", dateLogged: "2026-06-12T13:20:00" }
      ];
      const statements = initialComplaints.map(c => ({
        sql: "INSERT INTO complaints (complaintId, customerId, productId, description, status, resolution, dateLogged) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [c.complaintId, c.customerId, c.productId, c.description, c.status, c.resolution, c.dateLogged]
      }));
      await db.batch(statements, "write");
    }

    // Seed Audit Logs if empty
    const auditCheck = await db.execute("SELECT COUNT(*) as count FROM audit_logs");
    if (Number(auditCheck.rows[0].count) === 0) {
      console.log("Seeding audit_logs table...");
      const initialAuditLogs = [
        { logId: "LOG-601", username: "admin", action: "System Initialization and Seed Data Loaded Successfully", timestamp: "2026-06-15T14:02:54-07:00", tableRef: "SYSTEM" }
      ];
      const statements = initialAuditLogs.map(a => ({
        sql: "INSERT INTO audit_logs (logId, username, action, timestamp, tableRef) VALUES (?, ?, ?, ?, ?)",
        args: [a.logId, a.username, a.action, a.timestamp, a.tableRef]
      }));
      await db.batch(statements, "write");
    }

    console.log("Turso Database initialized perfectly!");
  } catch (err) {
    console.error("Failed to initialize database tables/seeds:", err);
  }
}

// Database initialization called sequentially in startServer below

// --- API ROUTES ---

// 1. Unified pull endpoint to load all state at startup
app.get("/api/db/pull", async (req, res) => {
  try {
    const usersRes = await db.execute("SELECT * FROM users");
    const productsRes = await db.execute("SELECT * FROM products");
    const customersRes = await db.execute("SELECT * FROM customers");
    const ordersRes = await db.execute("SELECT * FROM orders");
    const deliveriesRes = await db.execute("SELECT * FROM deliveries");
    const complaintsRes = await db.execute("SELECT * FROM complaints");
    const auditLogsRes = await db.execute("SELECT * FROM audit_logs");

    // Format results correctly
    const users = usersRes.rows;
    const products = productsRes.rows;
    const customers = customersRes.rows;
    
    // Parse JSON items array on order objects
    const orders = ordersRes.rows.map((row: any) => {
      let parsedItems = [];
      try {
        if (row.items) {
          parsedItems = JSON.parse(row.items);
        }
      } catch (e) {
        console.error(`Failed parsing items for order ${row.orderId}`, e);
      }
      return {
        ...row,
        items: parsedItems,
      };
    });

    const deliveries = deliveriesRes.rows;
    const complaints = complaintsRes.rows;
    const auditLogs = auditLogsRes.rows;

    res.json({
      success: true,
      data: {
        users,
        products,
        customers,
        orders,
        deliveries,
        complaints,
        auditLogs,
      },
    });
  } catch (error: any) {
    console.error("Error pulling database state:", error);
    res.status(500).json({ error: error.message || "Failed to pull database data" });
  }
});

// 2. Incremental or batch push endpoint to sync table data
app.post("/api/db/push", async (req, res) => {
  const { table, rows } = req.body;
  if (!table || !Array.isArray(rows)) {
    return res.status(400).json({ error: "Invalid payload. Table name and rows array required." });
  }

  try {
    const statements: any[] = [];

    if (table === "users") {
      statements.push("DELETE FROM users");
      for (const row of rows) {
        statements.push({
          sql: "INSERT INTO users (userId, username, name, role, status) VALUES (?, ?, ?, ?, ?)",
          args: [
            row.userId, 
            row.username ?? null, 
            row.name ?? null, 
            row.role ?? null, 
            row.status ?? null
          ],
        });
      }
    } else if (table === "products") {
      statements.push("DELETE FROM products");
      for (const row of rows) {
        statements.push({
          sql: "INSERT INTO products (productId, productName, category, unitPrice, stockQuantity, reorderThreshold) VALUES (?, ?, ?, ?, ?, ?)",
          args: [
            row.productId, 
            row.productName ?? null, 
            row.category ?? null, 
            row.unitPrice ?? null, 
            row.stockQuantity ?? null, 
            row.reorderThreshold ?? null
          ],
        });
      }
    } else if (table === "customers") {
      statements.push("DELETE FROM customers");
      for (const row of rows) {
        statements.push({
          sql: "INSERT INTO customers (customerId, customerName, contact, address, email, tin) VALUES (?, ?, ?, ?, ?, ?)",
          args: [
            row.customerId, 
            row.customerName ?? null, 
            row.contact ?? null, 
            row.address ?? null, 
            row.email ?? null, 
            row.tin ?? null
          ],
        });
      }
    } else if (table === "orders") {
      statements.push("DELETE FROM orders");
      for (const row of rows) {
        statements.push({
          sql: "INSERT INTO orders (orderId, orderRefNo, customerId, orderDate, status, paymentStatus, totalAmount, dueDate, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          args: [
            row.orderId,
            row.orderRefNo ?? null,
            row.customerId ?? null,
            row.orderDate ?? null,
            row.status ?? null,
            row.paymentStatus ?? null,
            row.totalAmount ?? null,
            row.dueDate ?? null,
            JSON.stringify(row.items || []),
          ],
        });
      }
    } else if (table === "deliveries") {
      statements.push("DELETE FROM deliveries");
      for (const row of rows) {
        statements.push({
          sql: "INSERT INTO deliveries (deliveryId, orderId, scheduledDate, deliveryDate, status, assignedDriver) VALUES (?, ?, ?, ?, ?, ?)",
          args: [
            row.deliveryId, 
            row.orderId ?? null, 
            row.scheduledDate ?? null, 
            row.deliveryDate ?? null, 
            row.status ?? null, 
            row.assignedDriver ?? null
          ],
        });
      }
    } else if (table === "complaints") {
      statements.push("DELETE FROM complaints");
      for (const row of rows) {
        statements.push({
          sql: "INSERT INTO complaints (complaintId, customerId, productId, description, status, resolution, dateLogged) VALUES (?, ?, ?, ?, ?, ?, ?)",
          args: [
            row.complaintId, 
            row.customerId ?? null, 
            row.productId ?? null, 
            row.description ?? null, 
            row.status ?? null, 
            row.resolution ?? null, 
            row.dateLogged ?? null
          ],
        });
      }
    } else if (table === "audit_logs") {
      statements.push("DELETE FROM audit_logs");
      for (const row of rows) {
        statements.push({
          sql: "INSERT INTO audit_logs (logId, username, action, timestamp, tableRef) VALUES (?, ?, ?, ?, ?)",
          args: [
            row.logId, 
            row.username ?? null, 
            row.action ?? null, 
            row.timestamp ?? null, 
            row.tableRef ?? null
          ],
        });
      }
    } else {
      return res.status(400).json({ error: "Unknown table name." });
    }

    if (statements.length > 0) {
      await db.batch(statements, "write");
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error(`Error executing push sync batch for table: ${table}`, error);
    res.status(500).json({ error: error.message || `Failed to push sync data to table: ${table}` });
  }
});

// 3. Clear and Reset DB default endpoint
app.post("/api/db/reset", async (req, res) => {
  try {
    await db.batch([
      "DROP TABLE IF EXISTS users",
      "DROP TABLE IF EXISTS products",
      "DROP TABLE IF EXISTS customers",
      "DROP TABLE IF EXISTS orders",
      "DROP TABLE IF EXISTS deliveries",
      "DROP TABLE IF EXISTS complaints",
      "DROP TABLE IF EXISTS audit_logs"
    ], "write");

    await initDb();
    res.json({ success: true, message: "Turso database tables dropped and reset to baseline Davao Sasa defaults!" });
  } catch (error: any) {
    console.error("Error resetting database:", error);
    res.status(500).json({ error: error.message || "Failed to drop and reset database state" });
  }
});

// --- SERVER STARTUP WRAPPER ---
async function startServer() {
  // Initialize SQLite/Turso tables and seeds sequentially on start
  await initDb();

  // --- VITE MIDDLEWARE / STATIC SERVING CONFIG ---
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite development server middleware dynamically
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static server
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express multi-tier server listening at http://0.0.0.0:${PORT}`);
  });
}

if (process.env.VERCEL !== "1") {
  startServer();
} else {
  // On Vercel, trigger DB initialization once when the lambda environment is cold-booted
  initDb().catch(err => console.error("Cold start database init error:", err));
}

export { app, initDb };
export default app;
