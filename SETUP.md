# Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Environment Variables

Create a `.env` file in the root directory with the following:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/chartsfm?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Last.fm API
LASTFM_API_KEY="your-lastfm-api-key"
```

### Generate NEXTAUTH_SECRET:

```bash
openssl rand -base64 32
```

### Get Last.fm API Key:

Visit https://www.last.fm/api/account/create and create an API account.

## Step 3: Set Up Database

### Option A: Local PostgreSQL

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
createdb chartsfm
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres createdb chartsfm
```

### Option B: Cloud Database (Recommended for beginners)

- **Supabase**: https://supabase.com (free tier)
- **Neon**: https://neon.tech (free tier)
- **Railway**: https://railway.app (free tier)

Copy the connection string they provide to your `DATABASE_URL`.

## Step 4: Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

## Step 5: Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser!

## Troubleshooting

### "Module not found" errors
Run `npm install` again to ensure all dependencies are installed.

### Database connection errors
- Check your `DATABASE_URL` is correct
- Ensure PostgreSQL is running (if local)
- Verify database exists

### NextAuth errors
- Make sure `NEXTAUTH_SECRET` is set
- Ensure `NEXTAUTH_URL` matches your app URL

