import { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { useRefresh } from './contexts/RefreshContext';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { AdminDashboard } from './components/AdminDashboard';
import { DeveloperDashboard } from './components/DeveloperDashboard';
import { ReviewerDashboard } from './components/ReviewerDashboard';
import { QueryHistory } from './components/QueryHistory';
import { Analytics } from './components/Analytics';
import { AnalyticsFilters } from './components/AnalyticsFilters';
import { ChangeManagement } from './components/ChangeManagement';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { QueryDetailsModal } from './components/QueryDetailsModal';
import { LogOut, User, Shield } from 'lucide-react';
import { supabase } from './lib/supabase';

type View = 'developer' | 'reviewer' | 'admin' | 'history' | 'analytics' | 'analytics-filter' | 'profile' | 'settings' | 'change-management';

function MainApp() {
  const { user, profile, signOut } = useAuth();
  const { refreshTrigger, triggerRefresh } = useRefresh();
  const [currentView, setCurrentView] = useState<View>('analytics');
  const [pendingQueriesCount, setPendingQueriesCount] = useState(0);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [userQueriesCount, setUserQueriesCount] = useState(0);
  const [totalQueriesCount, setTotalQueriesCount] = useState(0);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);

  const handleNavigateToQuery = (queryId: string) => {
    setSelectedQueryId(queryId);
  };

  const handleViewChange = (view: View, filter?: 'all' | 'pending' | 'approved' | 'rejected') => {
    setCurrentView(view);
    if (filter && view === 'history') {
      setHistoryFilter(filter);
    }
    triggerRefresh();
  };

  useEffect(() => {
    if (!user || !profile) return;

    const fetchCounts = async () => {
      if (profile.is_developer) {
        const { count } = await supabase
          .from('queries')
          .select('*', { count: 'exact', head: true })
          .eq('developer_id', user.id);

        setUserQueriesCount(count || 0);
      } else {
        setUserQueriesCount(0);
      }

      if (profile.is_validator || profile.is_db_admin || profile.is_admin) {
        const { count } = await supabase
          .from('queries')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        setPendingQueriesCount(count || 0);
      } else {
        setPendingQueriesCount(0);
      }

      if (profile.is_admin) {
        const { count } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_approved', false);

        setPendingUsersCount(count || 0);
      } else {
        setPendingUsersCount(0);
      }

      const { count: totalCount } = await supabase
        .from('queries')
        .select('*', { count: 'exact', head: true });

      setTotalQueriesCount(totalCount || 0);
    };

    fetchCounts();

    const queriesChannel = supabase
      .channel('app_queries_count_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queries' },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    const usersChannel = supabase
      .channel('app_users_count_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_profiles' },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(queriesChannel);
      supabase.removeChannel(usersChannel);
    };
  }, [user, profile, refreshTrigger]);

  if (!user || !profile) {
    return null;
  }

  if (!profile.is_approved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border border-white/20 dark:border-gray-700/50 animate-fade-in">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center shadow-lg animate-bounce-slow">
            <User className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-4">Awaiting Approval</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your account has been created successfully. Please wait for an administrator to approve your account and assign roles.
          </p>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold transform hover:scale-105 shadow-lg"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const hasAnyRole = profile.is_developer || profile.is_validator || profile.is_db_admin || profile.is_admin || profile.is_change_user || profile.is_change_admin || profile.is_change_tester;

  if (!hasAnyRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border border-white/20 dark:border-gray-700/50 animate-fade-in">
          <div className="bg-gradient-to-br from-red-400 to-pink-500 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center shadow-lg animate-bounce-slow">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-4">No Roles Assigned</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your account is approved but no roles have been assigned yet. Please contact an administrator to assign you a role.
          </p>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold transform hover:scale-105 shadow-lg"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const defaultView: View = 'analytics';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 animate-gradient transition-colors duration-300">
      <Header
        onProfileClick={() => handleViewChange('profile')}
        onSettingsClick={() => handleViewChange('settings')}
        onNavigateToQuery={handleNavigateToQuery}
      />

      <div className="flex">
        {currentView !== 'profile' && currentView !== 'settings' && currentView !== 'analytics-filter' && (
          <Sidebar
            currentView={currentView}
            onViewChange={handleViewChange}
            pendingQueriesCount={pendingQueriesCount}
            pendingUsersCount={pendingUsersCount}
            userQueriesCount={userQueriesCount}
            totalQueriesCount={totalQueriesCount}
          />
        )}

        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {currentView === 'developer' && <DeveloperDashboard />}
            {currentView === 'reviewer' && <ReviewerDashboard />}
            {currentView === 'admin' && <AdminDashboard />}
            {currentView === 'history' && <QueryHistory initialFilter={historyFilter} />}
            {currentView === 'analytics' && (
              <Analytics
                onNavigate={handleViewChange}
                onShowAdvancedFilter={() => handleViewChange('analytics-filter')}
              />
            )}
            {currentView === 'analytics-filter' && (
              <AnalyticsFilters onBack={() => handleViewChange('analytics')} />
            )}
            {currentView === 'change-management' && <ChangeManagement />}
            {currentView === 'profile' && <Profile onBack={() => handleViewChange(defaultView)} />}
            {currentView === 'settings' && <Settings onBack={() => handleViewChange(defaultView)} />}
          </div>
        </main>
      </div>

      {selectedQueryId && (
        <QueryDetailsModal
          queryId={selectedQueryId}
          onClose={() => setSelectedQueryId(null)}
        />
      )}
    </div>
  );
}

function App() {
  const [showSignUp, setShowSignUp] = useState(false);

  return (
    <AuthProvider>
      <AuthContent showSignUp={showSignUp} setShowSignUp={setShowSignUp} />
    </AuthProvider>
  );
}

function AuthContent({ showSignUp, setShowSignUp }: { showSignUp: boolean; setShowSignUp: (show: boolean) => void }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <div className="text-gray-600 dark:text-gray-300 font-medium">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return showSignUp ? (
      <SignUp onSwitchToSignIn={() => setShowSignUp(false)} />
    ) : (
      <SignIn onSwitchToSignUp={() => setShowSignUp(true)} />
    );
  }

  return <MainApp />;
}

export default App;
