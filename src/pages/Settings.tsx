import React, { useState, useEffect } from 'react';
import { Shield, Github, Key, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Settings() {
  const [githubToken, setGithubToken] = useState(localStorage.getItem('github_token') || '');
  const [defaultRepo, setDefaultRepo] = useState(localStorage.getItem('suse_repo') || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('github_token', githubToken);
    localStorage.setItem('suse_repo', defaultRepo);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">System Integrations</h1>
        <p className="text-gray-400 uppercase font-mono text-xs tracking-widest">Configure your external credentials and defaults</p>
      </div>

      <div className="grid gap-6">
        {/* GitHub Integration */}
        <div className="suse-card p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-white/5 rounded-2xl">
              <Github size={32} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">GitHub Automation</h2>
              <p className="text-sm text-gray-500">Provide a Personal Access Token (PAT) with repo permissions.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-500 uppercase tracking-widest px-1 flex items-center gap-2">
                <Key size={12} /> Personal Access Token
              </label>
              <input 
                type="password" 
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                className="w-full suse-input"
              />
              <p className="text-[10px] text-gray-500 italic px-1">
                Token is stored locally in your browser for this session.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-500 uppercase tracking-widest px-1">Default Sync Repository</label>
              <input 
                type="text" 
                value={defaultRepo}
                onChange={(e) => setDefaultRepo(e.target.value)}
                placeholder="suse/documentation-project"
                className="w-full suse-input"
              />
            </div>
          </div>
        </div>

        {/* Information Security */}
        <div className="suse-card p-8 border-l-4 border-suse-pine">
          <div className="flex items-start gap-4">
            <Shield className="text-suse-pine shrink-0" size={24} />
            <div className="space-y-2">
              <h3 className="font-semibold">Security Protocol</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Tokens are used only for server-side API requests to Google and GitHub. 
                They are never logged or stored permanently on our backend in this preview version. 
                DocEngine follows the <span className="text-suse-pine">SUSE Open Security</span> standards.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <AnimatePresence>
            {saved && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-suse-pine text-sm font-medium"
              >
                <CheckCircle2 size={16} />
                Credentials Saved
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={handleSave}
            className="suse-button-primary flex items-center gap-2 px-10"
          >
            <Save size={18} />
            Commit Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
