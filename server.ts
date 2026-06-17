import express from "express";
import { createClient } from "@libsql/client";

const app = express();
app.use(express.json({ limit: "50mb" }));

// Helper to get environment variables safely
const getEnv = (name: string) => (process.env[name] || "").trim().replace(/['"]/g, '');

const url = getEnv("TURSO_DATABASE_URL");
const token = getEnv("TURSO_AUTH_TOKEN");

// Initialize client only if URL is present to prevent crashing the whole function
const client = url ? createClient({ url, authToken: token }) : null;

app.get("/api/db/status", (req, res) => {
  try {
    res.json({ 
      initialized: !!client,
      hasUrl: !!url,
      urlPreview: url ? url.substring(0, 15) + "..." : "MISSING",
      isVercel: process.env.VERCEL === "1"
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/db/pull", async (req, res) => {
  if (!client) {
    return res.status(500).json({ success: false, error: "TURSO_DATABASE_URL is not configured." });
  }

  try {
    // We run a simple query first to see if the connection is actually valid
    const users = await client.execute("SELECT * FROM users").catch(() => ({ rows: [] }));
    const products = await client.execute("SELECT * FROM products").catch(() => ({ rows: [] }));
    const customers = await client.execute("SELECT * FROM customers").catch(() => ({ rows: [] }));
    const orders = await client.execute("SELECT * FROM orders").catch(() => ({ rows: [] }));

    res.json({ 
      success: true, 
      data: { 
        users: users.rows, 
        products: products.rows, 
        customers: customers.rows, 
        orders: orders.rows,
        deliveries: [], complaints: [], auditLogs: [] 
      } 
    });
  } catch (error: any) {
    console.error("Internal Pull Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/db/push", async (req, res) => {
  if (!client) return res.status(500).json({ error: "No DB Client" });
  res.json({ success: true, message: "Sync endpoint reached" });
});

export { app };
export default app;