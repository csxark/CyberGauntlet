const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Optional: simple connection test
const testSupabaseConnection = async () => {
  const { data, error } = await supabase.from("_dummy_").select("*").limit(1);
  if (error) {
    console.log("Supabase connected (client initialized)");
  } else {
    console.log("Supabase connected");
  }
};

module.exports = {
  supabase,
  testSupabaseConnection
};
