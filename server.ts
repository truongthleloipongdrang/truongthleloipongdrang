import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI if key is present
const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Endpoint for generating teacher/staff descriptions
app.post('/api/generate-description', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Thiếu prompt yêu cầu' });
      return;
    }

    if (!ai) {
      res.status(503).json({
        error: 'Chưa cấu hình GEMINI_API_KEY trên server',
        fallback: true,
      });
      return;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'Bạn là chuyên gia cố vấn truyền thông giáo dục cho trường Tiểu học Lê Lợi, Đắk Lắk. Hãy viết văn phong chuẩn mực sư phạm, tự hào, ấm áp.',
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error: unknown) {
    console.error('Lỗi Gemini API:', error);
    const msg = error instanceof Error ? error.message : 'Lỗi xử lý AI';
    res.status(500).json({ error: msg });
  }
});

// Endpoint for general educational content assistant
app.post('/api/assistant', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) {
      res.status(400).json({ error: 'Nội dung tin nhắn không hợp lệ' });
      return;
    }

    if (!ai) {
      res.status(503).json({
        error: 'Chưa cấu hình GEMINI_API_KEY trên server',
      });
      return;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: message,
    });

    res.json({ reply: response.text });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Lỗi xử lý';
    res.status(500).json({ error: errorMsg });
  }
});

// API read site content
app.get('/api/content', (_req: Request, res: Response) => {
  const contentPath = path.resolve(__dirname, 'public/site-content.json');
  if (fs.existsSync(contentPath)) {
    try {
      const data = fs.readFileSync(contentPath, 'utf-8');
      res.json(JSON.parse(data));
      return;
    } catch {
      // fallback
    }
  }
  res.json({ status: 'ok' });
});

// API health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    school: 'Trường Tiểu Học Lê Lợi - Pơng Drang',
    hasGeminiKey: Boolean(geminiApiKey),
    time: new Date().toISOString(),
  });
});

async function startServer() {
  if (!isProduction) {
    // Development mode: integrate Vite dev server
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve built assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    // Serve both at root and with repo base path
    app.use('/truongthleloipongdrang', express.static(distPath));
    app.use(express.static(distPath));

    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server Trường Tiểu Học Lê Lợi đang chạy trên cổng ${PORT}`);
  });
}

startServer();
