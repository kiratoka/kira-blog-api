import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateLikeInput } from './dto/create-like.input';
import { UpdateLikeInput } from './dto/update-like.input';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LikeService {
  constructor(private readonly prisma: PrismaService) {}

  async likePost({ postId, userId }: { postId: number; userId: number }) {
    try {
      return !!(await this.prisma.like.create({
        data: {
          userId,
          postId,
        },
      }));
    } catch (err) {
      throw new BadRequestException('You have already liked this post');
    }
  }

  async unlikePost({ postId, userId }: { postId: number; userId: number }) {
    try {
      await this.prisma.like.delete({
        where: {
          userId_postId: {
            userId,
            postId,
          },
        },
      });
      return true;
    } catch (err) {
      throw new BadRequestException('Like not found');
    }
  }

  async getPostLikesCount(postId: number) {
    try {
      const likesData = await this.prisma.like.count({
        where: {
          postId,
        },
      });

      return likesData;
    } catch (err) {
      throw new BadRequestException('Like counting error');
    }
  }

  async userLikedPost({ postId, userId }: { postId: number; userId: number }) {
    const like = await this.prisma.like.findFirst({
      where: {
        userId,
        postId,
      },
    });

    return !!like;
  }
}
