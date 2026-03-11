import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  HomeIcon,
  CreditCardIcon,
  ArrowPathIcon,
  ClockIcon,
  UserIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  DocumentCheckIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  LockClosedIcon,
  ArrowRightStartOnRectangleIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "../../context/RoleContext";
import { ROLES } from "../../utils/roleUtils";

const navConfig = {
  [ROLES.CUSTOMER]: {
    title: "Customer workspace",
    description: "Personal banking + certificate hygiene",
    links: [
      { to: "/dashboard", label: "Dashboard", icon: HomeIcon },
      { to: "/accounts", label: "Accounts", icon: CreditCardIcon },
      { to: "/transactions/create", label: "Create transaction", icon: ArrowPathIcon },
      { to: "/transactions/history", label: "Transaction history", icon: ClockIcon },
      { to: "/profile", label: "Profile", icon: UserIcon },
      { to: "/security", label: "Security", icon: ShieldCheckIcon },
      { to: "/logout", label: "Logout", icon: ArrowRightStartOnRectangleIcon },
    ],
  },
  [ROLES.MANAGER]: {
    title: "Manager",
    description: "Operations & oversight",
    links: [
      { to: "/manager/dashboard", label: "Dashboard", icon: HomeIcon },
      { to: "/transactions/approvals", label: "Approvals", icon: ClipboardDocumentCheckIcon },
      { to: "/manager/customers", label: "Customers", icon: UserGroupIcon },
      { to: "/manager/certificates", label: "Certificates", icon: ShieldCheckIcon },
      { to: "/manager/reports", label: "Reports", icon: ChartBarIcon },
      { to: "/manager/branch-audit", label: "Branch audit", icon: DocumentCheckIcon },
      { to: "/logout", label: "Logout", icon: ArrowRightStartOnRectangleIcon },
    ],
  },
  [ROLES.AUDITOR_CLERK]: {
    title: "Audit mesh",
    description: "Branch telemetry + certificate posture",
    links: [
      { to: "/dashboard", label: "Dashboard", icon: HomeIcon },
      { to: "/audit/transactions", label: "Transactions", icon: ArrowPathIcon },
      { to: "/audit/logs", label: "Audit logs", icon: DocumentCheckIcon },
      { to: "/audit/certificates", label: "Certificates", icon: ShieldCheckIcon },
      { to: "/reports", label: "Reports", icon: ChartBarIcon },
      { to: "/profile", label: "Profile", icon: UserIcon },
      { to: "/logout", label: "Logout", icon: ArrowRightStartOnRectangleIcon },
    ],
  },
  [ROLES.SYSTEM_ADMIN]: {
    title: "System admin",
    description: "PKI, CRL, and global telemetry",
    links: [
      { to: "/admin/dashboard", label: "Admin control", icon: HomeIcon },
      { to: "/admin/users", label: "User inventory", icon: UserGroupIcon },
      { to: "/admin/roles", label: "Role insights", icon: UserIcon },
      { to: "/admin/certificates/issue", label: "Issue certificate", icon: ShieldCheckIcon },
      { to: "/admin/certificates/crl", label: "CRL oversight", icon: ClipboardDocumentCheckIcon },
      { to: "/admin/ca", label: "Authority controls", icon: LockClosedIcon },
      { to: "/admin/system-security", label: "System security", icon: ShieldCheckIcon },
      { to: "/admin/audit/global", label: "Global audit", icon: DocumentCheckIcon },
      { to: "/logout", label: "Logout", icon: ArrowRightStartOnRectangleIcon },
    ],
  },
};

const LeftSidebar = () => {
  const { role } = useRole();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const nav = navConfig[role];

  if (!nav) {
    return (
      <aside className="rounded-3xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500 shadow">
        Determining role access…
      </aside>
    );
  }

  const isAdminRole = role === ROLES.SYSTEM_ADMIN;

  return (
    <aside
      className={`mt-4 w-full self-start pt-0 transition-all duration-300 ease-in-out lg:mt-6 lg:flex-none relative ${
        isCollapsed ? "lg:w-28" : "lg:w-80"
      }`}
    >

      {/* Ambient Glow Background for Admin */}
      {isAdminRole && !isCollapsed && (
        <div className="pointer-events-none absolute -inset-20 hidden lg:block">
          <div className="absolute left-0 top-20 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px] animate-pulse"></div>
          <div className="absolute left-10 top-60 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
      )}
      
      {/* Collapse/Expand Button - Outside sidebar */}
      <div className="hidden lg:block absolute right-0 top-8 z-[100]">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`flex items-center justify-center rounded-full border-2 p-3 shadow-2xl transition-all hover:scale-110 active:scale-95 ${
            isAdminRole
              ? 'border-white bg-indigo-600 text-white hover:bg-indigo-500'
              : 'border-white bg-cyan-500 text-white hover:bg-cyan-600'
          }`}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronDoubleRightIcon className="h-6 w-6 stroke-[3]" />
          ) : (
            <ChevronDoubleLeftIcon className="h-6 w-6 stroke-[3]" />
          )}
        </button>
      </div>

      <div className={`relative flex min-h-[320px] flex-col rounded-[32px] shadow-2xl backdrop-blur-xl lg:sticky lg:top-6 transition-all duration-300 ${
        isCollapsed ? 'gap-3 p-3' : 'gap-5 p-5'
      } ${
        isAdminRole 
          ? 'border border-indigo-400/20 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-indigo-950/90 shadow-indigo-500/20' 
          : 'border border-white/60 bg-gradient-to-br from-white via-cyan-50/40 to-slate-50 shadow-[0_25px_55px_rgba(15,23,42,0.12)]'
      }`}>
        {/* Top Glow Effect for Admin */}
        {isAdminRole && (
          <div className="absolute inset-x-0 -top-px mx-auto h-px w-3/4 bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent"></div>
        )}
        
        {/* Header */}
        {!isCollapsed && (
          <div className="flex items-center justify-center gap-3">
            <div className="flex-1 min-w-0 text-center">
              <p className={`text-[0.55rem] uppercase tracking-[0.45em] ${
                isAdminRole ? 'text-indigo-400/70' : 'text-cyan-600/70'
              }`}>
                {nav.title}
              </p>
              <p className={`text-sm ${
                isAdminRole ? 'text-slate-400' : 'text-slate-500'
              }`}>{nav.description}</p>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className={`flex-1 ${isCollapsed ? 'flex items-center justify-center' : ''}`}>
          <ul className={`list-none space-y-2 transition-all duration-300 ${isCollapsed ? 'w-full flex flex-col items-center' : ''}`}>
            {nav.links.map((link) => {
              const isLogout = link.to === "/logout";
              const Icon = link.icon || HomeIcon;
              
              return (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end
                    title={isCollapsed ? link.label : undefined}
                    className={({ isActive }) => {
                      const base = "group relative flex items-center rounded-2xl border font-semibold no-underline backdrop-blur transition-all duration-200";
                      const spacing = isCollapsed ? "justify-center p-3 w-14 h-14" : "justify-center gap-3 px-4 py-3";
                      
                      if (isAdminRole) {
                        const state = isActive
                          ? "border-indigo-400/50 bg-gradient-to-r from-indigo-500/20 via-indigo-500/10 to-transparent text-indigo-200 shadow-lg shadow-indigo-500/30"
                          : "border-slate-800/50 bg-slate-900/40 text-slate-400 hover:border-indigo-400/30 hover:bg-slate-800/60 hover:text-indigo-300";
                        const logout = isLogout ? "border-rose-400/30 bg-rose-500/10 text-rose-300 hover:border-rose-400/50 hover:bg-rose-500/20" : "";
                        return `${base} ${spacing} ${state} ${logout}`.trim();
                      }
                      
                      const state = isActive
                        ? "border-cyan-300/70 bg-gradient-to-r from-cyan-50 via-white to-white text-cyan-900 shadow shadow-cyan-100"
                        : "text-slate-600 hover:border-cyan-200 hover:bg-white/90 hover:text-slate-900";
                      return `${base} ${spacing} border-white/60 bg-white/60 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ${state}`;
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active Glow for Admin */}
                        {isAdminRole && isActive && !isCollapsed && (
                          <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-indigo-500/20 to-transparent blur-xl"></div>
                        )}
                        
                        {/* Icon - Always visible and centered */}
                        <Icon
                          className={`h-5 w-5 flex-shrink-0 transition-colors ${
                            isAdminRole 
                              ? (isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-indigo-400')
                              : (isActive ? 'text-cyan-600' : 'text-slate-600 group-hover:text-cyan-600')
                          }`}
                          aria-hidden="true"
                        />
                        
                        {/* Label - Only when expanded */}
                        {!isCollapsed && (
                          <span className={`text-sm font-medium flex-1 text-center ${
                            isAdminRole
                              ? (isActive ? 'text-indigo-200' : 'text-slate-400 group-hover:text-indigo-300')
                              : (isActive ? 'text-cyan-900' : 'text-slate-700 group-hover:text-slate-900')
                          }`}>
                            {link.label}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default LeftSidebar;
