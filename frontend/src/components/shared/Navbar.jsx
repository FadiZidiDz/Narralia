import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout, isTeacher } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
      <Link to={isTeacher ? '/teacher/dashboard' : '/dashboard'} className="flex items-center gap-2">
        <span className="text-2xl">🚀</span>
        <span className="font-black text-xl text-white tracking-tight">Nar<span className="text-purple-400">ralia</span></span>
      </Link>

      <div className="flex items-center gap-4">
        {user && (
          <>
            <span className="text-slate-400 text-sm hidden sm:block">
              {user.name}
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-bold ${isTeacher ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}`}>
                {user.role}
              </span>
            </span>
            {!isTeacher && (
              <Link to="/stories" className="text-slate-300 hover:text-white text-sm font-semibold transition">Stories</Link>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-red-400 font-semibold transition"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
