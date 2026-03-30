import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuditLog, UserProfile } from '../lib/database.types';
import { Clock, User, Filter, Search, RefreshCw, Database, Server } from 'lucide-react';
import { useRefresh } from '../contexts/RefreshContext';

interface AuditLogWithUser extends AuditLog {
  user_profile?: UserProfile;
}

export function AuditLogs() {
  const { refreshTrigger } = useRefresh();
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [databaseFilter, setDatabaseFilter] = useState<string>('all');
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [databases, setDatabases] = useState<string[]>([]);

  useEffect(() => {
    fetchLogs();
    fetchDatabases();

    const channel = supabase
      .channel('audit_logs_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_logs' },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshTrigger, filter, databaseFilter, environmentFilter]);

  const fetchDatabases = async () => {
    try {
      const { data, error } = await supabase
        .from('queries')
        .select('database_name');

      if (error) throw error;

      const uniqueDatabases = [...new Set(data?.map(q => q.database_name) || [])];
      setDatabases(uniqueDatabases);
    } catch (error) {
      console.error('Error fetching databases:', error);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*, user_profile:user_profiles(*)')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('action_type', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${dateStr} at ${timeStr}.${ms}`;
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      query_created: 'Query Created',
      query_approved: 'Query Approved',
      query_rejected: 'Query Rejected',
      query_executed: 'Query Executed',
      query_updated: 'Query Updated',
      user_approved: 'User Approved',
      user_rejected: 'User Rejected',
      role_assigned: 'Role Modified',
    };
    return labels[actionType] || actionType;
  };

  const getActionColor = (actionType: string) => {
    const colors: Record<string, string> = {
      query_created: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      query_approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      query_rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      query_executed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      query_updated: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      user_approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      user_rejected: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      role_assigned: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    };
    return colors[actionType] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  const getActionDescription = (log: AuditLogWithUser) => {
    const details = log.details as Record<string, any>;

    switch (log.action_type) {
      case 'query_created':
        return `Created query "${details.query_title}"`;
      case 'query_approved':
        return `Approved query "${details.query_title}"`;
      case 'query_rejected':
        return `Rejected query "${details.query_title}"`;
      case 'query_executed':
        return `Executed query "${details.query_title}"`;
      case 'user_approved':
        return `Approved user ${details.email}`;
      case 'user_rejected':
        return `Rejected user ${details.email}`;
      case 'role_assigned':
        const oldRoles = details.old_roles || {};
        const newRoles = details.new_roles || {};
        const changes: string[] = [];

        if (oldRoles.is_developer !== newRoles.is_developer) {
          changes.push(newRoles.is_developer ? '+Developer' : '-Developer');
        }
        if (oldRoles.is_validator !== newRoles.is_validator) {
          changes.push(newRoles.is_validator ? '+Validator' : '-Validator');
        }
        if (oldRoles.is_db_admin !== newRoles.is_db_admin) {
          changes.push(newRoles.is_db_admin ? '+DB Admin' : '-DB Admin');
        }
        if (oldRoles.is_admin !== newRoles.is_admin) {
          changes.push(newRoles.is_admin ? '+Admin' : '-Admin');
        }

        return `Modified roles for ${details.email}: ${changes.join(', ')}`;
      default:
        return log.action_type;
    }
  };

  const getEnvironmentColor = (environment: string) => {
    const colors: Record<string, string> = {
      DEV: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      UAT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      LIVE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[environment] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  const filteredLogs = logs.filter(log => {
    const details = log.details as Record<string, any>;

    // Filter by database
    if (databaseFilter !== 'all' && details?.database_name !== databaseFilter) {
      return false;
    }

    // Filter by environment
    if (environmentFilter !== 'all' && details?.environment !== environmentFilter) {
      return false;
    }

    // Filter by search term
    if (searchTerm) {
      const description = getActionDescription(log).toLowerCase();
      const userName = log.user_profile?.full_name?.toLowerCase() || '';
      const userEmail = log.user_profile?.email?.toLowerCase() || '';
      const database = details?.database_name?.toLowerCase() || '';
      const environment = details?.environment?.toLowerCase() || '';

      return description.includes(searchTerm.toLowerCase()) ||
             userName.includes(searchTerm.toLowerCase()) ||
             userEmail.includes(searchTerm.toLowerCase()) ||
             database.includes(searchTerm.toLowerCase()) ||
             environment.includes(searchTerm.toLowerCase());
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            Audit Logs
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track all user actions with millisecond precision
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search logs..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Actions</option>
                <option value="query_created">Query Created</option>
                <option value="query_approved">Query Approved</option>
                <option value="query_rejected">Query Rejected</option>
                <option value="query_executed">Query Executed</option>
                <option value="user_approved">User Approved</option>
                <option value="user_rejected">User Rejected</option>
                <option value="role_assigned">Role Modified</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Database className="w-5 h-5 text-gray-400" />
              <select
                value={databaseFilter}
                onChange={(e) => setDatabaseFilter(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Databases</option>
                {databases.map(db => (
                  <option key={db} value={db}>{db}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <Server className="w-5 h-5 text-gray-400" />
              <select
                value={environmentFilter}
                onChange={(e) => setEnvironmentFilter(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Environments</option>
                <option value="DEV">Development</option>
                <option value="UAT">UAT</option>
                <option value="LIVE">Production</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-4">Loading audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No audit logs found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action_type)}`}>
                        {getActionLabel(log.action_type)}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        by <span className="font-semibold">{log.user_profile?.full_name || 'Unknown User'}</span>
                      </span>
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 mb-2">
                      {getActionDescription(log)}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formatTimestamp(log.created_at)}
                      </div>

                      {(() => {
                        const details = log.details as Record<string, any>;
                        return (
                          <>
                            {details?.database_name && (
                              <div className="flex items-center gap-2">
                                <Database className="w-4 h-4" />
                                <span className="font-medium">{details.database_name}</span>
                              </div>
                            )}
                            {details?.environment && (
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${getEnvironmentColor(details.environment)}`}>
                                {details.environment}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
