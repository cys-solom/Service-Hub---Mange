import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useData } from '../context/DataContext';

export default function GlobalSearch({ onNavigate, onClose }) {
    const { sales, customers, accounts, expenses, products, sections } = useData();
    const [query, setQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Keyboard shortcut: Escape to close
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const navigate = useCallback((tab, detail) => {
        onNavigate(tab);
        onClose();
    }, [onNavigate, onClose]);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q || q.length < 2) return [];

        const items = [];
        const MAX_PER = 8;

        // --- Sales ---
        if (activeCategory === 'all' || activeCategory === 'sales') {
            let count = 0;
            for (const s of sales) {
                if (count >= MAX_PER) break;
                const searchable = [s.customerName, s.customerEmail, s.productName, s.notes, s.orderNumber, String(s.finalPrice || s.sellingPrice)].join(' ').toLowerCase();
                if (searchable.includes(q)) {
                    items.push({
                        type: 'sale',
                        icon: 'fa-cart-shopping',
                        color: 'text-emerald-600 bg-emerald-50',
                        title: s.customerName || s.customerEmail || 'بدون اسم',
                        subtitle: `${s.productName || ''} — ${Number(s.finalPrice || s.sellingPrice || 0).toLocaleString()} ج.م`,
                        meta: s.date ? new Date(s.date).toLocaleDateString('en-GB') : '',
                        tab: 'sales',
                        badge: s.isPaid ? { text: 'مدفوع', cls: 'bg-emerald-100 text-emerald-700' } : { text: 'غير مدفوع', cls: 'bg-red-100 text-red-600' }
                    });
                    count++;
                }
            }
        }

        // --- Customers ---
        if (activeCategory === 'all' || activeCategory === 'clients') {
            let count = 0;
            for (const c of customers) {
                if (count >= MAX_PER) break;
                const searchable = [c.name, c.email, c.phone, c.notes].join(' ').toLowerCase();
                if (searchable.includes(q)) {
                    items.push({
                        type: 'client',
                        icon: 'fa-user',
                        color: 'text-blue-600 bg-blue-50',
                        title: c.name || c.email || '-',
                        subtitle: c.phone || c.email || '',
                        meta: `${(sales.filter(s => s.customerName === c.name || s.customerEmail === c.email)).length} طلب`,
                        tab: 'clients'
                    });
                    count++;
                }
            }
        }

        // --- Accounts / Inventory ---
        if (activeCategory === 'all' || activeCategory === 'accounts') {
            let count = 0;
            for (const a of accounts) {
                if (count >= MAX_PER) break;
                const searchable = [a.email, a.productName, a.notes, a.status].join(' ').toLowerCase();
                if (searchable.includes(q)) {
                    items.push({
                        type: 'account',
                        icon: 'fa-server',
                        color: 'text-violet-600 bg-violet-50',
                        title: a.email || '-',
                        subtitle: a.productName || '',
                        meta: '',
                        tab: 'accounts',
                        badge: a.status === 'available'
                            ? { text: 'متاح', cls: 'bg-emerald-100 text-emerald-700' }
                            : { text: 'مستخدم', cls: 'bg-slate-100 text-slate-600' }
                    });
                    count++;
                }
            }
        }

        // --- Expenses ---
        if (activeCategory === 'all' || activeCategory === 'expenses') {
            let count = 0;
            for (const e of expenses) {
                if (count >= MAX_PER) break;
                const searchable = [e.type, e.description, String(e.amount), e.expenseCategory].join(' ').toLowerCase();
                if (searchable.includes(q)) {
                    items.push({
                        type: 'expense',
                        icon: 'fa-wallet',
                        color: 'text-rose-600 bg-rose-50',
                        title: e.type || e.description || 'مصروف',
                        subtitle: `${Number(e.amount || 0).toLocaleString()} ج.م`,
                        meta: e.date ? new Date(e.date).toLocaleDateString('en-GB') : '',
                        tab: 'expenses'
                    });
                    count++;
                }
            }
        }

        // --- Products ---
        if (activeCategory === 'all' || activeCategory === 'products') {
            let count = 0;
            for (const p of products) {
                if (count >= MAX_PER) break;
                const searchable = [p.name, p.category, p.description].join(' ').toLowerCase();
                if (searchable.includes(q)) {
                    const totalSales = sales.filter(s => s.productName === p.name).length;
                    items.push({
                        type: 'product',
                        icon: 'fa-boxes-stacked',
                        color: 'text-amber-600 bg-amber-50',
                        title: p.name,
                        subtitle: p.category || 'بدون تصنيف',
                        meta: `${totalSales} عملية بيع`,
                        tab: 'products'
                    });
                    count++;
                }
            }
        }

        return items;
    }, [query, activeCategory, sales, customers, accounts, expenses, products]);

    const categories = [
        { id: 'all',      label: 'الكل',      icon: 'fa-layer-group' },
        { id: 'sales',    label: 'المبيعات',   icon: 'fa-cart-shopping' },
        { id: 'clients',  label: 'العملاء',    icon: 'fa-users' },
        { id: 'accounts', label: 'المخزون',    icon: 'fa-server' },
        { id: 'expenses', label: 'المصروفات',  icon: 'fa-wallet' },
        { id: 'products', label: 'المنتجات',   icon: 'fa-boxes-stacked' },
    ];

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-start justify-center pt-[10vh] p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]" onClick={e => e.stopPropagation()}>

                {/* Search Input */}
                <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                    <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
                        <i className="fa-solid fa-magnifying-glass text-lg"></i>
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="flex-1 text-lg font-bold text-slate-800 outline-none placeholder-slate-400 bg-transparent"
                        placeholder="بحث في المبيعات، العملاء، المخزون..."
                    />
                    <kbd className="hidden md:flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                        ESC
                    </kbd>
                    <button onClick={onClose} className="md:hidden bg-slate-100 p-2 rounded-xl text-slate-400 hover:text-slate-600 transition">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Category Filters */}
                <div className="px-5 py-3 border-b border-slate-100 flex gap-2 overflow-x-auto custom-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                                activeCategory === cat.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <i className={`fa-solid ${cat.icon} text-[10px]`}></i>
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {query.length < 2 ? (
                        <div className="p-12 text-center text-slate-400">
                            <i className="fa-solid fa-magnifying-glass text-4xl mb-4 block opacity-20"></i>
                            <p className="font-bold text-sm">اكتب كلمتين على الأقل للبحث</p>
                            <p className="text-xs mt-1 text-slate-300">يمكنك البحث بالاسم، الإيميل، رقم الأوردر، المنتج...</p>
                            <div className="mt-6 flex flex-wrap justify-center gap-2">
                                <kbd className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">Ctrl+K للبحث السريع</kbd>
                            </div>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <i className="fa-solid fa-face-meh text-4xl mb-4 block opacity-20"></i>
                            <p className="font-bold text-sm">لا توجد نتائج لـ "{query}"</p>
                            <p className="text-xs mt-1">جرب كلمات مختلفة أو غيّر التصنيف</p>
                        </div>
                    ) : (
                        <div className="p-2">
                            <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {results.length} نتيجة
                            </p>
                            {results.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => navigate(item.tab)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all group text-right"
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color} border border-current/10 group-hover:scale-110 transition-transform`}>
                                        <i className={`fa-solid ${item.icon} text-sm`}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-slate-800 truncate group-hover:text-indigo-700 transition-colors">{item.title}</p>
                                        <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                                    </div>
                                    {item.badge && (
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0 ${item.badge.cls}`}>
                                            {item.badge.text}
                                        </span>
                                    )}
                                    {item.meta && (
                                        <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">{item.meta}</span>
                                    )}
                                    <i className="fa-solid fa-arrow-left text-slate-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">↵</kbd> للفتح</span>
                        <span className="flex items-center gap-1"><kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">ESC</kbd> للإغلاق</span>
                    </div>
                    <span className="font-bold text-indigo-400">Service Hub Search</span>
                </div>
            </div>
        </div>
    );
}
