import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostResolver } from './post.resolver';
import { PrismaService } from 'src/prisma/prisma.service';
import { PostController } from './post.controller';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { SupabaseService } from 'src/supabase/supabase.service';

@Module({
  providers: [PostResolver, PostService, PrismaService, JwtAuthGuard, SupabaseService],
  controllers: [PostController],
})
export class PostModule { }
