CREATE TABLE IF NOT EXISTS scans (
  id VARCHAR(36) PRIMARY KEY,
  plugin VARCHAR(100) NOT NULL,
  connector VARCHAR(100) NOT NULL,
  status VARCHAR(30) DEFAULT 'queued',
  started_at TIMESTAMP NULL,
  finished_at TIMESTAMP NULL,
  findings_count INTEGER DEFAULT 0,
  error_message VARCHAR(1000) NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS findings (
  id VARCHAR(36) PRIMARY KEY,
  scan_id VARCHAR(36) NULL,
  tool VARCHAR(50) NOT NULL,
  source VARCHAR(30) NOT NULL,
  domain VARCHAR(30) NOT NULL,
  severity VARCHAR(10) NOT NULL,
  cvss_score FLOAT NULL,
  cve_id VARCHAR(30) NULL,
  cloud_provider VARCHAR(20) NULL,
  account_id VARCHAR(200) NULL,
  region VARCHAR(100) NULL,
  resource_type VARCHAR(200) NULL,
  resource_id TEXT NULL,
  resource_name VARCHAR(500) NULL,
  namespace VARCHAR(200) NULL,
  check_id VARCHAR(200) NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  remediation TEXT NULL,
  compliance JSONB DEFAULT '[]'::jsonb,
  raw JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(30) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plugins (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  domain VARCHAR(50),
  run_mode VARCHAR(50),
  normalizer VARCHAR(255),
  image VARCHAR(255),
  schedule VARCHAR(100),
  enabled BOOLEAN DEFAULT TRUE,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connectors (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  connector_type VARCHAR(50),
  encrypted_credentials TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
