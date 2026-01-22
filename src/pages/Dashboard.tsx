
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';


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

  /*
    Fetch posts (RLS will auto-filter by user)
   */
  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        setError(error.message);
      } else {
        setPosts(data ?? []);
      }

      setLoading(false);
    };

    fetchPosts();
  }, []);

  /*
    Insert test post (RLS insert check)
   */
  const addPost = async () => {
    if (!user) return;

    const { error } = await supabase.from('posts').insert({
      title: 'Test Post',
      content: 'Supabase RLS is working',
      user_id: user.id,
    });

    if (error) {
      alert(error.message);
    } else {
      
      const { data } = await supabase.from('posts').select('*');
      setPosts(data ?? []);
    }
  };

  /*
    Logout
   */
  const logout = async () => {
    await supabase.auth.signOut();
  };

  

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard</h1>

      <p>
        Logged in as: <b>{user?.email}</b>
      </p>

      <button onClick={addPost}>Add Test Post</button>
      <button onClick={logout} style={{ marginLeft: 10 }}>
        Logout
      </button>

      <hr />

      <h3>Your Posts</h3>

      {posts.length === 0 && <p>No posts yet</p>}

      {posts.map((post) => (
        <div
          key={post.id}
          style={{
            border: '1px solid #ccc',
            padding: 10,
            marginBottom: 10,
          }}
        >
          <h4>{post.title}</h4>
          <p>{post.content}</p>
          <small>{new Date(post.created_at).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
}