
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

// ========================================
// API Base URL (Pages Function)
// ========================================
const API = '/api';

const apiFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
};

// ========================================
// Default Settings
// ========================================
const DEFAULT_SETTINGS: SchoolSettingsData = {
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

// ========================================
// Context Type
// ========================================
interface SchoolContextType {
  receipts: Receipt[];
  loans: LoanContract[];
  approvals: ApprovalRequest[];
  financialRecords: FinancialRecord[];
  budgetItems: BudgetItem[];
  transactions: Transaction[];
  schoolSettings: SchoolSettingsData;
  auditLogs: AuditLogEntry[];
  isLoading: boolean;

  addReceipt: (receipt: Receipt) => void;
  addLoan: (loan: LoanContract) => void;
  createPR: (pr: ApprovalRequest) => void;
  processApproval: (id: string, action: 'approved' | 'rejected') => void;
  addTransaction: (tx: Transaction) => Promise<void>;
  editTransaction: (id: number, updatedTx: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: number, reason: string) => Promise<void>;
  updateSchoolSettings: (settings: Partial<SchoolSettingsData>) => Promise<void>;
  resetData: () => Promise<void>;
  logAction: (action: string, details: string, module: string) => void;
  refreshTransactions: () => Promise<void>;

  totalRevenue: number;
  totalExpense: number;
  cashOnHand: number;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

// ========================================
// Provider
// ========================================
export const SchoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loans, setLoans] = useState<LoanContract[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [financialRecords] = useState<FinancialRecord[]>([]);
  const [budgetItems] = useState<BudgetItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettingsData>(DEFAULT_SETTINGS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ========================================
  // Load data from D1 on mount
  // ========================================
  const refreshTransactions = useCallback(async () => {
    try {
      const data = await apiFetch('/transactions');
      setTransactions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Failed to load transactions from API, using empty array', e);
      setTransactions([]);
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      try {
        await refreshTransactions();

        try {
          const settings = await apiFetch('/settings');
          setSchoolSettings({ ...DEFAULT_SETTINGS, ...settings });
        } catch {
          setSchoolSettings(DEFAULT_SETTINGS);
        }

        try {
          const logs = await apiFetch('/audit-logs');
          setAuditLogs(Array.isArray(logs) ? logs : []);
        } catch {
          setAuditLogs([]);
        }

        // ==============================
        // Auto-backup → Telegram
        // throttle: ไม่เกิน 1 ครั้ง/ชั่วโมง
        // ==============================
        try {
          const BACKUP_KEY = 'lhb_last_auto_backup';
          const lastTs = Number(localStorage.getItem(BACKUP_KEY) || '0');
          const ONE_HOUR = 60 * 60 * 1000;
          if (Date.now() - lastTs > ONE_HOUR) {
            // fire-and-forget (ไม่รอ response)
            fetch('/api/backup', { method: 'POST' }).then(() => {
              localStorage.setItem(BACKUP_KEY, String(Date.now()));
            }).catch(() => { /* silent fail */ });
          }
        } catch { /* silent fail */ }

      } finally {
        setIsLoading(false);
      }
    };
    loadAll();
  }, [refreshTransactions]);

  // ========================================
  // Computed
  // ========================================
  const totalRevenue = receipts.filter(r => r.status === 'completed').reduce((acc, r) => acc + r.amount, 0);
  const totalExpense = approvals.filter(a => a.status === 'approved').reduce((acc, a) => acc + a.amount, 0) + loans.reduce((acc, l) => acc + l.amount, 0);
  const cashOnHand = 0 + totalRevenue - totalExpense;

  // ========================================
  // Helpers
  // ========================================
  const getFundTitle = (page: string) => {
    const map: Record<string, string> = {
      'fund-subsidy': 'เงินอุดหนุนรายหัว',
      'fund-15y-book': 'ค่าหนังสือเรียน (เรียนฟรี 15 ปี)',
      'fund-15y-supply': 'ค่าอุปกรณ์การเรียน (เรียนฟรี 15 ปี)',
      'fund-15y-uniform': 'ค่าเครื่องแบบนักเรียน (เรียนฟรี 15 ปี)',
      'fund-15y-activity': 'กิจกรรมพัฒนาคุณภาพผู้เรียน (เรียนฟรี 15 ปี)',
      'fund-poor': 'เงินปัจจัยพื้นฐานนักเรียนยากจน',
      'fund-eef': 'เงิน กสศ.',
      'fund-lunch': 'เงินอาหารกลางวัน',
      'fund-tax': 'เงินภาษี 1%',
      'fund-state': 'เงินรายได้แผ่นดิน(ดอกเบี้ย)',
      'fund-safekeeping': 'บันทึกการรับเงินเพื่อเก็บรักษา',
      'fund-school-income': 'เงินรายได้สถานศึกษา',
    };
    return map[page] || 'บัญชีงบประมาณ';
  };

  const logAction = useCallback(async (action: string, details: string, module: string) => {
    const newLog: AuditLogEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      user: 'เจ้าหน้าที่การเงิน',
      action,
      details,
      module
    };
    setAuditLogs(prev => [newLog, ...prev]);
    // บันทึกไป D1
    try {
      await apiFetch('/audit-logs', {
        method: 'POST',
        body: JSON.stringify({ action, details, module }),
      });
    } catch (e) {
      console.warn('Failed to log action to API', e);
    }
  }, []);

  // ========================================
  // Actions
  // ========================================
  const addReceipt = (receipt: Receipt) => {
    setReceipts(prev => [receipt, ...prev]);
    logAction('บันทึกรายรับ', `เพิ่มใบเสร็จเลขที่ ${receipt.id} ยอดเงิน ${receipt.amount}`, 'revenue');
  };

  const addLoan = (loan: LoanContract) => {
    setLoans(prev => [loan, ...prev]);
    logAction('สร้างสัญญายืม', `สร้างสัญญาเลขที่ ${loan.id} ผู้ยืม ${loan.requester} ยอดเงิน ${loan.amount}`, 'loan');
  };

  const createPR = (pr: ApprovalRequest) => {
    setApprovals(prev => [pr, ...prev]);
    logAction('สร้างใบขอซื้อ (PR)', `สร้างรายการ ${pr.title} ยอดเงิน ${pr.amount}`, 'expenditure');
  };

  const processApproval = (id: string, action: 'approved' | 'rejected') => {
    setApprovals(prev => prev.map(item => item.id === id ? { ...item, status: action } : item));
    logAction('อนุมัติรายการ', `เปลี่ยนสถานะรายการ ${id} เป็น ${action === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'}`, 'expenditure');
  };

  const addTransaction = async (tx: Transaction) => {
    try {
      const saved = await apiFetch('/transactions', {
        method: 'POST',
        body: JSON.stringify(tx),
      });
      setTransactions(prev => [...prev, { ...tx, id: saved.id }]);
      logAction('เพิ่มข้อมูล', `หน้า${getFundTitle(tx.fundType)} เพิ่มรายการที่เอกสาร ${tx.docNo || '-'} ยอดเงิน ${tx.income > 0 ? tx.income : tx.expense}`, tx.fundType);
    } catch (e: any) {
      console.error('addTransaction failed', e);
      throw e;
    }
  };

  const editTransaction = async (id: number, updatedTx: Partial<Transaction>) => {
    const tx = transactions.find(t => t.id === id);
    const merged = { ...tx, ...updatedTx };
    try {
      await apiFetch(`/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(merged),
      });
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedTx } : t));
      logAction('แก้ไขข้อมูล', `หน้า${tx ? getFundTitle(tx.fundType) : 'บัญชีงบประมาณ'} แก้ไขรายการที่เอกสาร ${updatedTx.docNo || tx?.docNo || '-'}`, tx?.fundType || 'dashboard');
    } catch (e: any) {
      console.error('editTransaction failed', e);
      throw e;
    }
  };

  const deleteTransaction = async (id: number, reason: string) => {
    const tx = transactions.find(t => t.id === id);
    try {
      await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
      setTransactions(prev => prev.filter(t => t.id !== id));
      logAction('ลบข้อมูล', `หน้า${tx ? getFundTitle(tx.fundType) : 'บัญชีงบประมาณ'} ลบรายการที่เอกสาร ${tx?.docNo || '-'} เนื่องจาก: ${reason}`, tx?.fundType || 'dashboard');
    } catch (e: any) {
      console.error('deleteTransaction failed', e);
      throw e;
    }
  };

  const updateSchoolSettings = async (settings: Partial<SchoolSettingsData>) => {
    const merged = { ...schoolSettings, ...settings };
    try {
      await apiFetch('/settings', {
        method: 'POST',
        body: JSON.stringify(merged),
      });
      setSchoolSettings(merged);
      logAction('ตั้งค่าระบบ', 'อัปเดตข้อมูลรายละเอียดหน่วยงาน', 'settings-general');
    } catch (e: any) {
      console.error('updateSchoolSettings failed', e);
      throw e;
    }
  };

  const resetData = async () => {
    try {
      await apiFetch('/audit-logs', { method: 'DELETE' });
      setTransactions([]);
      setAuditLogs([]);
      logAction('ล้างข้อมูล', 'รีเซ็ตข้อมูลระบบทั้งหมดและลบรายการบัญชีทั้งหมด', 'settings');
    } catch (e: any) {
      console.error('resetData failed', e);
    }
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
      isLoading,
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
      refreshTransactions,
      totalRevenue,
      totalExpense,
      cashOnHand,
    }}>
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchoolData = () => {
  const context = useContext(SchoolContext);
  if (!context) throw new Error('useSchoolData must be used within a SchoolProvider');
  return context;
};
