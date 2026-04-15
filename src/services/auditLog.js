// ==========================================
// Audit Log Service
// Tracks all user actions across the app
// Supabase only — no localStorage
// ==========================================

import { supabase } from '../lib/supabase';

const AUDIT_LOG_TABLE = 'audit_logs';

// Action types with Arabic labels and icons
const ACTION_TYPES = {
    // Sales
    sale_create:      { label: 'إنشاء بيعة', icon: 'fa-cart-plus', color: 'indigo', category: 'sales' },
    sale_update:      { label: 'تعديل بيعة', icon: 'fa-pen-to-square', color: 'blue', category: 'sales' },
    sale_delete:      { label: 'حذف بيعة', icon: 'fa-trash', color: 'red', category: 'sales' },
    sale_activate:    { label: 'تفعيل بيعة', icon: 'fa-circle-check', color: 'emerald', category: 'sales' },
    sale_pay:         { label: 'تأكيد دفع', icon: 'fa-money-check', color: 'green', category: 'sales' },
    sale_renew:       { label: 'تجديد اشتراك', icon: 'fa-rotate', color: 'cyan', category: 'sales' },

    // Products
    product_create:   { label: 'إضافة منتج', icon: 'fa-box', color: 'purple', category: 'products' },
    product_update:   { label: 'تعديل منتج', icon: 'fa-pen', color: 'violet', category: 'products' },
    product_delete:   { label: 'حذف منتج', icon: 'fa-trash', color: 'red', category: 'products' },

    // Inventory
    stock_add:        { label: 'إضافة مخزون', icon: 'fa-boxes-stacked', color: 'teal', category: 'inventory' },
    stock_pull:       { label: 'سحب من المخزون', icon: 'fa-arrow-up-from-bracket', color: 'orange', category: 'inventory' },
    stock_return:     { label: 'إرجاع مخزون', icon: 'fa-rotate-left', color: 'cyan', category: 'inventory' },
    stock_delete:     { label: 'حذف حساب', icon: 'fa-trash', color: 'red', category: 'inventory' },

    // Expenses
    expense_create:   { label: 'إضافة مصروف', icon: 'fa-receipt', color: 'amber', category: 'expenses' },
    expense_update:   { label: 'تعديل مصروف', icon: 'fa-pen', color: 'blue', category: 'expenses' },
    expense_delete:   { label: 'حذف مصروف', icon: 'fa-trash', color: 'red', category: 'expenses' },

    // Wallets
    wallet_create:    { label: 'إنشاء محفظة', icon: 'fa-vault', color: 'blue', category: 'wallets' },
    wallet_update:    { label: 'تعديل محفظة', icon: 'fa-pen', color: 'blue', category: 'wallets' },
    wallet_deposit:   { label: 'إيداع في محفظة', icon: 'fa-arrow-down', color: 'emerald', category: 'wallets' },
    wallet_withdraw:  { label: 'سحب من محفظة', icon: 'fa-arrow-up', color: 'red', category: 'wallets' },

    // Problems
    problem_create:   { label: 'تسجيل مشكلة', icon: 'fa-triangle-exclamation', color: 'red', category: 'problems' },
    problem_resolve:  { label: 'حل مشكلة', icon: 'fa-check-double', color: 'green', category: 'problems' },

    // Customers
    customer_create:  { label: 'إضافة عميل', icon: 'fa-user-plus', color: 'indigo', category: 'customers' },
    customer_update:  { label: 'تعديل عميل', icon: 'fa-user-pen', color: 'blue', category: 'customers' },

    // Users
    user_create:      { label: 'إنشاء مستخدم', icon: 'fa-user-plus', color: 'purple', category: 'users' },
    user_update:      { label: 'تعديل مستخدم', icon: 'fa-user-gear', color: 'blue', category: 'users' },
    user_delete:      { label: 'حذف مستخدم', icon: 'fa-user-xmark', color: 'red', category: 'users' },

    // Auth
    login:            { label: 'تسجيل دخول', icon: 'fa-right-to-bracket', color: 'emerald', category: 'auth' },
    logout:           { label: 'تسجيل خروج', icon: 'fa-right-from-bracket', color: 'slate', category: 'auth' },
};

const CATEGORIES = {
    all:        { label: 'الكل', icon: 'fa-list' },
    sales:      { label: 'المبيعات', icon: 'fa-cart-shopping' },
    products:   { label: 'المنتجات', icon: 'fa-boxes-stacked' },
    inventory:  { label: 'المخزون', icon: 'fa-server' },
    expenses:   { label: 'المصروفات', icon: 'fa-receipt' },
    wallets:    { label: 'المحافظ', icon: 'fa-vault' },
    problems:   { label: 'المشاكل', icon: 'fa-triangle-exclamation' },
    customers:  { label: 'العملاء', icon: 'fa-users' },
    users:      { label: 'المستخدمين', icon: 'fa-user-gear' },
    auth:       { label: 'الدخول/الخروج', icon: 'fa-key' },
};

const auditLog = {
    ACTION_TYPES,
    CATEGORIES,

    /**
     * Log an action to Supabase
     */
    log: async (action, description, meta = {}) => {
        try {
            const user = JSON.parse(localStorage.getItem('service-hub_user') || '{}');
            await supabase.from(AUDIT_LOG_TABLE).insert([{
                action,
                description,
                user_name: user.username || 'unknown',
                user_role: user.role || 'unknown',
                meta: typeof meta === 'object' ? meta : {},
                created_at: new Date().toISOString(),
            }]);
        } catch (e) {
            console.error('[AuditLog] Failed to log:', e.message);
        }
    },

    /**
     * Get logs from Supabase with optional filters
     */
    getLogs: async ({ category, limit = 100, offset = 0, search = '' } = {}) => {
        try {
            let query = supabase
                .from(AUDIT_LOG_TABLE)
                .select('*')
                .not('action', 'in', '("__section_costs__","__usd_rate__")')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (category && category !== 'all') {
                const actions = Object.entries(ACTION_TYPES)
                    .filter(([, v]) => v.category === category)
                    .map(([k]) => k);
                if (actions.length > 0) {
                    query = query.in('action', actions);
                }
            }

            if (search) {
                query = query.ilike('description', `%${search}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('[AuditLog] Failed to get logs:', e.message);
            return [];
        }
    },

    /**
     * Get count of logs
     */
    getCount: async ({ category } = {}) => {
        try {
            let query = supabase.from(AUDIT_LOG_TABLE).select('id', { count: 'exact', head: true });
            if (category && category !== 'all') {
                const actions = Object.entries(ACTION_TYPES)
                    .filter(([, v]) => v.category === category)
                    .map(([k]) => k);
                if (actions.length > 0) query = query.in('action', actions);
            }
            const { count } = await query;
            return count || 0;
        } catch {
            return 0;
        }
    },

    /**
     * Clear all logs (admin only)
     */
    clearAll: async () => {
        await supabase.from(AUDIT_LOG_TABLE).delete().gt('id', 0);
    }
};

export default auditLog;
