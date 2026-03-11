import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const location = useLocation();
  const {
    isAuthenticated,
    isVerifyingSession,
    certificateReady,
    user,
    sessionInfo,
  } = useAuth();

  if (isVerifyingSession) {
    return <p style={{ padding: "24px" }}>Verifying secure session...</p>;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname || "/" }}
      />
    );
  }

  const sessionRequiresReauth = sessionInfo?.session?.reauth_required;
  if (sessionRequiresReauth) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ reason: "reauth-required", from: location.pathname || "/" }}
      />
    );
  }

  if (!certificateReady) {
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{ reason: "certificate-unverified" }}
      />
    );
  }

  const userRole = user?.role;
  if (
    allowedRoles.length > 0 &&
    (!userRole || !allowedRoles.includes(userRole))
  ) {
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{ reason: "role-forbidden" }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
