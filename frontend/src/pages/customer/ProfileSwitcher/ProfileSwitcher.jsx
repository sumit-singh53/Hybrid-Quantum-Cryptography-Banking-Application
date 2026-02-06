import React from "react";
import { useRole } from "../../../context/RoleContext";
import { useAuth } from "../../../context/AuthContext";
import { ROLES } from "../../../utils/roleUtils";
import CustomerProfile from "./CustomerProfile";

const ProfileSwitcher = () => {
  const { role } = useRole();
  const { user } = useAuth();

  // Only customers use this profile page
  if (role === ROLES.CUSTOMER) {
    return <CustomerProfile />;
  }

  // For demo purposes, show customer profile as fallback
  return <CustomerProfile />;
};

export default ProfileSwitcher;
