import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserResolver } from './user.resolver';

@Module({
  providers: [UserResolver, UserService, PrismaService],
})
export class UserModule {}
