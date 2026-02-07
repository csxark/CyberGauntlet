/*
  # Add Event ID to Leaderboard Table

  1. Alter Tables
    - Add `event_id` (uuid, nullable) to `leaderboard` table
      - References events.id
      - Allows filtering submissions by event period

  2. Security
    - Update existing policies if needed
*/

ALTER TABLE leaderboard ADD COLUMN event_id uuid REFERENCES events(id);
