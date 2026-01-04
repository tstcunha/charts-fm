# Vibe Score System Documentation

This document explains the Vibe Score (VS) system that replaces simple play count aggregation with a customizable, rank-based scoring system for group charts.

## Overview

The Vibe Score system allows group owners to choose how charts are calculated and ranked. Instead of simply summing play counts across all users, VS uses a position-based scoring system that makes charts more dynamic and prevents heavy listeners from dominating group charts.

**Key Benefits:**
- More balanced representation of all group members' listening habits
- Customizable calculation modes per group
- Per-user contribution tracking for future features
- Dynamic charts that reflect diverse listening patterns

## Core Concepts

### Vibe Score (VS)

VS is a score calculated for each item (track, artist, or album) based on its position in each user's personal weekly chart. The score ranges from 0.00 to 1.00, with higher positions receiving higher scores.

### Calculation Formula

For each user's top N items (where N = `group.chartSize`):

```
VS = 1.00 - (1.00 × (position - 1) / chartSize)
```

**Examples:**
- Position 1: `1.00 - (1.00 × 0 / 20) = 1.00`
- Position 2: `1.00 - (1.00 × 1 / 20) = 0.95`
- Position 10: `1.00 - (1.00 × 9 / 20) = 0.55`
- Position 20: `1.00 - (1.00 × 19 / 20) = 0.05`
- Position 21+: `0.00` (items beyond chartSize receive no VS)

### Chart Size Relationship

The number of positions considered per user is tied to the group's chart size:
- Chart size 10 → Top 10 per user considered
- Chart size 20 → Top 20 per user considered
- Chart size 50 → Top 50 per user considered
- Chart size 100 → Top 100 per user considered

## Chart Modes

Group owners can choose from three calculation modes:

### 1. VS Mode (`vs`)

**How it works:** Sums VS scores across all users for each item.

**Example:**
- User A's #1 track gets 1.00 VS
- User B's #5 track gets 0.80 VS (if chartSize=10)
- If both users listened to the same track, total VS = 1.80

**Best for:** Groups with diverse listening habits where you want to emphasize what's important to each member equally.

### 2. VS Weighted (`vs_weighted`)

**How it works:** Multiplies each user's VS by their play count, then sums across users.

**Formula:** `Sum(VS × playcount)` for each item

**Example:**
- User A's #1 track (1.00 VS) with 28 plays = 28.00 contribution
- User B's #1 track (1.00 VS) with 5 plays = 5.00 contribution
- Total VS = 33.00

**Best for:** Balancing ranking importance with listening volume. Rewards both high position and high play count.

### 3. Plays Only (`plays_only`)

**How it works:** Traditional mode - sums play counts across all users. VS equals total plays for consistency.

**Example:**
- User A: 28 plays
- User B: 19 plays
- Total VS = 47 (same as total plays)

**Best for:** Groups that prefer the traditional play count ranking system.

## Database Schema

### New Fields

#### Group Model
- `chartMode` (String, default: `"plays_only"`)
  - Values: `"vs"`, `"vs_weighted"`, or `"plays_only"`

#### GroupChartEntry Model
- `vibeScore` (Float, nullable)
  - Stores the aggregated VS for each chart entry
  - Used for ranking and display
  - Nullable to support existing entries before migration

#### New Model: UserChartEntryVS

Stores per-user VS contributions to enable future "individual contributions" features.

```prisma
model UserChartEntryVS {
  id        String   @id @default(cuid())
  userId    String
  groupId   String
  weekStart DateTime
  chartType String   // "artists" | "tracks" | "albums"
  entryKey  String   // Normalized key for matching
  vibeScore Float    // User's VS contribution
  playcount Int      // User's playcount for reference
  createdAt DateTime
  updatedAt DateTime
  
  user  User  @relation(...)
  group Group @relation(...)
  
  @@unique([userId, groupId, weekStart, chartType, entryKey])
  @@index([groupId, weekStart])
  @@index([userId, groupId, weekStart])
  @@index([groupId, weekStart, chartType])
}
```

**Purpose:** Enables querying which users contributed to each chart entry and their individual VS scores.

## Key Files

### Core Logic
- **`lib/vibe-score.ts`**
  - `calculateUserVS()`: Calculates VS for each item in a user's top N
  - `aggregateGroupStatsVS()`: Aggregates VS across users based on mode
  - Type definitions: `ChartMode`, `UserVSContribution`, `PerUserVSData`

### Integration
- **`lib/group-stats.ts`**
  - `aggregateGroupStatsWithVS()`: Wrapper that calls VS aggregation
  - Maintains backward compatibility with legacy `aggregateGroupStats()`

- **`lib/group-service.ts`**
  - `calculateGroupWeeklyStats()`: Main function that orchestrates VS calculation
  - `storeUserChartEntryVS()`: Stores per-user VS contributions
  - Fetches `chartMode` from group settings

- **`lib/group-chart-metrics.ts`**
  - `cacheChartMetrics()`: Stores aggregated VS in `GroupChartEntry`
  - `getCachedChartEntries()`: Retrieves entries with VS and VS change tracking
  - `EnrichedChartItem`: Interface includes `vibeScore` and `vibeScoreChange`

### API & UI
- **`app/api/groups/[id]/settings/route.ts`**
  - GET: Returns `chartMode` in settings
  - PATCH: Validates and updates `chartMode`

- **`app/groups/[id]/settings/GroupSettingsForm.tsx`**
  - Chart mode selector with explanations
  - Radio buttons for each mode

- **`app/groups/[id]/charts/ChartTable.tsx`**
  - Displays VS column with 2 decimal places
  - Shows VS change (similar to plays change)

## Calculation Flow

```
1. User Weekly Stats (from Last.fm)
   ↓
2. Calculate VS per User
   - Take top N items (N = group.chartSize)
   - Calculate VS based on position
   - Items beyond N get 0.00 VS
   ↓
3. Store Per-User VS
   - Save to UserChartEntryVS table
   - Enables future individual contribution views
   ↓
4. Aggregate by Mode
   - VS mode: Sum VS across users
   - VS weighted: Sum (VS × playcount)
   - Plays-only: Sum playcount (stored as VS)
   ↓
5. Store Aggregated Results
   - Save to GroupChartEntry.vibeScore
   - Save to GroupWeeklyStats (JSON, without VS)
   ↓
6. Rank Charts
   - Sort by vibeScore (descending)
   - Tiebreaker: playcount (descending)
```

## API Endpoints

### Group Settings
- **GET `/api/groups/[id]/settings`**
  - Returns: `{ chartSize, chartMode, trackingDayOfWeek }`

- **PATCH `/api/groups/[id]/settings`**
  - Body: `{ chartMode?: "vs" | "vs_weighted" | "plays_only" }`
  - Validates mode is one of the three allowed values
  - Note: Mode changes only affect future charts (historical charts keep original mode unless regenerated)

### Chart Generation
- **POST `/api/groups/[id]/charts`**
  - Regenerates last 5 finished weeks
  - Uses current `chartMode` from group settings
  - Deletes and recalculates all affected charts

## Chart Regeneration Behavior

**Important:** When charts are regenerated, they use the group's **current** `chartMode`, not the mode that was active when the chart was originally created.

**Example:**
1. Group created with `plays_only` mode
2. Charts generated for weeks 1-5 using `plays_only`
3. Owner changes mode to `vs`
4. Owner regenerates charts
5. All 5 weeks are recalculated using `vs` mode

This is intentional - regeneration explicitly recalculates with current settings. Historical charts are only preserved if not regenerated.

## Display

### Chart Table
- **VS Column**: Shows aggregated VS with 2 decimal places (e.g., "1.00", "0.95")
- **VS Change**: Shows change from previous week (e.g., "↑0.15", "↓0.05")
- **Plays Column**: Still displayed for reference
- **Ranking**: Charts are sorted by VS (descending), then by playcount as tiebreaker

### Settings UI
- Radio button selector for chart mode
- Each mode includes:
  - Label (e.g., "VS Mode")
  - Description explaining how it works
  - Visual indication of selected mode

## Future Features Enabled

The per-user VS storage (`UserChartEntryVS` model) enables:

1. **Individual Contribution Views**
   - Show which users contributed to each chart entry
   - Display each user's VS contribution
   - Highlight top contributors

2. **User-Specific Analytics**
   - "Your top contributions to this group"
   - "How your listening affected the charts"
   - Personal impact metrics

3. **Advanced Visualizations**
   - Heatmaps showing user contributions
   - Timeline of individual user influence
   - Comparison views between users

## Migration Notes

### Database Migration Required

After schema changes, run:
```bash
npx prisma migrate dev --name add_vibe_score_system
npx prisma generate
```

### Backward Compatibility

- Existing groups default to `plays_only` mode
- Historical charts keep their original calculation until regenerated
- `vibeScore` field is nullable to support existing entries
- Legacy `aggregateGroupStats()` function still available

### Data Population

- VS is calculated and stored when charts are generated
- Existing charts will have `null` vibeScore until regenerated
- Per-user VS is stored automatically during chart generation

## Examples

### Example 1: VS Mode Calculation

**Group Settings:**
- Chart size: 20
- Mode: `vs`

**User A's Top Tracks:**
1. "Carnaval" - 28 plays → 1.00 VS
2. "Bad Romance" - 19 plays → 0.95 VS
3. "Alejandro" - 18 plays → 0.90 VS
...
20. "Berghain" - 4 plays → 0.05 VS

**User B's Top Tracks:**
1. "Bad Romance" - 15 plays → 1.00 VS
2. "Carnaval" - 12 plays → 0.95 VS

**Result:**
- "Carnaval": 1.00 (User A) + 0.95 (User B) = **1.95 VS**
- "Bad Romance": 0.95 (User A) + 1.00 (User B) = **1.95 VS**
- "Alejandro": 0.90 (User A) = **0.90 VS**

Both "Carnaval" and "Bad Romance" tie at 1.95 VS, ranked by playcount as tiebreaker.

### Example 2: VS Weighted Mode

**Same users, VS Weighted mode:**

**Result:**
- "Carnaval": (1.00 × 28) + (0.95 × 12) = 28.00 + 11.40 = **39.40 VS**
- "Bad Romance": (0.95 × 19) + (1.00 × 15) = 18.05 + 15.00 = **33.05 VS**

"Carnaval" wins because User A's high play count (28) multiplied by high VS (1.00) creates a larger contribution.

## Testing Considerations

When testing the VS system:

1. **Test with different chart sizes** (10, 20, 50, 100)
   - Verify VS calculation formula works correctly
   - Ensure items beyond chartSize get 0.00 VS

2. **Test all three modes**
   - VS mode: Verify simple summation
   - VS weighted: Verify multiplication then summation
   - Plays-only: Verify VS equals total plays

3. **Test mode switching**
   - Change mode and regenerate charts
   - Verify new mode is applied
   - Check historical charts (if not regenerated) keep old mode

4. **Test per-user VS storage**
   - Verify UserChartEntryVS records are created
   - Check unique constraints work
   - Verify cleanup on regeneration

5. **Test edge cases**
   - Single user groups
   - Groups with users who have no listening data
   - Ties in VS scores

## Troubleshooting

### VS is null for existing charts
- **Solution**: Regenerate charts using the "Generate Charts" button
- VS is only calculated during chart generation

### VS doesn't match expected values
- Check group's `chartMode` setting
- Verify `chartSize` matches expected number of positions
- Check that user's top items include the item in question

### Per-user VS not stored
- Verify migration was run successfully
- Check that `storeUserChartEntryVS()` is being called
- Review database for UserChartEntryVS records

## Related Documentation

- [Signup Implementation](./SIGNUP_IMPLEMENTATION.md) - Last.fm authentication flow
- [README.md](../README.md) - Project overview and setup

## Code References

- VS Calculation: `lib/vibe-score.ts`
- Aggregation: `lib/group-stats.ts`
- Chart Generation: `lib/group-service.ts`
- Metrics Caching: `lib/group-chart-metrics.ts`
- Settings API: `app/api/groups/[id]/settings/route.ts`
- Settings UI: `app/groups/[id]/settings/GroupSettingsForm.tsx`
- Chart Display: `app/groups/[id]/charts/ChartTable.tsx`

