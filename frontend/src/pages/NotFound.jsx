import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <div className="min-h-screen bg-navy flex items-center justify-center font-nunito">
      <div className="text-center">
        <div className="text-8xl mb-4">🚀</div>
        <h1 className="text-4xl font-black text-white mb-2">Lost in Space!</h1>
        <p className="text-slate-400 mb-6">This page doesn't exist.</p>
        <Link to="/" className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl transition">
          Go Home
        </Link>
      </div>
    </div>
  );
}
