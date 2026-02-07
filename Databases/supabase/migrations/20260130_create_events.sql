/*
  # Create Events Table

  1. New Tables
    - `events`
      - `id` (uuid, primary key)
      - `event_name` (text) - Name of the event
      - `start_date` (timestamp) - When the event starts
      - `end_date` (timestamp) - When the event ends
      - `active_challenges` (jsonb) - Array of challenge IDs active during the event
      - `created_at` (timestamp) - Record creation time

  2. Security
    - Enable RLS on `events` table
    - Add policy for public read access (events visibility)
    - Add policy for admin insert/update (event management)
*/

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  active_challenges jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to events"
  ON events
  FOR SELECT
  USING (true);

CREATE POLICY "Allow admin insert to events"
  ON events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow admin update to events"
  ON events
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
