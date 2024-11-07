/*
https://docs.nestjs.com/exception-filters#custom-exceptions
*/

import { HttpException, HttpStatus } from '@nestjs/common';

export class UserException extends HttpException {
  constructor(message: string, statusCode: HttpStatus) {
    super({
      status: statusCode,
      error: message,
      timestamp: new Date().toISOString(),
    }, statusCode);
  }
}
