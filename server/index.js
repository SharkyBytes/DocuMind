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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.get('/', (req, res) => {
  return res.json({ status: 'All Good!' });
});

app.post('/upload/pdf', upload.single('pdf'), async (req, res) => {
  try {
    const userId = req.body.userId; // Get userId from request body
    
    console.log('Upload request received:', {
      userId,
      filename: req.file?.originalname,
      size: req.file?.size
    });
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    await queue.add(
      'file-ready',
      JSON.stringify({
        filename: req.file.originalname,
        destination: req.file.destination,
        path: req.file.path,
        userId: userId, // Include userId in the job data
      })
    );
    
    console.log(`File upload job queued for user ${userId}`);
    return res.json({ message: 'uploaded', userId: userId });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

app.get('/chat', async (req, res) => {
  try {
    const userQuery = req.query.message;
    const userId = req.query.userId; // Get userId from query parameters
    
    console.log('Chat request received:', {
      userId,
      query: userQuery?.substring(0, 100) + (userQuery?.length > 100 ? '...' : '')
    });
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!userQuery) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY,
      modelName: "embedding-001",
    });
    
    // Create user-specific collection name
    const collectionName = `user_${userId}_documents`;
    console.log(`Searching in collection: ${collectionName}`);
    
    try {
      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
          url: process.env.QDRANT_URL || 'http://localhost:6333',
          collectionName: collectionName,
        }
      );
      
      const ret = vectorStore.asRetriever({
        k: 2,
      });
      
      const result = await ret.invoke(userQuery);
      console.log(`Found ${result.length} relevant documents for user ${userId}`);

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
    } catch (error) {
      console.error('Error in chat endpoint:', error);
      
      // If collection doesn't exist (user hasn't uploaded any documents)
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        console.log(`Collection ${collectionName} not found - user hasn't uploaded documents yet`);
        return res.json({
          message: "I don't have any documents to reference. Please upload some PDF documents first so I can help answer your questions about them.",
          docs: [],
        });
      }
      
      throw error; // Re-throw other errors to be caught by outer try-catch
    }
  } catch (error) {
    console.error('Chat endpoint error:', error);
    return res.status(500).json({ 
      error: 'Failed to process your query. Please try again.',
      details: error.message 
    });
  }
});

app.listen(8000, () => console.log(`Server started on PORT:${8000}`));
