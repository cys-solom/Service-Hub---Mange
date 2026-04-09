// ==========================================
// Telegram Bot Notification Service
// ==========================================

const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

const isConfigured = () => {
    return BOT_TOKEN && BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE' && CHAT_ID && CHAT_ID !== 'YOUR_CHAT_ID_HERE';
};

// Send a raw message to Telegram
const sendMessage = async (text) => {
    if (!isConfigured()) {
        console.warn('[Telegram] Bot not configured — skipping notification');
        return;
    }
    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
            }),
        });
    } catch (err) {
        console.error('[Telegram] Failed to send notification:', err);
    }
};

// ==========================================
// Notification Templates
// ==========================================

const telegram = {
    // 📦 Stock / Inventory added
    stockAdded: (sectionName, count, type = 'accounts') => {
        const icon = type === 'codes' ? '🔑' : '🛡️';
        sendMessage(
            `${icon} <b>مخزون جديد</b>\n\n` +
            `📂 القسم: <b>${sectionName}</b>\n` +
            `📊 العدد: <b>${count}</b> عنصر\n` +
            `📅 ${new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}`
        );
    },

    // 🆕 New sale created
    newSale: (sale) => {
        const name = sale.customerName || sale.customerEmail || 'عميل';
        const paid = sale.isPaid ? '✅ مدفوع' : '⏳ غير مدفوع';
        const activated = sale.isActivated ? '✅ مفعّل' : '❌ غير مفعّل';
        sendMessage(
            `🛒 <b>بيع جديد</b>\n\n` +
            `👤 العميل: <b>${name}</b>\n` +
            `📦 المنتج: <b>${sale.productName}</b>\n` +
            `💰 السعر: <b>${Number(sale.finalPrice || 0).toLocaleString()} ج.م</b>\n` +
            `💳 الدفع: ${paid}\n` +
            `🔓 التفعيل: ${activated}\n` +
            (sale.paymentMethod ? `🏦 المحفظة: ${sale.paymentMethod}\n` : '') +
            (sale.moderator ? `👨‍💻 بواسطة: ${sale.moderator}\n` : '') +
            `📅 ${new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}`
        );
    },

    // ✅ Sale activated
    saleActivated: (sale) => {
        const name = sale.customerName || sale.customerEmail || 'عميل';
        sendMessage(
            `✅ <b>تم التفعيل</b>\n\n` +
            `👤 العميل: <b>${name}</b>\n` +
            `📦 المنتج: <b>${sale.productName}</b>\n` +
            `📧 الإيميل: <code>${sale.customerEmail || '-'}</code>\n` +
            `📅 ${new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}`
        );
    },

    // 💰 Debt paid
    debtPaid: (sale) => {
        const name = sale.customerName || sale.customerEmail || 'عميل';
        sendMessage(
            `💰 <b>تم الدفع</b>\n\n` +
            `👤 العميل: <b>${name}</b>\n` +
            `📦 المنتج: <b>${sale.productName}</b>\n` +
            `💵 المبلغ: <b>${Number(sale.finalPrice || 0).toLocaleString()} ج.م</b>\n` +
            `📅 ${new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}`
        );
    },

    // 🔄 Sale renewed
    saleRenewed: (sale, newDuration) => {
        const name = sale.customerName || sale.customerEmail || 'عميل';
        sendMessage(
            `🔄 <b>تجديد اشتراك</b>\n\n` +
            `👤 العميل: <b>${name}</b>\n` +
            `📦 المنتج: <b>${sale.productName}</b>\n` +
            `⏱️ المدة: <b>${newDuration || 30} يوم</b>\n` +
            `💰 السعر: <b>${Number(sale.finalPrice || 0).toLocaleString()} ج.م</b>\n` +
            `📅 ${new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}`
        );
    },

    // ⚠️ New problem reported
    newProblem: (problem) => {
        sendMessage(
            `⚠️ <b>مشكلة جديدة</b>\n\n` +
            `📧 الحساب: <code>${problem.accountEmail || '-'}</code>\n` +
            `📝 الوصف: ${problem.description || '-'}\n` +
            `📅 ${new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}`
        );
    },

    // ✅ Problem resolved
    problemResolved: (problem) => {
        sendMessage(
            `✅ <b>مشكلة محلولة</b>\n\n` +
            `📧 الحساب: <code>${problem.accountEmail || '-'}</code>\n` +
            `📝 الوصف: ${problem.description || '-'}\n` +
            `📅 ${new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}`
        );
    },

    // 💸 Expense added
    expenseAdded: (expense) => {
        sendMessage(
            `💸 <b>مصروف جديد</b>\n\n` +
            `📝 الوصف: <b>${expense.description || '-'}</b>\n` +
            `💰 المبلغ: <b>${Number(expense.amount || 0).toLocaleString()} ج.م</b>\n` +
            `📂 النوع: ${expense.type || '-'}\n` +
            `📅 ${new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}`
        );
    },

    // 📤 Inventory pulled
    inventoryPulled: (sectionName, email) => {
        sendMessage(
            `📤 <b>سحب من المخزون</b>\n\n` +
            `📂 القسم: <b>${sectionName}</b>\n` +
            `📧 الحساب: <code>${email || '-'}</code>\n` +
            `📅 ${new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}`
        );
    },

    // Custom message
    custom: (title, body) => {
        sendMessage(`📢 <b>${title}</b>\n\n${body}`);
    },
};

export default telegram;
