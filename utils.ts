export const FUND_TYPE_OPTIONS = [
  // เงินงบประมาณ
  { value: 'fund-subsidy', label: 'เงินอุดหนุนรายหัว', group: 'เงินงบประมาณ' },

  { value: 'fund-15y-book', label: 'เงินเรียนฟรี 15 ปี - หนังสือเรียน', group: 'เงินงบประมาณ' },
  { value: 'fund-15y-supply', label: 'เงินเรียนฟรี 15 ปี - อุปกรณ์การเรียน', group: 'เงินงบประมาณ' },
  { value: 'fund-15y-uniform', label: 'เงินเรียนฟรี 15 ปี - เครื่องแบบนักเรียน', group: 'เงินงบประมาณ' },
  { value: 'fund-15y-activity', label: 'เงินเรียนฟรี 15 ปี - กิจกรรมพัฒนาคุณภาพผู้เรียน', group: 'เงินงบประมาณ' },
  { value: 'fund-poor', label: 'เงินปัจจัยพื้นฐานนักเรียนยากจน', group: 'เงินงบประมาณ' },

  // เงินรายได้แผ่นดิน
  { value: 'fund-state', label: 'เงินรายได้แผ่นดิน(ดอกเบี้ย)', group: 'เงินรายได้แผ่นดิน' },

  // เงินนอกงบประมาณ
  { value: 'fund-lunch', label: 'เงินอาหารกลางวัน', group: 'เงินนอกงบประมาณ' },
  { value: 'fund-eef', label: 'เงิน กสศ.', group: 'เงินนอกงบประมาณ' },
  { value: 'fund-school-income', label: 'เงินรายได้สถานศึกษา', group: 'เงินนอกงบประมาณ' },

  { value: 'fund-tax', label: 'เงินภาษี 1%', group: 'เงินนอกงบประมาณ' },
  // for keeping miscellaneous receipts (used only when needed)
  { value: 'fund-safekeeping', label: 'บันทึกการรับเงินเพื่อเก็บรักษา', group: 'เงินนอกงบประมาณ' },
];

export const formatThaiDate = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '-';

  const date = new Date(dateInput);
  // Check if date is valid
  if (isNaN(date.getTime())) {
    // If input is already in Thai format (e.g. legacy data), return as is or try to parse
    return String(dateInput);
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = date.getMonth();
  const year = date.getFullYear() + 543;

  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  return `${day} ${thaiMonths[month]} พ.ศ. ${year}`;
};

export const formatThaiDateShort = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '-';

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    return String(dateInput);
  }

  const day = date.getDate();
  const month = date.getMonth();
  const year = (date.getFullYear() + 543).toString().slice(-2); // Get last 2 digits

  const thaiMonthsShort = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];

  return `${day} ${thaiMonthsShort[month]} ${year}`;
};

export const formatThaiMonth = (monthIndex: number): string => {
  const thaiMonthsShort = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];
  return thaiMonthsShort[monthIndex] || "";
};

export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const numToThaiText = (num: number): string => {
  if (num === 0) return 'ศูนย์บาทถ้วน';
  let s = num.toFixed(2).toString();
  const [bahtStr, satangStr] = s.split('.');

  const parseText = (str: string) => {
    let res = '';
    for (let i = 0; i < str.length; i++) {
      const digit = parseInt(str[i]);
      const pos = str.length - 1 - i;
      if (digit === 0) continue;
      let dText = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'][digit];
      if (pos === 1 && digit === 1) dText = '';
      if (pos === 1 && digit === 2) dText = 'ยี่';
      if (pos === 0 && digit === 1 && str.length > 1 && parseInt(str[str.length - 2]) !== 0) dText = 'เอ็ด';
      res += dText + ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'][pos % 6];
    }
    return res;
  };

  let res = parseText(bahtStr) + 'บาท';
  if (satangStr === '00') {
    res += 'ถ้วน';
  } else {
    res += parseText(satangStr) + 'สตางค์';
  }
  return res;
};

export const getFiscalYear = (dateStr: string) => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear() + 543;
  return month >= 10 ? year + 1 : year;
};

// Simple Thai Baht Text Converter
export const bahtText = (num: number): string => {
  if (!num) return "ศูนย์บาทถ้วน";

  const textNum = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const textDigit = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

  const numStr = num.toFixed(2);
  const [bahtPart, satangPart] = numStr.split('.');

  const convert = (n: string): string => {
    let res = "";
    const len = n.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(n[i]);
      const pos = len - i - 1;

      if (digit !== 0) {
        if (pos === 0 && digit === 1 && len > 1) {
          res += "เอ็ด";
        } else if (pos === 1 && digit === 2) {
          res += "ยี่";
        } else if (pos === 1 && digit === 1) {
          // Skip 'Nueng' for tens place (Sib)
        } else {
          res += textNum[digit];
        }
        res += textDigit[pos];
      }
    }
    return res;
  };

  let bahtText = convert(bahtPart);
  let satangText = convert(satangPart);

  if (bahtText === "") bahtText = "ศูนย์";
  bahtText += "บาท";

  if (satangText === "" || satangText === "ศูนย์") {
    satangText = "ถ้วน";
  } else {
    satangText += "สตางค์";
  }

  return bahtText + satangText;
};
