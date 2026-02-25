-- LHB Finance Dashboard - D1 Schema
-- =======================================

DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS school_settings;
DROP TABLE IF EXISTS audit_logs;

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  doc_no TEXT,
  description TEXT,
  fund_type TEXT NOT NULL,
  income REAL DEFAULT 0,
  expense REAL DEFAULT 0,
  payer TEXT,
  payee TEXT,
  payee_type TEXT,
  bank_id TEXT,
  income_ref_id INTEGER,
  extra_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE school_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  school_name_th TEXT DEFAULT 'โรงเรียนบ้านละหอกตะแบง',
  school_name_en TEXT DEFAULT 'LahoktabangSchool',
  address TEXT,
  director_name TEXT,
  finance_officer_name TEXT,
  auditor_name TEXT,
  affiliation TEXT,
  bank_accounts_json TEXT DEFAULT '[]',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT DEFAULT (datetime('now')),
  user_name TEXT DEFAULT 'เจ้าหน้าที่การเงิน',
  action TEXT,
  details TEXT,
  module TEXT
);

-- Insert default school settings
INSERT INTO school_settings (id, school_name_th, school_name_en, address, director_name, finance_officer_name, auditor_name, affiliation, bank_accounts_json)
VALUES (1,
  'โรงเรียนบ้านละหอกตะแบง',
  'LahoktabangSchool',
  '185 หมู่ 5 ตำบลปราสาท อำเภอบ้านกรวด จังหวัดบุรีรัมย์ 31180',
  'นายจีราพัชร์  สารคร',
  'นางสาวหนิง',
  'นางสาวบัว',
  'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาบุรีรัมย์ เขต 2',
  '[{"id":"ba-1","name":"บช.เงินอุดหนุนอื่น (ธกส.)","bankName":"ธนาคารเพื่อการเกษตรและสหกรณ์","accountNo":"020-2-XXXXX-X","fundTypes":["fund-subsidy","fund-15y-book","fund-15y-supply","fund-15y-uniform","fund-15y-activity","fund-poor"],"color":"green"},{"id":"ba-2","name":"บช.เงิน กสศ. (ธกส.)","bankName":"ธนาคารเพื่อการเกษตรและสหกรณ์","accountNo":"020-2-XXXXX-X","fundTypes":["fund-eef"],"color":"purple"},{"id":"ba-3","name":"บช.เงินอาหารกลางวัน (ธกส.)","bankName":"ธนาคารเพื่อการเกษตรและสหกรณ์","accountNo":"020-2-XXXXX-X","fundTypes":["fund-lunch"],"color":"orange"},{"id":"ba-4","name":"บช.เงินรายได้สถานศึกษา","bankName":"ธนาคารออมสิน","accountNo":"000-0-XXXXX-X","fundTypes":["fund-school-income"],"color":"blue"}]'
);
