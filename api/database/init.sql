CREATE TABLE IF NOT EXISTS findings (
  id SERIAL PRIMARY KEY,
  source VARCHAR(100),
  tool VARCHAR(100),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  severity VARCHAR(20),
  domain VARCHAR(50),
  cloud VARCHAR(50),
  resource_id VARCHAR(300),
  compliance JSONB DEFAULT '[]'::jsonb,
  remediation TEXT,
  raw JSONB DEFAULT '{}'::jsonb,
  risk_score FLOAT DEFAULT 0,
  status VARCHAR(30) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW()
);
