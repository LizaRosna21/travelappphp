-- Create B2B Pricing Tables

-- Pricing Tiers
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value TEXT NOT NULL DEFAULT '0',
  min_booking_count INTEGER NOT NULL DEFAULT 0,
  min_total_amount TEXT NOT NULL DEFAULT '0',
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  agency_category TEXT NOT NULL DEFAULT 'regular',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Agency Pricing
CREATE TABLE IF NOT EXISTS agency_pricing (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  pricing_tier_id INTEGER REFERENCES pricing_tiers(id),
  custom_discount_type TEXT,
  custom_discount_value TEXT,
  route_specific_pricing BOOLEAN NOT NULL DEFAULT FALSE,
  start_date TEXT,
  end_date TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Route Pricing
CREATE TABLE IF NOT EXISTS route_pricing (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  route_id INTEGER NOT NULL REFERENCES routes(id),
  discount_type TEXT NOT NULL,
  discount_value TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Sample Data: Pricing Tiers
INSERT INTO pricing_tiers (name, description, discount_type, discount_value, min_booking_count, min_total_amount, requires_approval, agency_category) 
VALUES
  ('Bronze', 'Standard agency partner with basic benefits', 'percentage', '5', 10, '10000', FALSE, 'regular'),
  ('Silver', 'Mid-tier agency partner with improved benefits', 'percentage', '10', 25, '25000', FALSE, 'preferred'),
  ('Gold', 'Premium agency partner with substantial benefits', 'percentage', '15', 50, '50000', TRUE, 'premium'),
  ('Platinum', 'Elite agency partner with maximum benefits', 'percentage', '20', 100, '100000', TRUE, 'elite');

-- Get Agency IDs (for sample data)
-- We'll assume agencies exist in the database already