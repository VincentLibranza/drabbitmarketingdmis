import express from "express";
import path from "path";
import { createClient } from "@libsql/client";
import dotenv from "dotenv";

// Only load dotenv in local development
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// --- DATABASE CONFIGURATION ---
const isVercel = process.env.VERCEL === "1";

let rawUrl = (process.env.TURSO_DATABASE_URL || "").trim();
let rawToken = (process.env.TURSO_AUTH_TOKEN || "").trim();

// Strip quotes if they were added to the environment variables by mistake
const cleanSecret = (val: string) => val.replace(/^['"]|['"]$/g, "").trim();

if (rawUrl) rawUrl = cleanSecret(rawUrl);
if (rawToken) rawToken = cleanSecret(rawToken);

// Determine the URL: Use Turso if available, otherwise use local file ONLY in local dev
export const dbUrl = rawUrl || (isVercel ? "" : "file:local.db");
export const dbAuthToken = rawToken || undefined;

if (isVercel && !dbUrl) {
  console.error("❌ CRITICAL ERROR: TURSO_DATABASE_URL is not set in Vercel environment variables.");
}

let dbClientInstance: any = null;

function getDbClient() {
  if (!dbClientInstance) {
    if (!dbUrl) {
      throw new Error("No database URL configured. Check your TURSO_DATABASE_URL variable.");
    }
    console.log(`[Database] Initializing connection to: ${dbUrl}`);
    dbClientInstance = createClient({
      url: dbUrl,
      authToken: dbAuthToken,
    });
  }
  return dbClientInstance;
}

// Transparent lazy evaluation proxy
export const db = {
  execute(stmt: any): Promise<any> {
    return getDbClient().execute(stmt);
  },
  batch(stmts: any[], mode?: any): Promise<any> {
    return getDbClient().batch(stmts, mode);
  }
};

// --- INITIALIZATION LOGIC ---
async function initDb() {
  try {
    // Create tables if they don't exist
    await db.execute(`CREATE TABLE IF NOT EXISTS users (userId TEXT PRIMARY KEY, username TEXT, name TEXT, role TEXT, status TEXT)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS products (productId TEXT PRIMARY KEY, productName TEXT, category TEXT, unitPrice REAL, stockQuantity INTEGER, reorderThreshold INTEGER)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS customers (customerId TEXT PRIMARY KEY, customerName TEXT, contact TEXT, address TEXT, email TEXT, tin TEXT)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS orders (orderId TEXT PRIMARY KEY, orderRefNo TEXT, customerId TEXT, orderDate TEXT, status TEXT, paymentStatus TEXT, totalAmount REAL, dueDate TEXT, items TEXT)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS deliveries (deliveryId TEXT PRIMARY KEY, orderId TEXT, scheduledDate TEXT, deliveryDate TEXT, status TEXT, assignedDriver TEXT)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS complaints (complaintId TEXT PRIMARY KEY, customerId TEXT, productId TEXT, description TEXT, status TEXT, resolution TEXT, dateLogged TEXT)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS audit_logs (logId TEXT PRIMARY KEY, username TEXT, action TEXT, timestamp TEXT, tableRef TEXT)`);

    // Check if seeding is needed
    const userCheck = await db.execute("SELECT COUNT(*) as count FROM users");
    if (Number(userCheck.rows[0].count) === 0) {
      console.log("Seeding initial data...");
      const initialUsers = [
        { userId: "USR-001", username: "admin", name: "Rufino N. Libranza Jr.", role: "Proprietor", status: "Active" }
      ];
      const statements = initialUsers.map(u => ({
        sql: "INSERT INTO users (userId, username, name, role, status) VALUES (?, ?, ?, ?, ?)",
        args: [u.userId, u.username, u.name, u.role, u.status],
      }));
      await db.batch(statements, "write");
    }
    console.log("✅ Database initialized successfully.");
  } catch (err) {
    console.error("❌ Database initialization failed:", err);
  }
}

// --- MIDDLEWARE & ROUTES ---
app.use(express.json({ limit: "50mb" }));

// Endpoint to check status
app.get("/api/db/status", (req, res) => {
  res.json({
    status: dbUrl ? "Configured" : "Missing URL",
    databaseUrl: dbUrl ? dbUrl.substring(0, 15) + "..." : "None",
    isRemote: dbUrl.startsWith("libsql://"),
  });
});

// API Pull logic
app.get("/api/db/pull", async (req, res) => {
  try {
    const [u, p, c, o, d, comp, a] = await Promise.all([
      db.execute("SELECT * FROM users"),
      db.execute("SELECT * FROM products"),
      db.execute("SELECT * FROM customers"),
      db.execute("SELECT * FROM orders"),
      db.execute("SELECT * FROM deliveries"),
      db.execute("SELECT * FROM complaints"),
      db.execute("SELECT * FROM audit_logs")
    ]);
    res.json({ success: true, data: { users: u.rows, products: p.rows, customers: c.rows, orders: o.rows, deliveries: d.rows, complaints: comp.rows, auditLogs: a.rows } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- SERVER STARTUP ---
if (!isVercel) {
  // Local development
  initDb().then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  });
}

export { app };
export default app;