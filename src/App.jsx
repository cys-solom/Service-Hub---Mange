import { useState, useEffect, lazy, Suspense } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmProvider } from './components/ConfirmDialog';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import telegram from './services/telegram';
import { recurringExpensesAPI } from './services/api';

// Lazy load heavy components — يحمّلها بس لما المستخدم يحتاجها
const Dashboard = lazy(() => import('./components/Dashboard'));
const Sales = lazy(() => import('./components/Sales'));
const Accounts = lazy(() => import('./components/Accounts'));
const Shifts = lazy(() => import('./components/Shifts'));
const Reports = lazy(() => import('./components/Reports'));
const Expenses = lazy(() => import('./components/Expenses'));
const Renewals = lazy(() => import('./components/Renewals'));
const Problems = lazy(() => import('./components/Problems'));
const Clients = lazy(() => import('./components/Clients'));
const Wallets = lazy(() => import('./components/Wallets'));
const Users = lazy(() => import('./components/Users'));
const Products = lazy(() => import('./components/Products'));
const BotSettings = lazy(() => import('./components/BotSettings'));
const Employees = lazy(() => import('./components/Employees'));
const AuditLog = lazy(() => import('./components/AuditLog'));
const Attendance = lazy(() => import('./components/Attendance'));

// Lazy load new overlay components
const GlobalSearch = lazy(() => import('./components/GlobalSearch'));
const NotificationCenter = lazy(() => import('./components/NotificationCenter'));

// Loading spinner component
const PageLoader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-sm font-bold text-slate-400">جاري التحميل...</p>
    </div>
  </div>
);

// --- Notification count hook (lightweight, outside NotificationCenter) ---
function useQuickNotifCount() {
  const { sales, accounts, sections } = useData();
  let count = 0;
  const today = new Date();

  try {
    sales.forEach(sale => {
      if (sale.renewal_stage === 'renewed') return;
      if (!sale.isPaid && Number(sale.remainingAmount || 0) > 0) count++;
      if (sale.expiryDate) {
        const d = Math.ceil((new Date(sale.expiryDate) - today) / 86400000);
        if (d <= 5 && d >= -30) count++;
      }
    });
    if (sections && accounts) {
      sections.forEach(sec => {
        const avail = accounts.filter(a => a.productName === sec.name && a.status === 'available').length;
        if (avail <= 3) count++;
      });
    }
  } catch { }
  return count;
}

const MainLayout = () => {
  const { user, hasPermission } = useAuth();
  const { activeTab, setActiveTab } = useData();
  const checkPerm = (perm) => hasPermission ? hasPermission(perm) : true;

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const notifCount = useQuickNotifCount();

  // Ctrl+K keyboard shortcut for search
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Auto daily report scheduler + migrate recurring expenses to DB
  useEffect(() => {
    if (user) {
      telegram.setCurrentUser(user.username);
      telegram.startAutoReport();
      // ترحيل المصروفات الثابتة من localStorage للـ DB (مرة واحدة تلقائياً)
      recurringExpensesAPI.migrateFromLocalStorage().catch(() => {});
      return () => telegram.stopAutoReport();
    } else {
      telegram.setCurrentUser('');
    }
  }, [user]);

  if (!user) return <Login />;

  const handleNavigate = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 dir-rtl flex" style={{ direction: 'rtl' }}>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 lg:mr-64 p-3 md:p-4 lg:p-8 transition-all duration-300 w-full pb-24 lg:pb-8">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">

          {/* Header — Mobile + Desktop */}
          <div className="flex justify-between items-center mb-6 bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-slate-100">
            {/* Left: Logo + Menu */}
            <div className="flex items-center gap-2">
              <button onClick={() => setSidebarOpen(true)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-100 transition lg:hidden">
                <i className="fa-solid fa-bars text-lg"></i>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                  <i className="fa-solid fa-layer-group"></i>
                </div>
                <h2 className="text-sm md:text-lg font-black text-slate-800 hidden sm:block">Service Hub</h2>
              </div>
            </div>

            {/* Center: Search Bar */}
            <button
              onClick={() => setShowSearch(true)}
              className="flex-1 max-w-md mx-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3 hover:bg-slate-100 hover:border-slate-300 transition-all group"
            >
              <i className="fa-solid fa-magnifying-glass text-slate-400 group-hover:text-indigo-500 transition-colors"></i>
              <span className="text-sm text-slate-400 font-medium hidden sm:block">بحث في كل الأقسام...</span>
              <span className="text-sm text-slate-400 font-medium sm:hidden">بحث...</span>
              <kbd className="hidden md:flex items-center gap-0.5 text-[9px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 mr-auto">
                Ctrl+K
              </kbd>
            </button>

            {/* Right: Notifications + User */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNotifs(true)}
                className="relative p-2.5 bg-slate-50 text-slate-500 rounded-xl border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all"
              >
                <i className="fa-solid fa-bell text-lg"></i>
                {notifCount > 0 && (
                  <span className="absolute -top-1.5 -left-1.5 bg-red-500 text-white text-[8px] font-black h-5 min-w-[20px] flex items-center justify-center rounded-full px-1 animate-pulse shadow-lg shadow-red-200">
                    {notifCount > 99 ? '+99' : notifCount}
                  </span>
                )}
              </button>
              <div className="hidden lg:flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-xs">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-slate-600">{user.username}</span>
              </div>
            </div>
          </div>

          {/* عرض المكونات مع Lazy Loading */}
          <Suspense fallback={<PageLoader />}>
            {activeTab === 'dashboard' && checkPerm('dashboard') && <Dashboard />}
            {activeTab === 'sales' && checkPerm('sales') && <Sales />}
            {activeTab === 'products' && checkPerm('products') && <Products />}
            {activeTab === 'accounts' && checkPerm('accounts') && <Accounts />}
            {activeTab === 'clients' && checkPerm('clients') && <Clients />}
            {activeTab === 'renewals' && checkPerm('renewals') && <Renewals />}
            {activeTab === 'expenses' && checkPerm('expenses') && <Expenses />}
            {activeTab === 'reports' && checkPerm('reports') && <Reports />}
            {activeTab === 'shifts' && checkPerm('shifts') && <Shifts />}
            {activeTab === 'wallets' && checkPerm('wallets') && <Wallets />}
            {activeTab === 'problems' && checkPerm('problems') && <Problems />}
            {activeTab === 'attendance' && checkPerm('attendance') && <Attendance />}
            {activeTab === 'users' && (checkPerm('all') || user.role === 'admin') && <Users />}
            {activeTab === 'botSettings' && (checkPerm('botSettings') || checkPerm('all') || user.role === 'admin') && <BotSettings />}
            {activeTab === 'employees' && (checkPerm('employees') || checkPerm('all') || user.role === 'admin') && <Employees />}
            {activeTab === 'auditLog' && (checkPerm('all') || user.role === 'admin') && <AuditLog />}
          </Suspense>

        </div>
      </main>

      {/* Bottom Navigation — Mobile Only */}
      <BottomNav />

      {/* Global Search Overlay */}
      <Suspense fallback={null}>
        {showSearch && (
          <GlobalSearch onNavigate={handleNavigate} onClose={() => setShowSearch(false)} />
        )}
      </Suspense>

      {/* Notification Center Overlay */}
      <Suspense fallback={null}>
        {showNotifs && (
          <NotificationCenter isOpen={showNotifs} onClose={() => setShowNotifs(false)} onNavigate={handleNavigate} />
        )}
      </Suspense>
    </div>
  );
};

function App () {
  return (
    <AuthProvider>
      <DataProvider>
        <ConfirmProvider>
          <MainLayout />
        </ConfirmProvider>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;