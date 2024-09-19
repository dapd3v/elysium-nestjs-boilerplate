import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import dbConfig from './core/config/db.config';
import appConfig from './core/config/app.config';
import authConfig from './core/config/auth.config';
import mailConfig from './core/config/mail.config';

import { HomeModule } from './home/home.module';
import { PrismaModule } from './core/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        dbConfig,
        authConfig,
        appConfig,
        mailConfig,
      ],
      envFilePath: ['.env.development.local', '.env.production.local', '.env'],
    }),
    HomeModule,
    PrismaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
