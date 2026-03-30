import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Settings, ChevronDown, Code } from 'lucide-react';
import { Notifications } from './Notifications';

interface HeaderProps {
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onNavigateToQuery?: (queryId: string) => void;
}

export function Header({ onProfileClick, onSettingsClick, onNavigateToQuery }: HeaderProps) {
  const { profile, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!profile) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadges = () => {
    const roles = [];
    if (profile.is_admin) roles.push('Admin');
    if (profile.is_db_admin) roles.push('DB Admin');
    if (profile.is_developer) roles.push('Developer');
    return roles;
  };

  return (
    <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3 animate-slide-in-left">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl shadow-lg">
              <Code className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                SQL Query Manager
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Intuition Query Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-4 animate-slide-in-right">
            <Notifications onNavigateToQuery={onNavigateToQuery} />

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 group"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{profile.full_name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{profile.email}</div>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-110 transition-transform">
                  {getInitials(profile.full_name)}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 animate-scale-in overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                        {getInitials(profile.full_name)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{profile.full_name}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{profile.email}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {getRoleBadges().map((role) => (
                        <span
                          key={role}
                          className="px-2 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-medium rounded-lg"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        onProfileClick?.();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                    >
                      <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        onSettingsClick?.();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Settings</span>
                    </button>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-700 pt-1">
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        signOut();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
