# RepurposeAI

AI-powered content repurposing tool. Turn YouTube videos, blog posts, and podcasts into LinkedIn posts, carousels, and X threads matched to your writing voice.

## Features

- **4 input sources**: YouTube URL, blog URL, podcast URL, raw text paste
- **3 output formats**: LinkedIn post, LinkedIn carousel, Twitter/X thread
- **Voice matching**: Create profiles from your real writing, AI matches your tone
- **Multi-step AI pipeline**: Extract → Analyze → Generate (not a single-prompt wrapper)
- **Chrome extension**: Repurpose any article while reading it
- **Stripe billing**: Free (3 generations), Starter ($19/mo, 30/mo), Pro ($49/mo, unlimited)
- **3D animated landing page**: React Three Fiber, cursor-reactive, scroll animations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), Tailwind CSS, shadcn/ui, Framer Motion |
| 3D | React Three Fiber, Three.js, @react-three/drei |
| Backend | Next.js API Routes (serverless) |
| Database | Supabase (PostgreSQL + pgvector + Auth + RLS) |
| AI | Google Gemini 1.5 Flash (swappable to OpenAI) |
| Payments | Stripe (Checkout + Billing Portal + Webhooks) |
| Hosting | Vercel (auto-deploy from main branch) |
| Analytics | Plausible (privacy-friendly) |

## Architecture

User inputs source (URL or text)

↓

Content Extraction (YouTube transcript / blog scraper / raw text)

↓

AI Analysis (distills key insights, hook angles, quotable moments)

↓

AI Generation (format-specific prompt + voice profile matching)

↓

Streaming output → platform-specific preview → copy/save

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier)
- Google AI API key (free tier)
- Stripe account (test mode)

### 1. Clone and install

```bash
git clone https://github.com/your-username/repurpose-ai.git
cd repurpose-ai
npm install
```

### 2. Set up environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

```env
# Supabase (Settings → API in your Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google AI (https://aistudio.google.com/app/apikey)
GOOGLE_AI_API_KEY=AIzaSy...
AI_MODEL=gemini-1.5-flash

# Stripe (https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=RepurposeAI
```

### 3. Set up Supabase database

Go to your Supabase project → SQL Editor → run these files in order:

1. `supabase/migrations/001_initial_schema.sql` (tables, RLS, triggers)
2. `supabase/migrations/002_pgvector.sql` (vector extension + embedding column + RPC function)

### 4. Set up Stripe products

In Stripe dashboard (test mode):

1. Create product "Starter" → $19/month recurring → copy Price ID
2. Create product "Pro" → $49/month recurring → copy Price ID
3. Paste both Price IDs into your `.env.local`

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Test the full flow

1. Sign up at `/signup`
2. Create a voice profile at `/voice` (paste 2-3 real writing examples)
3. Go to `/generate` → paste a blog URL → select LinkedIn Post → generate
4. Check `/history` for saved outputs
5. Test billing at `/upgrade` (uses Stripe test mode)

## Project Structure

```
app/
├── (marketing)/     Landing page, blog, pricing, legal
├── (auth)/          Login, signup, password reset
├── (app)/           Dashboard, generate, history, voice, settings
└── api/             Extract, analyze, generate, voice, billing, health

components/
├── ui/              shadcn/ui primitives (button, input, card, etc.)
├── layout/          Sidebar, topbar, mobile nav, user menu
├── generate/        Generation wizard components
├── voice/           Voice profile CRUD components
├── history/         Generation history components
├── billing/         Pricing cards, upgrade modal
├── marketing/       Landing page sections (3D hero, features, etc.)
├── shared/          Logo, loading states, empty states, page header
└── providers/       Auth, usage, toast context providers

lib/
├── ai/              Gemini provider, prompts, embeddings, analyze/generate
├── extractors/      YouTube, blog, podcast content extraction
├── supabase/        Client, server, admin clients + types
├── stripe/          Config + webhook helpers
├── validations/     Zod schemas for all forms
├── constants/       Routes, plans, output formats
└── utils/           Helpers, formatters, rate limiter

extension/           Chrome extension (Manifest V3)
supabase/            Database migrations
```

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Connect repo to Vercel
3. Add all env vars in Vercel dashboard → Settings → Environment Variables
4. Deploy (auto-deploys on push to main)

### Stripe Webhook (production)

After deploying, create a webhook in Stripe dashboard:

- Endpoint URL: `https://your-domain.com/api/billing/webhook`
- Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

## Swapping AI Models

The AI provider is fully abstracted in `lib/ai/provider.ts`. To switch from Gemini to OpenAI:

1. Install: `npm install openai`
2. Replace `lib/ai/provider.ts` with OpenAI client
3. Update `AI_MODEL` env var (e.g., `gpt-4o-mini`)
4. No other files need changes

## Chrome Extension

The extension lives in `/extension`. To build and test:

1. Open `chrome://extensions` in Chrome
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `extension/` folder
4. Navigate to any blog article → click the extension icon

## Database Schema

- `profiles`: User accounts (extends Supabase auth), plan, usage tracking
- `voice_profiles`: Saved writing styles with tone, examples, and vector embeddings
- `generations`: All generated content with input/output, linked to voice profiles
- `usage_log`: Credit consumption tracking for billing

All tables have Row Level Security (RLS) enabled. Users can only access their own data.
