# Catalogue & Order Book: deployment guide

## 1. GitHub
1. Create a new repository named `catalogue-orderbook`.
2. Upload everything inside this folder, keeping the folders exactly as they are:
   `app`, `components`, `lib`, `supabase`, `package.json`, `next.config.js`, `.gitignore`, `SETUP.md`.

## 2. Supabase
1. Use your existing Supabase project, or a new one. Every table starts with `cob_`, so it won't
   clash with the loyalty app's tables.
2. Go to **SQL Editor > New query**, paste the whole of `supabase/schema.sql`, then press **Run**.
   It is safe to run again after future updates; it only adds what is missing.
3. Go to **Project Settings > API** and copy the **Project URL** and the **service_role / secret key**.

## 3. Vercel
1. **Add New > Project**, then import `catalogue-orderbook`.
2. Before pressing Deploy, open **Environment Variables** and add these three:

| Name | Value |
|---|---|
| SUPABASE_URL | the Project URL from Supabase |
| SUPABASE_SERVICE_ROLE_KEY | the service_role / secret key from Supabase |
| ADMIN_PASSWORD | any password you choose for MASTER ADMIN |

3. Press **Deploy**.

## 4. Test
1. Open `your-site.vercel.app/admin`, log in with your ADMIN_PASSWORD, and register a brand
   (including a 4-digit catalogue settings PIN).
2. Tap **Catalogue settings**. Check the Sizes and GST slabs tabs, add your category, then add a product.
3. Tap **Catalogue** to open the main catalogue. Fill in customer details, tick products, choose
   Report PDF or Full PDF, then press **Send order**.

## Links
- Master admin: `/admin` (password = ADMIN_PASSWORD in Vercel)
- Admin (company): `/company` (company name + password, created by Master admin)
- Brand page (Master admin or the brand's Admin): `/b/brand-name/front`
- Catalogue settings: `/b/brand-name/manage` (4-digit PIN = products only; Admin/Master = everything)
- Main catalogue to share with customers: `/b/brand-name`
