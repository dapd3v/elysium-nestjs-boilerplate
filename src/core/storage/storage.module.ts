/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [ConfigModule],
    controllers: [],
    providers: [StorageService],
})
export class StorageModule { }
