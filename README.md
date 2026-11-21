# Uganda Prisons Service — Official Products Online Store & Admin System

A full-stack online shopping web application built for **Uganda Prisons Service (UPS) Products** — showcasing handcrafted **Furniture** (solid Mahogany & Mvule wooden beds, chairs, dining tables), **Genuine Leather Footwear** (formal shoes, steppers/sandals), and **Certified Agricultural Seeds** (Improved Hybrid Maize Seeds, Soya Bean Seeds, and more).

---

## Key Features

### Public Storefront (`/`)
- **Official Product Catalog & Price Chartlist**: Browse by category (`Furniture`, `Leather Footwear`, `Agricultural Seeds`), switch between **Gallery View** and **Official Price Chartlist Table**, search, and sort.
- **Interactive Product Details, Wishlist & Cart**: Tap any product to inspect specifications, save to **Wishlist**, add to **Cart**, or purchase immediately.
- **Smart Nationwide Fulfillment Logic**:
  - **Bulk Orders** -> Automatic **FREE Nationwide Delivery** by Uganda Prisons Service Sales Agents.
  - **Small Purchases** -> Select from **26 Uganda Prisons Service Units** across Central, Eastern, Northern, and Western Uganda for convenient local pickup.
- **Official Payment Channels**:
  - **MTN Mobile Money (MoMo)**
  - **Airtel Money**
  - **Uganda Prisons Service Bank Account**
  - **Cash / Pay on Delivery**
- **Automated Purchase Reference & Proof of Payment**:
  - Every order generates an automated Purchase Reference (e.g. `UPS-20261121-4821`) linked to the customer's full name.
  - Customers submit Proof of Payment (Transaction ID + Receipt Photo/PDF) immediately or anytime via **Track Order & Submit Payment Proof**.
- **Running Auto-Animated Adverts Showcase & Promo Ticker**: Plays uploaded **Video Adverts** and **Auto-Animated Photo Adverts** (`Ken Burns Cinema`, `Kinetic Pop & Glow`, `Gold Shimmer Spotlight`, `Pulse Zoom`).
- **Institutional News & About Us**: Dedicated sections highlighting UPS Prison Industries, Farms, and Rehabilitation impact.
- **Direct Admin Portal Link & Developer Footer**: Linked cleanly to `/admin` with developer credit (`CPL Warder Oringa Walter Kisembo`).

### Admin Portal (`/admin`)
- **Default Login**: `admin@prisons.go.ug` / `UPSAdmin@2026` *(change immediately in Settings after first login)*.
- **Orders & Payment Verification**: Inspect uploaded Proof of Payment receipts, verify MoMo/Airtel/Bank payments OR approve Cash/Pay on Delivery orders, update dispatch/pickup status, print receipts, and automatically log verified income to Financial Management while sending a **Yoola SMS** alert!
- **Products & Price Tags Manager**: Upload available products, photos (AWS S3 or local), price tags (UGX), bulk thresholds, and stock.
- **Adverts & Auto-Animation Studio**: Upload video/photo adverts, preview animations live, or **1-click Auto-Generate an animated advert** from any catalog product.
- **News & Announcements Manager**: Create, edit, publish, and delete official news articles.
- **Financial Management (Daily Transactions Ledger)**: Automatic logging of verified orders + manual daily income/expense recording, payment method breakdown, CSV export, and printable daily financial statements.
- **Settings, AWS S3 & Yoola SMS**: Update official MoMo/Airtel/Bank details, bulk thresholds, AWS S3 bucket settings, and Yoola SMS API key + live test SMS tool + SMS delivery audit logs.

---

## Local Development

```bash
cd E:\Projects\uganda-prisons-store
npm install
npm run build
npm start
```

- **Storefront**: `http://localhost:5000`
- **Admin Portal**: `http://localhost:5000/admin`

Locally, the app automatically uses Node's built-in SQLite (`data/ups_store.sqlite`) and local disk uploads (`uploads/`) with zero external setup required.

---

## Deploying Online on Render (`render.yaml`)

This repository includes a production-ready **`render.yaml`** Blueprint that provisions:
1. A **Node.js Web Service** (`uganda-prisons-service-store`)
2. A **Render Managed PostgreSQL Database** (`ups-store-db`) automatically linked via `DATABASE_URL`

### Steps to Deploy on Render:
1. Push this Git repository to your **GitHub** account:
   ```bash
   git remote add origin https://github.com/<your-username>/uganda-prisons-store.git
   git push -u origin main
   ```
2. Log in to [Render](https://dashboard.render.com) -> click **New +** -> **Blueprint**.
3. Connect your GitHub repository `uganda-prisons-store`. Render reads `render.yaml` automatically!
4. Fill in the prompted secret Environment Variables:
   - `ADMIN_PASSWORD` (your secure production admin password)
   - `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
   - `YOOLA_SMS_API_KEY`, `YOOLA_SMS_SENDER_ID`, `YOOLA_SMS_SANDBOX=false`
5. Click **Apply** — Render builds the React app, starts Express, auto-creates PostgreSQL tables, and seeds your catalog!

---

## Configuring AWS S3 (Persistent Cloud Media Storage)
1. Create an S3 bucket in AWS Console (e.g. `uganda-prisons-store-media` in `eu-west-1` or `af-south-1`).
2. Allow public read (`s3:GetObject`) on uploaded product/advert/news objects (or attach CloudFront and set `AWS_S3_PUBLIC_URL`).
3. Create an IAM user with `s3:PutObject` & `s3:GetObject` on `arn:aws:s3:::uganda-prisons-store-media/*`.
4. Add `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` in `.env` or Render Environment Variables.

---

## Configuring Yoola SMS (Uganda Customer SMS Alerts)
1. Log in to your [Yoola SMS](https://yoolasms.com) dashboard and copy your **API Key** and approved **Sender ID** (e.g. `UPS-STORE`).
2. Paste them into **Admin Portal -> Settings, AWS & Yoola SMS** (or set `YOOLA_SMS_API_KEY` & `YOOLA_SMS_SENDER_ID` in Render Environment Variables).
3. Use the built-in **Send Test Yoola SMS** button in the Admin Portal to verify live delivery!

---

**Developer:** CPL Warder Oringa Walter Kisembo | Whatsapp: `+256394915409` | Email: `oringawalterkisembo@gmail.com`
