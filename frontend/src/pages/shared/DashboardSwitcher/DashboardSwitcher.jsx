import React from "react";
import { Navigate } from "react-router-dom";
import { useRole } from "../../../context/RoleContext";
import { ROLES } from "../../../utils/roleUtils";
import CustomerDashboard from "../../customer/CustomerDashboard";
import AuditorClerkDashboard from "../../auditorClerk/AuditorClerkDashboard";
import "./DashboardSwitcher.css";

const DashboardSwitcher = () => {
  const { role } = useRole();

  if (role === ROLES.CUSTOMER) {
    return <CustomerDashboard />;
  }

  if (role === ROLES.AUDITOR_CLERK) {
    return <AuditorClerkDashboard />;
  }

  if (role === ROLES.MANAGER) {
    return <Navigate to="/dashboard/manager" replace />;
  }

  if (role === ROLES.SYSTEM_ADMIN) {
    return <Navigate to="/system-admin/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

export default DashboardSwitcher;
