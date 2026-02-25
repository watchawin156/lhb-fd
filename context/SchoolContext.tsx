
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  MOCK_RECEIPTS,
  MOCK_LOANS,
  INITIAL_APPROVALS,
  FINANCIAL_RECORDS,
  BUDGET_ITEMS
} from '../constants';
import {
  Receipt,
  LoanContract,
  ApprovalRequest,
  FinancialRecord,
  BudgetItem,
  Transaction,
  SchoolSettingsData,
  BankAccount,
  AuditLogEntry
} from '../types';

interface SchoolContextType {
  receipts: Receipt[];
  loans: LoanContract[];
  approvals: ApprovalRequest[];
  financialRecords: FinancialRecord[];
  budgetItems: BudgetItem[];
  transactions: Transaction[]; // Global transactions
  schoolSettings: SchoolSettingsData;
  auditLogs: AuditLogEntry[];

  // Actions
  addReceipt: (receipt: Receipt) => void;
  addLoan: (loan: LoanContract) => void;
  createPR: (pr: ApprovalRequest) => void;
  processApproval: (id: string, action: 'approved' | 'rejected') => void;
  addTransaction: (tx: Transaction) => void;
  editTransaction: (id: number, updatedTx: Partial<Transaction>) => void;
  deleteTransaction: (id: number, reason: string) => void;
  updateSchoolSettings: (settings: Partial<SchoolSettingsData>) => void;
  resetData: () => void; // New action
  logAction: (action: string, details: string, module: string) => void;

  // Computed
  totalRevenue: number;
  totalExpense: number;
  cashOnHand: number;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

// Initial Transactions (Empty)
const INITIAL_TRANSACTIONS: Transaction[] = [];

const INITIAL_SETTINGS: SchoolSettingsData = {
  schoolNameTH: 'โรงเรียนบ้านละหอกตะแบง',
  schoolNameEN: 'LahoktabangSchool',
  address: '185 หมู่ 5 ตำบลปราสาท อำเภอบ้านกรวด จังหวัดบุรีรัมย์ 31180',
  directorName: 'นายจีราพัชร์  สารคร',
  financeOfficerName: 'นางสาวหนิง',
  auditorName: 'นางสาวบัว',
  affiliation: 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาบุรีรัมย์ เขต 2',
  bankAccounts: [
    { id: 'ba-1', name: 'บช.เงินอุดหนุนอื่น (ธกส.)', bankName: 'ธนาคารเพื่อการเกษตรและสหกรณ์', accountNo: '020-2-XXXXX-X', fundTypes: ['fund-subsidy', 'fund-15y-book', 'fund-15y-supply', 'fund-15y-uniform', 'fund-15y-activity', 'fund-poor'], color: 'green' },
    { id: 'ba-2', name: 'บช.เงิน กสศ. (ธกส.)', bankName: 'ธนาคารเพื่อการเกษตรและสหกรณ์', accountNo: '020-2-XXXXX-X', fundTypes: ['fund-eef'], color: 'purple' },
    { id: 'ba-3', name: 'บช.เงินอาหารกลางวัน (ธกส.)', bankName: 'ธนาคารเพื่อการเกษตรและสหกรณ์', accountNo: '020-2-XXXXX-X', fundTypes: ['fund-lunch'], color: 'orange' },
    { id: 'ba-4', name: 'บช.เงินรายได้สถานศึกษา', bankName: 'ธนาคารออมสิน', accountNo: '000-0-XXXXX-X', fundTypes: ['fund-school-income'], color: 'blue' },
  ]
};

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];

export const SchoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [receipts, setReceipts] = useState<Receipt[]>(MOCK_RECEIPTS);
  const [loans, setLoans] = useState<LoanContract[]>(MOCK_LOANS);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(INITIAL_APPROVALS);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>(FINANCIAL_RECORDS);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(BUDGET_ITEMS);

  // Load from localStorage on mount
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('lhb_transactions');
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch { return INITIAL_TRANSACTIONS; }
  });
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettingsData>(() => {
    try {
      const saved = localStorage.getItem('lhb_school_settings');
      return saved ? { ...INITIAL_SETTINGS, ...JSON.parse(saved) } : INITIAL_SETTINGS;
    } catch { return INITIAL_SETTINGS; }
  });
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('lhb_audit_logs');
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch { return INITIAL_AUDIT_LOGS; }
  });

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem('lhb_transactions', JSON.stringify(transactions));
  }, [transactions]);
  useEffect(() => {
    localStorage.setItem('lhb_school_settings', JSON.stringify(schoolSettings));
  }, [schoolSettings]);
  useEffect(() => {
    localStorage.setItem('lhb_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);


  // Computed Values
  const totalRevenue = receipts
    .filter(r => r.status === 'completed')
    .reduce((acc, r) => acc + r.amount, 0);

  const totalExpense = approvals
    .filter(a => a.status === 'approved')
    .reduce((acc, a) => acc + a.amount, 0) +
    loans.reduce((acc, l) => acc + l.amount, 0);

  // Start with 0 cash on hand
  const cashOnHand = 0 + totalRevenue - totalExpense;

  const logAction = (action: string, details: string, module: string) => {
    const newLog: AuditLogEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      user: 'เจ้าหน้าที่การเงิน', // Mock user
      action,
      details,
      module
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const getFundTitle = (page: string) => {
    switch (page) {
      case 'fund-subsidy': return 'เงินอุดหนุนรายหัว';
      case 'fund-15y-book': return 'ค่าหนังสือเรียน (เรียนฟรี 15 ปี)';
      case 'fund-15y-supply': return 'ค่าอุปกรณ์การเรียน (เรียนฟรี 15 ปี)';
      case 'fund-15y-uniform': return 'ค่าเครื่องแบบนักเรียน (เรียนฟรี 15 ปี)';
      case 'fund-15y-activity': return 'กิจกรรมพัฒนาคุณภาพผู้เรียน (เรียนฟรี 15 ปี)';
      case 'fund-poor': return 'เงินปัจจัยพื้นฐานนักเรียนยากจน';
      case 'fund-eef': return 'เงิน กสศ.';
      case 'fund-lunch': return 'เงินอาหารกลางวัน';
      case 'fund-tax': return 'เงินภาษี 1%';
      case 'fund-state': return 'เงินรายได้แผ่นดิน';
      case 'fund-safekeeping': return 'บันทึกการรับเงินเพื่อเก็บรักษา';
      case 'fund-school-income': return 'เงินรายได้สถานศึกษา';
      default: return 'บัญชีงบประมาณ';
    }
  };

  const addReceipt = (receipt: Receipt) => {
    setReceipts(prev => [receipt, ...prev]);
    logAction('บันทึกรายรับ', `หน้ารายรับ เพิ่มใบเสร็จเลขที่ ${receipt.id} ยอดเงิน ${receipt.amount}`, 'revenue');
  };

  const addLoan = (loan: LoanContract) => {
    setLoans(prev => [loan, ...prev]);
    logAction('สร้างสัญญายืม', `หน้ายืมเงิน สร้างสัญญาเลขที่ ${loan.id} ผู้ยืม ${loan.requester} ยอดเงิน ${loan.amount}`, 'loan');
  };

  const createPR = (pr: ApprovalRequest) => {
    setApprovals(prev => [pr, ...prev]);
    logAction('สร้างใบขอซื้อ (PR)', `หน้าขออนุมัติเบิกจ่าย สร้างรายการ ${pr.title} ยอดเงิน ${pr.amount}`, 'expenditure');
  };

  const processApproval = (id: string, action: 'approved' | 'rejected') => {
    setApprovals(prev => prev.map(item =>
      item.id === id ? { ...item, status: action } : item
    ));
    logAction('อนุมัติรายการ', `หน้าขออนุมัติเบิกจ่าย เปลี่ยนสถานะรายการ ${id} เป็น ${action === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'}`, 'expenditure');
  };

  const addTransaction = (tx: Transaction) => {
    setTransactions(prev => [...prev, tx]);
    logAction('เพิ่มข้อมูล', `หน้า${getFundTitle(tx.fundType)} เพิ่มรายการที่เอกสาร ${tx.docNo || '-'} ยอดเงิน ${tx.income > 0 ? tx.income : tx.expense}`, tx.fundType);
  };

  const editTransaction = (id: number, updatedTx: Partial<Transaction>) => {
    const tx = transactions.find(t => t.id === id);
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedTx } : t));
    logAction('แก้ไขข้อมูล', `หน้า${tx ? getFundTitle(tx.fundType) : 'บัญชีงบประมาณ'} แก้ไขรายการที่เอกสาร ${updatedTx.docNo || tx?.docNo || '-'}`, tx?.fundType || 'dashboard');
  };

  const deleteTransaction = (id: number, reason: string) => {
    const tx = transactions.find(t => t.id === id);
    setTransactions(prev => prev.filter(t => t.id !== id));
    logAction('ลบข้อมูล', `หน้า${tx ? getFundTitle(tx.fundType) : 'บัญชีงบประมาณ'} ลบรายการที่เอกสาร ${tx?.docNo || '-'} เนื่องจาก: ${reason}`, tx?.fundType || 'dashboard');
  };

  const updateSchoolSettings = (settings: Partial<SchoolSettingsData>) => {
    setSchoolSettings(prev => ({ ...prev, ...settings }));
    logAction('ตั้งค่าระบบ', 'หน้าตั้งค่าข้อมูลโรงเรียน อัปเดตข้อมูลรายละเอียดหน่วยงาน', 'settings-general');
  };

  const resetData = () => {
    setTransactions([]);
    setReceipts([]);
    setLoans([]);
    setApprovals([]);
    localStorage.removeItem('lhb_transactions');
    localStorage.removeItem('lhb_audit_logs');
    logAction('ล้างข้อมูล', 'รีเซ็ตข้อมูลระบบทั้งหมดและลบรายการบัญชีทั้งหมด', 'settings');
    // keep settings
  };

  return (
    <SchoolContext.Provider value={{
      receipts,
      loans,
      approvals,
      financialRecords,
      budgetItems,
      transactions,
      schoolSettings,
      auditLogs,
      addReceipt,
      addLoan,
      createPR,
      processApproval,
      addTransaction,
      editTransaction,
      deleteTransaction,
      updateSchoolSettings,
      resetData,
      logAction,
      totalRevenue,
      totalExpense,
      cashOnHand
    }}>
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchoolData = () => {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchoolData must be used within a SchoolProvider');
  }
  return context;
};
