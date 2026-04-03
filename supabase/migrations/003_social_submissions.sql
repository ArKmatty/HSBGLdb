-- Social submissions table for user-submitted social links
CREATE TABLE IF NOT EXISTS social_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL,
  platform text NOT NULL,
  username text NOT NULL,
  url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE social_submissions ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (public form submission)
CREATE POLICY "Allow public inserts" ON social_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow selects for service role only (admin reads)
CREATE POLICY "Allow service role selects" ON social_submissions
  FOR SELECT
  TO service_role
  USING (true);

-- Indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_social_submissions_status ON social_submissions(status);
CREATE INDEX IF NOT EXISTS idx_social_submissions_created_at ON social_submissions(created_at DESC);
