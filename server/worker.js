import { Worker } from 'bullmq';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { Document } from '@langchain/core/documents';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { CharacterTextSplitter } from '@langchain/textsplitters';
import { PDFExtract } from 'pdf.js-extract';
import { io as ioClient } from 'socket.io-client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Create Socket.IO client connection to send progress updates
const socket = ioClient('http://localhost:8000');

// Helper function to emit progress updates
function emitProgress(userId, jobId, progress, status, message, details = null) {
  const progressData = {
    userId,
    jobId,
    progress,
    status,
    message,
    details // Additional details like current document, batch info, etc.
  };
  
  socket.emit('progress', progressData);
  console.log(`Progress for ${userId} (${jobId}): ${progress}% - ${message}`);
}

// Load environment variables
dotenv.config();

/**
 * Clean and normalize text for embedding
 * @param {string} text The input text to clean
 * @returns {string} Cleaned text
 */
function cleanTextForEmbedding(text) {
  if (!text) return '';
  
  // Preserve URLs instead of replacing them with [URL]
  // Only clean non-alphanumeric characters except those needed for URLs and basic punctuation
  text = text.replace(/[^\w\s.,?!;:()\[\]{}'""-:\/\.@&=\?%+#]/g, ' ');
  
  // Remove extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  const MAX_LENGTH = 2048;
  if (text.length > MAX_LENGTH) {
    text = text.substring(0, MAX_LENGTH);
  }
  
  return text;
}

/**
 * Extracts text from PDF using pdf.js-extract for better URL preservation
 * @param {string} filePath Path to the PDF file
 * @returns {Promise<Array<Document>>} Array of document chunks with metadata
 */
async function extractPdfTextWithMetadata(filePath) {
  console.log(`Extracting text from PDF with enhanced URL preservation: ${filePath}`);
  
  const pdfExtract = new PDFExtract();
  const options = {}; // default options
  
  try {
    const data = await pdfExtract.extract(filePath, options);
    console.log(`PDF extraction completed. Found ${data.pages.length} pages`);
    
    const documents = [];
    
    // Process each page
    for (let i = 0; i < data.pages.length; i++) {
      const page = data.pages[i];
      const pageNumber = i + 1;
      console.log(`Processing page ${pageNumber}`);
      
      // Collect all content items while preserving positioning
      const contentItems = page.content || [];
      
      // Sort content by Y position (top to bottom) then X position (left to right)
      contentItems.sort((a, b) => {
        const yDiff = a.y - b.y;
        return yDiff !== 0 ? yDiff : a.x - b.x;
      });
      
      // Group text by lines (similar Y positions)
      const lines = [];
      let currentLine = [];
      let currentY = null;
      
      const Y_THRESHOLD = 5; // Tolerance for same line detection
      
      for (const item of contentItems) {
        if (currentY === null || Math.abs(item.y - currentY) <= Y_THRESHOLD) {
          // Same line
          currentLine.push(item);
          if (currentY === null) currentY = item.y;
        } else {
          // New line
          if (currentLine.length > 0) {
            lines.push([...currentLine]);
          }
          currentLine = [item];
          currentY = item.y;
        }
      }
      
      // Add the last line if it exists
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      
      // Combine items in each line
      const textLines = lines.map(line => {
        // Sort items within line by X position
        line.sort((a, b) => a.x - b.x);
        
        // Process each item in the line to preserve spaces between words
        let lineText = '';
        let lastX = null;
        let lastWidth = 0;
        
        for (const item of line) {
          const text = item.str;
          
          // If there's a significant gap between text items, add a space
          if (lastX !== null) {
            const gap = item.x - (lastX + lastWidth);
            const averageCharWidth = lastWidth / (line[0].str.length || 1);
            
            // Add space if gap is larger than average character width
            if (gap > averageCharWidth) {
              lineText += ' ';
            }
          }
          
          lineText += text;
          lastX = item.x;
          lastWidth = item.width;
        }
        
        return lineText;
      });
      
      // Join lines with proper paragraph detection
      // If a line ends with punctuation, add two newlines (paragraph break)
      const pageText = textLines.join('\n');
      
      // Create the document with metadata
      const doc = new Document({
        pageContent: pageText,
        metadata: {
          source: filePath,
          pdf: {
            version: "enhanced-extraction",
            info: {
              PDFFormatVersion: data.pdfInfo?.PDFFormatVersion || "",
              IsAcroFormPresent: data.pdfInfo?.IsAcroFormPresent || false,
              IsXFAPresent: data.pdfInfo?.IsXFAPresent || false,
              Title: data.pdfInfo?.Title || path.basename(filePath),
              Producer: data.pdfInfo?.Producer || "",
            },
            metadata: data.pdfInfo?.metadata || null,
            totalPages: data.pages.length,
          },
          loc: {
            pageNumber: pageNumber,
          },
        },
      });
      
      documents.push(doc);
    }
    
    return documents;
  } catch (error) {
    console.error(`Error extracting PDF with enhanced method: ${error.message}`);
    console.error(`Falling back to default PDFLoader`);
    
    // Fallback to default PDFLoader
    const loader = new PDFLoader(filePath);
    return await loader.load();
  }
}

const worker = new Worker(
  'file-upload-queue',
  async (job) => {
    try {
      console.log(`Starting job processing:`, job.data);
      
      const data = JSON.parse(job.data);
      const { userId, jobId, filename } = data;
      
      console.log(`Processing file: ${filename} at path: ${data.path} for user: ${userId}`);
      
      if (!userId) {
        throw new Error('User ID is required for document processing');
      }
      
      // Emit initial progress with file details
      emitProgress(userId, jobId, 5, 'processing', `Starting analysis of "${filename}"...`, {
        filename,
        stage: 'initialization',
        fileSize: fs.statSync(data.path).size
      });
      
      if (!fs.existsSync(data.path)) {
        throw new Error(`File does not exist at path: ${data.path}`);
      }
      console.log(`File exists and is accessible`);
      
      // Emit progress for file validation
      emitProgress(userId, jobId, 10, 'processing', 'File validated, extracting text...', {
        filename,
        stage: 'text_extraction'
      });
      
      // Load the PDF with enhanced extraction
      console.log(`Starting enhanced PDF extraction from: ${data.path}`);
      
      let docs;
      try {
        docs = await extractPdfTextWithMetadata(data.path);
        console.log(`PDF extracted successfully with enhanced method. Number of document chunks: ${docs.length}`);
        if (docs.length > 0) {
          console.log(`First chunk sample: ${docs[0]?.pageContent.substring(0, 100)}...`);
        }
        
        // Emit progress for text extraction with details
        emitProgress(userId, jobId, 25, 'processing', `Text extracted from "${filename}"`, {
          filename,
          stage: 'text_extracted',
          totalChunks: docs.length,
          totalPages: docs.length // Assuming each chunk is roughly a page
        });
      } catch (pdfExtractError) {
        console.error(`Enhanced PDF extraction failed: ${pdfExtractError.message}`);
        console.log(`Falling back to default PDFLoader`);
        
        // Fallback to default PDFLoader
        const loader = new PDFLoader(data.path);
        docs = await loader.load();
        console.log(`PDF loaded with default method. Number of document chunks: ${docs.length}`);
        
        // Emit progress for fallback extraction
        emitProgress(userId, jobId, 25, 'processing', `Text extracted with fallback method. Found ${docs.length} document chunks.`);
      }
      
      console.log(`Initializing embeddings with Gemini API`);
      emitProgress(userId, jobId, 30, 'processing', 'Initializing AI embeddings...');
      
      const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY,
        modelName: "embedding-001",
      });
      
      try {
        console.log(`Testing embedding API with a sample text...`);
        const sampleText = "This is a test document to verify the embedding API is working correctly.";
        const sampleEmbedding = await embeddings.embedQuery(sampleText);
        console.log(`Embedding test successful! Vector dimension: ${sampleEmbedding.length}`);
        if (sampleEmbedding.length === 0) {
          throw new Error("Embedding API returned an empty vector");
        }
        
        emitProgress(userId, jobId, 35, 'processing', 'AI embeddings initialized successfully.');
      } catch (embeddingError) {
        console.error(`Embedding API test failed: ${embeddingError.message}`);
        console.error(`This indicates issues with the Gemini API key or service`);
        throw embeddingError;
      }
      
      console.log(`Embeddings initialized successfully`);
      
      console.log(`Connecting to Qdrant vector store`);
      emitProgress(userId, jobId, 40, 'processing', 'Connecting to vector database...');
      
      const vectorStoreUrl = process.env.QDRANT_URL || 'http://localhost:6333';
      
      // Create user-specific collection name
      const collectionName = `user_${data.userId}_documents`;
      console.log(`Using Qdrant URL: ${vectorStoreUrl}, Collection: ${collectionName}`);
      
      let vectorStore;
      try {
        vectorStore = await QdrantVectorStore.fromExistingCollection(
          embeddings,
          {
            url: vectorStoreUrl,
            collectionName: collectionName,
          }
        );
        console.log(`Connected to existing user-specific Qdrant collection successfully`);
        emitProgress(userId, jobId, 45, 'processing', 'Connected to your document collection.');
      } catch (collectionError) {
        console.warn(`Could not connect to existing collection: ${collectionError.message}`);
        console.log(`Attempting to create a new user-specific collection...`);
        emitProgress(userId, jobId, 45, 'processing', 'Creating your personal document collection...');
        
        try {
          // Create a new collection if it doesn't exist
          vectorStore = await QdrantVectorStore.fromTexts(
            ["Initial document to create collection"],
            { text: "This is a placeholder document", userId: data.userId },
            embeddings,
            {
              url: vectorStoreUrl,
              collectionName: collectionName,
              collectionConfig: {
                vectors: {
                  size: 768,  
                  distance: "Cosine"
                }
              }
            }
          );
          console.log(`Created new user-specific Qdrant collection successfully`);
          emitProgress(userId, jobId, 50, 'processing', 'Personal document collection created successfully.');
        } catch (createError) {
          console.error(`Failed to create new collection: ${createError.message}`);
          throw createError;
        }
      }
      
      const validDocs = docs.filter(doc => {
        const isValid = doc.pageContent && doc.pageContent.trim().length > 10;
        if (!isValid) {
          console.log(`Skipping invalid document: ${JSON.stringify(doc)}`);
        }
        return isValid;
      });
      console.log(`After filtering: ${validDocs.length} valid documents from original ${docs.length}`);
      
      emitProgress(userId, jobId, 55, 'processing', `Preparing ${validDocs.length} document chunks for processing...`);
      
      const BATCH_SIZE = 50;
      const batches = [];
      
      for (let i = 0; i < validDocs.length; i += BATCH_SIZE) {
        batches.push(validDocs.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`Split processing into ${batches.length} batches of max ${BATCH_SIZE} documents each`);
      
      emitProgress(userId, jobId, 60, 'processing', `Processing ${batches.length} batches of document chunks...`);
      
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          try {
            console.log(`Processing batch ${i+1}/${batches.length} with ${batch.length} documents`);
            
            // Calculate progress for this batch (60-90% range)
            const batchStartProgress = 60;
            const batchEndProgress = 90;
            const batchProgress = batchStartProgress + ((i / batches.length) * (batchEndProgress - batchStartProgress));
            
            emitProgress(userId, jobId, Math.round(batchProgress), 'processing', `Processing batch ${i+1} of ${batches.length}`, {
              filename,
              stage: 'embedding_generation',
              currentBatch: i + 1,
              totalBatches: batches.length,
              documentsInBatch: batch.length
            });
            
            for (let j = 0; j < batch.length; j++) {
              try {
                const doc = batch[j];
                
                if (!doc.pageContent || doc.pageContent.trim().length < 10) {
                  console.log(`Skipping document ${j+1} in batch ${i+1} due to insufficient content`);
                  continue;
                }
                
                const originalContent = doc.pageContent;
                const cleanedContent = cleanTextForEmbedding(originalContent);
                
                const cleanedDoc = new Document({
                  pageContent: cleanedContent,
                  metadata: doc.metadata
                });
                
                const contentPreview = cleanedContent.substring(0, 100).replace(/\n/g, ' ');
                console.log(`Document ${j+1} preview: "${contentPreview}..."`);
                
                // Calculate total documents processed so far
                const totalProcessed = (i * BATCH_SIZE) + j + 1;
                const docProgress = batchStartProgress + ((totalProcessed / validDocs.length) * (batchEndProgress - batchStartProgress));
                
                // Emit detailed progress for current document
                emitProgress(userId, jobId, Math.round(docProgress), 'processing', `Processing chunk ${totalProcessed} of ${validDocs.length}`, {
                  filename,
                  stage: 'embedding_generation',
                  currentDocument: totalProcessed,
                  totalDocuments: validDocs.length,
                  currentBatch: i + 1,
                  totalBatches: batches.length,
                  documentPreview: contentPreview,
                  pageNumber: doc.metadata?.loc?.pageNumber || null
                });
                
                try {
                  console.log(`Generating embedding for document ${j+1} in batch ${i+1}`);
                  const embedding = await embeddings.embedQuery(cleanedContent);
                  console.log(`Successfully generated embedding with dimension: ${embedding.length}`);
                  
                  if (embedding.length === 0) {
                    console.error(`Document ${j+1} in batch ${i+1} produced a zero-dimension embedding`);
                    console.error(`Content may violate content policy or contain unsupported characters`);
                    continue; // Skip this document
                  }
                  
                  await vectorStore.addDocuments([cleanedDoc]);
                  console.log(`Successfully added document ${j+1}/${batch.length} in batch ${i+1}`);
                  
                  // Emit success for this document
                  emitProgress(userId, jobId, Math.round(docProgress), 'processing', `✓ Processed chunk ${totalProcessed}`, {
                    filename,
                    stage: 'embedding_complete',
                    currentDocument: totalProcessed,
                    totalDocuments: validDocs.length,
                    documentPreview: contentPreview,
                    success: true
                  });
                  
                } catch (embeddingError) {
                  console.error(`Failed to generate embedding for document ${j+1} in batch ${i+1}: ${embeddingError.message}`);
                  console.error(`Problematic content: "${contentPreview}..."`);
                  // Skip this document
                }
              } catch (docError) {
                console.error(`Error adding document ${j+1} in batch ${i+1}: ${docError.message}`);
                // Continue with next document
              }
            }
            
            console.log(`Completed batch ${i+1}/${batches.length}`);
          } catch (batchError) {
            console.error(`Error processing batch ${i+1}: ${batchError.message}`);
            // Continue with next batch
          }
        }
      
      console.log(`Finished processing all document batches`);
      
      // Emit completion progress
      emitProgress(userId, jobId, 95, 'finalizing', 'Finalizing document processing...');
      
      // Final completion
      emitProgress(userId, jobId, 100, 'completed', 'Document processing completed! You can now start chatting.');
      
    } catch (error) {
      console.error(`Job failed: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
      
      // Emit error progress
      emitProgress(data.userId, data.jobId, 0, 'error', `Processing failed: ${error.message}`);
      
      throw error; // Re-throw to mark the job as failed
    }
  },
  {
    concurrency: 100,
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || '6379',
    },
  }
);
