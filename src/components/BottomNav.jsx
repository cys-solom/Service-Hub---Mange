import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const TABS = [
    { id: 'dashboard',  label: 'الرئيسية',  icon: 'fa-chart-pie',       color: 'from-indigo-500 to-blue-600' },
    { id: 'sales',      label: 'المبيعات',   icon: 'fa-cart-shopping',   color: 'from-emerald-500 to-green-600' },
    { id: 'accounts',   label: 'المخزون',    icon: 'fa-server',          color: 'from-violet-500 to-purple-600' },
    { id: 'clients',    label: 'العملاء',    icon: 'fa-users',           color: 'from-blue-500 to-cyan-600' },
    { id: 'expenses',   label: 'المصروفات',  icon: 'fa-wallet',          color: 'from-rose-500 to-pink-600' },
];

export default function BottomNav() {
    const { activeTab, setActiveTab } = useData();
    const { hasPermission } = useAuth();

    const visibleTabs = useMemo(() => {
        return TABS.filter(t => hasPermission(t.id));
    }, [hasPermission]);

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[60] lg:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-area-bottom">
            <div className="flex items-center justify-around px-1 py-1.5">
                {visibleTabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all duration-200 min-w-0 flex-1 ${
                                isActive
                                    ? 'text-indigo-600'
                                    : 'text-slate-400'
                            }`}
                        >
                            <div className={`relative w-10 h-7 flex items-center justify-center rounded-xl transition-all duration-300 ${
                                isActive
                                    ? 'bg-gradient-to-r ' + tab.color + ' text-white shadow-lg scale-110'
                                    : ''
                            }`}>
                                <i className={`fa-solid ${tab.icon} text-sm ${isActive ? '' : 'text-slate-400'}`}></i>
                                {isActive && (
                                    <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-indigo-600"></div>
                                )}
                            </div>
                            <span className={`text-[9px] mt-1 font-bold truncate transition-colors ${
                                isActive ? 'text-indigo-600' : 'text-slate-400'
                            }`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            <style>{`
                .safe-area-bottom {
                    padding-bottom: env(safe-area-inset-bottom, 0px);
                }
            `}</style>
        </nav>
    );
}
