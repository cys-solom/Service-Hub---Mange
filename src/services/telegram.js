// ==========================================
// Telegram Bot Notification Service v3
// - Beautiful formatted messages
// - Controllable via localStorage preferences
// - Reliable cross-platform sending
// ==========================================

const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const CHAT_IDS_RAW = import.meta.env.VITE_TELEGRAM_CHAT_ID || '';
const CHAT_IDS = CHAT_IDS_RAW.split(',').map(id => id.trim()).filter(Boolean);

const PREFS_KEY = 'sh_telegram_prefs';

// Default notification preferences
const DEFAULT_PREFS = {
    newSale: true,
    saleActivated: true,
    debtPaid: true,
    saleRenewed: true,
    stockAdded: true,
    inventoryPulled: true,
    newProblem: true,
    problemResolved: true,
    expenseAdded: false,
};

// Get saved preferences
const getPrefs = () => {
    try {
        const saved = localStorage.getItem(PREFS_KEY);
        if (saved) return { ...DEFAULT_PREFS, ...JSON.parse(saved) };
    } catch (e) { /* ignore */ }
    return { ...DEFAULT_PREFS };
};

// Save preferences
const savePrefs = (prefs) => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
};

const isConfigured = () => {
    return BOT_TOKEN && BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE' && CHAT_IDS.length > 0;
};

// Timestamp formatter (English)
const timestamp = () => {
    const now = new Date();
    const d = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const t = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${d} • ${t}`;
};

// Send to a single chat
const sendToChat = async (chatId, text) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const payload = { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true };

    // Method 1: Standard fetch (works on most browsers + mobile)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) return true;
        const errBody = await res.text();
        console.warn('[TG] Response error:', res.status, errBody);
    } catch (e) {
        console.warn('[TG] Fetch failed:', e.message);
    }

    // Method 2: XMLHttpRequest (more reliable on some mobile browsers)
    try {
        await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.timeout = 8000;
            xhr.onload = () => resolve(xhr.status);
            xhr.onerror = () => reject(new Error('XHR failed'));
            xhr.ontimeout = () => reject(new Error('XHR timeout'));
            xhr.send(JSON.stringify(payload));
        });
        return true;
    } catch (e) {
        console.warn('[TG] XHR failed:', e.message);
    }

    // Method 3: sendBeacon (fire-and-forget, last resort)
    try {
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon(url, blob);
            return true;
        }
    } catch (e) {
        console.error('[TG] All methods failed');
    }
    return false;
};

// Send to all configured chats (if that notification type is enabled)
const sendMessage = async (type, text) => {
    if (!isConfigured()) return;

    const prefs = getPrefs();
    if (prefs[type] === false) {
        console.log(`[TG] Notification "${type}" is disabled — skipping`);
        return;
    }

    for (const chatId of CHAT_IDS) {
        sendToChat(chatId, text); // Fire and forget, don't await to avoid blocking UI
    }
};

// ==========================================
// Beautiful Message Templates
// ==========================================

const LINE = '─────────────────────';

const telegram = {
    // ── Preferences API ──
    getPrefs,
    savePrefs,
    DEFAULT_PREFS,

    // ── Test connection ──
    testConnection: async () => {
        if (!isConfigured()) return { ok: false, error: 'Bot not configured' };
        const text =
            `🔔 <b>Service Hub</b>\n` +
            `${LINE}\n` +
            `✅ البوت متصل ويعمل بنجاح!\n\n` +
            `📡 Connection test passed\n` +
            `🕐 ${timestamp()}`;
        for (const chatId of CHAT_IDS) {
            const ok = await sendToChat(chatId, text);
            if (!ok) return { ok: false, error: 'Failed to send' };
        }
        return { ok: true };
    },

    // ── 🛒 New Sale ──
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
            (sale.moderator ? `├ By: ${sale.moderator}\n` : '') +
            `└ 🕐 ${timestamp()}`;
        sendMessage('newSale', text);
    },

    // ── ✅ Activated ──
    saleActivated: (sale) => {
        const name = sale.customerName || sale.customerEmail || 'عميل';
        const text =
            `✅ <b>ACTIVATED</b>\n` +
            `${LINE}\n\n` +
            `👤  <b>${name}</b>\n` +
            `📦  ${sale.productName}\n` +
            (sale.customerEmail ? `📧  <code>${sale.customerEmail}</code>\n` : '') +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('saleActivated', text);
    },

    // ── 💰 Debt Paid ──
    debtPaid: (sale) => {
        const name = sale.customerName || sale.customerEmail || 'عميل';
        const text =
            `💰 <b>PAYMENT RECEIVED</b>\n` +
            `${LINE}\n\n` +
            `👤  <b>${name}</b>\n` +
            `📦  ${sale.productName}\n` +
            `💵  ${Number(sale.finalPrice || 0).toLocaleString()} EGP\n` +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('debtPaid', text);
    },

    // ── 🔄 Renewed ──
    saleRenewed: (sale, duration) => {
        const name = sale.customerName || sale.customerEmail || 'عميل';
        const text =
            `🔄 <b>RENEWAL</b>\n` +
            `${LINE}\n\n` +
            `👤  <b>${name}</b>\n` +
            `📦  ${sale.productName}\n` +
            `⏱  ${duration || 30} days\n` +
            `💰  ${Number(sale.finalPrice || 0).toLocaleString()} EGP\n` +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('saleRenewed', text);
    },

    // ── 📦 Stock Added ──
    stockAdded: (sectionName, count) => {
        const text =
            `📦 <b>STOCK ADDED</b>\n` +
            `${LINE}\n\n` +
            `📂  Section: <b>${sectionName}</b>\n` +
            `📊  Quantity: <b>${count}</b> item(s)\n` +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('stockAdded', text);
    },

    // ── 📤 Inventory Pulled ──
    inventoryPulled: (sectionName, email) => {
        const text =
            `📤 <b>INVENTORY PULL</b>\n` +
            `${LINE}\n\n` +
            `📂  Section: <b>${sectionName}</b>\n` +
            `📧  Account: <code>${email || '-'}</code>\n` +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('inventoryPulled', text);
    },

    // ── ⚠️ New Problem ──
    newProblem: (problem) => {
        const text =
            `⚠️ <b>NEW PROBLEM</b>\n` +
            `${LINE}\n\n` +
            `📧  ${problem.accountEmail || '-'}\n` +
            `📝  ${problem.description || '-'}\n` +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('newProblem', text);
    },

    // ── ✅ Problem Resolved ──
    problemResolved: (problem) => {
        const text =
            `🟢 <b>PROBLEM RESOLVED</b>\n` +
            `${LINE}\n\n` +
            `📧  ${problem.accountEmail || '-'}\n` +
            `📝  ${problem.description || '-'}\n` +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('problemResolved', text);
    },

    // ── 💸 Expense ──
    expenseAdded: (expense) => {
        const text =
            `💸 <b>NEW EXPENSE</b>\n` +
            `${LINE}\n\n` +
            `📝  ${expense.description || '-'}\n` +
            `💰  ${Number(expense.amount || 0).toLocaleString()} EGP\n` +
            `📂  Type: ${expense.type || '-'}\n` +
            `\n└ 🕐 ${timestamp()}`;
        sendMessage('expenseAdded', text);
    },

    // ── Custom ──
    custom: (title, body) => {
        sendMessage('custom', `📢 <b>${title}</b>\n${LINE}\n\n${body}\n\n└ 🕐 ${timestamp()}`);
    },
};

export default telegram;
