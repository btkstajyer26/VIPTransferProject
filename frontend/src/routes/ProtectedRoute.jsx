import { Navigate, Outlet, useLocation } from "react-router-dom";

import useAuth from "@/hooks/useAuth";

function ProtectedRoute({ allowedRoles = [] }) {
  const location = useLocation();

  const {
    isAuthenticated,
    isAuthLoading,
    role,
  } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Oturum kontrol ediliyor...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(role)
  ) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;