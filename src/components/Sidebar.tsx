import { Code, ClipboardCheck, Shield, History, BarChart3, FileText, Video as LucideIcon, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type View = 'developer' | 'reviewer' | 'admin' | 'history' | 'analytics' | 'change-management';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  pendingQueriesCount: number;
  pendingUsersCount: number;
  userQueriesCount: number;
  totalQueriesCount: number;
}

interface NavItem {
  id: View;
  label: string;
  icon: LucideIcon;
  badge: number;
  description: string;
}

export function Sidebar({ currentView, onViewChange, pendingQueriesCount, pendingUsersCount, userQueriesCount, totalQueriesCount }: SidebarProps) {
  const { profile } = useAuth();

  if (!profile) return null;

  const navItems: NavItem[] = [
    ...(profile.is_developer ? [{
      id: 'developer' as View,
      label: 'My Queries',
      icon: Code,
      badge: 0,
      description: 'Create and manage SQL queries'
    }] : []),
    ...(profile.is_validator || profile.is_db_admin || profile.is_admin ? [{
      id: 'reviewer' as View,
      label: 'Review Queries',
      icon: ClipboardCheck,
      badge: pendingQueriesCount,
      description: 'Approve or reject queries'
    }] : []),
    ...(profile.is_admin ? [{
      id: 'admin' as View,
      label: 'User Management',
      icon: Shield,
      badge: pendingUsersCount,
      description: 'Manage users and permissions'
    }] : []),
    {
      id: 'history' as View,
      label: 'Query History',
      icon: History,
      badge: 0,
      description: 'View all past queries'
    },
    {
      id: 'analytics' as View,
      label: 'Analytics',
      icon: BarChart3,
      badge: 0,
      description: 'View statistics and insights'
    },
    ...(profile.is_change_user || profile.is_change_admin || profile.is_change_tester ? [{
      id: 'change-management' as View,
      label: 'Change Management',
      icon: Settings,
      badge: 0,
      description: 'Manage system changes'
    }] : []),
  ];

  return (
    <aside className="w-64 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 shadow-lg min-h-[calc(100vh-4rem)] sticky top-16 animate-slide-in-left transition-colors duration-300">
      <nav className="p-4 space-y-2">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              style={{ animationDelay: `${index * 0.1}s` }}
              className={`w-full group relative overflow-hidden rounded-xl transition-all duration-300 animate-fade-in ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 scale-105'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 hover:scale-102'
              }`}
            >
              <div className="flex items-center gap-3 px-4 py-3 relative z-10">
                <div className={`p-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-white/20'
                    : 'bg-gradient-to-br from-indigo-100 to-purple-100 group-hover:from-indigo-200 group-hover:to-purple-200'
                }`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-indigo-600'}`} />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">{item.label}</div>
                  <div className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                    {item.description}
                  </div>
                </div>
                {item.badge > 0 && (
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    isActive
                      ? 'bg-white text-indigo-600'
                      : 'bg-gradient-to-r from-red-500 to-pink-500 text-white animate-pulse'
                  }`}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 animate-shimmer" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 mt-8 mx-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
        <h3 className="font-semibold text-sm text-gray-900 mb-2">Quick Stats</h3>
        <div className="space-y-2 text-xs text-gray-600">
          {profile.is_developer && (
            <div className="flex justify-between items-center">
              <span>Your Queries</span>
              <span className="font-bold text-indigo-600">{userQueriesCount}</span>
            </div>
          )}
          {(profile.is_validator || profile.is_db_admin || profile.is_admin) && (
            <div className="flex justify-between items-center">
              <span>Pending Reviews</span>
              <span className="font-bold text-purple-600">{pendingQueriesCount}</span>
            </div>
          )}
          {profile.is_admin && (
            <div className="flex justify-between items-center">
              <span>Pending Users</span>
              <span className="font-bold text-pink-600">{pendingUsersCount}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-indigo-200">
            <span>Total Queries</span>
            <span className="font-bold text-blue-600">{totalQueriesCount}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
