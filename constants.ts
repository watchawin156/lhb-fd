
import { ApprovalRequest, BudgetItem, ChartData, FinancialRecord, KPICardProps, LoanContract, Receipt } from './types';
import { formatThaiDate } from './utils';

export const KPI_DATA: KPICardProps[] = [
  {
    title: "เงินสดในมือวันนี้",
    value: "฿0.00",
    trend: `อัปเดตล่าสุด: ${formatThaiDate(new Date().toISOString())}`,
    trendDirection: "neutral",
    trendLabel: "",
    icon: "payments",
    iconBgClass: "bg-green-100 dark:bg-green-900/30",
    iconColorClass: "text-green-700 dark:text-green-400"
  },
  {
    title: "เงินฝากธนาคาร (รวม)",
    value: "฿0.00",
    trend: "อุดหนุน+รายได้+นม",
    trendDirection: "neutral",
    trendLabel: "",
    icon: "account_balance",
    iconBgClass: "bg-blue-100 dark:bg-blue-900/30",
    iconColorClass: "text-blue-700 dark:text-blue-400"
  },
  {
    title: "รายรับรอการจัดสรร",
    value: "฿0.00",
    trend: "ตรงกับยอดเงินฝาก",
    trendDirection: "neutral",
    trendLabel: "สมดุล",
    icon: "pie_chart",
    iconBgClass: "bg-indigo-100 dark:bg-indigo-900/30",
    iconColorClass: "text-indigo-700 dark:text-indigo-400"
  },
  {
    title: "ลูกหนี้เงินยืมเกินกำหนด",
    value: "0 รายการ",
    trend: "ยอดรวม ฿0.00",
    trendDirection: "neutral",
    trendLabel: "ปกติ",
    icon: "check_circle",
    iconBgClass: "bg-gray-100 dark:bg-gray-900/30",
    iconColorClass: "text-gray-700 dark:text-gray-400",
    isAlert: false
  }
];

export const BUDGET_ITEMS: BudgetItem[] = [
  { id: '1', name: 'เงินอุดหนุน', amount: 0, total: 0, color: '#258cf4' },
  { id: '2', name: 'อาหารกลางวัน', amount: 0, total: 0, color: '#6366f1' },
  { id: '3', name: 'อาหารเสริม (นม)', amount: 0, total: 0, color: '#10b981' },
  { id: '4', name: 'รายได้สถานศึกษา', amount: 0, total: 0, color: '#f59e0b' },
];

export const CHART_DATA: ChartData[] = [
  { name: 'ต.ค.', income: 0, expense: 0 },
  { name: 'พ.ย.', income: 0, expense: 0 },
  { name: 'ธ.ค.', income: 0, expense: 0 },
  { name: 'ม.ค.', income: 0, expense: 0 },
  { name: 'ก.พ.', income: 0, expense: 0 },
  { name: 'มี.ค.', income: 0, expense: 0 },
];

export const INITIAL_APPROVALS: ApprovalRequest[] = [];

export const FINANCIAL_RECORDS: FinancialRecord[] = [
  { id: '1', item: 'เงินสด (ยกมา ณ ที่จ่าย)', debit: 0, credit: null, isHeader: true },
  { id: '2', item: 'เงินฝากธนาคาร', debit: null, credit: null, isHeader: true },
  { id: '3', item: 'เงินอุดหนุน', debit: 0, credit: null, indent: true },
  { id: '4', item: 'เงินอาหารกลางวัน', debit: 0, credit: null, indent: true },
  { id: '5', item: 'เงิน นม.', debit: 0, credit: null, indent: true },
  { id: '6', item: 'เงินรายได้สถานศึกษา', debit: 0, credit: 0, indent: true },
  { id: '7', item: 'เงินอุดหนุนรายหัว (ค่าจัดการเรียนการสอน)', debit: null, credit: 0 },
  { id: '8', item: 'เงินเรียนฟรี 15 ปี - หนังสือเรียน', debit: null, credit: 0 },
  { id: '9', item: 'เงินเรียนฟรี 15 ปี - อุปกรณ์การเรียน', debit: null, credit: 0 },
  { id: '10', item: 'เงินเรียนฟรี 15 ปี - เครื่องแบบนักเรียน', debit: null, credit: 0 },
  { id: '11', item: 'เงินเรียนฟรี 15 ปี - กิจกรรมพัฒนาคุณภาพผู้เรียน', debit: null, credit: 0 },
  { id: '12', item: 'เงินปัจจัยพื้นฐานนักเรียนยากจน', debit: null, credit: 0 },
  { id: '13', item: 'เงิน นม.', debit: null, credit: 0 },
  { id: '14', item: 'เงินอาหารกลางวัน', debit: null, credit: 0 },
  { id: '15', item: 'เงินภาษี 1 %', debit: null, credit: 0 },
  { id: '16', item: 'เงินรายได้แผ่นดิน-ดอกเบี้ยเงินอุดหนุน', debit: null, credit: 0 },
  { id: '17', item: 'เงินรายได้แผ่นดิน-ดอกเบี้ยเงินอาหารกลางวัน', debit: null, credit: 0 },
];

export const MOCK_RECEIPTS: Receipt[] = [];

export const MOCK_LOANS: LoanContract[] = [];
