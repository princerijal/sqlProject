import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Calendar, Shield, Code, Database, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

interface ProfileProps {
  onBack: () => void;
}

export function Profile({ onBack }: ProfileProps) {
  const { profile } = useAuth();

  if (!profile) return null;

  const roles = [];
  if (profile.is_admin) roles.push({ name: 'Admin', icon: Shield, color: 'from-red-500 to-pink-500' });
  if (profile.is_db_admin) roles.push({ name: 'DB Admin', icon: Database, color: 'from-blue-500 to-cyan-500' });
  if (profile.is_developer) roles.push({ name: 'Developer', icon: Code, color: 'from-green-500 to-emerald-500' });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/50 rounded-xl transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            My Profile
          </h2>
          <p className="text-gray-600 mt-1">View and manage your account information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg">
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-lg mb-4">
                {getInitials(profile.full_name)}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{profile.full_name}</h3>
              <p className="text-gray-600 text-sm mb-4">{profile.email}</p>

              <div className="flex items-center gap-2 mb-4">
                {profile.is_approved ? (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Approved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-sm font-medium">
                    <XCircle className="w-4 h-4" />
                    Pending Approval
                  </span>
                )}
              </div>

              <div className="w-full space-y-2">
                <div className="text-sm text-gray-600 font-medium mb-2">Assigned Roles</div>
                {roles.length > 0 ? (
                  roles.map((role) => {
                    const RoleIcon = role.icon;
                    return (
                      <div
                        key={role.name}
                        className={`flex items-center gap-3 p-3 bg-gradient-to-r ${role.color} rounded-xl text-white`}
                      >
                        <RoleIcon className="w-5 h-5" />
                        <span className="font-semibold">{role.name}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-500 text-sm py-4">
                    No roles assigned yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              Account Information
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
                <div className="p-2 bg-white rounded-lg">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-1">Full Name</div>
                  <div className="font-semibold text-gray-900">{profile.full_name}</div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
                <div className="p-2 bg-white rounded-lg">
                  <Mail className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-1">Email Address</div>
                  <div className="font-semibold text-gray-900">{profile.email}</div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
                <div className="p-2 bg-white rounded-lg">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-1">Member Since</div>
                  <div className="font-semibold text-gray-900">{formatDate(profile.created_at)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Permissions & Access
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl border-2 ${profile.is_developer ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Code className={`w-5 h-5 ${profile.is_developer ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="font-semibold text-gray-900">Developer</span>
                  </div>
                  {profile.is_developer ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-gray-600">
                  Can create and submit SQL queries
                </p>
              </div>

              <div className={`p-4 rounded-xl border-2 ${profile.is_db_admin ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className={`w-5 h-5 ${profile.is_db_admin ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="font-semibold text-gray-900">DB Admin</span>
                  </div>
                  {profile.is_db_admin ? (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-gray-600">
                  Can review and approve queries
                </p>
              </div>

              <div className={`p-4 rounded-xl border-2 ${profile.is_admin ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className={`w-5 h-5 ${profile.is_admin ? 'text-red-600' : 'text-gray-400'}`} />
                    <span className="font-semibold text-gray-900">Admin</span>
                  </div>
                  {profile.is_admin ? (
                    <CheckCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-gray-600">
                  Full system access and user management
                </p>
              </div>

              <div className="p-4 rounded-xl border-2 border-green-500 bg-green-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-gray-900">User</span>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-xs text-gray-600">
                  Can view all queries and history
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
