
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();

const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// DELETE /api/delete-clip/:id
app.delete("/api/delete-clip/:id", async (req, res) => {
  const { id } = req.params;
  console.log("🔍 Received request to delete clip with ID:", id);

  const { data: clip, error: fetchError } = await supabase
    .from("clips")
    .select("video_url")
    .eq("id", id)
    .single();

  if (fetchError || !clip) {
    console.error("❌ Clip not found or fetch error:", fetchError?.message);
    return res.status(404).json({ error: "Clip not found in database." });
  }

  const urlParts = clip.video_url.split("/");
  const filename = urlParts[urlParts.length - 1];

  console.log("🎯 Extracted filename to delete:", filename);

  const { error: storageError } = await supabase
    .storage
    .from("clips")
    .remove([filename]);

  if (storageError) {
    console.error("❌ Failed to delete video from storage:", storageError.message);
    return res.status(500).json({ error: "Failed to delete video from storage." });
  }

  const { error: deleteError } = await supabase
    .from("clips")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("❌ Failed to delete record from database:", deleteError.message);
    return res.status(500).json({ error: "Failed to delete clip from database." });
  }

  console.log("✅ Clip deleted successfully:", id);
  res.json({ message: "Clip deleted successfully." });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
