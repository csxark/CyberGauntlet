/*
  # Create Challenges Table

  1. New Tables
    - `challenges`
      - `id` (text, primary key - e.g., "q1", "q2", "q6", etc.)
      - `title` (text)
      - `description` (text)
      - `file_name` (text)
      - `file_path` (text) - path in Supabase Storage
      - `correct_flag` (text)
      - `hints` (text array)
      - `category` (text)
      - `difficulty` (text)
      - `submission_id` (uuid, foreign key to challenge_submissions.id)
      - `created_at` (timestamp)
      - `is_active` (boolean) - allows admins to enable/disable challenges

  2. Security
    - Enable RLS on `challenges` table
    - Add policy for public read access (all users can view active challenges)
    - Add policy for admins to insert/update/delete challenges

  3. Indexes
    - Index on category for filtering
    - Index on difficulty for filtering
    - Index on is_active for active challenge queries
*/

CREATE TABLE IF NOT EXISTS challenges (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  file_name text DEFAULT '',
  file_path text DEFAULT '',
  correct_flag text NOT NULL,
  hints text[] DEFAULT '{}',
  category text NOT NULL,
  difficulty text NOT NULL,
  submission_id uuid REFERENCES challenge_submissions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Public read access for active challenges
CREATE POLICY "Anyone can view active challenges"
  ON challenges
  FOR SELECT
  USING (is_active = true);

-- Admins can insert challenges
CREATE POLICY "Admins can insert challenges"
  ON challenges
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Admins can update challenges
CREATE POLICY "Admins can update challenges"
  ON challenges
  FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Admins can delete challenges
CREATE POLICY "Admins can delete challenges"
  ON challenges
  FOR DELETE
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_challenges_category ON challenges(category);
CREATE INDEX IF NOT EXISTS idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX IF NOT EXISTS idx_challenges_is_active ON challenges(is_active);
CREATE INDEX IF NOT EXISTS idx_challenges_submission_id ON challenges(submission_id);

-- Insert existing hardcoded challenges into the table
INSERT INTO challenges (id, title, description, file_name, file_path, correct_flag, hints, category, difficulty, is_active)
VALUES 
  (
    'q1',
    'The Cryptographer''s Dilemma',
    'You are a cybersecurity consultant investigating a breach at the Ministry of Digital Secrets. The lead cryptographer, Dr. Eliza Vance, disappeared just hours before the attack. The only thing she left behind was a strange, encrypted diary entry and a file on her desktop labeled cipher_collection.txt. Your team believes Dr. Vance was trying to leave a final, complex message before being abducted—a message hidden among decoys. The diary entry gives you a vital clue, but you must still figure out which cipher in the file holds the true flag and which ones are red herrings.',
    'cipher_collection.txt',
    '/challenges/q1/cipher_collection.txt',
    'CG{Guvf vf gur Synt!}',
    ARRAY[
      'This code is based on a simple rotational shift of 3 for every letter in the alphabet',
      'This message is encoded using Polybius square coordinates; you must first group the ciphertext by fives, then use a keyword to untangle the column order.',
      'The decryption key for this substitution is half the alphabet, meaning the shift applied to the ciphertext is equal to the length of the shift itself.'
    ],
    'Cryptography',
    'Intermediate',
    true
  ),
  (
    'q2',
    'Pair Sum Optimization',
    'You are auditing a data processing script for a university that needs to quickly count successful pairings of student IDs. You are given a large array of unique, positive, and sorted integer IDs. The university defines a successful pair as any two distinct IDs a, b in the array whose sum equals a specific target number, T. Your primary constraint is efficiency. Since the list is already sorted, you must devise an algorithm that counts all unique pairs in a single, highly optimized pass that avoids nested loops—a technique typically required for speed in large datasets.',
    '',
    '',
    'CG{TWO_POINTERS_ALGORITHM}',
    ARRAY[
      'Since the array is sorted, set one marker (a pointer) at the first element (index 0) and the second marker at the last element (index length - 1).',
      'At each step, you only need to calculate the sum of the elements at your two markers and compare it to T. If the sum is less than T, you must increase the sum, so move the low pointer one step inward. If the sum is greater than T, you must decrease the sum, so move the high pointer one step inward.',
      'Your entire solution can be contained within a simple while loop that continues as long as your low pointer is less than your high pointer.'
    ],
    'Programming',
    'Beginner',
    true
  ),
  (
    'q3',
    'The Security Key Reverser',
    'You have recovered a C program designed to validate a 10-character security key. Due to poor programming practices, the key must pass through a two-step obfuscation process before it is checked against a hardcoded secret. To find the correct final flag, you must meticulously trace the logic of the processkey function.',
    'security.c',
    '/challenges/q3/security.c',
    'CG{5E4D3A1B2C}',
    ARRAY[
      'Swap the two halves — The key is split (A1B2C and 3D4E5) and exchanged.',
      'Reverse the new first half in place — after swapping, reverse indices 0 through 4.',
      'The flag is the final state of the key array after processing.'
    ],
    'Programming',
    'Intermediate',
    true
  ),
  (
    'q4',
    'Invisible Ink Scenario',
    'You have recovered a text file, secretnote.txt, which appears to contain nothing more than a simple, innocuous sentence. When you copy and paste the text, it seems normal, but a forensic tool confirms the file size is slightly larger than expected for the visible characters. Hidden zero-width Unicode characters encode the flag.',
    'secretnote.txt',
    '/challenges/q4/secretnote.txt',
    'CG{THIS_YOUR_FLAG}',
    ARRAY[
      'Zero-width characters (U200B, U200D) represent binary digits and encode ASCII via invisible text.',
      'Use a specialized tool to extract and translate the invisible Unicode sequence.',
      'Correct mapping from invisible characters to binary unlocks the true ASCII flag.'
    ],
    'Steganography',
    'Advanced',
    true
  ),
  (
    'q5',
    'The Final Register Readout',
    'You are a penetration tester attempting to recover a sensitive 6-character access key stored in a proprietary system. You have managed to dump the raw memory register, but the developer didn''t use standard decimal numbers. Instead, they used a custom ''Quinary System'' encoding where all values are calculated using powers of five before being stored. The captured, encoded register value (in the Quinary System) is the following sequence of three-digit numbers separated by colons: (313 : 310 : 314 : 421 : 322 : 310)',
    '',
    '',
    'CG{SPToWP}',
    ARRAY[
      'Each three-digit number represents a character in the ASCII range',
      'Convert each quinary number to decimal using powers of 5',
      'Map the resulting decimal values to ASCII characters'
    ],
    'Cryptography',
    'Advanced',
    true
  )
ON CONFLICT (id) DO NOTHING;
