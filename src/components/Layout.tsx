import React from 'react';
import { Home, Search, SquarePlus as PlusSquare, User, Clapperboard, MessageCircle, Heart } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../lib/utils';
import { useSettings } from '../lib/settingsContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'home' | 'reels' | 'search' | 'upload' | 'profile' | 'settings';
  onTabChange: (tab: 'home' | 'reels' | 'search' | 'upload' | 'profile' | 'settings') => void;
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const { t } = useSettings();
  
  return (
    <div className="flex flex-col min-h-screen bg-white transition-colors">
      {/* Mobile Top Header (only on some pages if needed) */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200 h-14 flex items-center px-4 justify-between md:max-w-xl md:mx-auto md:w-full transition-colors">
        <h1 className="text-2xl font-bold font-serif italic tracking-tight">Pixelgram</h1>
        <div className="flex items-center gap-4">
          <Heart className="w-6 h-6 text-black cursor-pointer" />
          <MessageCircle className="w-6 h-6 text-black cursor-pointer" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-16 md:max-w-xl md:mx-auto md:w-full">
        {children}
      </main>

      {/* Navigation Footer */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-neutral-200 h-14 flex items-center justify-around z-50 md:max-w-xl md:mx-auto transition-colors">
        <button 
          onClick={() => onTabChange('home')}
          className={cn("p-2 transition-colors", activeTab === 'home' ? "text-black" : "text-neutral-400")}
          aria-label={t('home')}
        >
          <Home className="w-7 h-7" strokeWidth={activeTab === 'home' ? 2.5 : 2} />
        </button>
        <button 
          onClick={() => onTabChange('search')}
          className={cn("p-2 transition-colors", activeTab === 'search' ? "text-black" : "text-neutral-400")}
          aria-label={t('search')}
        >
          <Search className="w-7 h-7" strokeWidth={activeTab === 'search' ? 2.5 : 2} />
        </button>
        <button 
          onClick={() => onTabChange('reels')}
          className={cn("p-2 transition-colors", activeTab === 'reels' ? "text-black" : "text-neutral-400")}
          aria-label={t('reels')}
        >
          <Clapperboard className="w-7 h-7" strokeWidth={activeTab === 'reels' ? 2.5 : 2} />
        </button>
        <button 
          onClick={() => onTabChange('upload')}
          className={cn("p-2 transition-colors", activeTab === 'upload' ? "text-black" : "text-neutral-400")}
          aria-label={t('upload')}
        >
          <PlusSquare className="w-7 h-7" strokeWidth={activeTab === 'upload' ? 2.5 : 2} />
        </button>
        <button 
          onClick={() => onTabChange('profile')}
          className={cn("p-2 transition-colors", activeTab === 'profile' ? "text-black" : "text-neutral-400")}
          aria-label={t('profile')}
        >
          <User className="w-7 h-7" strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
        </button>
      </nav>
    </div>
  );
}
