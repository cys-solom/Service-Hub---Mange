// ==========================================
// Contact utilities: WhatsApp links + message templates
// Used by NotificationCenter, Renewals, and Clients
// ==========================================

// تحويل رقم الهاتف لصيغة دولية بأرقام فقط (بدون +) عشان wa.me
export function normalizePhone(phone) {
    if (!phone) return '';
    let s = String(phone).trim().replace(/[\s\-()]/g, '');
    if (s.startsWith('+')) return s.slice(1).replace(/\D/g, '');
    if (s.startsWith('00')) return s.slice(2).replace(/\D/g, '');
    s = s.replace(/\D/g, '');
    // رقم مصري محلي بيبدأ بـ 0 → +20
    if (s.startsWith('0')) return '20' + s.slice(1);
    return s;
}

// بناء لينك واتساب برسالة جاهزة. لو مفيش رقم بيفتح شاشة اختيار جهة الاتصال.
export function buildWaLink(phone, message) {
    const p = normalizePhone(phone);
    const text = encodeURIComponent(message || '');
    return p ? `https://wa.me/${p}?text=${text}` : `https://wa.me/?text=${text}`;
}

// استبدال المتغيرات {name} {product} ... داخل نص القالب
export function fillTemplate(text, vars = {}) {
    return String(text || '').replace(/\{(\w+)\}/g, (_, key) => {
        const v = vars[key];
        return v === undefined || v === null ? '' : String(v);
    });
}

const TEMPLATES_KEY = 'sh_msg_templates';

// القوالب الافتراضية — المتغيرات المتاحة: {name} {product} {expiry} {days} {price} {remaining}
export const DEFAULT_TEMPLATES = [
    { id: 'renewal',  label: 'تذكير تجديد',    icon: 'fa-clock',                text: 'أهلاً {name} 👋\nاشتراكك في *{product}* هينتهي بتاريخ {expiry} (باقي {days} يوم).\nتحب نجدده لك؟ 😊' },
    { id: 'expired',  label: 'اشتراك منتهي',   icon: 'fa-calendar-xmark',       text: 'أهلاً {name} 👋\nاشتراكك في *{product}* انتهى بتاريخ {expiry}.\nممكن نجدده لك دلوقتي وترجع تستخدمه على طول 🚀' },
    { id: 'debt',     label: 'تذكير مديونية',  icon: 'fa-hand-holding-dollar',  text: 'أهلاً {name} 👋\nحابين نفكرك إن متبقي مبلغ *{remaining} ج.م* على اشتراك {product}. تحب تسددها إزاي؟' },
    { id: 'followup', label: 'متابعة عامة',    icon: 'fa-phone',                text: 'أهلاً {name} 👋\nعامل إيه؟ حبينا نطمن عليك ونعرف لو محتاج أي خدمة 😊' },
];

export function getTemplates() {
    try {
        const saved = localStorage.getItem(TEMPLATES_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length) return parsed;
        }
    } catch { /* ignore */ }
    return JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
}

export function saveTemplates(list) {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list || []));
}

// بناء متغيرات الرسالة من بيعة أو عميل
export function saleVars(sale) {
    const daysLeft = sale.expiryDate
        ? Math.ceil((new Date(sale.expiryDate) - new Date()) / 86400000)
        : '';
    return {
        name: sale.customerName || sale.customerEmail || 'عميلنا العزيز',
        product: sale.productName || '',
        expiry: sale.expiryDate ? new Date(sale.expiryDate).toLocaleDateString('en-GB') : '',
        days: daysLeft === '' ? '' : Math.abs(daysLeft),
        price: Number(sale.finalPrice || 0).toLocaleString(),
        remaining: Number(sale.remainingAmount || 0).toLocaleString(),
    };
}
