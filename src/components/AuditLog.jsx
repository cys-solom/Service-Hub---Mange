import { useState, useEffect, useRef, useCallback } from 'react';
import auditLog from '../services/auditLog';

const { ACTION_TYPES, CATEGORIES } = auditLog;

const colorClasses = {
    indigo:  { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', dot: 'bg-indigo-500' },
    blue:    { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    green:   { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', dot: 'bg-green-500' },
    red:     { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500' },
    purple:  { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', dot: 'bg-purple-500' },
    violet:  { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', dot: 'bg-violet-500' },
    amber:   { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', dot: 'bg-amber-500' },
    orange:  { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', dot: 'bg-orange-500' },
    cyan:    { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', dot: 'bg-cyan-500' },
    teal:    { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', dot: 'bg-teal-500' },
    slate:   { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-500' },
};

const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `منذ ${days} يوم`;
    return new Date(dateStr).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
};

export default function AuditLogPage() {
    useEffect(() => { window.scrollTo(0, 0); }, []);

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 50;
    const searchTimeout = useRef(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        const [data, count] = await Promise.all([
            auditLog.getLogs({ category, limit: PAGE_SIZE, offset: page * PAGE_SIZE, search }),
            auditLog.getCount({ category }),
        ]);
        setLogs(data);
        setTotalCount(count);
        setLoading(false);
    }, [category, page, search]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const handleSearch = (val) => {
        setSearch(val);
        setPage(0);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => fetchLogs(), 400);
    };

    // Group logs by date
    const groupedLogs = logs.reduce((groups, log) => {
        const dateKey = new Date(log.created_at).toISOString().split('T')[0];
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(log);
        return groups;
    }, {});

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return (
        <div className="space-y-5 animate-fade-in pb-20 font-sans text-slate-800">

            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 md:p-8 text-white relative overflow-hidden shadow-xl">
                <div className="absolute -left-10 -bottom-10 text-[120px] opacity-5"><i className="fa-solid fa-clock-rotate-left"></i></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="bg-indigo-500/20 p-3 rounded-xl backdrop-blur-sm border border-indigo-400/20">
                            <i className="fa-solid fa-clock-rotate-left text-2xl text-indigo-400"></i>
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-extrabold">سجل العمليات</h2>
                            <p className="text-slate-400 text-xs md:text-sm font-medium">تتبع كل العمليات اللي بتتم على النظام</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/10">
                            <p className="text-slate-400 text-[10px] font-bold mb-1">إجمالي العمليات</p>
                            <p className="text-xl font-black">{totalCount.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/10">
                            <p className="text-slate-400 text-[10px] font-bold mb-1">التصنيف</p>
                            <p className="text-xl font-black">{CATEGORIES[category]?.label || 'الكل'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                {/* Search */}
                <div className="relative mb-4">
                    <i className="fa-solid fa-search absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                    <input
                        type="text"
                        placeholder="ابحث في سجل العمليات..."
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-11 pl-4 text-sm font-bold text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                    />
                </div>

                {/* Category Tabs */}
                <div className="flex flex-wrap gap-2">
                    {Object.entries(CATEGORIES).map(([key, cat]) => (
                        <button
                            key={key}
                            onClick={() => { setCategory(key); setPage(0); }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                category === key
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-100'
                            }`}
                        >
                            <i className={`fa-solid ${cat.icon} text-[10px]`}></i>
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Logs Timeline */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-slate-100 rounded w-3/4"></div>
                                    <div className="h-2 bg-slate-50 rounded w-1/2"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : logs.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
                    <i className="fa-solid fa-inbox text-5xl text-slate-200 mb-4 block"></i>
                    <p className="font-bold text-lg text-slate-400">لا توجد عمليات بعد</p>
                    <p className="text-sm text-slate-300 mt-1">العمليات هتظهر هنا أول ما يبدأ فيه نشاط</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedLogs).map(([dateKey, dayLogs]) => (
                        <div key={dateKey}>
                            {/* Date Header */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-100">
                                    <i className="fa-solid fa-calendar-day ml-1.5"></i>
                                    {formatDate(dateKey)}
                                </div>
                                <div className="flex-1 h-px bg-slate-100"></div>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">{dayLogs.length} عملية</span>
                            </div>

                            {/* Day's Logs */}
                            <div className="space-y-2 relative">
                                {/* Timeline line */}
                                <div className="absolute right-[26px] top-0 bottom-0 w-0.5 bg-slate-100 hidden md:block"></div>

                                {dayLogs.map(log => {
                                    const actionInfo = ACTION_TYPES[log.action] || { label: log.action, icon: 'fa-circle', color: 'slate' };
                                    const c = colorClasses[actionInfo.color] || colorClasses.slate;
                                    return (
                                        <div key={log.id} className="bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all p-3 md:p-4 md:mr-10 relative group">
                                            {/* Timeline dot */}
                                            <div className={`absolute -right-[34px] top-4 w-3 h-3 rounded-full ${c.dot} ring-4 ring-white hidden md:block`}></div>

                                            <div className="flex items-start gap-3">
                                                {/* Icon */}
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${c.bg} ${c.text}`}>
                                                    <i className={`fa-solid ${actionInfo.icon} text-sm`}></i>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${c.bg} ${c.text} border ${c.border}`}>
                                                            {actionInfo.label}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                            <i className="fa-solid fa-user text-[8px]"></i>
                                                            {log.user_name}
                                                        </span>
                                                        {log.user_role && (
                                                            <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                                                {log.user_role}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="text-sm font-bold text-slate-700 leading-relaxed">{log.description}</p>

                                                    {/* Meta details */}
                                                    {log.meta && Object.keys(log.meta).length > 0 && (
                                                        <div className="mt-2 bg-slate-50 rounded-lg p-2 text-[10px] text-slate-500 font-mono space-y-0.5 max-h-20 overflow-y-auto">
                                                            {Object.entries(log.meta).map(([k, v]) => (
                                                                <div key={k} className="flex gap-2">
                                                                    <span className="text-slate-400 font-bold min-w-[60px]">{k}:</span>
                                                                    <span className="text-slate-600 break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Time */}
                                                <div className="text-left flex-shrink-0 flex flex-col items-end gap-1">
                                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">{formatTime(log.created_at)}</span>
                                                    <span className="text-[9px] text-slate-300 font-bold">{timeAgo(log.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all"
                            >
                                <i className="fa-solid fa-chevron-right ml-1"></i> السابق
                            </button>
                            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-4 py-2 rounded-xl">
                                {page + 1} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all"
                            >
                                التالي <i className="fa-solid fa-chevron-left mr-1"></i>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Info */}
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
                <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-xl text-blue-600 flex-shrink-0">
                        <i className="fa-solid fa-circle-info"></i>
                    </div>
                    <div className="text-xs text-blue-700">
                        <p className="font-bold mb-1">عن سجل العمليات</p>
                        <ul className="space-y-1">
                            <li>• كل عملية بتتسجل تلقائياً مع <strong>اسم المستخدم</strong> والوقت</li>
                            <li>• يمكنك <strong>تصفية</strong> العمليات حسب التصنيف أو البحث بالنص</li>
                            <li>• السجل بيتحفظ في قاعدة البيانات إن وُجد الجدول أو في المتصفح كبديل</li>
                        </ul>
                    </div>
                </div>
            </div>

            <style>{`
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
