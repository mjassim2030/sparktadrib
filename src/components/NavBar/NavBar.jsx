import React, { useContext, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { UserContext } from "../../contexts/UserContext";
import { Home, BookOpen, UserPlus, LogOut, LogIn, Settings, CreditCard, Menu, X } from "lucide-react";

const NavBar = () => {
  const { user, setUser } = useContext(UserContext);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the drawer on route change
  useEffect(() => setOpen(false), [location.pathname]);

  // Prevent body scroll only when the drawer is open (mobile)
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const linkClasses = "flex items-center py-2 gap-3 px-6 -mx-6 transition hover:bg-green-800";

  return (
    <>
      {/* MOBILE HEADER (fixed) */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-green-600 text-white h-14 shadow flex items-center">
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="sidebar"
          onClick={() => setOpen(o => !o)}
          className="p-5"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className="flex-1 text-center -ml-10">
          <Link to="/" className="text-xl font-bold tracking-wide">TADRIB</Link>
        </div>
      </header>

      {/* MOBILE OVERLAY */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      {/* FIXED SIDEBAR (slides in mobile; pinned on desktop) */}
      <nav
        id="sidebar"
        className={[
          "fixed inset-y-0 left-0 z-50 w-64 transform md:translate-x-0 bg-green-600 text-white",
          open ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",                             // always visible on md+
          "bg-green-600 text-white flex flex-col p-6 gap-3 shadow-xl",
          "overflow-y-auto"                               // sidebar can scroll if content exceeds viewport
        ].join(" ")}
      >
        {/* Brand / Logo (desktop only) */}
        <div className="mb-2 text-center hidden md:block">
          <Link to="/" className="text-3xl font-bold text-white hover:text-gray-300">TADRIB</Link>
          <p><small>v.01</small></p>
        </div>

        {/* Links */}
        <ul className="flex-1 flex flex-col gap-3">
          {user ? (
            <>
              <li><Link to="/" className={linkClasses}><Home size={20} /> Home</Link></li>
              <li><Link to="/courses" className={linkClasses}><BookOpen size={20} /> Courses</Link></li>
              <li><Link to="/instructors" className={linkClasses}><UserPlus size={20} /> Instructors</Link></li>
              <li><Link to="/attendance" className={linkClasses}><UserPlus size={20} /> Attendance</Link></li>
              <li><Link to="/payments" className={linkClasses}><CreditCard size={20} /> Payments</Link></li>
            </>
          ) : (
            <>
              <li><Link to="/" className={linkClasses}><Home size={20} /> Home</Link></li>
              <li><Link to="/sign-in" className={linkClasses}><LogIn size={20} /> Sign In</Link></li>
              <li><Link to="/sign-up" className={linkClasses}><UserPlus size={20} /> Sign Up</Link></li>
            </>
          )}
        </ul>

        {/* Bottom */}
        <ul className="flex flex-col gap-3 pt-4 border-t border-white/20">
          <li><Link to="/subscriptions" className={linkClasses}><CreditCard size={20} /> Subscriptions</Link></li>
          <li><Link to="/settings" className={linkClasses}><Settings size={20} /> Settings</Link></li>
          <li>
            <button onClick={handleSignOut} className={`${linkClasses} w-full hover:bg-red-600`}>
              <LogOut size={20} /> Sign Out
            </button>
          </li>
        </ul>
      </nav>
    </>
  );

};

export default NavBar;