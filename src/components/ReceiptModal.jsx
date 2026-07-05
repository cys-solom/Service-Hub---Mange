import { useState, useEffect, useRef } from 'react';
import { renderReceiptCanvas, downloadReceipt, shareReceipt, getStoreInfo, saveStoreInfo } from '../utils/receipt';

// مودال معاينة الإيصال + تنزيل/مشاركة + تعديل بيانات المتجر
export default function ReceiptModal({ sale, onClose }) {
    const [store, setStore] = useState(getStoreInfo());
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState('');
    const previewRef = useRef(null);

    // ارسم المعاينة
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const canvas = await renderReceiptCanvas(sale, store);
            if (cancelled || !previewRef.current) return;
            previewRef.current.innerHTML = '';
            canvas.style.width = '100%';
            canvas.style.height = 'auto';
            canvas.style.borderRadius = '12px';
            previewRef.current.appendChild(canvas);
        })();
        return () => { cancelled = true; };
    }, [sale, store]);

    const persistStore = (patch) => {
        const next = { ...store, ...patch };
        setStore(next);
        saveStoreInfo(next);
    };

    const handleDownload = async () => { setBusy('download'); try { await downloadReceipt(sale, store); } finally { setBusy(''); } };
    const handleShare = async () => { setBusy('share'); try { await shareReceipt(sale, store); } finally { setBusy(''); } };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 bg-gradient-to-r from-indigo-700 to-violet-600 text-white flex justify-between items-center">
                    <h3 className="text-lg font-bold flex items-center gap-2"><i className="fa-solid fa-receipt"></i> إيصال الاشتراك</h3>
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => setEditing(v => !v)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition" title="تعديل بيانات المتجر"><i className="fa-solid fa-gear text-sm"></i></button>
                        <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition"><i className="fa-solid fa-xmark text-lg"></i></button>
                    </div>
                </div>

                {editing && (
                    <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-2.5">
                        <p className="text-[11px] font-black text-slate-400 uppercase">بيانات المتجر (بتتحفظ)</p>
                        <input value={store.name} onChange={e => persistStore({ name: e.target.value })} placeholder="اسم المتجر"
                            className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-indigo-400" />
                        <input value={store.phone} onChange={e => persistStore({ phone: e.target.value })} placeholder="رقم الهاتف"
                            className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-indigo-400 dir-ltr text-right" />
                        <input value={store.note} onChange={e => persistStore({ note: e.target.value })} placeholder="رسالة الشكر بالأسفل"
                            className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-indigo-400" />
                    </div>
                )}

                <div className="p-4 overflow-y-auto flex-1 bg-slate-100/50">
                    <div ref={previewRef} className="shadow-lg rounded-xl overflow-hidden" />
                </div>

                <div className="p-4 border-t border-slate-100 flex gap-2 bg-white">
                    <button onClick={handleShare} disabled={!!busy}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-60 text-sm">
                        {busy === 'share' ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-brands fa-whatsapp text-base"></i>}
                        مشاركة / واتساب
                    </button>
                    <button onClick={handleDownload} disabled={!!busy}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-60 text-sm">
                        {busy === 'download' ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-download"></i>}
                        تنزيل صورة
                    </button>
                </div>
            </div>

            <style>{`
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
