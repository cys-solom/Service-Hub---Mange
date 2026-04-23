import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const toDateStr = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };

export default function BIDashboard() {
    const { sales, expenses, customers, accounts, sections } = useData();
    const { user } = useAuth();

    // ===== Revenue Forecast (linear regression on last 6 months) =====
    const forecast = useMemo(() => {
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            const rev = sales.filter(s => (s.date||'').startsWith(key)).reduce((s,v) => s + Number(v.finalPrice||v.sellingPrice||0), 0);
            const exp = expenses.filter(e => (e.date||'').startsWith(key)).reduce((s,v) => s + Number(v.amount||0), 0);
            months.push({ key, rev, exp, profit: rev - exp, label: d.toLocaleDateString('ar-EG',{month:'short'}) });
        }
        // Simple linear regression for forecast
        const n = months.length;
        const xAvg = (n-1)/2;
        const yAvg = months.reduce((s,m) => s+m.rev, 0)/n;
        let num=0, den=0;
        months.forEach((m,i) => { num += (i-xAvg)*(m.rev-yAvg); den += (i-xAvg)**2; });
        const slope = den ? num/den : 0;
        const intercept = yAvg - slope*xAvg;
        const predicted = Math.round(slope*n + intercept);
        const trend = slope > 0 ? 'up' : slope < 0 ? 'down' : 'flat';
        const maxRev = Math.max(...months.map(m=>m.rev), predicted, 1);
        return { months, predicted: Math.max(predicted,0), trend, slope, maxRev };
    }, [sales, expenses]);

    // ===== Sales Target & Progress =====
    const targets = useMemo(() => {
        const now = new Date();
        const todayStr = toDateStr(now);
        const monthKey = todayStr.slice(0,7);
        const dayOfMonth = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
        const monthSales = sales.filter(s => (s.date||'').startsWith(monthKey));
        const monthRev = monthSales.reduce((s,v) => s+Number(v.finalPrice||v.sellingPrice||0), 0);
        const monthCount = monthSales.length;
        // Use last month as target baseline
        const prev = new Date(now.getFullYear(), now.getMonth()-1, 1);
        const prevKey = `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}`;
        const prevRev = sales.filter(s => (s.date||'').startsWith(prevKey)).reduce((s,v) => s+Number(v.finalPrice||v.sellingPrice||0), 0);
        const target = Math.max(prevRev, 1);
        const pct = Math.min(Math.round((monthRev/target)*100), 200);
        const dailyNeeded = daysInMonth-dayOfMonth > 0 ? Math.round((target-monthRev)/(daysInMonth-dayOfMonth)) : 0;
        return { monthRev, monthCount, target, pct, dayOfMonth, daysInMonth, dailyNeeded, prevRev };
    }, [sales]);

    // ===== Heatmap (day of week × time of day) =====
    const heatmap = useMemo(() => {
        const grid = Array.from({length:7}, () => Array(6).fill(0)); // 7 days × 6 slots (4hr each)
        const dayNames = ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
        const slotLabels = ['12ص-4ص','4ص-8ص','8ص-12م','12م-4م','4م-8م','8م-12ص'];
        sales.forEach(s => {
            const d = new Date(s.date);
            if (isNaN(d)) return;
            const day = d.getDay();
            const slot = Math.min(Math.floor(d.getHours()/4), 5);
            grid[day][slot]++;
        });
        let max = 1;
        grid.forEach(row => row.forEach(v => { if(v>max) max=v; }));
        return { grid, dayNames, slotLabels, max };
    }, [sales]);

    // ===== Customer Analytics =====
    const customerBI = useMemo(() => {
        const now = new Date();
        const custMap = {};
        sales.forEach(s => {
            const key = s.customerId || s.customerName || s.customerEmail;
            if (!key) return;
            if (!custMap[key]) custMap[key] = { name: s.customerName||s.customerEmail||key, total: 0, count: 0, firstDate: s.date, lastDate: s.date, renewed: false };
            custMap[key].total += Number(s.finalPrice||s.sellingPrice||0);
            custMap[key].count++;
            if (s.date < custMap[key].firstDate) custMap[key].firstDate = s.date;
            if (s.date > custMap[key].lastDate) custMap[key].lastDate = s.date;
            if (s.renewalSourceId) custMap[key].renewed = true;
        });
        const list = Object.values(custMap);
        const avgLTV = list.length ? Math.round(list.reduce((s,c) => s+c.total, 0)/list.length) : 0;
        const topLTV = [...list].sort((a,b) => b.total-a.total).slice(0,5);
        // Churn: customers whose last order > 30 days ago
        const churned = list.filter(c => (now - new Date(c.lastDate)) / 86400000 > 30).length;
        const active = list.length - churned;
        const churnRate = list.length ? Math.round((churned/list.length)*100) : 0;
        // Renewal rate
        const withExpiry = sales.filter(s => s.expiryDate);
        const renewedCount = sales.filter(s => s.renewalSourceId).length;
        const renewalRate = withExpiry.length ? Math.round((renewedCount/withExpiry.length)*100) : 0;
        return { total: list.length, avgLTV, topLTV, churned, active, churnRate, renewalRate };
    }, [sales]);

    // ===== Anomaly Detection =====
    const anomalies = useMemo(() => {
        const alerts = [];
        const now = new Date();
        // Compare this week vs last week
        const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - now.getDay());
        const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(lastWeekStart.getDate()-7);
        const thisWeek = sales.filter(s => new Date(s.date) >= thisWeekStart);
        const lastWeek = sales.filter(s => { const d = new Date(s.date); return d >= lastWeekStart && d < thisWeekStart; });
        const twRev = thisWeek.reduce((s,v) => s+Number(v.finalPrice||0), 0);
        const lwRev = lastWeek.reduce((s,v) => s+Number(v.finalPrice||0), 0);
        if (lwRev > 0) {
            const pct = Math.round(((twRev-lwRev)/lwRev)*100);
            if (pct < -20) alerts.push({ type: 'danger', icon: 'fa-arrow-trend-down', msg: `⚠️ المبيعات انخفضت ${Math.abs(pct)}% عن الأسبوع الماضي` });
            else if (pct > 30) alerts.push({ type: 'success', icon: 'fa-arrow-trend-up', msg: `🚀 المبيعات ارتفعت ${pct}% عن الأسبوع الماضي!` });
        }
        // Low stock
        if (sections && accounts) {
            sections.forEach(sec => {
                const avail = accounts.filter(a => a.productName === sec.name && a.status === 'available').length;
                if (avail === 0) alerts.push({ type: 'danger', icon: 'fa-box-open', msg: `🚨 ${sec.name} — مخزون فارغ تماماً!` });
            });
        }
        // Unpaid ratio
        const unpaidPct = sales.length ? Math.round((sales.filter(s=>!s.isPaid).length/sales.length)*100) : 0;
        if (unpaidPct > 40) alerts.push({ type: 'warning', icon: 'fa-money-bill-wave', msg: `💸 نسبة المديونيات مرتفعة: ${unpaidPct}% من المبيعات غير مدفوعة` });
        if (alerts.length === 0) alerts.push({ type: 'success', icon: 'fa-circle-check', msg: '✅ كل شيء طبيعي — لا توجد انحرافات' });
        return alerts;
    }, [sales, accounts, sections]);

    // ===== Peak Hours =====
    const peakHours = useMemo(() => {
        const hours = Array(24).fill(0);
        sales.forEach(s => { const h = new Date(s.date).getHours(); if(!isNaN(h)) hours[h]++; });
        const max = Math.max(...hours, 1);
        const peakH = hours.indexOf(max);
        return { hours, max, peakH };
    }, [sales]);

    const PctBadge = ({v}) => <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg ${v>0?'bg-emerald-100 text-emerald-700':v<0?'bg-red-100 text-red-600':'bg-slate-100 text-slate-500'}`}>{v>0?`↑${v}%`:v<0?`↓${Math.abs(v)}%`:'—'}</span>;
    const heatColor = (v, max) => { const r = max?v/max:0; if(r===0) return 'bg-slate-50'; if(r<0.25) return 'bg-indigo-100'; if(r<0.5) return 'bg-indigo-200'; if(r<0.75) return 'bg-indigo-400 text-white'; return 'bg-indigo-600 text-white'; };

    return (
        <div className="space-y-6">
            {/* Anomaly Alerts */}
            <div className="space-y-2">
                {anomalies.map((a,i) => (
                    <div key={i} className={`p-4 rounded-2xl border flex items-center gap-3 ${a.type==='danger'?'bg-red-50 border-red-200 text-red-800':a.type==='warning'?'bg-amber-50 border-amber-200 text-amber-800':'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                        <i className={`fa-solid ${a.icon} text-lg`}></i>
                        <p className="font-bold text-sm">{a.msg}</p>
                    </div>
                ))}
            </div>

            {/* Revenue Forecast + Target */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Forecast */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2"><i className="fa-solid fa-wand-magic-sparkles text-violet-500"></i> توقع الإيرادات</h3>
                        <div className={`flex items-center gap-1 text-xs font-bold ${forecast.trend==='up'?'text-emerald-600':'text-red-600'}`}>
                            <i className={`fa-solid ${forecast.trend==='up'?'fa-arrow-trend-up':'fa-arrow-trend-down'}`}></i>
                            {forecast.trend==='up'?'اتجاه صاعد':'اتجاه هابط'}
                        </div>
                    </div>
                    {/* Mini Bar Chart */}
                    <div className="flex items-end gap-1.5 h-32 mb-3">
                        {forecast.months.map((m,i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full bg-indigo-500 rounded-t-lg transition-all hover:bg-indigo-600" style={{height:`${Math.max((m.rev/forecast.maxRev)*100, 4)}%`}} title={`${m.rev.toLocaleString()} ج.م`}></div>
                                <span className="text-[9px] font-bold text-slate-400">{m.label}</span>
                            </div>
                        ))}
                        {/* Predicted */}
                        <div className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full bg-gradient-to-t from-violet-500 to-purple-400 rounded-t-lg border-2 border-dashed border-violet-300" style={{height:`${Math.max((forecast.predicted/forecast.maxRev)*100, 4)}%`}} title={`متوقع: ${forecast.predicted.toLocaleString()}`}></div>
                            <span className="text-[9px] font-bold text-violet-500">متوقع</span>
                        </div>
                    </div>
                    <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-center">
                        <p className="text-[10px] font-bold text-violet-500 mb-1">الإيراد المتوقع الشهر القادم</p>
                        <p className="text-2xl font-black text-violet-700">{forecast.predicted.toLocaleString()} <span className="text-sm">ج.م</span></p>
                    </div>
                </div>

                {/* Target Progress */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-4"><i className="fa-solid fa-bullseye text-rose-500"></i> هدف الشهر</h3>
                    <div className="relative mb-4">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1"><span>0</span><span>هدف: {targets.target.toLocaleString()}</span></div>
                        <div className="w-full bg-slate-100 rounded-full h-6 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-1000 flex items-center justify-center text-[10px] font-black text-white ${targets.pct>=100?'bg-gradient-to-r from-emerald-500 to-green-400':targets.pct>=70?'bg-gradient-to-r from-blue-500 to-indigo-500':'bg-gradient-to-r from-amber-500 to-orange-500'}`} style={{width:`${Math.min(targets.pct,100)}%`}}>
                                {targets.pct}%
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center"><p className="text-[9px] font-bold text-emerald-500">المحقق</p><p className="text-lg font-black text-emerald-700">{targets.monthRev.toLocaleString()}</p></div>
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center"><p className="text-[9px] font-bold text-blue-500">عدد البيعات</p><p className="text-lg font-black text-blue-700">{targets.monthCount}</p></div>
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center"><p className="text-[9px] font-bold text-amber-500">مطلوب يومياً</p><p className="text-lg font-black text-amber-700">{Math.max(targets.dailyNeeded,0).toLocaleString()}</p></div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold mt-3 text-center">اليوم {targets.dayOfMonth} من {targets.daysInMonth} — باقي {targets.daysInMonth-targets.dayOfMonth} يوم</p>
                </div>
            </div>

            {/* Heatmap + Peak Hours */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Heatmap */}
                <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-4"><i className="fa-solid fa-fire text-orange-500"></i> خريطة حرارية — أوقات البيع</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-center text-[10px]">
                            <thead><tr><th className="p-1"></th>{heatmap.slotLabels.map((l,i) => <th key={i} className="p-1 font-bold text-slate-400">{l}</th>)}</tr></thead>
                            <tbody>
                                {heatmap.grid.map((row,di) => (
                                    <tr key={di}>
                                        <td className="p-1 font-bold text-slate-500 text-right pr-2">{heatmap.dayNames[di]}</td>
                                        {row.map((v,si) => (
                                            <td key={si} className="p-0.5">
                                                <div className={`rounded-lg p-2 font-bold ${heatColor(v, heatmap.max)} transition-all hover:scale-110`} title={`${v} بيعة`}>
                                                    {v||''}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-3">
                        <span className="text-[9px] text-slate-400">أقل</span>
                        {['bg-slate-50','bg-indigo-100','bg-indigo-200','bg-indigo-400','bg-indigo-600'].map((c,i) => <div key={i} className={`w-5 h-3 rounded ${c}`}></div>)}
                        <span className="text-[9px] text-slate-400">أكثر</span>
                    </div>
                </div>

                {/* Peak Hours */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-4"><i className="fa-solid fa-clock text-blue-500"></i> ساعات الذروة</h3>
                    <div className="space-y-1.5 max-h-80 overflow-y-auto">
                        {peakHours.hours.map((v,h) => v > 0 && (
                            <div key={h} className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 w-10 text-left">{String(h).padStart(2,'0')}:00</span>
                                <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${h===peakHours.peakH?'bg-gradient-to-r from-amber-500 to-orange-500':'bg-gradient-to-r from-blue-400 to-indigo-500'}`} style={{width:`${(v/peakHours.max)*100}%`}}></div>
                                </div>
                                <span className="text-[10px] font-black text-slate-600 w-6">{v}</span>
                                {h===peakHours.peakH && <i className="fa-solid fa-crown text-amber-500 text-[10px]"></i>}
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center">
                        <p className="text-[10px] font-bold text-amber-600">ذروة المبيعات: {String(peakHours.peakH).padStart(2,'0')}:00</p>
                    </div>
                </div>
            </div>

            {/* Customer Intelligence */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Churn & Retention */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-4"><i className="fa-solid fa-users-gear text-purple-500"></i> تحليل العملاء</h3>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                            <p className="text-[9px] font-bold text-emerald-500 mb-1">عملاء نشطين</p>
                            <p className="text-2xl font-black text-emerald-700">{customerBI.active}</p>
                        </div>
                        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                            <p className="text-[9px] font-bold text-red-500 mb-1">عملاء فقدوا</p>
                            <p className="text-2xl font-black text-red-700">{customerBI.churned}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                            <p className="text-[9px] font-bold text-slate-400">نسبة الفقد</p>
                            <p className={`text-lg font-black ${customerBI.churnRate>30?'text-red-600':'text-slate-700'}`}>{customerBI.churnRate}%</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                            <p className="text-[9px] font-bold text-slate-400">نسبة التجديد</p>
                            <p className={`text-lg font-black ${customerBI.renewalRate>50?'text-emerald-600':'text-amber-600'}`}>{customerBI.renewalRate}%</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                            <p className="text-[9px] font-bold text-slate-400">متوسط LTV</p>
                            <p className="text-lg font-black text-indigo-700">{customerBI.avgLTV.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Top LTV Customers */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-4"><i className="fa-solid fa-gem text-amber-500"></i> أعلى العملاء قيمة (LTV)</h3>
                    <div className="space-y-2.5">
                        {customerBI.topLTV.map((c,i) => {
                            const maxT = customerBI.topLTV[0]?.total || 1;
                            return (
                                <div key={i} className="group">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold text-[10px] ${i===0?'bg-amber-500':i===1?'bg-slate-400':'bg-indigo-400'}`}>{i+1}</div>
                                            <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{c.name}</span>
                                        </div>
                                        <div className="text-left">
                                            <span className="text-xs font-bold text-emerald-600">{c.total.toLocaleString()}</span>
                                            <span className="text-[9px] text-slate-400 mr-1">({c.count} طلب)</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full" style={{width:`${(c.total/maxT)*100}%`}}></div>
                                    </div>
                                </div>
                            );
                        })}
                        {customerBI.topLTV.length===0 && <p className="text-center text-slate-400 text-sm py-6">لا توجد بيانات كافية</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
