# 🐺 Wolf Marketplace

Malawi's campus marketplace — buy and sell everything on campus.

## New in v6.0

### 🔍 Search & Filters (`/search`)
- Full-text search across all products
- Filter by category, price range, sort order
- Quick category pills for fast browsing
- Debounced live search as you type
- Search bar in home hero + navbar (🔍 button)

### 💬 In-App Messaging (`/messages`)
- Real-time chat between buyers and vendors
- Sidebar conversation list with unread indicators
- Mobile-responsive: full-screen chat on small screens
- Realtime via Supabase subscriptions
- "Message in App" button on every product page

### 🔔 Live Notifications Bell
- Bell icon in navbar with live unread count
- Message count badge for unread chats
- Realtime updates via Supabase channels
- Tapping bell goes directly to notifications tab
- Mobile nav shows account badge with notification count

### ✉️ Product-level Messaging
- "Message in App" button on ProductDetail
- Pre-routes to the correct vendor conversation

### 📊 Dashboard URL Tabs
- `?tab=notifications` deep-links to notifications tab
- Notification bell in navbar routes directly here

## Setup

1. Copy `.env.example` to `.env.local` and fill in your Supabase keys
2. Run the SQL schema: `supabase-schema.sql` in Supabase SQL editor
3. Run all migrations in `supabase/migrations/` in order
4. Deploy edge functions: `supabase functions deploy`
5. Set secrets: see `SUPABASE_SECRETS_SETUP.md`
6. `npm install && npm run dev`

## Tech Stack
- React + Vite
- Supabase (Postgres, Auth, Realtime, Storage, Edge Functions)
- PWA with push notifications
- PayChangu for mobile money payments
