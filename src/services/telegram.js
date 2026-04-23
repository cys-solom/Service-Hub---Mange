// ==========================================
// Telegram Bot Notification Service v6
// - Multi-group with full customization
// - Each group can receive ANY notification type
// - Daily summary reports
// ==========================================

import { supabase } from '../lib/supabase';

const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';

// GROUP CHAT IDs
const GROUPS = {
    main:        { id: import.meta.env.VITE_TELEGRAM_CHAT_ID || '', label: 'الجروب الرئيسي', icon: 'fa-comments' },
    operations:  { id: import.meta.env.VITE_TELEGRAM_OPERATIONS_CHAT_ID || '', label: 'جروب العمليات', icon: 'fa-boxes-stacked' },
    activations: { id: import.meta.env.VITE_TELEGRAM_ACTIVATIONS_CHAT_ID || '', label: 'جروب التفعيلات', icon: 'fa-circle-check' },
    daily:       { id: import.meta.env.VITE_TELEGRAM_DAILY_REPORT_CHAT_ID || '', label: 'جروب التقرير اليومي', icon: 'fa-chart-line' },
};

// All available notification types
const NOTIFICATION_TYPES = {
    newSale:         { label: 'بيع جديد',         icon: 'fa-cart-shopping',        color: 'indigo',  desc: 'عند إنشاء عملية بيع جديدة' },
    saleEdited:      { label: 'تعديل بيعة',       icon: 'fa-pen-to-square',        color: 'blue',    desc: 'عند تعديل بيانات بيعة' },
    saleDeleted:     { label: 'حذف بيعة',         icon: 'fa-trash',                color: 'red',     desc: 'عند حذف بيعة' },
    saleActivated:   { label: 'تفعيل بيعة',       icon: 'fa-circle-check',         color: 'emerald', desc: 'عند تعليم بيعة كمفعّلة' },
    debtPaid:        { label: 'دفع مديونية',      icon: 'fa-hand-holding-dollar',  color: 'amber',   desc: 'عند تعليم مديونية كمدفوعة' },
    saleRenewed:     { label: 'تجديد اشتراك',     icon: 'fa-rotate',               color: 'blue',    desc: 'عند تجديد اشتراك عميل' },
    stockAdded:      { label: 'إضافة مخزون',      icon: 'fa-boxes-stacked',        color: 'purple',  desc: 'عند إضافة حسابات أو أكواد للمخزون' },
    stockReturned:   { label: 'إرجاع مخزون',      icon: 'fa-rotate-left',          color: 'teal',    desc: 'عند إرجاع حساب للمخزون' },
    inventoryPulled: { label: 'سحب من المخزون',   icon: 'fa-arrow-up-from-bracket', color: 'cyan',   desc: 'عند سحب حساب أو كود من المخزون' },
    newProblem:      { label: 'مشكلة جديدة',      icon: 'fa-triangle-exclamation', color: 'red',     desc: 'عند تسجيل مشكلة جديدة' },
    problemResolved: { label: 'حل مشكلة',         icon: 'fa-check-double',         color: 'green',   desc: 'عند حل مشكلة قائمة' },
    expenseAdded:    { label: 'مصروف جديد',       icon: 'fa-receipt',              color: 'orange',  desc: 'عند إضافة مصروف' },
    expenseDeleted:  { label: 'حذف مصروف',        icon: 'fa-trash',                color: 'red',     desc: 'عند حذف مصروف' },
    dailyReport:     { label: 'التقرير اليومي',    icon: 'fa-chart-pie',            color: 'amber',   desc: 'ملخص يومي شامل بالمبيعات والأرباح' },
};

const PREFS_KEY = 'sh_telegram_group_prefs';

// Default: main group gets sales/payments, operations gets inventory, activations gets activation, daily gets report
const DEFAULT_PREFS = {
    main:        { newSale: true, saleEdited: true, saleDeleted: true, debtPaid: true, saleRenewed: true, saleActivated: false, stockAdded: false, stockReturned: false, inventoryPulled: false, newProblem: true, problemResolved: true, expenseAdded: false, expenseDeleted: false, dailyReport: false },
    operations:  { newSale: false, saleEdited: false, saleDeleted: false, debtPaid: false, saleRenewed: false, saleActivated: false, stockAdded: true, stockReturned: true, inventoryPulled: true, newProblem: true, problemResolved: true, expenseAdded: false, expenseDeleted: false, dailyReport: false },
    activations: { newSale: false, saleEdited: false, saleDeleted: false, debtPaid: false, saleRenewed: false, saleActivated: true, stockAdded: false, stockReturned: false, inventoryPulled: false, newProblem: false, problemResolved: false, expenseAdded: false, expenseDeleted: false, dailyReport: false },
    daily:       { newSale: false, saleEdited: false, saleDeleted: false, debtPaid: false, saleRenewed: false, saleActivated: false, stockAdded: false, stockReturned: false, inventoryPulled: false, newProblem: false, problemResolved: false, expenseAdded: false, expenseDeleted: false, dailyReport: true },
};

const getPrefs = () => {
    try {
        const saved = localStorage.getItem(PREFS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Merge with defaults to handle new notification types
            const merged = {};
            for (const groupKey of Object.keys(DEFAULT_PREFS)) {
                merged[groupKey] = { ...DEFAULT_PREFS[groupKey], ...(parsed[groupKey] || {}) };
            }
            return merged;
        }
    } catch (e) { /* ignore */ }
    return JSON.parse(JSON.stringify(DEFAULT_PREFS));
};

const savePrefs = (prefs) => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
};

const isConfigured = () => BOT_TOKEN && BOT_TOKEN.length > 10;

// Current logged-in user — set once from App.jsx
let _currentUser = '';

const timestamp = () => {
    const now = new Date();
    const d = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const t = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${d} • ${t}`;
};

const byLine = (overrideBy) => {
    const who = overrideBy || _currentUser;
    return who ? `├ 👷 By: <b>${who}</b>\n` : '';
};

// ==========================================
// Robust sending - multiple methods
// ==========================================
const sendToChat = async (chatId, text) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const payload = { chat_id: String(chatId), text, parse_mode: 'HTML', disable_web_page_preview: true };

    // Method 1: fetch
    try {
        const res = await Promise.race([
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000))
        ]);
        if (res.ok) { console.log('[TG] ✅ Sent via fetch'); return true; }
        console.warn('[TG] fetch non-ok:', res.status);
    } catch (e) {
        console.warn('[TG] fetch failed:', e.message);
    }

    // Method 2: Image GET trick
    try {
        const params = new URLSearchParams({
            chat_id: String(chatId), text, parse_mode: 'HTML', disable_web_page_preview: 'true'
        });
        const getUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?${params.toString()}`;
        await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(true);
            img.src = getUrl;
            setTimeout(resolve, 3000);
        });
        console.log('[TG] ✅ Sent via Image GET');
        return true;
    } catch (e) {
        console.warn('[TG] Image GET failed:', e.message);
    }

    // Method 3: sendBeacon
    try {
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            const sent = navigator.sendBeacon(url, blob);
            if (sent) { console.log('[TG] ✅ Sent via sendBeacon'); return true; }
        }
    } catch (e) { /* ignore */ }

    // Method 4: XHR
    try {
        await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.timeout = 6000;
            xhr.onload = () => resolve();
            xhr.onerror = () => reject(new Error('XHR error'));
            xhr.ontimeout = () => reject(new Error('XHR timeout'));
            xhr.send(JSON.stringify(payload));
        });
        console.log('[TG] ✅ Sent via XHR');
        return true;
    } catch (e) {
        console.warn('[TG] XHR failed:', e.message);
    }

    console.error('[TG] ❌ All send methods failed');
    return false;
};

// Send to ALL groups that have this notification type enabled
const sendMessage = async (type, text) => {
    if (!isConfigured()) { console.warn('[TG] Not configured'); return; }

    const prefs = getPrefs();

    // Find all groups that have this type enabled
    for (const [groupKey, groupPrefs] of Object.entries(prefs)) {
        if (groupPrefs[type] === true) {
            const group = GROUPS[groupKey];
            if (group && group.id) {
                console.log(`[TG] Sending "${type}" to ${groupKey}`);
                sendToChat(group.id, text);
            }
        }
    }
};

// ==========================================
// Beautiful Message Templates
// ==========================================
const LINE = '─────────────────────';

const telegram = {
    getPrefs,
    savePrefs,
    GROUPS,
    NOTIFICATION_TYPES,
    DEFAULT_PREFS,

    // Set current user — call once from App.jsx when user logs in
    setCurrentUser: (username) => { _currentUser = username || ''; },

    getGroupsStatus: () => {
        const result = {};
        for (const [key, group] of Object.entries(GROUPS)) {
            result[key] = { ...group, configured: !!group.id };
        }
        return result;
    },

    testConnection: async () => {
        if (!isConfigured()) return { ok: false, error: 'Bot not configured' };
        const text =
            `🔔 <b>Service Hub</b>\n` +
            `${LINE}\n` +
            `✅ البوت متصل ويعمل بنجاح!\n\n` +
            `📡 Connection test passed\n` +
            `📱 Platform: ${/Mobi/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'}\n` +
            `🕐 ${timestamp()}`;
        const mainId = GROUPS.main.id;
        if (!mainId) return { ok: false, error: 'No main group configured' };
        const ok = await sendToChat(mainId, text);
        return ok ? { ok: true } : { ok: false, error: 'Failed to send' };
    },

    testGroup: async (groupKey) => {
        if (!isConfigured()) return { ok: false, error: 'Bot not configured' };
        const group = GROUPS[groupKey];
        if (!group || !group.id) return { ok: false, error: 'Group not configured' };

        const text =
            `🔔 <b>Service Hub - Test</b>\n` +
            `${LINE}\n` +
            `✅ ${group.label} متصل!\n\n` +
            `📡 Group test passed\n` +
            `🕐 ${timestamp()}`;
        const ok = await sendToChat(group.id, text);
        return ok ? { ok: true } : { ok: false, error: 'Failed to send' };
    },

    // ========== NOTIFICATION SENDERS ==========
    newSale: (sale) => {
        const name = sale.customerName || sale.customerEmail || 'عميل';
        const paid = sale.isPaid ? '✅ Paid' : '⏳ Unpaid';
        const activated = sale.isActivated ? '✅ Active' : '🔒 Inactive';
        const text =
            `🛒 <b>NEW SALE</b>\n` +
            `${LINE}\n\n` +
            `👤  <b>${name}</b>\n` +
            `📦  ${sale.productName}\n` +
            `💰  ${Number(sale.finalPrice || 0).toLocaleString()} EGP\n\n` +
            `┌ Payment: ${paid}\n` +
            `├ Status: ${activated}\n` +
            (sale.paymentMethod ? `├ Wallet: ${sale.paymentMethod}\n` : '') +
            byLine(sale.moderator) +
            `└ 🕐 ${timestamp()}`;
        sendMessage('newSale', text);
    },

    saleActivated: (sale) => {
        const name = sale.customerName || sale.customerEmail || 'عميل';
        const text =
            `✅ <b>ACTIVATED</b>\n` +
            `${LINE}\n\n` +
            `👤  <b>${name}</b>\n` +
            `📦  ${sale.productName}\n` +
            (sale.customerEmail ? `📧  <code>${sale.customerEmail}</code>\n` : '') +
            byLine() +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('saleActivated', text);
    },

    debtPaid: (sale) => {
        const name = sale.customerName || sale.customerEmail || 'عميل';
        const text =
            `💰 <b>PAYMENT RECEIVED</b>\n` +
            `${LINE}\n\n` +
            `👤  <b>${name}</b>\n` +
            `📦  ${sale.productName}\n` +
            `💵  ${Number(sale.finalPrice || 0).toLocaleString()} EGP\n` +
            byLine() +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('debtPaid', text);
    },

    saleRenewed: (sale, duration) => {
        const name = sale.customerName || sale.customerEmail || 'عميل';
        const text =
            `🔄 <b>RENEWAL</b>\n` +
            `${LINE}\n\n` +
            `👤  <b>${name}</b>\n` +
            `📦  ${sale.productName}\n` +
            `⏱  ${duration || 30} days\n` +
            `💰  ${Number(sale.finalPrice || 0).toLocaleString()} EGP\n` +
            byLine() +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('saleRenewed', text);
    },

    stockAdded: (sectionName, count) => {
        const text =
            `📦 <b>STOCK ADDED</b>\n` +
            `${LINE}\n\n` +
            `📂  Section: <b>${sectionName}</b>\n` +
            `📊  Quantity: <b>${count}</b> item(s)\n` +
            byLine() +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('stockAdded', text);
    },

    inventoryPulled: (sectionName, email) => {
        const text =
            `📤 <b>INVENTORY PULL</b>\n` +
            `${LINE}\n\n` +
            `📂  Section: <b>${sectionName}</b>\n` +
            `📧  Account: <code>${email || '-'}</code>\n` +
            byLine() +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('inventoryPulled', text);
    },

    newProblem: (problem) => {
        const text =
            `⚠️ <b>NEW PROBLEM</b>\n` +
            `${LINE}\n\n` +
            `📧  ${problem.accountEmail || '-'}\n` +
            `📝  ${problem.description || '-'}\n` +
            byLine() +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('newProblem', text);
    },

    problemResolved: (problem) => {
        const text =
            `🟢 <b>PROBLEM RESOLVED</b>\n` +
            `${LINE}\n\n` +
            `📧  ${problem.accountEmail || '-'}\n` +
            `📝  ${problem.description || '-'}\n` +
            byLine() +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('problemResolved', text);
    },

    expenseAdded: (expense) => {
        const text =
            `💸 <b>NEW EXPENSE</b>\n` +
            `${LINE}\n\n` +
            `📝  ${expense.description || '-'}\n` +
            `💰  ${Number(expense.amount || 0).toLocaleString()} EGP\n` +
            `📂  Type: ${expense.type || '-'}\n` +
            byLine() +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('expenseAdded', text);
    },

    expenseDeleted: (expense) => {
        const text =
            `🗑 <b>EXPENSE DELETED</b>\n` +
            `${LINE}\n\n` +
            `📝  ${expense.description || '-'}\n` +
            `💰  ${Number(expense.amount || 0).toLocaleString()} EGP\n` +
            byLine() +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('expenseDeleted', text);
    },

    saleEdited: (sale) => {
        const name = sale.customerName || sale.customerEmail || 'عميل';
        const text =
            `✏️ <b>SALE EDITED</b>\n` +
            `${LINE}\n\n` +
            `👤  <b>${name}</b>\n` +
            `📦  ${sale.productName}\n` +
            `💰  ${Number(sale.finalPrice || 0).toLocaleString()} EGP\n` +
            byLine(sale.moderator) +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('saleEdited', text);
    },

    saleDeleted: (sale) => {
        const name = sale.customerName || sale.customerEmail || 'عميل';
        const text =
            `🗑 <b>SALE DELETED</b>\n` +
            `${LINE}\n\n` +
            `👤  <b>${name}</b>\n` +
            `📦  ${sale.productName || '-'}\n` +
            `💰  ${Number(sale.finalPrice || 0).toLocaleString()} EGP\n` +
            byLine() +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('saleDeleted', text);
    },

    stockReturned: (sectionName, email) => {
        const text =
            `🔄 <b>STOCK RETURNED</b>\n` +
            `${LINE}\n\n` +
            `📂  Section: <b>${sectionName}</b>\n` +
            `📧  Account: <code>${email || '-'}</code>\n` +
            byLine() +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('stockReturned', text);
    },

    // ========== DAILY REPORT ==========
    sendDailyReport: async () => {
        if (!isConfigured()) return { ok: false, error: 'Bot not configured' };

        try {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0];

            const { data: todaySales } = await supabase
                .from('sales').select('*').gte('date', todayStr).lt('date', tomorrowStr);
            const { data: wallets } = await supabase
                .from('wallets').select('*').order('name');
            const { data: todayExpenses } = await supabase
                .from('expenses').select('*').eq('date', todayStr);
            const { data: todayProblems } = await supabase
                .from('problems').select('*').gte('created_at', todayStr).lt('created_at', tomorrowStr);

            const sales = todaySales || [];
            const expenses = todayExpenses || [];
            const problems = todayProblems || [];
            const walletsList = wallets || [];

            const totalSales = sales.length;
            const totalRevenue = sales.reduce((sum, s) => sum + Number(s.final_price || 0), 0);
            const paidSales = sales.filter(s => s.is_paid);
            const unpaidSales = sales.filter(s => !s.is_paid);
            const paidAmount = paidSales.reduce((sum, s) => sum + Number(s.final_price || 0), 0);
            const unpaidAmount = unpaidSales.reduce((sum, s) => sum + Number(s.final_price || 0), 0);
            const activatedSales = sales.filter(s => s.is_activated);

            const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
            const dailyExpenses = expenses.filter(e => e.expense_category === 'daily');
            const dailyExpensesTotal = dailyExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
            const netProfit = paidAmount - dailyExpensesTotal;
            const resolvedProblems = problems.filter(p => p.is_resolved);

            const productMap = {};
            sales.forEach(s => {
                const name = s.product_name || 'غير محدد';
                if (!productMap[name]) productMap[name] = { count: 0, revenue: 0 };
                productMap[name].count++;
                productMap[name].revenue += Number(s.final_price || 0);
            });

            let walletSection = '';
            if (walletsList.length > 0) {
                walletSection = `\n💳 <b>أرصدة المحافظ</b>\n`;
                let totalWallets = 0;
                walletsList.forEach(w => {
                    const bal = Number(w.balance || 0);
                    totalWallets += bal;
                    walletSection += `   ├ ${w.name}: <b>${bal.toLocaleString()}</b> ${w.currency || 'EGP'}\n`;
                });
                walletSection += `   └ 💰 الإجمالي: <b>${totalWallets.toLocaleString()}</b> EGP\n`;
            }

            let productSection = '';
            const productEntries = Object.entries(productMap);
            if (productEntries.length > 0) {
                productSection = `\n📋 <b>تفاصيل المنتجات</b>\n`;
                productEntries.forEach(([name, info], i) => {
                    const prefix = i === productEntries.length - 1 ? '└' : '├';
                    productSection += `   ${prefix} ${name}: ${info.count}x = ${info.revenue.toLocaleString()} EGP\n`;
                });
            }

            const dateFormatted = today.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            const text =
                `📊 <b>التقرير اليومي</b>\n` +
                `${LINE}\n` +
                `📅 ${dateFormatted}\n` +
                `${LINE}\n\n` +
                `🛒 <b>المبيعات</b>\n` +
                `   ├ عدد المبيعات: <b>${totalSales}</b>\n` +
                `   ├ إجمالي الإيرادات: <b>${totalRevenue.toLocaleString()}</b> EGP\n` +
                `   ├ مدفوع: <b>${paidSales.length}</b> (${paidAmount.toLocaleString()} EGP)\n` +
                `   ├ غير مدفوع: <b>${unpaidSales.length}</b> (${unpaidAmount.toLocaleString()} EGP)\n` +
                `   └ مفعّل: <b>${activatedSales.length}</b> / ${totalSales}\n` +
                productSection +
                `\n💸 <b>المصروفات</b>\n` +
                `   ├ إجمالي المصروفات: <b>${totalExpenses.toLocaleString()}</b> EGP\n` +
                `   └ مصروفات يومية: <b>${dailyExpensesTotal.toLocaleString()}</b> EGP\n` +
                `\n📈 <b>صافي الربح اليومي</b>\n` +
                `   └ ${netProfit >= 0 ? '🟢' : '🔴'} <b>${netProfit.toLocaleString()}</b> EGP\n` +
                walletSection +
                (problems.length > 0 ? (
                    `\n⚠️ <b>المشاكل</b>\n` +
                    `   ├ جديدة: <b>${problems.length}</b>\n` +
                    `   └ تم حلها: <b>${resolvedProblems.length}</b>\n`
                ) : '') +
                `\n${LINE}\n` +
                `🕐 ${timestamp()}`;

            // Send to all groups that have dailyReport enabled
            const prefs = getPrefs();
            let sent = false;
            for (const [groupKey, groupPrefs] of Object.entries(prefs)) {
                if (groupPrefs.dailyReport === true) {
                    const group = GROUPS[groupKey];
                    if (group && group.id) {
                        const ok = await sendToChat(group.id, text);
                        if (ok) sent = true;
                    }
                }
            }

            return sent ? { ok: true } : { ok: false, error: 'Failed to send' };
        } catch (error) {
            console.error('[TG] Daily report error:', error);
            return { ok: false, error: error.message };
        }
    },

    custom: (title, body) => {
        if (!isConfigured()) return;
        const mainId = GROUPS.main.id;
        if (mainId) {
            sendToChat(mainId, `📢 <b>${title}</b>\n${LINE}\n\n${body}\n\n└ 🕐 ${timestamp()}`);
        }
    },

    // ========== AUTO DAILY REPORT SCHEDULER ==========
    _schedulerInterval: null,

    startAutoReport: () => {
        // Don't start if already running
        if (telegram._schedulerInterval) return;
        if (!isConfigured()) { console.log('[TG] Auto-report: bot not configured'); return; }

        const LAST_REPORT_KEY = 'sh_last_daily_report';
        const REPORT_HOUR = 23; // 11 PM
        const REPORT_MINUTE = 55; // 11:55 PM

        const checkAndSend = async () => {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMin = now.getMinutes();
            const todayStr = now.toISOString().split('T')[0];
            const lastSent = localStorage.getItem(LAST_REPORT_KEY);

            // Send if: it's past 11:55 PM AND we haven't sent for today yet
            if (currentHour >= REPORT_HOUR && currentMin >= REPORT_MINUTE && lastSent !== todayStr) {
                console.log('[TG] ⏰ Auto daily report triggered for', todayStr);

                // Mark as sent BEFORE sending to prevent duplicate attempts
                localStorage.setItem(LAST_REPORT_KEY, todayStr);

                try {
                    const result = await telegram.sendDailyReport();
                    if (result.ok) {
                        console.log('[TG] ✅ Auto daily report sent successfully');
                    } else {
                        console.warn('[TG] ⚠️ Auto daily report failed:', result.error);
                        // Don't remove the flag - will retry next day
                    }
                } catch (e) {
                    console.error('[TG] ❌ Auto daily report error:', e);
                }
            }
        };

        // Check immediately on start
        checkAndSend();

        // Then check every 60 seconds
        telegram._schedulerInterval = setInterval(checkAndSend, 60 * 1000);
        console.log('[TG] 📅 Auto daily report scheduler started');
    },

    stopAutoReport: () => {
        if (telegram._schedulerInterval) {
            clearInterval(telegram._schedulerInterval);
            telegram._schedulerInterval = null;
            console.log('[TG] 📅 Auto daily report scheduler stopped');
        }
    },

    getLastReportDate: () => {
        return localStorage.getItem('sh_last_daily_report') || null;
    },
};

export default telegram;
