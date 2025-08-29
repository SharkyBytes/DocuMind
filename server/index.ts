import express, { Request, Response, Application } from 'express';
import cors from 'cors';
import multer from 'multer';
import { Queue } from 'bullmq';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
import { storage as cloudinaryStorage } from './config/cloudinary.js';

// Load environment variables
dotenv.config();

// Type definitions
interface FileUploadJob {
  filename: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  userId: string;
  jobId: string;
}

interface ProgressData {
  userId: string;
  progress: number;
  message: string;
}

// Ensure required environment variables
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('Upstash Redis environment variables are required');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Create Upstash Redis connection for BullMQ
// Parse the Upstash Redis URL to get connection details
const upstashUrl = new URL(process.env.UPSTASH_REDIS_REST_URL);
const redisConnection = {
  host: upstashUrl.hostname,
  port: 6379, // Upstash Redis uses port 6379 for the Redis protocol
  password: process.env.UPSTASH_REDIS_REST_TOKEN,
  tls: {
    rejectUnauthorized: false // For development - in production consider proper certificate handling
  },
};

const queue = new Queue('file-upload-queue', {
  connection: redisConnection,
});

// Use Cloudinary storage instead of local storage
const upload = multer({ 
  storage: cloudinaryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Accept only PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'));
    }
  }
});

const app: Application = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ["https://docu-mind-rho.vercel.app", "https://docu-mind-rho.vercel.app/"] 
      : ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ["https://docu-mind-rho.vercel.app", "https://docu-mind-rho.vercel.app/"] 
    : ["http://localhost:3000", "http://localhost:3001"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Handle joining user-specific room for progress updates
  socket.on('join', (userId: string) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their progress room`);
  });
  
  // Handle progress updates from worker
  socket.on('progress', (data: ProgressData) => {
    // Forward progress to the specific user
    io.to(`user_${data.userId}`).emit('uploadProgress', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('/', (req: Request, res: Response) => {
  return res.json({ status: 'All Good!' });
});

app.post('/upload/pdf', upload.single('pdf'), async (req: Request, res: Response) => {
  try {
    const userId = req.body.userId as string; // Get userId from request body
    
    console.log('Full request body:', req.body);
    console.log('Multer file info:', req.file);
    console.log('Upload request received:', {
      userId,
      filename: req.file?.originalname,
      size: req.file?.size,
      cloudinaryUrl: req.file?.path // Cloudinary URL
    });
    
    if (!userId) {
      console.log('Error: User ID not found in request body:', req.body);
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Create a unique job ID for tracking
    const jobId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const jobData: FileUploadJob = {
      filename: req.file.originalname,
      cloudinaryUrl: req.file.path, // Cloudinary URL instead of local path
      cloudinaryPublicId: req.file.filename, // Cloudinary public ID for file management
      userId: userId,
      jobId: jobId, // Include job ID for tracking
    };
    
    const job = await queue.add(
      'file-ready',
      JSON.stringify(jobData),
      {
        jobId: jobId, // Set the job ID in BullMQ
      }
    );
    
    console.log(`File upload job queued for user ${userId} with job ID: ${jobId}`);
    return res.json({ 
      message: 'upload started', 
      userId: userId,
      jobId: jobId, // Return job ID to client for tracking
      fileUrl: req.file.path, // Return Cloudinary URL for direct access
      cloudinaryUrl: req.file.path, // Explicit Cloudinary URL
      filename: req.file.originalname
    });
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Upload failed', details: errorMessage });
  }
});

app.get('/chat', async (req: Request, res: Response) => {
  try {
    const userQuery = req.query.message as string;
    const userId = req.query.userId as string; // Get userId from query parameters
    
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
      apiKey: process.env.GEMINI_API_KEY!,
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
          apiKey: process.env.QDRANT_API_KEY,
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      error: 'Failed to process your query. Please try again.',
      details: errorMessage 
    });
  }
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server started on PORT:${PORT}`));
