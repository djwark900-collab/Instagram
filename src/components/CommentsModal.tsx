import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  getDoc
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { X, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { VerifiedBadge } from './VerifiedBadge';
import { AdminBadge } from './AdminBadge';

interface CommentsModalProps {
  post: any;
  onClose: () => void;
  onUserClick: (userId: string) => void;
}

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: any;
}

export function CommentsModal({ post, onClose, onUserClick }: CommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [authorVerifications, setAuthorVerifications] = useState<Record<string, { isVerified: boolean; isAdmin: boolean }>>({});
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    const q = query(
      collection(db, 'posts', post.id, 'comments'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(commentsData);
      
      // Batch fetch data for new authors
      const newAuthors = commentsData
        .filter(c => authorVerifications[c.authorId] === undefined)
        .map(c => c.authorId);
      if (newAuthors.length > 0) {
        const uniqueAuthors = Array.from(new Set(newAuthors));
        const newVerifications: Record<string, { isVerified: boolean; isAdmin: boolean }> = { ...authorVerifications };
        for (const authorId of uniqueAuthors) {
          const uDoc = await getDoc(doc(db, 'users', authorId));
          if (uDoc.exists()) {
            const data = uDoc.data();
            newVerifications[authorId] = { 
              isVerified: !!data.isVerified, 
              isAdmin: !!data.isAdmin 
            };
          } else {
            newVerifications[authorId] = { isVerified: false, isAdmin: false };
          }
        }
        setAuthorVerifications(newVerifications);
      }
      
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `posts/${post.id}/comments`);
    });

    return () => unsubscribe();
  }, [post.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user || submitting) return;

    setSubmitting(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;

      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        authorId: user.uid,
        authorName: userData?.username || 'user',
        text: text.trim(),
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'posts', post.id), {
        commentsCount: increment(1)
      });

      setText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `posts/${post.id}/comments`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="h-14 border-b border-neutral-100 flex items-center justify-between px-4 sticky top-0 bg-white z-10">
          <button onClick={onClose}><X className="w-6 h-6 text-neutral-400" /></button>
          <span className="font-bold">Comments</span>
          <div className="w-6" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-200" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-10 text-neutral-400">
              <p className="font-semibold">No comments yet</p>
              <p className="text-sm">Start the conversation</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.authorId}`} 
                  className="w-8 h-8 rounded-full bg-neutral-100 flex-shrink-0 cursor-pointer"
                  onClick={() => onUserClick(comment.authorId)}
                  alt="avatar"
                />
                <div className="flex-1">
                  <div className="text-sm">
                    <span 
                      className="font-bold mr-2 cursor-pointer hover:underline inline-flex items-center gap-1"
                      onClick={() => onUserClick(comment.authorId)}
                    >
                      {comment.authorName}
                      {authorVerifications[comment.authorId]?.isVerified && <VerifiedBadge className="w-3 h-3" />}
                      {authorVerifications[comment.authorId]?.isAdmin && <AdminBadge className="scale-75 origin-left" />}
                    </span>
                    <span className="text-neutral-800">{comment.text}</span>
                  </div>
                  <div className="flex items-center space-x-3 mt-1">
                    <span className="text-[10px] text-neutral-400 uppercase">
                      {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate()) : 'pending'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-neutral-100 p-3 flex items-center space-x-3 bg-white">
          <img 
            src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
            className="w-8 h-8 rounded-full"
            alt="me"
          />
          <input 
            type="text" 
            placeholder="Add a comment..."
            className="flex-1 text-sm bg-neutral-50 px-4 py-2 rounded-full focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={submitting}
          />
          <button 
            disabled={submitting || !text.trim()}
            className="text-sky-500 font-bold text-sm disabled:text-sky-300 transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
