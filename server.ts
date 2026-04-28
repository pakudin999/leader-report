import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import * as xlsx from "xlsx";
import mammoth from "mammoth";

const app = express();

const PORT = 3000;

// Setup multer for in-memory file handling
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.json());

// API routes FIRST
app.post("/api/process", upload.single("fail"), async (req, res) => {
  try {
    const pesanan = req.body.pesanan || "";
    const file = req.file;

    let fileInfo = "Tiada fail dilampirkan.";
    let fileContent = "";
    if (file) {
      fileInfo = `Fail dilampirkan: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`;
      
      try {
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
          const workbook = xlsx.read(file.buffer, { type: 'buffer' });
          let sheetData = "";
          workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            sheetData += `\n--- Sheet: ${sheetName} ---\n`;
            sheetData += xlsx.utils.sheet_to_csv(sheet);
          });
          fileContent = sheetData;
        } else if (ext === 'docx') {
          const result = await mammoth.extractRawText({ buffer: file.buffer });
          fileContent = result.value;
        } else if (ext === 'txt') {
          fileContent = file.buffer.toString('utf-8');
        } else {
          fileContent = "[Format fail ini tidak disokong secara automatik. Sila upload excel, docx, txt, atau csv]";
        }
      } catch (parseError) {
        console.error("Error parsing file:", parseError);
        fileContent = "[Gagal membaca isi kandungan fail]";
      }
    }

    if (fileContent.length > 50000) {
      fileContent = fileContent.substring(0, 50000) + "... [TEKS DIPOTONG]";
    }

    const appsScriptUrl = "https://script.google.com/macros/s/AKfycbw_wJvpUfzEQq3aMS_JBS8WKla9wfDvJmDtho6Rvgl3BVu7r5r1Z77m7MI6tGSVnrYX/exec";
    
    // 1. Dapatkan Config (API Key) dan Telegram Credentials dari Apps Script
    const configResponse = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_config" })
    });
    const configResult = await configResponse.json();
    
    if (configResult.status !== "success") {
      return res.status(500).json({ status: "error", message: "Gagal menyambung ke pangkalan data Google Sheet." });
    }

    const apiKey = configResult.api_key;
    const teleToken = configResult.tele_token;
    const teleChatId = configResult.tele_chat_id;

    // 2. Local AI Generation di Node (Mencegah Google Apps Script Bandwidth Limit)
    let aiSummary = "Tiada pesanan.";
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Anda assistant profesional Sir Zulatika. Leader Sale memberi laporan/pesanan: "${pesanan}". 
Info fail dilampirkan: ${fileInfo}.
Sekiranya ada gabungan data dari fail, ini isinya:
${fileContent}

Tolong kaji dan analisis isi data fail (jika ada) dan gabungkan dengan pesanan Leader Sale. 
Hasilkan ringkasan laporan yang sangat kemas, berstruktur profesional dan padat untuk Sir Zulatika.

FORMAT WAJIB HASILKAN (Gunakan bullet point):
1. 📌 RINGKASAN UTAMA: (Rumusan keseluruhan).
2. ✅ KELEBIHAN / PENCAPAIAN: (Apa yang positif/baik dari laporan ini).
3. 📉 KEKURANGAN / ISU BERBANGKIT: (Apa yang kurang memuaskan/kelemahan).
4. 🛠 MASALAH & CADANGAN SOLUSI: (Jika ada masalah yang dikesan, berikan cadangan penyelesaian yang praktikal).`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      aiSummary = aiResponse.text || pesanan;
    } catch (aiError: any) {
      console.error("AI Generation Error:", aiError.message);
      aiSummary = `⚠️ System fallback ringkasan:\n\nLaporan: ${pesanan}\nStatus Fail: ${fileInfo}\n\n(AI gagal diproses. Sila semak API Key dalam Google Sheet.)`;
    }

    // 3. Local Telegram Send di Node
    let teleStatusText = "❌ Gagal Hantar";
    try {
      const teleUrl = `https://api.telegram.org/bot${teleToken}/sendMessage`;
      let safeSummary = aiSummary.replace(/\*\*/g, '*'); // Standardize bold for Telegram
      
      let teleResponse = await fetch(teleUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: teleChatId,
          text: safeSummary,
          parse_mode: "Markdown"
        })
      });

      // Jika ada ralat 'can't parse entities' dari Telegram, hantar sbg raw text
      if (!teleResponse.ok && teleResponse.status === 400) {
        teleResponse = await fetch(teleUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: teleChatId,
            text: aiSummary
          })
        });
      }

      if (teleResponse.ok) {
        teleStatusText = "✅ Berjaya Dihantar";
      } else {
        console.error("Telegram error:", await teleResponse.text());
      }
    } catch (tError) {
      console.error("Failed to send telegram from node:", tError);
    }

    // 4. Save to Google Sheet History
    let savedToSheet = false;
    try {
      const saveResponse = await fetch(appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_history",
          pesanan: pesanan || "Tiada pesanan",
          statusFail: fileInfo,
          aiSummary: aiSummary,
          teleStatus: teleStatusText
        })
      });
      if (saveResponse.ok) savedToSheet = true;
    } catch (sError) {
      console.error("Failed to save history:", sError);
    }

    res.json({ 
      status: "success", 
      summary: aiSummary, 
      message: `Berjaya diproses! Telegram: ${teleStatusText}. ${savedToSheet ? "Direkod ke Sheet!" : "(Gagal rekod Sheet)"}` 
    });
  } catch (error: any) {
    console.error("Error analyzing report:", error);
    res.status(500).json({ status: "error", message: error.message || "An unexpected error occurred." });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const path = await import("path");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
