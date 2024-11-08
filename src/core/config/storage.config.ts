import { registerAs } from '@nestjs/config';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  IsArray,
  IsUrl,
} from 'class-validator';
import { StorageConfig } from './config.type';
import validateConfig from '../utils/validate.config';
import * as path from 'path';

class StorageEnvironmentVariablesValidator {
  @IsInt()
  @Min(0)
  @Max(10 * 1024 * 1024) // 10MB máximo
  @IsOptional()
  MAX_FILE_SIZE: number;

  @IsInt()
  @Min(0)
  @Max(5 * 1024 * 1024) // 5MB máximo
  @IsOptional()
  PROFILE_PHOTO_MAX_SIZE: number;

  @IsString()
  @IsOptional()
  UPLOAD_PATH: string;

  @IsString()
  @IsOptional()
  STORAGE_TYPE: string;

  @IsUrl()
  @IsOptional()
  STORAGE_BASE_URL: string;

  @IsArray()
  @IsOptional()
  ALLOWED_MIME_TYPES: string[];
}

export default registerAs<StorageConfig>('storage', () => {
  validateConfig(process.env, StorageEnvironmentVariablesValidator);

  return {
    // Configuración básica
    uploadPath: process.env.UPLOAD_PATH || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,
    storageType: process.env.STORAGE_TYPE || 'local',
    
    // Tipos de archivos permitidos
    allowedMimeTypes: process.env.ALLOWED_MIME_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/gif'
    ],

    // Configuración de fotos de perfil
    profilePhotos: {
      path: path.join(process.env.UPLOAD_PATH || 'uploads', 'profile-photos'),
      maxSize: parseInt(process.env.PROFILE_PHOTO_MAX_SIZE, 10) || 2 * 1024 * 1024,
      allowedTypes: ['image/jpeg', 'image/png'],
    },

    // URLs y endpoints
    baseUrl: process.env.STORAGE_BASE_URL || process.env.APP_URL || 'http://localhost:4000',
    
    // Configuración adicional
    compression: {
      enabled: process.env.ENABLE_IMAGE_COMPRESSION === 'true',
      quality: parseInt(process.env.IMAGE_COMPRESSION_QUALITY, 10) || 80,
    },
    
    // Límites y restricciones
    limits: {
      maxFiles: parseInt(process.env.MAX_FILES_PER_UPLOAD, 10) || 5,
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,
      maxTotalSize: parseInt(process.env.MAX_TOTAL_UPLOAD_SIZE, 10) || 20 * 1024 * 1024,
    }
  };
});