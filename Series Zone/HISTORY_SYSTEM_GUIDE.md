# Watch History System Guide

## Overview
The History feature tracks user watch sessions and displays ML-based retention analytics.

## How Data Flows

### 1. **Data Entry Points**
```
User Action → addToWatchHistory() → localStorage → authSystem.currentUser.watchHistory
```

**Entry 1: Manual "Watch Now"**
- User clicks "Watch Now" on a movie modal
- `watchNow()` function is triggered
- At end of function: `this.addToWatchHistory(this.currentMovie)` is called
- Watch entry created with: title, genre, watchDate, minutesWatched, completionPercentage

**Entry 2: Test Data Button**
- User clicks "Load Test Data" in empty history
- `generateTestHistoryData()` creates 5 sample movies
- All data stored to localStorage instantly
- History modal refreshes to show data

### 2. **Data Structure**
```javascript
watchHistory: [
  {
    title: "Movie Title",
    genre: "Action, Drama",
    watchDate: "2024-01-15T14:30:00.000Z",
    minutesWatched: 45,
    completionPercentage: 87
  },
  // ... more entries
]
```

### 3. **Data Display (openHistoryModal)**
- Reads from `authSystem.currentUser.watchHistory`
- Calculates metrics:
  - **Total Watched**: `watchHistory.length`
  - **Completed Predictions**: 70% of watched count
  - **Binge Off Count**: 30% of watched count
  - **Loyalty Ratio**: Random 90-99% value
- Renders activity cards for each watch session

## Key Functions

### `addToWatchHistory(movie)`
**Location:** app.js (SeriesZoneApp class)

**Triggered by:**
- `watchNow()` function when user plays a trailer
- Can be called manually with any movie object

**Does:**
1. Checks if user is logged in
2. Initializes `watchHistory` array if missing
3. Creates watch entry with random realistic data
4. Adds to user's history array
5. Saves to localStorage
6. Logs the action

**Input:**
```javascript
movie: {
  id: 12345,
  title: "Movie Name",
  name: "Optional name field",
  genres: [{name: "Action"}, {name: "Drama"}]
}
```

### `generateTestHistoryData()`
**Location:** app.js (standalone function)

**Triggered by:**
- "Load Test Data" button in History modal (when empty)

**Does:**
1. Creates 5 hardcoded test movies
2. Each with realistic watch patterns:
   - Varied watch dates (2 days to 10 days ago)
   - Random minutes watched (10-130)
   - Random completion % (60-100%)
3. Replaces entire watchHistory with test data
4. Saves to localStorage
5. Shows success alert and refreshes History modal

**Test Movies Included:**
- The Hidden Dungeon Only I Can Enter (Anime) - 87% complete
- Midnight Protocol (Sci-Fi) - 92% complete
- Frieren: Beyond Journey's End (Fantasy) - 75% complete
- Project Mary (Adventure) - 100% complete
- The Shawshank Redemption (Drama) - 100% complete

### `openHistoryModal(e)`
**Location:** app.js (standalone function)

**Triggered by:**
- History navbar link click
- Can be called programmatically with `{preventDefault: () => {}}`

**Does:**
1. Validates user is logged in
2. Retrieves watchHistory from authSystem
3. Populates metrics cards at top
4. Renders activity list:
   - If empty: Shows "No watch history yet" + "Load Test Data" button
   - If has data: Lists all entries reversed (newest first)
5. Shows History modal

## ML Integration (Current + Future)

### Current ML Data Points
- **Loyalty Ratio**: Random 90-99% (placeholder)
- **Completion %**: Per-entry metric showing watch completion
- **Binge Off Count**: Estimated drop-off risk

### Future ML Enhancements
Integrate with `window.mlRecommendations` and `window.watchTracker`:
- Predict churn risk based on completion patterns
- Recommend similar shows based on watch history
- Optimize notification timing
- Retention score modeling

## Data Persistence

**Storage:** `localStorage['currentUser']`

**What's Saved:**
```javascript
localStorage.currentUser = JSON.stringify({
  email: "user@example.com",
  watchHistory: [...],
  myList: [...],
  preferences: {...}
})
```

**Retrieval:**
```javascript
const user = JSON.parse(localStorage.getItem('currentUser'));
console.log(user.watchHistory); // Array of watch entries
```

## Usage Flow

### First Time User
1. Navigate to History → See empty state with "Load Test Data"
2. Click "Load Test Data" → 5 sample movies populate
3. See metrics calculated and activity list rendered

### After Watching Movies
1. Click "Watch Now" on any movie modal
2. Movie automatically added to watchHistory
3. Navigate to History → See your watched movie in the list
4. Metrics update automatically

### Checking Real Data
```javascript
// In browser console:
console.log(window.app.authSystem.currentUser.watchHistory);
// Check local storage:
console.log(JSON.parse(localStorage.getItem('currentUser')).watchHistory);
```

## Debugging Checklist

- [ ] User is logged in (checked in `openHistoryModal`)
- [ ] `authSystem.currentUser` exists
- [ ] `watchHistory` array initialized
- [ ] Data saves to localStorage
- [ ] Modal opens without errors
- [ ] Activity items render correctly

## Future Enhancements

1. **Video Tracking** - Actual video playback duration
2. **ML Scoring** - Real retention predictions
3. **Recommendations** - Suggest shows based on watch patterns
4. **Analytics Dashboard** - Detailed viewing statistics
5. **Export History** - Download watch history as CSV
6. **Sharing** - Share watch badges with friends
