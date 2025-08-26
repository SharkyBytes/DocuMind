import { Worker } from 'bullmq';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { Document } from '@langchain/core/documents';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { CharacterTextSplitter } from '@langchain/textsplitters';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

/**
 * Clean and normalize text for embedding
 * @param {string} text The input text to clean
 * @returns {string} Cleaned text
 */
function cleanTextForEmbedding(text) {
  if (!text) return '';
  
  text = text.replace(/https?:\/\/[^\s]+/g, '[URL]');
  
  text = text.replace(/[^\w\s.,?!;:()\[\]{}'""-]/g, ' ');
  
  text = text.replace(/\s+/g, ' ').trim();
  
  const MAX_LENGTH = 2048;
  if (text.length > MAX_LENGTH) {
    text = text.substring(0, MAX_LENGTH);
  }
  
  return text;
}

const worker = new Worker(
  'file-upload-queue',
  async (job) => {
    try {
      console.log(`Starting job processing:`, job.data);
      
      const data = JSON.parse(job.data);
      console.log(`Processing file: ${data.filename} at path: ${data.path}`);
      
      if (!fs.existsSync(data.path)) {
        throw new Error(`File does not exist at path: ${data.path}`);
      }
      console.log(`File exists and is accessible`);
      
      // Load the PDF
      console.log(`Starting PDF loading from: ${data.path}`);
      const loader = new PDFLoader(data.path);
      
      try {
        const docs = await loader.load();
        console.log(`PDF loaded successfully. Number of document chunks: ${docs.length}`);
        console.log(`First chunk sample: ${docs[0]?.pageContent.substring(0, 100)}...`);
        
        console.log(`Initializing embeddings with Gemini API`);
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
        } catch (embeddingError) {
          console.error(`Embedding API test failed: ${embeddingError.message}`);
          console.error(`This indicates issues with the Gemini API key or service`);
          throw embeddingError;
        }
        
        console.log(`Embeddings initialized successfully`);
        
        console.log(`Connecting to Qdrant vector store`);
        const vectorStoreUrl = process.env.QDRANT_URL || 'http://localhost:6333';
        const collectionName = 'langchainjs-testing';
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
          console.log(`Connected to existing Qdrant collection successfully`);
        } catch (collectionError) {
          console.warn(`Could not connect to existing collection: ${collectionError.message}`);
          console.log(`Attempting to create a new collection...`);
          
          try {
            // Create a new collection if it doesn't exist
            vectorStore = await QdrantVectorStore.fromTexts(
              ["Initial document to create collection"],
              { text: "This is a placeholder document" },
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
            console.log(`Created new Qdrant collection successfully`);
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
        
        const BATCH_SIZE = 50;
        const batches = [];
        
        for (let i = 0; i < validDocs.length; i += BATCH_SIZE) {
          batches.push(validDocs.slice(i, i + BATCH_SIZE));
        }
        
        console.log(`Split processing into ${batches.length} batches of max ${BATCH_SIZE} documents each`);
        
          for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            try {
              console.log(`Processing batch ${i+1}/${batches.length} with ${batch.length} documents`);
              
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
      } catch (pdfError) {
        console.error(`Error processing PDF: ${pdfError.message}`);
        console.error(`Error stack: ${pdfError.stack}`);
        throw pdfError;
      }
    } catch (error) {
      console.error(`Job failed: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
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
