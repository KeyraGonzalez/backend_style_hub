import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

export interface UploadOptions {
  allowedMimeTypes?: string[];
  maxFileSize?: number; 
  destination?: string;
}

@Injectable()
export class FileUploadService {
  private readonly uploadDir: string;
  private readonly maxFileSize: number = 5 * 1024 * 1024; // 5MB default
  private readonly allowedImageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

  constructor(private configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDirectory();
  }

  private ensureUploadDirectory() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    const subdirs = ['products', 'users', 'temp'];
    subdirs.forEach(subdir => {
      const dirPath = path.join(this.uploadDir, subdir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  async uploadProductImage(file: Express.Multer.File): Promise<string> {
    return this.uploadFile(file, {
      allowedMimeTypes: this.allowedImageTypes,
      maxFileSize: this.maxFileSize,
      destination: 'products',
    });
  }

  async uploadUserAvatar(file: Express.Multer.File): Promise<string> {
    return this.uploadFile(file, {
      allowedMimeTypes: this.allowedImageTypes,
      maxFileSize: 2 * 1024 * 1024, // 2MB for avatars
      destination: 'users',
    });
  }

  private async uploadFile(file: Express.Multer.File, options: UploadOptions): Promise<string> {
    // Validate file
    this.validateFile(file, options);

    // Generate unique filename
    const filename = this.generateUniqueFilename(file.originalname);
    const destination = options.destination || 'temp';
    const filePath = path.join(this.uploadDir, destination, filename);

    try {
      // Save file
      fs.writeFileSync(filePath, file.buffer);

      // Return relative path for database storage
      return `uploads/${destination}/${filename}`;
    } catch (error) {
      throw new BadRequestException('Failed to save file');
    }
  }

  private validateFile(file: Express.Multer.File, options: UploadOptions) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file size
    const maxSize = options.maxFileSize || this.maxFileSize;
    if (file.size > maxSize) {
      throw new BadRequestException(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
    }

    // Check mime type
    const allowedTypes = options.allowedMimeTypes || this.allowedImageTypes;
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} not allowed`);
    }
  }

  private generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    
    // Sanitize filename
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
    
    return `${sanitizedBaseName}_${timestamp}_${random}${extension}`;
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  getFileUrl(filePath: string): string {
    const baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:3000';
    return `${baseUrl}/${filePath}`;
  }

  async uploadMultipleFiles(files: Express.Multer.File[], options: UploadOptions): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, options));
    return Promise.all(uploadPromises);
  }
}