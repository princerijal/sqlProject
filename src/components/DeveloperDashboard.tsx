import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Query, QueryTemplate, UserProfile } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';
import { Code, Plus, Trash2, CreditCard as Edit, Send, AlertCircle, CheckCircle, Clock, BookOpen } from 'lucide-react';
import { TemplateGallery } from './TemplateGallery';

type QueryWithUsers = Query & {
  validator?: UserProfile;
  executor?: UserProfile;
};

export function DeveloperDashboard() {
  const { user } = useAuth();
  const [queries, setQueries] = useState<QueryWithUsers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingQuery, setEditingQuery] = useState<Query | null>(null);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    database_name: '',
    environment: 'DEV' as 'DEV' | 'UAT' | 'LIVE',
    sql_content: '',
  });

  const handleSelectTemplate = (template: QueryTemplate) => {
    setFormData({
      title: template.title,
      database_name: template.database_name,
      environment: 'DEV' as 'DEV' | 'UAT' | 'LIVE',
      sql_content: template.sql_content,
    });
    setShowForm(true);
  };

  useEffect(() => {
    fetchQueries();

    if (!user) return;

    const channel = supabase
      .channel('developer_dashboard_queries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queries',
          filter: `developer_id=eq.${user.id}`
        },
        () => {
          fetchQueries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchQueries = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('queries')
      .select(`
        *,
        validator:validated_by (*),
        executor:executed_by (*)
      `)
      .eq('developer_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      const queriesWithUsers = (data || []).map(q => ({
        ...q,
        validator: Array.isArray(q.validator) ? q.validator[0] : q.validator,
        executor: Array.isArray(q.executor) ? q.executor[0] : q.executor,
      }));
      setQueries(queriesWithUsers);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) return;

    if (editingQuery) {
      const { error: updateError } = await supabase
        .from('queries')
        .update({
          title: formData.title,
          database_name: formData.database_name,
          environment: formData.environment,
          sql_content: formData.sql_content,
          status: 'pending',
          version: editingQuery.version + 1,
          rejection_reason: null,
        })
        .eq('id', editingQuery.id);

      if (!updateError) {
        await supabase.from('query_history').insert({
          query_id: editingQuery.id,
          action: 'resubmitted',
          performed_by: user.id,
          old_content: editingQuery.sql_content,
          new_content: formData.sql_content,
          notes: 'Query resubmitted after rejection',
        });
      }

      if (updateError) {
        setError(updateError.message);
      } else {
        setFormData({ title: '', database_name: '', environment: 'DEV', sql_content: '' });
        setShowForm(false);
        setEditingQuery(null);
        await fetchQueries();
      }
    } else {
      const { data: newQuery, error: insertError } = await supabase
        .from('queries')
        .insert({
          developer_id: user.id,
          database_name: formData.database_name,
          environment: formData.environment,
          title: formData.title,
          sql_content: formData.sql_content,
        })
        .select()
        .single();

      if (!insertError && newQuery) {
        await supabase.from('query_history').insert({
          query_id: newQuery.id,
          action: 'created',
          performed_by: user.id,
          new_content: formData.sql_content,
          notes: 'Initial query submission',
        });
      }

      if (insertError) {
        setError(insertError.message);
      } else {
        setFormData({ title: '', database_name: '', environment: 'DEV', sql_content: '' });
        setShowForm(false);
        await fetchQueries();
      }
    }
  };

  const handleEdit = (query: Query) => {
    setEditingQuery(query);
    setFormData({
      title: query.title,
      database_name: query.database_name,
      environment: query.environment,
      sql_content: query.sql_content,
    });
    setShowForm(true);
  };

  const handleDelete = async (queryId: string) => {
    if (!confirm('Are you sure you want to delete this query?')) return;

    const { error: deleteError } = await supabase
      .from('queries')
      .delete()
      .eq('id', queryId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      await fetchQueries();
    }
  };

  const getStatusBadge = (query: Query) => {
    switch (query.status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            Pending Validation
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Approved - Awaiting Execution
          </span>
        );
      case 'executed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Executed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            Rejected
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Code className="w-8 h-8 text-slate-900" />
          <h2 className="text-2xl font-bold text-slate-900">My SQL Queries</h2>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTemplateGallery(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium shadow-lg"
          >
            <BookOpen className="w-5 h-5" />
            Browse Templates
          </button>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingQuery(null);
              setFormData({ title: '', sql_content: '' });
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            New Query
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {editingQuery ? 'Edit Query' : 'Submit New Query'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">
                Query Title
              </label>
              <input
                id="title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="e.g., Update user permissions"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="database_name" className="block text-sm font-medium text-slate-700 mb-2">
                  Database Name
                </label>
                <input
                  id="database_name"
                  type="text"
                  required
                  value={formData.database_name}
                  onChange={(e) => setFormData({ ...formData, database_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="e.g., production_db"
                />
              </div>

              <div>
                <label htmlFor="environment" className="block text-sm font-medium text-slate-700 mb-2">
                  Environment
                </label>
                <select
                  id="environment"
                  required
                  value={formData.environment}
                  onChange={(e) => setFormData({ ...formData, environment: e.target.value as 'DEV' | 'UAT' | 'LIVE' })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="DEV">DEV</option>
                  <option value="UAT">UAT</option>
                  <option value="LIVE">LIVE</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="sql_content" className="block text-sm font-medium text-slate-700 mb-2">
                SQL Query
              </label>
              <textarea
                id="sql_content"
                required
                value={formData.sql_content}
                onChange={(e) => setFormData({ ...formData, sql_content: e.target.value })}
                rows={10}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent font-mono text-sm"
                placeholder="SELECT * FROM users WHERE..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
              >
                <Send className="w-4 h-4" />
                {editingQuery ? 'Resubmit Query' : 'Submit Query'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingQuery(null);
                  setFormData({ title: '', database_name: '', environment: 'DEV', sql_content: '' });
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {queries.map((query) => (
          <div key={query.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{query.title}</h3>
                <div className="flex items-center gap-3 text-sm text-slate-600 flex-wrap">
                  {getStatusBadge(query)}
                  <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium">db: {query.database_name}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    query.environment === 'LIVE' ? 'bg-red-100 text-red-800' :
                    query.environment === 'UAT' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>env: {query.environment}</span>
                  <span>Version {query.version}</span>
                  <span>Created {new Date(query.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {query.status === 'rejected' && (
                  <button
                    onClick={() => handleEdit(query)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit and resubmit"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                )}
                {query.status === 'pending' && (
                  <button
                    onClick={() => handleDelete(query.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete query"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <pre className="text-sm text-slate-800 overflow-x-auto font-mono whitespace-pre-wrap">
                {query.sql_content}
              </pre>
            </div>

            <div className="bg-slate-100 rounded-lg p-4 mb-4">
              <p className="text-xs font-medium text-slate-600 mb-2">Status History:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-slate-700">
                    <span className="font-semibold">Created</span> on {new Date(query.created_at).toLocaleString()}
                  </span>
                </div>
                {query.validated_at && query.validator && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${query.status === 'approved' || query.status === 'executed' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-slate-700">
                      <span className="font-semibold">{query.status === 'rejected' ? 'Rejected' : 'Approved'}</span> by {query.validator.full_name} on {new Date(query.validated_at).toLocaleString()}
                    </span>
                  </div>
                )}
                {query.executed_at && query.executor && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-slate-700">
                      <span className="font-semibold">Executed</span> by {query.executor.full_name} on {new Date(query.executed_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {query.status === 'rejected' && query.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-900 mb-1">Rejection Reason:</p>
                <p className="text-sm text-red-700">{query.rejection_reason}</p>
              </div>
            )}

            {query.status === 'approved' && query.email_sent_to && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700">
                  Query approved and sent to: <span className="font-medium">{query.email_sent_to}</span>
                </p>
              </div>
            )}
          </div>
        ))}

        {queries.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Code className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">No queries yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Submit Your First Query
            </button>
          </div>
        )}
      </div>

      {showTemplateGallery && (
        <TemplateGallery
          onSelectTemplate={handleSelectTemplate}
          onClose={() => setShowTemplateGallery(false)}
        />
      )}
    </div>
  );
}
