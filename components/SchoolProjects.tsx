import React, { useState, useMemo } from 'react';
import { useSchoolData } from '../context/SchoolContext';
import ConfirmModal from './ConfirmModal';
import DeleteConfirmModal from './DeleteConfirmModal';

// ===== TYPES =====
interface ProjectExpense {
    id: number;
    date: string;
    description: string;
    amount: number;
    round: number; // ครั้งที่
}

interface Project {
    id: number;
    name: string;
    department: string; // ฝ่าย
    category: string;   // ประเภท
    budget: number;
    startDate: string;
    endDate: string;
    status: 'planning' | 'in-progress' | 'completed' | 'cancelled';
    description: string;
    responsible: string;
    expenses: ProjectExpense[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    'planning': { label: 'วางแผน', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    'in-progress': { label: 'กำลังดำเนินการ', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    'completed': { label: 'เสร็จสิ้น', color: 'bg-green-100 text-green-700 border-green-200' },
    'cancelled': { label: 'ยกเลิก', color: 'bg-red-100 text-red-700 border-red-200' },
};

const DEPARTMENTS = ['ฝ่ายบริหาร', 'ฝ่ายวิชาการ', 'ฝ่ายงบประมาณ', 'ฝ่ายบุคคล', 'ฝ่ายทั่วไป', 'อื่นๆ'];
const CATEGORIES = ['พัฒนาผู้เรียน', 'พัฒนาครูและบุคลากร', 'จัดการเรียนการสอน', 'อาคารสถานที่', 'ชุมชนสัมพันธ์', 'บริหารจัดการ', 'อื่นๆ'];

const fmtMoney = (v: number) => v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtThaiDate = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
};

// ===== CSV HELPERS =====
const CSV_HEADERS = ['ชื่อโครงการ', 'ฝ่าย', 'ประเภท', 'งบประมาณ', 'วันเริ่ม', 'วันสิ้นสุด', 'สถานะ', 'ผู้รับผิดชอบ', 'รายละเอียด'];
const CSV_TEMPLATE = [
    CSV_HEADERS.join(','),
    'โครงการส่งเสริมการอ่าน,ฝ่ายวิชาการ,พัฒนาผู้เรียน,50000,2025-10-01,2026-03-31,planning,ครูสมศรี,ส่งเสริมนิสัยรักการอ่านของนักเรียน',
    'โครงการพัฒนาสื่อการสอน,ฝ่ายวิชาการ,จัดการเรียนการสอน,30000,2025-11-01,2026-02-28,in-progress,ครูสมชาย,จัดซื้อและพัฒนาสื่อการสอนใหม่',
].join('\n');

const downloadCSVTemplate = () => {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'เทมเพลต_โครงการโรงเรียน.csv';
    a.click();
    URL.revokeObjectURL(url);
};

const parseCSV = (text: string): Project[] => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const projects: Project[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 5 || !cols[0]) continue;
        projects.push({
            id: Date.now() + i,
            name: cols[0],
            department: cols[1] || 'อื่นๆ',
            category: cols[2] || 'อื่นๆ',
            budget: parseFloat(cols[3]) || 0,
            startDate: cols[4] || '',
            endDate: cols[5] || '',
            status: (['planning', 'in-progress', 'completed', 'cancelled'].includes(cols[6]) ? cols[6] : 'planning') as Project['status'],
            responsible: cols[7] || '',
            description: cols[8] || '',
            expenses: [],
        });
    }
    return projects;
};

// ===== COMPONENT =====
const SchoolProjects: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>(() => {
        const saved = localStorage.getItem('school-projects-v2');
        return saved ? JSON.parse(saved) : [];
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [filterDept, setFilterDept] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Expense modal
    const [isExpenseOpen, setIsExpenseOpen] = useState(false);
    const [expenseForm, setExpenseForm] = useState({ date: '', description: '', amount: '' });

    const [form, setForm] = useState({
        name: '', budget: '', startDate: '', endDate: '',
        status: 'planning' as Project['status'], description: '', responsible: '',
        department: DEPARTMENTS[0], category: CATEGORIES[0]
    });

    // Modal Notifications
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'info' | 'warning' | 'error' | 'success';
        onConfirm?: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    const showAlert = (title: string, message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info', onConfirm?: () => void) => {
        setModalConfig({ isOpen: true, title, message, type, onConfirm });
    };

    const [deleteModalConfig, setDeleteModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: (reason: string) => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const saveProjects = (newProjects: Project[]) => {
        setProjects(newProjects);
        localStorage.setItem('school-projects-v2', JSON.stringify(newProjects));
    };

    const openAdd = () => {
        setEditingProject(null);
        setForm({ name: '', budget: '', startDate: '', endDate: '', status: 'planning', description: '', responsible: '', department: DEPARTMENTS[0], category: CATEGORIES[0] });
        setIsModalOpen(true);
    };

    const openEdit = (p: Project) => {
        setEditingProject(p);
        setForm({
            name: p.name, budget: p.budget.toString(),
            startDate: p.startDate, endDate: p.endDate, status: p.status,
            description: p.description, responsible: p.responsible,
            department: p.department, category: p.category
        });
        setSelectedProject(null);
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        const project: Project = {
            id: editingProject ? editingProject.id : Date.now(),
            name: form.name.trim(),
            department: form.department,
            category: form.category,
            budget: parseFloat(form.budget) || 0,
            startDate: form.startDate,
            endDate: form.endDate,
            status: form.status,
            description: form.description.trim(),
            responsible: form.responsible.trim(),
            expenses: editingProject ? editingProject.expenses : []
        };
        if (editingProject) {
            saveProjects(projects.map(p => p.id === editingProject.id ? project : p));
        } else {
            saveProjects([...projects, project]);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: number) => {
        const p = projects.find(proj => proj.id === id);
        setDeleteModalConfig({
            isOpen: true,
            title: 'ยืนยันการลบโครงการ',
            message: `คุณยืนยันที่จะลบโครงการ "${p?.name}" ใช่หรือไม่? ข้อมูลการใช้จ่ายทั้งหมดในโครงการนี้จะถูกลบออกด้วย`,
            onConfirm: (reason: string) => {
                saveProjects(projects.filter(proj => proj.id !== id));
                setSelectedProject(null);
                setDeleteModalConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // Add expense to project
    const handleAddExpense = () => {
        if (!selectedProject || !expenseForm.description.trim() || !expenseForm.amount) return;
        const updated = projects.map(p => {
            if (p.id !== selectedProject.id) return p;
            const newExp: ProjectExpense = {
                id: Date.now(),
                date: expenseForm.date || new Date().toISOString().slice(0, 10),
                description: expenseForm.description.trim(),
                amount: parseFloat(expenseForm.amount) || 0,
                round: (p.expenses?.length || 0) + 1
            };
            return { ...p, expenses: [...(p.expenses || []), newExp] };
        });
        saveProjects(updated);
        setSelectedProject(updated.find(p => p.id === selectedProject.id) || null);
        setExpenseForm({ date: '', description: '', amount: '' });
        setIsExpenseOpen(false);
    };

    const handleDeleteExpense = (projId: number, expId: number) => {
        const p = projects.find(proj => proj.id === projId);
        const exp = p?.expenses?.find(e => e.id === expId);
        setDeleteModalConfig({
            isOpen: true,
            title: 'ยืนยันการลบรายการใช้จ่าย',
            message: `คุณยืนยันที่จะลบรายการ "${exp?.description}" จำนวน ฿${exp?.amount} ในโครงการ "${p?.name}" ใช่หรือไม่?`,
            onConfirm: (reason: string) => {
                const updated = projects.map(proj => {
                    if (proj.id !== projId) return proj;
                    return { ...proj, expenses: proj.expenses.filter(e => e.id !== expId) };
                });
                saveProjects(updated);
                setSelectedProject(updated.find(proj => proj.id === projId) || null);
                setDeleteModalConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // CSV Import
    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const imported = parseCSV(text);
            if (imported.length === 0) {
                showAlert('ผิดพลาด', 'ไม่สามารถอ่านไฟล์ CSV ได้ กรุณาตรวจสอบรูปแบบไฟล์ให้ถูกต้อง', 'error');
                return;
            }
            saveProjects([...projects, ...imported]);
            showAlert('สำเร็จ', `นำเข้าสำเร็จ ${imported.length} โครงการ`, 'success');
        };
        reader.readAsText(file, 'UTF-8');
        e.target.value = '';
    };

    // Excel export
    const handleExportExcel = () => {
        const BOM = '\uFEFF';
        const headers = ['ลำดับ', 'ชื่อโครงการ', 'ฝ่าย', 'ประเภท', 'งบประมาณ', 'ใช้จ่ายแล้ว', 'คงเหลือ', 'สถานะ', 'ผู้รับผิดชอบ', 'วันเริ่ม', 'วันสิ้นสุด', 'รายละเอียด'];
        const rows = filtered.map((p, i) => {
            const spent = (p.expenses || []).reduce((s, e) => s + e.amount, 0);
            return [i + 1, p.name, p.department, p.category, p.budget, spent, p.budget - spent,
            STATUS_MAP[p.status]?.label || p.status, p.responsible, p.startDate, p.endDate, p.description
            ].join('\t');
        });
        const content = BOM + headers.join('\t') + '\n' + rows.join('\n');
        const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'โครงการโรงเรียน.xls';
        a.click();
        URL.revokeObjectURL(url);
    };

    const filtered = useMemo(() => projects.filter(p => {
        const matchDept = filterDept === 'all' || p.department === filterDept;
        const matchStatus = filterStatus === 'all' || p.status === filterStatus;
        const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.responsible.toLowerCase().includes(searchTerm.toLowerCase());
        return matchDept && matchStatus && matchSearch;
    }), [projects, filterDept, filterStatus, searchTerm]);

    const totalBudget = filtered.reduce((s, p) => s + p.budget, 0);
    const totalSpent = filtered.reduce((s, p) => s + (p.expenses || []).reduce((a, e) => a + e.amount, 0), 0);

    // Grouped by department
    const grouped = useMemo(() => {
        const map: Record<string, Project[]> = {};
        filtered.forEach(p => {
            if (!map[p.department]) map[p.department] = [];
            map[p.department].push(p);
        });
        return map;
    }, [filtered]);

    return (
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 dark:bg-background-dark p-6 flex flex-col gap-6">
            {/* Header */}
            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">assignment</span>
                            โครงการโรงเรียน
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">จัดการและติดตามโครงการต่างๆ ของโรงเรียน</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {/* CSV Template */}
                        <button onClick={downloadCSVTemplate}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold transition-all border border-gray-200">
                            <span className="material-symbols-outlined text-sm">download</span>
                            เทมเพลต CSV
                        </button>
                        {/* Import CSV */}
                        <label className="flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-semibold transition-all border border-green-200 cursor-pointer">
                            <span className="material-symbols-outlined text-sm">upload_file</span>
                            นำเข้า CSV
                            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                        </label>
                        {/* Export Excel */}
                        <button onClick={handleExportExcel} disabled={filtered.length === 0}
                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-all border border-emerald-200 disabled:opacity-50">
                            <span className="material-symbols-outlined text-sm">table_view</span>
                            Excel
                        </button>
                        {/* Add */}
                        <button onClick={openAdd}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-md transition-all">
                            <span className="material-symbols-outlined text-base">add</span>
                            เพิ่มโครงการ
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400">จำนวนโครงการ</p>
                    <p className="text-2xl font-bold text-blue-600">{filtered.length}</p>
                </div>
                <div className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400">งบประมาณรวม</p>
                    <p className="text-2xl font-bold text-green-600">฿{fmtMoney(totalBudget)}</p>
                </div>
                <div className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400">ใช้จ่ายแล้ว</p>
                    <p className="text-2xl font-bold text-amber-600">฿{fmtMoney(totalSpent)}</p>
                </div>
                <div className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400">คงเหลือ</p>
                    <p className="text-2xl font-bold text-purple-600">฿{fmtMoney(totalBudget - totalSpent)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 items-center flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        placeholder="ค้นหาโครงการ..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors bg-white" />
                </div>
                <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none focus:border-blue-400">
                    <option value="all">ทุกฝ่าย</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                    {[{ v: 'all', l: 'ทั้งหมด' }, ...Object.entries(STATUS_MAP).map(([v, { label }]) => ({ v, l: label }))].map(opt => (
                        <button key={opt.v} onClick={() => setFilterStatus(opt.v)}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${filterStatus === opt.v ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            {opt.l}
                        </button>
                    ))}
                </div>
            </div>

            {/* Projects Grouped by Department */}
            {Object.keys(grouped).length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-16 text-gray-400">
                    <span className="material-symbols-outlined text-5xl mb-3 opacity-50">folder_off</span>
                    <p className="text-sm">ยังไม่มีโครงการ</p>
                    <button onClick={openAdd} className="mt-3 text-sm text-blue-600 font-semibold hover:underline">+ เพิ่มโครงการใหม่</button>
                </div>
            ) : (
                Object.entries(grouped).map(([dept, projs]) => (
                    <div key={dept} className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="px-4 py-3 bg-blue-50/50 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">folder</span>
                                {dept}
                            </h3>
                            <span className="text-xs text-blue-600 font-semibold">{projs.length} โครงการ · ฿{fmtMoney(projs.reduce((s, p) => s + p.budget, 0))}</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {projs.map(project => {
                                const spent = (project.expenses || []).reduce((s, e) => s + e.amount, 0);
                                const remaining = project.budget - spent;
                                const progress = project.budget > 0 ? Math.min(100, (spent / project.budget) * 100) : 0;
                                const statusInfo = STATUS_MAP[project.status];
                                return (
                                    <div key={project.id}
                                        onClick={() => setSelectedProject(project)}
                                        className="p-4 hover:bg-blue-50/50 transition-colors cursor-pointer flex items-center gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-sm font-bold text-gray-800 truncate">{project.name}</h4>
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${statusInfo.color}`}>{statusInfo.label}</span>
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">{project.category}</span>
                                            </div>
                                            {project.description && <p className="text-xs text-gray-400 truncate mb-1.5">{project.description}</p>}
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                    {fmtThaiDate(project.startDate)} - {fmtThaiDate(project.endDate)}
                                                </span>
                                                {project.responsible && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">person</span>{project.responsible}</span>}
                                                {(project.expenses || []).length > 0 && (
                                                    <span className="flex items-center gap-1 text-amber-600"><span className="material-symbols-outlined text-[14px]">receipt_long</span>ดำเนินการ {project.expenses.length} ครั้ง</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 w-44">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-gray-400">ใช้ ฿{fmtMoney(spent)}</span>
                                                <span className="font-semibold text-gray-600">฿{fmtMoney(project.budget)}</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all ${progress > 90 ? 'bg-red-400' : progress > 60 ? 'bg-amber-400' : 'bg-green-400'}`}
                                                    style={{ width: `${progress}%` }} />
                                            </div>
                                            <div className="flex justify-between text-[10px] mt-0.5">
                                                <span className={`font-semibold ${remaining < 0 ? 'text-red-500' : 'text-green-600'}`}>เหลือ ฿{fmtMoney(remaining)}</span>
                                                <span className="text-gray-400">{progress.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}

            {/* Detail Modal */}
            {selectedProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 truncate">{selectedProject.name}</h3>
                                <div className="flex gap-2 mt-1">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${STATUS_MAP[selectedProject.status].color}`}>{STATUS_MAP[selectedProject.status].label}</span>
                                    <span className="text-xs text-gray-400">{selectedProject.department} · {selectedProject.category}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedProject(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {/* Budget summary */}
                            {(() => {
                                const spent = (selectedProject.expenses || []).reduce((s, e) => s + e.amount, 0);
                                const remaining = selectedProject.budget - spent;
                                const progress = selectedProject.budget > 0 ? Math.min(100, (spent / selectedProject.budget) * 100) : 0;
                                return (
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                                            <p className="text-[10px] text-green-600 mb-0.5">งบประมาณ</p>
                                            <p className="text-sm font-bold text-green-700">฿{fmtMoney(selectedProject.budget)}</p>
                                        </div>
                                        <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                                            <p className="text-[10px] text-amber-600 mb-0.5">ใช้จ่ายแล้ว ({progress.toFixed(0)}%)</p>
                                            <p className="text-sm font-bold text-amber-700">฿{fmtMoney(spent)}</p>
                                        </div>
                                        <div className={`rounded-xl p-3 text-center border ${remaining < 0 ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                                            <p className={`text-[10px] mb-0.5 ${remaining < 0 ? 'text-red-600' : 'text-blue-600'}`}>คงเหลือ</p>
                                            <p className={`text-sm font-bold ${remaining < 0 ? 'text-red-700' : 'text-blue-700'}`}>฿{fmtMoney(remaining)}</p>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Info */}
                            <div className="space-y-2">
                                {[
                                    { label: 'ระยะเวลา', value: `${fmtThaiDate(selectedProject.startDate)} - ${fmtThaiDate(selectedProject.endDate)}` },
                                    { label: 'ผู้รับผิดชอบ', value: selectedProject.responsible || '-' },
                                    { label: 'รายละเอียด', value: selectedProject.description || '-' },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-start py-1 text-sm">
                                        <span className="text-xs text-gray-400 shrink-0 min-w-[80px]">{item.label}</span>
                                        <span className="text-sm text-gray-700 text-right">{item.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Expenses list */}
                            <div className="border-t border-gray-100 pt-3">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-bold text-gray-700 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-base">receipt_long</span>
                                        รายการใช้จ่าย ({(selectedProject.expenses || []).length} ครั้ง)
                                    </h4>
                                    <button onClick={() => { setExpenseForm({ date: new Date().toISOString().slice(0, 10), description: '', amount: '' }); setIsExpenseOpen(true); }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold border border-amber-200 transition-all">
                                        <span className="material-symbols-outlined text-sm">add</span>
                                        เพิ่มรายการ
                                    </button>
                                </div>
                                {(selectedProject.expenses || []).length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-4">ยังไม่มีรายการใช้จ่าย</p>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedProject.expenses.map(exp => (
                                            <div key={exp.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors">
                                                <span className="text-xs font-bold text-blue-600 bg-blue-50 rounded-md px-2 py-0.5 border border-blue-100 shrink-0">ครั้งที่ {exp.round}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-700 truncate">{exp.description}</p>
                                                    <p className="text-[10px] text-gray-400">{fmtThaiDate(exp.date)}</p>
                                                </div>
                                                <span className="text-sm font-bold text-red-600 shrink-0">-฿{fmtMoney(exp.amount)}</span>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteExpense(selectedProject.id, exp.id); }}
                                                    className="text-gray-300 hover:text-red-500 transition-colors">
                                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-4 flex gap-2 border-t border-gray-100 shrink-0">
                            <button onClick={() => openEdit(selectedProject)}
                                className="flex-1 py-2 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-base">edit</span> แก้ไข
                            </button>
                            <button onClick={() => handleDelete(selectedProject.id)}
                                className="flex-1 py-2 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-base">delete</span> ลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Expense Mini Modal */}
            {isExpenseOpen && selectedProject && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-gray-100 bg-amber-50">
                            <h4 className="text-sm font-bold text-gray-900">เพิ่มรายการใช้จ่าย</h4>
                            <p className="text-xs text-amber-700">{selectedProject.name}</p>
                        </div>
                        <div className="p-4 space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-1 block">วันที่</label>
                                <input type="date" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-amber-400" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-1 block">รายละเอียด</label>
                                <input type="text" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-amber-400" placeholder="รายการที่จ่าย" autoFocus />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-1 block">จำนวนเงิน (บาท)</label>
                                <input type="number" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-amber-400" placeholder="0.00" />
                            </div>
                        </div>
                        <div className="p-4 flex gap-2 border-t border-gray-100">
                            <button onClick={() => setIsExpenseOpen(false)}
                                className="flex-1 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">ยกเลิก</button>
                            <button onClick={handleAddExpense}
                                disabled={!expenseForm.description.trim() || !expenseForm.amount}
                                className="flex-[2] py-2 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all">
                                บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Project Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                            <h3 className="text-base font-bold text-gray-900">{editingProject ? 'แก้ไขโครงการ' : 'เพิ่มโครงการใหม่'}</h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-600">ชื่อโครงการ *</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" placeholder="ชื่อโครงการ" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-600">ฝ่าย</label>
                                    <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400">
                                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-600">ประเภท</label>
                                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400">
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-600">งบประมาณ (บาท)</label>
                                <input type="number" step="0.01" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" placeholder="0.00" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-600">วันเริ่ม</label>
                                    <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-600">วันสิ้นสุด</label>
                                    <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-600">สถานะ</label>
                                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Project['status'] })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400">
                                    {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-600">ผู้รับผิดชอบ</label>
                                <input type="text" value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" placeholder="ชื่อผู้รับผิดชอบ" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-600">รายละเอียด</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none" placeholder="รายละเอียดโครงการ" />
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 shrink-0">
                            <button type="button" onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">ยกเลิก</button>
                            <button type="submit"
                                className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm">
                                {editingProject ? 'บันทึกการแก้ไข' : 'เพิ่มโครงการ'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <ConfirmModal
                isOpen={modalConfig.isOpen}
                onConfirm={() => {
                    if (modalConfig.onConfirm) modalConfig.onConfirm();
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                }}
                onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                showCancel={!!modalConfig.onConfirm}
            />

            <DeleteConfirmModal
                isOpen={deleteModalConfig.isOpen}
                title={deleteModalConfig.title}
                message={deleteModalConfig.message}
                onCancel={() => setDeleteModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={(reason) => {
                    deleteModalConfig.onConfirm(reason);
                }}
            />
        </div>
    );
};

export default SchoolProjects;
