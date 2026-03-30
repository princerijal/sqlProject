import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Filter, X, TrendingUp, User, Calendar, Activity, CheckCircle, XCircle, Clock, AlertCircle, Database, Server } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  is_developer: boolean;
  is_validator: boolean;
  is_db_admin: boolean;
  deleted_at: string | null;
}

interface FilteredQuery {
  id: string;
  title: string;
  database_name: string;
  environment: string;
  status: string;
  sql_content: string;
  rejection_reason: string | null;
  validated_at: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
  developer: UserProfile;
  validator: UserProfile | null;
  executor: UserProfile | null;
}

interface AnalyticsFiltersProps {
  onBack: () => void;
}

type FilterStep = 'select-type' | 'select-user' | 'select-date' | 'select-database' | 'select-environment' | 'results';

export function AnalyticsFilters({ onBack }: AnalyticsFiltersProps) {
  const [step, setStep] = useState<FilterStep>('select-type');
  const [filterType, setFilterType] = useState<'developer' | 'validator' | 'executor' | 'date' | 'status' | 'database' | 'environment'>('developer');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [selectedEnvironment, setSelectedEnvironment] = useState<'DEV' | 'UAT' | 'LIVE' | 'all'>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'executed' | 'all'>('all');
  const [queries, setQueries] = useState<FilteredQuery[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    executed: 0,
  });
  const [showDeletedUsers, setShowDeletedUsers] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchDatabases();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, is_developer, is_validator, is_db_admin, deleted_at')
      .eq('is_approved', true)
      .order('full_name', { ascending: true });

    if (data) {
      setUsers(data);
    }
  };

  const fetchDatabases = async () => {
    const { data } = await supabase
      .from('queries')
      .select('database_name');

    if (data) {
      const uniqueDatabases = [...new Set(data.map(q => q.database_name))];
      setDatabases(uniqueDatabases);
    }
  };

  const handleFilterTypeSelect = (type: typeof filterType) => {
    setFilterType(type);
    if (type === 'date' || type === 'status') {
      setStep('select-date');
    } else if (type === 'database') {
      setStep('select-database');
    } else if (type === 'environment') {
      setStep('select-environment');
    } else {
      setStep('select-user');
    }
  };

  const handleUserSelect = async (userId: string) => {
    setSelectedUserId(userId);
    setLoading(true);

    let query = supabase
      .from('queries')
      .select(`
        id,
        title,
        database_name,
        environment,
        status,
        sql_content,
        rejection_reason,
        validated_at,
        executed_at,
        created_at,
        updated_at,
        developer:user_profiles!queries_developer_id_fkey (*),
        validator:user_profiles!queries_validated_by_fkey (*),
        executor:user_profiles!queries_executed_by_fkey (*)
      `)
      .order('created_at', { ascending: false });

    if (filterType === 'developer') {
      query = query.eq('developer_id', userId);
    } else if (filterType === 'validator') {
      query = query.eq('validated_by', userId);
    } else if (filterType === 'executor') {
      query = query.eq('executed_by', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching queries:', error);
    }

    if (data) {
      const queriesWithUsers = data.map(q => ({
        ...q,
        developer: Array.isArray(q.developer) ? q.developer[0] : q.developer,
        validator: q.validator && (Array.isArray(q.validator) ? q.validator[0] : q.validator),
        executor: q.executor && (Array.isArray(q.executor) ? q.executor[0] : q.executor),
      }));
      setQueries(queriesWithUsers);
      calculateStats(queriesWithUsers);
    }

    setLoading(false);
    setStep('results');
  };

  const handleDateSelect = async (range: typeof dateRange) => {
    setDateRange(range);
    setLoading(true);

    let query = supabase
      .from('queries')
      .select(`
        id,
        title,
        database_name,
        environment,
        status,
        sql_content,
        rejection_reason,
        validated_at,
        executed_at,
        created_at,
        updated_at,
        developer:user_profiles!queries_developer_id_fkey (*),
        validator:user_profiles!queries_validated_by_fkey (*),
        executor:user_profiles!queries_executed_by_fkey (*)
      `)
      .order('created_at', { ascending: false });

    if (range !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (range) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }

      query = query.gte('created_at', startDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching queries:', error);
    }

    if (data) {
      const queriesWithUsers = data.map(q => ({
        ...q,
        developer: Array.isArray(q.developer) ? q.developer[0] : q.developer,
        validator: q.validator && (Array.isArray(q.validator) ? q.validator[0] : q.validator),
        executor: q.executor && (Array.isArray(q.executor) ? q.executor[0] : q.executor),
      }));
      setQueries(queriesWithUsers);
      calculateStats(queriesWithUsers);
    }

    setLoading(false);
    setStep('results');
  };

  const handleStatusSelect = async (selectedStatus: typeof status) => {
    setStatus(selectedStatus);
    setLoading(true);

    let query = supabase
      .from('queries')
      .select(`
        id,
        title,
        database_name,
        environment,
        status,
        sql_content,
        rejection_reason,
        validated_at,
        executed_at,
        created_at,
        updated_at,
        developer:user_profiles!queries_developer_id_fkey (*),
        validator:user_profiles!queries_validated_by_fkey (*),
        executor:user_profiles!queries_executed_by_fkey (*)
      `)
      .order('created_at', { ascending: false });

    if (selectedStatus !== 'all') {
      query = query.eq('status', selectedStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching queries:', error);
    }

    if (data) {
      const queriesWithUsers = data.map(q => ({
        ...q,
        developer: Array.isArray(q.developer) ? q.developer[0] : q.developer,
        validator: q.validator && (Array.isArray(q.validator) ? q.validator[0] : q.validator),
        executor: q.executor && (Array.isArray(q.executor) ? q.executor[0] : q.executor),
      }));
      setQueries(queriesWithUsers);
      calculateStats(queriesWithUsers);
    }

    setLoading(false);
    setStep('results');
  };

  const handleDatabaseSelect = async (database: string) => {
    setSelectedDatabase(database);
    setLoading(true);

    let query = supabase
      .from('queries')
      .select(`
        id,
        title,
        database_name,
        environment,
        status,
        sql_content,
        rejection_reason,
        validated_at,
        executed_at,
        created_at,
        updated_at,
        developer:user_profiles!queries_developer_id_fkey (*),
        validator:user_profiles!queries_validated_by_fkey (*),
        executor:user_profiles!queries_executed_by_fkey (*)
      `)
      .eq('database_name', database)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching queries:', error);
    }

    if (data) {
      const queriesWithUsers = data.map(q => ({
        ...q,
        developer: Array.isArray(q.developer) ? q.developer[0] : q.developer,
        validator: q.validator && (Array.isArray(q.validator) ? q.validator[0] : q.validator),
        executor: q.executor && (Array.isArray(q.executor) ? q.executor[0] : q.executor),
      }));
      setQueries(queriesWithUsers);
      calculateStats(queriesWithUsers);
    }

    setLoading(false);
    setStep('results');
  };

  const handleEnvironmentSelect = async (environment: typeof selectedEnvironment) => {
    setSelectedEnvironment(environment);
    setLoading(true);

    let query = supabase
      .from('queries')
      .select(`
        id,
        title,
        database_name,
        environment,
        status,
        sql_content,
        rejection_reason,
        validated_at,
        executed_at,
        created_at,
        updated_at,
        developer:user_profiles!queries_developer_id_fkey (*),
        validator:user_profiles!queries_validated_by_fkey (*),
        executor:user_profiles!queries_executed_by_fkey (*)
      `)
      .order('created_at', { ascending: false });

    if (environment !== 'all') {
      query = query.eq('environment', environment);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching queries:', error);
    }

    if (data) {
      const queriesWithUsers = data.map(q => ({
        ...q,
        developer: Array.isArray(q.developer) ? q.developer[0] : q.developer,
        validator: q.validator && (Array.isArray(q.validator) ? q.validator[0] : q.validator),
        executor: q.executor && (Array.isArray(q.executor) ? q.executor[0] : q.executor),
      }));
      setQueries(queriesWithUsers);
      calculateStats(queriesWithUsers);
    }

    setLoading(false);
    setStep('results');
  };

  const calculateStats = (data: FilteredQuery[]) => {
    setStats({
      total: data.length,
      pending: data.filter(q => q.status === 'pending').length,
      approved: data.filter(q => q.status === 'approved').length,
      rejected: data.filter(q => q.status === 'rejected').length,
      executed: data.filter(q => q.status === 'executed').length,
    });
  };

  const resetFilters = () => {
    setStep('select-type');
    setFilterType('developer');
    setSelectedUserId('');
    setSelectedDatabase('');
    setSelectedEnvironment('all');
    setDateRange('all');
    setStatus('all');
    setQueries([]);
    setStats({ total: 0, pending: 0, approved: 0, rejected: 0, executed: 0 });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'executed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'executed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getEnvironmentColor = (environment: string) => {
    switch (environment) {
      case 'DEV':
        return 'text-green-600';
      case 'UAT':
        return 'text-yellow-600';
      case 'LIVE':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  const getFilteredUsers = () => {
    let filtered = users;

    switch (filterType) {
      case 'developer':
        filtered = users.filter(u => u.is_developer);
        break;
      case 'validator':
        filtered = users.filter(u => u.is_validator);
        break;
      case 'executor':
        filtered = users.filter(u => u.is_db_admin);
        break;
      default:
        filtered = users;
    }

    if (!showDeletedUsers) {
      filtered = filtered.filter(u => !u.deleted_at);
    }

    return filtered;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Advanced Analytics Filter
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {step === 'select-type' && 'Select what you want to filter by'}
            {step === 'select-user' && `Select a ${filterType}`}
            {step === 'select-date' && filterType === 'date' && 'Select a date range'}
            {step === 'select-date' && filterType === 'status' && 'Select a status'}
            {step === 'select-database' && 'Select a database'}
            {step === 'select-environment' && 'Select an environment'}
            {step === 'results' && 'Filtered results'}
          </p>
        </div>
        <div className="flex gap-3">
          {step === 'results' && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              New Filter
            </button>
          )}
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-105 shadow-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {step === 'select-type' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <button
            onClick={() => handleFilterTypeSelect('developer')}
            className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-2xl p-8 border border-blue-200 dark:border-blue-700/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left group"
          >
            <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg w-fit mb-4 group-hover:scale-110 transition-transform">
              <User className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">By Developer</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Filter queries by who created them</p>
          </button>

          <button
            onClick={() => handleFilterTypeSelect('validator')}
            className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl p-8 border border-green-200 dark:border-green-700/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left group"
          >
            <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg w-fit mb-4 group-hover:scale-110 transition-transform">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">By Validator</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Filter queries by who approved/rejected</p>
          </button>

          <button
            onClick={() => handleFilterTypeSelect('executor')}
            className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl p-8 border border-purple-200 dark:border-purple-700/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left group"
          >
            <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg w-fit mb-4 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">By Executor</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Filter queries by who executed them</p>
          </button>

          <button
            onClick={() => handleFilterTypeSelect('date')}
            className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl p-8 border border-amber-200 dark:border-amber-700/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left group"
          >
            <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg w-fit mb-4 group-hover:scale-110 transition-transform">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">By Date Range</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Filter queries by time period</p>
          </button>

          <button
            onClick={() => handleFilterTypeSelect('status')}
            className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 rounded-2xl p-8 border border-teal-200 dark:border-teal-700/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left group"
          >
            <div className="p-4 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl shadow-lg w-fit mb-4 group-hover:scale-110 transition-transform">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">By Status</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Filter queries by their current status</p>
          </button>

          <button
            onClick={() => handleFilterTypeSelect('database')}
            className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/30 dark:to-gray-900/30 rounded-2xl p-8 border border-slate-200 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left group"
          >
            <div className="p-4 bg-gradient-to-br from-slate-500 to-gray-500 rounded-xl shadow-lg w-fit mb-4 group-hover:scale-110 transition-transform">
              <Database className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">By Database</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Filter queries by database name</p>
          </button>

          <button
            onClick={() => handleFilterTypeSelect('environment')}
            className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/30 dark:to-pink-900/30 rounded-2xl p-8 border border-rose-200 dark:border-rose-700/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left group"
          >
            <div className="p-4 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl shadow-lg w-fit mb-4 group-hover:scale-110 transition-transform">
              <Server className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">By Environment</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Filter queries by environment type</p>
          </button>
        </div>
      )}

      {step === 'select-user' && (
        <div>
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Select a {filterType} to view all queries associated with them
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDeletedUsers}
                  onChange={(e) => setShowDeletedUsers(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Show Deleted Users</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilteredUsers().length === 0 ? (
              <div className="col-span-full bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Users Found</h3>
                <p className="text-gray-600 dark:text-gray-400">No users have the {filterType} role assigned.</p>
              </div>
            ) : (
              getFilteredUsers().map(user => {
                const isDeleted = !!user.deleted_at;
                return (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user.id)}
                    className={`rounded-xl p-6 border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left group ${
                      isDeleted
                        ? 'bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-600 opacity-60'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full group-hover:scale-110 transition-transform ${
                        isDeleted
                          ? 'bg-gray-400 dark:bg-gray-600'
                          : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                      }`}>
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-bold ${
                            isDeleted
                              ? 'text-gray-500 dark:text-gray-400 line-through'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {user.full_name || 'Unknown'}
                          </h4>
                          {isDeleted && (
                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-full">
                              Deleted
                            </span>
                          )}
                        </div>
                        <p className={`text-sm ${
                          isDeleted
                            ? 'text-gray-400 dark:text-gray-500'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>{user.email}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {step === 'select-date' && filterType === 'date' && (
        <div>
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Select a date range to view queries created within that period
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { value: 'today', label: 'Today', desc: 'Queries from today' },
              { value: 'week', label: 'Last 7 Days', desc: 'Past week queries' },
              { value: 'month', label: 'This Month', desc: 'Current month queries' },
              { value: 'year', label: 'This Year', desc: 'Current year queries' },
              { value: 'all', label: 'All Time', desc: 'All queries ever created' },
            ].map(range => (
              <button
                key={range.value}
                onClick={() => handleDateSelect(range.value as typeof dateRange)}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left"
              >
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl w-fit mb-3">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{range.label}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{range.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'select-date' && filterType === 'status' && (
        <div>
          <div className="mb-6 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-200 dark:border-teal-800">
            <p className="text-sm text-teal-800 dark:text-teal-300">
              Select a status to view all queries with that status
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { value: 'pending', label: 'Pending', desc: 'Awaiting review', color: 'from-amber-500 to-orange-500' },
              { value: 'approved', label: 'Approved', desc: 'Ready to execute', color: 'from-green-500 to-emerald-500' },
              { value: 'rejected', label: 'Rejected', desc: 'Not approved', color: 'from-red-500 to-pink-500' },
              { value: 'executed', label: 'Executed', desc: 'Successfully ran', color: 'from-blue-500 to-cyan-500' },
              { value: 'all', label: 'All Statuses', desc: 'Every query', color: 'from-gray-500 to-gray-600' },
            ].map(statusOption => (
              <button
                key={statusOption.value}
                onClick={() => handleStatusSelect(statusOption.value as typeof status)}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left"
              >
                <div className={`p-3 bg-gradient-to-br ${statusOption.color} rounded-xl w-fit mb-3`}>
                  {getStatusIcon(statusOption.value)}
                </div>
                <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{statusOption.label}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{statusOption.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'select-database' && (
        <div>
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-800 dark:text-slate-300">
              Select a database to view all queries for that database
            </p>
          </div>
          {databases.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Databases Found</h3>
              <p className="text-gray-600 dark:text-gray-400">No queries have been created yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {databases.map(db => (
                <button
                  key={db}
                  onClick={() => handleDatabaseSelect(db)}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left"
                >
                  <div className="p-3 bg-gradient-to-br from-slate-500 to-gray-500 rounded-xl w-fit mb-3">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{db}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Database name</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'select-environment' && (
        <div>
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800">
            <p className="text-sm text-rose-800 dark:text-rose-300">
              Select an environment to view queries for that environment
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { value: 'DEV', label: 'Development', desc: 'Development environment', color: 'from-green-500 to-emerald-500' },
              { value: 'UAT', label: 'UAT', desc: 'User Acceptance Testing', color: 'from-yellow-500 to-amber-500' },
              { value: 'LIVE', label: 'Production', desc: 'Live production environment', color: 'from-red-500 to-rose-500' },
              { value: 'all', label: 'All Environments', desc: 'Every environment', color: 'from-gray-500 to-gray-600' },
            ].map(env => (
              <button
                key={env.value}
                onClick={() => handleEnvironmentSelect(env.value as typeof selectedEnvironment)}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left"
              >
                <div className={`p-3 bg-gradient-to-br ${env.color} rounded-xl w-fit mb-3`}>
                  <Server className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{env.label}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{env.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'results' && loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      )}

      {step === 'results' && !loading && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-2xl p-6 border border-blue-200 dark:border-blue-700/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                Active Filter
              </h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {filterType === 'developer' && selectedUser && (
                <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">Developer:</span>
                  <span className="text-gray-600 dark:text-gray-400">{selectedUser.full_name || selectedUser.email}</span>
                </div>
              )}
              {filterType === 'validator' && selectedUser && (
                <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">Validator:</span>
                  <span className="text-gray-600 dark:text-gray-400">{selectedUser.full_name || selectedUser.email}</span>
                </div>
              )}
              {filterType === 'executor' && selectedUser && (
                <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">Executor:</span>
                  <span className="text-gray-600 dark:text-gray-400">{selectedUser.full_name || selectedUser.email}</span>
                </div>
              )}
              {filterType === 'date' && (
                <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">Date Range:</span>
                  <span className="text-gray-600 dark:text-gray-400 capitalize">{dateRange === 'all' ? 'All Time' : dateRange}</span>
                </div>
              )}
              {filterType === 'status' && (
                <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-teal-200 dark:border-teal-700 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-600" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">Status:</span>
                  <span className="text-gray-600 dark:text-gray-400 capitalize">{status === 'all' ? 'All Statuses' : status}</span>
                </div>
              )}
              {filterType === 'database' && selectedDatabase && (
                <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-600" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">Database:</span>
                  <span className="text-gray-600 dark:text-gray-400">{selectedDatabase}</span>
                </div>
              )}
              {filterType === 'environment' && (
                <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-rose-200 dark:border-rose-700 flex items-center gap-2">
                  <Server className="w-4 h-4 text-rose-600" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">Environment:</span>
                  <span className="text-gray-600 dark:text-gray-400 capitalize">{selectedEnvironment === 'all' ? 'All Environments' : selectedEnvironment}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Queries</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="text-3xl font-bold text-amber-600">{stats.pending}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Pending</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Approved</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Rejected</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="text-3xl font-bold text-blue-600">{stats.executed}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Executed</div>
            </div>
          </div>

          {queries.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-200 dark:border-gray-700 text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Results Found</h3>
              <p className="text-gray-600 dark:text-gray-400">No queries match your selected filter criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {queries.length} {queries.length === 1 ? 'Query' : 'Queries'} Found
              </h3>
              {queries.map(query => (
                <div
                  key={query.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{query.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <span>Database: <span className="font-medium text-gray-900 dark:text-gray-100">{query.database_name}</span></span>
                        <span>Environment: <span className={`font-medium ${query.environment === 'LIVE' ? 'text-red-600' : query.environment === 'UAT' ? 'text-amber-600' : 'text-blue-600'}`}>{query.environment}</span></span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(query.status)}`}>
                      {getStatusIcon(query.status)}
                      {query.status}
                    </span>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">SQL QUERY</p>
                    <pre className="text-sm text-gray-900 dark:text-gray-100 font-mono overflow-x-auto whitespace-pre-wrap break-words">
                      {query.sql_content}
                    </pre>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-medium text-blue-900 dark:text-blue-300">DEVELOPER</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-medium ${
                          query.developer?.deleted_at
                            ? 'text-gray-500 dark:text-gray-400 line-through'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {query.developer?.full_name || query.developer?.email || 'Unknown'}
                        </p>
                        {query.developer?.deleted_at && (
                          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-full">
                            Deleted
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Created: {formatDate(query.created_at)}
                      </p>
                    </div>

                    {query.validator && (
                      <div className={`${query.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'} rounded-lg p-4 border`}>
                        <div className="flex items-center gap-2 mb-2">
                          {query.status === 'rejected' ? (
                            <XCircle className="w-4 h-4 text-red-600" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                          <span className={`text-xs font-medium ${query.status === 'rejected' ? 'text-red-900 dark:text-red-300' : 'text-green-900 dark:text-green-300'}`}>
                            {query.status === 'rejected' ? 'REJECTED BY' : 'VALIDATED BY'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`font-medium ${
                            query.validator.deleted_at
                              ? 'text-gray-500 dark:text-gray-400 line-through'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {query.validator.full_name || query.validator.email}
                          </p>
                          {query.validator.deleted_at && (
                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-full">
                              Deleted
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {query.validated_at ? formatDate(query.validated_at) : 'No timestamp'}
                        </p>
                        {query.rejection_reason && (
                          <div className="mt-3 pt-3 border-t border-red-300 dark:border-red-700">
                            <p className="text-xs font-medium text-red-900 dark:text-red-300 mb-1">REASON</p>
                            <p className="text-sm text-gray-900 dark:text-gray-100">{query.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {query.executor && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-medium text-purple-900 dark:text-purple-300">EXECUTED BY</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`font-medium ${
                            query.executor.deleted_at
                              ? 'text-gray-500 dark:text-gray-400 line-through'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {query.executor.full_name || query.executor.email}
                          </p>
                          {query.executor.deleted_at && (
                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-full">
                              Deleted
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {query.executed_at ? formatDate(query.executed_at) : 'No timestamp'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <span>Last Updated: {formatDate(query.updated_at)}</span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                      ID: {query.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
