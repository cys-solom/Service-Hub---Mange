import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error('[ErrorBoundary] Caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-6" style={{ direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="bg-gradient-to-r from-red-600 to-rose-600 p-6">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <i className="fa-solid fa-bug text-3xl text-white"></i>
                            </div>
                            <h2 className="text-xl font-black text-white text-center">حدث خطأ غير متوقع</h2>
                            <p className="text-red-100 text-sm text-center mt-2">لا تقلق — يمكنك تحديث الصفحة</p>
                        </div>
                        <div className="p-6 space-y-4">
                            {this.state.error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 overflow-auto max-h-40">
                                    <p className="text-xs font-mono text-red-700 dir-ltr text-left break-all">
                                        {this.state.error.toString()}
                                    </p>
                                </div>
                            )}
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-gradient-to-r from-indigo-600 to-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                            >
                                <i className="fa-solid fa-rotate-right"></i>
                                تحديث الصفحة
                            </button>
                            <button
                                onClick={() => { localStorage.clear(); window.location.reload(); }}
                                className="w-full bg-white border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm"
                            >
                                مسح الكاش وإعادة المحاولة
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
