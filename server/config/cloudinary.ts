import { v2 as cloudinary, ConfigOptions } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
import { Request } from 'express';

// Load environment variables
dotenv.config();

// Configure Cloudinary
const cloudinaryConfig: ConfigOptions = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

cloudinary.config(cloudinaryConfig);

// Create storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req: Request, file: Express.Multer.File) => {
      // Organize files by user ID to segregate uploads
      const userId = req.body?.userId || req.query?.userId || 'anonymous';
      console.log('Cloudinary storage - userId found:', userId);
      return `chatbot-uploads/${userId}`;
    },
    resource_type: 'raw', // For PDFs and other non-image files
    public_id: (req: Request, file: Express.Multer.File) => {
      // Create unique filename with timestamp
      const timestamp = Date.now();
      const originalName = file.originalname.replace(/\.[^/.]+$/, ''); // Remove extension
      return `${timestamp}-${originalName}`;
    },
    allowed_formats: ['pdf', 'doc', 'docx', 'txt'], // Restrict file types
  } as any, // CloudinaryStorage params typing issue - using any for compatibility
});

export { cloudinary, storage };
