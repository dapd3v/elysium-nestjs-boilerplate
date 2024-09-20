import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import dbConfig from './core/config/db.config';
import appConfig from './core/config/app.config';
import authConfig from './core/config/auth.config';
import mailConfig from './core/config/mail.config';

import { HomeModule } from './home/home.module';
import { PrismaModule } from './core/prisma/prisma.module';
import { UsersModule } from './core/users/users.module';
import { SessionModule } from './core/session/session.module';
import { AuthModule } from './core/auth/auth.module';

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
    UsersModule,
    SessionModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
