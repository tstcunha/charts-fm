# Recommendations System Hidden for Launch

This document details all changes made to hide the recommendations system for a later launch. All changes are marked with `TEMPORARY:` comments in the code and can be easily reversed by following the instructions below.

**Date:** 2026-01-05
**Reason:** Hide recommendations system for initial launch, to be enabled in a future update

---

## Summary of Changes

1. **Dashboard - Groups You Might Like Section** (`components/dashboard/GroupsYouMightLike.tsx`)
   - Disabled API calls to `/api/dashboard/recommendations`
   - Added dummy group data (3 sample groups)
   - Added opaque overlay with "Coming Soon!" text
   - Disabled refresh button
   - Disabled reject functionality

2. **Group Public Page - Check Match Button** (`app/groups/[id]/public/CompatibilityScore.tsx`)
   - Made button faint (reduced opacity to 40%)
   - Changed tooltip from "Ready to discover your musical match score? Click to find out!" to "Coming Soon!"
   - Disabled button click functionality

---

## Detailed Changes

### 1. File: `components/dashboard/GroupsYouMightLike.tsx`

#### Change 1.1: Disabled API Calls and Added Dummy Data
**Location:** Lines ~35-76 (component state initialization and `handleFindGroups` function)

**What was changed:**
- Commented out the `useEffect` that calls `handleFindGroups()` on mount
- Commented out the entire `handleFindGroups` async function
- Replaced dynamic state with static dummy data initialized in `useState`
- Set `hasSearched` to `true` by default to skip initial state

**Dummy data structure:**
- 3 sample groups with IDs: `dummy-1`, `dummy-2`, `dummy-3`
- Groups: "Indie Rock Enthusiasts", "Jazz Collective", "Electronic Vibes"
- Each has mock compatibility scores and member counts

**To reverse:**
1. Remove the dummy data initialization from `useState`
2. Restore the original state initialization:
   ```typescript
   const [recommendations, setRecommendations] = useState<RecommendationGroup[]>([])
   const [isLoading, setIsLoading] = useState(false)
   const [isCalculating, setIsCalculating] = useState(false)
   const [error, setError] = useState<string | null>(null)
   const [hasSearched, setHasSearched] = useState(false)
   ```
3. Uncomment the `useEffect` hook that calls `handleFindGroups()`
4. Uncomment the entire `handleFindGroups` function

#### Change 1.2: Disabled Reject Functionality
**Location:** Lines ~78-97 (`handleReject` function)

**What was changed:**
- Commented out the entire `handleReject` function

**To reverse:**
- Uncomment the `handleReject` function

#### Change 1.3: Skipped Initial State (hasSearched = false)
**Location:** Lines ~99-124 (initial state return)

**What was changed:**
- Commented out the entire `if (!hasSearched)` block that shows the "Find Groups" button

**To reverse:**
- Uncomment the `if (!hasSearched)` block

#### Change 1.4: Skipped Loading/Error/Empty States
**Location:** Lines ~126-171 (loading, error, and empty state returns)

**What was changed:**
- Commented out all three conditional returns:
  - `if (isLoading || isCalculating)` - loading spinner
  - `if (error)` - error message with retry button
  - `if (recommendations.length === 0)` - empty state with refresh button

**To reverse:**
- Uncomment all three conditional blocks

#### Change 1.5: Added Opaque Overlay and Disabled Refresh Button
**Location:** Lines ~173-249 (main return statement)

**What was changed:**
- Disabled the refresh button (changed to `disabled` with gray styling)
- Wrapped the recommendations grid in a relative container
- Added `opacity-30` and `pointer-events-none` to the grid to make it faint
- Removed `Link` wrapper from dummy groups (made them non-clickable)
- Disabled reject buttons on dummy groups
- Added an absolute positioned overlay div with:
  - `bg-white/80 backdrop-blur-sm` for semi-transparent white background
  - Centered "Coming Soon!" text (large heading + subtitle)
  - `z-10` to appear above the grid

**To reverse:**
1. Restore the refresh button:
   ```typescript
   <button
     onClick={handleFindGroups}
     className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
   >
     Refresh
   </button>
   ```
2. Remove the relative wrapper and overlay div
3. Remove `opacity-30` and `pointer-events-none` from the grid
4. Restore `Link` wrapper around group cards
5. Restore reject button functionality (uncomment `handleReject` first)

---

### 2. File: `app/groups/[id]/public/CompatibilityScore.tsx`

#### Change 2.1: Made Button Faint and Changed Tooltip
**Location:** Lines ~122-149 (button render when no score exists)

**What was changed:**
- Changed tooltip content from `"Ready to discover your musical match score? Click to find out!"` to `"Coming Soon!"`
- Added `onClick` handler that prevents default and stops propagation
- Changed `disabled` from conditional (`disabled={isLoading}`) to always `true`
- Changed button styling:
  - From: `bg-white/90` → To: `bg-white/50`
  - Added: `opacity-40`
  - Added: `cursor-not-allowed`
  - Removed: `hover:bg-white transition-colors`
  - Removed: `disabled:opacity-50 disabled:cursor-not-allowed` (now always disabled)
- Removed loading state rendering (spinner and "Calculating..." text)

**To reverse:**
1. Restore original tooltip:
   ```typescript
   <Tooltip 
     content="Ready to discover your musical match score? Click to find out!"
     position="top"
   >
   ```
2. Restore original button:
   ```typescript
   <button
     ref={buttonRef}
     onClick={handleCalculate}
     disabled={isLoading}
     className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
   >
     {isLoading ? (
       <>
         <FontAwesomeIcon icon={faSpinner} className="animate-spin text-red-500" />
         <span className="font-semibold text-gray-600">Calculating...</span>
         <FontAwesomeIcon icon={faInfoCircle} className="text-gray-400 text-xs" />
       </>
     ) : (
       <>
         <FontAwesomeIcon icon={faHeart} className="text-red-500" />
         <span className="font-semibold text-gray-600">Check Match</span>
         <FontAwesomeIcon icon={faInfoCircle} className="text-gray-400 text-xs" />
       </>
     )}
   </button>
   ```

---

## Testing After Reversal

After reversing these changes, verify:

1. **Dashboard:**
   - "Groups You Might Like" section loads recommendations from API
   - Refresh button works and triggers API call
   - Reject buttons work and remove groups from list
   - Loading states display correctly
   - Error states display correctly
   - Empty states display correctly

2. **Group Public Page:**
   - "Check Match" button is fully visible and clickable
   - Tooltip shows original message
   - Button triggers compatibility calculation
   - Loading state shows spinner during calculation

---

## Search Patterns for Finding Changes

All temporary changes are marked with `TEMPORARY:` comments. You can search for:
- `TEMPORARY:` - All temporary changes
- `recommendations system hidden` - Specific to this feature
- `Coming Soon!` - The overlay text

---

## Notes

- The dummy data uses placeholder IDs (`dummy-1`, `dummy-2`, `dummy-3`) that won't conflict with real group IDs
- The overlay uses Tailwind classes that should work with the existing design system
- No database or API changes were made - only UI/UX changes
- The compatibility score calculation API endpoint (`/api/groups/${groupId}/compatibility`) is still functional, just not called from the UI

---

## Related Files (Not Modified)

These files are part of the recommendations system but were not modified:
- `app/api/dashboard/recommendations/route.ts` - API endpoint (still functional)
- `app/api/groups/[id]/compatibility/route.ts` - Compatibility calculation API (still functional)
- `app/api/groups/recommendations/reject/route.ts` - Reject recommendation API (still functional)
- `lib/group-compatibility.ts` - Compatibility calculation logic (still functional)
- `lib/group-compatibility-candidates.ts` - Candidate selection logic (still functional)
- `docs/RECOMMENDATION_SYSTEM.md` - System documentation (unchanged)

