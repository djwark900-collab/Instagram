import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Mail, Camera, Facebook, Chrome } from 'lucide-react';

export function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleGoogleAuth = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFacebookAuth = async () => {
    try {
      const provider = new FacebookAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // If username was provided, create the user profile immediately
        if (username) {
          const user = userCredential.user;
          await setDoc(doc(db, 'users', user.uid), {
            username: username.toLowerCase().replace(/\s/g, '_'),
            displayName: username,
            photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
            bio: '',
            createdAt: serverTimestamp(),
            followersCount: 0,
            followingCount: 0,
          });
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="mb-8">
          <Camera className="w-16 h-16 text-black" strokeWidth={1.5} />
          <h1 className="text-4xl font-bold mt-2 font-serif text-center">Pixelgram</h1>
        </div>

        <form onSubmit={handleEmailAuth} className="w-full space-y-3">
          {!isLogin && (
            <input
              type="text"
              placeholder="Username"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-400"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full py-2.5 bg-sky-500 text-white font-semibold rounded-lg hover:bg-sky-600 transition-colors"
          >
            {isLogin ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <div className="flex items-center w-full my-6">
          <div className="flex-1 h-px bg-neutral-200"></div>
          <span className="px-4 text-xs font-semibold text-neutral-400 uppercase">OR</span>
          <div className="flex-1 h-px bg-neutral-200"></div>
        </div>

        <div className="w-full space-y-3">
          <button 
            onClick={handleGoogleAuth}
            className="w-full py-2.5 flex items-center justify-center gap-x-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <Chrome className="w-5 h-5 text-red-500" />
            <span className="text-sm font-semibold">Log in with Google</span>
          </button>
          <button 
            onClick={handleFacebookAuth}
            className="w-full py-2.5 flex items-center justify-center gap-x-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <Facebook className="w-5 h-5 text-blue-600 fill-blue-600" />
            <span className="text-sm font-semibold">Log in with Facebook</span>
          </button>
        </div>

        {error && <p className="text-xs text-red-500 mt-4 text-center">{error}</p>}

        <p className="mt-8 text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="ml-1 text-sky-500 font-semibold"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}
