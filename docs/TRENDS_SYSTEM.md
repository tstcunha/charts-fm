# Trends System Documentation

This document explains the Trends system that provides insights into weekly chart movements, member contributions, and entry patterns for group charts.

## Overview

The Trends system analyzes weekly chart data to identify and highlight various patterns and movements. It provides a comprehensive view of how entries move in and out of charts, which members contribute most, and interesting statistics about chart activity.

**Key Features:**
- Track new entries, comebacks, and exits
- Identify biggest climbers and fallers
- Highlight longest charting streaks
- Show member contributions and MVP
- Generate fun facts about chart activity
- Personalized stats for individual members

## Core Concepts

### Entry Types

Entries in charts are classified into three types:

1. **New Entry** (`entryType: "new"`)
   - First time appearing in the group's top charts
   - `totalWeeksAppeared === 1` and `positionChange === null`
   - Displayed as "NEW" in blue

2. **Re-Entry** (`entryType: "re-entry"`)
   - Returned to charts after being away
   - `totalWeeksAppeared > 1` and `positionChange === null`
   - Displayed as "RE" in light blue

3. **Continuing Entry** (`entryType: null`)
   - Was in previous week and remains in current week
   - `positionChange !== null` (shows position movement)

### Trend Categories

The trends system identifies six main categories of chart movements:

#### 1. Longest Streaks
Entries that have been in the top 10 for the longest consecutive time, ranked by `totalWeeksAppeared`.

**Calculation:**
- Sorted by `totalWeeksAppeared` (descending)
- Shows current position and number of weeks in top 10
- Displayed in each category tab (Artists, Tracks, Albums)

#### 2. Comebacks
Entries that returned to charts after being away, ranked by how long they were away.

**Calculation:**
- Entries not in previous week but with `totalWeeksAppeared > 1`
- Calculates weeks since last appearance by querying historical chart entries
- Sorted by `weeksAway` (descending)
- Displayed in each category tab

#### 3. New Entries
First-time entries in the current week's charts.

**Calculation:**
- Entries not in previous week AND `totalWeeksAppeared === 1`
- Excludes comebacks (which are tracked separately)
- Shows total count at bottom of card

#### 4. Biggest Climbers
Entries that moved up the most positions compared to previous week.

**Calculation:**
- Entries with `positionChange < 0` (negative = moved up)
- Sorted by `positionChange` (ascending, most negative first)
- Shows position change and old → new position

#### 5. Biggest Fallers
Entries that moved down the most positions compared to previous week.

**Calculation:**
- Entries with `positionChange > 0` (positive = moved down)
- Sorted by `positionChange` (descending, most positive first)
- Shows position change and old → new position

#### 6. Exits
Entries that were in previous week but dropped out of current week's charts.

**Calculation:**
- Entries in previous week but not in current week
- Shows last position before exit
- Shows total count at bottom of card

## Trends Page Structure

The trends page is organized into a folder-style tabbed interface with the following sections:

### Quick Stats Cards (Top)
- **Total Plays**: Current week's total with change from previous week
- **New Entries**: Count of first-time entries
- **Exits**: Count of entries that dropped out

### Fun Facts Section
Automatically generated interesting facts about the week's chart activity, including:
- Comeback highlights
- Longest streaks
- Peak positions
- First-time entries
- MVP recognition
- Total plays celebration

### Tabbed Interface

#### Member Trends Tab
- **Your Impact**: Personalized contribution stats (if logged in)
  - Total contribution (plays and VS)
  - Taste match percentage
  - Comparison with MVP
- **Top Contributors**: Members ranked by total contribution
- **Member Spotlight/MVP**: Highlighted member with top contributions
- **Your Detailed Stats**: 
  - Top contributions
  - Entries you drove (50%+ contribution)
  - Biggest movers you contributed to

#### Artists/Tracks/Albums Tabs
Each category tab displays six trend cards:
1. **Longest Streaks**: Top entries by consecutive weeks
2. **Comebacks**: Entries that returned, ranked by weeks away
3. **New Entries**: First-time entries
4. **Biggest Climbers**: Entries that moved up most
5. **Biggest Fallers**: Entries that moved down most
6. **Exits**: Entries that dropped out

Each card shows:
- First 3 entries in normal size with full details
- Remaining entries (up to 10 total) in smaller, compact format
- Total count footer for New Entries and Exits cards
- Empty state message if no entries

## Data Calculation

### When Trends Are Calculated

Trends are automatically calculated and stored when:
- Charts are generated for a group
- Called via `calculateGroupTrends()` function

### Calculation Process

1. **Fetch Current Week Data**
   - Get all chart entries for current week
   - Include `totalWeeksAppeared` and `positionChange` from `GroupChartEntry`

2. **Fetch Previous Week Data**
   - Get chart entries from 7 days earlier
   - Used for comparison and identifying movements

3. **Identify Trends**
   - New entries: Not in previous week + `totalWeeksAppeared === 1`
   - Comebacks: Not in previous week + `totalWeeksAppeared > 1` (calculated separately)
   - Exits: In previous week but not in current week
   - Climbers/Fallers: Entries with non-null `positionChange`

4. **Calculate Member Contributions** (if 3+ members)
   - Get each member's VS contributions
   - Calculate total plays and VS per member
   - Rank by contribution
   - Identify MVP (top contributor)

5. **Generate Fun Facts**
   - Analyze trends for interesting patterns
   - Generate contextual facts about the week

6. **Store in Database**
   - All trends stored in `GroupTrends` table
   - JSON fields for arrays of entries
   - Cached for quick retrieval

## Database Schema

### GroupTrends Model

```prisma
model GroupTrends {
  id                String   @id @default(cuid())
  groupId           String   @unique
  weekStart         DateTime
  weekEnd           DateTime
  
  // Entry highlights (JSON arrays)
  newEntries        Json     // Array of EntryHighlight
  biggestClimbers   Json     // Array of EntryHighlight with positionChange
  biggestFallers    Json     // Array of EntryHighlight with positionChange
  exits             Json     // Array of EntryHighlight with lastPosition
  
  // Member contributions
  topContributors   Json?    // Array of MemberContribution
  memberSpotlight   Json?    // MemberSpotlight object
  
  // Stats
  totalPlays        Int
  totalPlaysChange   Int?
  chartTurnover     Int      // Number of new entries
  funFacts          Json     // Array of strings
  
  previousWeekStart DateTime?
}
```

### GroupChartEntry Model (Relevant Fields)

```prisma
model GroupChartEntry {
  // ... other fields ...
  positionChange    Int?     // null for new/re-entry, negative = up, positive = down
  totalWeeksAppeared Int     // Count of weeks in top charts
  entryType         String?   // "new" | "re-entry" | null
  // ... other fields ...
}
```

## API Endpoints

### GET `/api/groups/[id]/trends`

Fetches trends data for a group.

**Query Parameters:**
- `includePersonal` (boolean): Include personalized stats for logged-in user

**Response:**
```json
{
  "trends": {
    "newEntries": [...],
    "biggestClimbers": [...],
    "biggestFallers": [...],
    "exits": [...],
    "topContributors": [...],
    "memberSpotlight": {...},
    "totalPlays": 12345,
    "totalPlaysChange": 500,
    "chartTurnover": 3,
    "funFacts": [...]
  },
  "personalizedStats": {...},  // if includePersonal=true
  "longestStreaks": [...],     // calculated on-the-fly
  "comebacks": [...]            // calculated on-the-fly
}
```

**Note:** `longestStreaks` and `comebacks` are calculated on-the-fly from current chart entries, not stored in the trends cache.

## Key Functions

### `calculateGroupTrends(groupId, weekStart, trackingDayOfWeek)`

Main function that calculates and stores all trends for a week.

**Process:**
1. Gets current and previous week chart entries
2. Calculates total plays and changes
3. Identifies new entries, exits, climbers, fallers
4. Calculates member contributions (if 3+ members)
5. Generates fun facts
6. Stores everything in `GroupTrends` table

### `identifyNewEntries(currentEntries, previousEntries)`

Identifies first-time entries, excluding comebacks.

**Logic:**
- Not in previous week AND `totalWeeksAppeared === 1`

### `identifyComebacks(currentEntries, previousEntries, groupId, weekStart)`

Identifies entries that returned after being away.

**Logic:**
- Not in previous week AND `totalWeeksAppeared > 1`
- Queries historical entries to calculate `weeksAway`

### `calculatePersonalizedStats(userId, groupId, weekStart, trends)`

Calculates personalized statistics for a specific user.

**Returns:**
- Total contribution (plays, VS, percentage)
- Top contributions
- Entries driven (50%+ contribution)
- Biggest movers contributed to
- Taste match with group
- Comparison with MVP and other members

## UI Components

### TrendsClient (`app/groups/[id]/trends/TrendsClient.tsx`)

Main client component that renders the trends page.

**Features:**
- Tabbed interface (Members, Artists, Tracks, Albums)
- Fetches longest streaks and comebacks from API
- Organizes data by category
- Renders trend cards with proper formatting
- Shows empty states when no data

### ChartTable (`app/groups/[id]/charts/ChartTable.tsx`)

Displays chart entries with position changes.

**Entry Type Display:**
- "NEW" in blue (`text-blue-600`) for new entries
- "RE" in light blue (`text-blue-400`) for re-entries
- Position changes (↑/↓) for continuing entries

### PositionMovementIcon (`components/PositionMovementIcon.tsx`)

Icon component for showing entry movement.

**Icons:**
- ⭐ for new entries
- 🔄 for re-entries
- ↑ for climbers (green)
- ↓ for fallers (red)
- = for no change (gray)

## Best Practices

### Performance Considerations

1. **Caching**: Trends are calculated once per chart generation and cached
2. **On-the-fly Calculation**: Longest streaks and comebacks calculated on API request (not stored)
3. **Pagination**: Trend cards show max 10 entries (3 large + 7 small)

### Data Consistency

- Trends are recalculated when charts are regenerated
- Historical data is preserved in `GroupChartEntry` table
- `totalWeeksAppeared` is maintained across all weeks

### User Experience

- Empty states show friendly messages with emoji
- Cards always display even when empty
- Tooltips explain complex stats
- Responsive design for mobile and desktop

## Future Enhancements

Potential improvements to the trends system:

1. **Historical Trends**: View trends across multiple weeks
2. **Trend Predictions**: Predict likely climbers/fallers
3. **Member Comparisons**: Compare contributions across time
4. **Export Functionality**: Export trends data
5. **Custom Time Ranges**: View trends for custom date ranges
6. **Trend Alerts**: Notifications for significant movements



