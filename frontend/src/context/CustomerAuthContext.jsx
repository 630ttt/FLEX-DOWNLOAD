import { createContext, useContext, useEffect, useState } from 'react';

const CustomerAuthContext = createContext(null);

export const CustomerAuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('customer_info');
    if (stored) {
      setCustomer(JSON.parse(stored));
    }
  }, []);

  const login = (token, customerInfo) => {
    localStorage.setItem('customer_token', token);
    localStorage.setItem('customer_info', JSON.stringify(customerInfo));
    setCustomer(customerInfo);
  };

  const logout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_info');
    setCustomer(null);
  };

  return (
    <CustomerAuthContext.Provider value={{ customer, login, logout, isAuthenticated: !!customer }}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => useContext(CustomerAuthContext);
