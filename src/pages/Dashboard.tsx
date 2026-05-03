import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { auth } from '../lib/firebase';
import { Plus, Play, CheckCircle2, Clock, AlertCircle, ExternalLink, ArrowRight, Zap, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

export default function Dashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    if (!auth.currentUser) return;
    try {
      const response = await axios.get(`/api/jobs?userId=${auth.currentUser.uid}`);
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    // Poll for updates every 10 seconds since we don't have real-time websockets on local files
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="text-suse-pine" size={18} />;
      case 'processing': return <Clock className="text-suse-water animate-spin" size={18} />;
      case 'failed': return <AlertCircle className="text-red-500" size={18} />;
      default: return <Clock className="text-gray-500" size={18} />;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Documentation Pipeline</h1>
          <p className="text-gray-400 font-mono text-sm uppercase tracking-wider">Overview of active document transformations</p>
        </div>
        <Link to="/new" className="suse-button-primary flex items-center gap-2 px-6">
          <Plus size={20} />
          New Import
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="suse-card p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1 uppercase tracking-widest font-semibold">Total Pipelines</p>
            <p className="text-4xl font-bold text-white">{jobs.length}</p>
          </div>
          <div className="p-3 bg-suse-pine/10 rounded-xl">
            <Play className="text-suse-pine" size={24} />
          </div>
        </div>
        <div className="suse-card p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1 uppercase tracking-widest font-semibold">Successful Syncs</p>
            <p className="text-4xl font-bold text-suse-pine">{jobs.filter(j => j.status === 'completed').length}</p>
          </div>
          <div className="p-3 bg-suse-pine/10 rounded-xl">
            <CheckCircle2 className="text-suse-pine" size={24} />
          </div>
        </div>
        <div className="suse-card p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1 uppercase tracking-widest font-semibold">Active Workers</p>
            <p className="text-4xl font-bold text-suse-water">01</p>
          </div>
          <div className="p-3 bg-suse-water/10 rounded-xl">
            <Zap className="text-suse-water" size={24} />
          </div>
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="suse-card overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          <div className="text-xs text-gray-500 uppercase tracking-widest">Local-First Feed</div>
        </div>
        
        {loading ? (
          <div className="p-20 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-suse-pine"></div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-20 text-center text-gray-500 flex flex-col items-center gap-4">
            <FileText size={48} className="opacity-20" />
            <p>No documentation pipelines found. Start by importing a Google Doc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-widest">
                  <th className="px-6 py-4 font-semibold">Document Title</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Created</th>
                  <th className="px-6 py-4 font-semibold">GitHub Sync</th>
                  <th className="px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {jobs.slice().sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((job) => (
                  <motion.tr 
                    key={job.id} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-200">{job.googleDocTitle || 'Untitled Doc'}</span>
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-tight">{job.googleDocId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span className={clsx(
                          "text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wider",
                          job.status === 'completed' && "text-suse-pine bg-suse-pine/10",
                          job.status === 'processing' && "text-suse-water bg-suse-water/10",
                          job.status === 'failed' && "text-red-400 bg-red-400/10",
                          job.status === 'pending' && "text-gray-400 bg-gray-400/10"
                        )}>
                          {job.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {job.createdAt ? new Date(job.createdAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {job.githubPrUrl ? (
                        <a 
                          href={job.githubPrUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-suse-pine flex items-center gap-1 hover:underline"
                        >
                          View PR <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        to={`/job/${job.id}`}
                        className="text-gray-400 hover:text-white transition-colors p-2"
                      >
                        <ArrowRight size={18} />
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
