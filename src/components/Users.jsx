import { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';

// قائمة الصلاحيات
const PERMISSIONS_LIST = [
    { id: 'dashboard', label: 'الرئيسية (Dashboard)' },
    { id: 'attendance', label: 'الحضور (Attendance)', default: true },
    { id: 'sales', label: 'المبيعات (Sales)' },
    { id: 'clients', label: 'العملاء (Clients)' },
    { id: 'accounts', label: 'المخزون (Accounts)' },
    { id: 'expenses', label: 'المصروفات (Expenses)' },
    { id: 'reports', label: 'التقارير (Reports)' },
    { id: 'renewals', label: 'التنبيهات (Renewals)' },
    { id: 'view_cost', label: 'عرض التكلفة (View Cost)' },
    { id: 'manage_attendance', label: 'إدارة الحضور والرواتب (Manage Attendance)' },
];

export default function Users () {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await usersAPI.getAll();
            setUsers(data);
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const permissions = PERMISSIONS_LIST.filter(p => formData.get(`perm_${p.id}`) === 'on').map(p => p.id);

        const data = {
            id: currentUser?.id,
            username: formData.get('username'),
            password: formData.get('password'),
            base_salary: formData.get('base_salary'),
            vodafone_cash: formData.get('vodafone_cash'),
            permissions: permissions
        };

        try {
            await usersAPI.save(data);
            setShowModal(false);
            fetchUsers();
        } catch (error) {
            console.error(error);
            alert('حدث خطأ أثناء الحفظ');
        }
    };

    const handleDelete = async (id) => {
        if (confirm('حذف المستخدم؟')) {
            try {
                await usersAPI.delete(id);
                fetchUsers();
            } catch (error) {
                console.error(error);
            }
        }
    };

    if (loading) return <div className="text-center p-10 text-slate-500">جاري تحميل المستخدمين...</div>;

    return (
        <div className="space-y-8 animate-fade-in pb-20 font-sans text-slate-800">

            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-800">المستخدمين والصلاحيات</h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">إدارة فريق العمل وتحديد أدوارهم</p>
                </div>
                <button
                    onClick={() => { setCurrentUser(null); setShowModal(true); }}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                    <i className="fa-solid fa-user-plus text-lg"></i> إضافة مستخدم
                </button>
            </div>

            {/* Users Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map(u => (
                    <div key={u.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>

                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-100 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border border-slate-200 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                                    <i className="fa-solid fa-user-shield"></i>
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-lg text-slate-800">{u.username}</h3>
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${u.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                        {u.role}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        const perms = Array.isArray(u.permissions) ? u.permissions : JSON.parse(u.permissions || '[]');
                                        setCurrentUser({ ...u, permissions: perms });
                                        setShowModal(true);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition"
                                    title="تعديل البيانات"
                                >
                                    <i className="fa-solid fa-pen"></i>
                                </button>
                                {u.role !== 'admin' && (
                                    <button
                                        onClick={() => handleDelete(u.id)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 transition"
                                        title="حذف المستخدم"
                                    >
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                            <p className="text-xs text-slate-400 mb-3 font-bold uppercase tracking-wider flex items-center gap-2">
                                <i className="fa-solid fa-key"></i> الصلاحيات الممنوحة
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {(() => {
                                    const perms = Array.isArray(u.permissions) ? u.permissions : JSON.parse(u.permissions || '[]');
                                    if (perms.includes('all')) {
                                        return (
                                            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-100 w-full text-center">
                                                <i className="fa-solid fa-check-circle ml-1"></i> صلاحية كاملة (Admin)
                                            </span>
                                        );
                                    }
                                    return perms.map(p => {
                                        const label = PERMISSIONS_LIST.find(pl => pl.id === p)?.label.split(' ')[0] || p;
                                        return (
                                            <span key={p} className="bg-slate-50 text-slate-600 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                                                <i className="fa-solid fa-check text-[8px] text-indigo-500"></i> {label}
                                            </span>
                                        );
                                    });
                                })()}
                                {(() => {
                                    const perms = Array.isArray(u.permissions) ? u.permissions : JSON.parse(u.permissions || '[]');
                                    return perms.length === 0 && <span className="text-slate-400 text-xs italic">لا توجد صلاحيات</span>;
                                })()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- Modal: إضافة/تعديل مستخدم --- */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
                        <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-700 text-white flex justify-between items-center shadow-md z-10">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <i className={`fa-solid ${currentUser ? 'fa-user-pen' : 'fa-user-plus'}`}></i>
                                {currentUser ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition text-white/80 hover:text-white">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar bg-slate-50/50">
                            <form id="userForm" onSubmit={handleSave} className="space-y-6">
                                <div>
                                    <label className="label-style">اسم المستخدم</label>
                                    <div className="relative">
                                        <input name="username" defaultValue={currentUser?.username} className="input-style pl-10" required placeholder="Example: admin" />
                                        <i className="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                    </div>
                                </div>

                                <div>
                                    <label className="label-style">كلمة المرور <span className="text-slate-400 font-normal text-xs">{currentUser && '(اتركها فارغة لعدم التغيير)'}</span></label>
                                    <div className="relative">
                                        <input name="password" type="password" className="input-style pl-10" placeholder={currentUser ? '••••••••' : 'Password'} required={!currentUser} />
                                        <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label-style">الراتب الأساسي</label>
                                        <input type="number" name="base_salary" defaultValue={currentUser?.base_salary} className="input-style" placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className="label-style">رقم فودافون كاش</label>
                                        <input type="text" name="vodafone_cash" defaultValue={currentUser?.vodafone_cash} className="input-style" placeholder="010xxxxxxx" />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="label-style mb-3 block">تحديد الصلاحيات</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {PERMISSIONS_LIST.map(perm => {
                                            const isChecked = currentUser
                                                ? currentUser.permissions?.includes(perm.id)
                                                : perm.default || false;

                                            return (
                                                <label key={perm.id} className="flex items-center gap-3 p-3 bg-white border-2 border-slate-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:shadow-sm transition-all group">
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            name={`perm_${perm.id}`}
                                                            defaultChecked={isChecked}
                                                            className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-indigo-600 checked:bg-indigo-600 hover:border-indigo-400"
                                                        />
                                                        <i className="fa-solid fa-check absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 text-xs pointer-events-none"></i>
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-600 group-hover:text-indigo-700 transition-colors select-none">{perm.label}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 z-10">
                            <button onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-50 border-2 border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm">إلغاء</button>
                            <button type="submit" form="userForm" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                                <i className="fa-solid fa-check"></i> حفظ البيانات
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS Styles Injection */}
            <style>{`
                .label-style { @apply block text-sm font-extrabold text-slate-800 mb-2 ml-1 tracking-wide; }
                .input-style { @apply w-full bg-white border-2 border-slate-200 text-slate-900 text-sm font-bold rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 block p-3.5 transition-all outline-none placeholder-slate-400 shadow-sm; }
                .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            `}
            </style>
        </div>
    );
}