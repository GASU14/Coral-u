import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { User, RefreshCw, Upload, Camera } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AVATARS = Array.from({ length: 25 }, (_, i) => `https://api.dicebear.com/7.x/avataaars/svg?seed=avatar${i + 1}`);

export default function ProfileSettings({ user, onClose }: { user: any, onClose: () => void }) {
  const [username, setUsername] = useState(user.displayName || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoURL(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await updateProfile(auth.currentUser!, {
        displayName: username,
        photoURL: photoURL
      });
      await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
        username: username,
        photoURL: photoURL
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-[var(--bg-surface)] rounded-[3rem] shadow-2xl border border-white/5">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">Profile Settings</h2>
      
      <div className="flex flex-col items-center gap-6 mb-8">
        <div className="relative group">
          <div className="w-32 h-32 rounded-[2.5rem] bg-[var(--bg-card)] overflow-hidden border-2 border-[var(--accent)] shadow-xl relative">
            <img src={photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div 
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageUpload} 
          />
          <div className="absolute -bottom-2 -right-2 flex flex-col gap-2">
            <button 
              onClick={() => setPhotoURL(AVATARS[Math.floor(Math.random() * AVATARS.length)])}
              className="p-2 bg-[var(--bg-card)] text-white rounded-xl shadow-lg hover:scale-110 transition-all border border-white/10"
              title="Random Avatar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-[var(--accent)] text-white rounded-xl shadow-lg hover:scale-110 transition-all"
              title="Upload Image"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="w-full space-y-4">
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
            <input 
              type="text" 
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[var(--bg-card)] border-none rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-[var(--accent)] text-white"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button 
          onClick={onClose}
          className="flex-1 py-3 rounded-2xl text-sm font-bold bg-[var(--bg-card)] text-[var(--fg-muted)] hover:text-white transition-all"
        >
          Cancel
        </button>
        <button 
          onClick={handleUpdate}
          disabled={loading}
          className="flex-1 py-3 rounded-2xl text-sm font-bold bg-[var(--accent)] text-white shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
