import React, { useContext, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { UserContext } from "../../contexts/UserContext";
import * as userService from '../../services/userService';

import {
  Home,
  BookOpen,
  Users,
  ClipboardList,
  CalendarDays,
  BarChart3,
  CreditCard,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
} from "lucide-react";

const NavBar = () => {
  const { user, setUser } = useContext(UserContext);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const [userData, setUserData] = useState()
  // Detect roles (tolerant of different shapes)

    useEffect(() => {
      const fetchUser = async () => {
        const res = await userService.getUser(user._id);
        setUserData(res.user);
      };
      if (user) fetchUser();
    }, [user]);


  const rawRoles = userData?.roles ?? userData?.role ?? [];
  console.log(userData)
  const roles = (Array.isArray(rawRoles) ? rawRoles : [rawRoles])
    .filter(Boolean)
    .map(r => (typeof r === "string" ? r : r?.name ?? ""))
    .map(s => s.toLowerCase());

  const isInstructor = roles.includes("instructor");
  const isAdmin = roles.some(r =>
    ["admin", "owner", "manager", "coordinator", "staff"].includes(r)
  );


  // Close the drawer on route change
  useEffect(() => setOpen(false), [location.pathname]);

  // Prevent body scroll only when the drawer is open (mobile)
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const baseLink =
    "flex items-center py-2 gap-3 px-6 -mx-6 transition focus:outline-none focus:ring-2 focus:ring-white/40";
  const linkClasses = (path) =>
    `${baseLink} ${isActive(path) ? "bg-green-800" : "hover:bg-green-800"}`;

  return (
    <>
      {/* MOBILE HEADER (fixed) */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-green-600 text-white h-14 shadow flex items-center">
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="sidebar"
          onClick={() => setOpen((o) => !o)}
          className="p-5"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className="flex-1 text-center -ml-10 select-none">
          <Link to="/" className="text-xl font-bold tracking-wide">
            TADRIB
          </Link>
        </div>
      </header>

      {/* MOBILE OVERLAY */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${open ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
      />

      {/* FIXED SIDEBAR (slides in mobile; pinned on desktop) */}
      <nav
        id="sidebar"
        role="navigation"
        aria-label="Primary"
        className={[
          "fixed left-0 z-50 w-64 transform bg-green-600 text-white",
          open ? "translate-x-0" : "-translate-x-full",
          // Sit below the mobile header; pinned full height on md+
          "top-14 bottom-0 md:top-0 md:bottom-0 md:translate-x-0",
          "flex flex-col p-6 gap-3 shadow-xl overflow-y-auto",
        ].join(" ")}
      >
        {/* Brand / Version (desktop only) */}
        <div className="mb-2 text-center hidden md:block select-none">
          <Link
            to="/"
            className="text-3xl font-bold text-white hover:text-gray-300"
          >
            TADRIB
          </Link>
          <p className="text-white/70">
            <small>v0.1</small>
          </p>
        </div>

        {/* Authenticated */}
        {user ? (
          <>
            <ul className="flex-1 flex flex-col gap-1">
              {/* Common */}
              <li>
                <Link to="/" className={linkClasses("/")}>
                  <Home size={20} />
                  Home
                </Link>
              </li>

              {/* Instructor workspace */}
              {isInstructor && (
                <>
                  <li className="mt-4 mb-1 px-2 text-xs uppercase tracking-wide text-white/70">
                    Teaching
                  </li>
                  <li>
                    <Link
                      to="/teaching"
                      className={linkClasses("/teaching")}
                      aria-current={isActive("/teaching") ? "page" : undefined}
                    >
                      <BookOpen size={20} />
                      My Courses
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/schedule"
                      className={linkClasses("/schedule")}
                      aria-current={isActive("/schedule") ? "page" : undefined}
                    >
                      <CalendarDays size={20} />
                      My Schedule
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/attendance"
                      className={linkClasses("/attendance")}
                      aria-current={isActive("/attendance") ? "page" : undefined}
                    >
                      <ClipboardList size={20} />
                      Attendance
                    </Link>
                  </li>
                </>
              )}

              {/* Admin / Staff workspace */}
              {isAdmin && (
                <>
                  <li className="mt-4 mb-1 px-2 text-xs uppercase tracking-wide text-white/70">
                    Management
                  </li>
                  <li>
                    <Link
                      to="/courses"
                      className={linkClasses("/courses")}
                      aria-current={isActive("/courses") ? "page" : undefined}
                    >
                      <BookOpen size={20} />
                      Courses
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/instructors"
                      className={linkClasses("/instructors")}
                      aria-current={isActive("/instructors") ? "page" : undefined}
                    >
                      <Users size={20} />
                      Instructors
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/enrollments"
                      className={linkClasses("/enrollments")}
                      aria-current={isActive("/enrollments") ? "page" : undefined}
                    >
                      <ClipboardList size={20} />
                      Enrollments
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/payments"
                      className={linkClasses("/payments")}
                      aria-current={isActive("/payments") ? "page" : undefined}
                    >
                      <CreditCard size={20} />
                      Payments
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/reports"
                      className={linkClasses("/reports")}
                      aria-current={isActive("/reports") ? "page" : undefined}
                    >
                      <BarChart3 size={20} />
                      Reports
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/calendar"
                      className={linkClasses("/calendar")}
                      aria-current={isActive("/calendar") ? "page" : undefined}
                    >
                      <CalendarDays size={20} />
                      Calendar
                    </Link>
                  </li>
                </>
              )}
            </ul>

            {/* Bottom (always visible when logged in) */}
            <ul className="flex flex-col gap-1 pt-4 border-t border-white/20">
              <li>
                <Link
                  to="/subscriptions"
                  className={linkClasses("/subscriptions")}
                  aria-current={isActive("/subscriptions") ? "page" : undefined}
                >
                  <CreditCard size={20} />
                  Subscriptions
                </Link>
              </li>
              <li>
                <Link
                  to="/settings"
                  className={linkClasses("/settings")}
                  aria-current={isActive("/settings") ? "page" : undefined}
                >
                  <Settings size={20} />
                  Settings
                </Link>
              </li>
              <li>
                <button
                  onClick={handleSignOut}
                  className={`${baseLink} w-full hover:bg-red-600`}
                >
                  <LogOut size={20} />
                  Sign Out
                </button>
              </li>
            </ul>
          </>
        ) : (
          // Anonymous
          <ul className="flex-1 flex flex-col gap-1">
            <li>
              <Link to="/" className={linkClasses("/")}>
                <Home size={20} />
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/sign-in"
                className={linkClasses("/sign-in")}
                aria-current={isActive("/sign-in") ? "page" : undefined}
              >
                <LogIn size={20} />
                Sign In
              </Link>
            </li>
            <li>
              <Link
                to="/sign-up"
                className={linkClasses("/sign-up")}
                aria-current={isActive("/sign-up") ? "page" : undefined}
              >
                <UserPlus size={20} />
                Sign Up
              </Link>
            </li>
          </ul>
        )}
      </nav>
    </>
  );
};

export default NavBar;