import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Query, UserProfile, QueryHistory as QueryHistoryType } from '../lib/database.types';
import { History, FileText, Check, X, Clock, AlertCircle, User } from 'lucide-react';
import { formatUserName, formatUserNameOrStored } from '../lib/userUtils';

type QueryHistoryWithUser = QueryHistoryType & {
  user?: UserProfile;
};

type QueryWithUsers = Query & {
  developer?: UserProfile;
  validator?: UserProfile;
  executor?: UserProfile;
  history?: QueryHistoryWithUser[];
};

interface QueryHistoryProps {
  queryId?: string;
  initialFilter?: 'all' | 'pending' | 'approved' | 'rejected' | 'executed';
}

export function QueryHistory({ queryId, initialFilter = 'all' }: QueryHistoryProps) {
  const [queries, setQueries] = useState<QueryWithUsers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'executed'>(initialFilter);

  useEffect(() => {
    fetchQueries();
  }, [queryId, filter]);

  const fetchQueries = async () => {
    setLoading(true);
    let query = supabase
      .from('queries')
      .select(`
        *,
        developer:developer_id (*),
        validator:validated_by (*),
        executor:executed_by (*)
      `)
      .order('updated_at', { ascending: false });

    if (queryId) {
      query = query.eq('id', queryId);
    }

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (error) {
      setError(error.message);
    } else {
      // Fetch history for each query
      const queriesWithUsers = await Promise.all((data || []).map(async (q) => {
        const { data: historyData } = await supabase
          .from('query_history')
          .select(`
            *,
            user:performed_by (*)
          `)
          .eq('query_id', q.id)
          .order('created_at', { ascending: false });

        const historyWithUsers = (historyData || []).map(h => ({
          ...h,
          user: Array.isArray(h.user) ? h.user[0] : h.user
        }));

        return {
          ...q,
          developer: Array.isArray(q.developer) ? q.developer[0] : q.developer,
          validator: Array.isArray(q.validator) ? q.validator[0] : q.validator,
          executor: Array.isArray(q.executor) ? q.executor[0] : q.executor,
          history: historyWithUsers,
        };
      }));

      setQueries(queriesWithUsers);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <Check className="w-5 h-5 text-white" />;
      case 'rejected':
        return <X className="w-5 h-5 text-white" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-white" />;
      default:
        return <FileText className="w-5 h-5 text-white" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'from-green-500 to-emerald-500';
      case 'rejected':
        return 'from-red-500 to-pink-500';
      case 'pending':
        return 'from-amber-500 to-orange-500';
      case 'executed':
        return 'from-blue-500 to-indigo-500';
      default:
        return 'from-gray-500 to-slate-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            All Queries
          </h2>
          <p className="text-gray-600 mt-1">View all submitted queries and their current status</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected', 'executed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                filter === status
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl animate-shake">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {queries.length > 0 ? (
          queries.map((query) => (
            <div key={query.id} className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-start gap-4">
                <div className={`p-3 bg-gradient-to-br ${getStatusColor(query.status)} rounded-xl shadow-lg flex-shrink-0`}>
                  {getStatusIcon(query.status)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{query.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                        {query.database_name && (
                          <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md text-xs font-medium">
                            db: {query.database_name}
                          </span>
                        )}
                        {query.environment && (
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                            query.environment === 'LIVE' ? 'bg-red-100 text-red-700' :
                            query.environment === 'UAT' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            env: {query.environment}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>Created by <span className="font-semibold">{formatUserNameOrStored(query.developer, (query as any).developer_name)}</span></span>
                        </div>
                        <span>•</span>
                        <span>{new Date(query.created_at).toLocaleDateString()}</span>
                        {query.version > 1 && (
                          <>
                            <span>•</span>
                            <span className="font-medium">Version {query.version}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r ${getStatusColor(query.status)} text-white rounded-full text-sm font-semibold whitespace-nowrap`}>
                      {getStatusIcon(query.status)}
                      {query.status.charAt(0).toUpperCase() + query.status.slice(1)}
                    </span>
                  </div>

                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 mb-3">
                    <p className="text-xs font-medium text-gray-600 mb-2">SQL Query:</p>
                    <pre className="text-sm text-gray-800 overflow-x-auto font-mono whitespace-pre-wrap">
                      {query.sql_content}
                    </pre>
                  </div>

                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 mb-3">
                    <p className="text-xs font-medium text-slate-600 mb-3">Action History:</p>
                    <div className="space-y-2">
                      {query.history && query.history.length > 0 ? (
                        query.history.map((historyItem, index) => {
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
                                return 'bg-slate-500';
                            }
                          };

                          const getActionLabel = (action: string) => {
                            return action.charAt(0).toUpperCase() + action.slice(1);
                          };

                          return (
                            <div key={index} className="flex items-start gap-2 text-sm">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${getActionColor(historyItem.action)}`}></div>
                              <span className="text-slate-700">
                                <span className="font-semibold">{getActionLabel(historyItem.action)}</span> by{' '}
                                {formatUserNameOrStored(historyItem.user, (historyItem as any).performer_name)} on{' '}
                                {new Date(historyItem.created_at).toLocaleString()}
                                {historyItem.notes && (
                                  <span className="block text-xs text-slate-600 mt-0.5 ml-4">
                                    {historyItem.notes}
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-slate-700">
                              <span className="font-semibold">Created</span> by {formatUserNameOrStored(query.developer, (query as any).developer_name)} on {new Date(query.created_at).toLocaleString()}
                            </span>
                          </div>
                          {query.validated_at && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className={`w-2 h-2 rounded-full ${query.status === 'approved' || query.status === 'executed' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              <span className="text-slate-700">
                                <span className="font-semibold">{query.status === 'rejected' ? 'Rejected' : 'Approved'}</span> by {formatUserNameOrStored(query.validator, (query as any).validator_name)} on {new Date(query.validated_at).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {query.executed_at && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-slate-700">
                                <span className="font-semibold">Executed</span> by {formatUserNameOrStored(query.executor, (query as any).executor_name)} on {new Date(query.executed_at).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {query.status === 'rejected' && query.rejection_reason && (
                    <div className="bg-gradient-to-br from-red-50 to-pink-50 border-l-4 border-red-500 rounded-xl p-4 mb-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-red-900 mb-1">Rejection Reason</p>
                          <p className="text-sm text-red-700">{query.rejection_reason}</p>
                          {query.validated_at && (
                            <p className="text-xs text-red-600 mt-2">
                              Rejected by {formatUserNameOrStored(query.validator, (query as any).validator_name)} on {new Date(query.validated_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {query.status === 'approved' && query.validated_at && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-green-900 mb-1">Approved</p>
                          <p className="text-sm text-green-700">
                            Approved by {formatUserNameOrStored(query.validator, (query as any).validator_name)} on {new Date(query.validated_at!).toLocaleString()}
                          </p>
                          {query.email_sent_to && (
                            <p className="text-xs text-green-600 mt-2">
                              Notification sent to: {query.email_sent_to}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {query.status === 'executed' && query.executed_at && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-blue-900 mb-1">Executed</p>
                          <p className="text-sm text-blue-700">
                            Executed by {formatUserNameOrStored(query.executor, (query as any).executor_name)} on {new Date(query.executed_at!).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 text-center border border-gray-200/50">
            <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No queries found</p>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your filter or create a new query</p>
          </div>
        )}
      </div>
    </div>
  );
}
