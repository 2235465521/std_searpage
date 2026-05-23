import { Navigate, useLocation } from 'react-router-dom';

const hasAuthTokens = () =>
  Boolean(localStorage.getItem('token') && localStorage.getItem('refresh_token'));

const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  if (!hasAuthTokens()) {
    const redirectTo = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from: redirectTo }} />;
  }

  return children;
};

export default ProtectedRoute;
