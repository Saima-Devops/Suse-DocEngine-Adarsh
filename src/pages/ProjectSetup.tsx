import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Folder, FolderTree, File, ChevronRight, Loader2, Save } from 'lucide-react';
import { motion } from 'motion/react';

export default function ProjectSetup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState<any>(null);
  const [extractions, setExtractions] = useState<string[]>([]);
  const [selectedExtraction, setSelectedExtraction] = useState<string>('');

  const [formData, setFormData] = useState({
    suseProduct: 'SUSE Linux Enterprise Server For SAP Applications',
    partnerName: 'Unknown',
    partnerProduct: '',
    documentType: 'reference-configuration'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobRes, extRes] = await Promise.all([
          axios.get(`/api/jobs/${id}`),
          axios.get('/api/extractions')
        ]);
        setJob(jobRes.data);
        setExtractions(extRes.data);
        if (jobRes.data.localExtractionPath) {
          setSelectedExtraction(jobRes.data.localExtractionPath);
        } else if (extRes.data.length > 0) {
          setSelectedExtraction(extRes.data[0]);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`/api/setup-project/${id}`, {
        ...formData,
        localExtractionPath: selectedExtraction
      });
      navigate(`/job/${id}`);
    } catch (error: any) {
      alert(`Setup failed: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getSafeName = (name: string, fallback: string) => 
    (name || fallback).toLowerCase().replace(/[^a-z0-9\-]/g, '-');

  let safeDocType = getSafeName(formData.documentType, "document");
  if (safeDocType === 'reference-configuration') safeDocType = 'reference';
  const safePartner = getSafeName(formData.partnerName, "partner");

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-suse-pine" /></div>;
  if (!job) return <div className="p-20 text-center text-red-500">Job not found.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-white uppercase tracking-widest">Project Configuration</h1>
        <p className="font-mono text-xs text-gray-500 uppercase tracking-[0.2em]">Define metadata to generate the local workspace structure</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Settings Form Info */}
          <div className="bg-[#0b1612]/80 backdrop-blur-xl border border-suse-pine/20 rounded-2xl p-8 shadow-2xl">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-suse-pine uppercase tracking-[0.2em] ml-1">Document Type</label>
                <select
                  value={formData.documentType}
                  onChange={(e) => setFormData({...formData, documentType: e.target.value})}
                  className="w-full bg-suse-dark/80 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-suse-pine transition-all appearance-none outline-none"
                >
                  <option value="reference-configuration">Reference Configuration</option>
                  <option value="trd">Technical Reference Document (TRD)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-suse-pine uppercase tracking-[0.2em] ml-1">SUSE Product Name</label>
                <input
                  type="text"
                  required
                  value={formData.suseProduct}
                  onChange={(e) => setFormData({...formData, suseProduct: e.target.value})}
                  className="w-full bg-suse-dark/80 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-suse-pine transition-all placeholder:text-gray-600 outline-none"
                  placeholder="e.g. SUSE Linux Enterprise Server"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-suse-pine uppercase tracking-[0.2em] ml-1">Partner Name</label>
                <input
                  type="text"
                  required
                  value={formData.partnerName}
                  onChange={(e) => setFormData({...formData, partnerName: e.target.value})}
                  className="w-full bg-suse-dark/80 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-suse-pine transition-all placeholder:text-gray-600 outline-none"
                  placeholder="e.g. ClearML"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-suse-pine uppercase tracking-[0.2em] ml-1">Partner Product Name</label>
                <input
                  type="text"
                  value={formData.partnerProduct}
                  onChange={(e) => setFormData({...formData, partnerProduct: e.target.value})}
                  className="w-full bg-suse-dark/80 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-suse-pine transition-all placeholder:text-gray-600 outline-none"
                  placeholder="e.g. ClearML Enterprise"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-suse-pine uppercase tracking-[0.2em] ml-1">JSON Extraction Source</label>
                <select
                  value={selectedExtraction}
                  onChange={(e) => setSelectedExtraction(e.target.value)}
                  className="w-full bg-suse-dark/80 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-suse-pine transition-all appearance-none outline-none"
                >
                  <option value="">No Draft Selected</option>
                  {extractions.map(ext => (
                    <option key={ext} value={ext}>{ext}</option>
                  ))}
                </select>
                <p className="text-[9px] text-gray-500 italic px-1">Select the JSON template to use for context mapping.</p>
              </div>
            </div>
          </div>

          {/* Live Hierarchy Preview */}
          <div className="bg-suse-jungle/20 border border-white/5 rounded-2xl p-8 flex flex-col space-y-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2 bg-suse-pine/10 rounded-xl border border-suse-pine/20">
                <FolderTree size={20} className="text-suse-pine" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Workspace Projection</span>
                <span className="text-[9px] font-mono text-gray-500">Real-time local artifact structuring</span>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-suse-dark/30 rounded-xl border border-white/5 p-6 font-mono text-xs">
              <div className="space-y-4">
                {/* Root */}
                <div className="flex items-center gap-2 text-suse-pine font-bold">
                  <Folder size={16} fill="currentColor" className="text-suse-pine opacity-80" />
                  / (project root)
                </div>
                
                {/* Document Type */}
                <div className="pl-6 space-y-4 relative">
                  <div className="absolute left-2.5 top-[-10px] bottom-0 w-px bg-white/10" />
                  <div className="flex items-center gap-2 text-gray-300 relative group">
                    <div className="absolute left-[-22px] w-4 h-px bg-white/10" />
                    <Folder size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                    <span className="bg-white/5 px-2 py-0.5 rounded text-suse-pine uppercase font-bold tracking-widest">{safeDocType}</span>
                  </div>

                  {/* Partner Name */}
                  <div className="pl-6 space-y-3 relative">
                    <div className="absolute left-2.5 top-[-10px] bottom-0 w-px bg-white/10" />
                    <div className="flex items-center gap-2 text-gray-300 relative group">
                      <div className="absolute left-[-22px] w-4 h-px bg-white/10" />
                      <Folder size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                      <span className="bg-white/5 px-2 py-0.5 rounded text-white font-bold">{safePartner || 'partner'}</span>
                    </div>

                    {/* Files inside partner folder */}
                    <div className="pl-6 space-y-2 relative">
                      <div className="absolute left-2.5 top-[-10px] bottom-4 w-px bg-white/10" />
                      
                      <div className="flex items-center gap-2 text-gray-400 relative">
                        <div className="absolute left-[-22px] w-4 h-px bg-white/10" />
                        <File size={14} className="text-suse-water" />
                        <span className="text-gray-300">main.adoc</span>
                        <span className="ml-auto text-[9px] text-gray-600 bg-black/50 px-2 rounded-full border border-white/5">Target</span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-400 relative">
                        <div className="absolute left-[-22px] w-4 h-px bg-white/10" />
                        <File size={14} className="text-orange-400" />
                        <span className="text-gray-300">dc.xml</span>
                        <span className="ml-auto text-[9px] text-gray-600 bg-black/50 px-2 rounded-full border border-white/5">Metadata</span>
                      </div>
                      
                      {/* Visualizing extraction artifact copy (optional feature representation) */}
                      <div className="flex items-center gap-2 text-gray-500 relative mt-4 opacity-50">
                        <div className="absolute left-[-22px] w-4 h-px bg-white/10" />
                        <File size={14} className="text-gray-500" />
                        <span>{job.localExtractionPath ? job.localExtractionPath.split('/').pop() : 'source.json'}</span>
                        <span className="ml-auto text-[9px]">Input Ref</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || !formData.partnerName}
            className="w-full flex justify-center items-center gap-2 bg-suse-pine text-suse-dark py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[13px] hover:bg-suse-neon hover:shadow-[0_0_20px_rgba(48,186,120,0.4)] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Convert to ASCII
          </button>
        </div>
      </form>
    </div>
  );
}
