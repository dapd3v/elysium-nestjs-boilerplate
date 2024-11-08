import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import { LoggerService } from '../logger/logger.service';
import * as sharp from 'sharp';

@Injectable()
export class StorageService {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Configuración de Multer para subida de archivos
   */
  public multerOptions(folder: string = 'uploads') {
    return {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = path.join(process.cwd(), this.configService.get<string>('storage.uploadPath'), folder);
          fs.mkdir(uploadPath, { recursive: true })
            .then(() => cb(null, uploadPath))
            .catch(error => {
              this.logger.error('Failed to create upload directory', error);
              cb(error, uploadPath);
            });
        },
        filename: (req, file, cb) => {
          const filename = `${uuidv4()}${path.extname(file.originalname)}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!this.configService.get<string[]>('storage.allowedMimeTypes').includes(file.mimetype)) {
          return cb(
            new HttpException(
              `File type not allowed. Allowed types: ${this.configService.get<string[]>('storage.allowedMimeTypes').join(', ')}`,
              HttpStatus.BAD_REQUEST
            ),
            false
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: this.configService.get<number>('storage.limits.maxFileSize'),
        files: this.configService.get<number>('storage.limits.maxFiles'),
      },
    };
  }

  /**
   * Guarda y procesa un archivo
   */
  async saveFile(
    file: Express.Multer.File,
    folder: string = 'uploads'
  ): Promise<string> {
    try {
      const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
      const relativePath = path.join(folder, fileName);
      const fullPath = path.join(process.cwd(), this.configService.get<string>('storage.uploadPath'), relativePath);

      // Crear directorio si no existe
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      // Comprimir imagen si está habilitado
      if (this.configService.get<boolean>('storage.compression.enabled') && file.mimetype.startsWith('image/')) {
        await this.compressImage(file.buffer, fullPath);
      } else {
        await fs.writeFile(fullPath, file.buffer);
      }

      this.logger.log(`File saved successfully: ${relativePath}`);
      return relativePath;
    } catch (error) {
      this.logger.error('Failed to save file', error);
      throw new HttpException(
        'Failed to save file',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Comprime una imagen usando sharp
   */
  private async compressImage(
    buffer: Buffer,
    outputPath: string
  ): Promise<void> {
    try {
      await sharp(buffer)
        .jpeg({ quality: this.configService.get<number>('storage.compression.quality') })
        .toFile(outputPath);
    } catch (error) {
      this.logger.error('Failed to compress image', error);
      throw error;
    }
  }

  /**
   * Elimina un archivo
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(process.cwd(), this.configService.get<string>('storage.uploadPath'), filePath);
      await fs.unlink(fullPath);
      this.logger.log(`File deleted successfully: ${filePath}`);
    } catch (error) {
      this.logger.error('Failed to delete file', error);
      throw new HttpException(
        'Failed to delete file',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Obtiene la URL pública de un archivo
   */
  getFileUrl(filePath: string): string {
    return `${this.configService.get<string>('storage.baseUrl')}/${this.configService.get<string>('storage.uploadPath')}/${filePath}`;
  }

  /**
   * Valida el tamaño total de los archivos
   */
  validateTotalSize(files: Express.Multer.File[]): void {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > this.configService.get<number>('storage.limits.maxTotalSize')) {
      throw new HttpException(
        `Total file size exceeds limit of ${this.configService.get<number>('storage.limits.maxTotalSize')} bytes`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Obtiene información sobre un archivo
   */
  async getFileInfo(filePath: string): Promise<{
    exists: boolean;
    size?: number;
    mime?: string;
  }> {
    try {
      const fullPath = path.join(process.cwd(), this.configService.get<string>('storage.uploadPath'), filePath);
      const stats = await fs.stat(fullPath);
      return {
        exists: true,
        size: stats.size,
        mime: path.extname(filePath).slice(1),
      };
    } catch {
      return { exists: false };
    }
  }
}