import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { google } from "googleapis";
import { Octokit } from "@octokit/rest";
import { GoogleGenAI } from "@google/genai";
import * as admin from "firebase-admin";
import multer from "multer";
import { Readable } from "stream";
import axios from "axios";
import fs from "fs";

// Initialize Data Storage
const DATA_DIR = path.join(process.cwd(), "data");
const JOBS_FILE = path.join(DATA_DIR, "jobs.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

if (!fs.existsSync(JOBS_FILE)) {
  fs.writeFileSync(JOBS_FILE, JSON.stringify([]));
}

// Helper to read/write local jobs
const getLocalJobs = () => {
  try {
    const data = fs.readFileSync(JOBS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

const saveLocalJobs = (jobs: any[]) => {
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
};

// Initialize Firebase Admin (Optional, usually uses standard Firebase in this env)
// But for backend logic, admin is better if service account is available.
// If not, we'll use the environment provided config.

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cors());
  app.use(cookieParser());

  // Security headers with adjustment for iframe preview
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // AI Service
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  // API Routes
  app.get("/api/health", async (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      pythonBackend: "disabled"
    });
  });

  app.get("/api/extractions", (req, res) => {
    const EXTRACTIONS_ROOT = path.join(DATA_DIR);
    if (!fs.existsSync(EXTRACTIONS_ROOT)) {
      return res.json([]);
    }
    
    const getAllFiles = (dirPath: string, arrayOfFiles: string[] = []) => {
      const files = fs.readdirSync(dirPath);
      files.forEach((file) => {
        if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
          arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
        } else if (file.endsWith('.json')) {
          const relativePath = path.relative(DATA_DIR, path.join(dirPath, file));
          arrayOfFiles.push(relativePath);
        }
      });
      return arrayOfFiles;
    };

    const allJsonFiles = getAllFiles(EXTRACTIONS_ROOT);
    res.json(allJsonFiles);
  });

  app.get("/api/extractions-content", (req, res) => {
    const relativePath = req.query.path as string;
    if (!relativePath) return res.status(400).json({ error: "Missing path" });
    
    // Security check: ensure path is within DATA_DIR
    const filePath = path.join(DATA_DIR, relativePath);
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(DATA_DIR))) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    
    const content = fs.readFileSync(filePath, "utf-8");
    res.json(JSON.parse(content));
  });

  app.get("/api/jobs", (req, res) => {
    const userId = req.query.userId as string;
    const jobs = getLocalJobs();
    if (userId) {
      return res.json(jobs.filter((j: any) => j.userId === userId));
    }
    res.json(jobs);
  });

  app.get("/api/jobs/:id", (req, res) => {
    const jobs = getLocalJobs();
    const job = jobs.find((j: any) => j.id === req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  });

  app.post("/api/jobs", (req, res) => {
    const jobs = getLocalJobs();
    const newJob = {
      ...req.body,
      id: "job-" + Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "pending",
    };
    jobs.push(newJob);
    saveLocalJobs(jobs);
    res.json(newJob);
  });

  app.patch("/api/jobs/:id", (req, res) => {
    const jobs = getLocalJobs();
    const idx = jobs.findIndex((j: any) => j.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Job not found" });

    jobs[idx] = {
      ...jobs[idx],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    saveLocalJobs(jobs);
    res.json(jobs[idx]);
  });

  app.delete("/api/jobs/:id", (req, res) => {
    let jobs = getLocalJobs();
    const exists = jobs.some((j: any) => j.id === req.params.id);
    if (!exists) return res.status(404).json({ error: "Job not found" });

    jobs = jobs.filter((j: any) => j.id !== req.params.id);
    saveLocalJobs(jobs);
    res.json({ success: true });
  });

  const upload = multer({ storage: multer.memoryStorage() });

  app.post(
    "/api/extract-structured",
    upload.single("file"),
    async (req, res) => {
      if (!req.file) return res.status(400).json({ error: "Missing file" });

      try {
        const saveExtractedLocally = (data: any, originalName: string, subfolder?: string, customName?: string) => {
          const folder = subfolder || "extractions";
          const EXTRACTIONS_DIR = path.join(DATA_DIR, folder);
          if (!fs.existsSync(EXTRACTIONS_DIR)) {
            fs.mkdirSync(EXTRACTIONS_DIR, { recursive: true });
          }
          const timestamp = Date.now();
          let finalName = "";
          if (customName) {
            finalName = customName.toLowerCase().endsWith('.json') ? customName : `${customName}.json`;
            finalName = finalName.replace(/[^a-z0-9._\-]/gi, '_');
          } else {
            const safeName = originalName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            finalName = `${safeName}-${timestamp}.json`;
          }
          
          const extractionPath = path.join(EXTRACTIONS_DIR, finalName);
          fs.writeFileSync(extractionPath, JSON.stringify(data, null, 2));
          console.log(`Saved structured extraction to ${extractionPath}`);
          return path.join(folder, finalName); // Return relative path
        };

        console.log("Using JS mammoth extraction (Python unavailable in this environment)...");
        const mammoth = await import("mammoth");
        const cheerio = await import("cheerio");
        const mammothLib = (mammoth as any).default || mammoth;
        
        const result = await mammothLib.convertToHtml({ buffer: req.file.buffer });
        const html = result.value;
        const $ = cheerio.load(html);
        
        const elements: any[] = [];
        
        $('body').children().each((i, el) => {
          const tagName = (el as any).tagName.toLowerCase();
          const text = $(el).text().trim();
          
          if (!text) return;
          
          let type = "paragraph";
          if (tagName === "h1") type = "h1";
          else if (tagName === "h2") type = "h2";
          else if (tagName === "h3") type = "h3";
          else if (tagName === "h4" || tagName === "h5" || tagName === "h6") type = "h4";
          else if (tagName === "ul" || tagName === "ol") {
            $(el).find('li').each((_, li) => {
              const liText = $(li).text().trim();
              if (liText) elements.push({ type: "bullet", content: liText });
            });
            return;
          }
          
          elements.push({ type, content: text });
        });
        
        const extractedData = {
            title: req.file.originalname.replace(".docx", ""),
            elements: elements
        };
        
        const subfolder = req.body.subfolder;
        const customFilename = req.body.customFilename;
        const localPath = saveExtractedLocally(extractedData, req.file.originalname, subfolder, customFilename);

        res.json({
            ...extractedData,
            localPath
        });
      } catch (error: any) {
        console.error("Extraction Error:", error.message);
        res.status(500).json({ error: "Extraction failed." });
      }
    },
  );

  function simpleHtmlToAsciiDoc(html: string): string {
    if (!html) return "";

    let adoc = html;

    // Headings
    adoc = adoc.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n= $1\n");
    adoc = adoc.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n== $1\n");
    adoc = adoc.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n=== $1\n");
    adoc = adoc.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n==== $1\n");

    // Bold/Italic
    adoc = adoc.replace(/<(b|strong)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");
    adoc = adoc.replace(/<(i|em)[^>]*>([\s\S]*?)<\/\1>/gi, "_$2_");

    // Lists
    adoc = adoc.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "* $1\n");
    adoc = adoc.replace(/<ul[^>]*>/gi, "\n");
    adoc = adoc.replace(/<\/ul>/gi, "\n");

    // Paragraphs
    adoc = adoc.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n");

    // Links
    adoc = adoc.replace(
      /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
      "link:$1[$2]",
    );

    // Br
    adoc = adoc.replace(/<br\s*\/?>/gi, " +\n");

    // Clean up entities
    adoc = adoc.replace(/&nbsp;/g, " ");
    adoc = adoc.replace(/&amp;/g, "&");
    adoc = adoc.replace(/&lt;/g, "<");
    adoc = adoc.replace(/&gt;/g, ">");

    // Remove remaining tags
    adoc = adoc.replace(/<[^>]*>/g, "");

    // Trim whitespace
    adoc = adoc.replace(/\n\s*\n\s*\n/g, "\n\n");

    return adoc.trim();
  }

  app.post("/api/upload", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Missing file" });

    try {
      console.log(
        `Processing local upload: ${req.file.originalname}, size: ${req.file.size}, mime: ${req.file.mimetype}`,
      );

      let content = "";
      const mimeType = req.file.mimetype;

      const mammoth = await import("mammoth");
      const mammothLib = mammoth.default || mammoth;

      if (
        mimeType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        req.file.originalname.endsWith(".docx")
      ) {
        // Use HTML for better formatting preservation during conversion
        const result = await mammothLib.convertToHtml({
          buffer: req.file.buffer,
        });
        content = result.value; // This is HTML
      } else {
        // Fallback for text files
        content = req.file.buffer.toString("utf-8");
      }

      const docId = "local-" + Date.now();
      console.log("Local extraction success, docId:", docId);

      res.json({
        docId,
        title: req.file.originalname,
        content: content,
      });
    } catch (error: any) {
      console.error("Upload Error Detailed:", error);
      res
        .status(500)
        .json({
          error: error.message || "Internal Server Error during upload",
        });
    }
  });

  // --- Pipeline Endpoints ---

  app.post("/api/transform", async (req, res) => {
    const { docId, accessToken, manualContent, metadata } = req.body;

    try {
      let contentToTransform = manualContent;
      let title = "Document";

      // NON-AI LOGIC: Programmatic transformation
      let adoc = "";

      // If we have strict structured metadata from the UI!
      if (metadata && Array.isArray(metadata)) {
        console.log("Using structured metadata for AsciiDoc conversion...");
        const blocks = metadata.map(el => {
          if (el.type === 'h1') return `= ${el.content}`;
          if (el.type === 'h2') return `== ${el.content}`;
          if (el.type === 'h3') return `=== ${el.content}`;
          if (el.type === 'h4') return `==== ${el.content}`;
          if (el.type === 'bullet') return `* ${el.content}`;
          return el.content;
        });
        adoc = blocks.filter(Boolean).join('\n\n');
        // Extract title from the first h1 if it exists
        const firstH1 = metadata.find(m => m.type === 'h1');
        if (firstH1) {
          title = firstH1.content;
        }
      } else {
        if (!contentToTransform) {
          if (
            accessToken &&
            accessToken !== "undefined" &&
            accessToken !== "null" &&
            docId &&
            !docId.startsWith("local-")
          ) {
            // If we have a Google Doc ID and Token, try to get HTML export (better for programmatic conversion)
            try {
              const exportUrl = `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=text/html`;
              const response = await axios.get(exportUrl, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              contentToTransform = response.data;
            } catch (e) {
              // Fallback to docs API if export fails
              const auth = new google.auth.OAuth2();
              auth.setCredentials({ access_token: accessToken });
              const docs = google.docs({ version: "v1", auth });
              const response = await docs.documents.get({ documentId: docId });
              contentToTransform =
                `<h1>${response.data.title}</h1>\n` +
                JSON.stringify(response.data.body);
              title = response.data.title || title;
            }
          } else if (docId && !docId.startsWith("local-")) {
            // Attempt to fetch public export if no token and not local
            try {
              const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html`;
              const response = await axios.get(exportUrl);
              contentToTransform = response.data;
            } catch (e) {
              throw new Error(
                "Unable to fetch document. It might be private. Please log in with Google.",
              );
            }
          }
        }

        if (!contentToTransform) {
          throw new Error(
            "No content available to transform. Please provide a valid document.",
          );
        }

        if (
          contentToTransform.includes("<") &&
          contentToTransform.includes(">")
        ) {
          // It's likely HTML
          adoc = simpleHtmlToAsciiDoc(contentToTransform);
        } else {
          // It's likely plain text
          adoc = contentToTransform;
          // Basic wrapping
          if (!adoc.startsWith("=")) {
            adoc = `= ${title}\n\n${adoc}`;
          }
        }
      }

      res.json({ adoc, title });
    } catch (error: any) {
      console.error("Transformation Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sync", async (req, res) => {
    const {
      githubToken,
      repo,
      branch,
      path: filePath,
      content,
      message,
    } = req.body;

    try {
      const octokit = new Octokit({ auth: githubToken });
      const [owner, repoName] = repo.split("/");

      // Get current file SHA if exists to update
      let sha: string | undefined;
      try {
        const { data } = await octokit.repos.getContent({
          owner,
          repo: repoName,
          path: filePath,
          ref: branch,
        });
        if (!Array.isArray(data)) sha = data.sha;
      } catch (e) {
        // File doesn't exist, that's fine
      }

      const syncResult = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path: filePath,
        message: message || "docs: update from SUSE DocEngine",
        content: Buffer.from(content).toString("base64"),
        branch,
        sha,
      });

      res.json({ success: true, url: syncResult.data.commit.html_url });
    } catch (error: any) {
      console.error("GitHub Sync Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Auth Configuration Endpoints (Simulated for this env) ---
  // In a real prod app, these would handle the full OAuth flow.
  // For the AI Studio preview, we'll rely on client-side popups.

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SUSE DocEngine Server running on http://localhost:${PORT}`);
  });
}

startServer();
