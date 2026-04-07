import { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

export default function Sidebar ({ isOpen, onClose }) {
    const { activeTab, setActiveTab, sales, accounts } = useData();
    const { user, logout, hasPermission } = useAuth();

    // التوجيه التلقائي للمودريتور
    useEffect(() => {
        if (user) {
            if (user.role !== 'admin' && hasPermission('sales') && activeTab === 'dashboard') {
                setActiveTab('sales');
            }
        }
    }, [user]);

    const alertsCount = useMemo(() => {
        try {
            let count = 0;
            sales.forEach(sale => {
                if (sale.renewal_stage === 'renewed') return;
                if (!sale.isPaid && Number(sale.remainingAmount) > 0) count++;
                if (sale.expiryDate) {
                    const daysLeft = Math.ceil((new Date(sale.expiryDate) - new Date()) / 86400000);
                    if (daysLeft <= 5) count++;
                }
            });
            return count;
        } catch { return 0; }
    }, [sales, activeTab]);

    const allTabs = [
        { id: 'dashboard', label: 'الرئيسية', icon: 'fa-chart-pie' },
        { id: 'sales', label: 'المبيعات', icon: 'fa-cart-shopping' },
        { id: 'products', label: 'المنتجات', icon: 'fa-boxes-stacked' },
        { id: 'accounts', label: 'المخزون', icon: 'fa-server' },
        { id: 'clients', label: 'العملاء', icon: 'fa-users' },
        { id: 'shifts', label: 'الشفتات', icon: 'fa-clock' },
        { id: 'reports', label: 'التقارير', icon: 'fa-chart-line' },
        { id: 'expenses', label: 'المصروفات', icon: 'fa-wallet' },
        { id: 'wallets', label: 'المحافظ', icon: 'fa-vault' },
        { id: 'renewals', label: 'التنبيهات', icon: 'fa-bell' },
        { id: 'problems', label: 'المشاكل', icon: 'fa-triangle-exclamation' },
    ];

    return (
        <>
            {isOpen && (
                <div onClick={onClose} className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"></div>
            )}

            <aside className={`fixed top-0 bottom-0 right-0 w-64 bg-slate-900 text-white z-50 flex flex-col shadow-2xl overflow-hidden font-sans transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>

                <div className="p-6 border-b border-slate-800 relative">
                    <button onClick={onClose} className="absolute top-4 left-4 text-slate-400 hover:text-white lg:hidden">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/50 flex-shrink-0">
                            <i className="fa-solid fa-layer-group text-xl"></i>
                        </div>
                        <div className="overflow-hidden">
                            <h1 className="text-lg font-black tracking-tight truncate">Service Hub</h1>
                            <p className="text-[10px] text-slate-400 font-bold">إدارة الاشتراكات</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                    {allTabs.filter(t => hasPermission(t.id)).map(item => (
                        <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id); onClose(); }}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative ${activeTab === item.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 font-bold'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                                }`}
                        >
                            <i className={`fa-solid ${item.icon} w-5 text-center transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`}></i>
                            <span className="text-sm">{item.label}</span>

                            {item.id === 'renewals' && alertsCount > 0 && (
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[9px] font-black h-5 w-5 flex items-center justify-center rounded-full animate-pulse shadow-sm">
                                    {alertsCount > 99 ? '+99' : alertsCount}
                                </span>
                            )}
                        </button>
                    ))}

                    {(hasPermission('all') || user.role === 'admin') && (
                        <button onClick={() => { setActiveTab('users'); onClose(); }} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'users' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}>
                            <i className="fa-solid fa-user-gear w-5 text-center"></i>
                            <span className="text-sm">المستخدمين</span>
                        </button>
                    )}
                </nav>

                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <div className="flex items-center gap-3 mb-3 px-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-xs shadow-lg">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <h4 className="text-xs font-bold text-white truncate">{user.username}</h4>
                            <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">{user.role}</span>
                        </div>
                    </div>
                    <button onClick={logout} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-400 py-2.5 rounded-xl transition-all border border-slate-700 hover:border-red-500/50 font-bold text-xs">
                        <i className="fa-solid fa-right-from-bracket"></i> تسجيل خروج
                    </button>
                </div>
            </aside>
        </>
    );
}