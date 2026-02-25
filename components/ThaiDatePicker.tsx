import React, { useState, useEffect } from 'react';

interface ThaiDatePickerProps {
  value: string; // ISO string YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  className?: string;
}

const ThaiDatePicker: React.FC<ThaiDatePickerProps> = ({ value, onChange, label, className }) => {
  // Format Display Date: dd/mm/yyyy (BE) from iso string
  const isoToThai = (isoDate: string) => {
    if (!isoDate) return "";
    const parts = isoDate.split('-');
    if (parts.length >= 3) {
      const y = parseInt(parts[0], 10) + 543;
      return `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}/${y}`;
    }
    return "";
  };

  const [inputValue, setInputValue] = useState(isoToThai(value));

  useEffect(() => {
    setInputValue(isoToThai(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);

    // Try to parse "d/m/yyyy" or "dd/mm/yyyy"
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const dStr = match[1];
      const mStr = match[2];
      const yStr = match[3];
      const yearBE = parseInt(yStr, 10);
      if (yearBE > 2400) { // Sanity check for Buddhist year
        const yearCE = yearBE - 543;
        const m = mStr.padStart(2, '0');
        const d = dStr.padStart(2, '0');
        const iso = `${yearCE}-${m}-${d}`;

        const parsed = new Date(iso);
        if (!isNaN(parsed.getTime())) {
          onChange(iso);
        }
      }
    }
  };

  const handleBlur = () => {
    // Re-format on blur just in case it's incomplete but parsed
    setInputValue(isoToThai(value));
  }

  return (
    <div className={`${className || ''}`}>
      {label && <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>}
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
        placeholder="วว/ดด/ปปปป (เช่น 5/10/2568)"
      />
    </div>
  );
};

export default ThaiDatePicker;
