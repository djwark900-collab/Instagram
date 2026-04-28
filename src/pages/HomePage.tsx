import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc, 
  deleteDoc, 
  getDoc,
  getDocs,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Loader2, PlusSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { CommentsModal } from '../components/CommentsModal';
import { useSettings } from '../lib/settingsContext';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { AdminBadge } from '../components/AdminBadge';

const ADMIN_EMAIL = 'djwark900@gmail.com';

interface HomePageProps {
  onUserClick: (userId: string) => void;
}

export function HomePage({ onUserClick }: HomePageProps) {
  const { t } = useSettings();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      const unsub = onSnapshot(collection(db, 'users', user.uid, 'following'), (snap) => {
        setFollowingIds(snap.docs.map(d => d.id));
      }, (err) => {
        console.error("Error fetching following status:", err);
        handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/following`);
      });
      return () => unsub();
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const path = 'posts';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setError("Unable to connect to Firestore.");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col space-y-4 pt-2">
        {error ? (
          <div className="p-20 text-center text-neutral-500">
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm font-medium border border-red-100">
              {error}
            </div>
            <p className="text-sm text-neutral-400">
              This could be a temporary connection issue. Please try refreshing the page.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-black text-white rounded-lg text-sm font-semibold"
            >
              Refresh Feed
            </button>
          </div>
        ) : loading ? (
          <div className="p-20 text-center text-neutral-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Loading feed...
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onUserClick={onUserClick} />
            ))}
            
            {posts.length === 0 && (
              <div className="p-20 text-center text-neutral-500">
                <p className="text-lg font-semibold">{t('no_posts')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, onUserClick }: any) {
  const { t } = useSettings();
  const [isLiked, setIsLiked] = useState(false);
  const [author, setAuthor] = useState<any>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    // Check if liked
    if (user) {
      const path = `posts/${post.id}/likes/${user.uid}`;
      const likeRef = doc(db, path);
      const unsubscribe = onSnapshot(likeRef, (doc) => {
        setIsLiked(doc.exists());
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      });
      return () => unsubscribe();
    }
  }, [post.id, user]);

  useEffect(() => {
    // Check if saved
    if (user) {
      const path = `users/${user.uid}/saves/${post.id}`;
      const saveRef = doc(db, path);
      const unsubscribe = onSnapshot(saveRef, (doc) => {
        setIsSaved(doc.exists());
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      });
      return () => unsubscribe();
    }
  }, [post.id, user]);

  useEffect(() => {
    // Fetch author details
    getDoc(doc(db, 'users', post.authorId)).then(doc => {
      if (doc.exists()) setAuthor(doc.data());
    });
  }, [post.authorId]);

  const handleLike = async () => {
    if (!user) return;
    const likeRef = doc(db, 'posts', post.id, 'likes', user.uid);
    const postRef = doc(db, 'posts', post.id);

    try {
      if (isLiked) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: Math.max(0, post.likesCount - 1) });
      } else {
        await setDoc(likeRef, { userId: user.uid, postId: post.id, createdAt: serverTimestamp() });
        await updateDoc(postRef, { likesCount: post.likesCount + 1 });
      }
    } catch (error) {
      console.error("Like action failed:", error);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const saveRef = doc(db, 'users', user.uid, 'saves', post.id);

    try {
      if (isSaved) {
        await deleteDoc(saveRef);
      } else {
        await setDoc(saveRef, { postId: post.id, createdAt: serverTimestamp() });
      }
    } catch (error) {
      console.error("Save action failed:", error);
    }
  };

  const handleDelete = async () => {
    if (!user || user.uid !== post.authorId) return;
    setShowOptions(false);
    
    try {
      await deleteDoc(doc(db, 'posts', post.id));
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete post.");
    }
  };

   return (
    <div className="bg-white border-b border-neutral-100 pb-2 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between p-3 relative">
        <div 
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => onUserClick(post.authorId)}
        >
          <img 
            src={author?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorId}`} 
            alt="avatar" 
            className="w-8 h-8 rounded-full object-cover border border-neutral-200"
          />
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm">{author?.username || 'user'}</span>
            {author?.isVerified && <VerifiedBadge className="w-3.5 h-3.5" />}
            {author?.isAdmin && <AdminBadge />}
          </div>
        </div>
        
        {user?.uid === post.authorId && (
          <div className="relative">
            <button onClick={() => setShowOptions(!showOptions)} className="p-1">
              <MoreHorizontal className="w-5 h-5 text-neutral-500" />
            </button>
            
            <AnimatePresence>
              {showOptions && (
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-36 bg-white border border-neutral-100 shadow-lg rounded-xl z-10 overflow-hidden"
                >
                  <button 
                    onClick={handleDelete}
                    className="w-full text-left p-3 text-sm text-red-500 font-semibold hover:bg-neutral-50 transition-colors"
                  >
                    Delete Post
                  </button>
                  <button 
                    onClick={() => setShowOptions(false)}
                    className="w-full text-left p-3 text-sm text-neutral-500 hover:bg-neutral-50 transition-colors border-t border-neutral-50"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Image */}
      <div 
        className="relative aspect-square bg-neutral-100 overflow-hidden"
        onDoubleClick={handleLike}
      >
        <img 
          src={post.imageUrl} 
          alt="post content" 
          className="w-full h-full object-cover"
        />
        <AnimatePresence>
          {/* Heart burst on double click would be cool but keep it simple */}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="p-3 pb-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-4">
            <button onClick={handleLike}>
              <Heart 
                className={cn("w-7 h-7 transition-colors", isLiked ? "text-red-500 fill-red-500" : "text-black")} 
              />
            </button>
            <button onClick={() => setShowComments(true)}>
              <MessageCircle className="w-7 h-7" />
            </button>
            <Send className="w-7 h-7" />
          </div>
          <button onClick={handleSave}>
            <Bookmark 
              className={cn("w-7 h-7 transition-colors", isSaved ? "fill-black text-black" : "text-black")} 
            />
          </button>
        </div>
        <p className="font-semibold text-sm mb-1">{post.likesCount} likes</p>
        <div className="text-sm flex flex-wrap items-center gap-x-2">
          <div className="flex items-center gap-1">
            <span className="font-semibold">{author?.username || 'user'}</span>
            {author?.isVerified && <VerifiedBadge className="w-3.5 h-3.5" />}
            {author?.isAdmin && <AdminBadge />}
          </div>
          <span className="text-neutral-800">{post.caption}</span>
        </div>
        {post.commentsCount > 0 && (
          <button 
            onClick={() => setShowComments(true)}
            className="text-neutral-400 text-sm mt-1 mb-1 block hover:text-neutral-500 transition-colors"
          >
            View all {post.commentsCount} {t('comments')}
          </button>
        )}
        <p className="text-[10px] text-neutral-400 uppercase mt-2">
          {post.createdAt ? formatDistanceToNow(post.createdAt.toDate()) + ' ago' : 'Just now'}
        </p>
      </div>

      <AnimatePresence>
        {showComments && (
          <CommentsModal 
            post={post} 
            onClose={() => setShowComments(false)} 
            onUserClick={onUserClick}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
