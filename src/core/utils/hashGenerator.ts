import * as crypto from 'crypto';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';

export const hashGenerator = () => {

  const randomString = randomStringGenerator();

  const hash = crypto
      .createHash('sha256')
      .update(randomString)
      .digest('hex');
      
  return hash;
};