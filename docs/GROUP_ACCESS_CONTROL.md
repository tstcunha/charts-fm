# Group Access Control Security Documentation

## Overview
This document describes the access control system for group pages and API routes, ensuring private groups are properly protected from unauthorized access.

## Access Control Functions

### `getGroupAccess(groupId: string)`
Used by all group pages to check access. Returns:
- `{ user, group, isMember }` - User can access the group
- `{ user, group: null, isMember: false }` - User cannot access (group doesn't exist or is private and user is not a member)

**Security Checks:**
- Non-authenticated users: Can only access public groups
- Authenticated non-members: Can access public groups, but NOT private groups
- Authenticated members: Can access both public and private groups

### `checkGroupAccessForAPI(groupId: string)`
Used by all public-facing API routes. Throws errors with appropriate status codes:
- 404: Group not found
- 401: Private group requires authentication
- 403: Private group requires membership

**Security Checks:**
- Private groups require authentication (401 if not authenticated)
- Private groups require membership (403 if not a member)
- Public groups are accessible to everyone

### `getPublicGroupById(groupId: string)`
Used by the public page. Only returns groups where `isPrivate: false`.

## Protected Routes

### Pages (using `getGroupAccess`)
All pages in `app/[locale]/groups/[id]/` use `getGroupAccess`:
- Main group page
- Trends, Charts, Records, Chart-toppers, All-time, Search pages
- Deep dive pages (artist, track, album)

### API Routes (using `checkGroupAccessForAPI`)
All public-facing API routes use `checkGroupAccessForAPI`:
- `/api/groups/[id]/trends`
- `/api/groups/[id]/charts`
- `/api/groups/[id]/weekly-charts`
- `/api/groups/[id]/records`
- `/api/groups/[id]/records/preview`
- `/api/groups/[id]/chart-toppers`
- `/api/groups/[id]/search`
- `/api/groups/[id]/alltime-stats`
- `/api/groups/[id]/hero`
- `/api/groups/[id]/quick-stats`
- `/api/groups/[id]/charts/[type]/[slug]`

### Member-Only Routes (using `requireGroupMembership`)
These routes remain member-only:
- `/api/groups/[id]/comments` - Shoutbox
- `/api/groups/[id]/charts/update` - Chart generation
- `/api/groups/[id]/members` - Member management
- `/api/groups/[id]/weekly-charts/export` - Excel export

## Security Guarantees

1. **Private groups are never accessible to non-members**
   - `getGroupAccess` returns `null` group for private groups when user is not a member
   - `checkGroupAccessForAPI` throws 403 error for private groups when user is not a member

2. **Public groups are accessible to everyone**
   - Non-authenticated users can view public groups
   - Authenticated non-members can view public groups
   - Members can view public groups

3. **Pages show "Group not found" for inaccessible groups**
   - This is secure - doesn't reveal that a private group exists
   - All pages check `if (!group)` and show appropriate error

4. **API routes return proper error codes**
   - 404: Group doesn't exist
   - 401: Authentication required (for private groups)
   - 403: Membership required (for private groups)

## Testing Checklist

- [ ] Non-authenticated user cannot access private group pages
- [ ] Non-authenticated user can access public group pages
- [ ] Authenticated non-member cannot access private group pages
- [ ] Authenticated non-member can access public group pages
- [ ] Authenticated member can access both public and private groups
- [ ] All API routes properly enforce access control
- [ ] Private groups return 404/403 errors appropriately

