// ==========================================
// Receipt / Invoice generator (canvas → PNG)
// بيولّد إيصال احترافي جاهز يتبعت على واتساب — بدون أي مكتبات خارجية
// ==========================================

const STORE_KEY = 'sh_store_info';

export function getStoreInfo() {
    try {
        const s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
        return { name: s.name || 'Service Hub', phone: s.phone || '', note: s.note || 'شكراً لتعاملك معنا 🌟' };
    } catch {
        return { name: 'Service Hub', phone: '', note: 'شكراً لتعاملك معنا 🌟' };
    }
}

export function saveStoreInfo(info) {
    localStorage.setItem(STORE_KEY, JSON.stringify(info || {}));
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

// رسم الإيصال على canvas وإرجاعه
export async function renderReceiptCanvas(sale, store = getStoreInfo()) {
    // نجهّز الخط قبل الرسم عشان النص العربي يطلع مظبوط
    try { await document.fonts.load('bold 32px Cairo'); await document.fonts.load('600 22px Cairo'); await document.fonts.ready; } catch { /* ignore */ }

    const scale = 2; // دقة أعلى للصورة
    const W = 640;
    const rows = [
        ['العميل', sale.customerName || sale.customerEmail || '—'],
        sale.customerPhone ? ['رقم الهاتف', String(sale.customerPhone)] : null,
        ['المنتج / الخدمة', sale.productName || '—'],
        ['المدة', `${sale.duration || 30} يوم`],
        ['تاريخ البدء', fmtDate(sale.date)],
        ['تاريخ الانتهاء', fmtDate(sale.expiryDate)],
    ].filter(Boolean);

    const headerH = 132;
    const rowH = 52;
    const priceBoxH = 96;
    const footerH = 96;
    const H = headerH + 24 + rows.length * rowH + 24 + priceBoxH + footerH;

    const canvas = document.createElement('canvas');
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    const FONT = "Cairo, 'Segoe UI', Tahoma, sans-serif";

    // خلفية
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // هيدر متدرّج
    const grad = ctx.createLinearGradient(0, 0, W, headerH);
    grad.addColorStop(0, '#4338ca');
    grad.addColorStop(1, '#7c3aed');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, headerH);

    ctx.fillStyle = '#ffffff';
    ctx.font = `800 34px ${FONT}`;
    ctx.fillText(store.name, W - 32, 58);
    ctx.font = `700 20px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('إيصال اشتراك', W - 32, 92);
    if (store.phone) {
        ctx.font = `600 16px ${FONT}`;
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText(`☎ ${store.phone}`, W - 32, 118);
    }
    // رقم الإيصال + التاريخ (يسار)
    ctx.textAlign = 'left';
    ctx.font = `700 15px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`#${sale.id || '—'}`, 32, 58);
    ctx.font = `600 14px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(new Date().toLocaleDateString('en-GB'), 32, 82);
    ctx.textAlign = 'right';

    // صفوف التفاصيل
    let y = headerH + 24;
    ctx.font = `600 18px ${FONT}`;
    rows.forEach(([label, value], i) => {
        if (i % 2 === 0) { ctx.fillStyle = '#f8fafc'; ctx.fillRect(24, y - 2, W - 48, rowH - 8); }
        ctx.fillStyle = '#94a3b8';
        ctx.font = `600 16px ${FONT}`;
        ctx.fillText(label, W - 40, y + 30);
        ctx.fillStyle = '#1e293b';
        ctx.font = `700 18px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.fillText(String(value), 40, y + 30);
        ctx.textAlign = 'right';
        y += rowH;
    });

    // صندوق السعر
    y += 8;
    const paid = sale.isPaid;
    const boxColor = paid ? '#ecfdf5' : '#fef2f2';
    const borderColor = paid ? '#10b981' : '#ef4444';
    ctx.fillStyle = boxColor;
    roundRect(ctx, 24, y, W - 48, priceBoxH, 16);
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    roundRect(ctx, 24, y, W - 48, priceBoxH, 16);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = `700 16px ${FONT}`;
    ctx.fillText('الإجمالي', W - 44, y + 34);
    ctx.fillStyle = paid ? '#047857' : '#b91c1c';
    ctx.font = `800 32px ${FONT}`;
    ctx.fillText(`${Number(sale.finalPrice || 0).toLocaleString()} ج.م`, W - 44, y + 72);

    // حالة الدفع (يسار)
    ctx.textAlign = 'left';
    ctx.font = `700 18px ${FONT}`;
    ctx.fillStyle = paid ? '#047857' : '#b91c1c';
    ctx.fillText(paid ? '✔ مدفوع بالكامل' : `متبقي ${Number(sale.remainingAmount || 0).toLocaleString()} ج.م`, 44, y + 44);
    if (sale.paymentMethod) {
        ctx.font = `600 14px ${FONT}`;
        ctx.fillStyle = '#64748b';
        ctx.fillText(sale.paymentMethod, 44, y + 70);
    }
    ctx.textAlign = 'right';

    // فوتر
    const fy = H - footerH;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(24, fy); ctx.lineTo(W - 24, fy); ctx.stroke();
    ctx.fillStyle = '#475569';
    ctx.font = `700 18px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(store.note, W / 2, fy + 42);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText('Service Hub', W / 2, fy + 70);

    return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

export function canvasToBlob(canvas) {
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
}

// حفظ الإيصال كصورة PNG
export async function downloadReceipt(sale, store) {
    const canvas = await renderReceiptCanvas(sale, store);
    const blob = await canvasToBlob(canvas);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${sale.id || Date.now()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// مشاركة الإيصال (على الموبايل بيفتح واتساب/التطبيقات مباشرة)
export async function shareReceipt(sale, store) {
    const canvas = await renderReceiptCanvas(sale, store);
    const blob = await canvasToBlob(canvas);
    const file = new File([blob], `receipt-${sale.id || Date.now()}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: 'إيصال اشتراك', text: `إيصال ${store?.name || ''}` });
            return true;
        } catch { return false; }
    }
    // fallback: تنزيل الصورة
    await downloadReceipt(sale, store);
    return false;
}
