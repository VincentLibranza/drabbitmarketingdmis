import express from "express";
import { createClient } from "@libsql/client";

const app = express();
app.use(express.json({ limit: "50mb" }));

// 1. GET CREDENTIALS (Strict - will throw error in logs if missing)
const url = process.env.TURSO_DATABASE_URL?.trim().replace(/['"]/g, '');
const token = process.env.TURSO_AUTH_TOKEN?.trim().replace(/['"]/g, '');

if (!url) {
  console.error("❌ ERROR: TURSO_DATABASE_URL is missing in Vercel settings!");
}

// 2. INITIALIZE TURSO CLIENT
const client = createClient({
  url: url || "",
  authToken: token,
});

// 3. AUTO-INIT TABLES (Ensures Turso is not empty)
async function initDb() {
  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS users (userId TEXT PRIMARY KEY, username TEXT, name TEXT, role TEXT, status TEXT)`);
    await client.execute(`CREATE TABLE IF NOT EXISTS products (productId TEXT PRIMARY KEY, productName TEXT, category TEXT, unitPrice REAL, stockQuantity INTEGER, reorderThreshold INTEGER)`);
    await client.execute(`CREATE TABLE IF NOT EXISTS customers (customerId TEXT PRIMARY KEY, customerName TEXT, contact TEXT, address TEXT, email TEXT, tin TEXT)`);
    await client.execute(`CREATE TABLE IF NOT EXISTS orders (orderId TEXT PRIMARY KEY, orderRefNo TEXT, customerId TEXT, orderDate TEXT, status TEXT, paymentStatus TEXT, totalAmount REAL, dueDate TEXT, items TEXT)`);
    console.log("✅ Turso Tables Verified");
  } catch (e) {
    console.error("❌ Turso Init Failed:", e);
  }
}

// 4. API ROUTES
app.get("/api/db/status", (req, res) => {
  res.json({ 
    isRemote: !!url && url.startsWith("libsql"), 
    databaseUrl: url ? url.substring(0, 15) + "..." : "NOT CONFIGURED" 
  });
});

app.get("/api/db/pull", async (req, res) => {
  try {
    await initDb(); // Verify tables on pull
    const [u, p, c, o] = await Promise.all([
      client.execute("SELECT * FROM users"),
      client.execute("SELECT * FROM products"),
      client.execute("SELECT * FROM customers"),
      client.execute("SELECT * FROM orders")
    ]);

    res.json({ 
      success: true, 
      data: { users: u.rows, products: p.rows, customers: c.rows, orders: o.rows, deliveries: [], complaints: [], auditLogs: [] } 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/db/push", async (req, res) => {
  const { table, rows } = req.body;
  try {
    // Basic sync logic: Clear and rewrite
    await client.execute(`DELETE FROM ${table}`);
    // You can add batch insert logic here
    res.json({ success: true, table });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 5. SERVER LISTENER (Only runs locally, Vercel ignores this part)
if (process.env.VERCEL !== "1") {
  const PORT = 3000;
  initDb().then(() => {
    app.listen(PORT, () => console.log(`Local Server: http://localhost:${PORT}`));
  });
}

export { app };