/*
  # MEXC Mini Trading App Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `mexc_connections`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `api_key_encrypted` (text) - Encrypted MEXC API key
      - `api_secret_encrypted` (text) - Encrypted MEXC API secret
      - `is_active` (boolean)
      - `last_sync` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `trades`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `symbol` (text) - Trading pair (e.g., BTCUSDT)
      - `side` (text) - BUY or SELL
      - `order_type` (text) - MARKET, LIMIT, etc.
      - `quantity` (decimal)
      - `price` (decimal)
      - `status` (text) - PENDING, FILLED, CANCELLED, etc.
      - `mexc_order_id` (text)
      - `executed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Profiles are created automatically via trigger when user signs up
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create mexc_connections table
CREATE TABLE IF NOT EXISTS mexc_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  api_key_encrypted text NOT NULL,
  api_secret_encrypted text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  last_sync timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

ALTER TABLE mexc_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own MEXC connections"
  ON mexc_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own MEXC connections"
  ON mexc_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own MEXC connections"
  ON mexc_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own MEXC connections"
  ON mexc_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  side text NOT NULL,
  order_type text NOT NULL,
  quantity decimal NOT NULL,
  price decimal,
  status text DEFAULT 'PENDING' NOT NULL,
  mexc_order_id text,
  executed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades"
  ON trades FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades"
  ON trades FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mexc_connections_user_id ON mexc_connections(user_id);