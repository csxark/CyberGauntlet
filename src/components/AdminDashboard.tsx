import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Plus } from 'lucide-react';

interface ChallengeSubmission {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  correct_flag: string;
  hints: string[];
  assets: any[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export function AdminDashboard() {
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generateCategory, setGenerateCategory] = useState('');
  const [generateDifficulty, setGenerateDifficulty] = useState('');

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('challenge_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (err) {
      console.error('Error loading submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submission: ChallengeSubmission) => {
    try {
      setProcessing(submission.id);

      // Call the approval function
      const { data, error } = await supabase.functions.invoke('approve-challenge', {
        body: {
          submission_id: submission.id
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to approve challenge');
      }

      setSubmissions(prev =>
        prev.map(s =>
          s.id === submission.id ? { ...s, status: 'approved' as const } : s
        )
      );

      alert(data.message);
    } catch (err: any) {
      console.error('Error approving submission:', err);
      alert('Error approving submission: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleGenerateChallenge = async () => {
    if (!generateCategory || !generateDifficulty) {
      alert('Please select both category and difficulty');
      return;
    }

    try {
      setProcessing('generate');

      const { data, error } = await supabase.functions.invoke('generate-challenge', {
        body: {
          category: generateCategory,
          difficulty: generateDifficulty
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate challenge');
      }

      alert(data.message);
      setGenerateCategory('');
      setGenerateDifficulty('');
    } catch (err: any) {
      console.error('Error generating challenge:', err);
      alert('Error generating challenge: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-green-400 font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <div className="w-12 h-12 text-green-500"></div>
          </div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-green-400 font-mono">
      <div className="scanlines"></div>
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">
            ADMIN<span className="text-green-500">DASHBOARD</span>
          </h1>
          <p className="text-green-300/60 text-sm mt-2">Manage challenge submissions and generate new challenges</p>
        </header>

        {/* Generate Challenge Section */}
        <div className="mb-8">
          <div className="bg-black/50 border border-green-500/30 rounded-lg p-6">
            <h2 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Generate New Challenge
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-green-400 mb-2 text-sm">Category</label>
                <select
                  value={generateCategory}
                  onChange={(e) => setGenerateCategory(e.target.value)}
                  className="w-full bg-black/50 border border-green-500/30 rounded px-3 py-2 text-green-400 focus:border-green-500 focus:outline-none"
                >
                  <option value="">Select Category</option>
                  <option value="Cryptography">Cryptography</option>
                  <option value="Programming">Programming</option>
                  <option value="Steganography">Steganography</option>
                </select>
              </div>
              <div>
                <label className="block text-green-400 mb-2 text-sm">Difficulty</label>
                <select
                  value={generateDifficulty}
                  onChange={(e) => setGenerateDifficulty(e.target.value)}
                  className="w-full bg-black/50 border border-green-500/30 rounded px-3 py-2 text-green-400 focus:border-green-500 focus:outline-none"
                >
                  <option value="">Select Difficulty</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleGenerateChallenge}
                  disabled={processing === 'generate' || !generateCategory || !generateDifficulty}
                  className="w-full bg-green-600 hover:bg-green-700 text-black font-bold py-2 px-4 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processing === 'generate' ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Generate Challenge
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Challenge Submissions */}
        <div className="bg-black/50 border border-green-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-green-400 mb-4">Challenge Submissions</h2>

          {submissions.length === 0 ? (
            <p className="text-green-300/60 text-center py-8">No submissions yet</p>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="border border-green-500/20 rounded-lg p-4 bg-black/30"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-green-400">{submission.title}</h3>
                      <p className="text-green-300/80 text-sm mt-1">{submission.description}</p>
                      <div className="flex gap-4 mt-2 text-xs text-green-300/60">
                        <span>Category: {submission.category}</span>
                        <span>Difficulty: {submission.difficulty}</span>
                        <span>Status: <span className={`font-bold ${
                          submission.status === 'approved' ? 'text-green-500' :
                          submission.status === 'rejected' ? 'text-red-500' : 'text-yellow-500'
                        }`}>{submission.status.toUpperCase()}</span></span>
                      </div>
                    </div>
                    {submission.status === 'pending' && (
                      <button
                        onClick={() => handleApprove(submission)}
                        disabled={processing === submission.id}
                        className="bg-green-600 hover:bg-green-700 text-black font-bold py-2 px-4 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                      >
                        {processing === submission.id ? (
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          'Approve'
                        )}
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-green-300/40">
                    Submitted: {new Date(submission.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
