import { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import { expensesAPI, walletsAPI } from '../services/api';

export default function Expenses () {
    useEffect(() => { window.scrollTo(0, 0); }, []);

    const { expenses: ctxExpenses, wallets: ctxWallets, refreshData } = useData();

    const [expenses, setExpenses] = useState([]);
    const [wallets, setWallets] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);

    useEffect(() => {
        setExpenses(ctxExpenses);
        setWallets(ctxWallets);
    }, [ctxExpenses, ctxWallets]);

    // خصم من المحفظة
    const deductFromWallet = async (walletId, amount, description) => {
        if (!walletId) return;
        await walletsAPI.withdraw(walletId, amount, description, 'مصروفات', 'System');
    };

    // رد المبلغ للمحفظة (عند الحذف)
    const refundToWallet = async (walletId, amount) => {
        if (!walletId) return;
        await walletsAPI.deposit(walletId, amount, 'استرداد مصروف محذوف', 'استرداد', 'System');
    };

    // إضافة مصروف
    const handleAddExpense = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // خصم من المحفظة
        if (data.walletId && data.walletId !== '') {
            const wallet = wallets.find(w => String(w.id) === String(data.walletId));
            if (wallet && Number(data.amount) > wallet.balance) {
                alert(`رصيد المحفظة (${wallet.name}) غير كافي! الرصيد: ${wallet.balance}`);
                return;
            }
            await deductFromWallet(data.walletId, data.amount, `${data.type} - ${data.description || ''}`);
            data.walletName = wallet?.name || '';
        }

        try {
            await expensesAPI.create(data);
            alert("تم تسجيل المصروف وخصمه من المحفظة ✅");
            setShowAddModal(false);
            await refreshData();
        } catch (error) {
            console.error(error);
            alert('حدث خطأ');
        }
    };

    // تعديل مصروف
    const handleUpdateExpense = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            await expensesAPI.update(editingExpense.id, data);
            alert("تم تعديل المصروف بنجاح ✅");
            setEditingExpense(null);
            await refreshData();
        } catch (error) {
            console.error(error);
        }
    };

    // حذف مصروف (ورد المبلغ للمحفظة)
    const handleDelete = async (id) => {
        if (!confirm("حذف هذا المصروف؟ (سيتم رد المبلغ للمحفظة إن وُجدت)")) return;
        const expense = expenses.find(e => e.id === id);
        if (expense && (expense.walletId || expense.wallet_id)) {
            await refundToWallet(expense.walletId || expense.wallet_id, expense.amount);
        }
        try {
            await expensesAPI.delete(id);
            await refreshData();
        } catch (error) {
            console.error(error);
        }
    };

    const getWalletName = (walletId) => {
        if (!walletId) return '-';
        const w = wallets.find(w => String(w.id) === String(walletId));
        return w ? w.name : '-';
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20 font-sans text-slate-800">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-800">سجل المصروفات</h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">متابعة دقيقة للمصروفات التشغيلية والإعلانات</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="bg-rose-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                    <i className="fa-solid fa-plus text-lg"></i> إضافة مصروف
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-right whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-xs tracking-wider">
                            <tr>
                                <th className="p-5">التاريخ</th>
                                <th className="p-5">النوع</th>
                                <th className="p-5">المحفظة</th>
                                <th className="p-5">الوصف</th>
                                <th className="p-5 text-left pl-8">المبلغ</th>
                                <th className="p-5 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {expenses.length === 0 ? (
                                <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-bold border-2 border-dashed border-slate-100 rounded-xl m-4 block">لا توجد مصروفات مسجلة</td></tr>
                            ) : (
                                expenses.map(exp => (
                                    <tr key={exp.id} className="hover:bg-slate-50/80 transition duration-150 group">
                                        <td className="p-5 font-mono text-slate-500 font-bold text-xs">{new Date(exp.date).toLocaleDateString('en-GB')}</td>
                                        <td className="p-5">
                                            <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold border border-slate-200">{exp.type}</span>
                                        </td>
                                        <td className="p-5">
                                            {(exp.walletId || exp.wallet_id) ? (
                                                <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-200">
                                                    <i className="fa-solid fa-wallet ml-1 text-[10px]"></i>{exp.walletName || exp.wallet_name || getWalletName(exp.walletId || exp.wallet_id)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="p-5 text-slate-600 font-medium max-w-xs truncate">{exp.description || '-'}</td>
                                        <td className="p-5 text-left pl-8 font-black text-rose-600 dir-ltr text-base">-{Number(exp.amount).toLocaleString()} <span className="text-xs text-rose-400 font-bold">EGP</span></td>
                                        <td className="p-5 text-center flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                            <button onClick={() => setEditingExpense(exp)} className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-2.5 rounded-xl transition border border-blue-100 shadow-sm" title="تعديل"><i className="fa-solid fa-pen"></i></button>
                                            <button onClick={() => handleDelete(exp.id)} className="text-rose-600 bg-rose-50 hover:bg-rose-100 p-2.5 rounded-xl transition border border-rose-100 shadow-sm" title="حذف"><i className="fa-solid fa-trash"></i></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-6 bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md">
                            <h3 className="text-xl font-bold flex items-center gap-2"><i className="fa-solid fa-money-bill-transfer"></i> تسجيل مصروف</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition"><i className="fa-solid fa-xmark text-lg"></i></button>
                        </div>
                        <div className="p-8 bg-slate-50/50">
                            <form onSubmit={handleAddExpense} className="space-y-5">
                                <div>
                                    <label className="label-style">نوع المصروف</label>
                                    <div className="relative">
                                        <select name="type" className="input-style appearance-none" required>
                                            <option value="">اختر النوع...</option>
                                            <option value="إعلان">إعلان (Ads)</option>
                                            <option value="اشتراكات تطبيقات">أدوات واشتراكات</option>
                                            <option value="رواتب">رواتب</option>
                                            <option value="مصاريف أخرى">نثريات / أخرى</option>
                                        </select>
                                        <i className="fa-solid fa-chevron-down absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                                    </div>
                                </div>

                                {/* اختيار المحفظة */}
                                <div>
                                    <label className="label-style">وسيلة الدفع (المحفظة)</label>
                                    <div className="relative">
                                        <select name="walletId" className="input-style appearance-none">
                                            <option value="">بدون محفظة (يدوي)</option>
                                            {wallets.map(w => (
                                                <option key={w.id} value={w.id}>{w.name} — (رصيد: {Number(w.balance).toLocaleString()} {w.currency || 'EGP'})</option>
                                            ))}
                                        </select>
                                        <i className="fa-solid fa-wallet absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none"></i>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="label-style">المبلغ</label>
                                        <div className="relative">
                                            <input type="number" step="0.01" name="amount" className="input-style pl-12 text-rose-600" placeholder="0.00" required />
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">EGP</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label-style">التاريخ</label>
                                        <input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} className="input-style" required />
                                    </div>
                                </div>
                                <div>
                                    <label className="label-style">الوصف (اختياري)</label>
                                    <textarea name="description" className="input-style h-24 resize-none" placeholder="تفاصيل إضافية..."></textarea>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border-2 border-slate-200 hover:bg-slate-100 transition shadow-sm">إلغاء</button>
                                    <button type="submit" className="bg-rose-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-rose-700 shadow-lg shadow-rose-200 transition hover:-translate-y-0.5">حفظ</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingExpense && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-6 bg-white border-b border-slate-100">
                            <h3 className="text-xl font-extrabold text-slate-800">تعديل المصروف</h3>
                            <button onClick={() => setEditingExpense(null)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-full transition"><i className="fa-solid fa-xmark text-lg"></i></button>
                        </div>
                        <div className="p-8 bg-slate-50/50">
                            <form onSubmit={handleUpdateExpense} className="space-y-5">
                                <div>
                                    <label className="label-style">نوع المصروف</label>
                                    <div className="relative">
                                        <select name="type" defaultValue={editingExpense.type} className="input-style appearance-none" required>
                                            <option value="إعلان">إعلان (Ads)</option>
                                            <option value="اشتراكات تطبيقات">أدوات واشتراكات</option>
                                            <option value="رواتب">رواتب</option>
                                            <option value="مصاريف أخرى">نثريات / أخرى</option>
                                        </select>
                                        <i className="fa-solid fa-chevron-down absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="label-style">المبلغ</label>
                                        <div className="relative">
                                            <input type="number" step="0.01" name="amount" defaultValue={editingExpense.amount} className="input-style pl-12 text-rose-600" required />
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">EGP</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label-style">التاريخ</label>
                                        <input type="date" name="date" defaultValue={editingExpense.date ? editingExpense.date.split(' ')[0] : ''} className="input-style" required />
                                    </div>
                                </div>
                                <div>
                                    <label className="label-style">الوصف</label>
                                    <textarea name="description" defaultValue={editingExpense.description} className="input-style h-24 resize-none"></textarea>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                                    <button type="button" onClick={() => setEditingExpense(null)} className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border-2 border-slate-200 hover:bg-slate-100 transition shadow-sm">إلغاء</button>
                                    <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition hover:-translate-y-0.5">حفظ التعديلات</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .label-style { @apply block text-sm font-extrabold text-slate-800 mb-2 ml-1 tracking-wide; }
                .input-style { @apply w-full bg-white border-2 border-slate-300 text-slate-900 text-sm font-bold rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 block p-3.5 transition-all outline-none placeholder-slate-400 shadow-sm; }
                .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            `}
            </style>
        </div>
    );
}