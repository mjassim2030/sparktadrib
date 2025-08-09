import React, { useContext } from 'react'
import { Link } from 'react-router'
import { UserContext } from '../../contexts/UserContext'
import { Home, BookOpen, PlusCircle, UserPlus, LogOut, LogIn, UserPlus as SignUpIcon } from 'lucide-react'

const NavBar = () => {
  const { user, setUser } = useContext(UserContext)

  const handleSignOut = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const linkClasses =
    'flex items-center py-2 gap-3 px-2 rounded-lg hover:bg-green-800 transition'

  return (
    <nav className="w-50 h-screen sticky top-0 shrink-0 bg-green-600 text-white flex flex-col p-6 space-y-3 shadow-lg">
      {/* Brand / Logo */}
      <div className="mb-5">
        <Link to="/" className="text-3xl font-bold text-white hover:text-gray-300">
          TADRIB
        </Link>
      </div>

      {/* Navigation Links */}
      <ul className="flex flex-col space-y-3">
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
              <Link to="/courses/new" className={linkClasses}>
                <PlusCircle size={20} /> New Course
              </Link>
            </li>
            <li>
              <Link to="/instructors/new" className={linkClasses}>
                <UserPlus size={20} /> New Instructor
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
    </nav>
  )
}

export default NavBar