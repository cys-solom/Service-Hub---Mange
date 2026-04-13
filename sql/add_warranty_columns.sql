-- =============================================
-- إضافة أعمدة الضمان الإضافي
-- =============================================
-- يجب تنفيذ هذا الملف في Supabase SQL Editor

-- 1. إضافة فترة الضمان الافتراضية للمنتجات
ALTER TABLE products ADD COLUMN IF NOT EXISTS default_warranty INTEGER DEFAULT 0;

-- 2. إضافة أعمدة الضمان في المبيعات
ALTER TABLE sales ADD COLUMN IF NOT EXISTS warranty_fee NUMERIC DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS warranty_days INTEGER DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS warranty_expiry TIMESTAMPTZ DEFAULT NULL;

-- =============================================
-- تمت الإضافة بنجاح ✅
-- =============================================
