import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { FileText, Github, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (result.user && token) {
        // Save token to localStorage for the session transformation
        localStorage.setItem('google_token', token);
      }
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-suse-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-suse-pine rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-suse-water rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md suse-card p-10 relative z-10"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div className="mb-6">
            <img 
              src="/suse-logo.svg" 
              alt="SUSE Logo" 
              className="w-24 h-24 drop-shadow-[0_0_20px_rgba(48,186,120,0.3)]"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-3xl font-bold mb-2">SUSE DocEngine</h1>
          <p className="text-gray-400">Enterprise Documentation Automation</p>
        </div>

        <div className="space-y-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-suse-pine/10 rounded-lg">
              <FileText className="text-suse-pine w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">Google Docs Import</h3>
              <p className="text-sm text-gray-400">Seamlessly fetch your technical content.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-suse-pine/10 rounded-lg">
              <ShieldCheck className="text-suse-pine w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">SUSE Compliance</h3>
              <p className="text-sm text-gray-400">DAPS-compatible AsciiDoc generation.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-suse-pine/10 rounded-lg">
              <Github className="text-suse-pine w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">GitHub Sync</h3>
              <p className="text-sm text-gray-400">Automated PRs for your documentation repos.</p>
            </div>
          </div>
        </div>

        <button 
          onClick={handleLogin}
          className="w-full suse-button-primary flex items-center justify-center gap-3 py-3"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 bg-white rounded-full p-0.5" />
          Sign in with Google
        </button>

        <p className="mt-8 text-center text-xs text-gray-500 uppercase tracking-widest">
          Secured by SUSE Enterprise Standards
        </p>
      </motion.div>
    </div>
  );
}
