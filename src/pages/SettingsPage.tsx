import React from 'react';
import { useSettings, Language } from '../lib/settingsContext';
import { Moon, Sun, Globe, ChevronLeft, ChevronRight, LogOut, Shield, Info, Users } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { settings, setLanguage, t } = useSettings();

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await signOut(auth);
    }
  };

  const handleSwitchAccount = async () => {
    // For now, switch account also signs out the user to allow login with another account
    await signOut(auth);
  };

  const languages: { code: Language; name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'ku', name: 'کوردی' }
  ];

  return (
    <div className="flex flex-col h-full bg-white transition-colors">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-neutral-100 sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <button onClick={onBack} className="me-4">
          <ChevronLeft className="w-7 h-7 rtl:rotate-180" />
        </button>
        <h1 className="text-xl font-bold">{t('settings')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        {/* Language */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4 px-1">
            {t('language')}
          </h2>
          <div className="bg-neutral-50 rounded-2xl overflow-hidden divide-y divide-neutral-100">
            {languages.map((lang) => (
              <button 
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-100 transition-colors"
              >
                <div className="flex items-center gap-x-3">
                  <div className="p-2 bg-neutral-200 text-neutral-600 rounded-lg">
                    <Globe className="w-5 h-5" />
                  </div>
                  <span className={settings.language === lang.code ? "font-bold text-sky-600" : "font-medium"}>
                    {lang.name}
                  </span>
                </div>
                {settings.language === lang.code && (
                  <div className="w-2 h-2 bg-sky-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Account */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4 px-1">
            Account
          </h2>
          <div className="bg-neutral-50 rounded-2xl overflow-hidden divide-y divide-neutral-100">
            <button className="w-full flex items-center justify-between p-4 hover:bg-neutral-100 transition-colors">
              <div className="flex items-center gap-x-3">
                <div className="p-2 bg-neutral-200 text-neutral-600 rounded-lg">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="font-medium">Privacy</span>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400 rtl:rotate-180" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-neutral-100 transition-colors">
              <div className="flex items-center gap-x-3">
                <div className="p-2 bg-neutral-200 text-neutral-600 rounded-lg">
                  <Info className="w-5 h-5" />
                </div>
                <span className="font-medium">About</span>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400 rtl:rotate-180" />
            </button>
            <button 
              onClick={handleSwitchAccount}
              className="w-full flex items-center justify-between p-4 hover:bg-neutral-100 transition-colors"
            >
              <div className="flex items-center gap-x-3">
                <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <span className="font-medium">{t('switch_account')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400 rtl:rotate-180" />
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-x-3 p-4 hover:bg-red-50 transition-colors group"
            >
              <div className="p-2 bg-red-100 text-red-600 rounded-lg group-hover:bg-red-200">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="font-medium text-red-600">{t('logout')}</span>
            </button>
          </div>
        </section>

        <div className="text-center pt-4">
          <p className="text-xs text-neutral-400 font-mono">
            v1.2.0 • Build 2026-04
          </p>
        </div>
      </div>
    </div>
  );
}
