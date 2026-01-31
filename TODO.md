# TODO: Enhance Hint System with Progressive Disclosure

## Database Migrations
- [x] Create migration to add 'points' field to profiles table (default 100)
- [x] Create migration to add 'hints_used' field to leaderboard table

## Frontend Updates
- [x] Update ChallengePage.tsx to fetch team points
- [x] Add state for revealed hints and points
- [x] Modify hints UI to show progressively (first free, others cost points)
- [x] Implement point deduction on hint reveal
- [x] Track hints used and update leaderboard submission

## Testing
- [ ] Test hint system functionality
- [ ] Verify point deduction and leaderboard updates
- [ ] Ensure progressive disclosure works as expected
