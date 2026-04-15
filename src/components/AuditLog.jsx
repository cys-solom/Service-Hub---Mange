import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import auditLog from '../services/auditLog';

const { ACTION_TYPES, CATEGORIES } = auditLog;

const colorMap = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
};

const roleLabel = (role) => {
    if (role === 'admin') return { text: 'مدير', cls: 'bg-purple-100 text-purple-700 border-purple-200' };
    if (role === 'director') return { text: 'مشرف', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
    return { text: 'مودريتور', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
};

const formatDateHeader = (dateStr) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
    if (dateStr === todayStr) return '📅 اليوم';
    if (dateStr === yesterdayStr) return '📅 أمس';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
};

const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
};

// Group logs by LOCAL date (not UTC)
const getLocalDateKey = (ts) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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

    const groupedLogs = useMemo(() => {
        return logs.reduce((g, log) => {
            const dk = getLocalDateKey(log.created_at);
            if (!g[dk]) g[dk] = [];
            g[dk].push(log);
            return g;
        }, {});
    }, [logs]);

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return (
        <div className="space-y-5 animate-fade-in pb-20">

            {/* === Header === */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-slate-800 via-indigo-600 to-purple-500"></div>
                <div className="flex items-center gap-3 pt-1">
                    <div className="bg-slate-800 text-white p-2.5 rounded-xl"><i className="fa-solid fa-clock-rotate-left text-lg"></i></div>
                    <div>
                        <h2 className="text-lg font-extrabold text-slate-800">سجل العمليات</h2>
                        <p className="text-[11px] text-slate-400 font-bold">توثيق تلقائي لكل الإجراءات • {totalCount.toLocaleString()} عملية إجمالاً</p>
                    </div>
                </div>
            </div>

            {/* === البحث + الفلترة === */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                <div className="relative">
                    <i className="fa-solid fa-search absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                    <input type="text" placeholder="ابحث... (عميل، منتج، عملية)" value={search} onChange={e => handleSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-11 pl-4 text-sm font-bold text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition" />
                    {search && <button onClick={() => handleSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500"><i className="fa-solid fa-xmark"></i></button>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {Object.entries(CATEGORIES).map(([key, cat]) => (
                        <button key={key} onClick={() => { setCategory(key); setPage(0); }}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${category === key ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'}`}>
                            <i className={`fa-solid ${cat.icon} text-[9px]`}></i> {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* === السجل (جدول) === */}
            {loading ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8">
                    <div className="space-y-3">
                        {[1,2,3,4,5,6].map(i => (
                            <div key={i} className="flex items-center gap-4 animate-pulse">
                                <div className="w-16 h-4 bg-slate-100 rounded"></div>
                                <div className="w-20 h-5 bg-slate-100 rounded-lg"></div>
                                <div className="flex-1 h-4 bg-slate-50 rounded"></div>
                                <div className="w-20 h-4 bg-slate-50 rounded"></div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : logs.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
                    <i className="fa-solid fa-inbox text-5xl text-slate-200 mb-4 block"></i>
                    <p className="font-bold text-lg text-slate-400">{search ? `لا توجد نتائج لـ "${search}"` : 'لا توجد عمليات بعد'}</p>
                    {search && <button onClick={() => handleSearch('')} className="mt-3 text-sm text-indigo-500 font-bold hover:text-indigo-700"><i className="fa-solid fa-arrow-rotate-right ml-1"></i> مسح البحث</button>}
                </div>
            ) : (
                <div className="space-y-5">
                    {Object.entries(groupedLogs).map(([dateKey, dayLogs]) => (
                        <div key={dateKey} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* عنوان اليوم */}
                            <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
                                <h3 className="text-sm font-extrabold text-slate-700">{formatDateHeader(dateKey)}</h3>
                                <span className="text-[10px] font-bold text-slate-400 bg-white px-2.5 py-1 rounded-lg border border-slate-200">{dayLogs.length} عملية</span>
                            </div>

                            {/* جدول العمليات */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-400">
                                            <th className="px-4 py-2.5 text-right font-bold text-[11px] w-[70px]">الوقت</th>
                                            <th className="px-3 py-2.5 text-right font-bold text-[11px] w-[120px]">العملية</th>
                                            <th className="px-3 py-2.5 text-right font-bold text-[11px]">الوصف</th>
                                            <th className="px-3 py-2.5 text-right font-bold text-[11px] w-[100px]">المستخدم</th>
                                            <th className="px-4 py-2.5 text-center font-bold text-[11px] w-[70px]">الدور</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {dayLogs.map(log => {
                                            const info = ACTION_TYPES[log.action] || { label: log.action, icon: 'fa-circle', color: 'slate' };
                                            const c = colorMap[info.color] || colorMap.slate;
                                            const role = roleLabel(log.user_role);
                                            return (
                                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="text-[11px] font-bold text-slate-500 font-mono whitespace-nowrap">
                                                            {formatTime(log.created_at)}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md ${c.bg} ${c.text} border ${c.border} whitespace-nowrap`}>
                                                            <i className={`fa-solid ${info.icon} text-[8px]`}></i>
                                                            {info.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <p className="text-[12px] font-bold text-slate-700 leading-relaxed">{log.description}</p>
                                                        {log.meta && Object.keys(log.meta).length > 0 && (
                                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                                {Object.entries(log.meta).slice(0, 3).map(([k, v]) => (
                                                                    <span key={k} className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                                        {k}: <span className="text-slate-600">{typeof v === 'object' ? JSON.stringify(v) : String(v).substring(0, 30)}</span>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                                            <i className="fa-solid fa-user text-[8px] text-slate-400"></i>
                                                            {log.user_name}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`text-[9px] font-bold px-2 py-1 rounded-md border ${role.cls} whitespace-nowrap`}>
                                                            {role.text}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                    {/* الترقيم */}
                    {totalPages > 1 && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between flex-wrap gap-3">
                            <p className="text-[11px] font-bold text-slate-400">{page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount)} من {totalCount}</p>
                            <div className="flex items-center gap-1.5">
                                <button onClick={() => setPage(0)} disabled={page === 0} className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-[11px] font-bold disabled:opacity-30 hover:bg-slate-100 transition flex items-center justify-center"><i className="fa-solid fa-angles-right text-[10px]"></i></button>
                                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-[11px] font-bold disabled:opacity-30 hover:bg-slate-100 transition">السابق</button>
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    let pn = totalPages <= 5 ? i : page < 3 ? i : page > totalPages - 4 ? totalPages - 5 + i : page - 2 + i;
                                    return <button key={pn} onClick={() => setPage(pn)} className={`w-8 h-8 rounded-lg text-[11px] font-bold transition ${page === pn ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'}`}>{pn + 1}</button>;
                                })}
                                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-[11px] font-bold disabled:opacity-30 hover:bg-slate-100 transition">التالي</button>
                                <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-[11px] font-bold disabled:opacity-30 hover:bg-slate-100 transition flex items-center justify-center"><i className="fa-solid fa-angles-left text-[10px]"></i></button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
