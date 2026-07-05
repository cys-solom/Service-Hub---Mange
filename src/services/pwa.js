// ==========================================
// PWA: service worker + local OS notifications
// (installable app + critical alerts on device)
// ==========================================
import { useEffect, useRef } from 'react';

// تسجيل الـ service worker — يخلي التطبيق قابل للتثبيت ويشتغل offline
export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('[PWA] SW registered', reg.scope))
            .catch(err => console.warn('[PWA] SW registration failed', err));
    });
}

export function notificationsSupported() {
    return typeof Notification !== 'undefined';
}

export function getNotificationPermission() {
    return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestNotificationPermission() {
    if (!notificationsSupported()) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    try { return await Notification.requestPermission(); } catch { return 'denied'; }
}

// إظهار إشعار على مستوى النظام (يفضل عبر الـ SW عشان يشتغل والتطبيق في الخلفية)
export async function showLocalNotification(title, options = {}) {
    if (!notificationsSupported() || Notification.permission !== 'granted') return false;
    const opts = { icon: '/favicon.png', badge: '/favicon.png', dir: 'rtl', lang: 'ar', ...options };
    try {
        if (navigator.serviceWorker) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg && reg.showNotification) { reg.showNotification(title, opts); return true; }
        }
        new Notification(title, opts);
        return true;
    } catch (e) {
        console.warn('[PWA] notification failed', e);
        return false;
    }
}

// حساب التنبيهات الحرجة اللي تستاهل إشعار نظام
export function computeCriticalAlerts({ sales = [], sections = [], accounts = [], customers = [] }) {
    const alerts = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    sales.forEach(sale => {
        if (sale.renewal_stage === 'renewed' || !sale.expiryDate) return;
        const dl = Math.ceil((new Date(sale.expiryDate) - today) / 86400000);
        if (dl <= 0 && dl >= -30) {
            alerts.push({
                id: `renewal-${sale.id}`,
                title: '⚠️ اشتراك منتهي',
                body: `${sale.customerName || sale.customerEmail || 'عميل'} — ${sale.productName}`,
                tab: 'today',
            });
        }
    });

    if (sections && accounts) {
        sections.forEach(sec => {
            const available = accounts.filter(a => a.productName === sec.name && a.status === 'available').length;
            if (available === 0) {
                alerts.push({ id: `stock-${sec.id}-0`, title: '🚨 مخزون فارغ', body: `${sec.name} — مفيش أي حسابات متاحة`, tab: 'accounts' });
            }
        });
    }

    customers.forEach(c => {
        if (!c.nextFollowUpDate || c.nextFollowUpDate > todayStr) return;
        alerts.push({ id: `followup-${c.id}-${c.nextFollowUpDate}`, title: '📞 متابعة مستحقة', body: c.name || c.email || 'عميل', tab: 'today' });
    });

    return alerts;
}

const SEEN_KEY = 'sh_notified_ids';
const loadSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; } };
const saveSeen = (ids) => localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-400)));

// Hook: يبعت إشعار نظام لكل تنبيه حرج جديد لم يُبلّغ عنه قبل كده
export function useCriticalNotifier(data, onNavigate) {
    const timer = useRef(null);

    useEffect(() => {
        if (getNotificationPermission() !== 'granted') return;

        const run = () => {
            const alerts = computeCriticalAlerts(data);
            if (!alerts.length) return;
            const seen = new Set(loadSeen());
            const fresh = alerts.filter(a => !seen.has(a.id));
            if (!fresh.length) return;

            // اجمع أكتر من تنبيه في إشعار واحد لو كتير
            if (fresh.length > 3) {
                showLocalNotification('🔔 عندك تنبيهات جديدة', {
                    body: `${fresh.length} تنبيه حرج محتاج متابعة`,
                    tag: 'sh-critical-batch',
                    data: { tab: 'today' },
                });
            } else {
                fresh.forEach(a => showLocalNotification(a.title, { body: a.body, tag: a.id, data: { tab: a.tab } }));
            }

            const updated = [...seen, ...fresh.map(a => a.id)];
            saveSeen(updated);
        };

        // شغّل بعد ثانيتين من التحميل، وبعدها كل 5 دقايق
        const start = setTimeout(run, 2000);
        timer.current = setInterval(run, 5 * 60 * 1000);
        return () => { clearTimeout(start); clearInterval(timer.current); };
    }, [data.sales, data.sections, data.accounts, data.customers]);

    // استقبل الضغط على الإشعار من الـ SW → افتح التبويب المناسب
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        const handler = (event) => {
            const tab = event.data?.tab;
            if (event.data?.type === 'NOTIFICATION_CLICK' && tab && onNavigate) onNavigate(tab);
        };
        navigator.serviceWorker.addEventListener('message', handler);
        return () => navigator.serviceWorker.removeEventListener('message', handler);
    }, [onNavigate]);
}
