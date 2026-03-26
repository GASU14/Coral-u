import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, User, Sparkles, LogIn, UserPlus, Camera, RefreshCw, Send } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const ADJECTIVES = ['Swift', 'Neon', 'Vibrant', 'Silent', 'Cosmic', 'Golden', 'Shadow', 'Frost', 'Lunar', 'Solar'];
const NOUNS = ['Rider', 'Ghost', 'Phoenix', 'Nova', 'Blade', 'Pulse', 'Echo', 'Drift', 'Spark', 'Zenith'];

const generateRandomUsername = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 9999);
  return `${adj}${noun}${num}`;
};

const AVATARS = Array.from({ length: 25 }, (_, i) => `https://api.dicebear.com/7.x/avataaars/svg?seed=avatar${i + 1}`);

export default function Auth({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [showDebug, setShowDebug] = useState(false);

  const getHumanErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Account already created. Try signing in!';
      case 'auth/invalid-email':
        return "That doesn't look like a valid email address.";
      case 'auth/operation-not-allowed':
        return 'Sign-in method disabled. IMPORTANT: In Firebase Console, you must enable the TOP toggle "Email/Password" and NOT just "Email link". If it looks enabled, toggle it OFF, click Save, then toggle it ON and click Save again.';
      case 'auth/weak-password':
        return 'Password too short! Use at least 6 characters.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
        return "We couldn't find an account with that email.";
      case 'auth/wrong-password':
        return 'Incorrect password. Try again!';
      case 'auth/popup-closed-by-user':
        return 'Sign-in window closed.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection!';
      default:
        return 'Something went wrong. Please try again.';
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          username: user.displayName || generateRandomUsername(),
          photoURL: user.photoURL || AVATARS[0],
          createdAt: serverTimestamp()
        });
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error('Google Login Error:', err);
      setError(getHumanErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
      setShowForgotPassword(false);
    } catch (err: any) {
      setError(getHumanErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    console.log('Auth Attempt:', isLogin ? 'Login' : 'Signup', 'Email:', email);
    console.log('Firebase Project ID:', auth.app.options.projectId);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const username = generateRandomUsername();
        const photoURL = AVATARS[Math.floor(Math.random() * AVATARS.length)];

        await updateProfile(user, {
          displayName: username,
          photoURL: photoURL
        });

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          username: username,
          photoURL: photoURL,
          createdAt: serverTimestamp()
        });
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error('Detailed Auth Error:', {
        code: err.code,
        message: err.message,
        email: email,
        projectId: auth.app.options.projectId
      });
      setError(getHumanErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="w-full max-w-md mx-auto p-8 bg-[var(--bg-surface)] rounded-[3rem] shadow-2xl border border-white/5">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
          <p className="text-sm text-[var(--fg-muted)]">Enter your email to receive a reset link</p>
        </div>

        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
            <input 
              type="email" 
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[var(--bg-card)] border-none rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-[var(--accent)] text-white"
            />
          </div>

          {error && <p className="text-xs text-red-400 text-center bg-red-400/10 py-2 rounded-xl border border-red-400/20">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[var(--accent)] text-white py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Reset Link
          </button>

          <button 
            type="button"
            onClick={() => setShowForgotPassword(false)}
            className="w-full text-xs text-[var(--fg-muted)] hover:text-white transition-colors py-2"
          >
            Back to Sign In
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-[var(--bg-surface)] rounded-[3rem] shadow-2xl border border-white/5">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{isLogin ? 'Welcome Back' : 'Join Coral'}</h2>
        <p className="text-sm text-[var(--fg-muted)]">
          {isLogin ? 'Sign in to access the social feed' : 'Create an account to start sharing'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
          <input 
            type="email" 
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-[var(--bg-card)] border-none rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-[var(--accent)] text-white"
          />
        </div>
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
          <input 
            type="password" 
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-[var(--bg-card)] border-none rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-[var(--accent)] text-white"
          />
        </div>

        {isLogin && (
          <div className="flex justify-end">
            <button 
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-[10px] text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors"
            >
              Forgot Password?
            </button>
          </div>
        )}

        {error && <p className="text-xs text-red-400 text-center bg-red-400/10 py-2 rounded-xl border border-red-400/20">{error}</p>}
        {message && <p className="text-xs text-emerald-400 text-center bg-emerald-400/10 py-2 rounded-xl border border-emerald-400/20">{message}</p>}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-[var(--accent)] text-white py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {isLogin ? 'Sign In' : 'Create Account'}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[var(--bg-surface)] px-2 text-[var(--fg-muted)]">Or continue with</span>
          </div>
        </div>

        <button 
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-black py-3 rounded-2xl text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" />
          Google
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/5 text-center">
        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="w-full py-3 rounded-2xl text-sm font-bold text-[var(--fg)] bg-white/5 hover:bg-white/10 transition-all border border-white/10"
        >
          {isLogin ? "Need an account? Sign Up" : "Already have an account? Sign In"}
        </button>
        
        <div className="mt-6 flex flex-col items-center gap-3">
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="flex items-center justify-center gap-2 opacity-30 hover:opacity-100 transition-opacity"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-[10px] font-mono tracking-widest uppercase">Firebase Project: u-site-e498b</span>
          </button>

          {showDebug && (
            <div className="w-full p-4 bg-black/40 rounded-2xl text-[10px] font-mono text-left text-[var(--fg-muted)] border border-white/5">
              <p className="text-emerald-400 mb-2 font-bold uppercase">Debug Info:</p>
              <p>Project ID: {auth.app.options.projectId}</p>
              <p>API Key: {auth.app.options.apiKey?.slice(0, 10)}...</p>
              <p className="mt-2 text-white/50">If this ID doesn't match your console URL, you are in a remixed app and need to set up Firebase again.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
