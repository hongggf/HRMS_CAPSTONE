import fs from 'fs';
import path from 'path';

// Storage abstraction so local storage can later be replaced by S3/GCS
export interface StorageService {
  uploadFile(fileBuffer: Buffer, originalName: string, mimeType: string): Promise<{ storageKey: string }>;
  getFileStream(storageKey: string): fs.ReadStream;
}

export class LocalStorageService implements StorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async uploadFile(fileBuffer: Buffer, originalName: string, mimeType: string): Promise<{ storageKey: string }> {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const storageKey = uniqueSuffix + '-' + originalName.replace(/[^a-zA-Z0-9.\-]/g, '_');
    const filePath = path.join(this.baseDir, storageKey);
    
    fs.writeFileSync(filePath, fileBuffer);
    
    return { storageKey };
  }

  getFileStream(storageKey: string): fs.ReadStream {
    const filePath = path.join(this.baseDir, storageKey);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
    return fs.createReadStream(filePath);
  }
}

export const storageService = new LocalStorageService();
