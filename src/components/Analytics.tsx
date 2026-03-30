import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, TrendingDown, Activity, CheckCircle, XCircle, Clock, Users, Database, Search, AlertCircle } from 'lucide-react';

interface Stats {
  totalQueries: number;
  approvedQueries: number;
  rejectedQueries: number;
  pendingQueries: number;
  executedQueries: number;
  approvedNotExecutedQueries: number;
  totalUsers: number;
  approvedUsers: number;
}

type View = 'developer' | 'reviewer' | 'admin' | 'history' | 'analytics';

interface AnalyticsProps {
  onNavigate?: (view: View, filter?: 'all' | 'pending' | 'approved' | 'rejected' | 'executed') => void;
  onShowAdvancedFilter?: () => void;
}

export function Analytics({ onNavigate, onShowAdvancedFilter }: AnalyticsProps = {}) {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalQueries: 0,
    approvedQueries: 0,
    rejectedQueries: 0,
    pendingQueries: 0,
    executedQueries: 0,
    approvedNotExecutedQueries: 0,
    totalUsers: 0,
    approvedUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);

    const [queriesResult, usersResult] = await Promise.all([
      supabase.from('queries').select('status', { count: 'exact' }),
      supabase.from('user_profiles').select('is_approved').is('deleted_at', null),
    ]);

    const queries = queriesResult.data || [];
    const approvedQueries = queries.filter(q => q.status === 'approved').length;
    const rejectedQueries = queries.filter(q => q.status === 'rejected').length;
    const pendingQueries = queries.filter(q => q.status === 'pending').length;
    const executedQueries = queries.filter(q => q.status === 'executed').length;
    const approvedNotExecutedQueries = queries.filter(q => q.status === 'approved').length;

    const users = usersResult.data || [];
    const approvedUsers = users.filter(u => u.is_approved).length;

    setStats({
      totalQueries: queries.length,
      approvedQueries: approvedQueries + executedQueries,
      rejectedQueries,
      pendingQueries,
      executedQueries,
      approvedNotExecutedQueries,
      totalUsers: users.length,
      approvedUsers,
    });

    setLoading(false);
  };

  const displayStats = stats;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const approvalRate = displayStats.totalQueries > 0
    ? Math.round((displayStats.approvedQueries / displayStats.totalQueries) * 100)
    : 0;

  const statCards = [
    {
      title: 'Total Queries',
      value: displayStats.totalQueries,
      icon: Database,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      darkBgGradient: 'dark:from-blue-900/30 dark:to-cyan-900/30',
      navigateTo: 'history' as View,
      filter: 'all' as const,
    },
    {
      title: 'Executed Queries',
      value: displayStats.executedQueries,
      icon: CheckCircle,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100',
      darkBgGradient: 'dark:from-blue-900/30 dark:to-blue-800/30',
      navigateTo: 'history' as View,
      filter: 'executed' as const,
    },
    {
      title: 'Approved (Not Executed)',
      value: displayStats.approvedNotExecutedQueries,
      icon: AlertCircle,
      gradient: 'from-teal-500 to-cyan-500',
      bgGradient: 'from-teal-50 to-cyan-50',
      darkBgGradient: 'dark:from-teal-900/30 dark:to-cyan-900/30',
      navigateTo: 'history' as View,
      filter: 'approved' as const,
    },
    {
      title: 'Rejected Queries',
      value: displayStats.rejectedQueries,
      icon: XCircle,
      gradient: 'from-red-500 to-pink-500',
      bgGradient: 'from-red-50 to-pink-50',
      darkBgGradient: 'dark:from-red-900/30 dark:to-pink-900/30',
      navigateTo: 'history' as View,
      filter: 'rejected' as const,
    },
    {
      title: 'Pending Queries',
      value: displayStats.pendingQueries,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-500',
      bgGradient: 'from-amber-50 to-orange-50',
      darkBgGradient: 'dark:from-amber-900/30 dark:to-orange-900/30',
      navigateTo: (profile?.is_db_admin || profile?.is_admin) ? 'reviewer' : 'history' as View,
      filter: 'pending' as const,
    },
  ];

  const userCards = [
    {
      title: 'Total Users',
      value: displayStats.totalUsers,
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100',
      darkBgGradient: 'dark:from-blue-900/30 dark:to-blue-800/30',
      navigateTo: 'admin' as View,
    },
    {
      title: 'Approved Users',
      value: displayStats.approvedUsers,
      icon: CheckCircle,
      gradient: 'from-green-500 to-teal-500',
      bgGradient: 'from-green-50 to-teal-50',
      darkBgGradient: 'dark:from-green-900/30 dark:to-teal-900/30',
      navigateTo: 'admin' as View,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Analytics Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Overview of system performance and statistics</p>
        </div>
        <div className="flex gap-3">
          {profile?.is_admin && (
            <button
              onClick={onShowAdvancedFilter}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Advanced Filter
            </button>
          )}
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-105 shadow-lg"
          >
            Refresh
          </button>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              onClick={() => onNavigate?.(card.navigateTo, card.filter)}
              style={{ animationDelay: `${index * 0.1}s` }}
              className={`bg-gradient-to-br ${card.bgGradient} ${card.darkBgGradient} rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-slide-up cursor-pointer text-left`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 bg-gradient-to-br ${card.gradient} rounded-xl shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{card.title}</p>
                <p className={`text-3xl font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                  {card.value}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {profile?.is_admin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <button
                key={card.title}
                onClick={() => onNavigate?.(card.navigateTo)}
                style={{ animationDelay: `${(index + 4) * 0.1}s` }}
                className={`bg-gradient-to-br ${card.bgGradient} ${card.darkBgGradient} rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-slide-up cursor-pointer text-left`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 bg-gradient-to-br ${card.gradient} rounded-xl shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{card.title}</p>
                  <p className={`text-3xl font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                    {card.value}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Query Approval Rate</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Overall Approval Rate</span>
            <div className="flex items-center gap-2">
              {approvalRate >= 50 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
              <span className={`text-2xl font-bold ${
                approvalRate >= 50 ? 'text-green-600' : 'text-red-600'
              }`}>
                {approvalRate}%
              </span>
            </div>
          </div>
          <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${
                approvalRate >= 50
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                  : 'bg-gradient-to-r from-red-500 to-pink-500'
              }`}
              style={{ width: `${approvalRate}%` }}
            />
          </div>
          <div className="grid grid-cols-5 gap-4 pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{displayStats.approvedQueries}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{displayStats.executedQueries}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Executed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600">{displayStats.approvedNotExecutedQueries}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Not Executed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{displayStats.pendingQueries}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{displayStats.rejectedQueries}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Rejected</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-2xl p-6 border border-blue-100 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">System Activity</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-xl">
            <div className="text-xl font-bold text-blue-600">{displayStats.totalQueries}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Queries</div>
          </div>
          <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-xl">
            <div className="text-xl font-bold text-cyan-600">{displayStats.totalUsers}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Active Users</div>
          </div>
          <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-xl">
            <div className="text-xl font-bold text-green-600">{approvalRate}%</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Approval Rate</div>
          </div>
          <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-xl">
            <div className="text-xl font-bold text-amber-600">{displayStats.pendingQueries}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Awaiting Review</div>
          </div>
        </div>
      </div>
    </div>
  );
}
