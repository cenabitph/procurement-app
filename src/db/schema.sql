-- ============================================================
-- Philippine Government Procurement System — RA 9184
-- MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS procurements CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE procurements;

-- ─── Users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','officer','viewer') NOT NULL DEFAULT 'officer',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_username (username)
) ENGINE=InnoDB;

-- ─── Procuring Entities ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS procuring_entities (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  uacs_code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(80) NOT NULL,
  region VARCHAR(100) NOT NULL,
  head_name VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─── PPMP ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ppmp (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  procuring_entity_code VARCHAR(20) NOT NULL,
  fiscal_year SMALLINT NOT NULL,
  total_abc DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  prepared_by VARCHAR(255) NOT NULL,
  certified_by VARCHAR(255) NOT NULL,
  approved_by VARCHAR(255) NOT NULL,
  status ENUM('DRAFT','SUBMITTED','APPROVED','REVISED') NOT NULL DEFAULT 'DRAFT',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ppmp_entity (procuring_entity_code),
  INDEX idx_ppmp_year (fiscal_year)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ppmp_items (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  ppmp_id VARCHAR(36) NOT NULL,
  general_description TEXT NOT NULL,
  unit_of_measure VARCHAR(50) NOT NULL,
  quantity DECIMAL(12,4) NOT NULL,
  estimated_unit_cost DECIMAL(18,2) NOT NULL,
  total_abc DECIMAL(18,2) NOT NULL,
  scheduled_quarter TINYINT NOT NULL CHECK (scheduled_quarter BETWEEN 1 AND 4),
  procurement_mode VARCHAR(60) NOT NULL,
  category VARCHAR(40) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ppmp_items_ppmp (ppmp_id),
  CONSTRAINT fk_ppmp_items_ppmp FOREIGN KEY (ppmp_id) REFERENCES ppmp(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── APP ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_plans (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  procuring_entity_code VARCHAR(20) NOT NULL,
  fiscal_year SMALLINT NOT NULL,
  total_abc DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  revision TINYINT NOT NULL DEFAULT 0,
  approved_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_app_entity (procuring_entity_code),
  INDEX idx_app_year (fiscal_year)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS app_entries (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  app_plan_id VARCHAR(36) NOT NULL,
  ppmp_item_id VARCHAR(36) NOT NULL,
  project_title VARCHAR(255) NOT NULL,
  procurement_mode VARCHAR(60) NOT NULL,
  category VARCHAR(40) NOT NULL,
  abc DECIMAL(18,2) NOT NULL,
  INDEX idx_app_entries_plan (app_plan_id),
  CONSTRAINT fk_app_entries_plan FOREIGN KEY (app_plan_id) REFERENCES app_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS procurement_milestones (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  project_id VARCHAR(36) NULL,
  app_entry_id VARCHAR(36) NULL,
  activity VARCHAR(255) NOT NULL,
  planned_date DATE NOT NULL,
  actual_date DATE NULL,
  INDEX idx_milestones_project (project_id),
  INDEX idx_milestones_entry (app_entry_id)
) ENGINE=InnoDB;

-- ─── Procurement Projects ────────────────────────────────────
CREATE TABLE IF NOT EXISTS procurement_projects (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  pr_ref VARCHAR(60) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(40) NOT NULL,
  procurement_mode VARCHAR(60) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  abc DECIMAL(18,2) NOT NULL,
  fund_appropriations_act VARCHAR(100) NOT NULL,
  fund_allotment_class ENUM('PS','MOOE','CO','FinEx') NOT NULL,
  fund_uacs VARCHAR(30) NOT NULL,
  fund_obligation_request_no VARCHAR(60) NULL,
  ppmp_ref VARCHAR(36) NOT NULL,
  app_ref VARCHAR(36) NOT NULL,
  procuring_entity_code VARCHAR(20) NOT NULL,
  bac_id VARCHAR(36) NULL,
  philgeps_ref VARCHAR(100) NULL,
  is_foreign TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_projects_entity (procuring_entity_code),
  INDEX idx_projects_status (status),
  INDEX idx_projects_category (category)
) ENGINE=InnoDB;

-- ─── BAC ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bac_committees (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  office_unit VARCHAR(255) NOT NULL,
  secretariat_head VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bac_project (project_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bac_members (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  bac_id VARCHAR(36) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  designation VARCHAR(255) NOT NULL,
  role ENUM('CHAIRPERSON','VICE_CHAIRPERSON','MEMBER','OBSERVER_COA','OBSERVER_CIVIL_SOCIETY','OBSERVER_PROFESSIONAL_ORG') NOT NULL,
  appointed_at DATE NOT NULL,
  expires_at DATE NULL,
  INDEX idx_bac_members_bac (bac_id),
  CONSTRAINT fk_bac_members_bac FOREIGN KEY (bac_id) REFERENCES bac_committees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bac_secretariat_members (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  bac_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  INDEX idx_bac_secretariat_bac (bac_id),
  CONSTRAINT fk_bac_secretariat_bac FOREIGN KEY (bac_id) REFERENCES bac_committees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS technical_working_groups (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  bac_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  formed_at DATE NOT NULL,
  INDEX idx_twg_bac (bac_id),
  CONSTRAINT fk_twg_bac FOREIGN KEY (bac_id) REFERENCES bac_committees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS twg_members (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  twg_id VARCHAR(36) NOT NULL,
  member_name VARCHAR(255) NOT NULL,
  INDEX idx_twg_members_twg (twg_id),
  CONSTRAINT fk_twg_members_twg FOREIGN KEY (twg_id) REFERENCES technical_working_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bac_resolutions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  bac_id VARCHAR(36) NOT NULL,
  resolution_no VARCHAR(60) NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  recommendation ENUM('AWARD','FAILURE_OF_BIDDING','POST_DISQUALIFICATION','ALTERNATIVE_METHOD') NOT NULL,
  resolved_at DATETIME NOT NULL,
  approved_by_hope TINYINT(1) NOT NULL DEFAULT 0,
  approved_at DATETIME NULL,
  INDEX idx_resolutions_bac (bac_id),
  CONSTRAINT fk_resolutions_bac FOREIGN KEY (bac_id) REFERENCES bac_committees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resolution_votes (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  resolution_id VARCHAR(36) NOT NULL,
  member_id VARCHAR(36) NOT NULL,
  vote ENUM('YES','NO','ABSTAIN') NOT NULL,
  INDEX idx_votes_resolution (resolution_id),
  CONSTRAINT fk_votes_resolution FOREIGN KEY (resolution_id) REFERENCES bac_resolutions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Suppliers ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  philgeps_no VARCHAR(30) NOT NULL UNIQUE,
  business_name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255) NULL,
  type ENUM('SOLE_PROPRIETORSHIP','PARTNERSHIP','CORPORATION','JOINT_VENTURE','COOPERATIVE') NOT NULL,
  street VARCHAR(255) NOT NULL,
  barangay VARCHAR(100) NOT NULL,
  city_municipality VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  region VARCHAR(100) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  tin VARCHAR(20) NOT NULL,
  philgeps_reg_no VARCHAR(50) NOT NULL,
  philgeps_cert_no VARCHAR(50) NOT NULL,
  philgeps_validity DATE NOT NULL,
  philgeps_platinum TINYINT(1) NOT NULL DEFAULT 0,
  vat_registered TINYINT(1) NOT NULL DEFAULT 0,
  blacklisted TINYINT(1) NOT NULL DEFAULT 0,
  blacklist_ref VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_suppliers_name (business_name),
  INDEX idx_suppliers_blacklisted (blacklisted)
) ENGINE=InnoDB;

-- ─── Bids ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bid_documents (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  supplier_id VARCHAR(36) NOT NULL,
  bid_price DECIMAL(18,2) NOT NULL,
  grand_total DECIMAL(18,2) NOT NULL,
  bid_security_type ENUM('CASH_MONEY_ORDER','MANAGERS_CHECK','BANK_DRAFT','GUARANTEE','SURETY_BOND','IRREVOCABLE_LETTER_OF_CREDIT') NOT NULL,
  bid_security_amount DECIMAL(18,2) NOT NULL,
  bid_security_expiry DATE NOT NULL,
  submitted_at DATETIME NOT NULL,
  is_late_filing TINYINT(1) NOT NULL DEFAULT 0,
  is_disqualified TINYINT(1) NOT NULL DEFAULT 0,
  disqualification_reason TEXT NULL,
  INDEX idx_bids_project (project_id),
  INDEX idx_bids_supplier (supplier_id),
  CONSTRAINT fk_bids_project FOREIGN KEY (project_id) REFERENCES procurement_projects(id),
  CONSTRAINT fk_bids_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bid_line_items (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  bid_document_id VARCHAR(36) NOT NULL,
  item_no INT NOT NULL,
  description TEXT NOT NULL,
  unit VARCHAR(50) NOT NULL,
  quantity DECIMAL(12,4) NOT NULL,
  unit_price DECIMAL(18,2) NOT NULL,
  total_price DECIMAL(18,2) NOT NULL,
  INDEX idx_bid_items_doc (bid_document_id),
  CONSTRAINT fk_bid_items_doc FOREIGN KEY (bid_document_id) REFERENCES bid_documents(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Bid Evaluation ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bid_evaluations (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  method ENUM('LOWEST_CALCULATED_RESPONSIVE_BID','HIGHEST_RATED_RESPONSIVE_BID','FIXED_BUDGET_SELECTION','LEAST_COST_SELECTION','CONSULTANT_QUALIFICATION_SELECTION','SINGLE_SOURCE_SELECTION') NOT NULL,
  lcrb_supplier_id VARCHAR(36) NULL,
  post_qual_passed TINYINT(1) NOT NULL DEFAULT 0,
  bac_resolution_id VARCHAR(36) NULL,
  evaluated_at DATETIME NOT NULL,
  remarks TEXT NULL,
  INDEX idx_eval_project (project_id),
  CONSTRAINT fk_eval_project FOREIGN KEY (project_id) REFERENCES procurement_projects(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS evaluated_bids (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  evaluation_id VARCHAR(36) NOT NULL,
  supplier_id VARCHAR(36) NOT NULL,
  technical_score DECIMAL(5,2) NULL,
  financial_bid DECIMAL(18,2) NOT NULL,
  corrected_bid DECIMAL(18,2) NULL,
  is_responsive TINYINT(1) NOT NULL DEFAULT 0,
  post_qual_passed TINYINT(1) NULL,
  post_qual_remarks TEXT NULL,
  eval_rank TINYINT NOT NULL DEFAULT 0,
  INDEX idx_eval_bids_eval (evaluation_id),
  CONSTRAINT fk_eval_bids_eval FOREIGN KEY (evaluation_id) REFERENCES bid_evaluations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Notices ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notices_of_award (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  supplier_id VARCHAR(36) NOT NULL,
  awarded_amount DECIMAL(18,2) NOT NULL,
  posting_date DATE NOT NULL,
  acceptance_deadline DATE NOT NULL,
  accepted_at DATETIME NULL,
  philgeps_posted TINYINT(1) NOT NULL DEFAULT 0,
  philgeps_posting_ref VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_noa_project (project_id),
  CONSTRAINT fk_noa_project FOREIGN KEY (project_id) REFERENCES procurement_projects(id),
  CONSTRAINT fk_noa_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notices_to_proceed (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  supplier_id VARCHAR(36) NOT NULL,
  contract_amount DECIMAL(18,2) NOT NULL,
  contract_ref VARCHAR(100) NOT NULL,
  contract_signing_date DATE NOT NULL,
  ntp_date DATE NOT NULL,
  posting_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ntp_project (project_id),
  CONSTRAINT fk_ntp_project FOREIGN KEY (project_id) REFERENCES procurement_projects(id)
) ENGINE=InnoDB;

-- ─── Sample Seed Data ─────────────────────────────────────────
-- Users: Run 'bun src/db/seed-users.ts' to insert default users
-- Default credentials: admin / admin
INSERT IGNORE INTO procuring_entities (id, uacs_code, name, short_name, region, head_name) VALUES
  ('pe-001', '0501001000', 'Department of Public Works and Highways — NCR', 'DPWH-NCR', 'National Capital Region', 'Sec. Manuel Bonoan'),
  ('pe-002', '0901001000', 'Department of Health — NCR', 'DOH-NCR', 'National Capital Region', 'Sec. Ted Herbosa'),
  ('pe-003', '0701001000', 'Department of Education — NCR', 'DepEd-NCR', 'National Capital Region', 'Sec. Sara Duterte');
