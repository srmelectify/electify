# Vercel Deployment Guide: Electify Monorepo (Next.js + NestJS)

Electify is structured as a high-performance monorepo:
* **`apps/web`**: Next.js 16 (App Router, React 19, Tailwind CSS v4, Server Actions & UI)
* **`apps/api`**: NestJS 11 (Modular REST API with Swagger, JWT Auth, Class Validation, Drizzle ORM)
* **`packages/db`**: Shared Database Package (PostgreSQL connection pool, Drizzle schema, migrations, auto-heal)

---

## Deployment Options on Vercel

### Option 1: Multi-Project Deployment from 1 Git Repository (Recommended by Vercel)
Vercel recommends deploying each application as its own project connected to the same GitHub/GitLab repository.

#### Step 1: Deploy NestJS Backend (`apps/api`)
1. In the [Vercel Dashboard](https://vercel.com/dashboard), click **Add New...** > **Project**.
2. Select your `Electify` repository.
3. In **Project Settings**:
   * **Project Name**: `electify-api` (or your choice)
   * **Framework Preset**: NestJS (or Other)
   * **Root Directory**: `apps/api`
4. Set **Environment Variables**:
   * `DATABASE_URL`: Your PostgreSQL connection string (Supabase / Neon / RDS)
   * `JWT_SECRET`: A secure 32+ character secret
   * `PORT`: `4000` (optional, Vercel sets this automatically)
5. Click **Deploy**. Note down the deployment domain (e.g. `https://electify-api.vercel.app`).

#### Step 2: Deploy Next.js Frontend (`apps/web`)
1. In the Vercel Dashboard, click **Add New...** > **Project** again.
2. Select the *same* `Electify` repository.
3. In **Project Settings**:
   * **Project Name**: `electify-web`
   * **Framework Preset**: Next.js
   * **Root Directory**: `apps/web`
4. Set **Environment Variables**:
   * `DATABASE_URL`: Your PostgreSQL connection string
   * `JWT_SECRET`: Matching JWT secret
   * `NESTJS_API_URL`: The URL of your deployed NestJS API (e.g. `https://electify-api.vercel.app`)
5. Click **Deploy**.

> **How it communicates:**
> `apps/web/next.config.ts` includes an automatic rewrite rule:
> Any request to `/api/nest/:path*` is automatically proxied to `${NESTJS_API_URL}/api/:path*`.
> This eliminates CORS issues and lets your frontend talk directly to the NestJS backend under the same origin.

---

## Local Development Workflow

Run both applications in parallel with a single command:

```bash
# Start both Next.js (port 3000) and NestJS (port 4000)
npm run dev

# Or run individually:
npm run dev:web   # http://localhost:3000
npm run dev:api   # http://localhost:4000/api & docs at http://localhost:4000/api/docs
```

### Building & Typechecking
```bash
# Build both web & api
npm run build

# Typecheck both packages
npm run typecheck
```

### Database Management
```bash
npm run db:push     # Push Drizzle schema to database
npm run db:generate # Generate migration files
npm run db:migrate  # Run pending migrations
npm run db:seed     # Seed initial data
```

