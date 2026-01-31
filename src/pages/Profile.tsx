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
      </div>
    </div>
  );
}
