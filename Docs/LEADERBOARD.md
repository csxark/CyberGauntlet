# Live Leaderboard Feature

## Overview
The Live Leaderboard provides real-time rankings and statistics for all teams competing in CyberGauntlet challenges.

## Features

### ✨ Real-Time Updates
- Automatic updates using Supabase real-time subscriptions
- No page refresh needed - see changes as they happen
- Live notification when other teams complete challenges

### 📊 Multiple Views
- **Overall Rankings**: Aggregate scores across all challenges
- **Per-Challenge Rankings**: Filter by specific question (q1, q2, etc.)
- **Sort Options**:
  - By Progress: Teams sorted by challenges completed, then by time
  - By Speed: Teams sorted by total completion time

### 🏆 Ranking System
- 🥇 Gold badge for 1st place
- 🥈 Silver badge for 2nd place
- 🥉 Bronze badge for 3rd place
- Numbered badges for remaining positions

### 📈 Team Statistics
For each team, the leaderboard displays:
- **Challenges Completed**: Number of challenges solved
- **Total Time**: Cumulative time across all challenges
- **Total Attempts**: Sum of flag submission attempts
- **Best Time**: Fastest single challenge completion

### 🎯 Current Team Highlight
- Your team is highlighted with a green border and badge
- Easy to spot your position among competitors

## Usage

### In Challenge Page
1. Click the **SHOW LEADERBOARD** button in the header
2. Toggle to hide/show without losing progress
3. Leaderboard updates automatically as you and others complete challenges

### Standalone Page
Access the dedicated leaderboard page at `/leaderboard` (when routing is configured).

## Configuration

### Supabase Required
The leaderboard requires a configured Supabase project:

1. Set environment variables in `.env`:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   ```

2. Run migrations to create the `leaderboard` table:
   ```bash
   # Apply the migration from Databases/supabase/migrations/
   ```

### Without Supabase
If Supabase is not configured, the leaderboard shows a friendly message explaining it's unavailable.

## Technical Details

### Component: `Leaderboard.tsx`
Located at: `src/components/Leaderboard.tsx`

**Props:**
- `currentTeamName` (optional): Highlights this team in the list
- `questionFilter` (optional): Show only scores for a specific challenge

**Real-time Subscription:**
```typescript
const channel = supabase
  .channel('leaderboard-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, 
    () => loadLeaderboard()
  )
  .subscribe();
```

### Data Schema
The leaderboard reads from the `leaderboard` table:
```sql
CREATE TABLE leaderboard (
  id uuid PRIMARY KEY,
  team_name text NOT NULL,
  question_id text NOT NULL,
  time_spent integer NOT NULL,
  attempts integer NOT NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

### Performance
- Efficiently aggregates team scores client-side
- Real-time updates use minimal bandwidth (only changed rows)
- Scrollable container for many teams (max-height with overflow)

## Styling
- Cyberpunk-themed with terminal aesthetics
- Green color scheme matching the app
- Responsive design (works on mobile)
- Smooth animations on hover and updates

## Future Enhancements
- [ ] Filter by date range
- [ ] Export leaderboard as CSV/JSON
- [ ] Team profile pages with detailed stats
- [ ] Challenge difficulty ratings
- [ ] Achievement badges
- [ ] Historical data graphs

## Testing
To test with demo data, complete a few challenges and watch the leaderboard update automatically!
