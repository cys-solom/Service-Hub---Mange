import { useState, useEffect } from 'react';
import telegram from '../services/telegram';

const ALL_NOTIFICATION_TYPES = Object.entries(telegram.NOTIFICATION_TYPES).map(([key, val]) => ({
    key, ...val
}));

const colorMap = {
    indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200', activeBg: 'bg-indigo-600',  ring: 'ring-indigo-300' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', activeBg: 'bg-emerald-600', ring: 'ring-emerald-300' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200', activeBg: 'bg-amber-600',   ring: 'ring-amber-300' },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-200', activeBg: 'bg-blue-600',    ring: 'ring-blue-300' },
    purple:  { bg: 'bg-purple-50',  text: 'text-purple-600',  border: 'border-purple-200', activeBg: 'bg-purple-600',  ring: 'ring-purple-300' },
    cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-600',    border: 'border-cyan-200', activeBg: 'bg-cyan-600',    ring: 'ring-cyan-300' },
    red:     { bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200', activeBg: 'bg-red-600',     ring: 'ring-red-300' },
    green:   { bg: 'bg-green-50',   text: 'text-green-600',   border: 'border-green-200', activeBg: 'bg-green-600',   ring: 'ring-green-300' },
    orange:  { bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-200', activeBg: 'bg-orange-600',  ring: 'ring-orange-300' },
};

const groupStyles = {
    main:        { gradient: 'from-indigo-600 to-blue-600',    bgGradient: 'from-indigo-50 to-blue-50',    borderColor: 'border-indigo-200', textColor: 'text-indigo-700', badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-700' },
    operations:  { gradient: 'from-purple-600 to-fuchsia-600', bgGradient: 'from-purple-50 to-fuchsia-50', borderColor: 'border-purple-200', textColor: 'text-purple-700', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700' },
    activations: { gradient: 'from-emerald-600 to-teal-600',   bgGradient: 'from-emerald-50 to-teal-50',   borderColor: 'border-emerald-200', textColor: 'text-emerald-700', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700' },
    daily:       { gradient: 'from-amber-500 to-orange-600',   bgGradient: 'from-amber-50 to-orange-50',   borderColor: 'border-amber-200', textColor: 'text-amber-700', badgeBg: 'bg-amber-100', badgeText: 'text-amber-700' },
};

const GROUPS_ORDER = ['main', 'operations', 'activations', 'daily'];

export default function BotSettings() {
    useEffect(() => { window.scrollTo(0, 0); }, []);

    const [prefs, setPrefs] = useState(telegram.getPrefs());
    const [testStatus, setTestStatus] = useState({});
    const [dailyReportStatus, setDailyReportStatus] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({ main: true, operations: true, activations: true, daily: true });
    const groupsStatus = telegram.getGroupsStatus();

    const togglePref = (groupKey, typeKey) => {
        const updated = { ...prefs, [groupKey]: { ...prefs[groupKey], [typeKey]: !prefs[groupKey]?.[typeKey] } };
        setPrefs(updated);
        telegram.savePrefs(updated);
    };

    const enableAllForGroup = (groupKey) => {
        const groupPrefs = {};
        ALL_NOTIFICATION_TYPES.forEach(nt => { groupPrefs[nt.key] = true; });
        const updated = { ...prefs, [groupKey]: groupPrefs };
        setPrefs(updated);
        telegram.savePrefs(updated);
    };

    const disableAllForGroup = (groupKey) => {
        const groupPrefs = {};
        ALL_NOTIFICATION_TYPES.forEach(nt => { groupPrefs[nt.key] = false; });
        const updated = { ...prefs, [groupKey]: groupPrefs };
        setPrefs(updated);
        telegram.savePrefs(updated);
    };

    const toggleGroupExpand = (groupKey) => {
        setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
    };

    const testGroup = async (groupKey) => {
        setTestStatus(prev => ({ ...prev, [groupKey]: 'loading' }));
        const result = await telegram.testGroup(groupKey);
        setTestStatus(prev => ({ ...prev, [groupKey]: result.ok ? 'success' : 'error' }));
        setTimeout(() => setTestStatus(prev => ({ ...prev, [groupKey]: null })), 4000);
    };

    const sendDailyReport = async () => {
        setDailyReportStatus('loading');
        const result = await telegram.sendDailyReport();
        setDailyReportStatus(result.ok ? 'success' : 'error');
        setTimeout(() => setDailyReportStatus(null), 5000);
    };

    // Count total enabled
    const totalEnabled = Object.values(prefs).reduce((sum, gp) => sum + Object.values(gp).filter(Boolean).length, 0);
    const totalPossible = Object.keys(prefs).length * ALL_NOTIFICATION_TYPES.length;
    const configuredGroups = Object.values(groupsStatus).filter(g => g.configured).length;

    return (
        <div className="space-y-4 md:space-y-6 animate-fade-in pb-20 font-sans text-slate-800">

            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 md:p-8 text-white relative overflow-hidden shadow-xl">
                <div className="absolute -left-10 -bottom-10 text-[120px] opacity-5"><i className="fa-brands fa-telegram"></i></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-blue-500/20 p-3 rounded-xl backdrop-blur-sm border border-blue-400/20">
                            <i className="fa-brands fa-telegram text-2xl text-blue-400"></i>
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-extrabold">إعدادات بوت تليجرام</h2>
                            <p className="text-slate-400 text-xs md:text-sm font-medium">تحكم كامل في توزيع الإشعارات على الجروبات</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-5">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/10">
                            <p className="text-slate-400 text-[10px] md:text-xs font-bold mb-1">إشعارات نشطة</p>
                            <p className="text-xl md:text-2xl font-black">{totalEnabled} <span className="text-sm text-slate-400">/ {totalPossible}</span></p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/10">
                            <p className="text-slate-400 text-[10px] md:text-xs font-bold mb-1">جروبات متصلة</p>
                            <p className="text-xl md:text-2xl font-black">{configuredGroups} <span className="text-sm text-slate-400">/ {GROUPS_ORDER.length}</span></p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/10">
                            <p className="text-slate-400 text-[10px] md:text-xs font-bold mb-1">الحالة</p>
                            <p className="text-xl md:text-2xl font-black flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                متصل
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Report Section */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 md:p-5 rounded-2xl shadow-sm border border-amber-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <i className="fa-solid fa-chart-pie text-base"></i>
                        </div>
                        <div>
                            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                                التقرير اليومي
                                <span className="bg-emerald-100 text-emerald-700 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    تلقائي 11:55 PM
                                </span>
                            </h3>
                            <p className="text-[10px] md:text-xs text-slate-500">
                                ملخص شامل بالمبيعات والأرباح وأرصدة المحافظ
                                {telegram.getLastReportDate() && (
                                    <span className="text-amber-600 font-bold mr-2">
                                        • آخر تقرير: {telegram.getLastReportDate()}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <button onClick={sendDailyReport} disabled={dailyReportStatus === 'loading'}
                        className={`font-bold rounded-xl text-xs md:text-sm px-5 py-2.5 transition-all flex items-center gap-2 shadow-sm whitespace-nowrap ${
                            dailyReportStatus === 'success' ? 'bg-emerald-600 text-white' :
                            dailyReportStatus === 'error' ? 'bg-red-600 text-white' :
                            'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-amber-200'
                        }`}>
                        {dailyReportStatus === 'loading' ? (
                            <><i className="fa-solid fa-spinner fa-spin"></i> جاري الإرسال...</>
                        ) : dailyReportStatus === 'success' ? (
                            <><i className="fa-solid fa-check"></i> تم الإرسال ✅</>
                        ) : dailyReportStatus === 'error' ? (
                            <><i className="fa-solid fa-xmark"></i> فشل الإرسال</>
                        ) : (
                            <><i className="fa-solid fa-paper-plane"></i> إرسال التقرير الآن</>
                        )}
                    </button>
                </div>
            </div>

            {/* Group Sections - Each group has ALL notification types */}
            {GROUPS_ORDER.map(groupKey => {
                const group = groupsStatus[groupKey];
                if (!group) return null;
                const style = groupStyles[groupKey];
                const groupTestStatus = testStatus[groupKey];
                const gPrefs = prefs[groupKey] || {};
                const enabledCount = ALL_NOTIFICATION_TYPES.filter(nt => gPrefs[nt.key] === true).length;
                const isExpanded = expandedGroups[groupKey];

                return (
                    <div key={groupKey} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Group Header */}
                        <div className={`bg-gradient-to-r ${style.bgGradient} p-4 md:p-5 border-b ${style.borderColor}`}>
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleGroupExpand(groupKey)}>
                                    <div className={`bg-gradient-to-br ${style.gradient} w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white shadow-lg`}>
                                        <i className={`fa-solid ${group.icon} text-base md:text-lg`}></i>
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-sm md:text-base text-slate-800 flex items-center gap-2">
                                            {group.label}
                                            {group.configured ? (
                                                <span className="bg-emerald-100 text-emerald-700 text-[9px] px-2 py-0.5 rounded-full font-bold">متصل</span>
                                            ) : (
                                                <span className="bg-red-100 text-red-700 text-[9px] px-2 py-0.5 rounded-full font-bold">غير متصل</span>
                                            )}
                                        </h3>
                                        <p className="text-[10px] md:text-xs text-slate-500 mt-0.5">
                                            {enabledCount} إشعار نشط من {ALL_NOTIFICATION_TYPES.length}
                                        </p>
                                    </div>
                                    <i className={`fa-solid fa-chevron-down text-slate-400 text-xs transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button onClick={() => enableAllForGroup(groupKey)}
                                        className={`${style.badgeBg} ${style.badgeText} font-bold rounded-lg text-[10px] px-2.5 py-1.5 transition-all hover:opacity-80 flex items-center gap-1`}>
                                        <i className="fa-solid fa-toggle-on"></i> تفعيل الكل
                                    </button>
                                    <button onClick={() => disableAllForGroup(groupKey)}
                                        className="bg-slate-100 text-slate-600 font-bold rounded-lg text-[10px] px-2.5 py-1.5 transition-all hover:opacity-80 flex items-center gap-1">
                                        <i className="fa-solid fa-toggle-off"></i> إيقاف الكل
                                    </button>
                                    <button onClick={() => testGroup(groupKey)} disabled={groupTestStatus === 'loading' || !group.configured}
                                        className={`font-bold rounded-lg text-[10px] md:text-xs px-3 py-1.5 transition-all flex items-center gap-1.5 border ${
                                            !group.configured ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' :
                                            groupTestStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            groupTestStatus === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}>
                                        {groupTestStatus === 'loading' ? (
                                            <i className="fa-solid fa-spinner fa-spin"></i>
                                        ) : groupTestStatus === 'success' ? (
                                            <><i className="fa-solid fa-check"></i> تم</>
                                        ) : groupTestStatus === 'error' ? (
                                            <><i className="fa-solid fa-xmark"></i> فشل</>
                                        ) : (
                                            <><i className="fa-solid fa-paper-plane"></i> اختبار</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Notification Type Toggles */}
                        {isExpanded && (
                            <div className="p-3 md:p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {ALL_NOTIFICATION_TYPES.map(nt => {
                                    const c = colorMap[nt.color] || colorMap.indigo;
                                    const isOn = gPrefs[nt.key] === true;
                                    return (
                                        <div key={nt.key}
                                            onClick={() => togglePref(groupKey, nt.key)}
                                            className={`rounded-xl border-2 p-3 cursor-pointer transition-all hover:shadow-md ${isOn ? c.border : 'border-slate-100 opacity-50 hover:opacity-70'}`}>
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${isOn ? `${c.bg} ${c.text}` : 'bg-slate-100 text-slate-400'}`}>
                                                        <i className={`fa-solid ${nt.icon} text-xs`}></i>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-xs text-slate-800 truncate">{nt.label}</h4>
                                                        <p className="text-[9px] text-slate-400 truncate">{nt.desc}</p>
                                                    </div>
                                                </div>

                                                <div className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${isOn ? c.activeBg : 'bg-slate-200'}`}>
                                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all ${isOn ? 'left-[20px]' : 'left-0.5'}`}></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Groups Summary */}
            <div className="bg-slate-50 p-4 md:p-5 rounded-2xl border border-slate-200">
                <div className="flex items-start gap-3">
                    <div className="bg-slate-200 p-2 rounded-xl text-slate-600 flex-shrink-0">
                        <i className="fa-solid fa-server"></i>
                    </div>
                    <div className="text-xs md:text-sm text-slate-700 w-full">
                        <p className="font-bold mb-2">حالة الجروبات</p>
                        <div className="space-y-1.5">
                            {GROUPS_ORDER.map(key => {
                                const g = groupsStatus[key];
                                if (!g) return null;
                                const gp = prefs[key] || {};
                                const cnt = ALL_NOTIFICATION_TYPES.filter(nt => gp[nt.key] === true).length;
                                return (
                                    <div key={key} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
                                        <span className="text-xs font-medium flex items-center gap-2">
                                            <i className={`fa-solid ${g.icon} text-slate-400 text-[10px]`}></i>
                                            {g.label}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-slate-400 font-bold">{cnt} إشعار</span>
                                            {g.configured ? (
                                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    متصل
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-500">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                                    غير متصل
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 p-4 md:p-5 rounded-2xl border border-blue-200">
                <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-xl text-blue-600 flex-shrink-0">
                        <i className="fa-solid fa-circle-info"></i>
                    </div>
                    <div className="text-xs md:text-sm text-blue-800">
                        <p className="font-bold mb-1">ملاحظات مهمة</p>
                        <ul className="space-y-1 text-blue-700">
                            <li>• الإعدادات تتحفظ على <strong>هذا الجهاز فقط</strong></li>
                            <li>• نفس الإشعار <strong>ممكن يتبعت لأكتر من جروب</strong> في نفس الوقت</li>
                            <li>• لو جروب مش متصل ← الإشعارات المفعّلة فيه <strong>مش هتتبعت</strong></li>
                            <li>• <strong>التقرير اليومي التلقائي</strong> بيتبعت كل يوم الساعة 11:55 PM طالما الموقع مفتوح</li>
                            <li>• لو الموقع كان مقفول الساعة 12 ← التقرير هيتبعت <strong>أول ما تفتح الموقع</strong></li>
                            <li>• استخدم زر "اختبار" في كل جروب للتأكد إنه شغال</li>
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


