// ===== Types =====
export const type1Funds = [
    'fund-lunch', 'fund-15y-activity', 'fund-subsidy', 'fund-subsidy-utility', 'fund-subsidy-teaching', 'fund-15y-supply',
    'fund-15y-uniform', 'fund-15y-book', 'fund-poor', 'fund-school-income',
    'fund-eef', 'fund-tax', 'fund-state-subsidy-interest', 'fund-state-lunch-interest',
    'fund-safekeeping'
];

export const taxTriggerFunds = [
    'fund-subsidy', 'fund-subsidy-utility', 'fund-subsidy-teaching',
    'fund-15y-book', 'fund-15y-supply', 'fund-15y-uniform', 'fund-15y-activity',
    'fund-lunch',
    'fund-state-subsidy-interest', 'fund-state-lunch-interest'
];

// Parse Thai date string dd/mm/yyyy(BE) to ISO date string
export const parseThaiDate = (s: string): string | null => {
    const trimmed = s.trim();
    const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const yearBE = parseInt(m[3], 10);
    const yearCE = yearBE - 543;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${yearCE}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Parse export date input: auto-detect single date or range
export const parseDateInput = (input: string): { start: string; end: string } | null => {
    if (input.includes('-') && input.split('-').length >= 2) {
        const rangeParts = input.split(/\s*-\s*/);
        if (rangeParts.length >= 2) {
            const startCandidate = rangeParts[0].trim();
            const endCandidate = rangeParts[rangeParts.length - 1].trim();
            const startISO = parseThaiDate(startCandidate);
            const endISO = parseThaiDate(endCandidate);
            if (startISO && endISO) {
                return { start: startISO, end: endISO };
            }
        }
    }
    const singleISO = parseThaiDate(input.trim());
    if (singleISO) {
        return { start: singleISO, end: singleISO };
    }
    return null;
};
