import React, { useContext } from 'react'
import { Link } from 'react-router'
import { UserContext } from '../../contexts/UserContext'
import {
  Home, BookOpen, PlusCircle, UserPlus, LogOut, LogIn,
  UserPlus as SignUpIcon, Settings, CreditCard
} from 'lucide-react'

const NavBar = () => {
  const { user, setUser } = useContext(UserContext)

  const handleSignOut = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const linkClasses =
    'flex items-center py-2 gap-3 px-2 rounded-lg hover:bg-green-800 transition'

  return (
    <nav className="w-50 h-screen sticky top-0 shrink-0 bg-green-600 text-white flex flex-col p-6 gap-3 shadow-lg">
      {/* Brand / Logo */}
      <div className="mb-2 text-center">
        <Link to="/" className="text-3xl font-bold text-white hover:text-gray-300">
          TADRIB
        </Link>
        <p><small><center>v.01</center></small></p>

      </div>

      {/* Navigation Links (fills available height) */}
      <ul className="flex-1 flex flex-col gap-3 overflow-y-auto">
        {user ? (
          <>
            <li>
              <Link to="/" className={linkClasses}>
                <Home size={20} /> Home
              </Link>
            </li>
            <li>
              <Link to="/courses" className={linkClasses}>
                <BookOpen size={20} /> Courses
              </Link>
            </li>
            <li>
              <Link to="/instructors" className={linkClasses}>
                <UserPlus size={20} /> Instructors
              </Link>
            </li>
            <li>
              <Link to="/attendance" className={linkClasses}>
                <UserPlus size={20} /> Attendance
              </Link>
            </li>
            <li>
              <Link to="/payments" className={linkClasses}>
                <UserPlus size={20} /> Payments
              </Link>
            </li>
            <li>
              <button
                onClick={handleSignOut}
                className={`${linkClasses} hover:bg-red-600`}
              >
                <LogOut size={20} /> Sign Out
              </button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/" className={linkClasses}>
                <Home size={20} /> Home
              </Link>
            </li>
            <li>
              <Link to="/sign-in" className={linkClasses}>
                <LogIn size={20} /> Sign In
              </Link>
            </li>
            <li>
              <Link to="/sign-up" className={linkClasses}>
                <SignUpIcon size={20} /> Sign Up
              </Link>
            </li>
          </>
        )}
      </ul>

      {/* Bottom section (stays pinned) */}
      <ul className="flex flex-col gap-3 pt-4 border-t border-white/20">
        <li>
          <Link to="/subscriptions" className={linkClasses}>
            <CreditCard size={20} /> Subscriptions
          </Link>
        </li>
        <li>
          <Link to="/settings" className={linkClasses}>
            <Settings size={20} /> Settings
          </Link>
        </li>
      </ul>
    </nav>
  )
}

export default NavBar