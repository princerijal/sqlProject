import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { QueryTemplate, UserProfile } from '../lib/database.types';
import { FileText, Search, X, ChevronRight, Plus, User, Clock, CreditCard as Edit2, Trash2, History } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface TemplateWithCreator extends QueryTemplate {
  creator?: UserProfile;
  modifier?: UserProfile;
  deleter?: UserProfile;
}

interface TemplateGalleryProps {
  onSelectTemplate: (template: QueryTemplate) => void;
  onClose: () => void;
}

export function TemplateGallery({ onSelectTemplate, onClose }: TemplateGalleryProps) {
  const { profile } = useAuth();
  const [templates, setTemplates] = useState<TemplateWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeletedTemplates, setShowDeletedTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QueryTemplate | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    database_name: '',
    sql_content: '',
  });

  useEffect(() => {
    fetchTemplates();
    if (showDeletedTemplates) {
      setSelectedCategory('all');
    }

    const channel = supabase
      .channel('template_gallery_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'query_templates' },
        () => {
          fetchTemplates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showDeletedTemplates]);

  const fetchTemplates = async () => {
    setLoading(true);

    let query = supabase
      .from('query_templates')
      .select(`
        *,
        creator:user_profiles!query_templates_created_by_fkey(*),
        modifier:user_profiles!query_templates_modified_by_fkey(*),
        deleter:user_profiles!query_templates_deleted_by_fkey(*)
      `)
      .eq('is_public', true);

    if (!showDeletedTemplates) {
      query = query.or('is_deleted.is.null,is_deleted.eq.false');
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (!error && data) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from('query_templates')
      .insert({
        title: formData.title,
        database_name: formData.database_name,
        sql_content: formData.sql_content,
        is_public: true,
      });

    if (!error) {
      setShowAddForm(false);
      setFormData({
        title: '',
        database_name: '',
        sql_content: '',
      });
      await fetchTemplates();
    }
  };

  const handleEditTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    const { error } = await supabase
      .from('query_templates')
      .update({
        title: formData.title,
        database_name: formData.database_name,
        sql_content: formData.sql_content,
        modified_by: profile?.id,
        modified_at: new Date().toISOString(),
      })
      .eq('id', editingTemplate.id);

    if (!error) {
      setShowEditForm(false);
      setEditingTemplate(null);
      setFormData({
        title: '',
        database_name: '',
        sql_content: '',
      });
      await fetchTemplates();
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template? It will be archived and only admins can view it.')) {
      return;
    }

    const { error } = await supabase
      .from('query_templates')
      .update({
        is_deleted: true,
        deleted_by: profile?.id,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', templateId);

    if (!error) {
      await fetchTemplates();
    }
  };

  const openEditForm = (template: QueryTemplate) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      database_name: template.database_name || '',
      sql_content: template.sql_content,
    });
    setShowEditForm(true);
  };

  const recordTemplateUsage = async (templateId: string) => {
    await supabase.from('template_usage').insert({
      template_id: templateId,
      user_id: profile?.id,
    });

    await supabase
      .from('query_templates')
      .update({ usage_count: supabase.raw('usage_count + 1') })
      .eq('id', templateId);
  };

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.database_name).filter(Boolean)))];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.database_name && template.database_name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (showDeletedTemplates) {
      return matchesSearch;
    }

    const matchesCategory = selectedCategory === 'all' || template.database_name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-4xl w-full">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Query Template Gallery
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Select a pre-built template to get started quickly</p>
            </div>
            <div className="flex gap-2">
              {profile?.is_admin && (
                <button
                  onClick={() => setShowDeletedTemplates(!showDeletedTemplates)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium ${
                    showDeletedTemplates
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <History className="w-5 h-5" />
                  {showDeletedTemplates ? 'Hide Deleted' : 'Show Deleted'}
                </button>
              )}
              {(profile?.is_admin || profile?.is_db_admin || profile?.is_developer) && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-medium shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  Add Template
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          {!showDeletedTemplates && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {category === 'all' ? 'All Databases' : category}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={`bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-2 rounded-xl p-5 hover:shadow-lg transition-all ${
                  template.is_deleted
                    ? 'border-red-300 dark:border-red-800 opacity-75'
                    : 'border-gray-200 dark:border-gray-700 hover:border-indigo-500'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      template.is_deleted
                        ? 'bg-red-500'
                        : 'bg-gradient-to-br from-indigo-500 to-purple-500'
                    }`}>
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100">
                          {template.title}
                        </h3>
                        {template.is_deleted && (
                          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-medium">
                            Deleted
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {template.database_name && (
                          <span className="inline-block px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-medium">
                            {template.database_name}
                          </span>
                        )}
                        {template.usage_count > 0 && (
                          <span className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium">
                            Used {template.usage_count}x
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!template.is_deleted && (profile?.is_admin || profile?.is_db_admin || profile?.is_developer) && (
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditForm(template);
                        }}
                        className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                        title="Edit template"
                      >
                        <Edit2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all"
                        title="Delete template"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  )}

                  {!template.is_deleted && (
                    <button
                      onClick={() => {
                        recordTemplateUsage(template.id);
                        onSelectTemplate(template);
                        onClose();
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all ml-1"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 hover:text-indigo-600 transition-colors" />
                    </button>
                  )}
                </div>

                <div className="space-y-2 mb-3 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-4">
                    {template.creator && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>Created by: {template.creator.full_name || template.creator.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(template.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {template.modified_at && template.modifier && (
                    <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <Edit2 className="w-3 h-3" />
                      <span>Modified by: {template.modifier.full_name || template.modifier.email} on {new Date(template.modified_at).toLocaleDateString()}</span>
                    </div>
                  )}

                  {template.is_deleted && template.deleted_at && template.deleter && (
                    <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <Trash2 className="w-3 h-3" />
                      <span>Deleted by: {template.deleter.full_name || template.deleter.email} on {new Date(template.deleted_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="bg-gray-800 dark:bg-gray-950 rounded-lg p-3">
                  <pre className="text-xs text-gray-300 dark:text-gray-400 overflow-hidden font-mono line-clamp-3">
                    {template.sql_content}
                  </pre>
                </div>
              </div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">No templates found</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Try adjusting your search or filter</p>
            </div>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-10">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Add New Template</h3>
            <form onSubmit={handleAddTemplate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  placeholder="e.g., User Authentication Query"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Database Name</label>
                <input
                  type="text"
                  required
                  value={formData.database_name}
                  onChange={(e) => setFormData({ ...formData, database_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  placeholder="e.g., production_db, customer_db, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SQL Query</label>
                <textarea
                  required
                  value={formData.sql_content}
                  onChange={(e) => setFormData({ ...formData, sql_content: e.target.value })}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent font-mono text-sm"
                  placeholder="SELECT * FROM..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-medium"
                >
                  Add Template
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ title: '', database_name: '', sql_content: '' });
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditForm && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-10">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit Template</h3>
            <form onSubmit={handleEditTemplate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  placeholder="e.g., User Authentication Query"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Database Name</label>
                <input
                  type="text"
                  required
                  value={formData.database_name}
                  onChange={(e) => setFormData({ ...formData, database_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  placeholder="e.g., production_db, customer_db, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SQL Query</label>
                <textarea
                  required
                  value={formData.sql_content}
                  onChange={(e) => setFormData({ ...formData, sql_content: e.target.value })}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent font-mono text-sm"
                  placeholder="SELECT * FROM..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-medium"
                >
                  Update Template
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingTemplate(null);
                    setFormData({ title: '', database_name: '', sql_content: '' });
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
