import express from "express";
import path from "path";
import fs from "fs";
import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Setup Turso Database client with lazy initialization & quote normalization
let rawUrl = (process.env.TURSO_DATABASE_URL || "").trim();
let rawToken = (process.env.TURSO_AUTH_TOKEN || "").trim();

const configFilePath = path.join(process.cwd(), "turso-config.json");

if (!rawUrl && fs.existsSync(configFilePath)) {
  try {
    const fileContent = fs.readFileSync(configFilePath, "utf8");
    const parsed = JSON.parse(fileContent);
    if (parsed.databaseUrl) {
      rawUrl = parsed.databaseUrl.trim();
      rawToken = (parsed.authToken || "").trim();
      console.log(`[Turso Config] Restored database connection URL from turso-config.json: ${rawUrl}`);
    }
  } catch (err) {
    console.error("[Turso Config] Failed to read turso-config.json:", err);
  }
}

// Strip wrap-around quotes (single/double) if they are present in env variables
if (rawUrl) {
  if (rawUrl.startsWith('"') && rawUrl.endsWith('"')) {
    rawUrl = rawUrl.slice(1, -1).trim();
  } else if (rawUrl.startsWith("'") && rawUrl.endsWith("'")) {
    rawUrl = rawUrl.slice(1, -1).trim();
  }
}
if (rawToken) {
  if (rawToken.startsWith('"') && rawToken.endsWith('"')) {
    rawToken = rawToken.slice(1, -1).trim();
  } else if (rawToken.startsWith("'") && rawToken.endsWith("'")) {
    rawToken = rawToken.slice(1, -1).trim();
  }
}

// Fallback to persistent local file-based database so changes survive backend server reloads
export let dbUrl = rawUrl || "file:local.db";
export let dbAuthToken = rawToken || undefined;

let dbClientInstance: any = null;

function getDbClient() {
  if (!dbClientInstance) {
    if (!dbUrl) {
      throw new Error("No database URL configured. Please set TURSO_DATABASE_URL environment variable.");
    }
    console.log(`Initializing LibSQL connection via: ${dbUrl}`);
    dbClientInstance = createClient({
      url: dbUrl,
      authToken: dbAuthToken,
    });
  }
  return dbClientInstance;
}

async function executeWithRetry<T>(fn: () => Promise<T>, maxRetries = 5, initialDelay = 1000): Promise<T> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errMsg = err.message || String(err);
      const isTransient = 
        errMsg.includes("502") || 
        errMsg.includes("503") || 
        errMsg.includes("504") ||
        errMsg.includes("SERVER_ERROR") ||
        errMsg.includes("HttpServerError") ||
        errMsg.includes("socket hang up") ||
        errMsg.includes("ETIMEDOUT") ||
        errMsg.includes("ECONNRESET");

      if (isTransient && attempt < maxRetries) {
        const nextDelay = initialDelay * Math.pow(1.5, attempt - 1);
        console.warn(`[Database Retry] Transient DB error (attempt ${attempt}/${maxRetries}): ${errMsg}. Retrying in ${Math.round(nextDelay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, nextDelay));
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

// Transparent lazy evaluation proxy matching the original SQL executive API
export const db = {
  execute(stmt: any): Promise<any> {
    return executeWithRetry<any>(() => getDbClient().execute(stmt));
  },
  batch(stmts: any[], mode?: any): Promise<any> {
    return executeWithRetry<any>(() => getDbClient().batch(stmts, mode));
  }
};

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
  } catch (err: any) {
    console.error("Failed to initialize remote database tables/seeds:", err);
    if (dbUrl !== "file:local.db") {
      console.warn("⚠️ Remote database connection failed (e.g. 401 Unauthorized or network error). Falling back to local file database: file:local.db...");
      dbClientInstance = null;
      dbUrl = "file:local.db";
      dbAuthToken = undefined;
      // Re-run the initialization with the local SQLite database file
      await initDb();
    } else {
      throw err; // Rethrow if even the local file initialization fails
    }
  }
}

// Database initialization called sequentially in startServer below

// Cache for Db initialization state
let dbInitialized = false;
let initPromise: Promise<void> | null = null;

async function ensureDb() {
  if (dbInitialized) return;
  if (!initPromise) {
    initPromise = initDb()
      .then(() => {
        dbInitialized = true;
      })
      .catch((err) => {
        initPromise = null; // allow retry
        throw err;
      });
  }
  await initPromise;
}

// Middeware to guarantee DB initialization before executing DB routes
app.use(async (req, res, next) => {
  // Only require DB initialization for operations that actually read or write database content (pull or push)
  // This allows the configuration (/db/configure) and status (/db/status) endpoints to load unblocked even if the DB is misconfigured
  if (req.path.includes("/db/pull") || req.path.includes("/db/push")) {
    try {
      await ensureDb();
    } catch (err: any) {
      console.error("Database initialization failed on request stream:", err);
      return res.status(500).json({ error: "Failed to initialize remote database: " + err.message });
    }
  }
  next();
});

// --- API ROUTES ---

// Diagnostic endpoint to check Turso cloud connection status
app.get(["/api/db/status", "/db/status"], (req, res) => {
  let maskedUrl = "Unconfigured (Pending Connection)";
  let isRemote = false;
  
  if (dbUrl && dbUrl !== "file::memory:" && dbUrl !== "file:local.db") {
    isRemote = true;
    if (dbUrl.startsWith("libsql://")) {
      const parts = dbUrl.replace("libsql://", "").split(".");
      const firstPart = parts[0] ? (parts[0].length > 6 ? parts[0].substring(0, 3) + "***" + parts[0].slice(-3) : "***") : "***";
      maskedUrl = `libsql://${firstPart}.${parts.slice(1).join(".")}`;
    } else {
      maskedUrl = dbUrl.substring(0, 10) + "..." + dbUrl.slice(-5);
    }
  }
  
  res.json({
    connectionType: "Turso Cloud Database",
    databaseUrl: maskedUrl,
    rawDatabaseUrl: isRemote ? dbUrl : "",
    isRemote,
  });
});

// Endpoint to dynamically configure Turso database at runtime (cloud sync)
app.post(["/api/db/configure", "/db/configure"], async (req, res) => {
  const { databaseUrl, authToken } = req.body;
  if (!databaseUrl) {
    return res.status(400).json({ error: "TURSO_DATABASE_URL is required." });
  }

  try {
    console.log(`Dynamically connecting to Turso Database: ${databaseUrl}`);
    const client = createClient({
      url: databaseUrl,
      authToken: authToken || undefined,
    });

    // Verify connection by running a query
    await client.execute("SELECT 1");

    // Clear db initialized flags of our server
    dbInitialized = false;
    initPromise = null;

    // Apply the active references
    dbClientInstance = client;
    dbUrl = databaseUrl;
    dbAuthToken = authToken || undefined;

    // Save to turso-config.json so it persists across container/server cold-starts
    try {
      fs.writeFileSync(
        configFilePath,
        JSON.stringify({ databaseUrl, authToken }, null, 2),
        "utf8"
      );
      console.log("[Turso Config] Saved db configuration to turso-config.json");
    } catch (saveErr) {
      console.error("[Turso Config] Failed saving config file:", saveErr);
    }

    // Initialize/migrate the newly connected Turso database tables if needed
    await ensureDb();

    let maskedUrl = databaseUrl;
    if (databaseUrl.startsWith("libsql://")) {
      const parts = databaseUrl.replace("libsql://", "").split(".");
      const firstPart = parts[0] ? (parts[0].length > 6 ? parts[0].substring(0, 3) + "***" + parts[0].slice(-2) : "***") : "***";
      maskedUrl = `libsql://${firstPart}.${parts.slice(1).join(".")}`;
    }

    res.json({
      success: true,
      message: "Successfully connected to cloud Turso database and initialized tables!",
      connectionType: "Turso Cloud Database",
      databaseUrl: maskedUrl,
      isRemote: true
    });
  } catch (err: any) {
    console.error("Failed to dynamically configure Turso cloud database:", err);
    res.status(400).json({ error: "Failed to connect to the database: " + err.message });
  }
});

// 1. Unified pull endpoint to load all state at startup (supports both Vercel stripped and standard paths)
app.get(["/api/db/pull", "/db/pull"], async (req, res) => {
  const currentDbUrl = dbUrl || "file:local.db";
  console.log(`[DB Pull Proxy] Pull requested. Loading dataset from Turso Database at: ${currentDbUrl}`);

  try {
    const [
      usersRes,
      productsRes,
      customersRes,
      ordersRes,
      deliveriesRes,
      complaintsRes,
      auditLogsRes
    ] = await Promise.all([
      db.execute("SELECT * FROM users"),
      db.execute("SELECT * FROM products"),
      db.execute("SELECT * FROM customers"),
      db.execute("SELECT * FROM orders"),
      db.execute("SELECT * FROM deliveries"),
      db.execute("SELECT * FROM complaints"),
      db.execute("SELECT * FROM audit_logs")
    ]);

    // Format results correctly
    const users = usersRes.rows;
    const products = productsRes.rows;
    const customers = customersRes.rows;
    
    // Parse JSON items array on order objects
    const orders = ordersRes.rows.map((row: any) => {
      let parsedItems = [];
      try {
        if (row.items) {
          if (typeof row.items === "string") {
            parsedItems = JSON.parse(row.items);
          } else if (Array.isArray(row.items)) {
            parsedItems = row.items;
          }
        }
      } catch (e: any) {
        console.error(`[DB Pull Proxy] Failed parsing items JSON for order ${row.orderId || "unknown"}:`, e.message || e);
      }
      return {
        ...row,
        items: parsedItems,
      };
    });

    const deliveries = deliveriesRes.rows;
    const complaints = complaintsRes.rows;
    const auditLogs = auditLogsRes.rows;

    console.log(`[DB Pull Proxy] Load successful. Row counts: users=${users.length}, products=${products.length}, customers=${customers.length}, orders=${orders.length}, deliveries=${deliveries.length}, complaints=${complaints.length}, auditLogs=${auditLogs.length}`);

    let maskedUrl = "Unconfigured (Pending Connection)";
    let isRemote = false;
    
    if (dbUrl && dbUrl !== "file::memory:" && dbUrl !== "file:local.db") {
       isRemote = true;
       if (dbUrl.startsWith("libsql://")) {
         const parts = dbUrl.replace("libsql://", "").split(".");
         const firstPart = parts[0] ? (parts[0].length > 6 ? parts[0].substring(0, 3) + "***" + parts[0].slice(-3) : "***") : "***";
         maskedUrl = `libsql://${firstPart}.${parts.slice(1).join(".")}`;
       } else {
         maskedUrl = dbUrl.substring(0, 10) + "..." + dbUrl.slice(-5);
       }
     }
 
     res.json({
       success: true,
       connectionType: "Turso Cloud Database",
       databaseUrl: maskedUrl,
       isRemote,
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
     console.error(`[DB Pull Proxy] Critical database pull failure (URL: ${currentDbUrl}):`, error);
     res.status(500).json({ 
       error: error.message || "Failed to pull database data",
       details: error.stack || "" 
     });
   }
});

// 2. Incremental or batch push endpoint to sync table data (supports both Vercel stripped and standard paths)
app.post(["/api/db/push", "/db/push"], async (req, res) => {
  const { table, rows } = req.body;
  const currentDbUrl = dbUrl || "file:local.db";
  
  if (!table || !Array.isArray(rows)) {
    console.error("[DB Push Proxy] Payload rejected: missing table name or rows array.");
    return res.status(400).json({ error: "Invalid payload. Table name and rows array required." });
  }

  console.log(`[DB Push Proxy] Queuing sync write batch for table "${table}" (${rows.length} rows) to DB: ${currentDbUrl}`);

  try {
    const statements: any[] = [];

    if (table === "users") {
      statements.push({ sql: "DELETE FROM users", args: [] });
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
      statements.push({ sql: "DELETE FROM products", args: [] });
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
      statements.push({ sql: "DELETE FROM customers", args: [] });
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
      statements.push({ sql: "DELETE FROM orders", args: [] });
      for (const row of rows) {
        // Safe stringify check to guarantee no double encoding or corrupt parsing
        let orderItemsStr = "[]";
        if (row.items) {
          if (typeof row.items === "string") {
            orderItemsStr = row.items;
          } else if (Array.isArray(row.items)) {
            orderItemsStr = JSON.stringify(row.items);
          }
        }

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
            orderItemsStr,
          ],
        });
      }
    } else if (table === "deliveries") {
      statements.push({ sql: "DELETE FROM deliveries", args: [] });
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
      statements.push({ sql: "DELETE FROM complaints", args: [] });
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
      statements.push({ sql: "DELETE FROM audit_logs", args: [] });
      for (const row of rows) {
        const logId = row.LogID || row.logId || `LOG-${Math.floor(Math.random() * 1000000)}`;
        const username = row.UserID || row.userId || row.username || "System";
        const action = row.Action || row.action || "";
        const timestamp = row.Timestamp || row.timestamp || new Date().toISOString();
        const tableRef = row.TableRef || row.tableRef || "";
        statements.push({
          sql: "INSERT INTO audit_logs (logId, username, action, timestamp, tableRef) VALUES (?, ?, ?, ?, ?)",
          args: [
            logId, 
            username, 
            action, 
            timestamp, 
            tableRef
          ],
        });
      }
    } else {
      console.warn(`[DB Push Proxy] Unknown table request blocked: "${table}"`);
      return res.status(400).json({ error: `Unknown table name: "${table}"` });
    }

    if (statements.length > 0) {
      console.log(`[DB Push Proxy] Calling db.batch with ${statements.length} sql statements for table "${table}"...`);
      await db.batch(statements, "write");
      console.log(`[DB Push Proxy] Batch completed successfully! Table "${table}" has been fully replaced in cloud Turso.`);
    } else {
      console.log(`[DB Push Proxy] Empty rows array, completed zero-operation for table "${table}".`);
    }

    res.json({ success: true, table, rowsProcessedCount: rows.length });
  } catch (error: any) {
    console.error(`[DB Push Proxy] Critical batch push sync exception for table "${table}":`, error);
    res.status(500).json({ 
      error: error.message || `Failed to push sync data to table: ${table}`,
      details: error.stack || ""
    });
  }
});

// 3. Clear and Reset DB default endpoint (supports both Vercel stripped and standard paths)
app.post(["/api/db/reset", "/db/reset"], async (req, res) => {
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
  try {
    await initDb();
  } catch (err: any) {
    console.error("⚠️ Database initialization failed at startup, but proceeding anyway to guarantee server listening:", err);
  }

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
