
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (role: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate network delay and default to finance role
    setTimeout(() => {
      onLogin('finance');
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="bg-primary p-8 text-center">
           <div className="bg-white/20 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <span className="material-symbols-outlined text-4xl text-white">school</span>
           </div>
           <h1 className="text-2xl font-bold text-white">Smart School Finance</h1>
           <p className="text-blue-100 text-sm mt-1">ระบบการเงินโรงเรียนครบวงจร</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-6">
           <div className="space-y-4">
              <div className="space-y-1">
                 <label className="text-xs font-semibold text-text-muted">ชื่อผู้ใช้งาน</label>
                 <input type="text" value="finance_officer" readOnly className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-text dark:text-text-dark outline-none cursor-not-allowed" />
              </div>
              <div className="space-y-1">
                 <label className="text-xs font-semibold text-text-muted">รหัสผ่าน</label>
                 <input type="password" value="********" readOnly className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-text dark:text-text-dark outline-none cursor-not-allowed" />
              </div>
           </div>

           <button 
             type="submit" 
             disabled={loading}
             className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
           >
             {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  กำลังเข้าสู่ระบบ...
                </>
             ) : (
                'เข้าสู่ระบบ'
             )}
           </button>
           
           <p className="text-center text-xs text-text-muted">
              สำหรับเจ้าหน้าที่การเงิน
           </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
