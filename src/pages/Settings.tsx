import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Settings as SettingsIcon, Bell, Lock, Eye, Globe, Palette, ArrowLeft, Save } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  const { profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [queryApprovalNotifications, setQueryApprovalNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [language, setLanguage] = useState('en');
  const [saved, setSaved] = useState(false);

  if (!profile) return null;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white dark:bg-gray-700/50 dark:hover:bg-gray-700/50 rounded-xl transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 dark:text-gray-300" />
        </button>
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Settings
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 mt-1">Manage your preferences and account settings</p>
        </div>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-fade-in">
          <Save className="w-5 h-5" />
          Settings saved successfully!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-700/80 dark:bg-gray-800/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 dark:border-gray-700/50 shadow-lg transition-colors duration-300">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Notifications
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl transition-colors duration-300 opacity-50">
              <div className="flex-1">
                <div className="font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-1 flex items-center gap-2">
                  Email Notifications
                  <span className="text-xs px-2 py-1 bg-amber-500 text-white rounded-full font-medium">Coming Soon</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">Receive email updates about your account</div>
              </div>
              <button
                disabled
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-300 cursor-not-allowed"
              >
                <span className="inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-700 transition-transform translate-x-1" />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl opacity-50">
              <div className="flex-1">
                <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                  Query Approval Alerts
                  <span className="text-xs px-2 py-1 bg-amber-500 text-white rounded-full font-medium">Coming Soon</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Get notified when queries are approved or rejected</div>
              </div>
              <button
                disabled
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-300 cursor-not-allowed"
              >
                <span className="inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-700 transition-transform translate-x-1" />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl opacity-50">
              <div className="flex-1">
                <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                  Weekly Digest
                  <span className="text-xs px-2 py-1 bg-amber-500 text-white rounded-full font-medium">Coming Soon</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Receive a summary of activity every week</div>
              </div>
              <button
                disabled
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-300 cursor-not-allowed"
              >
                <span className="inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-700 transition-transform translate-x-1" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-600" />
            Appearance
          </h3>

          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl">
              <div className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Theme</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    theme === 'light'
                      ? 'border-indigo-600 bg-white dark:bg-gray-700 shadow-md'
                      : 'border-gray-200 bg-white dark:bg-gray-700 hover:border-indigo-300'
                  }`}
                >
                  <Eye className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
                  <div className="text-xs font-medium text-gray-900 dark:text-gray-100">Light</div>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    theme === 'dark'
                      ? 'border-indigo-600 bg-gray-800 shadow-md'
                      : 'border-gray-200 bg-gray-800 hover:border-indigo-300'
                  }`}
                >
                  <Eye className="w-5 h-5 mx-auto mb-1 text-white" />
                  <div className="text-xs font-medium text-white">Dark</div>
                </button>
                <button
                  onClick={() => setTheme('auto')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    theme === 'auto'
                      ? 'border-indigo-600 bg-gradient-to-br from-white to-gray-800 shadow-md'
                      : 'border-gray-200 bg-gradient-to-br from-white to-gray-800 hover:border-indigo-300'
                  }`}
                >
                  <Eye className="w-5 h-5 mx-auto mb-1 text-gray-600 dark:text-gray-400" />
                  <div className="text-xs font-medium text-gray-900 dark:text-gray-100">Auto</div>
                </button>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl opacity-50">
              <label className="font-semibold text-gray-900 dark:text-gray-100 mb-3 block flex items-center gap-2">
                Language
                <span className="text-xs px-2 py-1 bg-amber-500 text-white rounded-full font-medium">Coming Soon</span>
              </label>
              <select
                disabled
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 cursor-not-allowed"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-600" />
            Security
          </h3>

          <div className="space-y-4">
            <button disabled className="w-full p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl text-left transition-all group opacity-50 cursor-not-allowed">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                    Change Password
                    <span className="text-xs px-2 py-1 bg-amber-500 text-white rounded-full font-medium">Coming Soon</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Update your account password</div>
                </div>
                <Lock className="w-5 h-5 text-indigo-600" />
              </div>
            </button>

            <button disabled className="w-full p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl text-left transition-all group opacity-50 cursor-not-allowed">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Two-Factor Authentication</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security</div>
                </div>
                <span className="text-xs px-2 py-1 bg-amber-500 text-white rounded-full font-medium">Coming Soon</span>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            Preferences
          </h3>

          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl opacity-50">
              <label className="font-semibold text-gray-900 dark:text-gray-100 mb-3 block flex items-center gap-2">
                Timezone
                <span className="text-xs px-2 py-1 bg-amber-500 text-white rounded-full font-medium">Coming Soon</span>
              </label>
              <select disabled className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 cursor-not-allowed">
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="EST">EST (Eastern Standard Time)</option>
                <option value="PST">PST (Pacific Standard Time)</option>
                <option value="CST">CST (Central Standard Time)</option>
                <option value="MST">MST (Mountain Standard Time)</option>
              </select>
            </div>

            <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl opacity-50">
              <label className="font-semibold text-gray-900 dark:text-gray-100 mb-3 block flex items-center gap-2">
                Date Format
                <span className="text-xs px-2 py-1 bg-amber-500 text-white rounded-full font-medium">Coming Soon</span>
              </label>
              <select disabled className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 cursor-not-allowed">
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
        >
          <Save className="w-5 h-5" />
          Save Settings
        </button>
      </div>
    </div>
  );
}
