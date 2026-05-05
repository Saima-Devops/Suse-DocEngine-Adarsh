import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { FileText, Link as LinkIcon, AlertCircle, ArrowRight, Loader2, ShieldCheck, Upload, File, FileCode, Trash2, Plus, ArrowUp, ArrowDown, MoreVertical, LayoutList, AlignLeft, Type, Hash, Image as ImageIcon } from 'lucide-react';
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
  const [subfolder, setSubfolder] = useState('extractions');
  const [customFilename, setCustomFilename] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [structuredData, setStructuredData] = useState<{app: string, source_name: string, sections: any[], localPath?: string}>({ app: '', source_name: '', sections: [] });
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
      formData.append('subfolder', subfolder);
      formData.append('customFilename', customFilename);

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

  const handleElementEdit = (sectionIdx: number, blockIdx: number, newText: string) => {
    const newSections = JSON.parse(JSON.stringify(structuredData.sections));
    newSections[sectionIdx].blocks[blockIdx].text = newText;
    setStructuredData({ ...structuredData, sections: newSections });
  };

  const handleSectionHeadingEdit = (sectionIdx: number, newHeading: string) => {
    const newSections = [...structuredData.sections];
    newSections[sectionIdx].heading = newHeading;
    setStructuredData({ ...structuredData, sections: newSections });
  };

  const handleSectionLevelChange = (sectionIdx: number, newLevel: number) => {
    const newSections = [...structuredData.sections];
    newSections[sectionIdx].level = Math.max(1, Math.min(4, newLevel));
    setStructuredData({ ...structuredData, sections: newSections });
  };

  const handleSectionDelete = (sectionIdx: number) => {
    const newSections = structuredData.sections.filter((_, i) => i !== sectionIdx);
    setStructuredData({ ...structuredData, sections: newSections });
  };

  const handleAddSection = (afterIdx: number) => {
    const newSections = [...structuredData.sections];
    const newSection = {
      section_id: Date.now(),
      order: afterIdx + 1,
      level: 2,
      subsection_no: "",
      section_no: "",
      heading: "New Section",
      content: "",
      blocks: [{ type: 'paragraph', text: '', asset_path: '', caption: '', rows: [] }]
    };
    newSections.splice(afterIdx + 1, 0, newSection);
    setStructuredData({ ...structuredData, sections: newSections });
  };

  const handleAddBlock = (sectionIdx: number, type: 'paragraph' | 'list-item') => {
    const newSections = JSON.parse(JSON.stringify(structuredData.sections));
    newSections[sectionIdx].blocks.push({
      type,
      text: '',
      asset_path: '',
      caption: '',
      rows: []
    });
    setStructuredData({ ...structuredData, sections: newSections });
  };

  const handleBlockDelete = (sectionIdx: number, blockIdx: number) => {
    const newSections = JSON.parse(JSON.stringify(structuredData.sections));
    newSections[sectionIdx].blocks = newSections[sectionIdx].blocks.filter((_: any, i: number) => i !== blockIdx);
    setStructuredData({ ...structuredData, sections: newSections });
  };

  const saveAsDraft = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/jobs', {
        userId: auth.currentUser?.uid,
        googleDocTitle: structuredData.source_name,
        metadata: structuredData,
        status: 'pending',
        isDraft: true,
        localExtractionPath: structuredData.localPath
      });

      navigate(`/setup/${response.data.id}`);
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
      sections: structuredData.sections.length,
      paragraphs: structuredData.sections.reduce((acc, s) => acc + s.blocks.filter((b: any) => b.type === 'paragraph').length, 0),
      tables: structuredData.sections.reduce((acc, s) => acc + s.blocks.filter((b: any) => b.type === 'table').length, 0),
      words: structuredData.sections.reduce((acc, s) => acc + s.blocks.reduce((bAcc: any, b: any) => bAcc + (b.text.match(/\S+/g) || []).length, 0), 0)
    };

    return (
      <div className="w-full max-w-[95%] mx-auto py-8 px-4 space-y-6" onClick={() => setActiveMenu(null)}>
        {/* Futuristic Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-suse-pine text-xs font-mono uppercase tracking-[0.2em]">
              <div className="w-2 h-2 rounded-full bg-suse-pine animate-pulse" />
              Extraction Pipeline: Stage 02
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white uppercase">Review & Structure</h1>
            <p className="text-gray-400 font-medium">Verify detected documentation hierarchies and metadata blocks for {structuredData.app}.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsReviewing(false)}
              className="px-6 py-2.5 rounded-xl text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-semibold text-sm backdrop-blur-md"
            >
              Discard Pipeline
            </button>
            <button
              onClick={saveAsDraft}
              disabled={loading}
              className="px-8 py-2.5 bg-suse-pine text-suse-dark font-black rounded-xl hover:bg-suse-neon transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(12,186,114,0.3)] hover:shadow-[0_0_30px_rgba(12,186,114,0.5)] uppercase text-sm tracking-wider"
            >
              {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={18} />}
              {loading ? 'Processing...' : 'Finalize Extraction'}
            </button>
          </div>
        </div>

        {/* Bento Stats & Global Settings */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-suse-pine/5 border border-suse-pine/20 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2 group hover:bg-suse-pine/10 transition-all cursor-default">
              <LayoutList size={24} className="text-suse-pine transition-transform group-hover:scale-110" />
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white leading-none">{stats.sections}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Total Sections</span>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2 group hover:bg-white/10 transition-all cursor-default">
              <AlignLeft size={24} className="text-gray-400 transition-transform group-hover:scale-110" />
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white leading-none">{stats.paragraphs}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Text Blocks</span>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2 group hover:bg-white/10 transition-all cursor-default">
              <Type size={24} className="text-gray-500 transition-transform group-hover:scale-110" />
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white leading-none">{stats.words}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Word Count</span>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2 group hover:bg-white/10 transition-all cursor-default">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 transition-transform group-hover:scale-110"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white leading-none">{stats.tables}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Grid Data</span>
              </div>
            </div>
          </div>

          <div className="bg-suse-jungle/20 border border-suse-pine/20 rounded-2xl p-6 flex flex-col justify-center">
            <label className="text-[10px] text-suse-pine font-black uppercase tracking-[0.2em] mb-2 px-1">Source Pipeline</label>
            <div className="text-white font-bold truncate bg-suse-dark/80 border border-white/10 rounded-xl px-4 py-3 outline-none">
              {structuredData.source_name}
            </div>
          </div>
        </div>

        {/* Content Pipeline Editor */}
        <div className="bg-suse-jungle/10 border border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="bg-white/[0.02] border-b border-white/5 px-8 py-4 flex items-center justify-between">
            <div className="text-xs font-mono text-gray-500 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-suse-pine" />
              HIERARCHICAL SECTION DRAFT
            </div>
          </div>

          <div className="p-8 space-y-12 max-h-[1000px] overflow-y-auto custom-scrollbar relative bg-[#0b1612]/50">
            {structuredData.sections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-6 relative group/section">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1 w-12 pt-1 font-mono text-[10px] group-hover/section:text-suse-pine transition-colors">
                    <span className={clsx("font-black", section.section_no ? "text-suse-pine" : "text-gray-600")}>{section.section_no || 'DRAFT'}</span>
                    <div className="w-px h-8 bg-suse-pine/20" />
                    
                    <div className="hidden group-hover/section:flex flex-col gap-1 mt-2 transition-all">
                       <button onClick={() => handleSectionDelete(sIdx)} className="p-2 text-red-500 hover:bg-red-500/20 rounded-xl transition-all shadow-lg border border-red-500/10 hover:border-red-500/30 bg-suse-dark/50" title="Delete Section">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="flex p-1 bg-suse-dark/80 border border-white/20 rounded-xl shadow-2xl">
                        {[1, 2, 3].map(lvl => (
                          <button
                            key={lvl}
                            onClick={() => handleSectionLevelChange(sIdx, lvl)}
                            className={clsx(
                              "px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] rounded-lg transition-all",
                              section.level === lvl ? "bg-suse-pine text-white shadow-[0_0_15px_rgba(48,186,120,0.4)]" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                            )}
                          >
                            H{lvl}
                          </button>
                        ))}
                      </div>
                      
                      <input
                        className={clsx(
                          "flex-1 bg-transparent border-l-4 border-suse-pine/30 focus:border-suse-pine focus:outline-none transition-all pl-6 py-2 font-black uppercase tracking-tight",
                          section.level === 1 ? "text-4xl text-white" : 
                          section.level === 2 ? "text-2xl text-gray-100" : 
                          "text-xl text-gray-300"
                        )}
                        value={section.heading}
                        onChange={(e) => handleSectionHeadingEdit(sIdx, e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 ml-16">
                  {section.blocks.map((block: any, bIdx: number) => (
                    <div key={bIdx} className="group/block relative">
                      {block.type === 'table' ? (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 overflow-x-auto">
                          <table className="w-full text-xs text-left border-collapse">
                            <tbody>
                              {block.rows.map((row: string[], rIdx: number) => (
                                <tr key={rIdx} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="p-2 text-gray-400 font-mono">{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="relative">
                          <textarea
                            rows={Math.max(2, Math.ceil((block.text || '').length / 120))}
                            className={clsx(
                              "w-full bg-white/[0.02] border border-transparent hover:border-white/5 focus:border-suse-pine/30 focus:outline-none focus:bg-suse-dark/30 rounded-2xl px-6 py-4 transition-all resize-none leading-relaxed font-medium text-lg",
                              block.type === 'list-item' ? "italic list-item ml-6 text-suse-pine/90" : "text-gray-300"
                            )}
                            value={block.text}
                            onChange={(e) => handleElementEdit(sIdx, bIdx, e.target.value)}
                          />
                          <button 
                            onClick={() => handleBlockDelete(sIdx, bIdx)}
                            className="absolute -right-2 top-0 opacity-0 group-hover/block:opacity-100 p-2 text-red-500/50 hover:text-red-400 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="flex items-center gap-4 pt-4 opacity-0 group-hover/section:opacity-100 transition-all">
                    <button 
                      onClick={() => handleAddBlock(sIdx, 'paragraph')}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-suse-pine/60 hover:text-suse-pine transition-all px-4 py-2.5 rounded-xl border border-dashed border-suse-pine/20 hover:border-suse-pine/50 hover:bg-suse-pine/5"
                    >
                      <Plus size={14} /> Add Paragraph
                    </button>
                    <button 
                      onClick={() => handleAddBlock(sIdx, 'list-item')}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-suse-pine/60 hover:text-suse-pine transition-all px-4 py-2.5 rounded-xl border border-dashed border-suse-pine/20 hover:border-suse-pine/50 hover:bg-suse-pine/5"
                    >
                      <Plus size={14} /> Add List Item
                    </button>
                  </div>
                </div>

                <div className="relative h-px bg-white/5 my-12 group/divider">
                  <button 
                    onClick={() => handleAddSection(sIdx)}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/divider:opacity-100 bg-suse-dark border border-suse-pine/40 text-suse-pine px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-110 hover:border-suse-pine hover:shadow-[0_0_20px_rgba(48,186,120,0.3)] z-10 flex items-center gap-2"
                  >
                    <Plus size={14} /> Inject New Section
                  </button>
                </div>
              </div>
            ))}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest px-1">Storage Subfolder</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-focus-within:text-suse-pine transition-colors">
                        <LayoutList size={20} />
                      </div>
                      <input 
                        type="text" 
                        value={subfolder}
                        onChange={(e) => setSubfolder(e.target.value)}
                        placeholder="e.g. cloud-docs"
                        className="w-full bg-suse-dark/50 border border-suse-pine/20 rounded-xl py-3 pl-12 pr-4 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-suse-pine shadow-inner-white/5 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest px-1">Custom JSON Filename</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-focus-within:text-suse-pine transition-colors">
                        <FileCode size={20} />
                      </div>
                      <input 
                        type="text" 
                        value={customFilename}
                        onChange={(e) => setCustomFilename(e.target.value)}
                        placeholder="e.g. transformation-v1"
                        className="w-full bg-suse-dark/50 border border-suse-pine/20 rounded-xl py-3 pl-12 pr-4 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-suse-pine shadow-inner-white/5 transition-all text-sm"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-gray-500 italic px-1">
                  Saved as: <code>/data/{subfolder}/{customFilename || "automatic-name"}.json</code>
                </p>

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
