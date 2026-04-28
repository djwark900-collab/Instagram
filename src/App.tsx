/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AuthScreen } from './components/Auth';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ReelsPage } from './pages/ReelsPage';
import { SearchPage } from './pages/SearchPage';
import { UploadPage } from './pages/UploadPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import { Loader2 } from 'lucide-react';
import { SettingsProvider } from './lib/settingsContext';

function AppContent() {
  const [user, loading, error] = useAuthState(auth);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<'home' | 'reels' | 'search' | 'upload' | 'profile' | 'settings' | 'admin'>('home');
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (user) {
        setProfileLoading(true);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        } else {
          // Create a default profile if it doesn't exist
          const newProfile = {
            username: user.email?.split('@')[0] || `user_${user.uid.slice(0, 5)}`,
            displayName: user.displayName || 'Anonymous User',
            photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
            bio: '',
            createdAt: serverTimestamp(),
            followersCount: 0,
            followingCount: 0,
            isVerified: false,
            isAdmin: user.email === 'djwark900@gmail.com',
          };
          await setDoc(doc(db, 'users', user.uid), newProfile);
          setProfile(newProfile);
        }
        setProfileLoading(false);
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  const navigateToProfile = (userId: string) => {
    setTargetUserId(userId);
    setCurrentPage('profile');
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'admin') setCurrentPage('admin');
      else if (hash === 'profile') setCurrentPage('profile');
      else if (hash === 'search') setCurrentPage('search');
      else if (hash === 'reels') setCurrentPage('reels');
      else if (hash === 'home' || hash === '') setCurrentPage('home');
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (loading || (user && profileLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 transition-colors">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Layout activeTab={currentPage} onTabChange={setCurrentPage}>
      {currentPage === 'home' && <HomePage onUserClick={navigateToProfile} />}
      {currentPage === 'reels' && <ReelsPage onUserClick={navigateToProfile} />}
      {currentPage === 'search' && <SearchPage onUserClick={navigateToProfile} />}
      {currentPage === 'upload' && <UploadPage onComplete={() => setCurrentPage('home')} />}
      {currentPage === 'profile' && (
        <ProfilePage 
          userId={targetUserId || user.uid} 
          isOwnProfile={!targetUserId || targetUserId === user.uid} 
          onUserClick={navigateToProfile}
          onSettingsClick={() => setCurrentPage('settings')}
          onUploadClick={() => setCurrentPage('upload')}
        />
      )}
      {currentPage === 'settings' && (
        <SettingsPage onBack={() => setCurrentPage('profile')} />
      )}
      {currentPage === 'admin' && (
        <AdminPage />
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}
