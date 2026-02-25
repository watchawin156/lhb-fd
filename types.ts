
export interface KPICardProps {
  title: string;
  value: string;
  trend: string;
  trendDirection: 'up' | 'down' | 'neutral';
  trendLabel: string;
  icon: string;
  iconColorClass: string;
  iconBgClass: string;
  isAlert?: boolean; // For flashing red alert
}

export interface BudgetItem {
  id: string;
  name: string;
  amount: number;
  total: number;
  color: string;
}

export interface ApprovalRequest {
  id: string;
  title: string;
  requester: string;
  department: string;
  amount: number;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  type: 'purchase' | 'service' | 'loan';
}

export interface ChartData {
  name: string;
  income: number;
  expense: number;
}

export interface FinancialRecord {
  id: string;
  item: string;
  debit: number | null;
  credit: number | null;
  isHeader?: boolean;
  isTotal?: boolean;
  indent?: boolean;
}

// New Types for Full System
export interface Receipt {
  id: string;
  date: string;
  payer: string;
  type: 'tuition' | 'donation' | 'subsidy' | 'other';
  amount: number;
  paymentMethod: 'cash' | 'transfer';
  status: 'completed' | 'cancelled';
}

export interface LoanContract {
  id: string;
  requester: string;
  project: string;
  amount: number;
  dateBorrowed: string;
  dueDate: string;
  status: 'active' | 'overdue' | 'returned';
}

export interface PRItem {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface Transaction {
  id: number;
  fundType: string; // e.g., 'fund-lunch', 'fund-15y-book'
  date: string;
  docNo: string;
  description: string;
  income: number;
  expense: number;
  payer?: string; // For Income
  payee?: string; // For Expense
  recipientType?: 'individual' | 'juristic'; // For Tax calc
  bankId?: string; // Links transaction to specific bank account
  incomeRefId?: number; // Linking an expense back to its source income
}

export interface BankAccount {
  id: string;
  name: string;         // ชื่อบัญชี เช่น "บช.เงินอุดหนุน"
  bankName: string;     // ชื่อธนาคาร เช่น "ธกส."
  accountNo: string;    // เลขบัญชี
  fundTypes: string[];  // กองทุนที่ผูกกับบัญชีนี้
  color: string;        // สีโปรไฟล์ เช่น "blue", "green"
}

export interface SchoolSettingsData {
  schoolNameTH: string;
  schoolNameEN: string;
  address: string;
  directorName: string;
  financeOfficerName: string; // New
  auditorName: string; // New
  affiliation: string;
  bankAccounts: BankAccount[];
  logo?: string; // base64 image
}

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  module: string;
}
