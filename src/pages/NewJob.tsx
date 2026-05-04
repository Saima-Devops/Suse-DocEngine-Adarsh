import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { FileText, Link as LinkIcon, AlertCircle, ArrowRight, Loader2, ShieldCheck, Upload, File, Trash2, Plus, ArrowUp, ArrowDown, MoreVertical, LayoutList, AlignLeft, Type, Hash, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { clsx } from 'clsx';
import { useLayoutContext } from '../components/Layout';

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
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const navigate = useNavigate();
  const { setSidebarDisabled } = useLayoutContext();

  React.useEffect(() => {
    setSidebarDisabled(isReviewing);
    return () => setSidebarDisabled(false);
  }, [isReviewing, setSidebarDisabled]);

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
      setError(err.response?.data?.error || "Document extraction failed.");
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

  const handleElementTypeChange = (index: number, newType: string) => {
    const newElements = [...structuredData.elements];
    newElements[index].type = newType;
    setStructuredData({ ...structuredData, elements: newElements });
  };

  const handleElementDelete = (index: number) => {
    const newElements = structuredData.elements.filter((_, i) => i !== index);
    setStructuredData({ ...structuredData, elements: newElements });
  };

  const handleElementMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === structuredData.elements.length - 1) return;
    
    const newElements = [...structuredData.elements];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = newElements[index];
    newElements[index] = newElements[targetIdx];
    newElements[targetIdx] = temp;
    
    setStructuredData({ ...structuredData, elements: newElements });
  };

  const handleAddElement = () => {
    setStructuredData({
      ...structuredData,
      elements: [...structuredData.elements, { type: 'paragraph', content: '' }]
    });
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
        metadata: structuredData.elements,
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
    const stats = {
      sections: structuredData.elements.filter(e => ['h1', 'h2'].includes(e.type)).length,
      subsections: structuredData.elements.filter(e => ['h3', 'h4'].includes(e.type)).length,
      paragraphs: structuredData.elements.filter(e => e.type === 'paragraph').length,
      tables: structuredData.elements.filter(e => e.type === 'table').length,
      images: structuredData.elements.filter(e => e.type === 'image').length,
      words: structuredData.elements.reduce((acc, el) => acc + (el.content.match(/\S+/g) || []).length, 0)
    };

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-8" onClick={() => setActiveMenu(null)}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Review Extraction</h1>
            <p className="text-gray-400">Edit elements before saving as draft</p>
          </div>
          <button 
            onClick={() => setIsReviewing(false)}
            className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Stats Container */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-suse-pine/10 border border-suse-pine/20 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-1">
            <LayoutList size={20} className="text-suse-pine mb-1" />
            <span className="text-2xl font-bold text-white">{stats.sections}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest">Sections</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-1">
            <Hash size={20} className="text-gray-400 mb-1" />
            <span className="text-2xl font-bold text-white">{stats.subsections}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest">Subsections</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-1">
            <AlignLeft size={20} className="text-gray-400 mb-1" />
            <span className="text-2xl font-bold text-white">{stats.paragraphs}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest">Paragraphs</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-1">
            <Type size={20} className="text-gray-400 mb-1" />
            <span className="text-2xl font-bold text-white">{stats.words}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest">Words</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mb-1"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
            <span className="text-2xl font-bold text-white">{stats.tables}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest">Tables</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-1">
            <ImageIcon size={20} className="text-gray-400 mb-1" />
            <span className="text-2xl font-bold text-white">{stats.images}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest">Images</span>
          </div>
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

          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar relative">
            {structuredData.elements.map((el, idx) => (
              <div key={idx} className="group relative flex gap-3 pb-2 border-b border-white/5">
                <div className="w-48 shrink-0 flex items-start gap-2">
                  <div className="flex-1 bg-suse-dark/80 border border-suse-pine/20 rounded flex items-center shadow-sm">
                    <select 
                      value={el.type}
                      onChange={(e) => handleElementTypeChange(idx, e.target.value)}
                      className="bg-transparent text-[11px] font-semibold tracking-wider text-suse-pine p-2 w-full outline-none uppercase appearance-none"
                    >
                      <option value="h1">H1 (Title)</option>
                      <option value="h2">H2 (Heading)</option>
                      <option value="h3">H3 (Subheading)</option>
                      <option value="h4">H4 (Section)</option>
                      <option value="paragraph">Paragraph</option>
                      <option value="bullet">Bullet</option>
                    </select>
                  </div>
                  <div 
                    className="relative flex flex-col items-center z-10"
                  >
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === idx ? null : idx);
                      }}
                      className="p-1.5 text-gray-400 hover:text-white transition-colors hover:bg-white/10 rounded-md"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {activeMenu === idx && (
                      <div 
                        className="absolute right-full top-0 mr-1 flex flex-row gap-1 bg-suse-dark border border-white/10 rounded-lg p-1.5 shadow-2xl z-50 min-w-max"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button 
                          onClick={() => handleElementMove(idx, 'up')}
                          disabled={idx === 0}
                          className="p-2 rounded text-gray-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Move Up"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button 
                          onClick={() => handleElementMove(idx, 'down')}
                          disabled={idx === structuredData.elements.length - 1}
                          className="p-2 rounded text-gray-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Move Down"
                        >
                          <ArrowDown size={16} />
                        </button>
                        <div className="w-px h-full bg-white/10 mx-0.5"></div>
                        <button 
                          onClick={() => handleElementDelete(idx)}
                          className="p-2 rounded text-red-400 hover:bg-red-400/10 transition-colors"
                          title="Delete section"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  {el.type.startsWith('h') ? (
                    <input
                      className={clsx(
                        "w-full bg-white/5 border border-transparent hover:border-white/10 focus:border-suse-pine focus:outline-none focus:bg-suse-dark/50 rounded-lg px-3 py-2 transition-all",
                        el.type === 'h1' ? "text-2xl font-bold text-white tracking-tight" : 
                        el.type === 'h2' ? "text-xl font-semibold text-gray-100" : 
                        "text-lg font-medium text-gray-200"
                      )}
                      value={el.content}
                      onChange={(e) => handleElementEdit(idx, e.target.value)}
                    />
                  ) : (
                    <textarea
                      rows={Math.max(2, Math.ceil(el.content.length / 80))}
                      className={clsx(
                        "w-full bg-white/5 border border-transparent hover:border-white/10 focus:border-suse-pine focus:outline-none focus:bg-suse-dark/50 rounded-lg px-3 py-2 transition-all resize-none leading-relaxed",
                        el.type === 'bullet' ? "italic list-item ml-6 text-gray-200" : "text-gray-300"
                      )}
                      value={el.content}
                      onChange={(e) => handleElementEdit(idx, e.target.value)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 flex gap-4">
            <button
              onClick={handleAddElement}
              className="px-6 py-3 border border-suse-pine/20 rounded-lg text-suse-pine hover:bg-suse-pine/10 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Plus size={20} />
              Add Block
            </button>
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
