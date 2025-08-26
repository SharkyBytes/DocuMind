import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Queue } from 'bullmq';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const queue = new Queue('file-upload-queue', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || '6379',
  },
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

const app = express();
app.use(cors());



app.get('/', (req, res) => {
  return res.json({ status: 'All Good!' });
});

app.post('/upload/pdf', upload.single('pdf'), async (req, res) => {
  await queue.add(
    'file-ready',
    JSON.stringify({
      filename: req.file.originalname,
      destination: req.file.destination,
      path: req.file.path,
    })
  );
  return res.json({ message: 'uploaded' });
});

app.get('/chat', async (req, res) => {
  const userQuery = req.query.message;

  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: "embedding-001",
  });
  
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      collectionName: 'langchainjs-testing',
    }
  );
  
  const ret = vectorStore.asRetriever({
    k: 2,
  });
  
  const result = await ret.invoke(userQuery);

  // Get Gemini model
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

  // Create system prompt with context
  const contextStr = result.map(doc => doc.pageContent).join("\n\n");
  const prompt = `
  You are a helpful AI Assistant who answers the user query based on the available context from PDF File.
  
  Context:
  ${contextStr}
  
  User Query: ${userQuery}
  `;

  // Generate response
  const geminiResponse = await model.generateContent(prompt);
  const responseText = geminiResponse.response.text();

  return res.json({
    message: responseText,
    docs: result,
  });
});

app.listen(8000, () => console.log(`Server started on PORT:${8000}`));
