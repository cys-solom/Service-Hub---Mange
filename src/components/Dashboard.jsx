import { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

// ==========================================
// Helper: استخراج تاريخ اليوم فقط (YYYY-MM-DD) بتوقيت محلي
// كل المقارنات تتم بالتاريخ فقط وليس الوقت
// ==========================================
const toLocalDateStr = (dateInput) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getTodayStr = () => toLocalDateStr(new Date());

const getLocalDay = (dateInput) => new Date(dateInput).getDay();

// آخر N أيام من اليوم
const getLastNDaysStrs = (n) => {
    const days = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        days.push(toLocalDateStr(d));
    }
    return days;
};

// بداية الأسبوع الحالي (الأحد)
const getWeekStartStr = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    return toLocalDateStr(start);
};

// بداية الشهر الحالي
const getMonthStartStr = () => {
    const now = new Date();
    return toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
};

export default function Dashboard() {
    useEffect(() => { window.scrollTo(0, 0); }, []);

    const { sales, products, expenses } = useData();
    const { hasPermission, user } = useAuth();
    const canViewDailyProfit = user?.role === 'admin' || hasPermission('view_daily_profit');

    const [filterDate, setFilterDate] = useState('');
    const [activeSection, setActiveSection] = useState('overview');

    // ==========================================
    // استخراج تاريخ كل مبيعة (date string only)
    // ==========================================
    const salesWithDateStr = useMemo(() => {
        return sales.map(s => ({ ...s, _dateStr: toLocalDateStr(s.date) }));
    }, [sales]);

    // ==========================================
    // 📊 الإحصائيات العامة
    // ==========================================
    const stats = useMemo(() => {
        const todayStr = getTodayStr();
        const weekStartStr = getWeekStartStr();
        const monthStartStr = getMonthStartStr();

        const totalRevenue = salesWithDateStr.reduce((sum, s) => sum + (Number(s.finalPrice) || 0), 0);
        const totalCollected = salesWithDateStr.filter(s => s.isPaid).reduce((sum, s) => sum + (Number(s.finalPrice) || 0), 0);
        const totalRemaining = salesWithDateStr.filter(s => !s.isPaid).reduce((sum, s) => sum + (Number(s.remainingAmount) || Number(s.finalPrice) || 0), 0);

        const dailySales = salesWithDateStr.filter(s => s._dateStr === todayStr);
        const weeklySales = salesWithDateStr.filter(s => s._dateStr >= weekStartStr);
        const monthlySales = salesWithDateStr.filter(s => s._dateStr >= monthStartStr);

        // أكثر منتج مبيعاً
        const productCounts = {};
        salesWithDateStr.forEach(s => { productCounts[s.productName] = (productCounts[s.productName] || 0) + 1; });
        const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];

        // أكثر قناة تواصل
        const channelCounts = {};
        salesWithDateStr.forEach(s => { if (s.contactChannel) channelCounts[s.contactChannel] = (channelCounts[s.contactChannel] || 0) + 1; });
        const topChannel = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0];

        // المصروفات
        const dailyExpensesList = expenses.filter(e => (e.expenseCategory || 'daily') === 'daily');
        const stockExpensesList = expenses.filter(e => e.expenseCategory === 'stock');
        const totalDailyExpenses = dailyExpensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const totalStockExpenses = stockExpensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        const grossProfit = totalRevenue - totalDailyExpenses;
        const netProfit = totalCollected - totalDailyExpenses;

        const dailyRevenue = dailySales.reduce((sum, s) => sum + (Number(s.finalPrice) || 0), 0);
        const todayExpenses = dailyExpensesList.filter(e => toLocalDateStr(e.date) === todayStr);
        const todayDailyExpenses = todayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const dailyProfit = dailyRevenue - todayDailyExpenses;
        const dailyCollected = dailySales.filter(s => s.isPaid).reduce((sum, s) => sum + (Number(s.finalPrice) || 0), 0);

        const weeklyRevenue = weeklySales.reduce((sum, s) => sum + (Number(s.finalPrice) || 0), 0);
        const weeklyCollected = weeklySales.filter(s => s.isPaid).reduce((sum, s) => sum + (Number(s.finalPrice) || 0), 0);

        return {
            totalSales: salesWithDateStr.length, totalRevenue, totalCollected, totalRemaining,
            totalDailyExpenses, totalStockExpenses, grossProfit, netProfit,
            dailyCount: dailySales.length, dailyRevenue, dailyProfit, todayDailyExpenses, dailyCollected,
            weeklyCount: weeklySales.length, weeklyRevenue, weeklyCollected,
            monthlyCount: monthlySales.length,
            monthlyRevenue: monthlySales.reduce((sum, s) => sum + (Number(s.finalPrice) || 0), 0),
            totalProducts: products.length,
            topProduct: topProduct ? topProduct[0] : '-', topProductCount: topProduct ? topProduct[1] : 0,
            topChannel: topChannel ? topChannel[0] : '-', topChannelCount: topChannel ? topChannel[1] : 0,
            paidCount: salesWithDateStr.filter(s => s.isPaid).length,
            unpaidCount: salesWithDateStr.filter(s => !s.isPaid).length,
        };
    }, [salesWithDateStr, products, expenses]);

    // آخر 5 مبيعات
    const recentSales = useMemo(() => {
        return [...salesWithDateStr].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    }, [salesWithDateStr]);

    // مبيعات حسب المنتج
    const productStats = useMemo(() => {
        const map = {};
        salesWithDateStr.forEach(s => {
            if (!map[s.productName]) map[s.productName] = { count: 0, revenue: 0 };
            map[s.productName].count++;
            map[s.productName].revenue += Number(s.finalPrice) || 0;
        });
        return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue);
    }, [salesWithDateStr]);

    // مقارنة شهر بشهر
    const monthComparison = useMemo(() => {
        const now = new Date();
        const thisMonthStart = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
        const lastMonthStart = toLocalDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        const lastMonthEnd = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 0));

        const thisMonthSales = salesWithDateStr.filter(s => s._dateStr >= thisMonthStart);
        const lastMonthSales = salesWithDateStr.filter(s => s._dateStr >= lastMonthStart && s._dateStr <= lastMonthEnd);

        const thisRevenue = thisMonthSales.reduce((sum, s) => sum + (Number(s.finalPrice) || 0), 0);
        const lastRevenue = lastMonthSales.reduce((sum, s) => sum + (Number(s.finalPrice) || 0), 0);
        const revenueGrowth = lastRevenue > 0 ? ((thisRevenue - lastRevenue) / lastRevenue * 100) : (thisRevenue > 0 ? 100 : 0);

        return {
            thisRevenue, lastRevenue, thisCount: thisMonthSales.length, lastCount: lastMonthSales.length,
            revenueGrowth,
            thisMonthName: new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('ar-EG', { month: 'long' }),
            lastMonthName: new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('ar-EG', { month: 'long' }),
        };
    }, [salesWithDateStr]);

    // ==========================================
    // ☀️ تحليل اليوم
    // ==========================================
    const todayAnalysis = useMemo(() => {
        const todayStr = getTodayStr();
        const todaySales = salesWithDateStr.filter(s => s._dateStr === todayStr);

        const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, label: `${i.toString().padStart(2, '0')}:00`, count: 0, revenue: 0 }));
        todaySales.forEach(s => { const h = new Date(s.date).getHours(); hours[h].count++; hours[h].revenue += Number(s.finalPrice) || 0; });
        const activeHours = hours.filter(h => h.count > 0);
        const peakHour = activeHours.length > 0 ? activeHours.reduce((a, b) => b.count > a.count ? b : a) : null;

        const prodMap = {};
        todaySales.forEach(s => { prodMap[s.productName] = (prodMap[s.productName] || 0) + 1; });
        const topProd = Object.entries(prodMap).sort((a, b) => b[1] - a[1])[0];

        const modMap = {};
        todaySales.forEach(s => { if (s.moderator) modMap[s.moderator] = (modMap[s.moderator] || 0) + 1; });
        const topMod = Object.entries(modMap).sort((a, b) => b[1] - a[1])[0];

        return {
            activeHours, peakHour,
            topProduct: topProd ? topProd[0] : '-', topProductCount: topProd ? topProd[1] : 0,
            topMod: topMod ? topMod[0] : '-', topModCount: topMod ? topMod[1] : 0,
            paidCount: todaySales.filter(s => s.isPaid).length,
            unpaidCount: todaySales.filter(s => !s.isPaid).length,
            sales: todaySales.sort((a, b) => new Date(b.date) - new Date(a.date)),
        };
    }, [salesWithDateStr]);

    // ==========================================
    // 📆 تحليل الأسبوع
    // ==========================================
    const weekAnalysis = useMemo(() => {
        const last7 = getLastNDaysStrs(7);

        const days = last7.map(dayStr => {
            const d = new Date(dayStr + 'T12:00:00');
            const daySales = salesWithDateStr.filter(s => s._dateStr === dayStr);
            const revenue = daySales.reduce((sum, s) => sum + (Number(s.finalPrice) || 0), 0);
            const collected = daySales.filter(s => s.isPaid).reduce((sum, s) => sum + (Number(s.finalPrice) || 0), 0);
            return {
                label: d.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric' }),
                fullDate: dayStr,
                dayName: d.toLocaleDateString('ar-EG', { weekday: 'long' }),
                count: daySales.length,
                revenue, collected,
            };
        });
        const maxRev = Math.max(...days.map(d => d.revenue), 1);
        const maxCount = Math.max(...days.map(d => d.count), 1);
        const bestDayIdx = days.reduce((best, d, i) => d.count > days[best].count ? i : best, 0);

        // تحليل أيام الأسبوع (الشهر الحالي فقط)
        const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const dayCount = [0, 0, 0, 0, 0, 0, 0];
        const dayRevenue = [0, 0, 0, 0, 0, 0, 0];
        const monthStartStr = getMonthStartStr();
        const thisMonthSales = salesWithDateStr.filter(s => s._dateStr && s._dateStr >= monthStartStr);
        let weekdayTotalCount = 0;
        thisMonthSales.forEach(s => {
            if (!s._dateStr || s._dateStr.length !== 10) return; // skip invalid dates
            const parts = s._dateStr.split('-');
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const day = parseInt(parts[2]);
            const d = new Date(year, month, day);
            if (isNaN(d.getTime())) return; // skip invalid
            const idx = d.getDay();
            dayCount[idx]++;
            dayRevenue[idx] += Number(s.finalPrice) || 0;
            weekdayTotalCount++;
        });
        const bestWeekday = dayCount.indexOf(Math.max(...dayCount));
        const maxDayCount = Math.max(...dayCount, 1);
        const weekdayMonthName = new Date().toLocaleDateString('ar-EG', { month: 'long' });

        // أكثر منتج هذا الأسبوع
        const weekStartStr = getWeekStartStr();
        const weekSales = salesWithDateStr.filter(s => s._dateStr >= weekStartStr);
        const prodMap = {};
        weekSales.forEach(s => { prodMap[s.productName] = (prodMap[s.productName] || 0) + 1; });
        const topProd = Object.entries(prodMap).sort((a, b) => b[1] - a[1])[0];

        return {
            days, maxRev, maxCount, bestDayIdx,
            dayNames, dayCount, dayRevenue, bestWeekday, maxDayCount,
            weekdayTotalCount, weekdayMonthName,
            topProduct: topProd ? topProd[0] : '-', topProductCount: topProd ? topProd[1] : 0,
        };
    }, [salesWithDateStr]);

    // ==========================================
    // 📌 تحليل يوم مخصوص
    // ==========================================
    const customDayAnalysis = useMemo(() => {
        if (!filterDate) return null;
        const daySales = salesWithDateStr.filter(s => s._dateStr === filterDate);
        const revenue = daySales.reduce((sum, s) => sum + (Number(s.finalPrice) || 0), 0);
        const collected = daySales.filter(s => s.isPaid).reduce((sum, s) => sum + (Number(s.finalPrice) || 0), 0);
        const remaining = daySales.filter(s => !s.isPaid).reduce((sum, s) => sum + (Number(s.remainingAmount) || Number(s.finalPrice) || 0), 0);

        const prodMap = {};
        daySales.forEach(s => { prodMap[s.productName] = (prodMap[s.productName] || 0) + 1; });
        const topProd = Object.entries(prodMap).sort((a, b) => b[1] - a[1])[0];

        const modMap = {};
        daySales.forEach(s => { if (s.moderator) modMap[s.moderator] = (modMap[s.moderator] || 0) + 1; });
        const topMod = Object.entries(modMap).sort((a, b) => b[1] - a[1])[0];

        const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, label: `${i.toString().padStart(2, '0')}:00`, count: 0, revenue: 0 }));
        daySales.forEach(s => { const h = new Date(s.date).getHours(); hours[h].count++; hours[h].revenue += Number(s.finalPrice) || 0; });
        const activeHours = hours.filter(h => h.count > 0);
        const peakHour = activeHours.length > 0 ? activeHours.reduce((a, b) => b.count > a.count ? b : a) : null;

        const prodStats = Object.entries(prodMap).sort((a, b) => b[1] - a[1]).map(([name, count]) => {
            const prodRevenue = daySales.filter(s => s.productName === name).reduce((sum, s) => sum + (Number(s.finalPrice) || 0), 0);
            return { name, count, revenue: prodRevenue };
        });

        const dateObj = new Date(filterDate + 'T12:00:00');
        return {
            count: daySales.length, revenue, collected, remaining,
            paidCount: daySales.filter(s => s.isPaid).length,
            unpaidCount: daySales.filter(s => !s.isPaid).length,
            topProduct: topProd ? topProd[0] : '-', topProductCount: topProd ? topProd[1] : 0,
            topMod: topMod ? topMod[0] : '-', topModCount: topMod ? topMod[1] : 0,
            dayOfWeek: dateObj.toLocaleDateString('ar-EG', { weekday: 'long' }),
            formattedDate: dateObj.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
            activeHours, peakHour, prodStats,
            sales: daySales.sort((a, b) => new Date(b.date) - new Date(a.date)),
        };
    }, [filterDate, salesWithDateStr]);

    // ==========================================
    // 🏆 أكثر 10 أيام مبيعاً
    // ==========================================
    const topSellingDays = useMemo(() => {
        const dayMap = {};
        salesWithDateStr.forEach(s => {
            if (!s._dateStr) return;
            if (!dayMap[s._dateStr]) dayMap[s._dateStr] = { count: 0, revenue: 0 };
            dayMap[s._dateStr].count++;
            dayMap[s._dateStr].revenue += Number(s.finalPrice) || 0;
        });
        return Object.entries(dayMap)
            .map(([date, data]) => {
                const dateObj = new Date(date + 'T12:00:00');
                return {
                    date,
                    dayName: dateObj.toLocaleDateString('ar-EG', { weekday: 'long' }),
                    formatted: dateObj.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
                    ...data,
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [salesWithDateStr]);

    // ==========================================
    // RENDER
    // ==========================================
    return (
        <div className="space-y-6 animate-fade-in pb-10">

            {/* --- شريط التذكير --- */}
            <div className="flex justify-center -mb-2 relative z-10">
                <div className="bg-white border-2 border-emerald-100 text-emerald-800 px-8 py-3 rounded-full shadow-lg shadow-emerald-50 transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 group">
                    <div className="bg-emerald-100 p-2 rounded-full text-emerald-600 group-hover:rotate-12 transition-transform"><i className="fa-solid fa-kaaba"></i></div>
                    <p className="font-bold text-lg tracking-wide animate-pulse">اللهم صلِّ وسلم على نبينا محمد</p>
                    <div className="bg-emerald-100 p-2 rounded-full text-emerald-600 group-hover:-rotate-12 transition-transform"><i className="fa-solid fa-mosque"></i></div>
                </div>
            </div>

            {/* --- Header + Navigation --- */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600"><i className="fa-solid fa-chart-line text-xl"></i></div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">لوحة التحكم</h2>
                            <p className="text-xs text-slate-400 font-bold">التحليل حسب تاريخ المبيعة وليس وقت التسجيل</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                    {[
                        { id: 'overview', label: 'نظرة عامة', icon: 'fa-gauge-high' },
                        { id: 'today', label: 'تحليل اليوم', icon: 'fa-sun' },
                        { id: 'week', label: 'تحليل الأسبوع', icon: 'fa-calendar-week' },
                        { id: 'top-days', label: 'أكثر الأيام مبيعاً', icon: 'fa-ranking-star' },
                        { id: 'custom', label: 'فلتر يوم محدد', icon: 'fa-filter' },
                    ].map(s => (
                        <button key={s.id} onClick={() => setActiveSection(s.id)} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeSection === s.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>
                            <i className={`fa-solid ${s.icon} text-[10px]`}></i> {s.label}
                        </button>
                    ))}
                    {activeSection === 'custom' && (
                        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                            className="bg-white border-2 border-indigo-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all" />
                    )}
                </div>
            </div>

            {/* ========================================
                📊 القسم 1: النظرة العامة
               ======================================== */}
            {activeSection === 'overview' && (
                <>
                    <SectionTitle title="الإحصائيات الرئيسية" icon="fa-chart-pie" color="indigo" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        <StatCard title="إجمالي الأوردرات" engTitle="Total Orders" value={stats.totalSales} gradient="bg-gradient-to-br from-indigo-600 to-blue-700" icon="fa-cart-shopping" />
                        {canViewDailyProfit && (
                            <>
                                <StatCard title="إجمالي الإيرادات" engTitle="Total Revenue" value={`${stats.totalRevenue.toLocaleString()} ج.م`} gradient="bg-gradient-to-br from-emerald-500 to-teal-700" icon="fa-sack-dollar" />
                                <StatCard title="المحصّل" engTitle="Collected" value={`${stats.totalCollected.toLocaleString()} ج.م`} gradient="bg-gradient-to-br from-cyan-500 to-blue-600" icon="fa-hand-holding-dollar" />
                                <StatCard title="المديونيات" engTitle="Outstanding" value={`${stats.totalRemaining.toLocaleString()} ج.م`} gradient="bg-gradient-to-br from-red-500 to-rose-700" icon="fa-money-bill-transfer" />
                            </>
                        )}
                    </div>

                    {canViewDailyProfit && (
                        <>
                            <SectionTitle title="الأرباح والمصروفات" icon="fa-coins" color="emerald" />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                <StatCard title="مصروفات يومية" engTitle="Daily Expenses" value={`${stats.totalDailyExpenses.toLocaleString()} ج.م`} subTitle="إعلانات - اشتراكات - رواتب" gradient="bg-gradient-to-br from-amber-500 to-orange-600" icon="fa-clock" />
                                <StatCard title="مصروفات مخزون" engTitle="Stock Expenses" value={`${stats.totalStockExpenses.toLocaleString()} ج.م`} subTitle="شراء استوك وحسابات" gradient="bg-gradient-to-br from-purple-600 to-violet-800" icon="fa-boxes-stacked" />
                                <StatCard title="إجمالي الربح" engTitle="Gross Profit" value={`${stats.grossProfit.toLocaleString()} ج.م`} subTitle="الإيرادات - المصروفات اليومية" gradient={`bg-gradient-to-br ${stats.grossProfit >= 0 ? 'from-emerald-600 to-green-800' : 'from-red-600 to-red-900'}`} icon="fa-chart-line" />
                                <StatCard title="صافي الربح" engTitle="Net Profit" value={`${stats.netProfit.toLocaleString()} ج.م`} subTitle="المحصّل - المصروفات اليومية" gradient={`bg-gradient-to-br ${stats.netProfit >= 0 ? 'from-green-500 to-emerald-700' : 'from-red-700 to-rose-900'}`} icon="fa-coins" />
                            </div>
                        </>
                    )}

                    <SectionTitle title="ملخص الفترات" icon="fa-calendar-days" color="violet" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        <StatCard title="إيراد اليوم" engTitle="Today" value={canViewDailyProfit ? `${stats.dailyRevenue.toLocaleString()} ج.م` : stats.dailyCount} subTitle={canViewDailyProfit ? `${stats.dailyCount} أوردر` : 'أوردر'} gradient="bg-gradient-to-br from-violet-500 to-purple-700" icon="fa-calendar-day" />
                        {canViewDailyProfit && (
                            <StatCard title="ربح اليوم" engTitle="Today's Profit" value={`${stats.dailyProfit.toLocaleString()} ج.م`} subTitle={`إيراد ${stats.dailyRevenue.toLocaleString()} - مصروف ${stats.todayDailyExpenses.toLocaleString()}`} gradient={`bg-gradient-to-br ${stats.dailyProfit >= 0 ? 'from-teal-500 to-emerald-700' : 'from-red-600 to-rose-800'}`} icon="fa-sun" />
                        )}
                        <StatCard title="مبيعات الأسبوع" engTitle="This Week" value={canViewDailyProfit ? `${stats.weeklyRevenue.toLocaleString()} ج.م` : stats.weeklyCount} subTitle={canViewDailyProfit ? `${stats.weeklyCount} أوردر` : 'أوردر'} gradient="bg-gradient-to-br from-fuchsia-500 to-pink-700" icon="fa-calendar-week" />
                        <StatCard title="مبيعات الشهر" engTitle="This Month" value={canViewDailyProfit ? `${stats.monthlyRevenue.toLocaleString()} ج.م` : stats.monthlyCount} subTitle={canViewDailyProfit ? `${stats.monthlyCount} أوردر` : 'أوردر'} gradient="bg-gradient-to-br from-orange-500 to-amber-600" icon="fa-calendar-days" />
                    </div>

                    <SectionTitle title="معلومات إضافية" icon="fa-circle-info" color="blue" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        <StatCard title="المنتجات المتاحة" engTitle="Products" value={stats.totalProducts} gradient="bg-gradient-to-br from-slate-600 to-slate-800" icon="fa-boxes-stacked" />
                        <StatCard title="الأكثر مبيعاً" engTitle="Top Product" value={stats.topProduct} subTitle={`${stats.topProductCount} مبيعة`} gradient="bg-gradient-to-br from-lime-500 to-green-600" icon="fa-trophy" />
                        <StatCard title="قناة التواصل الأولى" engTitle="Top Channel" value={stats.topChannel} subTitle={`${stats.topChannelCount} عميل`} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" icon="fa-comments" />
                        <StatCard title="نسبة التحصيل" engTitle="Collection Rate" value={`${stats.totalSales > 0 ? ((stats.paidCount / stats.totalSales) * 100).toFixed(0) : 0}%`} subTitle={`${stats.paidCount} مدفوع / ${stats.unpaidCount} معلق`} gradient="bg-gradient-to-br from-teal-500 to-cyan-700" icon="fa-chart-pie" />
                    </div>

                    {canViewDailyProfit && sales.length > 0 && (
                        <>
                            <SectionTitle title="مقارنة الأداء" icon="fa-arrow-trend-up" color="emerald" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* نمو الإيرادات */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                                    <div className={`absolute top-0 left-0 w-full h-1.5 ${monthComparison.revenueGrowth >= 0 ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`}></div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                                            <i className={`fa-solid ${monthComparison.revenueGrowth >= 0 ? 'fa-arrow-trend-up text-emerald-500' : 'fa-arrow-trend-down text-red-500'}`}></i>
                                            نمو الإيرادات (شهر بشهر)
                                        </h3>
                                        <span className={`text-2xl font-black ${monthComparison.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {monthComparison.revenueGrowth >= 0 ? '+' : ''}{monthComparison.revenueGrowth.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                                            <p className="text-[10px] font-bold text-indigo-400 mb-1">{monthComparison.thisMonthName} (الحالي)</p>
                                            <p className="text-lg font-black text-indigo-700">{monthComparison.thisRevenue.toLocaleString()} <span className="text-xs">ج.م</span></p>
                                            <p className="text-[10px] font-bold text-indigo-400">{monthComparison.thisCount} أوردر</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 mb-1">{monthComparison.lastMonthName} (السابق)</p>
                                            <p className="text-lg font-black text-slate-600">{monthComparison.lastRevenue.toLocaleString()} <span className="text-xs">ج.م</span></p>
                                            <p className="text-[10px] font-bold text-slate-400">{monthComparison.lastCount} أوردر</p>
                                        </div>
                                    </div>
                                </div>
                                {/* آخر المبيعات */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                    <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2"><i className="fa-solid fa-clock-rotate-left text-indigo-500"></i> آخر المبيعات</h3>
                                    {recentSales.length === 0 ? (<p className="text-slate-400 text-sm text-center py-8">لا توجد مبيعات بعد</p>) : (
                                        <div className="space-y-2.5">
                                            {recentSales.map(sale => (
                                                <div key={sale.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-2 h-2 rounded-full ${sale.isPaid ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                                        <div>
                                                            <div className="font-bold text-xs text-slate-800">{sale.customerName || sale.customerEmail || 'عميل'}</div>
                                                            <div className="text-[10px] text-slate-400 mt-0.5">{sale.productName} • {new Date(sale.date).toLocaleDateString('ar-EG')}</div>
                                                        </div>
                                                    </div>
                                                    <div className="font-black text-sm text-slate-800 dir-ltr">{Number(sale.finalPrice).toLocaleString()} <span className="text-[10px] text-slate-400">ج.م</span></div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* مبيعات حسب المنتج */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2"><i className="fa-solid fa-chart-bar text-indigo-500"></i> المبيعات حسب المنتج</h3>
                                {productStats.length === 0 ? (<p className="text-slate-400 text-sm text-center py-8">لا توجد بيانات</p>) : (
                                    <div className="space-y-3">
                                        {productStats.map(([name, data]) => {
                                            const maxRev = productStats[0]?.[1]?.revenue || 1;
                                            return (
                                                <div key={name} className="group">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="font-bold text-sm text-slate-700">{name}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs text-slate-400 font-bold">{data.count} مبيعة</span>
                                                            <span className="text-sm font-extrabold text-slate-800">{data.revenue.toLocaleString()} ج.م</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-700 group-hover:from-indigo-600 group-hover:to-purple-600" style={{ width: `${(data.revenue / maxRev) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </>
            )}

            {/* ========================================
                ☀️ القسم 2: تحليل اليوم
               ======================================== */}
            {activeSection === 'today' && (
                <>
                    <SectionTitle title={`تحليل اليوم — ${new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`} icon="fa-sun" color="amber" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <MiniStat label="عدد الأوردرات" value={stats.dailyCount} icon="fa-receipt" color="indigo" />
                        {canViewDailyProfit && (<>
                            <MiniStat label="إيرادات اليوم" value={`${stats.dailyRevenue.toLocaleString()} ج.م`} icon="fa-coins" color="emerald" />
                            <MiniStat label="المحصّل اليوم" value={`${stats.dailyCollected.toLocaleString()} ج.م`} icon="fa-check-circle" color="cyan" />
                            <MiniStat label="ربح اليوم" value={`${stats.dailyProfit.toLocaleString()} ج.م`} icon="fa-chart-line" color={stats.dailyProfit >= 0 ? 'teal' : 'red'} />
                        </>)}
                        <MiniStat label="مدفوع" value={todayAnalysis.paidCount} icon="fa-check-double" color="emerald" />
                        <MiniStat label="غير مدفوع" value={todayAnalysis.unpaidCount} icon="fa-clock" color="red" />
                        <MiniStat label="أكثر منتج" value={todayAnalysis.topProduct} sub={`${todayAnalysis.topProductCount} مبيعة`} icon="fa-trophy" color="amber" />
                        <MiniStat label="أكثر مودريتور" value={todayAnalysis.topMod} sub={`${todayAnalysis.topModCount} أوردر`} icon="fa-user-tie" color="purple" />
                    </div>

                    {todayAnalysis.activeHours.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-orange-500"></div>
                            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2"><i className="fa-solid fa-clock text-amber-500"></i> توزيع المبيعات على الساعات</h3>
                                {todayAnalysis.peakHour && <span className="text-xs font-bold bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200"><i className="fa-solid fa-fire text-orange-500 ml-1"></i> أعلى ساعة: {todayAnalysis.peakHour.label} ({todayAnalysis.peakHour.count} أوردر — {todayAnalysis.peakHour.revenue.toLocaleString()} ج.م)</span>}
                            </div>
                            <div className="flex items-end gap-1.5 h-36">
                                {todayAnalysis.activeHours.map((h, i) => {
                                    const maxC = Math.max(...todayAnalysis.activeHours.map(x => x.count), 1);
                                    const isPeak = todayAnalysis.peakHour && h.hour === todayAnalysis.peakHour.hour;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-[35px]" title={`${h.label}: ${h.count} أوردر — ${h.revenue.toLocaleString()} ج.م`}>
                                            <span className="text-[9px] font-black text-slate-600">{h.count}</span>
                                            <div className="w-full bg-slate-100 rounded-t-lg relative overflow-hidden" style={{ height: '100px' }}>
                                                <div className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-500 ${isPeak ? 'bg-gradient-to-t from-amber-500 to-orange-400' : 'bg-gradient-to-t from-indigo-400 to-indigo-300'}`} style={{ height: `${Math.max((h.count / maxC) * 100, 8)}%` }}></div>
                                            </div>
                                            <span className="text-[8px] font-bold text-slate-400">{h.label}</span>
                                            {canViewDailyProfit && <span className="text-[7px] font-bold text-slate-300">{h.revenue.toLocaleString()}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {todayAnalysis.sales.length > 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2"><i className="fa-solid fa-list text-indigo-500"></i> جميع مبيعات اليوم ({todayAnalysis.sales.length})</h3>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {todayAnalysis.sales.map(sale => (
                                    <div key={sale.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sale.isPaid ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-xs text-slate-800 truncate">{sale.customerName || sale.customerEmail || 'عميل'}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                    <span>{sale.productName}</span><span className="text-slate-300">•</span>
                                                    <span>{new Date(sale.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    {sale.moderator && <><span className="text-slate-300">•</span><span className="text-indigo-500">{sale.moderator}</span></>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-left flex-shrink-0">
                                            <div className="font-black text-sm text-slate-800 dir-ltr">{Number(sale.finalPrice).toLocaleString()} <span className="text-[10px] text-slate-400">ج.م</span></div>
                                            {sale.discount > 0 && <div className="text-[9px] text-orange-600 font-bold">خصم {sale.discount} ج.م</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center text-slate-400">
                            <i className="fa-regular fa-sun text-5xl mb-4 block opacity-30"></i>
                            <p className="font-bold text-lg">لا توجد مبيعات اليوم بعد</p>
                        </div>
                    )}
                </>
            )}

            {/* ========================================
                📆 القسم 3: تحليل الأسبوع
               ======================================== */}
            {activeSection === 'week' && (
                <>
                    <SectionTitle title="تحليل الأسبوع الحالي" icon="fa-calendar-week" color="purple" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <MiniStat label="عدد الأوردرات" value={stats.weeklyCount} icon="fa-receipt" color="indigo" />
                        {canViewDailyProfit && (<>
                            <MiniStat label="إيرادات الأسبوع" value={`${stats.weeklyRevenue.toLocaleString()} ج.م`} icon="fa-coins" color="emerald" />
                            <MiniStat label="المحصّل" value={`${stats.weeklyCollected.toLocaleString()} ج.م`} icon="fa-check-circle" color="cyan" />
                            <MiniStat label="المتوسط اليومي" value={`${(stats.weeklyCount > 0 ? Math.round(stats.weeklyRevenue / 7) : 0).toLocaleString()} ج.م`} icon="fa-divide" color="amber" />
                        </>)}
                        <MiniStat label="أكثر منتج (الأسبوع)" value={weekAnalysis.topProduct} sub={`${weekAnalysis.topProductCount} مبيعة`} icon="fa-trophy" color="amber" />
                    </div>

                    {/* رسم بياني آخر 7 أيام */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2"><i className="fa-solid fa-chart-column text-indigo-500"></i> أداء آخر 7 أيام</h3>
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100">
                                <i className="fa-solid fa-crown text-amber-500 text-[8px] ml-1"></i>
                                أفضل يوم: {weekAnalysis.days[weekAnalysis.bestDayIdx]?.dayName} ({weekAnalysis.days[weekAnalysis.bestDayIdx]?.count} أوردر)
                            </span>
                        </div>
                        <div className="flex items-end gap-3 h-32">
                            {weekAnalysis.days.map((day, i) => {
                                const isBest = i === weekAnalysis.bestDayIdx && day.count > 0;
                                const isToday = day.fullDate === getTodayStr();
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${day.dayName}: ${day.count} أوردر — ${day.revenue.toLocaleString()} ج.م`}>
                                        <div className="flex items-end gap-0.5 w-full">
                                            <div className="flex-1 bg-slate-100 rounded-t-md relative overflow-hidden" style={{ height: '80px' }}>
                                                <div className={`absolute bottom-0 w-full rounded-t-md transition-all duration-500 ${isBest ? 'bg-amber-400' : isToday ? 'bg-indigo-500' : 'bg-indigo-300'}`}
                                                    style={{ height: `${Math.max((day.count / weekAnalysis.maxCount) * 100, 4)}%` }}></div>
                                            </div>
                                            {canViewDailyProfit && (
                                                <div className="flex-1 bg-slate-100 rounded-t-md relative overflow-hidden" style={{ height: '80px' }}>
                                                    <div className={`absolute bottom-0 w-full rounded-t-md transition-all duration-500 ${isBest ? 'bg-orange-400' : isToday ? 'bg-emerald-500' : 'bg-emerald-200'}`}
                                                        style={{ height: `${Math.max((day.revenue / weekAnalysis.maxRev) * 100, 4)}%` }}></div>
                                                </div>
                                            )}
                                        </div>
                                        <span className={`text-[9px] font-black ${isBest ? 'text-amber-600' : isToday ? 'text-indigo-600' : 'text-slate-500'}`}>{day.count}</span>
                                        <span className={`text-[8px] font-bold ${isBest ? 'text-amber-600' : 'text-slate-400'}`}>{day.label}</span>
                                        {canViewDailyProfit && <span className="text-[7px] font-bold text-slate-300">{day.revenue.toLocaleString()}</span>}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex items-center gap-4 justify-center text-[10px] text-slate-400 font-bold mt-4">
                            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-indigo-300"></div> عدد الأوردرات</span>
                            {canViewDailyProfit && <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-300"></div> الإيرادات</span>}
                            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-400"></div> أفضل يوم</span>
                        </div>
                    </div>

                    {/* جدول تفصيلي */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-400 to-pink-400"></div>
                        <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2 mb-4"><i className="fa-solid fa-table-list text-purple-500"></i> تفصيل يومي</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500">
                                        <th className="p-3 text-right font-bold rounded-r-xl">اليوم</th>
                                        <th className="p-3 text-center font-bold">الأوردرات</th>
                                        {canViewDailyProfit && <th className="p-3 text-center font-bold">الإيرادات</th>}
                                        {canViewDailyProfit && <th className="p-3 text-center font-bold">المحصّل</th>}
                                        <th className="p-3 text-center font-bold rounded-l-xl">إجراء</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {weekAnalysis.days.map((day, i) => {
                                        const isBest = i === weekAnalysis.bestDayIdx && day.count > 0;
                                        const isToday = day.fullDate === getTodayStr();
                                        return (
                                            <tr key={i} className={`${isBest ? 'bg-amber-50/50' : isToday ? 'bg-indigo-50/30' : ''} hover:bg-slate-50 transition`}>
                                                <td className="p-3 font-bold text-slate-800">
                                                    {day.dayName}
                                                    {isBest && <span className="text-[10px] mr-1.5">🏆</span>}
                                                    {isToday && <span className="text-[9px] text-indigo-500 mr-1 font-bold bg-indigo-100 px-1.5 py-0.5 rounded">اليوم</span>}
                                                </td>
                                                <td className="p-3 text-center font-black text-slate-700">{day.count}</td>
                                                {canViewDailyProfit && <td className="p-3 text-center font-bold text-emerald-700 dir-ltr">{day.revenue.toLocaleString()} ج.م</td>}
                                                {canViewDailyProfit && <td className="p-3 text-center font-bold text-cyan-700 dir-ltr">{day.collected.toLocaleString()} ج.م</td>}
                                                <td className="p-3 text-center">
                                                    <button onClick={() => { setFilterDate(day.fullDate); setActiveSection('custom'); }}
                                                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 mx-auto">
                                                        <i className="fa-solid fa-arrow-up-right-from-square text-[8px]"></i> تفاصيل
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* تحليل أيام الأسبوع - الشهر الحالي */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2"><i className="fa-solid fa-fire text-orange-500"></i> توزيع أيام الأسبوع — شهر {weekAnalysis.weekdayMonthName} <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">({weekAnalysis.weekdayTotalCount} أوردر)</span></h3>
                            <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg border border-indigo-100">أنشط يوم: {weekAnalysis.dayNames[weekAnalysis.bestWeekday]} ({weekAnalysis.dayCount[weekAnalysis.bestWeekday]} مبيعة)</span>
                        </div>
                        <div className="grid grid-cols-7 gap-3">
                            {weekAnalysis.dayNames.map((name, i) => {
                                const isBest = i === weekAnalysis.bestWeekday && weekAnalysis.dayCount[i] > 0;
                                const pct = (weekAnalysis.dayCount[i] / weekAnalysis.maxDayCount) * 100;
                                return (
                                    <div key={name} className={`rounded-xl p-3 text-center transition-all ${isBest ? 'bg-indigo-50 border-2 border-indigo-300 shadow-sm' : 'bg-slate-50 border border-slate-100'}`}>
                                        <p className={`text-xs font-bold mb-2 ${isBest ? 'text-indigo-700' : 'text-slate-500'}`}>{name}</p>
                                        <p className={`text-xl font-black mb-2 ${isBest ? 'text-indigo-700' : 'text-slate-800'}`}>{weekAnalysis.dayCount[i]}</p>
                                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-700 ${isBest ? 'bg-indigo-500' : 'bg-slate-400'}`} style={{ width: `${pct}%` }}></div>
                                        </div>
                                        {canViewDailyProfit && <p className="text-[9px] font-bold text-slate-400 mt-1.5">{weekAnalysis.dayRevenue[i].toLocaleString()} ج.م</p>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* ========================================
                🏆 القسم 4: أكثر الأيام مبيعاً
               ======================================== */}
            {activeSection === 'top-days' && (
                <>
                    <SectionTitle title="أكثر 10 أيام مبيعاً" icon="fa-ranking-star" color="amber" />
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500"></div>
                        {topSellingDays.length === 0 ? (<p className="text-slate-400 text-sm text-center py-12">لا توجد بيانات</p>) : (
                            <div className="space-y-3">
                                {topSellingDays.map((day, i) => {
                                    const maxCount = topSellingDays[0].count;
                                    const isTop3 = i < 3;
                                    const medals = ['🥇', '🥈', '🥉'];
                                    return (
                                        <div key={day.date} className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isTop3 ? 'bg-gradient-to-r from-amber-50/80 to-orange-50/50 border border-amber-200/60' : 'hover:bg-slate-50 border border-slate-100'}`}>
                                            <div className="w-10 text-center flex-shrink-0">{isTop3 ? <span className="text-2xl">{medals[i]}</span> : <span className="text-sm font-black text-slate-400">#{i + 1}</span>}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className={`font-bold text-sm ${isTop3 ? 'text-amber-800' : 'text-slate-800'}`}>{day.formatted}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded">{day.dayName}</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-700 ${isTop3 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-slate-300'}`} style={{ width: `${(day.count / maxCount) * 100}%` }}></div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 flex-shrink-0">
                                                <div className="text-center"><span className={`text-lg font-black ${isTop3 ? 'text-amber-700' : 'text-slate-700'}`}>{day.count}</span><p className="text-[9px] text-slate-400 font-bold">أوردر</p></div>
                                                {canViewDailyProfit && <div className="text-center min-w-[80px]"><span className="text-sm font-bold text-emerald-700 dir-ltr">{day.revenue.toLocaleString()}</span><p className="text-[9px] text-slate-400 font-bold">ج.م</p></div>}
                                                <button onClick={() => { setFilterDate(day.date); setActiveSection('custom'); }} className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition flex items-center gap-1">
                                                    <i className="fa-solid fa-arrow-up-right-from-square text-[8px]"></i> تفاصيل
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ========================================
                📌 القسم 5: فلتر يوم محدد
               ======================================== */}
            {activeSection === 'custom' && (
                <>
                    {!filterDate ? (
                        <div className="bg-white rounded-2xl border-2 border-dashed border-indigo-200 p-16 text-center">
                            <i className="fa-solid fa-calendar-plus text-5xl text-indigo-200 mb-4 block"></i>
                            <p className="font-bold text-lg text-slate-600">اختر تاريخ من الأعلى لعرض تحليل اليوم</p>
                        </div>
                    ) : customDayAnalysis && (
                        <>
                            <SectionTitle title={`تحليل يوم ${customDayAnalysis.formattedDate} (${customDayAnalysis.dayOfWeek})`} icon="fa-calendar-check" color="amber" />
                            {customDayAnalysis.count === 0 ? (
                                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center text-slate-400">
                                    <i className="fa-regular fa-calendar-xmark text-5xl mb-4 block opacity-30"></i>
                                    <p className="font-bold text-lg">لا توجد مبيعات في هذا اليوم</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        <MiniStat label="عدد الأوردرات" value={customDayAnalysis.count} icon="fa-receipt" color="indigo" />
                                        {canViewDailyProfit && (<>
                                            <MiniStat label="الإيرادات" value={`${customDayAnalysis.revenue.toLocaleString()} ج.م`} icon="fa-coins" color="emerald" />
                                            <MiniStat label="المحصّل" value={`${customDayAnalysis.collected.toLocaleString()} ج.م`} icon="fa-check-circle" color="cyan" />
                                            <MiniStat label="المتبقي" value={`${customDayAnalysis.remaining.toLocaleString()} ج.م`} icon="fa-hourglass" color="red" />
                                        </>)}
                                        <MiniStat label="مدفوع" value={customDayAnalysis.paidCount} icon="fa-check-double" color="emerald" />
                                        <MiniStat label="غير مدفوع" value={customDayAnalysis.unpaidCount} icon="fa-clock" color="red" />
                                        <MiniStat label="أكثر منتج" value={customDayAnalysis.topProduct} sub={`${customDayAnalysis.topProductCount} مبيعة`} icon="fa-trophy" color="amber" />
                                        <MiniStat label="أكثر مودريتور" value={customDayAnalysis.topMod} sub={`${customDayAnalysis.topModCount} أوردر`} icon="fa-user-tie" color="purple" />
                                    </div>

                                    {customDayAnalysis.activeHours.length > 0 && (
                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-orange-500"></div>
                                            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                                <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2"><i className="fa-solid fa-clock text-amber-500"></i> توزيع على الساعات</h3>
                                                {customDayAnalysis.peakHour && <span className="text-xs font-bold bg-amber-50 text-amber-700 px-3 py-1 rounded-lg border border-amber-200"><i className="fa-solid fa-fire text-orange-500 ml-1"></i> الذروة: {customDayAnalysis.peakHour.label} ({customDayAnalysis.peakHour.count} أوردر)</span>}
                                            </div>
                                            <div className="flex items-end gap-1.5 h-28">
                                                {customDayAnalysis.activeHours.map((h, i) => {
                                                    const maxC = Math.max(...customDayAnalysis.activeHours.map(x => x.count), 1);
                                                    const isPeak = customDayAnalysis.peakHour && h.hour === customDayAnalysis.peakHour.hour;
                                                    return (
                                                        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-[30px]">
                                                            <span className="text-[9px] font-black text-slate-600">{h.count}</span>
                                                            <div className="w-full bg-slate-100 rounded-t-lg relative overflow-hidden" style={{ height: '80px' }}>
                                                                <div className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-500 ${isPeak ? 'bg-gradient-to-t from-amber-500 to-orange-400' : 'bg-gradient-to-t from-indigo-400 to-indigo-300'}`} style={{ height: `${Math.max((h.count / maxC) * 100, 8)}%` }}></div>
                                                            </div>
                                                            <span className="text-[8px] font-bold text-slate-400">{h.label}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {customDayAnalysis.prodStats.length > 0 && (
                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                            <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2"><i className="fa-solid fa-chart-bar text-indigo-500"></i> المنتجات في هذا اليوم</h3>
                                            <div className="space-y-2.5">
                                                {customDayAnalysis.prodStats.map(ps => (
                                                    <div key={ps.name} className="group">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="font-bold text-sm text-slate-700">{ps.name}</span>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs text-slate-400 font-bold">{ps.count} مبيعة</span>
                                                                {canViewDailyProfit && <span className="text-sm font-extrabold text-slate-800">{ps.revenue.toLocaleString()} ج.م</span>}
                                                            </div>
                                                        </div>
                                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-700" style={{ width: `${(ps.count / customDayAnalysis.prodStats[0].count) * 100}%` }}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                        <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2"><i className="fa-solid fa-list text-indigo-500"></i> جميع المبيعات ({customDayAnalysis.count})</h3>
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                            {customDayAnalysis.sales.map(sale => (
                                                <div key={sale.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sale.isPaid ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-xs text-slate-800 truncate">{sale.customerName || sale.customerEmail || 'عميل'}</div>
                                                            <div className="text-[10px] text-slate-400 mt-0.5">{sale.productName} • {new Date(sale.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}{sale.moderator && <> • <span className="text-indigo-500">{sale.moderator}</span></>}</div>
                                                        </div>
                                                    </div>
                                                    <div className="font-black text-sm text-slate-800 dir-ltr flex-shrink-0">{Number(sale.finalPrice).toLocaleString()} <span className="text-[10px] text-slate-400">ج.م</span></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </>
            )}

            <style>{`
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}

// ==========================================
// Sub-Components
// ==========================================

const SectionTitle = ({ title, icon, color }) => {
    const gradients = { indigo: 'from-indigo-500 to-blue-500', emerald: 'from-emerald-500 to-teal-500', violet: 'from-violet-500 to-purple-500', purple: 'from-purple-500 to-fuchsia-500', amber: 'from-amber-500 to-orange-500', blue: 'from-blue-500 to-cyan-500' };
    const textColors = { indigo: 'text-indigo-600', emerald: 'text-emerald-600', violet: 'text-violet-600', purple: 'text-purple-600', amber: 'text-amber-600', blue: 'text-blue-600' };
    const bgColors = { indigo: 'bg-indigo-50 border-indigo-200', emerald: 'bg-emerald-50 border-emerald-200', violet: 'bg-violet-50 border-violet-200', purple: 'bg-purple-50 border-purple-200', amber: 'bg-amber-50 border-amber-200', blue: 'bg-blue-50 border-blue-200' };
    return (
        <div className="flex items-center gap-3">
            <div className={`w-1 h-8 rounded-full bg-gradient-to-b ${gradients[color] || gradients.indigo}`}></div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${bgColors[color] || bgColors.indigo}`}>
                <i className={`fa-solid ${icon} text-sm ${textColors[color] || textColors.indigo}`}></i>
                <h3 className={`text-sm font-extrabold ${textColors[color] || textColors.indigo}`}>{title}</h3>
            </div>
        </div>
    );
};

const StatCard = ({ title, engTitle, value, subTitle, gradient, icon }) => (
    <div className={`p-6 rounded-2xl text-white shadow-lg shadow-indigo-100 relative overflow-hidden ${gradient} transition transform hover:-translate-y-1 hover:shadow-xl group min-h-[150px] flex flex-col justify-between border border-white/10`}>
        <div className="absolute -left-4 -bottom-4 text-9xl opacity-10 group-hover:scale-110 transition-transform duration-500 rotate-12"><i className={`fa-solid ${icon}`}></i></div>
        <div className="relative z-10 flex justify-between items-start">
            <div><h3 className="text-lg font-extrabold tracking-wide">{title}</h3><p className="text-[10px] uppercase opacity-70 font-sans tracking-widest">{engTitle}</p></div>
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm shadow-inner"><i className={`fa-solid ${icon} text-lg`}></i></div>
        </div>
        <div className="relative z-10 mt-4">
            <p className="text-3xl font-black dir-ltr drop-shadow-md tracking-tight">{value}</p>
            {subTitle && <p className="text-[10px] opacity-90 mt-1 font-medium bg-black/20 w-fit px-2 py-0.5 rounded">{subTitle}</p>}
        </div>
    </div>
);

const MiniStat = ({ label, value, sub, icon, color }) => {
    const c = { indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700', emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700', green: 'bg-green-50 border-green-100 text-green-700', cyan: 'bg-cyan-50 border-cyan-100 text-cyan-700', teal: 'bg-teal-50 border-teal-100 text-teal-700', red: 'bg-red-50 border-red-100 text-red-700', amber: 'bg-amber-50 border-amber-100 text-amber-700', purple: 'bg-purple-50 border-purple-100 text-purple-700' };
    const ic = { indigo: 'text-indigo-500', emerald: 'text-emerald-500', green: 'text-green-500', cyan: 'text-cyan-500', teal: 'text-teal-500', red: 'text-red-500', amber: 'text-amber-500', purple: 'text-purple-500' };
    return (
        <div className={`rounded-xl p-3.5 border ${c[color] || c.indigo} transition-all hover:shadow-sm`}>
            <div className="flex items-center gap-1.5 mb-1.5"><i className={`fa-solid ${icon} text-[10px] ${ic[color] || ic.indigo}`}></i><p className="text-[10px] font-bold opacity-70">{label}</p></div>
            <p className="text-lg font-black leading-tight">{value}</p>
            {sub && <p className="text-[9px] font-bold opacity-60 mt-0.5">{sub}</p>}
        </div>
    );
};