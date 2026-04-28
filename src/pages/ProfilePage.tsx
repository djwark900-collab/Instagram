import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  setDoc, 
  deleteDoc, 
  serverTimestamp,
  updateDoc,
  increment
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { motion } from 'motion/react';
import { Settings, Grid, Bookmark, SquareUser, Loader2, X, Camera, BadgeCheck, CheckCircle2, ShieldAlert, PlusSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSettings } from '../lib/settingsContext';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { AdminBadge } from '../components/AdminBadge';

interface ProfilePageProps {
  userId: string;
  isOwnProfile: boolean;
  onUserClick: (id: string) => void;
  onSettingsClick?: () => void;
  onUploadClick?: () => void;
}

export function ProfilePage({ userId, isOwnProfile, onUserClick, onSettingsClick, onUploadClick }: ProfilePageProps) {
  const { t } = useSettings();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'tagged'>('posts');
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const currentUser = auth.currentUser;

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) setProfile(userDoc.data());

      const postsQuery = query(
        collection(db, 'posts'), 
        where('authorId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const postsSnap = await getDocs(postsQuery);
      setPosts(postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      if (currentUser && !isOwnProfile) {
        const followDoc = await getDoc(doc(db, 'users', userId, 'followers', currentUser.uid));
        setIsFollowing(followDoc.exists());
      }

      if (isOwnProfile && currentUser) {
        const savesQuery = query(
          collection(db, 'users', currentUser.uid, 'saves'),
          orderBy('createdAt', 'desc')
        );
        const savesSnap = await getDocs(savesQuery);
        const saveDocIds = savesSnap.docs.map(d => d.data().postId);
        
        if (saveDocIds.length > 0) {
          // Fetch the actual post data for each saved ID
          const actualPosts: any[] = [];
          for (const id of saveDocIds) {
            const pDoc = await getDoc(doc(db, 'posts', id));
            if (pDoc.exists()) actualPosts.push({ id: pDoc.id, ...pDoc.data() });
          }
          setSavedPosts(actualPosts);
        }
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [userId, currentUser, isOwnProfile]);

  const handleFollowToggle = async () => {
    if (!currentUser || isOwnProfile) return;

    const followerRef = doc(db, 'users', userId, 'followers', currentUser.uid);
    const followingRef = doc(db, 'users', currentUser.uid, 'following', userId);
    const targetUserRef = doc(db, 'users', userId);
    const currentUserRef = doc(db, 'users', currentUser.uid);

    try {
      if (isFollowing) {
        await deleteDoc(followerRef);
        await deleteDoc(followingRef);
        await updateDoc(targetUserRef, { followersCount: increment(-1) });
        await updateDoc(currentUserRef, { followingCount: increment(-1) });
        setIsFollowing(false);
      } else {
        await setDoc(followerRef, { followerId: currentUser.uid, createdAt: serverTimestamp() });
        await setDoc(followingRef, { followedId: userId, createdAt: serverTimestamp() });
        await updateDoc(targetUserRef, { followersCount: increment(1) });
        await updateDoc(currentUserRef, { followingCount: increment(1) });
        setIsFollowing(true);
      }
    } catch (err) {
      console.error("Follow action failed:", err);
    }
  };

  const handleUpdateProfile = async (newData: any) => {
    if (!currentUser || !isOwnProfile) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        displayName: newData.displayName,
        bio: newData.bio,
        photoURL: newData.photoURL
      });
      setProfile({ ...profile, ...newData });
      setIsEditing(false);
    } catch (err) {
      console.error("Update profile failed:", err);
      alert("Failed to update profile.");
    }
  };

  if (loading && !isEditing) return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-neutral-300" /></div>;

  return (
    <div className="flex flex-col bg-white min-h-screen">
      {/* Header Info */}
      <div className="p-4 pt-6 flex flex-col space-y-6">
        <div className="flex items-center justify-between space-x-8">
          <img 
            src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`} 
            alt="profile" 
            className="w-20 h-20 rounded-full object-cover border border-neutral-100"
          />
          <div className="flex-1 flex justify-around text-center">
            <div>
              <p className="font-bold">{posts.length}</p>
              <p className="text-xs text-neutral-500">{t('posts')}</p>
            </div>
            <div>
              <p className="font-bold">{profile?.followersCount || 0}</p>
              <p className="text-xs text-neutral-500">{t('followers')}</p>
            </div>
            <div>
              <p className="font-bold">{profile?.followingCount || 0}</p>
              <p className="text-xs text-neutral-500">{t('following')}</p>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm">{profile?.displayName}</p>
            {profile?.isVerified && <VerifiedBadge />}
            {profile?.isAdmin && <AdminBadge />}
          </div>
          <p className="text-sm text-neutral-800 whitespace-pre-wrap">{profile?.bio}</p>
        </div>

        <div className="flex space-x-2">
          {isOwnProfile ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex-1 py-1.5 bg-neutral-100 font-semibold rounded-lg text-sm transition-colors hover:bg-neutral-200"
            >
              {t('edit_profile')}
            </button>
          ) : (
            <button 
              onClick={handleFollowToggle}
              className={cn(
                "flex-1 py-1.5 font-semibold rounded-lg text-sm transition-colors",
                isFollowing ? "bg-neutral-100 hover:bg-neutral-200" : "bg-sky-500 text-white hover:bg-sky-600"
              )}
            >
              {isFollowing ? t('unfollow') : t('follow')}
            </button>
          )}
          <button 
            onClick={() => onSettingsClick ? onSettingsClick() : setIsSettingsOpen(true)}
            className="px-2 py-1.5 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            <Settings className="w-4 h-4 text-neutral-600" />
          </button>
          {isOwnProfile && onUploadClick && (
            <button 
              onClick={onUploadClick}
              className="px-2 py-1.5 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors flex items-center gap-1.5 group"
            >
              <PlusSquare className="w-4 h-4 text-neutral-600 group-hover:text-black transition-colors" />
              <span className="text-[10px] font-bold text-neutral-500 group-hover:text-black transition-colors uppercase tracking-tighter">Post UP</span>
            </button>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end justify-center sm:items-center sm:p-4">
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            className="w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden pb-8 sm:pb-0"
          >
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <span className="font-bold">Settings</span>
              <button onClick={() => setIsSettingsOpen(false)}><X className="w-5 h-5 text-neutral-400" /></button>
            </div>
            <div className="flex flex-col">
              <button 
                onClick={() => {
                  setIsSettingsOpen(false);
                  setIsEditing(true);
                }}
                className="p-4 text-left hover:bg-neutral-50 transition-colors border-b border-neutral-50"
              >
                Edit Profile
              </button>
              {isOwnProfile && !profile?.isVerified && (
                <button 
                  onClick={async () => {
                    try {
                      await updateDoc(doc(db, 'users', userId), { isVerified: true });
                      setProfile({ ...profile, isVerified: true });
                      setIsSettingsOpen(false);
                    } catch (err) {
                      console.error("Verification failed:", err);
                    }
                  }}
                  className="p-4 text-left hover:bg-neutral-50 transition-colors border-b border-neutral-50 flex items-center justify-between group"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-sky-600">Get Verified</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Establish your presence for $14.99/mo</span>
                  </div>
                  <BadgeCheck className="w-5 h-5 text-sky-500 group-hover:scale-110 transition-transform" />
                </button>
              )}
              <button 
                onClick={() => {
                  window.location.hash = 'admin';
                  setIsSettingsOpen(false);
                }}
                className="p-4 text-left hover:bg-neutral-50 transition-colors border-b border-neutral-50 flex items-center justify-between group"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-neutral-600">Admin Dashboard</span>
                  <span className="text-[10px] text-neutral-400 font-normal">Internal tools & moderation</span>
                </div>
                <ShieldAlert className="w-5 h-5 text-neutral-400 group-hover:text-sky-500 transition-colors" />
              </button>
              <button 
                onClick={() => signOut(auth)}
                className="p-4 text-left text-red-500 font-semibold hover:bg-neutral-50 transition-colors"
              >
                Log Out
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-t border-neutral-100 mt-4">
        <button 
          onClick={() => setActiveTab('posts')}
          className={cn(
            "flex-1 flex justify-center py-2 border-t-2",
            activeTab === 'posts' ? "border-black text-black" : "border-transparent text-neutral-400"
          )}
        >
          <Grid className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setActiveTab('tagged')}
          className={cn(
            "flex-1 flex justify-center py-2 border-t-2",
            activeTab === 'tagged' ? "border-black text-black" : "border-transparent text-neutral-400"
          )}
        >
          <SquareUser className="w-6 h-6" />
        </button>
        {isOwnProfile && (
          <button 
            onClick={() => setActiveTab('saved')}
            className={cn(
              "flex-1 flex justify-center py-2 border-t-2",
              activeTab === 'saved' ? "border-black text-black" : "border-transparent text-neutral-400"
            )}
          >
            <Bookmark className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Posts/Saved Grid */}
      <div className="grid grid-cols-3 gap-0.5">
        {(activeTab === 'posts' ? posts : activeTab === 'saved' ? savedPosts : []).map(post => (
          <div key={post.id} className="aspect-square bg-neutral-100 relative group overflow-hidden">
            <img 
              src={post.imageUrl} 
              alt="post" 
              className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" 
            />
          </div>
        ))}
      </div>
      
      {(activeTab === 'posts' ? posts : activeTab === 'saved' ? savedPosts : []).length === 0 && (
        <div className="py-20 text-center text-neutral-400">
          <p className="text-sm">{t('no_posts')}</p>
        </div>
      )}

      {isEditing && (
        <EditProfileModal 
          profile={profile} 
          onSave={handleUpdateProfile} 
          onCancel={() => setIsEditing(false)} 
        />
      )}
    </div>
  );
}

function EditProfileModal({ profile, onSave, onCancel }: any) {
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert("Profile photo must be under 25MB. Please choose a smaller file.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 320;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, size, size);
        setPhotoURL(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col md:max-w-xl md:mx-auto">
      <div className="h-14 border-b border-neutral-100 flex items-center justify-between px-4">
        <button onClick={onCancel} className="text-sm">Cancel</button>
        <span className="font-bold">Edit profile</span>
        <button 
          onClick={() => onSave({ displayName, bio, photoURL })} 
          className="text-sky-500 font-bold text-sm"
          disabled={loading}
        >
          Done
        </button>
      </div>

      <div className="p-8 flex flex-col items-center space-y-8 overflow-y-auto">
        <div className="flex flex-col items-center space-y-3">
          <div className="relative group">
            <img 
              src={photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=placeholder`} 
              className="w-24 h-24 rounded-full object-cover border border-neutral-200" 
              alt="logo"
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Camera className="text-white w-6 h-6" />
            </div>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="text-sky-500 text-sm font-semibold"
          >
            Change profile photo
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange} 
          />
        </div>

        <div className="w-full space-y-6">
          <div className="space-y-1">
            <label className="text-xs text-neutral-400 font-semibold px-0.5">Name</label>
            <input 
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)} 
              className="w-full border-b border-neutral-200 py-2 focus:outline-none focus:border-black transition-colors"
              placeholder="Display Name"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-neutral-400 font-semibold px-0.5">Bio</label>
            <textarea 
              value={bio} 
              onChange={e => setBio(e.target.value)} 
              className="w-full border-b border-neutral-200 py-2 focus:outline-none focus:border-black transition-colors min-h-[100px] resize-none"
              placeholder="Tell us about yourself..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
