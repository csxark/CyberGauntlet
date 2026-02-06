/*
  # Add Category and Difficulty to Leaderboard Table

  1. New Columns
    - `category` (text) - Category of the challenge (e.g., Cryptography, Programming)
    - `difficulty` (text) - Difficulty level of the challenge (e.g., Beginner, Intermediate, Advanced)

  2. Security
    - No changes to RLS policies
*/

ALTER TABLE leaderboard ADD COLUMN category text;
ALTER TABLE leaderboard ADD COLUMN difficulty text;
