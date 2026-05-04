import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { 
  FileCode, 
  Github, 
  Save, 
  Play, 
  RefreshCw, 
  ChevronRight, 
  ExternalLink,
  MessageSquare,
  Zap,
  CheckCircle2,
  Loader2,
  Download,
  Split,
  GitBranch
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { clsx } from 'clsx';

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [githubConfig, setGithubConfig] = useState({
    repo: localStorage.getItem('suse_repo') || '',
    branch: localStorage.getItem('suse_branch') || 'main',
    path: '',
    message: 'docs: transformed from Google Doc'
  });

  const fetchJob = async () => {
    try {
      const response = await axios.get(`/api/jobs/${id}`);
      const data = response.data;
      setJob(data);
      if (data.asciiDocContent && !previewContent) setPreviewContent(data.asciiDocContent);
      
      // Auto-run transformation if pending
      if (data.status === 'pending' && !processing) {
        startTransformation(data.id, data.googleDocId, data.manualContent);
      }
    } catch (error) {
      console.error('Error fetching job:', error);
    } finally {
      if (loading) setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchJob();
    
    // Poll for status updates while processing or pending
    const interval = setInterval(() => {
      if (job?.status === 'processing' || job?.status === 'pending') {
        fetchJob();
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [id, job?.status]);

  const startTransformation = async (jobId: string, docId: string, directContent?: string) => {
    setProcessing(true);
    try {
      // Update local status to processing
      await axios.patch(`/api/jobs/${jobId}`, { status: 'processing' });

      // Get token from localStorage
      const accessToken = localStorage.getItem('google_token');
      
      const response = await axios.post('/api/transform', {
        docId,
        accessToken,
        manualContent: directContent || job?.manualContent || null,
        metadata: job?.metadata
      });

      const updatedJob = await axios.patch(`/api/jobs/${jobId}`, {
        asciiDocContent: response.data.adoc,
        googleDocTitle: response.data.title,
        status: 'completed'
      });
      
      setJob(updatedJob.data);
      setPreviewContent(response.data.adoc);
      setGithubConfig(prev => ({ ...prev, path: `${response.data.title?.toLowerCase().replace(/\s+/g, '-') || 'doc'}.adoc` }));

    } catch (error: any) {
      console.error(error);
      const errorMessage = error.response?.data?.error || error.message;
      await axios.patch(`/api/jobs/${jobId}`, { status: 'failed', error: errorMessage });
      fetchJob(); // Refresh state
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!previewContent) return;
    const blob = new Blob([previewContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job?.googleDocTitle || 'document'}.adoc`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleSyncToGitHub = async () => {
    if (!job || !previewContent) return;
    setSyncing(true);
    try {
      const githubToken = localStorage.getItem('github_token');
      if (!githubToken) {
        alert('Please configure your GitHub token in Settings first.');
        setSyncing(false);
        return;
      }

      const response = await axios.post('/api/sync', {
        githubToken,
        repo: githubConfig.repo,
        branch: githubConfig.branch,
        path: githubConfig.path,
        content: previewContent,
        message: githubConfig.message
      });

      if (response.data.success) {
        await axios.patch(`/api/jobs/${job.id}`, {
          githubPrUrl: response.data.url
        });
        fetchJob(); // Refresh state
        alert('Successfully synced to GitHub!');
      }
    } catch (error: any) {
      alert(`Sync failed: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-suse-pine" /></div>;
  if (!job) return <div className="p-20 text-center">Pipeline not found.</div>;

  return (
    <div className="h-full flex flex-col space-y-6 max-h-screen">
      {/* Header Info */}
      <div className="flex justify-between items-start shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{job.googleDocTitle || 'Initializing Transformation...'}</h1>
            <div className={clsx(
              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
              job.status === 'completed' ? "bg-suse-pine/20 text-suse-pine" : "bg-suse-water/20 text-suse-water animate-pulse"
            )}>
              {job.status}
            </div>
          </div>
          <p className="text-xs text-gray-500 font-mono flex items-center gap-2">
            ID: {job.id} <ChevronRight size={10} /> {job.googleDocId}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleDownload}
            disabled={!previewContent}
            className="suse-button-outline flex items-center gap-2 text-sm border-suse-water text-suse-water hover:bg-suse-water/10"
          >
            <Download size={14} />
            Download .adoc
          </button>
          <button 
            onClick={() => startTransformation(job.id, job.googleDocId, job.manualContent)}
            disabled={processing}
            className="suse-button-outline flex items-center gap-2 text-sm"
          >
            <RefreshCw size={14} className={processing ? 'animate-spin' : ''} />
            Re-process
          </button>
          <button 
            onClick={handleSyncToGitHub}
            disabled={syncing || !job.asciiDocContent}
            className="suse-button-primary flex items-center gap-2 text-sm"
          >
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <Github size={14} />}
            Push to GitHub
          </button>
        </div>
      </div>

      {/* Main Workbench */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">
        {/* Editor/Preview Side-by-Side */}
        <div className="lg:col-span-8 flex flex-col min-h-0 suse-card overflow-hidden">
          <div className="flex border-b border-white/5 bg-white/5 px-4 shrink-0">
            <button className="px-4 py-3 border-b-2 border-suse-pine text-suse-pine font-medium text-sm flex items-center gap-2">
              <Split size={14} /> AsciiDoc Preview
            </button>
          </div>
          <div className="flex-1 overflow-auto p-0 flex">
            {/* Real split view would enable editing, here we show generated source */}
            <div className="w-1/2 border-r border-white/5 flex flex-col">
              <div className="bg-suse-dark/50 px-3 py-1 text-[10px] uppercase tracking-widest text-gray-500">Source AsciiDoc</div>
              <textarea 
                value={previewContent}
                onChange={(e) => setPreviewContent(e.target.value)}
                className="flex-1 bg-transparent p-6 font-mono text-sm resize-none focus:outline-none text-gray-300 custom-scrollbar"
                placeholder="AsciiDoc content will appear here..."
              />
            </div>
            <div className="w-1/2 bg-suse-dark/20 p-6 overflow-auto custom-scrollbar prose prose-invert prose-headings:text-suse-pine max-w-none">
              {/* This would ideally use Asciidoctor to render. For now, we show a mock preview */}
              <div className="text-xs font-mono text-gray-500 mb-4 uppercase tracking-widest">[Rendered Preview]</div>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-gray-400">
                {previewContent || 'Fetching content from Google Docs...'}
              </pre>
            </div>
          </div>
        </div>

        {/* Tools & Sidebar */}
        <div className="lg:col-span-4 space-y-6 overflow-y-auto custom-scrollbar pr-1">
          {/* GitHub Config */}
          <div className="suse-card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2 border-b border-white/5 pb-3">
              <GitBranch size={16} className="text-suse-pine" />
              Sync Options
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Repository</label>
                <input 
                  type="text" 
                  value={githubConfig.repo}
                  onChange={(e) => setGithubConfig({...githubConfig, repo: e.target.value})}
                  className="w-full mt-1 bg-suse-dark/50 border border-suse-pine/20 rounded-md p-2 text-sm"
                  placeholder="owner/repo"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">File Path</label>
                <input 
                  type="text" 
                  value={githubConfig.path}
                  onChange={(e) => setGithubConfig({...githubConfig, path: e.target.value})}
                  className="w-full mt-1 bg-suse-dark/50 border border-suse-pine/20 rounded-md p-2 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Commit Message</label>
                <textarea 
                  value={githubConfig.message}
                  onChange={(e) => setGithubConfig({...githubConfig, message: e.target.value})}
                  className="w-full mt-1 bg-suse-dark/50 border border-suse-pine/20 rounded-md p-2 text-xs"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="suse-card p-6 space-y-4 bg-gradient-to-br from-suse-jungle/40 to-suse-pine/5">
            <h3 className="font-semibold flex items-center gap-2 border-b border-suse-pine/10 pb-3">
              <Zap size={16} className="text-suse-pine" />
              AI Enhancement
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-suse-pine/10 border border-suse-pine/20">
                <p className="text-xs text-suse-pine font-medium mb-1">SUSE DAPS Suggestion</p>
                <p className="text-[11px] text-gray-400">Detected repeated product names. Recommended attributes:</p>
                <code className="block mt-1 text-[10px] text-suse-water">:product-name: SUSE Linux Enterprise Server</code>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-gray-300 font-medium mb-1">Normalization</p>
                <p className="text-[11px] text-gray-500 italic">Term "CLI" mapped to SUSE-standard "command-line interface".</p>
              </div>
            </div>
          </div>

          {/* Execution Log */}
          <div className="suse-card p-6">
            <h3 className="font-semibold flex items-center gap-2 border-b border-white/5 pb-3">
              <MessageSquare size={16} className="text-gray-400" />
              Logs
            </h3>
            <div className="mt-4 space-y-2 font-mono text-[10px]">
              <div className="flex gap-2 text-suse-pine">
                <span className="opacity-50">14:22:01</span>
                <span>[INFO] Doc loaded successfully</span>
              </div>
              <div className="flex gap-2 text-gray-400">
                <span className="opacity-50">14:22:02</span>
                <span>[INFO] Parsing hierarchy...</span>
              </div>
              <div className="flex gap-2 text-suse-water">
                <span className="opacity-50">14:22:04</span>
                <span>[AI] Gemini transformation active</span>
              </div>
              {job.status === 'completed' && (
                <div className="flex gap-2 text-suse-pine">
                  <span className="opacity-50">14:22:10</span>
                  <span>[SUCCESS] Transformation complete</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
