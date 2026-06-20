// ==========================================
// Daily Report Edge Function
// Runs automatically on Supabase server at 11:55 PM
// Sends full daily report to Telegram even if website is closed
// ==========================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Helpers ──────────────────────────────
const LINE = '─────────────────────';

function timestamp(): string {
  const now = new Date();
  // Cairo timezone (UTC+2)
  const cairoTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const d = cairoTime.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
  });
  const t = cairoTime.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC'
  });
  return `${d} • ${t}`;
}

function todayStr(): string {
  // Cairo date (UTC+2)
  const now = new Date();
  const cairo = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  return cairo.toISOString().split('T')[0];
}

async function sendToTelegram(botToken: string, chatId: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error('[TG] Failed to send:', e);
    return false;
  }
}

// ── Main Handler ──────────────────────────
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Init Supabase ──
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const botToken     = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
    const dailyChatId  = Deno.env.get('TELEGRAM_DAILY_REPORT_CHAT_ID')!;

    if (!botToken || !dailyChatId) {
      return new Response(JSON.stringify({ error: 'Missing Telegram config' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Fetch today's data ──
    const today     = todayStr();
    const tomorrow  = (() => {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    })();

    const [
      { data: salesData },
      { data: walletsData },
      { data: expensesData },
      { data: problemsData },
    ] = await Promise.all([
      supabase.from('sales').select('*').gte('date', today).lt('date', tomorrow),
      supabase.from('wallets').select('*').order('name'),
      supabase.from('expenses').select('*').eq('date', today),
      supabase.from('problems').select('*').gte('created_at', today).lt('created_at', tomorrow),
    ]);

    const sales    = salesData    || [];
    const wallets  = walletsData  || [];
    const expenses = expensesData || [];
    const problems = problemsData || [];

    // ── Calculations ──
    const totalSales     = sales.length;
    const totalRevenue   = sales.reduce((s: number, x: any) => s + Number(x.final_price || 0), 0);
    const paidSales      = sales.filter((s: any) => s.is_paid);
    const unpaidSales    = sales.filter((s: any) => !s.is_paid);
    const paidAmount     = paidSales.reduce((s: number, x: any) => s + Number(x.final_price || 0), 0);
    const unpaidAmount   = unpaidSales.reduce((s: number, x: any) => s + Number(x.final_price || 0), 0);
    const activatedSales = sales.filter((s: any) => s.is_activated);

    const totalExpenses     = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const dailyExpenses     = expenses.filter((e: any) => e.expense_category === 'daily');
    const dailyExpTotal     = dailyExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const netProfit         = paidAmount - dailyExpTotal;
    const resolvedProblems  = problems.filter((p: any) => p.is_resolved);

    // ── Product breakdown ──
    const productMap: Record<string, { count: number; revenue: number }> = {};
    sales.forEach((s: any) => {
      const name = s.product_name || 'غير محدد';
      if (!productMap[name]) productMap[name] = { count: 0, revenue: 0 };
      productMap[name].count++;
      productMap[name].revenue += Number(s.final_price || 0);
    });

    let productSection = '';
    const productEntries = Object.entries(productMap);
    if (productEntries.length > 0) {
      productSection = `\n📋 <b>تفاصيل المنتجات</b>\n`;
      productEntries.forEach(([name, info], i) => {
        const prefix = i === productEntries.length - 1 ? '└' : '├';
        productSection += `   ${prefix} ${name}: ${info.count}x = ${info.revenue.toLocaleString()} EGP\n`;
      });
    }

    // ── Wallets section ──
    let walletSection = '';
    if (wallets.length > 0) {
      walletSection = `\n💳 <b>أرصدة المحافظ</b>\n`;
      let totalWallets = 0;
      wallets.forEach((w: any) => {
        const bal = Number(w.balance || 0);
        totalWallets += bal;
        walletSection += `   ├ ${w.name}: <b>${bal.toLocaleString()}</b> ${w.currency || 'EGP'}\n`;
      });
      walletSection += `   └ 💰 الإجمالي: <b>${totalWallets.toLocaleString()}</b> EGP\n`;
    }

    // ── Problems section ──
    const problemSection = problems.length > 0
      ? `\n⚠️ <b>المشاكل</b>\n` +
        `   ├ جديدة: <b>${problems.length}</b>\n` +
        `   └ تم حلها: <b>${resolvedProblems.length}</b>\n`
      : '';

    // ── Format date ──
    const dateFormatted = new Date(today).toLocaleDateString('ar-EG', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    });

    // ── Build message ──
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
      `   └ مصروفات يومية: <b>${dailyExpTotal.toLocaleString()}</b> EGP\n` +
      `\n📈 <b>صافي الربح اليومي</b>\n` +
      `   └ ${netProfit >= 0 ? '🟢' : '🔴'} <b>${netProfit.toLocaleString()}</b> EGP\n` +
      walletSection +
      problemSection +
      `\n${LINE}\n` +
      `🤖 <i>تم الإرسال تلقائياً • Server-Side</i>\n` +
      `🕐 ${timestamp()}`;

    // ── Send to Telegram ──
    const ok = await sendToTelegram(botToken, dailyChatId, text);

    return new Response(
      JSON.stringify({ ok, today, totalSales, totalRevenue, netProfit }),
      { status: ok ? 200 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[daily-report] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
