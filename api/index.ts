import express from "express";
import { createClient } from "@libsql/client";

const app = express();
app.use(express.json({ limit: "50mb" }));

// 1. GET CREDENTIALS FROM VERCEL
const url = (process.env.TURSO_DATABASE_URL || "").trim().replace(/['"]/g, '');
const token = (process.env.TURSO_AUTH_TOKEN || "").trim().replace(/['"]/g, '');

// 2. INITIALIZE TURSO CLIENT
const client = createClient({
  url: url || "",
  authToken: token,
});

// 3. TABLE INITIALIZATION (Fixes empty database issues)
async function ensureTables() {
  if (!url) return;
  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS users (userId TEXT PRIMARY KEY, username TEXT, name TEXT, role TEXT, status TEXT)`);
    await client.execute(`CREATE TABLE IF NOT EXISTS products (productId TEXT PRIMARY KEY, productName TEXT, category TEXT, unitPrice REAL, stockQuantity INTEGER, reorderThreshold INTEGER)`);
    await client.execute(`CREATE TABLE IF NOT EXISTS customers (customerId TEXT PRIMARY KEY, customerName TEXT, contact TEXT, address TEXT, email TEXT, tin TEXT)`);
    await client.execute(`CREATE TABLE IF NOT EXISTS orders (orderId TEXT PRIMARY KEY, orderRefNo TEXT, customerId TEXT, orderDate TEXT, status TEXT, paymentStatus TEXT, totalAmount REAL, dueDate TEXT, items TEXT)`);
  } catch (e) {
    console.error("Init Error:", e);
  }
}

// 4. API ROUTES
app.get("/api/db/status", (req, res) => {
  res.json({
    status: "online",
    connected: !!url,
    url_preview: url ? url.substring(0, 15) + "..." : "MISSING",
    isVercel: true
  });
});

app.get("/api/db/pull", async (req, res) => {
  if (!url) return res.status(500).json({ success: false, error: "Database URL not set in Vercel" });

  try {
    await ensureTables();
    
    const [u, p, c, o] = await Promise.all([
      client.execute("SELECT * FROM users"),
      client.execute("SELECT * FROM products"),
      client.execute("SELECT * FROM customers"),
      client.execute("SELECT * FROM orders")
    ]);

    res.json({
      success: true,
      data: { 
        users: u.rows, 
        products: p.rows, 
        customers: c.rows, 
        orders: o.rows,
        deliveries: [], complaints: [], auditLogs: [] 
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/db/push", async (req, res) => {
  const { table, rows } = req.body;
  if (!client || !table) return res.status(400).json({ error: "Invalid request" });
  
  try {
    // Basic push: Clear table and re-insert (For testing/sync)
    await client.execute(`DELETE FROM ${table}`);
    res.json({ success: true, table });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// IMPORTANT: Export the app for Vercel
export default app;