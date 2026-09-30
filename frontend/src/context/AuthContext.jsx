import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('admin_info');
    if (stored) {
      setAdmin(JSON.parse(stored));
    }
  }, []);

  const login = (token, adminInfo) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_info', JSON.stringify(adminInfo));
    setAdmin(adminInfo);
  };

  const updateAdmin = (adminInfo, token) => {
    if (token) {
      localStorage.setItem('admin_token', token);
    }
    localStorage.setItem('admin_info', JSON.stringify(adminInfo));
    setAdmin(adminInfo);
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_info');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, updateAdmin, isAuthenticated: !!admin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
