import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await authService.register(form);
      login(data.token, data.user);
      navigate(data.user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4 font-nunito"
      style={{ backgroundImage: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 70%)' }}>

      <div className="w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <span className="text-6xl">🚀</span>
          <h1 className="text-4xl font-black text-white mt-3">Join Nar<span className="text-purple-400">ralia</span></h1>
          <p className="text-slate-400 mt-2">Start your story adventure today</p>
        </div>

        <div className="bg-slate-800/80 backdrop-blur rounded-2xl p-8 shadow-glow border border-slate-700">

          {/* Role selector */}
          <p className="text-slate-300 font-semibold text-sm mb-3">I am a...</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {['student', 'teacher'].map(role => (
              <button
                key={role}
                type="button"
                onClick={() => setForm(f => ({ ...f, role }))}
                className={`py-4 rounded-xl border-2 font-bold capitalize transition ${
                  form.role === role
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                {role === 'student' ? '🎒 Student' : '👩‍🏫 Teacher'}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Full Name', field: 'name', type: 'text', placeholder: 'Your name' },
              { label: 'Email', field: 'email', type: 'email', placeholder: 'you@example.com' },
              { label: 'Password (min 8 characters)', field: 'password', type: 'password', placeholder: '••••••••' }
            ].map(({ label, field, type, placeholder }) => (
              <div key={field}>
                <label className="block text-slate-300 text-sm font-semibold mb-1">{label}</label>
                <input
                  type={type}
                  value={form[field]}
                  onChange={update(field)}
                  required
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition"
                  placeholder={placeholder}
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
