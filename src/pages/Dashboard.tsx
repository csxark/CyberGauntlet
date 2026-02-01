import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type Post = {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  created_at: string;
};

export default function Dashboard() {
  const { user } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) setError(error.message);
      else setPosts(data ?? []);

      setLoading(false);
    };

    fetchPosts();
  }, []);

  const addPost = async () => {
    if (!user) return;

    const { error } = await supabase.from("posts").insert({
      title: "Neon Test Post",
      content: "Supabase RLS + Cyber UI ⚡",
      user_id: user.id,
    });

    if (error) return alert(error.message);

    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    setPosts(data ?? []);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-emerald-400 animate-pulse">
        Initializing Cyber Grid…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-black to-black text-white p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-10">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-zinc-900/70 backdrop-blur-xl p-6 shadow-[0_0_40px_-10px_rgba(16,185,129,0.4)]">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/10" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Cyber Dashboard
              </h1>
              <p className="text-zinc-400 text-sm mt-1">
                Authenticated as{" "}
                <span className="text-emerald-400">{user?.email}</span>
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                to="/profile"
                className="px-5 py-2 rounded-xl font-semibold text-black bg-gradient-to-r from-cyan-400 to-blue-400 hover:brightness-110 active:scale-95 transition shadow-lg shadow-cyan-500/30"
              >
                Profile
              </Link>
              <button
                onClick={addPost}
                className="px-5 py-2 rounded-xl font-semibold text-black bg-gradient-to-r from-emerald-400 to-cyan-400 hover:brightness-110 active:scale-95 transition shadow-lg shadow-emerald-500/30"
              >
                + New Post
              </button>
              <button
                onClick={logout}
                className="px-5 py-2 rounded-xl border border-zinc-700 hover:border-red-500/50 hover:text-red-400 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="max-w-6xl mx-auto grid gap-6">
        {posts.length === 0 && (
          <div className="border border-dashed border-zinc-700 rounded-2xl p-10 text-center text-zinc-400 bg-zinc-900/40">
            No posts found in this sector 🛸
          </div>
        )}

        {posts.map((post) => (
          <div
            key={post.id}
            className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-xl p-6 transition hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-[0_0_30px_-8px_rgba(16,185,129,0.4)]"
          >
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition bg-gradient-to-r from-emerald-500/5 to-cyan-500/5" />

            <div className="relative">
              <h3 className="text-2xl font-bold mb-2">
                {post.title ?? "Untitled Node"}
              </h3>
              <p className="text-zinc-300 mb-4 leading-relaxed">
                {post.content}
              </p>
              <span className="text-xs text-zinc-500">
                ⏱ {new Date(post.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
