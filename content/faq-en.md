## What is the Vibe Score (VS)?

Vibe Score (VS) is a scoring system used to generate charts. It makes charts more dynamic and ensures that everyone's favorites in a group are represented in the charts. Instead of summing all play counts from all users, VS uses a ranking system that prevents charts from always being dominated by the most avid music listeners in a group.

### How is Vibe Score Calculated?

VS is calculated for each item (track, artist, or album) based on its position in each user's **personal** weekly chart.

For the top 100 items of each user, VS uses a three-tier system:

1. **Position 1**: Gets special weighting of **2.00 VS**
2. **Positions 2-21**: Linear reduction by 0.05 per position
   - Formula: `VS = 2.00 - (0.05 × (position - 1))`
   - Position 21 reaches 1.00 VS
3. **Positions 22-100**: Linear interpolation from 1.00 to 0.00
   - Formula: `VS = 1.00 × (1 - ((position - 21) / 80))`
4. **Position 101+**: `0.00` (items beyond the top 100 receive no VS)

**Examples:**
- Position 1: `2.00 VS` (special weighting)
- Position 2: `2.00 - (0.05 × 1) = 1.95 VS`
- Position 10: `2.00 - (0.05 × 9) = 1.55 VS`
- Position 21: `2.00 - (0.05 × 20) = 1.00 VS`
- Position 50: `1.00 × (1 - 29/80) = 0.64 VS`
- Position 100: `1.00 × (1 - 79/80) = 0.01 VS`
- Position 101+: `0.00` (items beyond the top 100 receive no VS)

![VS Calculation Graph](/icons/VS_graph.png)

In other words: suppose Joseph and Adam are members of the same group. Joseph listened to Lady Gaga 500 times in a week, making her his most listened artist that week. Adam listened to Ariana Grande only 50 times, but she was his most listened artist that week.

Even though Joseph listened to Lady Gaga many more times than Adam listened to Ariana Grande, both artists will receive the same amount from each listener: **both will receive 2.00 VS**.

Simply put, what counts for the score is not how many times you listened to an artist, but their position among your favorites. The main benefit of this system is that Joseph, who listens to much more music than all his friends, won't dominate all the charts of the groups he's in simply by listening to much more music, and the charts will be a representation of everyone's favorites!

### Chart Modes

You don't need to use this system to calculate your charts if you don't want to. Group owners can choose between three calculation modes:

#### 1. VS Mode
Sums the VS points of all users for each item. This is the best system for groups with varied habits, where you want to equally represent each member's favorites.

**Example:**
- User A's #1 track receives 2.00 VS
- User B's #5 track receives 1.80 VS (2.00 - 0.20)
- If both users listened to the same track, total VS = 3.80

#### 2. VS Weighted Mode
In this mode, we multiply each user's VS by their play count, then sum across users. This method balances the importance of ranking with listening volume: in addition to items needing to receive high positions among group members to enter the charts, play count is also taken into consideration.

**Formula:** `Sum(VS × play count)` for each item

**Example:**
- User A's #1 track (2.00 VS) with 28 plays = 56.00 contribution
- User B's #1 track (2.00 VS) with 5 plays = 10.00 contribution
- Total VS = 66.00

#### 3. Plays Only Mode
Traditional mode - sums play counts from all users. For consistency, VS in this mode will equal play count. This is best for groups that prefer a simple and traditional system.

**Example:**
- User A: 28 plays
- User B: 19 plays
- Total VS = 47 (equal to total plays)

---

## How is Musical Match Calculated?

> **Note:** This feature will be available in a future update. Soon you'll be able to calculate your musical match with other groups!

Match percentage measures how compatible your music taste is with the general listening habits of a given group. This percentage is calculated using a combination of four factors:

### 1. Genre Overlap (45% weight)
This is the most important factor. Compares the genres of your top artists with the top artists of the group. Here, genre similarity algorithms are applied to discover how well your musical genres align.

### 2. Artist Overlap (25% weight)
Compares your top artists with the group's all-time top artists. We use weighted Jaccard similarity, where higher-ranked artists (positions 1, 2, 3, etc.) contribute more to the score than lower-ranked ones.

### 3. Track Overlap (20% weight)
Compares your top tracks with the group's all-time top tracks. Also uses weighted Jaccard similarity. **Important:** A non-linear transformation is applied to increase small overlaps, since getting an *exact* track match is rare, even when people like the same artists.

### 4. Listening Patterns (10% weight)
Combines three sub-factors:
- **Diversity:** Ratio of unique artists/tracks to total listening. (= if you listen to varied music and artists, or if you stick more to the same ones)
- **Consistency:** Variance in weekly listening volume (= if you usually listen a lot one week and little the next, or if you're more constant)
- **Recency:** Weighted average of recent weeks (exponential decay, 30-day half-life)

### Final Score Calculation

The final musical match score (0-100) is calculated as follows:

```
score = (
  genreOverlap × 0.45 +
  artistOverlap × 0.25 +
  trackOverlap × 0.20 +
  listeningPatterns × 0.10
) × 100
```

**How to interpret the result:**
- **70-100%:** Excellent match - very high compatibility
- **50-69%:** Good match - moderate compatibility
- **30-49%:** Moderate match - some overlap
- **0-29%:** Low match - limited compatibility

---

## How are Member Awards Decided?

Member awards are automatically calculated and displayed on the records page. These awards recognize different types of contributions and achievements within a group. Here are all the awards, and how winners are determined:

### VS Virtuoso
The user who contributed the most total Vibe Score points across all charts. This recognizes the member whose way of listening to music had the greatest impact on the group's charts.

Remember that each member gives a VS score to all items they listened to, from first to hundredth, and only after that are the group's charts generated. Not all items in a member's top 100 will appear in the group's charts: if you give 1.50 VS to an artist, but that artist doesn't receive enough VS from other members to appear in the charts, the result is that those 1.50 VS didn't impact the final chart.

The conclusion is that different members will always impact the week's charts with different weights, with some having more impact (generally, those whose taste aligns better with the rest of the group), and others, less.

### Play Powerhouse
The member who contributed the most total **plays** across all charts. This is the member who listens to the most music overall.

### Chart Connoisseur
This is the member who contributed the most items that debuted in the group's charts. This award recognizes members who bring new and popular music to the group.

### Hidden Gem Hunter
The least mainstream member - this is the member who contributed the *fewest* items that debuted in the charts (but at least 1). It's an award that recognizes the member who has the most niche, or most unique, listening habits.

### Consistency Champion
The user who contributed to charts over the most weeks. This award recognizes the member who is constantly listening to items that are popular among other group members.

### Taste Maker
The member who brought the most items that, over time, reached #1 on the charts. This award recognizes those members who bring new music to the group and it becomes popular.

**Note:** Awards are calculated automatically after chart generation is completed. The calculation runs in the background, and may take a few moments to complete.

---

## How is the Week's MVP Chosen?

The Week's MVP (*Most Valuable Player*) is the group member who contributed the most to the **current** week's charts. This member is chosen by calculating each member's total contribution, and the member who gave the most VS points to the week's charts is the MVP. In other words, it's the member whose favorites most aligned with those of the group as a whole.

### Selection Process

1. **Calculate Contributions:** For each group member, sum all Vibe Score points they gave to all chart items (artists, tracks, and albums) for the current week.

2. **Rank Members:** Members are ranked by their total VS contribution, and the member who contributed the highest score is chosen as the MVP.

### How to Find the MVP

The Week's MVP appears on the page and in the **Trends** tab, with prominent display at the top of the Members section of the page. If you're not the MVP, by entering the Trends page, you can see how your total contribution to the week's charts compares to theirs.

---
