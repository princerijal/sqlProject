import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Query, UserProfile, QueryHistory } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';
import { useRefresh } from '../contexts/RefreshContext';
import { ClipboardCheck, Check, X, Mail, Clock, CheckCircle, AlertCircle, AlertTriangle, Eye } from 'lucide-react';
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

export function ReviewerDashboard() {
  const { user, profile } = useAuth();
  const { triggerRefresh } = useRefresh();
  const [queries, setQueries] = useState<QueryWithDeveloper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'executed' | 'all'>('pending');
  const [reviewingQuery, setReviewingQuery] = useState<Query | null>(null);
  const [reviewMode, setReviewMode] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [selectedDbAdminId, setSelectedDbAdminId] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [explainPlan, setExplainPlan] = useState<string | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [executingQuery, setExecutingQuery] = useState(false);
  const [dbAdmins, setDbAdmins] = useState<UserProfile[]>([]);

  const checkDangerousKeywords = (sql: string): boolean => {
    const dangerousKeywords = ['DROP', 'TRUNCATE'];
    const upperSql = sql.toUpperCase();
    return dangerousKeywords.some(keyword => upperSql.includes(keyword));
  };

  const handleViewExecutionPlan = async (query: Query) => {
    setLoadingExplain(true);
    setExplainPlan(null);
    setError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/explain-query`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sql: query.sql_content }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || result.details || 'Failed to generate execution plan');
      }

      setExplainPlan(JSON.stringify(result.plan, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate execution plan');
    } finally {
      setLoadingExplain(false);
    }
  };

  useEffect(() => {
    fetchQueries();
    fetchDbAdmins();

    const channel = supabase
      .channel('reviewer_dashboard_queries_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queries' },
        () => {
          fetchQueries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const fetchDbAdmins = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('is_db_admin', true)
      .eq('is_approved', true)
      .is('deleted_at', null)
      .order('full_name', { ascending: true });

    if (data) {
      setDbAdmins(data);
    }
  };

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

  const handleApprove = async (query: Query) => {
    if (!emailAddress || !emailAddress.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (!user) return;

    setSendingEmail(true);
    setError('');

    try {
      const { data: currentQuery } = await supabase
        .from('queries')
        .select('status')
        .eq('id', query.id)
        .single();

      if (currentQuery?.status !== 'pending') {
        setError(`Query has already been ${currentQuery?.status}. Please refresh.`);
        setSendingEmail(false);
        setReviewingQuery(null);
        await fetchQueries();
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-query-email`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: emailAddress,
          queryTitle: query.title,
          queryContent: query.sql_content,
          queryId: query.id,
          dbAdminId: selectedDbAdminId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      const { error: updateError } = await supabase
        .from('queries')
        .update({
          status: 'approved',
          validated_by: user.id,
          validated_at: new Date().toISOString(),
          email_sent_to: emailAddress,
        })
        .eq('id', query.id)
        .eq('status', 'pending');

      if (!updateError) {
        await supabase.from('query_history').insert({
          query_id: query.id,
          action: 'approved',
          performed_by: user.id,
          notes: `Approved and sent to ${emailAddress}`,
        });
      }

      if (updateError) {
        setError(updateError.message);
      } else {
        setReviewingQuery(null);
        setReviewMode(null);
        setEmailAddress(''); setSelectedDbAdminId('');
        triggerRefresh();
        await fetchQueries();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleReject = async (query: Query) => {
    if (!rejectionReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    if (!user) return;

    const { data: currentQuery } = await supabase
      .from('queries')
      .select('status')
      .eq('id', query.id)
      .single();

    if (currentQuery?.status !== 'pending') {
      setError(`Query has already been ${currentQuery?.status}. Please refresh.`);
      setReviewingQuery(null);
      await fetchQueries();
      return;
    }

    const { error: updateError } = await supabase
      .from('queries')
      .update({
        status: 'rejected',
        validated_by: user.id,
        validated_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
      })
      .eq('id', query.id)
      .eq('status', 'pending');

    if (!updateError) {
      await supabase.from('query_history').insert({
        query_id: query.id,
        action: 'rejected',
        performed_by: user.id,
        notes: rejectionReason,
      });
    }

    if (updateError) {
      setError(updateError.message);
    } else {
      setReviewingQuery(null);
      setReviewMode(null);
      setRejectionReason('');
      triggerRefresh();
      await fetchQueries();
    }
  };

  const handleExecute = async (query: Query) => {
    if (!user || !(profile?.is_db_admin || profile?.is_admin)) return;

    const { data: currentQuery } = await supabase
      .from('queries')
      .select('status')
      .eq('id', query.id)
      .maybeSingle();

    if (currentQuery?.status !== 'approved') {
      setError('Only approved queries can be executed');
      return;
    }

    setExecutingQuery(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('queries')
        .update({
          status: 'executed',
          executed_by: user.id,
          executed_at: new Date().toISOString(),
        })
        .eq('id', query.id)
        .eq('status', 'approved');

      if (!updateError) {
        await supabase.from('query_history').insert({
          query_id: query.id,
          action: 'executed',
          performed_by: user.id,
          notes: 'Query marked as executed manually',
        });
      }

      if (updateError) {
        setError(updateError.message);
      } else {
        triggerRefresh();
        await fetchQueries();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark query as executed');
    } finally {
      setExecutingQuery(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            Rejected
          </span>
        );
      case 'executed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Executed
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading queries...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="w-8 h-8 text-slate-900" />
        <h2 className="text-2xl font-bold text-slate-900">Review Queries</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected', 'executed', 'all'] as const).map((filterOption) => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === filterOption
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {queries.map((query) => (
          <div key={query.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{query.title}</h3>
                <div className="flex items-center gap-3 text-sm text-slate-600 flex-wrap">
                  {getStatusBadge(query.status)}
                  {query.database_name && (
                    <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded-md text-xs font-medium">
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
                  {query.developer && (
                    <span>
                      Submitted by <span className="font-medium">{formatUserName(query.developer)}</span>
                    </span>
                  )}
                  <span>Version {query.version}</span>
                  <span>{new Date(query.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <pre className="text-sm text-slate-800 overflow-x-auto font-mono whitespace-pre-wrap">
                {query.sql_content}
              </pre>
            </div>

            <div className="bg-slate-100 rounded-lg p-4 mb-4">
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
                          {formatUserName(historyItem.user, 'Former User')} on{' '}
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
                        <span className="font-semibold">Created</span> by {formatUserName(query.developer, 'Former User')} on {new Date(query.created_at).toLocaleString()}
                      </span>
                    </div>
                    {query.validated_at && query.validator && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${query.status === 'approved' || query.status === 'executed' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-slate-700">
                          <span className="font-semibold">{query.status === 'rejected' ? 'Rejected' : 'Approved'}</span> by {formatUserName(query.validator)} on {new Date(query.validated_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {query.executed_at && query.executor && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0"></div>
                    <span className="text-slate-700">
                      <span className="font-semibold">Executed</span> by {formatUserName(query.executor)} on {new Date(query.executed_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {query.status === 'pending' && (profile?.is_validator || profile?.is_admin) && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setReviewingQuery(query);
                    setReviewMode('approve');
                    setEmailAddress(''); setSelectedDbAdminId('');
                    setRejectionReason('');
                    setExplainPlan(null);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => {
                    setReviewingQuery(query);
                    setReviewMode('reject');
                    setEmailAddress(''); setSelectedDbAdminId('');
                    setRejectionReason('');
                    setExplainPlan(null);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
              </div>
            )}

            {query.status === 'pending' && profile?.is_db_admin && !profile?.is_admin && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">View Only</p>
                    <p className="text-sm text-blue-700">DB Admins can only execute approved queries</p>
                  </div>
                </div>
              </div>
            )}

            {query.status === 'approved' && (profile?.is_db_admin || profile?.is_admin) && (
              <div className="space-y-3">
                <button
                  onClick={() => handleExecute(query)}
                  disabled={executingQuery}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {executingQuery ? 'Marking as Executed...' : 'Mark as Executed'}
                </button>
                {query.email_sent_to && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Execution Link Sent</p>
                        <p className="text-sm text-blue-700">
                          An execution link has been sent to <span className="font-medium">{query.email_sent_to}</span>.
                          You can also mark this query as executed manually using the button above.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {query.status === 'approved' && query.email_sent_to && !profile?.is_db_admin && !profile?.is_admin && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Query Awaiting Execution</p>
                    <p className="text-sm text-blue-700">
                      An execution link has been sent to <span className="font-medium">{query.email_sent_to}</span>.
                      The DB Admin will execute the query by clicking the link in their email or marking it manually.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {query.status === 'rejected' && query.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-900 mb-1">Rejection Reason:</p>
                <p className="text-sm text-red-700">{query.rejection_reason}</p>
              </div>
            )}
          </div>
        ))}

        {queries.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <ClipboardCheck className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No {filter !== 'all' ? filter : ''} queries found</p>
          </div>
        )}
      </div>

      {reviewingQuery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              Review Query: {reviewingQuery.title}
            </h3>

            {checkDangerousKeywords(reviewingQuery.sql_content) && (
              <div className="mb-4 bg-gradient-to-r from-red-600 to-pink-600 text-white p-4 rounded-xl border-2 border-red-700 shadow-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <p className="font-bold text-lg mb-1">DANGEROUS KEYWORDS DETECTED!</p>
                    <p className="text-sm">
                      This query contains potentially destructive operations (DROP, TRUNCATE).
                      Review carefully before approval as these operations can permanently delete data.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-slate-600">SQL Query:</p>
                <button
                  onClick={() => handleViewExecutionPlan(reviewingQuery)}
                  disabled={loadingExplain}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  {loadingExplain ? 'Analyzing...' : 'View Execution Plan'}
                </button>
              </div>
              <pre className="text-sm text-slate-800 overflow-x-auto font-mono whitespace-pre-wrap">
                {reviewingQuery.sql_content}
              </pre>
            </div>

            {explainPlan && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-500 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3 mb-3">
                  <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900 mb-1">Query Execution Plan</p>
                    <p className="text-xs text-blue-700 mb-3">
                      This shows how the database will execute the query without actually running it.
                      Review for performance issues before approval.
                    </p>
                    <div className="bg-slate-900 rounded-lg p-3 max-h-64 overflow-auto">
                      <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                        {explainPlan}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setReviewMode('approve');
                    setEmailAddress(''); setSelectedDbAdminId('');
                    setRejectionReason('');
                  }}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    reviewMode === 'approve'
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    setReviewMode('reject');
                    setEmailAddress(''); setSelectedDbAdminId('');
                    setRejectionReason('');
                  }}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    reviewMode === 'reject'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Reject
                </button>
              </div>

              {reviewMode === 'approve' && (
                <div>
                  <label htmlFor="dbadmin" className="block text-sm font-medium text-slate-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Select DB Admin to Send Query
                  </label>
                  <select
                    id="dbadmin"
                    required
                    value={emailAddress}
                    onChange={(e) => {
                      const selectedAdmin = dbAdmins.find(admin => admin.email === e.target.value);
                      setEmailAddress(e.target.value);
                      setSelectedDbAdminId(selectedAdmin?.id || '');
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white"
                  >
                    <option value="">-- Select DB Admin --</option>
                    {dbAdmins.map((admin) => (
                      <option key={admin.id} value={admin.email}>
                        {admin.full_name ? `${admin.full_name} (${admin.email})` : admin.email}
                      </option>
                    ))}
                  </select>
                  {dbAdmins.length === 0 && (
                    <p className="text-sm text-amber-600 mt-2">
                      No DB Admins available. Please contact your administrator.
                    </p>
                  )}
                </div>
              )}

              {reviewMode === 'reject' && (
                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-2">
                    Rejection Reason
                  </label>
                  <textarea
                    id="reason"
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    placeholder="Explain why this query is being rejected..."
                  />
                </div>
              )}

              <div className="flex gap-3">
                {reviewMode === 'approve' && (
                  <button
                    onClick={() => handleApprove(reviewingQuery)}
                    disabled={sendingEmail}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {sendingEmail ? 'Sending...' : 'Confirm Approval'}
                  </button>
                )}
                {reviewMode === 'reject' && (
                  <button
                    onClick={() => handleReject(reviewingQuery)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    <X className="w-4 h-4" />
                    Confirm Rejection
                  </button>
                )}
                <button
                  onClick={() => {
                    setReviewingQuery(null);
                    setReviewMode(null);
                    setEmailAddress(''); setSelectedDbAdminId('');
                    setRejectionReason('');
                    setExplainPlan(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
