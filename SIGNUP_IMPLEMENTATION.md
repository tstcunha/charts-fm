# Signup Implementation Summary

This document explains the Last.fm-based account creation flow that was implemented.

## Overview

Users can now create accounts by:
1. Connecting their Last.fm account (required)
2. Adding additional details: email, name, and password (for future logins)

The Last.fm username becomes the local username, and the Last.fm session key is stored for making authenticated API calls.

## Files Created/Modified

### Database Schema
- **`prisma/schema.prisma`**: Updated User model
  - `lastfmUsername` is now required (not optional)
  - Changed `lastfmApiKey` to `lastfmSessionKey` (stores the session key, not API key)

### Authentication Utilities
- **`lib/lastfm-auth.ts`**: New file with Last.fm authentication functions
  - `getLastFMAuthUrl()`: Generates Last.fm authorization URL
  - `createLastFMSession()`: Exchanges token for session key
  - `authenticatedLastFMCall()`: Makes authenticated API calls
  - `generateApiSignature()`: Creates MD5 signatures for API calls

### Pages
- **`app/auth/signup/page.tsx`**: Initial signup page
  - Client component that initiates Last.fm OAuth
  - Shows "Connect with Last.fm" button
  - Handles errors from query parameters

- **`app/auth/signup/complete/page.tsx`**: Account completion page
  - Client component with form for email, name, password
  - Validates Last.fm session before showing form
  - Submits account creation data

### API Routes
- **`app/api/auth/lastfm/authorize/route.ts`**: Initiates OAuth flow
  - Returns Last.fm authorization URL

- **`app/api/auth/lastfm/callback/route.ts`**: Handles OAuth callback
  - Receives token from Last.fm
  - Exchanges token for session key
  - Stores session temporarily in cookie
  - Redirects to completion page

- **`app/api/auth/lastfm/session/route.ts`**: Gets session info
  - Returns Last.fm username from cookie
  - Used by completion page to verify connection

- **`app/api/auth/signup/complete/route.ts`**: Completes account creation
  - Validates Last.fm session
  - Checks for duplicate email/Last.fm username
  - Hashes password
  - Creates user in database
  - Clears temporary session cookie

## Flow Diagram

```
User visits /auth/signup
    ↓
Clicks "Connect with Last.fm"
    ↓
GET /api/auth/lastfm/authorize
    ↓
Redirects to Last.fm authorization page
    ↓
User authorizes on Last.fm
    ↓
Last.fm redirects to /api/auth/lastfm/callback?token=xxx
    ↓
Callback exchanges token for session key
    ↓
Stores session in cookie
    ↓
Redirects to /auth/signup/complete
    ↓
User fills form (email, name, password)
    ↓
POST /api/auth/signup/complete
    ↓
Creates user in database
    ↓
Redirects to /auth/signin
```

## Environment Variables Required

Add these to your `.env` file:

```env
LASTFM_API_KEY=your_api_key_from_lastfm
LASTFM_API_SECRET=your_shared_secret_from_lastfm
```

## Last.fm API Account Configuration

You must configure the callback URL in your Last.fm API account:

**Local Development:**
```
http://localhost:3000/api/auth/lastfm/callback
```

**Production:**
```
https://yourdomain.com/api/auth/lastfm/callback
```

See `LASTFM_SETUP.md` for detailed setup instructions.

## Security Considerations

1. **Session Storage**: Currently using HTTP-only cookies for temporary session storage. In production, consider using Redis or a database for better scalability.

2. **Password Hashing**: Passwords are hashed using bcrypt before storage.

3. **API Secrets**: Never commit `LASTFM_API_SECRET` to version control. It's in `.gitignore`.

4. **Token Expiry**: Last.fm tokens expire after 60 minutes. The cookie is set to expire after 1 hour.

## Next Steps

After running database migrations:

1. Update your `.env` with Last.fm credentials
2. Configure callback URL in Last.fm API account
3. Test the signup flow
4. Create a sign-in page (users will use email + password)

## Testing

1. Start dev server: `npm run dev`
2. Visit http://localhost:3000/auth/signup
3. Click "Connect with Last.fm"
4. Authorize the application
5. Complete the account form
6. Verify user was created in database

## Database Migration

After updating the schema, run:

```bash
npm run db:generate
npm run db:push
```

This will update your database to match the new schema.

