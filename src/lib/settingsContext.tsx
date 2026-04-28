import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firebase';

export type Language = 'en' | 'es' | 'fr' | 'de' | 'ku';

interface Settings {
  language: Language;
}

interface SettingsContextType {
  settings: Settings;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    home: 'Home',
    search: 'Search',
    reels: 'Reels',
    upload: 'Upload',
    profile: 'Profile',
    settings: 'Settings',
    edit_profile: 'Edit Profile',
    logout: 'Log Out',
    dark_mode: 'Dark Mode',
    language: 'Language',
    save: 'Save',
    following: 'Following',
    followers: 'Followers',
    posts: 'Posts',
    no_posts: 'No posts yet',
    cancel: 'Cancel',
    follow: 'Follow',
    unfollow: 'Unfollow',
    comments: 'comments',
    switch_account: 'Switch Account'
  },
  es: {
    home: 'Inicio',
    search: 'Buscar',
    reels: 'Reels',
    upload: 'Subir',
    profile: 'Perfil',
    settings: 'Ajustes',
    edit_profile: 'Editar perfil',
    logout: 'Cerrar sesión',
    dark_mode: 'Modo oscuro',
    language: 'Idioma',
    save: 'Guardar',
    following: 'Siguiendo',
    followers: 'Seguidores',
    posts: 'Publicaciones',
    no_posts: 'Aún no hay publicaciones',
    cancel: 'Cancelar',
    follow: 'Seguir',
    unfollow: 'Dejar de seguir',
    comments: 'comentarios',
    switch_account: 'Cambiar cuenta'
  },
  fr: {
    home: 'Accueil',
    search: 'Rechercher',
    reels: 'Reels',
    upload: 'Télécharger',
    profile: 'Profil',
    settings: 'Paramètres',
    edit_profile: 'Modifier le profil',
    logout: 'Se déconnecter',
    dark_mode: 'Mode sombre',
    language: 'Langue',
    save: 'Enregistrer',
    following: 'Suivi',
    followers: 'Abonnés',
    posts: 'Publications',
    no_posts: 'Pas encore de publications',
    cancel: 'Annuler',
    follow: 'Suivre',
    unfollow: 'Ne plus suivre',
    comments: 'commentaires',
    switch_account: 'Changer de compte'
  },
  de: {
    home: 'Startseite',
    search: 'Suche',
    reels: 'Reels',
    upload: 'Hochladen',
    profile: 'Profil',
    settings: 'Einstellungen',
    edit_profile: 'Profil bearbeiten',
    logout: 'Abmelden',
    dark_mode: 'Dunkelmodus',
    language: 'Sprache',
    save: 'Speichern',
    following: 'Gefolgt',
    followers: 'Follower',
    posts: 'Beiträge',
    no_posts: 'Noch keine Beiträge',
    cancel: 'Abbrechen',
    follow: 'Folgen',
    unfollow: 'Entfolgen',
    comments: 'Kommentare',
    switch_account: 'Konto wechseln'
  },
  ku: {
    home: 'سەرەتا',
    search: 'گەڕان',
    reels: 'ڕیڵز',
    upload: 'بارکردن',
    profile: 'پڕۆفایل',
    settings: 'ڕێکخستنەکان',
    edit_profile: 'دەستکاری پڕۆفایل',
    logout: 'چوونەدەرەوە',
    dark_mode: 'دۆخی تاریک',
    language: 'زمان',
    save: 'پاشەکەوتکردن',
    following: 'فۆڵۆوەکان',
    followers: 'فۆڵۆوەرەکان',
    posts: 'پۆستەکان',
    no_posts: 'هیچ پۆستێک نییە',
    cancel: 'پاشگەزبوونەوە',
    follow: 'فۆڵۆو بکە',
    unfollow: 'فۆڵۆو مەکە',
    comments: 'کۆمێنتەکان',
    switch_account: 'گۆڕینی هەژمار'
  }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    language: (localStorage.getItem('lang') as Language) || 'en'
  });

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const path = `users/${user.uid}/settings/preferences`;
        const unsubPrefs = onSnapshot(doc(db, path), (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Settings;
            setSettings(data);
            updateDom(data);
          }
        }, (error) => {
          // If it's a new user, they might not have preferences yet - this shouldn't be an error but if rules deny it, we want to know
          if (error.code !== 'permission-denied') {
            handleFirestoreError(error, OperationType.GET, path);
          }
        });
        return () => unsubPrefs();
      } else {
        updateDom(settings);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const updateDom = (s: Settings) => {
    document.documentElement.classList.remove('dark');
    document.documentElement.dir = s.language === 'ku' ? 'rtl' : 'ltr';
    localStorage.setItem('lang', s.language);
  };

  const setLanguage = async (lang: Language) => {
    const newSettings = { ...settings, language: lang };
    setSettings(newSettings);
    updateDom(newSettings);
    
    const user = auth.currentUser;
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), newSettings);
    }
  };

  const t = (key: string) => {
    return translations[settings.language][key] || key;
  };

  return (
    <SettingsContext.Provider value={{ settings, setLanguage, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};
