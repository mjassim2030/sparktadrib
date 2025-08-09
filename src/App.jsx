// App.jsx
import { useContext, useState, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import NavBar from './components/NavBar/NavBar';
import SignUpForm from './components/SignUpForm/SignUpForm';
import SignInForm from './components/SignInForm/SignInForm';
import Landing from './components/Landing/Landing';
import Dashboard from './components/Dashboard/Dashboard';
import { UserContext } from './contexts/UserContext';
import CourseGrid from './components/CourseGrid/CourseGrid';
import * as hootService from './services/hootService';
import CourseDetails from './components/CourseDetails/CourseDetails';
import HootForm from './components/HootForm/HootForm';
import InstructorForm from './components/InstructorForm/InstructorForm';

const AppLayout = () => (
  <div className="flex min-h-screen bg-gray-100">
    <NavBar />
    <main className="flex-1 min-w-0 p-6">
      <Outlet />
    </main>
  </div>
);

// Simple auth gate to avoid “no routes matched” during initial load
const RequireAuth = ({ user }) => (user ? <Outlet /> : <Navigate to="/sign-in" replace />);

const App = () => {
  const [hoots, setHoots] = useState([]);
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllHoots = async () => {
      const res = await hootService.index();
      setHoots(Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : []);
    };
    if (user) fetchAllHoots();
  }, [user]);

  const handleAddHoot = async (hootFormData) => {
    const newHoot = await hootService.create(hootFormData);
    setHoots((prev) => [newHoot, ...(Array.isArray(prev) ? prev : [])]);
    navigate('/courses');
  };

  const handleUpdateHoot = async (hootId, hootFormData) => {
    const updatedHoot = await hootService.update(hootId, hootFormData);
    setHoots((prev) => prev.map((h) => (h._id === hootId ? updatedHoot : h)));
    navigate(`/courses/${hootId}`);
  };

  const handleDeleteHoot = async (hootId) => {
    const deletedHoot = await hootService.deleteHoot(hootId);
    setHoots((prev) => prev.filter((h) => h._id !== deletedHoot._id));
    navigate('/courses');
  };

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/sign-up" element={<SignUpForm />} />
      <Route path="/sign-in" element={<SignInForm />} />

      {/* Private routes (always declared), gated by auth */}
      <Route element={<RequireAuth user={user} />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="courses" element={<CourseGrid hoots={hoots} />} />
          <Route path="courses/new" element={<HootForm handleAddHoot={handleAddHoot} />} />
          <Route path="courses/:id" element={<CourseDetails />} />
          <Route path="courses/:id/edit" element={<HootForm handleUpdateHoot={handleUpdateHoot} />} />
          <Route path="instructors/new" element={<InstructorForm />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;