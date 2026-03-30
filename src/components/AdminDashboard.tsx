import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../lib/database.types';
import { useRefresh } from '../contexts/RefreshContext';
import { Shield, Check, X, UserCog, UserX } from 'lucide-react';

export function AdminDashboard() {
  const { triggerRefresh } = useRefresh();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel('admin_dashboard_user_profiles_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_profiles' },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const updateUser = async (userId: string, updates: Partial<UserProfile>) => {
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      setError(error.message);
    } else {
      triggerRefresh();
      await fetchUsers();
    }
  };

  const toggleRole = async (userId: string, role: 'is_developer' | 'is_validator' | 'is_db_admin' | 'is_admin' | 'is_change_user' | 'is_change_admin' | 'is_change_tester', currentValue: boolean) => {
    const user = users.find(u => u.id === userId);
    if (!user?.is_approved) {
      setError('Cannot assign roles to pending users. Please approve the user first.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    await updateUser(userId, { [role]: !currentValue });
  };

  const approveUser = async (userId: string) => {
    await updateUser(userId, { is_approved: true, is_developer: true });
  };

  const rejectUser = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('No active session');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Delete user error:', result);
        setError(result.error || 'Failed to delete user');
        setTimeout(() => setError(''), 5000);
      } else {
        triggerRefresh();
        await fetchUsers();
      }
    } catch (err) {
      console.error('Delete user exception:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      setTimeout(() => setError(''), 5000);
    }
  };

  const revokeAccess = async (userId: string) => {
    await updateUser(userId, {
      is_approved: false,
      is_developer: false,
      is_validator: false,
      is_db_admin: false,
      is_admin: false,
      is_change_user: false,
      is_change_admin: false,
      is_change_tester: false
    });
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user?')) return;

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError('No active session');
        setTimeout(() => setError(''), 5000);
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      };

      console.log('Calling delete-user function with userId:', userId);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId }),
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response body:', result);

      if (!response.ok) {
        console.error('Delete user error:', result);
        setError(result.error || 'Failed to delete user');
        setTimeout(() => setError(''), 5000);
      } else {
        console.log('Delete successful');
        triggerRefresh();
        await fetchUsers();
      }
    } catch (err) {
      console.error('Delete user exception:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      setTimeout(() => setError(''), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-slate-900" />
        <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Roles</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-slate-900">{user.full_name}</div>
                      <div className="text-sm text-slate-600">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.deleted_at ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-sm font-medium">
                        <X className="w-4 h-4" />
                        Deleted
                      </span>
                    ) : user.is_approved ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        <Check className="w-4 h-4" />
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                        <X className="w-4 h-4" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => toggleRole(user.id, 'is_developer', user.is_developer)}
                        disabled={!user.is_approved || !!user.deleted_at}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          user.is_developer
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        } ${!user.is_approved || user.deleted_at ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Developer
                      </button>
                      <button
                        onClick={() => toggleRole(user.id, 'is_validator', user.is_validator)}
                        disabled={!user.is_approved || !!user.deleted_at}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          user.is_validator
                            ? 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        } ${!user.is_approved || user.deleted_at ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Validator
                      </button>
                      <button
                        onClick={() => toggleRole(user.id, 'is_db_admin', user.is_db_admin)}
                        disabled={!user.is_approved || !!user.deleted_at}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          user.is_db_admin
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        } ${!user.is_approved || user.deleted_at ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        DB Admin
                      </button>
                      <button
                        onClick={() => toggleRole(user.id, 'is_admin', user.is_admin)}
                        disabled={!user.is_approved || !!user.deleted_at}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          user.is_admin
                            ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        } ${!user.is_approved || user.deleted_at ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Admin
                      </button>
                      <button
                        onClick={() => toggleRole(user.id, 'is_change_user', user.is_change_user)}
                        disabled={!user.is_approved || !!user.deleted_at}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          user.is_change_user
                            ? 'bg-violet-100 text-violet-800 hover:bg-violet-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        } ${!user.is_approved || user.deleted_at ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Change User
                      </button>
                      <button
                        onClick={() => toggleRole(user.id, 'is_change_admin', user.is_change_admin)}
                        disabled={!user.is_approved || !!user.deleted_at}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          user.is_change_admin
                            ? 'bg-pink-100 text-pink-800 hover:bg-pink-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        } ${!user.is_approved || user.deleted_at ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Change Admin
                      </button>
                      <button
                        onClick={() => toggleRole(user.id, 'is_change_tester', user.is_change_tester)}
                        disabled={!user.is_approved || !!user.deleted_at}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          user.is_change_tester
                            ? 'bg-teal-100 text-teal-800 hover:bg-teal-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        } ${!user.is_approved || user.deleted_at ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Change Tester
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.deleted_at ? (
                      <div className="text-sm text-slate-500 italic">
                        Deleted on {new Date(user.deleted_at).toLocaleDateString()}
                      </div>
                    ) : user.is_approved ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => revokeAccess(user.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium"
                        >
                          <UserCog className="w-4 h-4" />
                          Revoke Access
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          <UserX className="w-4 h-4" />
                          Delete User
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveUser(user.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => rejectUser(user.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          <UserX className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12 text-slate-600">
            No users found
          </div>
        )}
      </div>
    </div>
  );
}
