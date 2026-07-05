import { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { buildWaLink, getTemplates, fillTemplate, saleVars } from '../utils/contact';

// شاشة "شغل النهاردة" — بتجمّع كل المهام اللي محتاجة أكشن في قائمة واحدة مرتبة بالأولوية
export default function DailyWorklist() {
    useEffect(() => { window.scrollTo(0, 0); }, []);

    const { sales, customers, sections, accounts, setActiveTab, setRenewalTarget } = useData();
    const [done, setDone] = useState(() => {
        // المهام المخلّصة النهاردة (تتصفّر كل يوم)
        try {
            const raw = JSON.parse(localStorage.getItem('sh_worklist_done') || '{}');
            const todayStr = new Date().toISOString().split('T')[0];
            return raw.date === todayStr ? (raw.ids || []) : [];
        } catch { return []; }
    });
    const [filter, setFilter] = useState('all');

    const markDone = (id) => {
        setDone(prev => {
            const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
            localStorage.setItem('sh_worklist_done', JSON.stringify({ date: new Date().toISOString().split('T')[0], ids: next }));
            return next;
        });
    };

    const openWhatsApp = (target, templateId) => {
        const tpl = getTemplates().find(t => t.id === templateId);
        const vars = target._sale ? saleVars(target._sale) : {};
        if (target._customerName) vars.name = target._customerName;
        const msg = tpl ? fillTemplate(tpl.text, vars) : '';
        window.open(buildWaLink(target._phone, msg), '_blank');
    };

    const tasks = useMemo(() => {
        const list = [];
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const daysLeftOf = (d) => Math.ceil((new Date(d) - today) / 86400000);

        // 1) تجديدات: منتهية أو قرب تنتهي (خلال 7 أيام)
        sales.forEach(sale => {
            if (sale.renewal_stage === 'renewed' || !sale.expiryDate) return;
            const dl = daysLeftOf(sale.expiryDate);
            if (dl > 7) return;
            list.push({
                id: `renew-${sale.id}`,
                group: 'renewals',
                priority: dl <= 0 ? 0 : dl <= 2 ? 1 : 2,
                icon: dl <= 0 ? 'fa-calendar-xmark' : 'fa-clock',
                accent: dl <= 0 ? 'red' : dl <= 2 ? 'orange' : 'amber',
                title: sale.customerName || sale.customerEmail || 'عميل',
                subtitle: `${sale.productName} — ${dl <= 0 ? `منتهي من ${Math.abs(dl)} يوم` : `باقي ${dl} يوم`}`,
                _phone: sale.customerPhone,
                _sale: sale,
                waTemplate: dl <= 0 ? 'expired' : 'renewal',
                action: { label: 'تجديد', icon: 'fa-bolt', run: () => { setRenewalTarget({ openRenewSaleId: sale.id }); setActiveTab('renewals'); } },
            });
        });

        // 2) متابعات مستحقة
        customers.forEach(c => {
            if (!c.nextFollowUpDate || c.nextFollowUpDate > todayStr) return;
            const overdue = c.nextFollowUpDate < todayStr;
            list.push({
                id: `followup-${c.id}-${c.nextFollowUpDate}`,
                group: 'followups',
                priority: overdue ? 1 : 2,
                icon: 'fa-phone-volume',
                accent: overdue ? 'rose' : 'teal',
                title: c.name || c.email || 'عميل',
                subtitle: overdue ? `متأخرة من ${new Date(c.nextFollowUpDate).toLocaleDateString('en-GB')}` : 'متابعة النهاردة',
                _phone: c.phone,
                _customerName: c.name || c.email,
                waTemplate: 'followup',
                action: { label: 'العميل', icon: 'fa-user', run: () => setActiveTab('clients') },
            });
        });

        // 3) مديونيات للتحصيل
        sales.forEach(sale => {
            if (sale.isPaid) return;
            const remaining = Number(sale.remainingAmount || 0);
            if (remaining <= 0) return;
            list.push({
                id: `debt-${sale.id}`,
                group: 'debts',
                priority: remaining > 500 ? 1 : 2,
                icon: 'fa-hand-holding-dollar',
                accent: 'purple',
                title: sale.customerName || sale.customerEmail || 'عميل',
                subtitle: `${sale.productName} — متبقي ${remaining.toLocaleString()} ج.م`,
                _phone: sale.customerPhone,
                _sale: sale,
                waTemplate: 'debt',
                action: { label: 'المبيعات', icon: 'fa-cart-shopping', run: () => setActiveTab('sales') },
            });
        });

        // 4) مخزون منخفض
        if (sections && accounts) {
            sections.forEach(sec => {
                const available = accounts.filter(a => a.productName === sec.name && a.status === 'available').length;
                if (available > 3) return;
                list.push({
                    id: `stock-${sec.id}`,
                    group: 'stock',
                    priority: available === 0 ? 0 : 1,
                    icon: available === 0 ? 'fa-box-open' : 'fa-boxes-stacked',
                    accent: available === 0 ? 'red' : 'amber',
                    title: sec.name,
                    subtitle: available === 0 ? 'مخزون فارغ! ضيف حسابات فوراً' : `متبقي ${available} فقط`,
                    action: { label: 'المخزون', icon: 'fa-server', run: () => setActiveTab('accounts') },
                });
            });
        }

        return list.sort((a, b) => a.priority - b.priority);
    }, [sales, customers, sections, accounts, setActiveTab, setRenewalTarget]);

    const groups = [
        { id: 'all',       label: 'الكل',        icon: 'fa-list-check' },
        { id: 'renewals',  label: 'تجديدات',     icon: 'fa-clock' },
        { id: 'followups', label: 'متابعات',     icon: 'fa-phone-volume' },
        { id: 'debts',     label: 'مديونيات',    icon: 'fa-hand-holding-dollar' },
        { id: 'stock',     label: 'مخزون',       icon: 'fa-boxes-stacked' },
    ];

    const counts = useMemo(() => {
        const pending = tasks.filter(t => !done.includes(t.id));
        return {
            all: pending.length,
            renewals: pending.filter(t => t.group === 'renewals').length,
            followups: pending.filter(t => t.group === 'followups').length,
            debts: pending.filter(t => t.group === 'debts').length,
            stock: pending.filter(t => t.group === 'stock').length,
        };
    }, [tasks, done]);

    const visible = useMemo(() => {
        const base = filter === 'all' ? tasks : tasks.filter(t => t.group === filter);
        // المخلّص يروح تحت
        return [...base].sort((a, b) => (done.includes(a.id) ? 1 : 0) - (done.includes(b.id) ? 1 : 0));
    }, [tasks, filter, done]);

    const total = tasks.length;
    const completed = tasks.filter(t => done.includes(t.id)).length;
    const progress = total === 0 ? 100 : Math.round((completed / total) * 100);

    const accentMap = {
        red:    'border-r-red-500 bg-red-50/40',
        orange: 'border-r-orange-500 bg-orange-50/40',
        amber:  'border-r-amber-500 bg-amber-50/40',
        rose:   'border-r-rose-500 bg-rose-50/40',
        teal:   'border-r-teal-500 bg-teal-50/40',
        purple: 'border-r-purple-500 bg-purple-50/40',
    };
    const iconMap = {
        red: 'bg-red-100 text-red-600', orange: 'bg-orange-100 text-orange-600', amber: 'bg-amber-100 text-amber-600',
        rose: 'bg-rose-100 text-rose-600', teal: 'bg-teal-100 text-teal-600', purple: 'bg-purple-100 text-purple-600',
    };

    return (
        <div className="space-y-4 md:space-y-6 animate-fade-in pb-24 font-sans text-slate-800">

            {/* Header + Progress */}
            <div className="bg-gradient-to-l from-indigo-700 to-violet-600 rounded-2xl p-5 md:p-6 text-white relative overflow-hidden shadow-xl">
                <div className="absolute -left-8 -bottom-8 text-[130px] opacity-10"><i className="fa-solid fa-list-check"></i></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm"><i className="fa-solid fa-clipboard-check text-2xl"></i></div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-extrabold">شغل النهاردة</h2>
                            <p className="text-indigo-100 text-xs md:text-sm">
                                {total === 0 ? 'مفيش مهام مستحقة 🎉' : `${counts.all} مهمة محتاجة أكشن`}
                            </p>
                        </div>
                    </div>
                    {total > 0 && (
                        <div>
                            <div className="flex justify-between text-[11px] font-bold text-indigo-100 mb-1.5">
                                <span>خلّصت {completed} من {total}</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm flex gap-1 overflow-x-auto custom-scrollbar">
                {groups.map(g => (
                    <button key={g.id} onClick={() => setFilter(g.id)}
                        className={`flex-1 min-w-[70px] py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${filter === g.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <i className={`fa-solid ${g.icon} text-[11px]`}></i>
                        <span className="hidden sm:inline">{g.label}</span>
                        {counts[g.id] > 0 && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${filter === g.id ? 'bg-white/20' : 'bg-slate-200 text-slate-600'}`}>{counts[g.id]}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tasks */}
            <div className="space-y-2.5">
                {visible.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 md:py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400">
                        <i className="fa-solid fa-mug-hot text-4xl md:text-5xl mb-4 opacity-30 text-emerald-300"></i>
                        <p className="font-bold text-base md:text-lg">خلّصت كل حاجة 👌</p>
                        <p className="text-xs md:text-sm">استرّيح، مفيش مهام مستحقة دلوقتي</p>
                    </div>
                )}

                {visible.map(task => {
                    const isDone = done.includes(task.id);
                    return (
                        <div key={task.id}
                            className={`bg-white p-3.5 md:p-4 rounded-2xl border border-slate-100 border-r-4 shadow-sm transition-all ${isDone ? 'opacity-50 border-r-slate-300' : `${accentMap[task.accent]} hover:shadow-md`}`}>
                            <div className="flex items-center gap-3">
                                <button onClick={() => markDone(task.id)}
                                    className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center border-2 transition ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-transparent hover:border-emerald-400'}`}
                                    title={isDone ? 'رجّع كمهمة' : 'علّم كمخلّص'}>
                                    <i className="fa-solid fa-check text-sm"></i>
                                </button>
                                <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${iconMap[task.accent]}`}>
                                    <i className={`fa-solid ${task.icon} text-sm`}></i>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`font-black text-sm text-slate-800 truncate ${isDone ? 'line-through' : ''}`}>{task.title}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{task.subtitle}</p>
                                </div>
                                {!isDone && (
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {task.waTemplate && (
                                            <button onClick={() => openWhatsApp(task, task.waTemplate)}
                                                className="bg-green-600 hover:bg-green-700 text-white w-9 h-9 rounded-xl flex items-center justify-center transition" title="واتساب">
                                                <i className="fa-brands fa-whatsapp"></i>
                                            </button>
                                        )}
                                        {task.action && (
                                            <button onClick={task.action.run}
                                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 h-9 px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold transition">
                                                <i className={`fa-solid ${task.action.icon}`}></i>
                                                <span className="hidden sm:inline">{task.action.label}</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>{`
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
