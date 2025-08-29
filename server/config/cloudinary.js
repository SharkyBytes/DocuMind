import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req, file) => {
      // Organize files by user ID to segregate uploads
      const userId = req.body?.userId || 'anonymous';
      return `chatbot-uploads/${userId}`;
    },
    resource_type: 'raw', // For PDFs and other non-image files
    public_id: (req, file) => {
      // Create unique filename with timestamp
      const timestamp = Date.now();
      const originalName = file.originalname.replace(/\.[^/.]+$/, ''); // Remove extension
      return `${timestamp}-${originalName}`;
    },
    allowed_formats: ['pdf', 'doc', 'docx', 'txt'], // Restrict file types
  },
});

export { cloudinary, storage };
