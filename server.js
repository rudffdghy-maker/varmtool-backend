import express from "express";
import cors from "cors";
import multer from "multer";
import rateLimit from "express-rate-limit";

const app = express();
const port = process.env.PORT || 10000;

const required = ["PAGE_ID", "PAGE_ACCESS_TOKEN", "ADMIN_PASSWORD", "FRONTEND_ORIGIN"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error("Missing environment variables:", missing.join(", "));
  process.exit(1);
}

const graphVersion = process.env.GRAPH_API_VERSION || "v27.0";
const frontendOrigin = process.env.FRONTEND_ORIGIN.replace(/\/$/, "");

app.use(cors({
  origin: frontendOrigin,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "x-admin-password"],
}));
app.use(express.json({ limit: "1mb" }));

const publishLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB MVP limit
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("video/")) {
      return cb(new Error("Please upload a video file."));
    }
    cb(null, true);
  },
});

function requireAdmin(req, res, next) {
  const supplied = req.get("x-admin-password") || "";
  if (supplied.length !== process.env.ADMIN_PASSWORD.length ||
      supplied !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Admin password is incorrect." });
  }
  next();
}

app.get("/", (_req, res) => {
  res.json({ service: "VARMTOOL Backend", status: "running" });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "VARMTOOL Backend" });
});

app.post(
  "/api/publish-video",
  publishLimiter,
  requireAdmin,
  upload.single("video"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Choose a video file first." });
      }

      const caption = String(req.body.caption || "").slice(0, 5000);
      const form = new FormData();
      form.append(
        "source",
        new Blob([req.file.buffer], { type: req.file.mimetype }),
        req.file.originalname || "video.mp4"
      );
      form.append("description", caption);
      form.append("access_token", process.env.PAGE_ACCESS_TOKEN);

      const graphUrl = `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(process.env.PAGE_ID)}/videos`;
      const graphResponse = await fetch(graphUrl, { method: "POST", body: form });
      const result = await graphResponse.json();

      if (!graphResponse.ok || result.error) {
        console.error("Meta Graph API error:", JSON.stringify(result.error || result));
        return res.status(502).json({
          error: result.error?.message || "Facebook rejected the video upload.",
          details: result.error?.type || undefined
        });
      }

      return res.json({
        ok: true,
        message: "Video upload request accepted by Facebook.",
        video_id: result.id
      });
    } catch (error) {
      console.error("Publish error:", error);
      return res.status(500).json({ error: "The server could not publish this video." });
    }
  }
);

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Video is too large. MVP limit is 100 MB." });
  }
  return res.status(400).json({ error: error.message || "Invalid request." });
});

app.listen(port, () => {
  console.log(`VARMTOOL Backend listening on port ${port}`);
});
