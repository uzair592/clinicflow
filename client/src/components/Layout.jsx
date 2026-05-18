import { Outlet, Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { LogOut, User, Activity, Calendar, FileText, Settings, ShieldAlert } from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavLinks = () => {
    switch (user?.role) {
      case 'admin':
        return [
          { name: 'Dashboard', path: '/admin/dashboard', icon: <Activity className="w-5 h-5" /> },
          { name: 'System Logs', path: '/admin/logs', icon: <ShieldAlert className="w-5 h-5" /> },
        ];
      case 'doctor':
        return [
          { name: 'My Schedule', path: '/doctor/dashboard', icon: <Calendar className="w-5 h-5" /> },
          { name: 'Patients', path: '/doctor/patients', icon: <User className="w-5 h-5" /> },
        ];
      case 'receptionist':
        return [
          { name: 'Front Desk', path: '/receptionist/dashboard', icon: <Calendar className="w-5 h-5" /> },
          { name: 'All Patients', path: '/receptionist/patients', icon: <User className="w-5 h-5" /> },
        ];
      case 'patient':
        return [
          { name: 'My Portal', path: '/patient/dashboard', icon: <User className="w-5 h-5" /> },
          { name: 'My Prescriptions', path: '/patient/prescriptions', icon: <FileText className="w-5 h-5" /> },
        ];
      default:
        return [];
    }
  };

  const links = getNavLinks();

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 text-2xl font-bold text-center border-b border-slate-700">
          Clinic<span className="text-blue-400">Flow</span>
        </div>
        
        <div className="flex-1 p-4 space-y-2">
          {links.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-800 transition"
            >
              {link.icon}
              <span>{link.name}</span>
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold">{user?.name}</div>
              <div className="text-xs text-slate-400 capitalize">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-red-400 hover:text-red-300 transition w-full"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between shrink-0">
          <h1 className="text-xl font-semibold text-slate-800 capitalize">{user?.role} Dashboard</h1>
          <div className="flex items-center space-x-4">
             <Settings className="w-5 h-5 text-slate-500 cursor-pointer hover:text-slate-700" />
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-6">
          {/* Outlet renders the page content */}
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
