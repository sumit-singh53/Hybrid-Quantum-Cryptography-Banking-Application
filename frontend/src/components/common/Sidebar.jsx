import React, { useEffect, useState } from "react";
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
  DocumentTextIcon,
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
      {
        to: "/transactions/create",
        label: "Create transaction",
        icon: ArrowPathIcon,
      },
      {
        to: "/transactions/history",
        label: "Transaction history",
        icon: ClockIcon,
      },
      {
        to: "/statements",
        label: "Statements & Reports",
        icon: DocumentTextIcon,
      },
      { to: "/profile", label: "Profile", icon: UserIcon },
      { to: "/security", label: "Security", icon: ShieldCheckIcon },
      { to: "/logout", label: "Logout", icon: ArrowRightStartOnRectangleIcon },
    ],
  },
  [ROLES.MANAGER]: {
    title: "Manager",
    description: "Operations & oversight",
    links: [
      { to: "/dashboard/manager", label: "Dashboard", icon: HomeIcon },
      {
        to: "/transactions/approvals",
        label: "Approvals",
        icon: ClipboardDocumentCheckIcon,
      },
      { to: "/manager/customers", label: "Customers", icon: UserGroupIcon },
      {
        to: "/manager/certificates",
        label: "Certificates",
        icon: ShieldCheckIcon,
      },
      { to: "/manager/reports", label: "Reports", icon: ChartBarIcon },
      {
        to: "/manager/branch-audit",
        label: "Branch audit",
        icon: DocumentCheckIcon,
      },
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
      {
        to: "/audit/certificates",
        label: "Certificates",
        icon: ShieldCheckIcon,
      },
      { to: "/reports", label: "Reports", icon: ChartBarIcon },
      { to: "/profile", label: "Profile", icon: UserIcon },
      { to: "/logout", label: "Logout", icon: ArrowRightStartOnRectangleIcon },
    ],
  },
  [ROLES.SYSTEM_ADMIN]: {
    title: "System admin",
    description: "PKI, CRL, and global telemetry",
    links: [
      { to: "/system-admin/dashboard", label: "Admin control", icon: HomeIcon },
      {
        to: "/system-admin/users",
        label: "User inventory",
        icon: UserGroupIcon,
      },
      { to: "/system-admin/roles", label: "Role insights", icon: UserIcon },
      {
        to: "/system-admin/certificates/issue",
        label: "Issue certificate",
        icon: ShieldCheckIcon,
      },
      {
        to: "/system-admin/certificates/crl",
        label: "CRL oversight",
        icon: ClipboardDocumentCheckIcon,
      },
      {
        to: "/system-admin/ca",
        label: "Authority controls",
        icon: LockClosedIcon,
      },
      {
        to: "/system-admin/system-security",
        label: "System security",
        icon: ShieldCheckIcon,
      },
      {
        to: "/system-admin/audit/global",
        label: "Global audit",
        icon: DocumentCheckIcon,
      },
      { to: "/logout", label: "Logout", icon: ArrowRightStartOnRectangleIcon },
    ],
  },
};

const isDesktopViewport = () =>
  typeof window !== "undefined" ? window.innerWidth >= 1024 : false;

const Sidebar = () => {
  const { role } = useRole();
  const [isDesktop, setIsDesktop] = useState(isDesktopViewport);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const nav = navConfig[role];

  useEffect(() => {
    const handleResize = () => {
      const desktop = isDesktopViewport();
      setIsDesktop(desktop);
      if (desktop) {
        setIsCollapsed(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!nav) {
    return (
      <aside className="rounded-3xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500 shadow">
        Determining role access…
      </aside>
    );
  }

  const handleToggle = () => setIsCollapsed((prev) => !prev);
  const handleNavClick = () => {
    if (!isDesktop) {
      setIsCollapsed(true);
    }
  };

  const collapseForDesktop = isDesktop && isCollapsed;
  const iconOnlyMode = collapseForDesktop;

  const isAdminRole = role === ROLES.SYSTEM_ADMIN;

  return (
    <aside
      className={`mt-4 w-full self-start pt-0 transition-all duration-500 ease-in-out lg:mt-6 lg:ml-4 lg:flex-none ${
        collapseForDesktop ? "lg:max-w-[5.5rem]" : "lg:max-w-[18rem]"
      }`}
    >
      {/* Ambient Glow Background */}
      {isAdminRole && (
        <div className="pointer-events-none absolute -inset-20 hidden lg:block">
          <div className="absolute left-0 top-20 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px] animate-pulse"></div>
          <div className="absolute left-10 top-60 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
      )}
      
      <div className={`relative flex min-h-[320px] flex-col gap-5 rounded-[32px] p-5 shadow-2xl backdrop-blur-xl lg:sticky lg:top-6 transition-all duration-500 ${
        isAdminRole 
          ? 'border border-indigo-400/20 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-indigo-950/90 shadow-indigo-500/20' 
          : 'border border-white/60 bg-gradient-to-br from-white via-cyan-50/40 to-slate-50 shadow-[0_25px_55px_rgba(15,23,42,0.12)]'
      }`}>
        {/* Top Glow Effect for Admin */}
        {isAdminRole && (
          <div className="absolute inset-x-0 -top-px mx-auto h-px w-3/4 bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent"></div>
        )}
        
        {/* Toggle Button - Always visible, positioned absolutely when collapsed */}
        <div className={`flex items-center gap-3 transition-all duration-500 ${
          collapseForDesktop ? 'flex-col items-center' : 'flex-row justify-between'
        }`}>
          {/* Title Section - Hidden when collapsed */}
          <div className={`transition-all duration-500 overflow-hidden ${
            collapseForDesktop ? 'max-h-0 opacity-0' : 'max-h-20 opacity-100'
          }`}>
            <p className={`text-[0.55rem] uppercase tracking-[0.45em] whitespace-nowrap ${
              isAdminRole ? 'text-indigo-400/70' : 'text-cyan-600/70'
            }`}>
              {nav.title}
            </p>
            <p className={`text-sm whitespace-nowrap ${
              isAdminRole ? 'text-slate-400' : 'text-slate-500'
            }`}>{nav.description}</p>
          </div>
          
          {/* Toggle Button */}
          <button
            type="button"
            onClick={handleToggle}
            className={`flex-shrink-0 inline-flex items-center justify-center rounded-full border shadow-lg backdrop-blur transition-all duration-300 hover:scale-110 active:scale-95 ${
              collapseForDesktop ? 'h-11 w-11 p-0' : 'gap-1.5 px-3 py-2'
            } ${
              isAdminRole
                ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-300 hover:border-indigo-400/50 hover:bg-indigo-500/20 hover:shadow-indigo-500/50'
                : 'border-cyan-200/70 bg-white/90 text-slate-600 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 hover:shadow-cyan-500/30'
            }`}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronDoubleRightIcon className="h-5 w-5" />
            ) : (
              <ChevronDoubleLeftIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        <ul className={`list-none space-y-2.5 transition-all duration-500 ${
          collapseForDesktop ? 'px-0' : ''
        }`}>
          {nav.links.map((link) => {
            const isLogout = link.to === "/logout";
            const Icon = link.icon || HomeIcon;
            return (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end
                  title={link.label}
                  onClick={handleNavClick}
                  className={({ isActive }) => {
                    if (isAdminRole) {
                      return [
                        "group relative flex items-center rounded-2xl border text-sm font-semibold no-underline backdrop-blur transition-all duration-300",
                        iconOnlyMode ? "justify-center px-3 py-3" : "justify-between px-4 py-3",
                        isActive
                          ? "border-indigo-400/50 bg-gradient-to-r from-indigo-500/20 via-indigo-500/10 to-transparent text-indigo-200 shadow-lg shadow-indigo-500/30"
                          : "border-slate-800/50 bg-slate-900/40 text-slate-400 hover:border-indigo-400/30 hover:bg-slate-800/60 hover:text-indigo-300 hover:scale-105",
                        isLogout && "border-rose-400/30 bg-rose-500/10 text-rose-300 hover:border-rose-400/50 hover:bg-rose-500/20"
                      ].filter(Boolean).join(" ");
                    }
                    return [
                      "flex items-center rounded-[20px] border border-white/60 bg-white/60 text-sm font-semibold text-slate-600 no-underline shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500",
                      iconOnlyMode ? "justify-center px-3 py-2.5" : "justify-between pr-4 pl-3 py-2.5",
                      isActive
                        ? "border-cyan-300/70 bg-gradient-to-r from-cyan-50 via-white to-white text-cyan-900 shadow-lg shadow-cyan-100/50 scale-105"
                        : "hover:border-cyan-200 hover:bg-white/90 hover:text-slate-900 hover:scale-105",
                    ].join(" ");
                  }}
                >
                  {/* Active Indicator Glow */}
                  {({ isActive }) => (
                    <>
                      {isAdminRole && isActive && !iconOnlyMode && (
                        <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-indigo-500/20 to-transparent blur-xl"></div>
                      )}
                      
                      {/* Icon + Label Container */}
                      <span className={`flex items-center transition-all duration-300 ${
                        iconOnlyMode ? 'gap-0' : 'gap-3'
                      }`}>
                        <Icon
                          className={`flex-shrink-0 transition-all duration-300 ${
                            iconOnlyMode ? 'h-6 w-6' : 'h-5 w-5'
                          } ${
                            isAdminRole 
                              ? (isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-400')
                              : (isActive ? 'text-cyan-600' : 'text-slate-500 group-hover:text-cyan-600')
                          }`}
                          aria-hidden="true"
                        />
                        <span
                          className={`text-sm font-medium transition-all duration-300 overflow-hidden whitespace-nowrap ${
                            iconOnlyMode ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100"
                          } ${
                            isAdminRole
                              ? (isActive ? 'text-indigo-200' : 'text-slate-400 group-hover:text-indigo-300')
                              : (isActive ? 'text-cyan-900' : 'text-slate-700 group-hover:text-slate-900')
                          }`}
                        >
                          {link.label}
                        </span>
                      </span>
                      
                      {/* Active Indicator Dot */}
                      <span
                        className={`flex-shrink-0 rounded-full transition-all duration-300 ${
                          iconOnlyMode ? 'h-0 w-0 opacity-0' : 'h-2 w-2 opacity-100'
                        } ${
                          isAdminRole
                            ? (isActive ? 'bg-indigo-400 shadow-lg shadow-indigo-400/50' : isLogout ? 'bg-rose-400/50' : 'bg-slate-600/50')
                            : (isActive ? 'bg-cyan-500 shadow-lg shadow-cyan-500/50' : isLogout ? "bg-rose-400" : "bg-cyan-400/70")
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
