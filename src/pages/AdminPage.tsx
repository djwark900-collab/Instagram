import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, orderBy, deleteDoc, limit } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { cn } from '../lib/utils';
import { BadgeCheck, ShieldAlert, Search, RefreshCw, XCircle, CheckCircle2, User, LayoutGrid, Film, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VerifiedBadge } from '../components/VerifiedBadge';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'reels'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthorized) {
      if (activeTab === 'users') fetchUsers();
      if (activeTab === 'posts') fetchPosts();
      if (activeTab === 'reels') fetchReels();
    }
  }, [isAuthorized, activeTab]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '123') {
      setIsAuthorized(true);
    } else {
      setError('Wrong password. Hint: 123');
      setTimeout(() => setError(''), 3000);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('username', 'asc'), limit(50));
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchReels = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'reels'), orderBy('createdAt', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const reelsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReels(reelsData);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'reels');
    } finally {
      setLoading(false);
    }
  };

  const toggleVerification = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isVerified: !currentStatus
      });
      setUsers(users.map(u => u.id === userId ? { ...u, isVerified: !currentStatus } : u));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const deleteItem = async (collectionName: string, id: string) => {
    if (!window.confirm('Are you sure you want to delete this content permanently?')) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      if (collectionName === 'posts') setPosts(posts.filter(p => p.id !== id));
      if (collectionName === 'reels') setReels(reels.filter(r => r.id !== id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(search.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl shadow-neutral-200 border border-neutral-100"
        >
          <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <ShieldAlert className="w-8 h-8 text-sky-600" />
          </div>
          <h1 className="text-2xl font-bold text-center text-neutral-900 mb-2">Admin Access</h1>
          <p className="text-neutral-500 text-center text-sm mb-8">Please enter the security password to manage the community.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                autoFocus
              />
              <AnimatePresence>
                {error && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-500 text-xs mt-2 text-center font-medium"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-neutral-900 text-white font-bold rounded-xl hover:bg-neutral-800 transition-all active:scale-95 shadow-lg shadow-neutral-200"
            >
              Unlock Dashboard
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <div className="bg-white border-b border-neutral-100 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center text-white">
              <BadgeCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Admin Panel</h1>
              <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-widest">Platform Moderation</p>
            </div>
          </div>
          <button 
            onClick={() => {
              if (activeTab === 'users') fetchUsers();
              if (activeTab === 'posts') fetchPosts();
              if (activeTab === 'reels') fetchReels();
            }}
            disabled={loading}
            className="p-2 hover:bg-neutral-50 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-5 h-5 text-neutral-600", loading && "animate-spin")} />
          </button>
        </div>
        
        <div className="max-w-2xl mx-auto px-6 flex gap-4 border-t border-neutral-50">
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex-1 py-4 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2",
              activeTab === 'users' ? "border-sky-500 text-sky-500" : "border-transparent text-neutral-400 hover:text-neutral-600"
            )}
          >
            <User className="w-4 h-4" />
            Users
          </button>
          <button 
            onClick={() => setActiveTab('posts')}
            className={cn(
              "flex-1 py-4 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2",
              activeTab === 'posts' ? "border-sky-500 text-sky-500" : "border-transparent text-neutral-400 hover:text-neutral-600"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            Posts
          </button>
          <button 
            onClick={() => setActiveTab('reels')}
            className={cn(
              "flex-1 py-4 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2",
              activeTab === 'reels' ? "border-sky-500 text-sky-500" : "border-transparent text-neutral-400 hover:text-neutral-600"
            )}
          >
            <Film className="w-4 h-4" />
            Reels
          </button>
        </div>

        {activeTab === 'users' && (
          <div className="max-w-2xl mx-auto px-6 py-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input 
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-11 pr-4 py-3 bg-neutral-100/50 border border-transparent rounded-xl focus:bg-white focus:border-sky-500 outline-none transition-all text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-3">
        <AnimatePresence mode="wait">
          {activeTab === 'users' && (
            <motion.div 
              key="users"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {loading && users.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-neutral-400">
                  <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                  <p>Loading user database...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-neutral-400 border-2 border-dashed border-neutral-200 rounded-3xl">
                  <User className="w-12 h-12 mb-4 opacity-20" />
                  <p>No users found matching "{search}"</p>
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <motion.div 
                    layout
                    key={u.id}
                    className="bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between hover:border-sky-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img 
                          src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} 
                          alt={u.username}
                          className="w-12 h-12 rounded-full object-cover border border-neutral-100"
                        />
                        {u.isVerified && (
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                            <VerifiedBadge className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-neutral-900">{u.username}</p>
                          {u.isVerified && <VerifiedBadge className="w-3 h-3" />}
                        </div>
                        <p className="text-xs text-neutral-500">{u.displayName}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => toggleVerification(u.id, !!u.isVerified)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm",
                        u.isVerified 
                          ? "bg-red-50 text-red-600 hover:bg-red-100" 
                          : "bg-sky-50 text-sky-600 hover:bg-sky-100"
                      )}
                    >
                      {u.isVerified ? (
                        <>
                          <XCircle className="w-4 h-4" />
                          <span className="hidden sm:inline">Unverify</span>
                          <span className="sm:hidden">Remove</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Verify User</span>
                          <span className="sm:hidden">Verify</span>
                        </>
                      )}
                    </button>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'posts' && (
            <motion.div 
              key="posts"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            >
              {loading && posts.length === 0 ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-neutral-400">
                  <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                  <p>Loading posts...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-neutral-400 border-2 border-dashed border-neutral-200 rounded-3xl">
                  <LayoutGrid className="w-12 h-12 mb-4 opacity-20" />
                  <p>No posts to moderate</p>
                </div>
              ) : (
                posts.map((p) => (
                  <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden group">
                    <img src={p.imageUrl} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => deleteItem('posts', p.id)}
                        className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'reels' && (
            <motion.div 
              key="reels"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            >
              {loading && reels.length === 0 ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-neutral-400">
                  <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                  <p>Loading reels...</p>
                </div>
              ) : reels.length === 0 ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-neutral-400 border-2 border-dashed border-neutral-200 rounded-3xl">
                  <Film className="w-12 h-12 mb-4 opacity-20" />
                  <p>No reels to moderate</p>
                </div>
              ) : (
                reels.map((r) => (
                  <div key={r.id} className="relative aspect-[9/16] rounded-xl overflow-hidden group">
                    <video src={r.videoUrl} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => deleteItem('reels', r.id)}
                        className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
