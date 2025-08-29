import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { QdrantVectorStore } from '@langchain/qdrant';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const testQdrantConnection = async () => {
  console.log('Testing Qdrant Cloud connection...');
  console.log('URL:', process.env.QDRANT_URL);
  console.log('API Key:', process.env.QDRANT_API_KEY ? 'Present' : 'Missing');
  
  try {
    console.log('\n1. Initializing Google Embeddings...');
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY,
      modelName: "embedding-001",
    });
    console.log('✅ Embeddings initialized');

    console.log('\n2. Testing connection to Qdrant Cloud...');
    
    // Test creating a simple collection
    const testCollectionName = 'test_connection_' + Date.now();
    console.log(`� Creating test collection: ${testCollectionName}`);
    
    const vectorStore = await QdrantVectorStore.fromTexts(
      ["This is a test document to verify Qdrant Cloud connection"],
      { test: "true" },
      embeddings,
      {
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: testCollectionName,
        collectionConfig: {
          vectors: {
            size: 768,
            distance: "Cosine"
          }
        }
      }
    );
    
    console.log('✅ Test collection created successfully!');
    
    console.log('\n3. Testing search functionality...');
    const searchResults = await vectorStore.similaritySearch("test document", 1);
    console.log('� Search results:', searchResults.length > 0 ? 'Found documents' : 'No documents found');
    
    if (searchResults.length > 0) {
      console.log('📄 First result:', searchResults[0].pageContent);
    }
    
    console.log('\n🎉 All tests passed! Qdrant Cloud is ready to use.');
    console.log(`🗑️ Note: Test collection '${testCollectionName}' was created and can be manually deleted if needed.`);
    
  } catch (err) {
    console.error('❌ Error testing Qdrant Cloud:', err.message);
    console.error('📝 Full error:', err);
    
    if (err.message.includes('401') || err.message.includes('unauthorized')) {
      console.error('🔐 Authentication failed - check your API key');
    } else if (err.message.includes('connection') || err.message.includes('ENOTFOUND')) {
      console.error('🌐 Network connection failed - check your URL');
    } else if (err.message.includes('GEMINI_API_KEY')) {
      console.error('🔑 Gemini API key issue - check your Google AI API key');
    }
  }
};

// Run the test
testQdrantConnection();
