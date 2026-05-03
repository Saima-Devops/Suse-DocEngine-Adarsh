import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { FileText, Link as LinkIcon, AlertCircle, ArrowRight, Loader2, ShieldCheck, Upload, File } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { clsx } from 'clsx';

export default function NewJob() {
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('url');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [structuredData, setStructuredData] = useState<{title: string, elements: any[]}>({ title: '', elements: [] });
  const [draftName, setDraftName] = useState('');
  const navigate = useNavigate();

  const extractDocId = (url: string) => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const docId = extractDocId(url);
    if (!docId) {
      setError('Invalid Google Docs URL. Please check and try again.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/jobs', {
        userId: auth.currentUser?.uid,
        googleDocId: docId,
        googleDocUrl: url,
        status: 'pending'
      });

      navigate(`/job/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // 1. Initial Python-powered extraction
      const response = await axios.post('/api/extract-structured', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setStructuredData(response.data);
      setDraftName(response.data.title || 'Untitled Draft');
      setIsReviewing(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Python extraction failed. Please ensure the Python backend is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleElementEdit = (index: number, newContent: string) => {
    const newElements = [...structuredData.elements];
    newElements[index].content = newContent;
    setStructuredData({ ...structuredData, elements: newElements });
  };

  const saveAsDraft = async () => {
    setLoading(true);
    try {
      // Reconstruct content from edited elements
      const reconstructedContent = structuredData.elements
        .map(el => {
          if (el.type === 'h1') return `<h1>${el.content}</h1>`;
          if (el.type === 'h2') return `<h2>${el.content}</h2>`;
          if (el.type === 'h3') return `<h3>${el.content}</h3>`;
          if (el.type === 'bullet') return `<li>${el.content}</li>`;
          return `<p>${el.content}</p>`;
        })
        .join('\n');

      const response = await axios.post('/api/jobs', {
        userId: auth.currentUser?.uid,
        googleDocTitle: draftName,
        manualContent: reconstructedContent,
        status: 'pending',
        isDraft: true
      });

      navigate(`/job/${response.data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  if (isReviewing) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Review Extraction</h1>
            <p className="text-gray-400">Edit elements before saving as draft</p>
          </div>
          <button 
            onClick={() => setIsReviewing(false)}
            className="text-gray-400 hover:text-white"
          >
            Cancel
          </button>
        </div>

        <div className="suse-card p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium uppercase tracking-wider">Draft Name</label>
            <input 
              type="text" 
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="w-full bg-suse-dark/50 border border-suse-pine/20 rounded-lg p-3 text-white focus:outline-none focus:border-suse-pine"
            />
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {structuredData.elements.map((el, idx) => (
              <div key={idx} className="group relative">
                <div className="absolute -left-16 top-3 text-[10px] text-gray-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                  {el.type.toUpperCase()}
                </div>
                {el.type.startsWith('h') ? (
                  <input
                    className={clsx(
                      "w-full bg-transparent border-b border-transparent hover:border-white/10 focus:border-suse-pine focus:outline-none transition-colors",
                      el.type === 'h1' ? "text-2xl font-bold" : "text-xl font-semibold"
                    )}
                    value={el.content}
                    onChange={(e) => handleElementEdit(idx, e.target.value)}
                  />
                ) : (
                  <textarea
                    rows={Math.ceil(el.content.length / 80)}
                    className={clsx(
                      "w-full bg-transparent border border-transparent hover:border-white/10 focus:border-suse-pine focus:outline-none rounded p-1 transition-colors resize-none",
                      el.type === 'bullet' ? "italic list-item ml-4" : ""
                    )}
                    value={el.content}
                    onChange={(e) => handleElementEdit(idx, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-white/5 flex gap-4">
            <button
              onClick={saveAsDraft}
              disabled={loading}
              className="flex-1 bg-suse-pine text-suse-dark font-bold py-3 px-6 rounded-lg hover:bg-suse-neon transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
              {loading ? 'Saving...' : 'Save Local Draft & Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div>
          <h1 className="text-3xl font-bold mb-3">Initialize Pipeline</h1>
          <p className="text-gray-400">Import your content via Google Docs URL or direct file upload for SUSE AsciiDoc transformation.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-suse-dark/50 border border-suse-pine/20 rounded-lg w-fit">
          <button 
            onClick={() => setActiveTab('url')}
            className={clsx(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === 'url' ? "bg-suse-pine text-suse-dark shadow-lg" : "text-gray-400 hover:text-white"
            )}
          >
            Import via URL
          </button>
          <button 
            onClick={() => setActiveTab('upload')}
            className={clsx(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === 'upload' ? "bg-suse-pine text-suse-dark shadow-lg" : "text-gray-400 hover:text-white"
            )}
          >
            Direct Upload
          </button>
        </div>

        <div className="suse-card p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'url' ? (
              <motion.form 
                key="url-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleUrlSubmit} 
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-xs font-mono text-gray-500 uppercase tracking-widest px-1">Source Documentation URL</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-focus-within:text-suse-pine transition-colors">
                      <LinkIcon size={20} />
                    </div>
                    <input 
                      type="text" 
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://docs.google.com/document/d/..."
                      className="w-full bg-suse-dark/50 border border-suse-pine/20 rounded-xl py-4 pl-12 pr-4 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-suse-pine focus:ring-1 focus:ring-suse-pine shadow-inner-white/5 transition-all text-lg"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 italic px-1">
                    Make sure the document is shared or accessible via the connected Google account.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex gap-3 text-red-500 text-sm">
                    <AlertCircle className="shrink-0" size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading || !url}
                  className="w-full suse-button-primary flex items-center justify-center gap-3 py-4 text-lg"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <FileText size={20} />}
                  {loading ? 'Initializing...' : 'Import Document'}
                </button>
              </motion.form>
            ) : (
              <motion.form 
                key="upload-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleFileUpload}
                className="space-y-6"
              >
                <div 
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={clsx(
                    "relative border-2 border-dashed rounded-xl py-12 px-4 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer",
                    isDragging ? "border-suse-pine bg-suse-pine/5" : "border-suse-pine/20 hover:border-suse-pine/40",
                    file ? "bg-suse-pine/5 border-suse-pine/50" : ""
                  )}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <input 
                    id="file-input"
                    type="file" 
                    className="hidden" 
                    onChange={(e) => e.target.files && setFile(e.target.files[0])}
                    accept=".docx,.doc,.odt,.rtf,.txt"
                  />
                  <div className={clsx(
                    "w-16 h-16 rounded-full flex items-center justify-center transition-all",
                    file ? "bg-suse-pine text-suse-dark" : "bg-suse-pine/10 text-suse-pine"
                  )}>
                    {file ? <File size={32} /> : <Upload size={32} />}
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg">{file ? file.name : 'Drop your file here'}</p>
                    <p className="text-sm text-gray-500">{file ? `${(file.size / 1024).toFixed(1)} KB` : 'or click to browse documents'}</p>
                  </div>
                  {file && (
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="absolute top-2 right-2 text-gray-500 hover:text-white p-1"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex gap-3 text-red-500 text-sm">
                    <AlertCircle className="shrink-0" size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading || !file}
                  className="w-full suse-button-primary flex items-center justify-center gap-3 py-4 text-lg"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Upload size={20} />}
                  {loading ? 'Uploading & Converting...' : 'Upload & Import'}
                </button>
                <p className="text-center text-[10px] text-gray-500 uppercase tracking-widest">
                  Supported: DOCX, DOC, ODT, TXT
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Info Box */}
        <div className="bg-suse-pine/5 border border-suse-pine/10 rounded-xl p-6 flex gap-4">
          <div className="p-2 h-fit bg-suse-pine/20 rounded-lg text-suse-pine">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h4 className="font-semibold text-suse-pine mb-1">DAPS-Compatible Output</h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              Our enterprise engine automatically handles heading hierarchies, admonitions, and code block detection 
              to ensure your documentation meets SUSE architectural standards out of the box.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
