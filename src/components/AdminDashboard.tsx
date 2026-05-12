import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, CheckCircle, XCircle, RefreshCw, Shield, BookOpen, ClipboardList, BarChart3, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { GlitchText } from './GlitchText';
import { TerminalBox } from './TerminalBox';

interface AdminDashboardProps { onLogout: () => void; }
type Tab = 'overview' | 'challenges' | 'add' | 'submissions';

interface Challenge {
  id: string; title: string; description: string; category: string;
  difficulty: string; hints: string[]; file_name: string;
  file_path: string; is_active: boolean; created_at: string;
}
interface Submission {
  id: string; title: string; description: string; category: string;
  difficulty: string; status: 'pending'|'approved'|'rejected';
  created_at: string; hints: string[];
}
interface Stats {
  totalChallenges: number; activeChallenges: number;
  pendingSubmissions: number; totalLeaderboard: number;
}

const EMPTY_FORM = {
  id: '', title: '', description: '', category: 'Cryptography',
  difficulty: 'Beginner', correct_flag: '', file_name: '', file_path: '',
  hints: ['', '', ''],
};
const CATEGORIES = ['Cryptography','Programming','Steganography','Forensics','Web','Reverse Engineering','Misc'];
const DIFFICULTIES = ['Beginner','Intermediate','Advanced'];

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Stats>({ totalChallenges:0, activeChallenges:0, pendingSubmissions:0, totalLeaderboard:0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{text:string;ok:boolean}|null>(null);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showFlag, setShowFlag] = useState(false);
  const [processing, setProcessing] = useState<string|null>(null);

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const fetchAll = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setLoading(true);
    try {
      const [cRes, sRes, lRes] = await Promise.all([
        supabase.from('challenges').select('id,title,description,category,difficulty,hints,file_name,file_path,is_active,created_at').order('created_at', { ascending: false }),
        supabase.from('challenge_submissions').select('id,title,description,category,difficulty,status,created_at,hints').order('created_at', { ascending: false }),
        supabase.from('leaderboard').select('id', { count: 'exact', head: true }).not('completed_at','is',null),
      ]);
      const cData = cRes.data || [];
      const sData = sRes.data || [];
      setChallenges(cData);
      setSubmissions(sData);
      setStats({
        totalChallenges: cData.length,
        activeChallenges: cData.filter((c: Challenge) => c.is_active).length,
        pendingSubmissions: sData.filter((s: Submission) => s.status === 'pending').length,
        totalLeaderboard: lRes.count || 0,
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const invoke = async (action: string, body: object) => {
    const { data, error } = await supabase.functions.invoke('admin-challenge', { body: { action, ...body } });
    if (error) throw new Error(error.message);
    if (!data?.success) throw new Error(data?.error || 'Operation failed');
    return data;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const hints = form.hints.filter(h => h.trim());
      await invoke('create', { ...form, hints });
      flash(`Challenge "${form.title}" created!`);
      setForm({ ...EMPTY_FORM });
      fetchAll();
      setTab('challenges');
    } catch (e: any) { flash(e.message, false); }
    finally { setSaving(false); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    try {
      const hints = form.hints.filter(h => h.trim());
      const payload: any = { id: editId, title: form.title, description: form.description, category: form.category, difficulty: form.difficulty, hints, file_name: form.file_name, file_path: form.file_path };
      if (form.correct_flag.trim()) payload.new_flag = form.correct_flag.trim();
      await invoke('update', payload);
      flash('Challenge updated!');
      setEditId(null);
      setForm({ ...EMPTY_FORM });
      fetchAll();
    } catch (e: any) { flash(e.message, false); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete challenge "${title}"? This cannot be undone.`)) return;
    setProcessing(id);
    try {
      await invoke('delete', { id });
      flash(`"${title}" deleted.`);
      fetchAll();
    } catch (e: any) { flash(e.message, false); }
    finally { setProcessing(null); }
  };

  const handleToggle = async (c: Challenge) => {
    setProcessing(c.id);
    try {
      await invoke('toggle_active', { id: c.id, is_active: !c.is_active });
      flash(`"${c.title}" ${!c.is_active ? 'activated' : 'deactivated'}.`);
      fetchAll();
    } catch (e: any) { flash(e.message, false); }
    finally { setProcessing(null); }
  };

  const handleApprove = async (s: Submission) => {
    setProcessing(s.id);
    try {
      const { data, error } = await supabase.functions.invoke('approve-challenge', { body: { submission_id: s.id } });
      if (error || !data?.success) throw new Error(data?.error || error?.message);
      flash(data.message);
      fetchAll();
    } catch (e: any) { flash(e.message, false); }
    finally { setProcessing(null); }
  };

  const handleReject = async (s: Submission) => {
    setProcessing(s.id);
    try {
      const { error } = await supabase.from('challenge_submissions').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', s.id);
      if (error) throw error;
      flash('Submission rejected.');
      fetchAll();
    } catch (e: any) { flash(e.message, false); }
    finally { setProcessing(null); }
  };

  const startEdit = (c: Challenge) => {
    setForm({ id: c.id, title: c.title, description: c.description, category: c.category, difficulty: c.difficulty, correct_flag: '', file_name: c.file_name, file_path: c.file_path, hints: [...c.hints, '', ''].slice(0, 3) });
    setEditId(c.id);
    setTab('add');
  };

  const hintChange = (i: number, v: string) => setForm(f => { const h = [...f.hints]; h[i] = v; return { ...f, hints: h }; });

  const diffColor = (d: string) => d === 'Beginner' ? 'text-green-400 border-green-500' : d === 'Intermediate' ? 'text-yellow-400 border-yellow-500' : 'text-red-400 border-red-500';

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center font-mono">
      <div className="text-green-400 text-center animate-pulse"><Shield className="w-12 h-12 mx-auto mb-3"/><p>Loading admin terminal...</p></div>
    </div>
  );

  const tabBtn = (t: Tab, label: string, Icon: any) => (
    <button onClick={() => { setTab(t); setEditId(null); setForm({ ...EMPTY_FORM }); }}
      className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 ${tab === t ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-transparent text-green-600 hover:text-green-400 hover:bg-green-500/5'}`}>
      <Icon className="w-4 h-4"/>{label}
    </button>
  );

  const inputCls = "w-full bg-black/60 border border-green-500/30 rounded px-3 py-2 text-green-300 placeholder-green-800 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/30 text-sm";
  const labelCls = "block text-green-400 text-xs font-bold mb-1 uppercase tracking-wider";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-green-400 font-mono">
      <div className="scanlines"/>
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-green-500/30 bg-black/40 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black"><GlitchText text="ADMIN" className="text-green-500"/> <span className="text-green-400">TERMINAL</span></h1>
            <p className="text-green-600 text-xs mt-0.5">CyberGauntlet Control Panel</p>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded text-sm transition-all">
            <LogOut className="w-4 h-4"/>LOGOUT
          </button>
        </header>

        {/* Flash message */}
        {msg && (
          <div className={`mx-6 mt-4 p-3 rounded border flex items-center gap-2 text-sm ${msg.ok ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-red-500/10 border-red-500 text-red-400'}`}>
            {msg.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0"/> : <XCircle className="w-4 h-4 flex-shrink-0"/>}
            {msg.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-green-500/20 bg-black/20 px-2">
          {tabBtn('overview', 'Overview', BarChart3)}
          {tabBtn('challenges', 'Challenges', BookOpen)}
          {tabBtn('add', editId ? 'Edit Challenge' : 'Add Challenge', Plus)}
          {tabBtn('submissions', `Submissions${stats.pendingSubmissions > 0 ? ` (${stats.pendingSubmissions})` : ''}`, ClipboardList)}
        </div>

        <div className="p-6 max-w-6xl mx-auto">
          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Challenges', value: stats.totalChallenges, color: 'green' },
                  { label: 'Active', value: stats.activeChallenges, color: 'blue' },
                  { label: 'Pending Review', value: stats.pendingSubmissions, color: 'yellow' },
                  { label: 'Completions', value: stats.totalLeaderboard, color: 'purple' },
                ].map(s => (
                  <div key={s.label} className={`border border-${s.color}-500/50 bg-${s.color}-500/5 p-5 rounded-lg`}>
                    <div className={`text-3xl font-black text-${s.color}-400`}>{s.value}</div>
                    <div className={`text-${s.color}-600 text-xs mt-1 uppercase tracking-wider`}>{s.label}</div>
                  </div>
                ))}
              </div>
              <TerminalBox title="quick_actions.sh">
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => setTab('add')} className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500 text-green-400 px-4 py-2 rounded text-sm transition-all"><Plus className="w-4 h-4"/>New Challenge</button>
                  <button onClick={() => setTab('submissions')} className="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500 text-yellow-400 px-4 py-2 rounded text-sm transition-all"><ClipboardList className="w-4 h-4"/>Review Submissions</button>
                  <button onClick={fetchAll} className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500 text-blue-400 px-4 py-2 rounded text-sm transition-all"><RefreshCw className="w-4 h-4"/>Refresh Data</button>
                </div>
              </TerminalBox>
            </div>
          )}

          {/* CHALLENGES TAB */}
          {tab === 'challenges' && (
            <TerminalBox title="challenges.sh">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-green-400 font-bold">All Challenges ({challenges.length})</h2>
                <button onClick={() => setTab('add')} className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500 text-green-400 px-3 py-1.5 rounded text-sm transition-all"><Plus className="w-3 h-3"/>Add New</button>
              </div>
              {challenges.length === 0 ? (
                <p className="text-green-600 text-center py-8">No challenges yet. Add one!</p>
              ) : (
                <div className="space-y-3">
                  {challenges.map(c => (
                    <div key={c.id} className={`border rounded-lg p-4 transition-all ${c.is_active ? 'border-green-500/30 bg-green-500/5' : 'border-gray-600/30 bg-gray-800/20 opacity-60'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">{c.title}</span>
                            <span className="text-xs text-green-600 font-mono">#{c.id}</span>
                            <span className={`text-xs px-2 py-0.5 border rounded ${diffColor(c.difficulty)}`}>{c.difficulty}</span>
                            <span className="text-xs px-2 py-0.5 border border-blue-500/50 text-blue-400 rounded">{c.category}</span>
                            {!c.is_active && <span className="text-xs px-2 py-0.5 border border-gray-500 text-gray-500 rounded">INACTIVE</span>}
                          </div>
                          <p className="text-green-300/60 text-xs mt-1 truncate">{c.description.slice(0, 120)}…</p>
                          <p className="text-green-600/50 text-xs mt-1">{c.hints.length} hint(s) · {c.file_name || 'no file'}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => handleToggle(c)} disabled={processing === c.id} title={c.is_active ? 'Deactivate' : 'Activate'}
                            className="p-1.5 rounded hover:bg-white/5 transition-colors disabled:opacity-40">
                            {c.is_active ? <ToggleRight className="w-5 h-5 text-green-400"/> : <ToggleLeft className="w-5 h-5 text-gray-500"/>}
                          </button>
                          <button onClick={() => startEdit(c)} className="p-1.5 rounded hover:bg-blue-500/10 text-blue-400 transition-colors" title="Edit">
                            <Edit2 className="w-4 h-4"/>
                          </button>
                          <button onClick={() => handleDelete(c.id, c.title)} disabled={processing === c.id}
                            className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors disabled:opacity-40" title="Delete">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TerminalBox>
          )}

          {/* ADD / EDIT CHALLENGE TAB */}
          {tab === 'add' && (
            <TerminalBox title={editId ? `edit_challenge_${editId}.sh` : 'add_challenge.sh'}>
              <form onSubmit={editId ? handleEditSubmit : handleAddSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {!editId && (
                    <div>
                      <label className={labelCls}>Challenge ID *</label>
                      <input value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value.toLowerCase().replace(/\s+/g,'-') }))}
                        placeholder="e.g. q6" className={inputCls} required pattern="[a-z0-9\-]+" title="Lowercase letters, numbers and hyphens only"/>
                      <p className="text-green-700 text-xs mt-1">Unique slug used as the primary key (e.g. q6)</p>
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Title *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Challenge title" className={inputCls} required/>
                  </div>
                  <div>
                    <label className={labelCls}>Category *</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Difficulty *</label>
                    <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))} className={inputCls}>
                      {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>File Name</label>
                    <input value={form.file_name} onChange={e => setForm(f => ({ ...f, file_name: e.target.value }))} placeholder="e.g. challenge.txt" className={inputCls}/>
                  </div>
                  <div>
                    <label className={labelCls}>File Path</label>
                    <input value={form.file_path} onChange={e => setForm(f => ({ ...f, file_path: e.target.value }))} placeholder="e.g. /challenges/q6/challenge.txt" className={inputCls}/>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Description *</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Full challenge description shown to players…" rows={4} className={inputCls} required/>
                </div>

                <div>
                  <label className={labelCls}>Hints (up to 3)</label>
                  <div className="space-y-2">
                    {form.hints.map((h, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-green-600 text-xs w-6 flex-shrink-0">#{i+1}</span>
                        <input value={h} onChange={e => hintChange(i, e.target.value)} placeholder={`Hint ${i+1} (optional)`} className={inputCls}/>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>{editId ? 'New Correct Flag (leave blank to keep current)' : 'Correct Flag *'}</label>
                  <div className="relative">
                    <input type={showFlag ? 'text' : 'password'} value={form.correct_flag}
                      onChange={e => setForm(f => ({ ...f, correct_flag: e.target.value }))}
                      placeholder="CG{...}" className={`${inputCls} pr-10`} required={!editId}/>
                    <button type="button" onClick={() => setShowFlag(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 hover:text-green-400">
                      {showFlag ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                  <p className="text-green-700 text-xs mt-1">Hashed server-side (SHA-256) — never stored as plaintext in the client</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-black font-bold px-6 py-2.5 rounded-lg transition-all">
                    {saving ? <><RefreshCw className="w-4 h-4 animate-spin"/>Saving...</> : <><CheckCircle className="w-4 h-4"/>{editId ? 'Save Changes' : 'Create Challenge'}</>}
                  </button>
                  {editId && (
                    <button type="button" onClick={() => { setEditId(null); setForm({ ...EMPTY_FORM }); setTab('challenges'); }}
                      className="flex items-center gap-2 bg-gray-600/20 hover:bg-gray-600/40 border border-gray-500 text-gray-400 px-6 py-2.5 rounded-lg transition-all">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </TerminalBox>
          )}

          {/* SUBMISSIONS TAB */}
          {tab === 'submissions' && (
            <TerminalBox title="submissions.sh">
              <h2 className="text-green-400 font-bold mb-4">Challenge Submissions ({submissions.length})</h2>
              {submissions.length === 0 ? (
                <p className="text-green-600 text-center py-8">No submissions yet.</p>
              ) : (
                <div className="space-y-4">
                  {submissions.map(s => (
                    <div key={s.id} className={`border-l-4 rounded-r-lg p-4 ${s.status === 'pending' ? 'border-l-yellow-500 bg-yellow-500/5' : s.status === 'approved' ? 'border-l-blue-500 bg-blue-500/5' : 'border-l-red-500 bg-red-500/5'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="font-bold text-white">{s.title}</span>
                            <span className={`text-xs px-2 py-0.5 border rounded ${diffColor(s.difficulty)}`}>{s.difficulty}</span>
                            <span className="text-xs px-2 py-0.5 border border-green-500/50 text-green-400 rounded">{s.category}</span>
                            <span className={`text-xs px-2 py-0.5 border rounded font-bold ${s.status==='pending'?'border-yellow-500 text-yellow-400':s.status==='approved'?'border-blue-500 text-blue-400':'border-red-500 text-red-400'}`}>{s.status.toUpperCase()}</span>
                          </div>
                          <p className="text-green-300/70 text-sm line-clamp-2">{s.description}</p>
                          {s.hints?.length > 0 && <p className="text-green-600 text-xs mt-1">{s.hints.length} hint(s) included</p>}
                          <p className="text-green-700 text-xs mt-1">{new Date(s.created_at).toLocaleString()}</p>
                        </div>
                        {s.status === 'pending' && (
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <button onClick={() => handleApprove(s)} disabled={processing === s.id}
                              className="flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500 text-blue-400 px-3 py-1.5 rounded text-xs font-bold transition-all disabled:opacity-50">
                              <CheckCircle className="w-3 h-3"/>{processing === s.id ? '...' : 'Approve'}
                            </button>
                            <button onClick={() => handleReject(s)} disabled={processing === s.id}
                              className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500 text-red-400 px-3 py-1.5 rounded text-xs font-bold transition-all disabled:opacity-50">
                              <XCircle className="w-3 h-3"/>{processing === s.id ? '...' : 'Reject'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TerminalBox>
          )}
        </div>
      </div>
    </div>
  );
}
