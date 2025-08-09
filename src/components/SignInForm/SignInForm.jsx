import { useState, useContext } from 'react'
import { useNavigate } from 'react-router'
import { signIn } from '../../services/authService'
import { UserContext } from '../../contexts/UserContext'

const SignInForm = () => {
  const navigate = useNavigate()
  const { setUser } = useContext(UserContext)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })

  const handleChange = (evt) => {
    setMessage('')
    setFormData({ ...formData, [evt.target.name]: evt.target.value })
  }

  const handleSubmit = async (evt) => {
    evt.preventDefault()
    try {
      const signedInUser = await signIn(formData)
      setUser(signedInUser)
      navigate('/')
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
<main className="min-h-screen bg-gray-200 flex flex-col items-center justify-center px-4">

  {/* Logo or Text */}
  <div className="text-3xl mb-6 text-center">
    <h1 className='text-3xl font-bold text-white text-green-800'>TADRIB</h1>
  </div>

  {/* Sign In Card */}
  <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
    <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Sign In</h1>

    {message && (
      <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">
        {message}
      </p>
    )}

    <form autoComplete="off" onSubmit={handleSubmit} className="space-y-5">
      {/* Username */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          Username
        </label>
        <input
          type="text"
          autoComplete="off"
          id="username"
          value={formData.username}
          name="username"
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900"
        />
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          type="password"
          autoComplete="off"
          id="password"
          value={formData.password}
          name="password"
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full bg-gray-200 text-gray-900 py-2 px-4 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</main>

  )
}

export default SignInForm