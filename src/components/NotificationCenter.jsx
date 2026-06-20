import { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

export default function NotificationCenter({ isOpen, onClose, onNavigate }) {
    const { sales, accounts, sections, expenses, customers } = useData();
    const { user } = useAuth();
    const [filter, setFilter] = useState('all'); // all, urgent, stock, money, renewals
    const [dismissedIds, setDismissedIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('sh_dismissed_notifs') || '[]');
        } catch { return []; }
    });

    const dismiss = useCallback((id) => {
        setDismissedIds(prev => {
            const next = [...prev, id];
            localStorage.setItem('sh_dismissed_notifs', JSON.stringify(next.slice(-200))); // keep last 200
            return next;
        });
    }, []);

    const dismissAll = useCallback(() => {
        const allIds = notifications.map(n => n.id);
        setDismissedIds(prev => {
            const next = [...new Set([...prev, ...allIds])];
            localStorage.setItem('sh_dismissed_notifs', JSON.stringify(next.slice(-500)));
            return next;
        });
    }, []);

    const notifications = useMemo(() => {
        const notifs = [];
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // === 1. Expiring Subscriptions (within 5 days) ===
        sales.forEach(sale => {
            if (sale.renewal_stage === 'renewed') return;
            if (!sale.expiryDate) return;
            const daysLeft = Math.ceil((new Date(sale.expiryDate) - today) / 86400000);
            if (daysLeft <= 5 && daysLeft >= -30) {
                const id = `renewal-${sale.id}`;
                notifs.push({
                    id,
                    type: 'renewals',
                    priority: daysLeft <= 0 ? 'critical' : daysLeft <= 2 ? 'high' : 'medium',
                    icon: daysLeft <= 0 ? 'fa-circle-exclamation' : 'fa-clock',
                    color: daysLeft <= 0 ? 'text-red-600 bg-red-50 border-red-200' : daysLeft <= 2 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-blue-600 bg-blue-50 border-blue-200',
                    title: daysLeft <= 0 ? `⚠️ اشتراك منتهي — ${sale.customerName || sale.customerEmail || ''}` : `⏰ اشتراك ينتهي قريباً`,
                    message: `${sale.productName} — ${sale.customerName || sale.customerEmail || 'بدون اسم'} ${daysLeft <= 0 ? `(منتهي من ${Math.abs(daysLeft)} يوم)` : `(باقي ${daysLeft} يوم)`}`,
                    time: sale.expiryDate,
                    tab: 'renewals',
                    dismissed: dismissedIds.includes(id)
                });
            }
        });

        // === 2. Unpaid Sales ===
        sales.forEach(sale => {
            if (sale.isPaid) return;
            const remaining = Number(sale.remainingAmount || 0);
            if (remaining <= 0) return;
            const id = `unpaid-${sale.id}`;
            notifs.push({
                id,
                type: 'money',
                priority: remaining > 500 ? 'high' : 'medium',
                icon: 'fa-money-bill-wave',
                color: 'text-orange-600 bg-orange-50 border-orange-200',
                title: `💸 مديونية — ${sale.customerName || sale.customerEmail || ''}`,
                message: `${sale.productName} — متبقي ${remaining.toLocaleString()} ج.م`,
                time: sale.date,
                tab: 'sales',
                dismissed: dismissedIds.includes(id)
            });
        });

        // === 3. Low Stock Alerts ===
        if (sections && accounts) {
            sections.forEach(sec => {
                const available = accounts.filter(a => a.productName === sec.name && a.status === 'available').length;
                if (available <= 3) {
                    const id = `stock-${sec.id}-${available}`;
                    notifs.push({
                        id,
                        type: 'stock',
                        priority: available === 0 ? 'critical' : 'high',
                        icon: available === 0 ? 'fa-box-open' : 'fa-boxes-stacked',
                        color: available === 0 ? 'text-red-600 bg-red-50 border-red-200' : 'text-amber-600 bg-amber-50 border-amber-200',
                        title: available === 0 ? `🚨 مخزون فارغ — ${sec.name}` : `📦 مخزون منخفض — ${sec.name}`,
                        message: available === 0 ? 'لا يوجد أي حسابات متاحة! أضف مخزون فوراً.' : `متبقي ${available} حساب/كود فقط`,
                        time: todayStr,
                        tab: 'accounts',
                        dismissed: dismissedIds.includes(id)
                    });
                }
            });
        }

        // === 4. Top Customers Without Recent Orders (retention) ===
        if (customers.length > 0) {
            const customerLastOrder = {};
            sales.forEach(s => {
                const key = s.customerName || s.customerEmail;
                if (!key) return;
                const date = new Date(s.date);
                if (!customerLastOrder[key] || date > customerLastOrder[key]) {
                    customerLastOrder[key] = date;
                }
            });
            Object.entries(customerLastOrder).forEach(([name, lastDate]) => {
                const daysSince = Math.ceil((today - lastDate) / 86400000);
                if (daysSince >= 30 && daysSince <= 90) {
                    const id = `retention-${name}`;
                    if (dismissedIds.includes(id)) return;
                    notifs.push({
                        id,
                        type: 'renewals',
                        priority: 'low',
                        icon: 'fa-user-clock',
                        color: 'text-purple-600 bg-purple-50 border-purple-200',
                        title: `👤 عميل غير نشط — ${name}`,
                        message: `آخر طلب منذ ${daysSince} يوم. فكر في التواصل معه.`,
                        time: lastDate.toISOString().split('T')[0],
                        tab: 'clients',
                        dismissed: dismissedIds.includes(id)
                    });
                }
            });
        }

        // Sort: critical first, then by type priority
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return notifs.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));
    }, [sales, accounts, sections, customers, dismissedIds]);

    const activeNotifs = useMemo(() => notifications.filter(n => !n.dismissed), [notifications]);
    const filteredNotifs = useMemo(() => {
        if (filter === 'all') return activeNotifs;
        return activeNotifs.filter(n => n.type === filter);
    }, [activeNotifs, filter]);

    const filterCounts = useMemo(() => ({
        all: activeNotifs.length,
        urgent: activeNotifs.filter(n => n.priority === 'critical' || n.priority === 'high').length,
        stock: activeNotifs.filter(n => n.type === 'stock').length,
        money: activeNotifs.filter(n => n.type === 'money').length,
        renewals: activeNotifs.filter(n => n.type === 'renewals').length,
    }), [activeNotifs]);

    if (!isOpen) return null;

    const filters = [
        { id: 'all',      label: 'الكل',      icon: 'fa-bell' },
        { id: 'urgent',   label: 'عاجل',      icon: 'fa-fire' },
        { id: 'stock',    label: 'المخزون',    icon: 'fa-boxes-stacked' },
        { id: 'money',    label: 'مالية',      icon: 'fa-money-bill-wave' },
        { id: 'renewals', label: 'التجديدات',  icon: 'fa-clock' },
    ];

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-start justify-end animate-fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-slide-right" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-l from-indigo-600 to-violet-700 text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2.5 rounded-xl">
                            <i className="fa-solid fa-bell text-lg"></i>
                        </div>
                        <div>
                            <h3 className="text-lg font-extrabold">مركز الإشعارات</h3>
                            <p className="text-indigo-200 text-[10px] font-bold">{activeNotifs.length} إشعار نشط</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {activeNotifs.length > 0 && (
                            <button onClick={dismissAll} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-[10px] font-bold transition" title="تجاهل الكل">
                                <i className="fa-solid fa-check-double ml-1"></i> تجاهل الكل
                            </button>
                        )}
                        <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="px-4 py-3 border-b border-slate-100 flex gap-1.5 overflow-x-auto custom-scrollbar bg-slate-50/80">
                    {filters.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                                filter === f.id
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            <i className={`fa-solid ${f.icon}`}></i>
                            {f.label}
                            {filterCounts[f.id] > 0 && (
                                <span className={`${filter === f.id ? 'bg-white/20' : 'bg-slate-100'} px-1.5 py-0.5 rounded-full text-[8px] font-black`}>
                                    {filterCounts[f.id]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                    {filteredNotifs.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <i className="fa-solid fa-bell-slash text-4xl mb-4 block opacity-20"></i>
                            <p className="font-bold text-sm">لا توجد إشعارات</p>
                            <p className="text-xs mt-1">{filter !== 'all' ? 'جرب تغيير الفلتر' : 'كل شيء تمام 🎉'}</p>
                        </div>
                    ) : (
                        filteredNotifs.map(notif => (
                            <div
                                key={notif.id}
                                className={`p-3.5 rounded-2xl border ${notif.color} transition-all hover:shadow-md group cursor-pointer relative`}
                                onClick={() => { onNavigate(notif.tab); onClose(); }}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${notif.color.split(' ').slice(1).join(' ')} border`}>
                                        <i className={`fa-solid ${notif.icon} text-sm`}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-[13px] text-slate-800 leading-tight">{notif.title}</p>
                                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{notif.message}</p>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                                        className="opacity-0 group-hover:opacity-100 bg-white/80 hover:bg-white p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-all flex-shrink-0"
                                        title="تجاهل"
                                    >
                                        <i className="fa-solid fa-xmark text-xs"></i>
                                    </button>
                                </div>
                                {notif.priority === 'critical' && (
                                    <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/80 text-center">
                    <p className="text-[10px] text-slate-400 font-bold">
                        <i className="fa-solid fa-circle-info ml-1"></i>
                        الإشعارات تتحدث تلقائياً مع كل تغيير في البيانات
                    </p>
                </div>
            </div>

            <style>{`
                .animate-slide-right {
                    animation: slideRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes slideRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

// Export helper to get notification count (used in App header)
export function useNotificationCount() {
    const { sales, accounts, sections } = useData();
    return useMemo(() => {
        let count = 0;
        const today = new Date();

        // Expiring
        sales.forEach(sale => {
            if (sale.renewal_stage === 'renewed') return;
            if (!sale.expiryDate) return;
            const daysLeft = Math.ceil((new Date(sale.expiryDate) - today) / 86400000);
            if (daysLeft <= 5 && daysLeft >= -30) count++;
        });

        // Unpaid
        sales.forEach(sale => {
            if (sale.isPaid) return;
            if (Number(sale.remainingAmount || 0) > 0) count++;
        });

        // Low stock
        if (sections && accounts) {
            sections.forEach(sec => {
                const available = accounts.filter(a => a.productName === sec.name && a.status === 'available').length;
                if (available <= 3) count++;
            });
        }

        return count;
    }, [sales, accounts, sections]);
}
