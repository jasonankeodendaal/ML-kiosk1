import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.tsx';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { loggedInUser, isAuthLoading } = useAppContext();

  if (isAuthLoading) {
    return null; // Don't render anything until the auth check is complete
  }

  if (!loggedInUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;