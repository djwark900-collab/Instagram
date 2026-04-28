import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Heart, MessageCircle, Share2, Music2, Camera, Loader2, Clapperboard } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { CommentsModal } from '../components/CommentsModal';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { AdminBadge } from '../components/AdminBadge';

interface Reel {
  id: string;
  authorId: string;
  videoUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  createdAt: any;
}

interface ReelsPageProps {
  onUserClick: (userId: string) => void;
}

export function ReelsPage({ onUserClick }: ReelsPageProps) {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'reels'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reel)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reels');
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-black text-white p-4 text-center">
        <Clapperboard className="w-16 h-16 mb-4 text-neutral-600" />
        <h2 className="text-xl font-bold mb-2">No Reels Yet</h2>
        <p className="text-neutral-400 mb-6 text-sm">Be the first to share an amazing vertical video!</p>
        <button 
           className="bg-white text-black px-6 py-2 rounded-full font-bold"
           onClick={() => {/* This will be handled by the Layout upload tab */}}
        >
          Create Reel
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-[calc(100vh-3.5rem)] overflow-y-scroll snap-y snap-mandatory bg-black scrollbar-hide"
    >
      {reels.map((reel) => (
        <ReelCard key={reel.id} reel={reel} onUserClick={onUserClick} />
      ))}
    </div>
  );
}

function ReelCard({ reel, onUserClick }: any) {
  const [isLiked, setIsLiked] = useState(false);
  const [author, setAuthor] = useState<any>(null);
  const [showComments, setShowComments] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      const path = `reels/${reel.id}/likes/${user.uid}`;
      const likeRef = doc(db, path);
      const unsubscribe = onSnapshot(likeRef, (doc) => {
        setIsLiked(doc.exists());
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      });
      return () => unsubscribe();
    }
  }, [reel.id, user]);

  useEffect(() => {
    getDoc(doc(db, 'users', reel.authorId)).then(doc => {
      if (doc.exists()) setAuthor(doc.data());
    });
  }, [reel.authorId]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {});
          setIsPlaying(true);
        } else {
          videoRef.current?.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.8 }
    );

    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);

  const handleLike = async () => {
    if (!user) return;
    const likeRef = doc(db, 'reels', reel.id, 'likes', user.uid);
    const reelRef = doc(db, 'reels', reel.id);

    try {
      if (isLiked) {
        await deleteDoc(likeRef);
        await updateDoc(reelRef, { likesCount: Math.max(0, reel.likesCount - 1) });
      } else {
        await setDoc(likeRef, { userId: user.uid, postId: reel.id, createdAt: serverTimestamp() });
        await updateDoc(reelRef, { likesCount: reel.likesCount + 1 });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `reels/${reel.id}/likes`);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="h-full w-full snap-start relative bg-black flex items-center justify-center overflow-hidden">
      <video 
        ref={videoRef}
        src={reel.videoUrl}
        loop
        playsInline
        className="h-full w-full object-cover"
        onClick={togglePlay}
      />

      {/* Overlay controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      
      {/* Sidebar actions */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center space-y-6">
        <div className="flex flex-col items-center">
          <button onClick={handleLike} className="group pointer-events-auto">
            <Heart 
              className={cn(
                "w-8 h-8 transition-all scale-100 hover:scale-110", 
                isLiked ? "fill-red-500 text-red-500" : "text-white"
              )} 
            />
          </button>
          <span className="text-white text-xs font-semibold mt-1">{reel.likesCount}</span>
        </div>

        <div className="flex flex-col items-center">
          <button onClick={() => setShowComments(true)} className="pointer-events-auto">
            <MessageCircle className="w-8 h-8 text-white" />
          </button>
          <span className="text-white text-xs font-semibold mt-1">{reel.commentsCount}</span>
        </div>

        <button className="pointer-events-auto">
          <Share2 className="w-8 h-8 text-white" />
        </button>

        <div className="w-10 h-10 rounded-lg border-2 border-white/20 overflow-hidden animate-[spin_4s_linear_infinite] p-1 pointer-events-auto">
          <div className="w-full h-full bg-neutral-800 rounded-md flex items-center justify-center">
            <Music2 className="text-white w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Caption and Author */}
      <div className="absolute bottom-4 left-4 right-16 text-white pointer-events-none">
        <div className="flex items-center space-x-3 mb-3 pointer-events-auto" onClick={() => onUserClick(reel.authorId)}>
          <img 
            src={author?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reel.authorId}`} 
            className="w-10 h-10 rounded-full border border-white/20"
            alt="avatar"
          />
          <div className="flex items-center gap-1.5 overflow-hidden">
            <h3 className="font-bold truncate">{author?.username || 'user'}</h3>
            {author?.isVerified && <VerifiedBadge className="w-4 h-4 shadow-sm" />}
            {author?.isAdmin && <AdminBadge className="scale-75 origin-left" />}
          </div>
          <button className="text-xs bg-white text-black px-3 py-1 rounded-full font-bold ml-2">Follow</button>
        </div>
        <p className="text-sm line-clamp-2 mb-3">{reel.caption}</p>
        <div className="flex items-center text-xs space-x-2">
            <Music2 className="w-3 h-3" />
            <span className="truncate">Original audio - {author?.username}</span>
        </div>
      </div>

      <AnimatePresence>
        {showComments && (
          <CommentsModal 
            post={reel} // CommentsModal uses post object, Reel shares enough fields
            onClose={() => setShowComments(false)} 
            onUserClick={onUserClick}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
