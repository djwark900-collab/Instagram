import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  orderBy,
  startAt,
  endAt
} from 'firebase/firestore';
import { Search, Loader2 } from 'lucide-react';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { AdminBadge } from '../components/AdminBadge';

interface SearchPageProps {
  onUserClick: (userId: string) => void;
}

export function SearchPage({ onUserClick }: SearchPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setResults([]);
      return;
    }

    const searchUsers = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'users'),
          orderBy('username'),
          startAt(searchTerm.toLowerCase()),
          endAt(searchTerm.toLowerCase() + '\uf8ff'),
          limit(10)
        );
        const snapshot = await getDocs(q);
        setResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(searchUsers, 500);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  return (
    <div className="flex flex-col p-4">
      <div className="sticky top-14 bg-white z-10 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 bg-neutral-100 rounded-xl text-sm focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {loading && <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-neutral-300" /></div>}
        
        {results.map((profile) => (
          <div 
            key={profile.id}
            className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-neutral-50 rounded-lg transition-colors"
            onClick={() => onUserClick(profile.id)}
          >
            <img 
              src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`} 
              alt="avatar" 
              className="w-12 h-12 rounded-full object-cover border border-neutral-100"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-sm">{profile.username}</p>
                {profile.isVerified && <VerifiedBadge className="w-3.5 h-3.5" />}
                {profile.isAdmin && <AdminBadge className="scale-90 origin-left" />}
              </div>
              <p className="text-sm text-neutral-500">{profile.displayName}</p>
            </div>
          </div>
        ))}

        {!loading && searchTerm && results.length === 0 && (
          <p className="text-center text-neutral-400 text-sm mt-10">No users found</p>
        )}
      </div>
    </div>
  );
}
