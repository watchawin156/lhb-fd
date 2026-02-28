
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  repayLoan: (loanId: string, amount: number, repayDate?: string) => Promise<void>;
  updateSchoolSettings: (settings: Partial<SchoolSettingsData>) => Promise<void>;
  resetData: () => Promise<void>;
  logAction: (action: string, details: string, module: string) => void;
  refreshTransactions: () => Promise<void>;

  totalRevenue: number;
  totalExpense: number;
  cashOnHand: number;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

type BorrowDonorOption = {
  fundType: string;
  balance: number;
};

type BorrowDonorPromptState = {
  targetFund: string;
  shortfall: number;
  options: BorrowDonorOption[];
  selectedDonor: string;
};

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
  const [borrowDonorPrompt, setBorrowDonorPrompt] = useState<BorrowDonorPromptState | null>(null);
  const borrowDonorResolverRef = useRef<((value: { donor?: string; cancelled?: boolean }) => void) | null>(null);

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

  // helper to compute current balance of a fund (all transactions up to now)
  const getFundBalance = (fundType: string) => {
    return transactions
      .filter(t => t.fundType === fundType)
      .reduce((acc, t) => acc + (t.income || 0) - (t.expense || 0), 0);
  };

  const resolveBorrowDonorPrompt = (value: { donor?: string; cancelled?: boolean }) => {
    if (borrowDonorResolverRef.current) {
      borrowDonorResolverRef.current(value);
      borrowDonorResolverRef.current = null;
    }
    setBorrowDonorPrompt(null);
  };

  useEffect(() => {
    return () => {
      if (borrowDonorResolverRef.current) {
        borrowDonorResolverRef.current({ cancelled: true });
        borrowDonorResolverRef.current = null;
      }
    };
  }, []);

  const pickBorrowDonorFund = async (
    targetFund: string,
    shortfall: number,
    fundBalances: Record<string, number>
  ): Promise<{ donor?: string; cancelled?: boolean }> => {
    const candidates = Object.entries(fundBalances)
      .filter(([ft, bal]) => ft !== targetFund && bal > 0)
      .sort((a, b) => b[1] - a[1]);

    if (candidates.length === 0) return {};

    const enoughCandidates = candidates.filter(([, bal]) => bal >= shortfall);
    const displayCandidates = enoughCandidates.length > 0 ? enoughCandidates : candidates;
    const options = displayCandidates.map(([fundType, balance]) => ({ fundType, balance }));

    return new Promise((resolve) => {
      if (borrowDonorResolverRef.current) {
        borrowDonorResolverRef.current({ cancelled: true });
      }
      borrowDonorResolverRef.current = resolve;
      setBorrowDonorPrompt({
        targetFund,
        shortfall,
        options,
        selectedDonor: options[0]?.fundType || '',
      });
    });
  };

  // helper to add to D1 & state without triggering the loan checks again
  const doAddTransaction = async (tx: Transaction) => {
    const payload = { ...tx };
    const saved = await apiFetch('/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setTransactions(prev => [...prev, { ...payload, id: saved.id }]);
    logAction('เพิ่มข้อมูล', `หน้า${getFundTitle(payload.fundType)} เพิ่มรายการที่เอกสาร ${payload.docNo || '-'} ยอดเงิน ${payload.income > 0 ? payload.income : payload.expense}`, payload.fundType);
  };

  const repayLoan = async (loanId: string, amount: number, repayDate?: string) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;
    const txDate = repayDate || new Date().toISOString().slice(0, 10);
    const newReturned = (loan.returnedAmount || 0) + amount;
    setLoans(prev => prev.map(l => l.id === loanId ? { ...l, returnedAmount: newReturned, status: newReturned >= l.amount ? 'returned' : l.status } : l));
    logAction('คืนเงินยืม', `คืนเงินสัญญา ${loanId} จำนวน ${amount}`, 'loan');

    // move money back if we know the funds involved
    if (loan.fromFund && loan.toFund) {
      try {
        const returnPrefix = schoolSettings.docNumberSettings?.returnPrefix || 'คืน-';
        // expense from the fund that received money
        await doAddTransaction({
          id: Date.now(),
          date: txDate,
          docNo: `${returnPrefix}${loanId}`,
          description: `คืนเงินยืม ${loanId}`,
          fundType: loan.toFund,
          income: 0,
          expense: amount,
          loanId,
          skipLoanCheck: true,
        });
        // income to the fund that lent money
        await doAddTransaction({
          id: Date.now() + 1,
          date: txDate,
          docNo: `${returnPrefix}${loanId}`,
          description: `คืนเงินยืม ${loanId}`,
          fundType: loan.fromFund,
          income: amount,
          expense: 0,
          loanId,
          skipLoanCheck: true,
        });
      } catch (e) {
        console.warn('failed to add repayment transactions', e);
      }
    }
  };

  const checkForAutoRepay = (fundType: string) => {
    const balance = getFundBalance(fundType);
    const relatedLoans = loans.filter(l => l.toFund === fundType && l.status === 'active');
    relatedLoans.forEach(l => {
      const outstanding = l.amount - (l.returnedAmount || 0);
      if (balance <= 0) return;
      if (balance >= outstanding) {
        if (window.confirm(`หมวด ${getFundTitle(fundType)} มีเงินเพียงพอจะแจ้งคืนเงินยืมเลขที่ ${l.id} จำนวน ${outstanding.toLocaleString()} บาทหรือไม่?`)) {
          repayLoan(l.id, outstanding);
        }
      } else {
        const str = window.prompt(`หมวด ${getFundTitle(fundType)} มีเงินคงเหลือ ${balance.toLocaleString()} บาท\nต้องการคืนเงินสัญญา ${l.id} จำนวนเท่าไร (สูงสุด ${outstanding.toLocaleString()}):`);
        const amt = parseFloat(str || '0');
        if (amt > 0) repayLoan(l.id, Math.min(amt, balance));
      }
    });
  };

  const addTransaction = async (tx: Transaction) => {
    try {
      // auto–loan logic: if this is an expense and the fund doesn't have enough,
      // borrow from another fund automatically
      if (!tx.skipLoanCheck && tx.expense && tx.fundType) {
        const balance = getFundBalance(tx.fundType);
        if (tx.expense > balance) {
          const shortfall = tx.expense - balance;
          // find a donor fund with available funds (largest positive balance)
          const fundBalances: Record<string, number> = {};
          transactions.forEach(t => {
            if (!fundBalances[t.fundType]) fundBalances[t.fundType] = 0;
            fundBalances[t.fundType] += (t.income || 0) - (t.expense || 0);
          });
          const picked = await pickBorrowDonorFund(tx.fundType, shortfall, fundBalances);
          if (picked.cancelled) {
            alert('ยกเลิกการบันทึกรายจ่าย เพราะยังไม่ได้เลือกหมวดที่จะยืม');
            return;
          }
          const donor = picked.donor;

          if (donor) {
            const now = new Date().toISOString().slice(0, 10);
            const loan: LoanContract = {
              id: `LN-AUTO-${String(loans.length + 1).padStart(3, '0')}`,
              requester: 'ระบบอัตโนมัติ',
              project: `ยืมจาก ${getFundTitle(donor)}`,
              amount: shortfall,
              dateBorrowed: now,
              dueDate: now, // could compute later
              status: 'active',
              fromFund: donor,
              toFund: tx.fundType,
              returnedAmount: 0,
            };
            setLoans(prev => [loan, ...prev]);
            logAction('สร้างสัญญายืม', `ระบบยืมอัตโนมัติ ${shortfall} จาก ${getFundTitle(donor)} เพื่อจ่าย${getFundTitle(tx.fundType)}`, 'loan');

            // record transfer transactions
            await doAddTransaction({
              id: Date.now() + 1,
              date: tx.date,
              docNo: tx.docNo ? tx.docNo + ' (ยืม)' : '',
              description: `ยืมให้ ${getFundTitle(tx.fundType)}`,
              fundType: donor,
              income: 0,
              expense: shortfall,
              loanId: loan.id,
              skipLoanCheck: true,
            });
            await doAddTransaction({
              id: Date.now() + 2,
              date: tx.date,
              docNo: tx.docNo ? tx.docNo + ' (ยืม)' : '',
              description: `ยืมจาก ${getFundTitle(donor)}`,
              fundType: tx.fundType,
              income: shortfall,
              expense: 0,
              loanId: loan.id,
              skipLoanCheck: true,
            });
          } else {
            alert(`ไม่พบหมวดเงินอื่นที่สามารถยืมมาได้ จึงจะบันทึกยอดติดลบใน ${getFundTitle(tx.fundType)}`);
          }
        }
      }

      // finally add the requested transaction
      await doAddTransaction(tx);

      // check if this income triggers a repay opportunity
      if (tx.income && tx.fundType) {
        checkForAutoRepay(tx.fundType);
      }
    } catch (e: any) {
      console.error('addTransaction failed', e);
      throw e;
    }
  };

  const editTransaction = async (id: number, updatedTx: Partial<Transaction>) => {
    const tx = transactions.find(t => t.id === id);
    const merged = { ...tx, ...updatedTx } as Transaction;

    // before saving, check for insufficient balance if expense increases or fundType changes
    if (merged.expense && merged.fundType) {
      const otherTxs = transactions.filter(t => t.id !== id && t.fundType === merged.fundType);
      const bal = otherTxs.reduce((acc, t) => acc + (t.income || 0) - (t.expense || 0), 0);
      if (merged.expense > bal) {
        const shortfall = merged.expense - bal;
        // same donor selection logic as addTransaction
        const fundBalances: Record<string, number> = {};
        transactions.forEach(t => {
          if (!fundBalances[t.fundType]) fundBalances[t.fundType] = 0;
          fundBalances[t.fundType] += (t.income || 0) - (t.expense || 0);
        });
        const picked = await pickBorrowDonorFund(merged.fundType, shortfall, fundBalances);
        if (picked.cancelled) {
          alert('ยกเลิกการแก้ไขรายการ เพราะยังไม่ได้เลือกหมวดที่จะยืม');
          return;
        }
        const donor = picked.donor;
        if (donor) {
          const now = new Date().toISOString().slice(0, 10);
          const loan: LoanContract = {
            id: `LN-AUTO-${String(loans.length + 1).padStart(3, '0')}`,
            requester: 'ระบบอัตโนมัติ',
            project: `ยืมจาก ${getFundTitle(donor)}`,
            amount: shortfall,
            dateBorrowed: now,
            dueDate: now,
            status: 'active',
            fromFund: donor,
            toFund: merged.fundType,
            returnedAmount: 0,
          };
          setLoans(prev => [loan, ...prev]);
          logAction('สร้างสัญญายืม', `ระบบยืมอัตโนมัติ ${shortfall} จาก ${getFundTitle(donor)} เพื่อจ่าย${getFundTitle(merged.fundType)}`, 'loan');
          await doAddTransaction({
            id: Date.now() + 1,
            date: merged.date,
            docNo: merged.docNo ? merged.docNo + ' (ยืม)' : '',
            description: `ยืมให้ ${getFundTitle(merged.fundType)}`,
            fundType: donor,
            income: 0,
            expense: shortfall,
            loanId: loan.id,
            skipLoanCheck: true,
          });
          await doAddTransaction({
            id: Date.now() + 2,
            date: merged.date,
            docNo: merged.docNo ? merged.docNo + ' (ยืม)' : '',
            description: `ยืมจาก ${getFundTitle(donor)}`,
            fundType: merged.fundType,
            income: shortfall,
            expense: 0,
            loanId: loan.id,
            skipLoanCheck: true,
          });
        } else {
          alert(`ไม่พบหมวดเงินอื่นที่สามารถยืมมาได้ จึงจะบันทึกยอดติดลบใน ${getFundTitle(merged.fundType)}`);
        }
      }
    }

    try {
      await apiFetch(`/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(merged),
      });

      const changes: string[] = [];
      if (tx) {
        if (tx.description !== merged.description) changes.push(`ชื่อรายการจาก "${tx.description}" เป็น "${merged.description}"`);
        if (tx.docNo !== merged.docNo) changes.push(`ที่เอกสารจาก "${tx.docNo || '-'}" เป็น "${merged.docNo || '-'}"`);
        if (tx.income !== merged.income) changes.push(`รายรับจาก ${tx.income} เป็น ${merged.income}`);
        if (tx.expense !== merged.expense) changes.push(`รายจ่ายจาก ${tx.expense} เป็น ${merged.expense}`);
        if (tx.fundType !== merged.fundType) changes.push(`หมวดเงินจาก ${tx.fundType} เป็น ${merged.fundType}`);
        if (tx.payer !== merged.payer) changes.push(`ผู้จ่ายจาก "${tx.payer || '-'}" เป็น "${merged.payer || '-'}"`);
        if (tx.payee !== merged.payee) changes.push(`ผู้รับจาก "${tx.payee || '-'}" เป็น "${merged.payee || '-'}"`);
      }
      const changeStr = changes.length > 0 ? ` (เปลี่ยน: ${changes.join(', ')})` : '';

      setTransactions(prev => prev.map(t => t.id === id ? merged : t));
      logAction('แก้ไขข้อมูล', `หน้า${tx ? getFundTitle(tx.fundType) : 'บัญชีงบประมาณ'} แก้ไขรายการที่เอกสาร ${updatedTx.docNo || tx?.docNo || '-'} ${changeStr}`, tx?.fundType || 'dashboard');

      if (merged.income && merged.fundType) {
        checkForAutoRepay(merged.fundType);
      }
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
      repayLoan,
      updateSchoolSettings,
      resetData,
      logAction,
      refreshTransactions,
      totalRevenue,
      totalExpense,
      cashOnHand,
    }}>
      {children}
      {borrowDonorPrompt && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-900">เลือกแหล่งเงินที่จะยืม</h3>
              <p className="mt-1 text-sm text-gray-600">
                ยอดจ่ายของ {getFundTitle(borrowDonorPrompt.targetFund)} ไม่พออีก{' '}
                {borrowDonorPrompt.shortfall.toLocaleString('th-TH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                บาท
              </p>
            </div>
            <div className="px-5 py-4 space-y-2">
              <label htmlFor="borrow-donor-select" className="block text-sm font-medium text-gray-700">
                เลือกหมวดเงินต้นทาง
              </label>
              <select
                id="borrow-donor-select"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={borrowDonorPrompt.selectedDonor}
                onChange={(e) => {
                  const donor = e.target.value;
                  setBorrowDonorPrompt((prev) => (prev ? { ...prev, selectedDonor: donor } : prev));
                }}
              >
                {borrowDonorPrompt.options.map((option) => (
                  <option key={option.fundType} value={option.fundType}>
                    {getFundTitle(option.fundType)} (คงเหลือ{' '}
                    {option.balance.toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    บาท)
                  </option>
                ))}
              </select>
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                onClick={() => resolveBorrowDonorPrompt({ cancelled: true })}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                onClick={() => {
                  if (!borrowDonorPrompt.selectedDonor) {
                    alert('กรุณาเลือกหมวดเงินที่จะยืม');
                    return;
                  }
                  resolveBorrowDonorPrompt({ donor: borrowDonorPrompt.selectedDonor });
                }}
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}
    </SchoolContext.Provider>
  );
};

export const useSchoolData = () => {
  const context = useContext(SchoolContext);
  if (!context) throw new Error('useSchoolData must be used within a SchoolProvider');
  return context;
};
