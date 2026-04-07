import { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // التحقق من التوكن عند فتح الموقع
    useEffect(() => {
        const checkUser = async () => {
            const token = localStorage.getItem('service-hub_token');
            if (token) {
                try {
                    const userData = await authAPI.checkAuth(token);
                    if (userData) {
                        setUser(userData);
                    } else {
                        localStorage.removeItem('service-hub_token');
                        setUser(null);
                    }
                } catch (error) {
                    console.error("Auth check failed", error);
                    localStorage.removeItem('service-hub_token');
                }
            }
            setLoading(false);
        };
        checkUser();
    }, []);

    const login = async (username, password) => {
        const result = await authAPI.login(username, password);
        if (result.status === 'success') {
            localStorage.setItem('service-hub_token', result.token);
            setUser(result.user);
            return { success: true };
        }
        return { success: false, message: result.message };
    };

    const logout = async () => {
        const token = localStorage.getItem('service-hub_token');
        if (token) {
            try {
                await authAPI.logout(token);
            } catch (error) {
                console.error("Logout error", error);
            }
        }
        localStorage.removeItem('service-hub_token');
        setUser(null);
    };

    const hasPermission = (perm) => {
        if (!user) return false;
        if (user.role === 'admin' || (user.permissions && user.permissions.includes('all'))) return true;
        return user.permissions && user.permissions.includes(perm);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, hasPermission, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);