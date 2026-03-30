import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { ChangeRequest } from '../lib/database.types';
import { ConflictCalendar } from './ConflictCalendar';
import { ChangeRequestForm } from './ChangeRequestForm';
import { ChangeRequestList } from './ChangeRequestList';
import { Settings, Plus, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export function ChangeManagement() {
  const { user, profile } = useAuth();
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pendingApproval: 0,
    inTesting: 0,
    scheduledToday: 0,
  });

  const isChangeUser = profile?.is_change_user || false;
  const isChangeAdmin = profile?.is_change_admin || false;
  const isChangeTester = profile?.is_change_tester || false;

  useEffect(() => {
    fetchChanges();

    const channel = supabase
      .channel('change_management_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'change_requests' },
        () => {
          fetchChanges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchChanges = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('change_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setChanges(data || []);
      calculateStats(data || []);
    } catch (err) {
      console.error('Error fetching changes:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (changeData: ChangeRequest[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    setStats({
      total: changeData.length,
      pendingApproval: changeData.filter(c => c.status === 'pending_approval').length,
      inTesting: changeData.filter(c => c.status === 'in_testing').length,
      scheduledToday: changeData.filter(c => {
        const startDate = new Date(c.start_date);
        startDate.setHours(0, 0, 0, 0);
        return c.status === 'scheduled' && startDate.getTime() === today.getTime();
      }).length,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading change management...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-slate-900" />
          <h2 className="text-2xl font-bold text-slate-900">Change Management</h2>
        </div>
        {isChangeUser && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            New Change Request
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-600">Total Requests</h3>
            <Calendar className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-600">Pending Approval</h3>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-amber-600">{stats.pendingApproval}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-600">In Testing</h3>
            <AlertCircle className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{stats.inTesting}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-600">Scheduled Today</h3>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-green-600">{stats.scheduledToday}</p>
        </div>
      </div>

      <ConflictCalendar changes={changes} />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Change Requests</h3>
        <ChangeRequestList changes={changes} onUpdate={fetchChanges} />
      </div>

      {showForm && (
        <ChangeRequestForm
          onSuccess={() => {
            setShowForm(false);
            fetchChanges();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
