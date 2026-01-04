# Quick Start Guide - Step by Step

Follow these steps in order to get your ChartsFM app running.

## Prerequisites Check

First, let's make sure you have the required tools installed.

### Step 0: Install Node.js (if needed)

**Check if you have Node.js:**
```bash
node --version
npm --version
```

If these commands don't work, install Node.js:

**macOS (using Homebrew):**
```bash
brew install node
```

**Or download from:**
https://nodejs.org/ (Download the LTS version)

**Verify installation:**
```bash
node --version  # Should show v18.x or higher
npm --version   # Should show 9.x or higher
```

---

## Step 1: Install Project Dependencies

Navigate to your project directory and install all required packages:

```bash
cd /Users/thiago/chartsfm
npm install
```

This will download and install all the packages listed in `package.json`. This may take a few minutes.

**Expected output:** You should see a lot of package names being installed, and at the end it should say something like "added XXX packages".

---

## Step 2: Set Up Environment Variables

Create a `.env` file in the project root:

```bash
# In the project directory
touch .env
```

Then open `.env` in your editor and add:

```env
# Database - We'll set this up in the next step
DATABASE_URL="postgresql://user:password@localhost:5432/chartsfm?schema=public"

# NextAuth - Generate a secret key
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-this-below"

# Last.fm API - Get from https://www.last.fm/api/account/create
LASTFM_API_KEY="your-api-key-here"
```

### Generate NEXTAUTH_SECRET:

Run this command to generate a secure random key:

```bash
openssl rand -base64 32
```

Copy the output and paste it as the value for `NEXTAUTH_SECRET` in your `.env` file.

### Get Last.fm API Key:

1. Go to https://www.last.fm/api/account/create
2. Sign in or create a Last.fm account
3. Fill out the form (Application name: "ChartsFM", etc.)
4. Copy the API Key they give you
5. Paste it as `LASTFM_API_KEY` in your `.env` file

**Note:** You can leave `LASTFM_API_KEY` empty for now if you just want to test the app structure. You'll need it later when connecting Last.fm accounts.

---

## Step 3: Set Up PostgreSQL Database

You have two options:

### Option A: Use a Cloud Database (Easiest - Recommended)

**Supabase (Free):**
1. Go to https://supabase.com
2. Sign up for free
3. Create a new project
4. Go to Settings → Database
5. Copy the "Connection string" (URI format)
6. Replace `DATABASE_URL` in your `.env` file with this connection string

**Neon (Free):**
1. Go to https://neon.tech
2. Sign up for free
3. Create a new project
4. Copy the connection string
5. Replace `DATABASE_URL` in your `.env` file

### Option B: Install PostgreSQL Locally

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
createdb chartsfm
```

Then update your `.env`:
```env
DATABASE_URL="postgresql://$(whoami)@localhost:5432/chartsfm?schema=public"
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb chartsfm
```

---

## Step 4: Initialize the Database

Now that your database is set up, let's create the tables:

```bash
# Generate Prisma client (creates TypeScript types from your schema)
npm run db:generate

# Push the schema to your database (creates all tables)
npm run db:push
```

**Expected output:**
- `db:generate` should say "Generated Prisma Client"
- `db:push` should show "Your database is now in sync with your schema"

If you see any errors, check that:
- Your `DATABASE_URL` is correct
- Your database is running (if local)
- You have the correct permissions

---

## Step 5: Start the Development Server

Now you're ready to run the app!

```bash
npm run dev
```

**Expected output:**
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- ready started server on 0.0.0.0:3000
```

---

## Step 6: Open in Browser

Open your web browser and go to:

**http://localhost:3000**

You should see the ChartsFM welcome page!

---

## Troubleshooting

### "Cannot find module" errors
- Run `npm install` again
- Delete `node_modules` folder and `package-lock.json`, then run `npm install`

### Database connection errors
- Double-check your `DATABASE_URL` in `.env`
- Make sure PostgreSQL is running: `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
- For cloud databases, check that the connection string is correct

### Port 3000 already in use
- Kill the process: `lsof -ti:3000 | xargs kill`
- Or change the port: `npm run dev -- -p 3001`

### NextAuth errors
- Make sure `NEXTAUTH_SECRET` is set in `.env`
- Make sure `NEXTAUTH_URL` matches where you're accessing the app

---

## Next Steps

Once the app is running:
1. Create sign-in and sign-up pages
2. Build the Last.fm connection flow
3. Create dashboard with charts
4. Add friend system

Happy coding! 🎵📊

