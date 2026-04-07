import { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { problemsAPI } from '../services/api';

export default function Problems () {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const { problems, sales, accounts, refreshData, renewalTarget, setRenewalTarget } = useData();

    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // State للقيم داخل المودال
    const [selectedSaleId, setSelectedSaleId] = useState('');
    const [replacementAccountId, setReplacementAccountId] = useState('');
    const [description, setDescription] = useState('');

    // الاستماع للبيانات القادمة من صفحة العملاء
    useEffect(() => {
        if (renewalTarget && renewalTarget.isProblemRequest) {
            setSelectedSaleId(renewalTarget.id);
            setShowModal(true);
            setRenewalTarget(null);
        }
    }, [renewalTarget]);

    // دالة لفلترة المشاكل للعرض
    const filteredProblems = useMemo(() => {
        return (problems || []).filter(p =>
            (p.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.customerName && p.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [problems, searchTerm]);

    // دالة لحفظ المشكلة
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedSaleId) return alert("يجب اختيار الأوردر");
        if (!description) return alert("يجب كتابة وصف للمشكلة");

        const sale = sales.find(s => s.id == selectedSaleId);

        try {
            await problemsAPI.create({
                saleId: selectedSaleId,
                customerName: sale?.customerName || '',
                phoneNumber: sale?.customerPhone || '',
                productName: sale?.productName || '',
                description,
                replacementAccountId: replacementAccountId || null,
            });

            alert("تم تسجيل المشكلة بنجاح ✅");
            setShowModal(false);
            setSelectedSaleId('');
            setReplacementAccountId('');
            setDescription('');
            refreshData();
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء التسجيل");
        }
    };

    // دالة لجلب تفاصيل الأوردر المختار عشان نعرف المنتج ونعرض بدائل مناسبة
    const selectedSaleDetails = useMemo(() => {
        return sales.find(s => s.id == selectedSaleId);
    }, [selectedSaleId, sales]);

    return (
        <div className="space-y-8 animate-fade-in pb-20 font-sans text-slate-800">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-800">سجل المشاكل</h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">متابعة وحل مشكلات العملاء</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <input
                            type="text"
                            placeholder="بحث في المشاكل..."
                            className="w-full bg-slate-50 border border-slate-200 p-3 pr-10 rounded-xl outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <i className="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedSaleId('');
                            setReplacementAccountId('');
                            setDescription('');
                            setShowModal(true);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm px-6 py-3 shadow-lg shadow-red-200 transition-all flex items-center gap-2"
                    >
                        <i className="fa-solid fa-triangle-exclamation"></i> تسجيل مشكلة
                    </button>
                </div>
            </div>

            {/* Problems Grid */}
            <div className="grid gap-4">
                {filteredProblems.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                        <i className="fa-solid fa-check-circle text-4xl mb-4 opacity-50 text-emerald-500"></i>
                        <p className="font-bold">لا توجد مشاكل مسجلة</p>
                    </div>
                ) : (
                    filteredProblems.map(prob => (
                        <div key={prob.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-red-500"></div>

                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pl-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-lg text-slate-800">{prob.customerName || 'عميل غير معروف'}</h4>
                                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 font-mono">{prob.phoneNumber}</span>
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium mb-2 flex items-center gap-2">
                                        <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100 text-xs font-bold">{prob.productName}</span>
                                        <span className="text-slate-300">•</span>
                                        <span className="font-mono text-xs">{new Date(prob.date).toLocaleDateString('ar-EG')}</span>
                                    </p>
                                    <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm leading-relaxed max-w-2xl">
                                        {prob.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-8 transform scale-100 transition-all flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h3 className="text-xl font-extrabold text-red-600 flex items-center gap-2">
                                <i className="fa-solid fa-triangle-exclamation"></i> تسجيل مشكلة جديدة
                            </h3>
                            <button onClick={() => setShowModal(false)} className="bg-slate-100 p-2.5 rounded-full text-slate-500 hover:bg-slate-200 transition"><i className="fa-solid fa-xmark text-lg"></i></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto custom-scrollbar pr-2">

                            {/* 1. اختيار الأوردر */}
                            <div>
                                <label className="block text-sm font-extrabold text-slate-800 mb-2 ml-1">الأوردر المتضرر</label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-white border-2 border-slate-200 text-slate-900 text-sm font-bold rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-500 block p-3.5 transition-all outline-none appearance-none"
                                        value={selectedSaleId}
                                        onChange={(e) => setSelectedSaleId(e.target.value)}
                                        required
                                    >
                                        <option value="">-- اختر العميل / الأوردر --</option>
                                        {sales.sort((a, b) => new Date(b.date) - new Date(a.date)).map(sale => (
                                            <option key={sale.id} value={sale.id}>
                                                {sale.customerName} - {sale.productName} ({new Date(sale.date).toLocaleDateString('en-GB')})
                                            </option>
                                        ))}
                                    </select>
                                    <i className="fa-solid fa-chevron-down absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                                </div>
                            </div>

                            {/* 2. اختيار التعويض (تم إضافة الفلتر هنا 🔥) */}
                            {selectedSaleId && (
                                <div className="animate-fade-in">
                                    <label className="block text-sm font-extrabold text-slate-800 mb-2 ml-1">
                                        تعويض بحساب جديد <span className="text-slate-400 font-normal text-xs">(اختياري)</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-slate-50 border-2 border-slate-200 text-slate-700 text-sm font-bold rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 block p-3.5 transition-all outline-none appearance-none"
                                            value={replacementAccountId}
                                            onChange={(e) => setReplacementAccountId(e.target.value)}
                                        >
                                            <option value="">-- بدون تعويض (تسجيل المشكلة فقط) --</option>

                                            {/* 🔥🔥🔥 الفلتر المعدل حسب الطلب 🔥🔥🔥 */}
                                            {accounts
                                                .filter(a => {
                                                    // 1. نفس المنتج
                                                    const isMatchingProduct = a.productName === selectedSaleDetails?.productName;
                                                    // 2. الحالة متاح (available)
                                                    const isAvailable = a.status === 'available';
                                                    // 3. التاريخ غير منتهي
                                                    const isExpired = a.expiry_date && new Date(a.expiry_date) < new Date();
                                                    // 4. لم يتخطى الحد الأقصى (لغير الـ Lifetime)
                                                    const isLimitReached = a.allowed_uses != -1 && Number(a.current_uses) >= Number(a.allowed_uses);

                                                    // تصفية صارمة: لازم يكون نفس المنتج + متاح + غير منتهي + فيه رصيد استخدام
                                                    return isMatchingProduct && isAvailable && !isExpired && !isLimitReached;
                                                })
                                                .map(a => (
                                                    <option key={a.id} value={a.id}>
                                                        {a.email} (متبقي: {a.allowed_uses == -1 ? '∞' : a.allowed_uses - a.current_uses})
                                                    </option>
                                                ))
                                            }
                                        </select>
                                        <i className="fa-solid fa-gift absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                                    </div>
                                    {replacementAccountId && (
                                        <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1">
                                            <i className="fa-solid fa-check-circle"></i> سيتم إرسال هذا الحساب للعميل وحرق القديم.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* 3. الوصف */}
                            <div>
                                <label className="block text-sm font-extrabold text-slate-800 mb-2 ml-1">تفاصيل المشكلة</label>
                                <textarea
                                    className="w-full bg-white border-2 border-slate-200 text-slate-900 text-sm font-bold rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-500 block p-3.5 transition-all outline-none h-32 resize-none"
                                    placeholder="اكتب وصف المشكلة هنا..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    required
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-red-600 text-white py-3.5 rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition hover:-translate-y-0.5 flex justify-center items-center gap-2"
                            >
                                <i className="fa-solid fa-paper-plane"></i> حفظ وتسجيل
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            `}</style>
        </div>
    );
}