import { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { salesAPI, walletsAPI } from '../services/api';

export default function Renewals() {
    useEffect(() => { window.scrollTo(0, 0); }, []);

    const { sales: ctxSales, products, wallets, refreshData } = useData();

    const [sales, setSales] = useState([]);
    const [activeTab, setActiveTab] = useState('renewals');
    const [visibleCount, setVisibleCount] = useState(15);

    // Renewal modals
    const [showRenewModal, setShowRenewModal] = useState(null);
    const [quickRenewing, setQuickRenewing] = useState(null);

    useEffect(() => {
        setSales(ctxSales);
    }, [ctxSales]);

    useEffect(() => { setVisibleCount(15); }, [activeTab]);

    const getDaysLeft = (expiryDate) => {
        if (!expiryDate) return 999;
        return Math.ceil((new Date(expiryDate) - new Date()) / 86400000);
    };

    // Analyze sales for alerts
    const alerts = useMemo(() => {
        const renewals = [];
        const expiring = [];
        const unpaid = [];

        sales.forEach(sale => {
            const daysLeft = getDaysLeft(sale.expiryDate);

            if (!sale.isPaid && Number(sale.remainingAmount) > 0) {
                unpaid.push({ ...sale, _daysLeft: daysLeft });
            }

            if (sale.expiryDate && daysLeft <= 0 && sale.renewal_stage !== 'renewed') {
                expiring.push({ ...sale, _daysLeft: daysLeft });
            }
            else if (sale.expiryDate && daysLeft > 0 && daysLeft <= 5 && sale.renewal_stage !== 'renewed') {
                renewals.push({ ...sale, _daysLeft: daysLeft });
            }
        });

        renewals.sort((a, b) => a._daysLeft - b._daysLeft);
        expiring.sort((a, b) => a._daysLeft - b._daysLeft);
        unpaid.sort((a, b) => Number(b.remainingAmount) - Number(a.remainingAmount));

        return { renewals, expiring, unpaid };
    }, [sales]);

    const currentList = useMemo(() => {
        if (activeTab === 'renewals') return alerts.renewals;
        if (activeTab === 'expired') return alerts.expiring;
        if (activeTab === 'unpaid') return alerts.unpaid;
        return [];
    }, [activeTab, alerts]);

    // تجديد سريع
    const quickRenew = async (alertItem) => {
        const saleId = alertItem.id;
        setQuickRenewing(saleId);

        const product = products.find(p => p.name === alertItem.productName);
        const duration = alertItem.duration || (product ? (product.duration || 30) : 30);
        const price = Number(alertItem.finalPrice) || (product ? Number(product.price) : 0);

        const newSale = {
            productName: alertItem.productName,
            customerName: alertItem.customerName || '',
            customerPhone: alertItem.customerPhone || '',
            customerEmail: alertItem.customerEmail || '',
            customerId: alertItem.customerId || '',
            contactChannel: alertItem.contactChannel || 'واتساب',
            finalPrice: price,
            originalPrice: alertItem.originalPrice || price,
            discount: alertItem.discount || 0,
            duration,
            expiryDate: new Date(Date.now() + duration * 86400000).toISOString(),
            isPaid: true,
            remainingAmount: 0,
            walletId: alertItem.walletId || '',
            walletName: alertItem.walletName || '',
            paymentMethod: alertItem.paymentMethod || '',
            notes: '',
            moderator: 'System (تجديد سريع)',
            fromInventory: false,
            assignedAccountEmail: '',
            assignedAccountId: null,
        };

        try {
            // Mark old sale as renewed
            const { supabase } = await import('../lib/supabase');
            await supabase.from('sales').update({ renewal_stage: 'renewed' }).eq('id', saleId);
            
            // Create new sale
            await salesAPI.create(newSale);

            // Deposit to wallet
            if (alertItem.walletId) {
                await walletsAPI.deposit(alertItem.walletId, price, `تجديد سريع — ${alertItem.productName} — ${alertItem.customerName || alertItem.customerEmail}`, 'تجديد', 'System');
            }

            setQuickRenewing(null);
            await refreshData();
        } catch (error) {
            console.error(error);
            setQuickRenewing(null);
            alert('حدث خطأ');
        }
    };

    // تجديد مع تعديل
    const handleRenewWithEdit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const sale = showRenewModal;
        const product = products.find(p => p.name === (fd.get('productName') || sale.productName));
        const duration = Number(fd.get('duration') || (product ? product.duration : 30) || 30);
        const finalPrice = Number(fd.get('finalPrice') || sale.finalPrice || 0);
        const isPaid = fd.get('isPaid') === 'on';
        const walletId = fd.get('walletId') || sale.walletId || '';
        const wallet = walletId ? wallets.find(w => String(w.id) === String(walletId)) : null;

        const newSale = {
            productName: fd.get('productName') || sale.productName,
            customerName: sale.customerName || '',
            customerPhone: sale.customerPhone || '',
            customerEmail: fd.get('customerEmail') || sale.customerEmail || '',
            customerId: sale.customerId || '',
            contactChannel: sale.contactChannel || 'واتساب',
            finalPrice,
            originalPrice: finalPrice,
            discount: 0,
            duration,
            expiryDate: new Date(Date.now() + duration * 86400000).toISOString(),
            isPaid,
            remainingAmount: isPaid ? 0 : Number(fd.get('remainingAmount') || finalPrice),
            walletId,
            walletName: wallet ? wallet.name : '',
            paymentMethod: wallet ? wallet.name : (sale.paymentMethod || ''),
            notes: fd.get('notes') || '',
            moderator: 'System (تجديد مع تعديل)',
            fromInventory: false,
            assignedAccountEmail: '',
            assignedAccountId: null,
        };

        try {
            const { supabase } = await import('../lib/supabase');
            await supabase.from('sales').update({ renewal_stage: 'renewed' }).eq('id', sale.id);
            await salesAPI.create(newSale);

            if (walletId && isPaid) {
                await walletsAPI.deposit(walletId, finalPrice, `تجديد — ${newSale.productName} — ${newSale.customerName || newSale.customerEmail}`, 'تجديد', 'System');
            }

            setShowRenewModal(null);
            await refreshData();
        } catch (error) {
            console.error(error);
            alert('حدث خطأ');
        }
    };

    // تعليم كمدفوع
    const markPaid = async (id) => {
        try {
            await salesAPI.togglePaid(id, true, 0);
            await refreshData();
        } catch (error) {
            console.error(error);
        }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '-';
    const getDisplayName = (sale) => sale.customerName || sale.customerEmail || 'عميل';

    return (
        <div className="space-y-6 animate-fade-in pb-20 font-sans text-slate-800">

            {/* Header */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-red-50 p-3 rounded-xl text-red-600 border border-red-100"><i className="fa-solid fa-bell text-xl"></i></div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-800">التنبيهات</h2>
                        <p className="text-slate-500 text-sm">متابعة التجديدات والمديونيات</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex flex-wrap gap-2">
                {[
                    { id: 'renewals', label: 'قرب التجديد', icon: 'fa-clock', count: alerts.renewals.length, color: 'orange' },
                    { id: 'expired', label: 'منتهية', icon: 'fa-calendar-xmark', count: alerts.expiring.length, color: 'red' },
                    { id: 'unpaid', label: 'مديونيات', icon: 'fa-hand-holding-dollar', count: alerts.unpaid.length, color: 'purple' },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? `bg-${tab.color}-50 text-${tab.color}-700 border border-${tab.color}-200 shadow-sm` : 'text-slate-500 hover:bg-slate-50'}`}>
                        <i className={`fa-solid ${tab.icon}`}></i>
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeTab === tab.id ? `bg-${tab.color}-200 text-${tab.color}-800` : 'bg-slate-200 text-slate-600'}`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentList.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400">
                        <i className="fa-solid fa-check-circle text-5xl mb-4 opacity-30 text-emerald-300"></i>
                        <p className="font-bold text-lg">لا توجد تنبيهات</p>
                        <p className="text-sm">كل شيء تمام 👌</p>
                    </div>
                ) : null}

                {/* تجديدات ومنتهية */}
                {(activeTab === 'renewals' || activeTab === 'expired') && currentList.slice(0, visibleCount).map(sale => (
                    <div key={sale.id} className={`bg-white p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden border-2 ${sale._daysLeft <= 0 ? 'border-red-200' : sale._daysLeft <= 2 ? 'border-orange-200' : 'border-yellow-200'}`}>
                        {/* Days badge */}
                        <div className={`absolute top-0 left-0 text-white text-[9px] px-3 py-1.5 font-bold rounded-br-xl ${sale._daysLeft <= 0 ? 'bg-red-600' : sale._daysLeft <= 2 ? 'bg-orange-600' : 'bg-yellow-500'}`}>
                            {sale._daysLeft <= 0 ? `منتهي منذ ${Math.abs(sale._daysLeft)} يوم` : `باقي ${sale._daysLeft} يوم`}
                        </div>

                        <div className="mt-6">
                            <h3 className="font-black text-slate-800 text-base truncate">{getDisplayName(sale)}</h3>
                            {sale.customerPhone && <p className="text-xs text-slate-400 font-mono dir-ltr text-right">{sale.customerPhone}</p>}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-bold border border-indigo-100">{sale.productName}</span>
                                <span className="text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-lg font-bold border border-slate-100">{sale.duration || 30} يوم</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-3 mt-4 text-xs border border-slate-100 space-y-1.5">
                            <div className="flex justify-between"><span className="text-slate-400">تاريخ البيع:</span><span className="font-bold text-slate-700">{formatDate(sale.date)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">تاريخ الانتهاء:</span><span className={`font-bold ${sale._daysLeft <= 0 ? 'text-red-600' : 'text-orange-600'}`}>{formatDate(sale.expiryDate)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">السعر:</span><span className="font-bold text-slate-700">{Number(sale.finalPrice).toLocaleString()} ج.م</span></div>
                            {sale.paymentMethod && <div className="flex justify-between"><span className="text-slate-400">الدفع:</span><span className="font-bold text-emerald-600">{sale.paymentMethod}</span></div>}
                        </div>

                        {/* Renewal Action Buttons */}
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={(e) => { e.stopPropagation(); quickRenew(sale); }}
                                disabled={quickRenewing === sale.id}
                                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 flex items-center justify-center gap-1.5 disabled:opacity-60"
                            >
                                {quickRenewing === sale.id ? (
                                    <><i className="fa-solid fa-spinner fa-spin"></i> جاري التجديد...</>
                                ) : (
                                    <><i className="fa-solid fa-bolt"></i> تجديد سريع</>
                                )}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowRenewModal(sale); }}
                                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 flex items-center justify-center gap-1.5"
                            >
                                <i className="fa-solid fa-pen-to-square"></i> تجديد مع تعديل
                            </button>
                        </div>
                    </div>
                ))}

                {/* مديونيات */}
                {activeTab === 'unpaid' && currentList.slice(0, visibleCount).map(sale => (
                    <div key={sale.id} className="bg-white p-5 rounded-2xl border border-purple-200 shadow-sm hover:shadow-lg transition-all duration-300 border-r-4 border-r-purple-500">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-black text-slate-800 text-base truncate">{getDisplayName(sale)}</h3>
                                {sale.customerPhone && <p className="text-xs text-slate-400 font-mono dir-ltr text-right">{sale.customerPhone}</p>}
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-bold border border-indigo-100 mt-1 inline-block">{sale.productName}</span>
                            </div>
                            <div className="bg-purple-50 px-4 py-2 rounded-xl text-right border border-purple-100">
                                <span className="block text-[10px] text-purple-500 font-bold uppercase">متبقي</span>
                                <span className="text-lg font-black text-purple-700">{Number(sale.remainingAmount).toLocaleString()} <span className="text-xs">ج.م</span></span>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs border border-slate-100 space-y-1.5">
                            <div className="flex justify-between"><span className="text-slate-400">السعر الكلي:</span><span className="font-bold text-slate-700">{Number(sale.finalPrice).toLocaleString()} ج.م</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">تاريخ البيع:</span><span className="font-bold text-slate-700">{formatDate(sale.date)}</span></div>
                            {sale.paymentMethod && <div className="flex justify-between"><span className="text-slate-400">المحفظة:</span><span className="font-bold text-emerald-600">{sale.paymentMethod}</span></div>}
                        </div>
                        <button onClick={() => markPaid(sale.id)} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-purple-100 transition-all flex items-center justify-center gap-2">
                            <i className="fa-solid fa-hand-holding-dollar"></i> تعليم كمدفوع
                        </button>
                    </div>
                ))}
            </div>

            {/* Load More */}
            {visibleCount < currentList.length && (
                <div className="flex justify-center mt-8">
                    <button onClick={() => setVisibleCount(p => p + 15)} className="bg-white border-2 border-indigo-100 text-indigo-600 px-10 py-3 rounded-full font-bold hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm">
                        عرض المزيد ({currentList.length - visibleCount})
                    </button>
                </div>
            )}

            {/* ============ RENEW WITH EDIT MODAL ============ */}
            {showRenewModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowRenewModal(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 bg-gradient-to-r from-blue-700 to-indigo-600 text-white flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <i className="fa-solid fa-pen-to-square"></i> تجديد مع تعديل البيانات
                            </h3>
                            <button onClick={() => setShowRenewModal(null)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition"><i className="fa-solid fa-xmark text-lg"></i></button>
                        </div>
                        <form onSubmit={handleRenewWithEdit} className="p-8 overflow-y-auto space-y-5" key={showRenewModal.id}>
                            {/* Original data */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2"><i className="fa-solid fa-user ml-1"></i> البيانات الأصلية</p>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div><span className="text-slate-400">العميل:</span> <span className="font-bold text-slate-700">{getDisplayName(showRenewModal)}</span></div>
                                    <div><span className="text-slate-400">المنتج:</span> <span className="font-bold text-slate-700">{showRenewModal.productName}</span></div>
                                    <div><span className="text-slate-400">السعر:</span> <span className="font-bold text-slate-700">{Number(showRenewModal.finalPrice).toLocaleString()} ج.م</span></div>
                                    <div><span className="text-slate-400">المدة:</span> <span className="font-bold text-slate-700">{showRenewModal.duration || 30} يوم</span></div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-extrabold text-slate-800 mb-2">المنتج</label>
                                <select name="productName" defaultValue={showRenewModal.productName} className="w-full bg-white border-2 border-slate-200 rounded-xl p-3.5 font-bold text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all">
                                    {products.map(p => (
                                        <option key={p.id} value={p.name}>{p.name} — {p.price} ج.م</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-extrabold text-slate-800 mb-2">إيميل العميل</label>
                                <input name="customerEmail" defaultValue={showRenewModal.customerEmail} className="w-full bg-white border-2 border-slate-200 rounded-xl p-3.5 font-bold text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all font-mono" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-extrabold text-slate-800 mb-2">السعر الجديد (ج.م)</label>
                                    <input name="finalPrice" type="number" defaultValue={showRenewModal.finalPrice} className="w-full bg-white border-2 border-emerald-200 rounded-xl p-3.5 font-bold text-sm focus:ring-4 focus:ring-emerald-100 focus:border-emerald-600 outline-none transition-all text-emerald-700" min="0" />
                                </div>
                                <div>
                                    <label className="block text-sm font-extrabold text-slate-800 mb-2">المدة (أيام)</label>
                                    <input name="duration" type="number" defaultValue={showRenewModal.duration || 30} className="w-full bg-white border-2 border-slate-200 rounded-xl p-3.5 font-bold text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all" min="1" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-extrabold text-slate-800 mb-2">وسيلة الدفع (المحفظة)</label>
                                <select name="walletId" defaultValue={showRenewModal.walletId || ""} className="w-full bg-white border-2 border-emerald-200 rounded-xl p-3.5 font-bold text-sm focus:ring-4 focus:ring-emerald-100 focus:border-emerald-600 outline-none transition-all">
                                    <option value="">بدون محفظة</option>
                                    {wallets.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>

                            <label className="flex items-center gap-3 p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-colors">
                                <input type="checkbox" name="isPaid" defaultChecked={true} className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 border-emerald-300" />
                                <span className="text-sm font-bold text-emerald-800">مدفوع بالكامل ✅</span>
                            </label>

                            <div>
                                <label className="block text-sm font-extrabold text-slate-800 mb-2">المبلغ المتبقي</label>
                                <input name="remainingAmount" type="number" defaultValue="0" className="w-full bg-white border-2 border-red-200 rounded-xl p-3.5 font-bold text-sm focus:ring-4 focus:ring-red-100 focus:border-red-500 outline-none transition-all text-red-600" min="0" />
                            </div>

                            <div>
                                <label className="block text-sm font-extrabold text-slate-800 mb-2">ملاحظات (اختياري)</label>
                                <textarea name="notes" className="w-full bg-white border-2 border-slate-200 rounded-xl p-3.5 font-bold text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all h-20 resize-none" placeholder="أي ملاحظات..."></textarea>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-200">
                                <button type="button" onClick={() => setShowRenewModal(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-white border-2 border-slate-200 hover:bg-slate-50 transition">إلغاء</button>
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition flex items-center justify-center gap-2">
                                    <i className="fa-solid fa-check"></i> تأكيد التجديد
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}