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
      { to: "/profile", label: "Profile", icon: UserIcon },
      { to: "/security", label: "Security", icon: ShieldCheckIcon },
      { to: "/logout", label: "Logout", icon: ArrowRightStartOnRectangleIcon },
    ],
  },
  [ROLES.MANAGER]: {
    title: "Manager cockpit",
    description: "Approvals, customers, and audit",
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

  return (
    <aside
      className={`mt-4 w-full self-start pt-0 transition-[max-width] duration-300 lg:mt-6 lg:ml-4 lg:flex-none ${
        collapseForDesktop ? "lg:max-w-[5.5rem]" : "lg:max-w-[18rem]"
      }`}
    >
      <div className="flex min-h-[320px] flex-col gap-5 rounded-[32px] border border-white/60 bg-gradient-to-br from-white via-cyan-50/40 to-slate-50 p-5 shadow-[0_25px_55px_rgba(15,23,42,0.12)] lg:sticky lg:top-6">
        <div className="flex items-center justify-between gap-3">
          {(!collapseForDesktop || !isDesktop) && (
            <div>
              <p className="text-[0.55rem] uppercase tracking-[0.45em] text-cyan-600/70">
                {nav.title}
              </p>
              <p className="text-sm text-slate-500">{nav.description}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleToggle}
            className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm backdrop-blur transition hover:border-cyan-300 hover:text-slate-900"
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="hidden sm:inline">
              {isCollapsed ? "Open" : "Close"}
            </span>
            <span className="sm:hidden">{isCollapsed ? "+" : "-"}</span>
          </button>
        </div>

        <ul className="list-none space-y-2 transition-all duration-300">
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
                  className={({ isActive }) =>
                    [
                      "flex items-center rounded-[20px] border border-white/60 bg-white/60 pr-4 pl-1 py-2 text-sm font-semibold text-slate-600 no-underline shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 -ml-4",
                      iconOnlyMode ? "justify-start" : "justify-between",
                      isActive
                        ? "border-cyan-300/70 bg-gradient-to-r from-cyan-50 via-white to-white text-cyan-900 shadow shadow-cyan-100"
                        : "hover:border-cyan-200 hover:bg-white/90 hover:text-slate-900",
                    ].join(" ")
                  }
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      className="h-5 w-5 text-slate-500"
                      aria-hidden="true"
                    />
                    <span
                      className={`text-sm font-medium text-slate-700 transition-opacity duration-150 ${
                        iconOnlyMode ? "hidden" : "block"
                      }`}
                    >
                      {link.label}
                    </span>
                  </span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      iconOnlyMode ? "ml-2" : ""
                    } ${isLogout ? "bg-rose-400" : "bg-cyan-400/70"}`}
                  />
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
