import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Profile = {
  id: string;
  user_id: string;
  team_name: string | null;
  leader_name: string | null;
  profile_picture_url: string | null;
  created_at: string;
  updated_at: string;
};

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    team_name: '',
    leader_name: '',
    profile_picture: null as File | null,
  });

  // Challenge submission state
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [submissionData, setSubmissionData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: '',
    correct_flag: '',
    hints: [''],
    assets: [] as File[],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      setError(error.message);
    } else if (data) {
      setProfile(data);
      setFormData({
        team_name: data.team_name || '',
        leader_name: data.leader_name || '',
        profile_picture: null,
      });
    }

    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, profile_picture: file }));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}_${Date.now()}.${fileExt}`;
    const filePath = `profile-pictures/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // Challenge submission handlers
  const handleSubmissionInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSubmissionData(prev => ({ ...prev, [name]: value }));
  };

  const handleHintChange = (index: number, value: string) => {
    const newHints = [...submissionData.hints];
    newHints[index] = value;
    setSubmissionData(prev => ({ ...prev, hints: newHints }));
  };

  const addHint = () => {
    setSubmissionData(prev => ({ ...prev, hints: [...prev.hints, ''] }));
  };

  const removeHint = (index: number) => {
    const newHints = submissionData.hints.filter((_, i) => i !== index);
    setSubmissionData(prev => ({ ...prev, hints: newHints }));
  };

  const handleAssetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSubmissionData(prev => ({ ...prev, assets: files }));
  };

  const uploadAssets = async (files: File[]): Promise<string[]> => {
    const uploadedPaths: string[] = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `challenge_assets/${user!.id}_${Date.now()}_${file.name}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('challenges')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('challenges')
        .getPublicUrl(filePath);

      uploadedPaths.push(data.publicUrl);
    }

    return uploadedPaths;
  };

  const handleSubmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      let assetUrls: string[] = [];

      if (submissionData.assets.length > 0) {
        assetUrls = await uploadAssets(submissionData.assets);
      }

      const submission = {
        submitter_id: profile.id,
        title: submissionData.title,
        description: submissionData.description,
        category: submissionData.category,
        difficulty: submissionData.difficulty,
        correct_flag: submissionData.correct_flag,
        hints: submissionData.hints.filter(hint => hint.trim() !== ''),
        assets: assetUrls,
      };

      const { error } = await supabase
        .from('challenge_submissions')
        .insert(submission);

      if (error) throw error;

      setSuccess('Challenge submitted successfully! It will be reviewed by admins.');
      setSubmissionData({
        title: '',
        description: '',
        category: '',
        difficulty: '',
        correct_flag: '',
        hints: [''],
        assets: [],
      });
      setShowSubmissionForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let profilePictureUrl = profile?.profile_picture_url || null;

      if (formData.profile_picture) {
        profilePictureUrl = await uploadImage(formData.profile_picture);
      }

      const profileData = {
        user_id: user.id,
        team_name: formData.team_name || null,
        leader_name: formData.leader_name || null,
        profile_picture_url: profilePictureUrl,
        updated_at: new Date().toISOString(),
      };

      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', profile.id);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('profiles')
          .insert(profileData);

        if (error) throw error;
      }

      setSuccess('Profile updated successfully!');
      await fetchProfile(); // Refresh data
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-emerald-400 animate-pulse">
        Loading Profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-black to-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-zinc-900/70 backdrop-blur-xl p-6 shadow-[0_0_40px_-10px_rgba(16,185,129,0.4)] mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/10" />
          <div className="relative">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              User Profile
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Customize your cyber identity
            </p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/50 bg-red-900/20 text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 rounded-xl border border-green-500/50 bg-green-900/20 text-green-400">
            {success}
          </div>
        )}

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-xl p-6">
            <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition bg-gradient-to-r from-emerald-500/5 to-cyan-500/5" />

            <div className="relative space-y-6">
              {/* Profile Picture */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Profile Picture
                </label>
                {profile?.profile_picture_url && (
                  <div className="mb-4">
                    <img
                      src={profile.profile_picture_url}
                      alt="Current profile"
                      className="w-24 h-24 rounded-full object-cover border border-zinc-700"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-black hover:file:bg-emerald-400"
                />
              </div>

              {/* Team Name */}
              <div>
                <label htmlFor="team_name" className="block text-sm font-medium text-zinc-300 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  id="team_name"
                  name="team_name"
                  value={formData.team_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800/50 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  placeholder="Enter your team name"
                />
              </div>

              {/* Leader Name */}
              <div>
                <label htmlFor="leader_name" className="block text-sm font-medium text-zinc-300 mb-2">
                  Leader Name
                </label>
                <input
                  type="text"
                  id="leader_name"
                  name="leader_name"
                  value={formData.leader_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800/50 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  placeholder="Enter leader name"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full px-6 py-3 rounded-xl font-semibold text-black bg-gradient-to-r from-emerald-400 to-cyan-400 hover:brightness-110 active:scale-95 transition shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </form>

        {/* Challenge Submission Section */}
        <div className="mt-8">
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-xl p-6">
            <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition bg-gradient-to-r from-emerald-500/5 to-cyan-500/5" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-100">Submit Challenge</h2>
                  <p className="text-zinc-400 text-sm">Contribute to the community challenge pool</p>
                </div>
                <button
                  onClick={() => setShowSubmissionForm(!showSubmissionForm)}
                  className="px-4 py-2 rounded-lg font-semibold text-black bg-gradient-to-r from-emerald-400 to-cyan-400 hover:brightness-110 transition"
                >
                  {showSubmissionForm ? 'Cancel' : 'Submit Challenge'}
                </button>
              </div>

              {showSubmissionForm && (
                <form onSubmit={handleSubmissionSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-zinc-300 mb-2">
                        Challenge Title
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={submissionData.title}
                        onChange={handleSubmissionInputChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800/50 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                        placeholder="Enter challenge title"
                      />
                    </div>

                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-zinc-300 mb-2">
                        Category
                      </label>
                      <select
                        id="category"
                        name="category"
                        value={submissionData.category}
                        onChange={handleSubmissionInputChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800/50 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                      >
                        <option value="">Select category</option>
                        <option value="Cryptography">Cryptography</option>
                        <option value="Programming">Programming</option>
                        <option value="Steganography">Steganography</option>
                        <option value="Web Security">Web Security</option>
                        <option value="Forensics">Forensics</option>
                        <option value="Reverse Engineering">Reverse Engineering</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="difficulty" className="block text-sm font-medium text-zinc-300 mb-2">
                        Difficulty
                      </label>
                      <select
                        id="difficulty"
                        name="difficulty"
                        value={submissionData.difficulty}
                        onChange={handleSubmissionInputChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800/50 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                      >
                        <option value="">Select difficulty</option>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="correct_flag" className="block text-sm font-medium text-zinc-300 mb-2">
                        Correct Flag
                      </label>
                      <input
                        type="text"
                        id="correct_flag"
                        name="correct_flag"
                        value={submissionData.correct_flag}
                        onChange={handleSubmissionInputChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800/50 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                        placeholder="CG{...}"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-2">
                      Challenge Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={submissionData.description}
                      onChange={handleSubmissionInputChange}
                      required
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800/50 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                      placeholder="Describe the challenge scenario and requirements..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Hints
                    </label>
                    {submissionData.hints.map((hint, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={hint}
                          onChange={(e) => handleHintChange(index, e.target.value)}
                          className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                          placeholder={`Hint ${index + 1}`}
                        />
                        {submissionData.hints.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeHint(index)}
                            className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500 text-red-400 rounded-lg transition"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addHint}
                      className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500 text-emerald-400 rounded-lg transition"
                    >
                      Add Hint
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Challenge Assets (optional)
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="*/*"
                      onChange={handleAssetChange}
                      className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-black hover:file:bg-emerald-400"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Upload any files needed for the challenge (images, binaries, etc.)
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-6 py-3 rounded-xl font-semibold text-black bg-gradient-to-r from-emerald-400 to-cyan-400 hover:brightness-110 active:scale-95 transition shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit Challenge'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
