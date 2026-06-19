# Drabbit DMIS Portal: A Distribution Management Information System for Drabbit Marketing

## Overview

The Drabbit DMIS Portal is a full-stack web-based information system developed to streamline and centralize the core operations of Drabbit Marketing. The platform enables staff and proprietors to manage orders, monitor live inventory, generate invoices, track deliveries, log customer complaints, and maintain a professional audit trail — all within a single portal.

The system replaces fragmented manual processes by integrating real-time data synchronization, role-based access control, and AI-powered assistance, providing a more efficient and accountable workflow for the entire organization.

---

## Key Features

### User Authentication & Role Management

- Secure login with role-based access (Proprietor and Staff)
- User account and session management
- Active/Inactive user status control

### Order Management

- Create and manage customer orders with reference numbers
- Track order status: Pending → Confirmed → Dispatched → Delivered / Cancelled
- Monitor payment status: Unpaid, Partial, Paid
- Link orders to customers and inventory items

### Inventory Management

- Live stock quantity tracking per product
- Category-based product organization
- Reorder threshold alerts for low-stock items
- Unit price management

### Invoicing

- Automated invoice generation tied to orders
- Invoice-level payment status tracking
- Due date management per invoice

### Delivery Tracking

- Schedule and assign deliveries to drivers
- Track delivery status: Pending → In Transit → Delivered
- Record actual delivery dates against scheduled dates

### Complaints Log

- Log customer complaints with product references
- Track complaint resolution status: Open → In Progress → Resolved
- Store resolution notes per complaint

### Audit Trail

- Comprehensive action logging across all modules
- Records user, action, timestamp, and affected table
- Supports accountability and operational transparency

### Dashboard & Analytics

- At-a-glance business overview using Recharts visualizations
- Key metrics on orders, inventory, deliveries, and complaints

---

## Technology Stack

### Frontend

- React 19 (with Vite)
- TypeScript
- Tailwind CSS v4
- Recharts (data visualization)
- Lucide React (icons)
- Motion (animations)
- jsPDF (invoice generation)

### Backend

- Node.js with Express
- TypeScript (tsx)
- Turso (libSQL) — cloud SQLite database
- Local SQLite fallback (`local.db`) for development

### AI Integration

- Google Gemini API (`@google/genai`)

### Deployment

- Vercel (frontend + serverless)

---

## System Workflow

Customer Onboarding → Order Intake → Inventory Deduction → Invoice Generation → Delivery Scheduling → Delivery Confirmation → Complaints Handling → Audit Logging

All modules are synchronized in real time to maintain data integrity across orders, inventory, invoices, and deliveries.

---

## Installation Guide

### Clone the Repository

```bash
git clone <repository-url>
cd drabbit-dmis-portal
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:

```env
GEMINI_API_KEY=your_gemini_api_key

# Optional: Turso cloud database (falls back to local SQLite if omitted)
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token
```

### Run the Application

```bash
npm run dev
```

### Build for Production

```bash
npm run build
npm start
```

---

## User Roles

### Proprietor

The Proprietor has full system access and can:

- Manage all users (create, activate, deactivate)
- View and manage all orders, invoices, and deliveries
- Access the audit trail
- View the dashboard and analytics
- Manage inventory and products
- Handle customer complaints

### Staff

The Staff member can:

- Create and update orders
- View and manage deliveries assigned to them
- Log and update customer complaints
- View inventory levels
- Generate invoices

---

## Database Collections

### users

Stores user credentials, roles, and account status.

### orders / order_items

Stores order records, line items, payment status, and fulfillment status.

### products

Stores product catalog, pricing, stock quantities, and reorder thresholds.

### customers

Stores customer contact information, addresses, and TIN details.

### invoices

Stores invoice records linked to orders with payment and due date tracking.

### deliveries

Stores delivery scheduling, driver assignments, and status updates.

### complaints

Stores customer complaint records, product references, and resolution notes.

### audit_logs

Stores a full history of system actions with user, timestamp, and table references.

---

## Future Enhancements

- Customer-facing order tracking portal
- SMS/email notifications for order and delivery updates
- Advanced sales and inventory reporting with export to PDF/Excel
- Barcode/QR scanning for inventory management
- Mobile app for delivery drivers
- Multi-branch support

---

## Developers

Drabbit Marketing — Internal Systems Development

Distribution Management Information System (DMIS)

2026
