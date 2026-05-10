import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ChallengeSubmission {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export const AdminDashboard: React.FC = () => {
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('challenge_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      alert('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submission: ChallengeSubmission) => {
    try {
      setProcessing(submission.id);

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

  const handleReject = async (submission: ChallengeSubmission) => {
    try {
      setProcessing(submission.id);

      const { error } = await supabase
        .from('challenge_submissions')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', submission.id);

      if (error) throw error;

      setSubmissions(prev =>
        prev.map(s =>
          s.id === submission.id ? { ...s, status: 'rejected' as const } : s
        )
      );

      alert('Submission rejected');
    } catch (err) {
      console.error('Error rejecting submission:', err);
      alert('Error rejecting submission');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-green-500 font-mono flex items-center justify-center">
      <div className="border-2 border-green-500 px-8 py-4 text-xl">Loading submissions...</div>
    </div>;
  }

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-green-500 font-mono p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-black mb-2 glitch" data-text="ADMIN DASHBOARD">
          ADMIN DASHBOARD
        </h1>
        <p className="text-green-400/70 mb-8 border-l-2 border-green-500 pl-4">Challenge Review & Approval System</p>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="border-2 border-green-500 bg-green-900/10 p-6">
            <div className="text-3xl font-black text-green-400">{submissions.length}</div>
            <div className="text-green-600 text-sm mt-2">TOTAL SUBMISSIONS</div>
          </div>
          <div className="border-2 border-yellow-500 bg-yellow-900/10 p-6">
            <div className="text-3xl font-black text-yellow-400">{pendingSubmissions.length}</div>
            <div className="text-yellow-600 text-sm mt-2">PENDING REVIEW</div>
          </div>
          <div className="border-2 border-blue-500 bg-blue-900/10 p-6">
            <div className="text-3xl font-black text-blue-400">{submissions.filter(s => s.status === 'approved').length}</div>
            <div className="text-blue-600 text-sm mt-2">APPROVED</div>
          </div>
          <div className="border-2 border-red-500 bg-red-900/10 p-6">
            <div className="text-3xl font-black text-red-400">{submissions.filter(s => s.status === 'rejected').length}</div>
            <div className="text-red-600 text-sm mt-2">REJECTED</div>
          </div>
        </div>

        <div className="border-2 border-green-500 bg-gray-900/50">
          <div className="border-b-2 border-green-500 px-6 py-4 bg-green-900/20">
            <h2 className="text-2xl font-bold">CHALLENGE SUBMISSIONS</h2>
          </div>

          {submissions.length === 0 ? (
            <div className="p-8 text-center text-green-600">
              <p className="text-xl">No submissions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-green-500/30">
              {submissions.map(submission => (
                <div
                  key={submission.id}
                  className={`p-6 border-l-4 transition-colors ${
                    submission.status === 'pending'
                      ? 'border-l-yellow-500 bg-yellow-900/5'
                      : submission.status === 'approved'
                      ? 'border-l-blue-500 bg-blue-900/5'
                      : 'border-l-red-500 bg-red-900/5'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{submission.title}</h3>
                      <div className="flex gap-3 mt-2">
                        <span className="px-3 py-1 border border-green-500 text-green-500 text-sm">
                          {submission.category}
                        </span>
                        <span className={`px-3 py-1 border text-sm ${
                          submission.difficulty === 'easy'
                            ? 'border-green-500 text-green-500'
                            : submission.difficulty === 'medium'
                            ? 'border-yellow-500 text-yellow-500'
                            : 'border-red-500 text-red-500'
                        }`}>
                          {submission.difficulty.toUpperCase()}
                        </span>
                        <span className={`px-3 py-1 border text-sm font-bold ${
                          submission.status === 'pending'
                            ? 'border-yellow-500 text-yellow-500'
                            : submission.status === 'approved'
                            ? 'border-blue-500 text-blue-500'
                            : 'border-red-500 text-red-500'
                        }`}>
                          {submission.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-green-600 text-sm">
                      {new Date(submission.created_at).toLocaleDateString()} {new Date(submission.created_at).toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="bg-gray-800/50 border border-green-500/20 p-4 mb-4 max-h-32 overflow-y-auto">
                    <p className="text-green-300 whitespace-pre-wrap">{submission.description}</p>
                  </div>

                  {submission.status === 'pending' && (
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleApprove(submission)}
                        disabled={processing === submission.id}
                        className="flex-1 py-2 px-4 border-2 border-blue-500 bg-blue-900/20 text-blue-400 font-bold hover:bg-blue-900/40 disabled:opacity-50 transition-all"
                      >
                        {processing === submission.id ? '⟳ APPROVING...' : '✓ APPROVE'}
                      </button>
                      <button
                        onClick={() => handleReject(submission)}
                        disabled={processing === submission.id}
                        className="flex-1 py-2 px-4 border-2 border-red-500 bg-red-900/20 text-red-400 font-bold hover:bg-red-900/40 disabled:opacity-50 transition-all"
                      >
                        {processing === submission.id ? '⟳ REJECTING...' : '✗ REJECT'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
