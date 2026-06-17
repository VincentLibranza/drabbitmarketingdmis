import express from "express";
import { createClient } from "@libsql/client";
import dotenv from "dotenv";

// Only use dotenv in local dev. Vercel handles this automatically.
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// 1. GET CREDENTIALS (Strict)
const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;

// 2. LOGGING FOR DEBUG (Look for this in Vercel Logs!)
console.log("--- DB Connection Attempt ---");
console.log("URL Found:", !!url);
console.log("Token Found:", !!token);

if (!url) {
  // This will show up in Vercel Logs and tell you exactly what's wrong
  throw new Error("FATAL: TURSO_DATABASE_URL is missing. Check Vercel Environment Variables.");
}

// 3. INITIALIZE CLIENT
const client = createClient({
  url: url.trim().replace(/['"]/g, ''), // Remove accidental quotes
  authToken: token ? token.trim().replace(/['"]/g, '') : undefined,
});

// Proxy object for your existing code
export const db = {
  execute: (stmt: any) => client.execute(stmt),
  batch: (stmts: any[], mode?: any) => client.batch(stmts, mode)
};

// ... keep the rest of your app.use and routes below ...