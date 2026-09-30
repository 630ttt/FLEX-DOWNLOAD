import { Navigate, Outlet } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';

const CustomerProtectedRoute = () => {
  const { isAuthenticated } = useCustomerAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default CustomerProtectedRoute;
