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
  fingerprint VARCHAR(64) NULL,
  assigned_to VARCHAR(200) NULL,
  ticket_ref VARCHAR(500) NULL,
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

-- Optional materialized K8s inventory (POST /inventory/sync-k8s-tables aggregates from findings)
CREATE TABLE IF NOT EXISTS k8s_clusters (
  connector_id VARCHAR(36) PRIMARY KEY REFERENCES connectors(id) ON DELETE CASCADE,
  nodes_count INTEGER DEFAULT 0,
  workloads_count INTEGER DEFAULT 0,
  namespaces_count INTEGER DEFAULT 0,
  synced_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS k8s_nodes (
  id VARCHAR(36) PRIMARY KEY,
  connector_id VARCHAR(36) NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  name VARCHAR(500) NOT NULL,
  last_seen TIMESTAMP NULL,
  UNIQUE(connector_id, name)
);
CREATE INDEX IF NOT EXISTS ix_k8s_nodes_connector_id ON k8s_nodes(connector_id);

-- Attack paths (also created by SQLAlchemy metadata; keep in sync with api/models/attack_path.py)
CREATE TABLE IF NOT EXISTS attack_paths (
  id VARCHAR(36) PRIMARY KEY,
  title TEXT NOT NULL,
  impact_score FLOAT NOT NULL DEFAULT 0,
  probability_score FLOAT NOT NULL DEFAULT 0,
  risk_score FLOAT NOT NULL DEFAULT 0,
  is_exposed_internet BOOLEAN NOT NULL DEFAULT 0,
  exposure_type VARCHAR(50) NULL,
  path_length INTEGER NOT NULL DEFAULT 0,
  source_resource_id TEXT NULL,
  source_resource_type VARCHAR(200) NULL,
  target_resource_id TEXT NULL,
  target_resource_type VARCHAR(200) NULL,
  is_crown_jewel BOOLEAN NOT NULL DEFAULT 0,
  cloud_provider VARCHAR(20) NULL,
  connector_id VARCHAR(36) NULL REFERENCES connectors(id) ON DELETE SET NULL,
  account_id VARCHAR(200) NULL,
  finding_ids JSONB DEFAULT '[]'::jsonb,
  edge_ids JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_attack_paths_impact ON attack_paths(impact_score DESC);
CREATE INDEX IF NOT EXISTS ix_attack_paths_connector ON attack_paths(connector_id);

CREATE TABLE IF NOT EXISTS attack_path_edges (
  id VARCHAR(36) PRIMARY KEY,
  attack_path_id VARCHAR(36) NOT NULL REFERENCES attack_paths(id) ON DELETE CASCADE,
  source_key VARCHAR(512) NOT NULL,
  target_key VARCHAR(512) NOT NULL,
  source_finding_id VARCHAR(36) NULL,
  target_finding_id VARCHAR(36) NULL,
  source_resource_id TEXT NULL,
  target_resource_id TEXT NULL,
  source_resource_type VARCHAR(200) NULL,
  target_resource_type VARCHAR(200) NULL,
  edge_type VARCHAR(50) NOT NULL DEFAULT 'aggregated',
  risk_weight FLOAT NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_attack_path_edges_path ON attack_path_edges(attack_path_id);
