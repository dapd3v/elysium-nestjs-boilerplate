/*
https://docs.nestjs.com/openapi/decorators#decorators
*/

import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../storage.service';

export function UploadFile(fieldName: string = 'file', folder: string = 'uploads') {
  const storage = new StorageService(null, null);
  return applyDecorators(
    UseInterceptors(FileInterceptor(fieldName, storage.multerOptions(folder))),
  );
}