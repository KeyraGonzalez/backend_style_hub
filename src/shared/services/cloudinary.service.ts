import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder?: string
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        resource_type: 'image',
        quality: 'auto:good',
        fetch_format: 'auto',
      };

      if (folder) {
        uploadOptions.folder = folder;
      }

      cloudinary.uploader
        .upload_stream(
          uploadOptions,
          (error: UploadApiErrorResponse, result: UploadApiResponse) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        )
        .end(file.buffer);
    });
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder?: string
  ): Promise<UploadApiResponse[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }

  async deleteImage(publicId: string): Promise<any> {
    return cloudinary.uploader.destroy(publicId);
  }

  async deleteMultipleImages(publicIds: string[]): Promise<any> {
    return cloudinary.api.delete_resources(publicIds);
  }

  // Generar URL optimizada
  getOptimizedUrl(publicId: string, options?: any): string {
    return cloudinary.url(publicId, {
      quality: 'auto:good',
      fetch_format: 'auto',
      ...options,
    });
  }

  // Generar URL con transformaciones
  getTransformedUrl(publicId: string, transformations: any): string {
    return cloudinary.url(publicId, transformations);
  }
}
