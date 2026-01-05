# On-Demand Chart Updates Documentation

This document explains the on-demand chart generation system that allows group members to manually trigger chart updates when new chart dates arrive.

## Overview

The on-demand chart update system replaces automatic chart fetching with a manual, member-initiated process. When a group's chart date has arrived or passed, any member can trigger chart generation through an "Update charts" button. The system generates missing weeks (up to 5 weeks maximum), handles overlapping charts intelligently, and prevents concurrent updates through database locking.

**Key Features:**
- Manual chart generation triggered by any group member
- Automatic detection of missing weeks
- Fire-and-forget asynchronous processing
- Database locking to prevent conflicts
- Maximum 5 weeks per update to prevent long-running operations
- Automatic overlap detection and cleanup

## Core Concepts

### Chart Update Availability

A group can update charts when:
1. **No charts exist**: Group has never generated charts (initial setup)
2. **Missing weeks exist**: The current finished week is later than the last chart week
3. **Not already updating**: No chart generation is currently in progress

### Missing Weeks Calculation

The system calculates missing weeks as follows:

1. **If no charts exist**: Generate the last 5 finished weeks (initial setup)
2. **If charts exist**:
   - Calculate the next expected week: `lastChartWeek + 7 days`
   - Calculate all finished weeks from next expected week to current finished week
   - Limit to maximum of 5 weeks (most recent 5 weeks)
   - This may leave gaps if a group is more than 5 weeks behind

**Example:**
- Last chart: Week of Jan 1
- Current finished week: Week of Jan 29
- Missing weeks: Jan 8, Jan 15, Jan 22, Jan 29 (4 weeks)
- If group was 10 weeks behind, only the most recent 5 weeks would be generated

### Overlap Detection

When generating charts, the system automatically detects and deletes overlapping charts. This handles cases where:
- The tracking day of week has changed
- Week boundaries have shifted
- Charts were generated with different week calculations

Overlap is detected by comparing date ranges:
- Two weeks overlap if: `weekStart1 < weekEnd2 AND weekStart2 < weekEnd1`

## Database Schema

### Group Model Additions

Two new fields were added to the `Group` model:

```prisma
chartGenerationInProgress Boolean @default(false) // Lock flag to prevent concurrent updates
chartGenerationStartedAt DateTime? // Timestamp for timeout detection
```

**Purpose:**
- `chartGenerationInProgress`: Boolean lock to prevent multiple simultaneous updates
- `chartGenerationStartedAt`: Timestamp to detect and recover from stale locks (30-minute timeout)

## API Endpoints

### GET `/api/groups/[id]/charts/update`

Check the current status of chart generation.

**Response:**
```json
{
  "inProgress": boolean,
  "canUpdate": boolean
}
```

**Fields:**
- `inProgress`: `true` if chart generation is currently running
- `canUpdate`: `true` if charts can be updated (missing weeks exist and not in progress)

### POST `/api/groups/[id]/charts/update`

Trigger chart generation (fire-and-forget).

**Authentication:** Requires group membership (any member, not just creator)

**Process:**
1. Verifies user is a group member
2. Acquires database lock (with timeout check)
3. Calculates missing weeks (up to 5 maximum)
4. Returns immediately (generation continues in background)
5. Generates charts asynchronously:
   - Deletes overlapping charts for each week
   - Generates chart for each week sequentially
   - Recalculates all-time stats
   - Updates group icon (if enabled)
   - Releases lock when complete

**Response:**
```json
{
  "success": true,
  "message": "Chart generation started"
}
```

**Error Responses:**
- `409 Conflict`: Chart generation already in progress
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User is not a group member
- `404 Not Found`: Group not found

### GET `/api/groups/[id]/hero`

Updated to include chart update status.

**New Response Fields:**
```json
{
  "canUpdateCharts": boolean,
  "chartGenerationInProgress": boolean,
  // ... other fields
}
```

## Frontend Components

### UpdateChartsButton

Client component that handles chart update requests and displays loading states.

**Props:**
- `groupId`: The group ID
- `initialInProgress`: Whether generation is already in progress (from server)
- `onUpdateComplete`: Optional callback when update completes

**Behavior:**
- Shows "Update charts" button when charts can be updated
- Shows spinner and "Updating charts..." when in progress
- Automatically polls for completion status
- Refreshes page when generation completes
- Handles errors gracefully

**States:**
1. **Idle**: Shows "Update charts" button (enabled)
2. **Updating**: Shows spinner + "Updating charts..." (disabled)
3. **Error**: Shows error message

### GroupHeroServer

Server component that conditionally renders the update button or countdown badge.

**Logic:**
- If `canUpdateCharts || chartGenerationInProgress`: Show `UpdateChartsButton`
- Else: Show "Next charts in X days" badge

### GroupHero

Client component with same conditional rendering, plus polling for status updates.

## State Management

### Locking Mechanism

The system uses optimistic database locking to prevent concurrent updates:

1. **Lock Acquisition**:
   ```typescript
   // Check for stale lock (30 minutes)
   if (lockAge > 30 minutes) {
     reset lock
   }
   
   // Attempt to acquire lock
   update group where chartGenerationInProgress = false
   set chartGenerationInProgress = true
   set chartGenerationStartedAt = now()
   ```

2. **Lock Release**:
   - On successful completion: Set both fields to `false`/`null`
   - On error: Set both fields to `false`/`null`
   - On timeout: Automatically reset by next request

3. **Timeout Handling**:
   - Locks older than 30 minutes are considered stale
   - Stale locks are automatically reset before acquiring new lock
   - Prevents permanent lockouts from crashed processes

### Fire-and-Forget Pattern

The POST endpoint returns immediately while generation continues in the background:

```typescript
// Start generation in background
generateChartsInBackground(...).catch(handleError)

// Return immediately
return { success: true, message: "Chart generation started" }
```

**Benefits:**
- User can leave the page immediately
- No request timeout issues
- Better user experience
- Frontend polls for completion status

## Chart Generation Process

### Step-by-Step Flow

1. **Calculate Missing Weeks**:
   - Get last chart week (if exists)
   - Calculate next expected week
   - Generate list of missing weeks (max 5)
   - Sort from oldest to newest

2. **For Each Week**:
   - Calculate week end date
   - Delete overlapping charts (if any)
   - Generate chart using `calculateGroupWeeklyStats`
   - Small delay (500ms) between weeks

3. **Post-Processing**:
   - Recalculate all-time stats
   - Update group icon (if dynamic icon enabled)
   - Release database lock

### Overlap Cleanup

Before generating each week, the system checks for overlapping charts:

```typescript
// Delete charts that overlap with new week
await deleteOverlappingCharts(groupId, weekStart, weekEnd)
```

This ensures:
- No duplicate charts for the same time period
- Automatic handling of tracking day changes
- Clean data when week boundaries shift

## Error Handling

### Lock Acquisition Failures

If lock acquisition fails (another process has the lock):
- Return `409 Conflict` status
- User sees error message
- Can retry after current generation completes

### Generation Errors

If generation fails during background processing:
- Lock is automatically released
- Error is logged to console
- User can retry the update
- No partial data is left in inconsistent state

### Timeout Recovery

If a lock is stale (>30 minutes old):
- Next request automatically resets the lock
- Generation can proceed normally
- Prevents permanent lockouts

## Usage Examples

### Basic Update Flow

1. User visits group page
2. System detects missing weeks
3. "Update charts" button appears
4. User clicks button
5. Button shows loading state
6. Generation runs in background
7. User can leave page
8. System polls for completion
9. Page refreshes when complete
10. Button reverts to countdown or shows "Update charts" again if more weeks are missing

### Returning During Update

1. User clicks "Update charts"
2. User navigates away
3. User returns to group page
4. System detects `chartGenerationInProgress = true`
5. Button shows loading state automatically
6. System polls for completion
7. Page updates when generation completes

### Multiple Missing Weeks

1. Group is 3 weeks behind
2. User clicks "Update charts"
3. System generates all 3 missing weeks
4. Group is now up to date
5. Button shows countdown to next chart date

### Maximum Week Limit

1. Group is 10 weeks behind
2. User clicks "Update charts"
3. System generates only the most recent 5 weeks
4. Group is still 5 weeks behind
5. Button shows "Update charts" again
6. User can click again to generate next 5 weeks

## Testing Considerations

### Concurrent Update Attempts

- Test: Two users click "Update charts" simultaneously
- Expected: Only one succeeds, other gets 409 Conflict
- Verify: Lock prevents duplicate generation

### Multiple Missing Weeks

- Test: Group is 3 weeks behind
- Expected: All 3 weeks generated in one update
- Verify: Sequential processing, all-time stats updated

### Maximum Week Limit

- Test: Group is 10 weeks behind
- Expected: Only 5 most recent weeks generated
- Verify: Gaps remain, button still shows "Update charts"

### Tracking Day Change

- Test: Group tracking day changed, new week overlaps with old chart
- Expected: Old overlapping chart deleted, new chart generated
- Verify: No duplicate charts, correct week boundaries

### Stale Lock Recovery

- Test: Lock exists from 35 minutes ago
- Expected: Lock automatically reset, new generation proceeds
- Verify: No permanent lockouts

### Fire-and-Forget Behavior

- Test: User clicks update, immediately navigates away
- Expected: Generation continues, completes successfully
- Verify: Charts generated when user returns

## Performance Considerations

### Maximum Week Limit

The 5-week limit prevents:
- Long-running API operations
- Timeout issues
- Resource exhaustion
- Poor user experience

Groups more than 5 weeks behind can catch up incrementally.

### Sequential Processing

Weeks are processed sequentially (oldest to newest) to:
- Ensure previous week comparisons work correctly
- Maintain data consistency
- Avoid API rate limit issues

### Polling Interval

Frontend polls every 2.5 seconds:
- Balances responsiveness with server load
- Provides timely updates
- Doesn't overwhelm the server

## Future Enhancements

Potential improvements:
- WebSocket/SSE for real-time updates instead of polling
- Progress indicators showing which week is being generated
- Batch updates for multiple groups
- Notification system for update completion
- Historical update logs

## Related Documentation

- [Vibe Score System](./VIBE_SCORE_SYSTEM.md): Chart calculation methods
- [Signup Implementation](./SIGNUP_IMPLEMENTATION.md): User and group setup

