# 🐺 Wolf Marketplace

Malawi's campus marketplace — built with React + Vite + Supabase, deployed on Vercel.

## Setup

### 1. Supabase
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor** and paste + run the entire contents of `supabase-schema.sql`
3. Copy your **Project URL** and **anon public key** from Settings → API

### 2. Environment Variables
Create a `.env` file in the root:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Local Development
```bash
npm install
npm run dev
```

### 4. Deploy to Vercel
1. Push to GitHub
2. Import repo in Vercel
3. Add environment variables in Vercel → Settings → Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

## Features
- 🏛️ Campus-based marketplaces (15+ Malawian universities)
- 🛍️ Product listings with photo uploads
- 🏪 Vendor profiles with contact info, products, reviews
- 💬 Real-time buyer-seller chat (Supabase Realtime)
- ⭐ Buyer ratings & reviews
- 🛒 Shopping cart with quantity management
- 📱 Mobile-first with bottom nav
- 🔐 Supabase Auth (email/password)
- 📸 Photo uploads (product images, vendor avatar & banner)
- 🚚 Delivery info per vendor
- 💰 Airtel Money & TNM Mpamba payment flow
