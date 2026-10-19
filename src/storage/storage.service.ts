import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';

export interface StoredFile {
  url: string;
  public_id: string;
  original_name: string;
  folder: string;
  resource_type: string;
  format: string;
  size: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private configured = false;

  constructor(private readonly configService: ConfigService) {}

  async upload(file: Express.Multer.File, folder: string): Promise<StoredFile> {
    this.ensureConfigured();

    let result: UploadApiResponse;
    try {
      result = await this.push(file, folder);
    } catch (error) {
      this.logger.error(
        `Cloudinary upload failed for ${file.originalname}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException('Failed to upload file');
    }

    return {
      url: result.secure_url,
      public_id: result.public_id,
      original_name: file.originalname,
      folder: String(result.folder ?? folder),
      resource_type: result.resource_type,
      format: result.format,
      size: result.bytes,
    };
  }

  private push(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          use_filename: true,
          unique_filename: true,
          overwrite: false,
        },
        (error, uploaded) => {
          if (error) {
            return reject(
              new Error(`Cloudinary upload error: ${error.message}`),
            );
          }
          if (!uploaded)
            return reject(new Error('Cloudinary returned no result'));
          resolve(uploaded);
        },
      );
      stream.end(file.buffer);
    });
  }

  private ensureConfigured(): void {
    if (this.configured) return;

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException(
        'File storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    this.configured = true;
  }
}
