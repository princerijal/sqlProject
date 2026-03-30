import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Calendar, Database, FileCode, User as UserIcon, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { Query, UserProfile, QueryHistory } from '../lib/database.types';
import { formatUserName } from '../lib/userUtils';

type QueryHistoryWithUser = QueryHistory & {
  user?: UserProfile;
};

type QueryWithDeveloper = Query & {
  developer?: UserProfile;
  validator?: UserProfile;
  executor?: UserProfile;
  history?: QueryHistoryWithUser[];
};

interface QueryDetailsModalProps {
  queryId: string;
  onClose: () => void;
}

export function QueryDetailsModal({ queryId, onClose }: QueryDetailsModalProps) {
  const [query, setQuery] = useState<QueryWithDeveloper | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQueryDetails();
  }, [queryId]);

  const fetchQueryDetails = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('queries')
      .select(`
        *,
        developer:developer_id (*),
        validator:validated_by (*),
        executor:executed_by (*),
        history:query_history(
          *,
          user:performed_by (*)
        )
      `)
      .eq('id', queryId)
      .single();

    if (data) {
      setQuery(data as QueryWithDeveloper);
    }

    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
      approved: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Approved' },
      rejected: { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Rejected' },
      executed: { icon: CheckCircle, color: 'bg-blue-100 text-blue-700', label: 'Executed' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!query) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full p-6">
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Query not found</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-start justify-between z-10">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{query.title}</h2>
            <div className="flex items-center gap-3 flex-wrap">
              {getStatusBadge(query.status)}
              {query.database_name && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                  <Database className="w-4 h-4" />
                  {query.database_name}
                </span>
              )}
              {query.environment && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  query.environment === 'LIVE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  query.environment === 'UAT' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {query.environment}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileCode className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">SQL Query</h3>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                {query.sql_content}
              </pre>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Created by</span>
              </div>
              <p className="text-gray-900 dark:text-white">{formatUserName(query.developer, 'Unknown')}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Created at</span>
              </div>
              <p className="text-gray-900 dark:text-white">{new Date(query.created_at).toLocaleString()}</p>
            </div>

            {query.validator && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Validated by</span>
                </div>
                <p className="text-gray-900 dark:text-white">{formatUserName(query.validator)}</p>
              </div>
            )}

            {query.executed_at && query.executor && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Executed by</span>
                </div>
                <p className="text-gray-900 dark:text-white">{formatUserName(query.executor)}</p>
              </div>
            )}
          </div>

          {query.rejection_reason && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 dark:text-red-400 mb-2">Rejection Reason</h3>
              <p className="text-red-700 dark:text-red-300 text-sm">{query.rejection_reason}</p>
            </div>
          )}

          {query.history && query.history.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Action History</h3>
              <div className="space-y-3">
                {query.history.map((historyItem, index) => {
                  const getActionColor = (action: string) => {
                    switch (action) {
                      case 'created':
                        return 'bg-blue-500';
                      case 'edited':
                        return 'bg-amber-500';
                      case 'approved':
                        return 'bg-green-500';
                      case 'rejected':
                        return 'bg-red-500';
                      case 'executed':
                        return 'bg-indigo-500';
                      case 'resubmitted':
                        return 'bg-purple-500';
                      default:
                        return 'bg-gray-500';
                    }
                  };

                  return (
                    <div key={index} className="flex items-start gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1.5 ${getActionColor(historyItem.action)}`}></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white">
                          <span className="font-semibold capitalize">{historyItem.action}</span> by{' '}
                          {formatUserName(historyItem.user, 'Former User')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(historyItem.created_at).toLocaleString()}
                        </p>
                        {historyItem.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                            {historyItem.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
