import React, { useState, useRef } from 'react';
import { db, auth, handleFirestoreError, OperationType, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Image as ImageIcon, Loader2, X, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface UploadPageProps {
  onComplete: () => void;
}

export function UploadPage({ onComplete }: UploadPageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<'post' | 'reel'>('post');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isUploaded, setIsUploaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);

    const isVideo = file.type.startsWith('video/');
    
    // Enforce 25MB limit for images (posts)
    if (!isVideo && file.size > 25 * 1024 * 1024) {
      setErrorMessage("Image files must be under 25MB.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    
    // Enforce 50MB limit for videos (reels) to keep it reasonable
    if (isVideo && file.size > 50 * 1024 * 1024) {
      setErrorMessage("Video files must be under 50MB.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (isVideo) {
      setUploadType('reel');
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setUploadType('post');
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !auth.currentUser) return;

    setLoading(true);
    setProgress(0);

    try {
      // 1. Upload to Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${auth.currentUser.uid}_${Date.now()}.${fileExt}`;
      const storageRef = ref(storage, `${uploadType === 'post' ? 'posts' : 'reels'}/${fileName}`);
      
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      const downloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setProgress(p);
          }, 
          (error) => reject(error), 
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      // 2. Save Metadata to Firestore
      if (uploadType === 'post') {
        await addDoc(collection(db, 'posts'), {
          authorId: auth.currentUser.uid,
          imageUrl: downloadUrl,
          caption: caption,
          isProduct: false,
          price: 0,
          likesCount: 0,
          commentsCount: 0,
          createdAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'reels'), {
          authorId: auth.currentUser.uid,
          videoUrl: downloadUrl,
          caption: caption,
          likesCount: 0,
          commentsCount: 0,
          createdAt: serverTimestamp(),
        });
      }
      setIsUploaded(true);
    } catch (err) {
      console.error("Upload error:", err);
      handleFirestoreError(err, OperationType.CREATE, uploadType === 'post' ? 'posts' : 'reels');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col p-4 bg-white min-h-[calc(100vh-112px)] transition-colors">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">New {uploadType === 'post' ? 'Post' : 'Reel'}</h2>
        <div className="bg-neutral-100 p-1 rounded-lg flex space-x-1">
           <button 
             onClick={() => setUploadType('post')}
             className={cn("px-4 py-1 text-xs font-bold rounded-md transition-all", uploadType === 'post' ? "bg-white shadow-sm" : "text-neutral-400")}
           >
             Post
           </button>
           <button 
             onClick={() => setUploadType('reel')}
             className={cn("px-4 py-1 text-xs font-bold rounded-md transition-all", uploadType === 'reel' ? "bg-white shadow-sm" : "text-neutral-400")}
           >
             Reel
           </button>
        </div>
      </div>
      
      {!previewUrl ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-square bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-3xl flex flex-col items-center justify-center space-y-4 p-8 text-center cursor-pointer hover:bg-neutral-100 transition-colors"
          >
            <div className="p-4 bg-white rounded-full shadow-sm">
              <Upload className="w-10 h-10 text-neutral-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-neutral-700">Select photos or videos</p>
              <p className="text-sm text-neutral-400 mt-1">Images must be under 25MB</p>
            </div>
            {errorMessage && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-medium border border-red-100">
                {errorMessage}
              </div>
            )}
            <button className="px-6 py-2 bg-sky-500 text-white rounded-lg font-semibold text-sm">
              Select from device
            </button>
          </div>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept={uploadType === 'post' ? 'image/*' : 'video/*'}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-neutral-100 shadow-sm bg-black">
            {uploadType === 'post' ? (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <video src={previewUrl} className="w-full h-full object-contain" controls />
            )}
            {!loading && (
              <button 
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="absolute top-3 right-3 p-1.5 bg-black/60 rounded-full text-white backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <div className="flex flex-col space-y-4">
            <div className="flex items-start space-x-3">
              <img 
                src={auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser?.uid}`} 
                className="w-8 h-8 rounded-full border border-neutral-200"
                alt="me"
              />
              <textarea 
                placeholder="Write a caption..."
                className="flex-1 min-h-[100px] p-0 text-sm focus:outline-none resize-none bg-transparent"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-colors disabled:bg-neutral-200"
          >
            {loading ? 'Posting...' : `Share ${uploadType === 'post' ? 'Post' : 'Reel'}`}
          </button>

          {loading && (
            <div className="fixed inset-0 bg-white/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-10 text-center">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-xs"
              >
                {!isUploaded ? (
                  <>
                    <div className="relative w-24 h-24 mx-auto mb-6">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          className="text-neutral-100"
                        />
                        <motion.circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray="251.2"
                          initial={{ strokeDashoffset: 251.2 }}
                          animate={{ strokeDashoffset: 251.2 - (251.2 * progress) / 100 }}
                          className="text-sky-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-neutral-800"></span>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-neutral-900 mb-2">
                       {progress < 100 ? 'Uploading...' : 'Finalizing...'}
                    </h3>
                    <p className="text-sm text-neutral-500">
                       {progress < 100 
                         ? `Sharing your ${uploadType} with the world` 
                         : 'Almost there! Just a second...'}
                    </p>
                    <div className="mt-8 w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="bg-sky-500 h-full"
                      />
                    </div>
                  </>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                      <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-neutral-900 mb-2">Uploaded!</h3>
                    <p className="text-neutral-500 mb-8">Your {uploadType} has been shared successfully.</p>
                    <button 
                      onClick={onComplete}
                      className="w-full py-4 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-200 active:scale-95"
                    >
                      OK
                    </button>
                  </motion.div>
                )}
              </motion.div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
