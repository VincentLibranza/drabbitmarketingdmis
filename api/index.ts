import express from "express";
import { createClient } from "@libsql/client";

const app = express();
app.use(express.json({ limit: "50mb" }));

// 1. DATABASE CREDENTIALS
const url = (process.env.TURSO_DATABASE_URL || "").trim().replace(/['"]/g, '');
const token = (process.env.TURSO_AUTH_TOKEN || "").trim().replace(/['"]/g, '');
const client = createClient({ url: url || "", authToken: token });

// 2. SCHEMA INITIALIZATION (Uses lowercase keys to match your frontend forms)
async function ensureSchema() {
  if (!url) return;
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (userId TEXT PRIMARY KEY, username TEXT, password TEXT, role TEXT, status TEXT)`,
    `CREATE TABLE IF NOT EXISTS products (productId TEXT PRIMARY KEY, productName TEXT, category TEXT, unitPrice REAL, stockQuantity INTEGER, reorderThreshold INTEGER)`,
    `CREATE TABLE IF NOT EXISTS customers (customerId TEXT PRIMARY KEY, customerName TEXT, contact TEXT, address TEXT, email TEXT, tin TEXT)`,
    `CREATE TABLE IF NOT EXISTS orders (orderId TEXT PRIMARY KEY, orderRefNo TEXT, customerId TEXT, orderDate TEXT, status TEXT, paymentStatus TEXT, totalAmount REAL, dueDate TEXT)`,
    `CREATE TABLE IF NOT EXISTS order_items (itemId TEXT PRIMARY KEY, orderId TEXT, productId TEXT, quantity INTEGER, unitPrice REAL)`,
    `CREATE TABLE IF NOT EXISTS invoices (invId TEXT PRIMARY KEY, orderId TEXT, invDate TEXT, totalAmt REAL, payStatus TEXT)`,
    `CREATE TABLE IF NOT EXISTS deliveries (deliveryId TEXT PRIMARY KEY, orderId TEXT, scheduledDate TEXT, deliveryDate TEXT, status TEXT, assignedDriver TEXT)`,
    `CREATE TABLE IF NOT EXISTS complaints (complaintId TEXT PRIMARY KEY, customerId TEXT, productId TEXT, description TEXT, status TEXT, resolution TEXT, dateLogged TEXT)`,
    `CREATE TABLE IF NOT EXISTS audit_logs (logId TEXT PRIMARY KEY, userId TEXT, action TEXT, timestamp TEXT, tableRef TEXT)`
  ];
  try {
    for (const sql of tables) await client.execute(sql);
  } catch (e) {
    console.error("Schema Init Error:", e);
  }
}

// 3. API ROUTES

// Status check for the top banner
app.get("/api/db/status", (req, res) => {
  res.json({ 
    isRemote: !!url && url.startsWith("libsql"),
    connected: !!url 
  });
});

// PULL: Downloads all tables to the browser
app.get("/api/db/pull", async (req, res) => {
  try {
    await ensureSchema();
    const tableNames = ['users', 'products', 'customers', 'orders', 'order_items', 'invoices', 'deliveries', 'complaints', 'audit_logs'];
    const results = await Promise.all(tableNames.map(t => client.execute(`SELECT * FROM ${t}`).catch(() => ({ rows: [] }))));
    
    const data: any = {};
    tableNames.forEach((name, i) => { data[name] = results[i].rows; });
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUSH: Saves browser data to Turso (FIXES THE BUTTONS)
app.post("/api/db/push", async (req, res) => {
  const { table, rows } = req.body;
  if (!table || !Array.isArray(rows)) return res.status(400).json({ error: "Invalid data" });

  try {
    // A. Clear current table data
    await client.execute(`DELETE FROM ${table}`);

    // B. If there is new data, perform a batch insert
    if (rows.length > 0) {
      // Get the column names from the first object
      const keys = Object.keys(rows[0]);
      const columns = keys.join(", ");
      const placeholders = keys.map(() => "?").join(", ");
      const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;

      // Map rows to the SQL statement, ensuring values match the key order
      const statements = rows.map(row => ({
        sql: sql,
        args: keys.map(k => row[k] ?? null)
      }));

      await client.batch(statements, "write");
    }
    res.json({ success: true, count: rows.length });
  } catch (e: any) {
    console.error(`Push Error [${table}]:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

export default app;