# ChartsFM

A web application for visualizing your Last.fm listening statistics with beautiful charts and social features.

## Features

- 🔐 User authentication and accounts
- 🎵 Last.fm account integration
- 📊 Interactive charts and visualizations
- 👥 Friend connections and social features
- 📈 Listening statistics tracking

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database (local or cloud)
- Last.fm API key ([Get one here](https://www.last.fm/api/account/create))

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and fill in:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for local dev)
   - `LASTFM_API_KEY`: Your Last.fm API key

3. **Set up the database:**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database (for development)
   npm run db:push
   
   # Or create a migration (for production)
   npm run db:migrate
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Database Setup

### Local PostgreSQL

If you don't have PostgreSQL installed:

**macOS (using Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
createdb chartsfm
```

**Or use a cloud service:**
- [Supabase](https://supabase.com) (free tier available)
- [Neon](https://neon.tech) (free tier available)
- [Railway](https://railway.app) (free tier available)

Update your `DATABASE_URL` in `.env` accordingly.

## Project Structure

```
chartsfm/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   └── auth/         # NextAuth.js routes
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/            # React components
├── lib/                   # Utility functions
│   ├── prisma.ts         # Prisma client
│   └── lastfm.ts         # Last.fm API client
├── prisma/
│   └── schema.prisma     # Database schema
└── public/               # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio (database GUI)

## Next Steps

1. Set up authentication pages (`/auth/signin`, `/auth/signup`)
2. Create user dashboard
3. Implement Last.fm connection flow
4. Build chart components for listening stats
5. Add friend system
6. Create comparison visualizations

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Last.fm API Documentation](https://www.last.fm/api)
- [Recharts Documentation](https://recharts.org)

## License

MIT

