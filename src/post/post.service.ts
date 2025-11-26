import { BadRequestException, Injectable } from '@nestjs/common';
import { DEFAULT_PAGE_SIZE } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePostInput } from './dto/create-post.input';
import { SupabaseService } from 'src/supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';



@Injectable()
export class PostService {

  constructor(private readonly prisma: PrismaService, private readonly supabaseService: SupabaseService) { }




  async findAll({
    skip = 0,
    take = DEFAULT_PAGE_SIZE }
    :
    {
      skip?: number, take?: number

    }) {
    return await this.prisma.post.findMany({
      skip,
      take
    });
  }


  async count() {
    return await this.prisma.post.count()
  }

  async findOne(id: number) {
    return await this.prisma.post.findFirst({
      where: {
        id
      },
      include: {
        author: true,
        tags: true
      }
    })
  }

  async findByUser({ userId, take, skip }: { userId: number, take: number, skip: number }) {

    return await this.prisma.post.findMany({
      where: {
        author: {
          id: userId
        }
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        published: true,
        slug: true,
        title: true,
        thumbnail: true,
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
      take,
      skip


    })
  }


  async userPostCount(userId: number) {

    try {
      const postCount = await this.prisma.post.count({
        where: {
          authorId: userId
        }
      })

      return postCount

    } catch (error) {
      throw new Error("Error counting post datas")
    }

  }


  async createPost({ dto, userId, file }: { userId: number; dto: CreatePostInput; file: Express.Multer.File }) {

    if (!file) throw new BadRequestException("No file provided")

    const supabase = this.supabaseService.getClient()
    const fileName = `${Date.now()}-${uuidv4()}-${file.originalname.replace(/\s+/g, '-')}`;
    const bucket = "kira-blog"

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(`images/${fileName}`, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      })

    if (error) {
      throw new BadRequestException(error.message || 'Upload failed');
    }


    const path = data.path

    const objectPublicUrl = supabase.storage.from(bucket).getPublicUrl(path)
    const thumbnailUrl = objectPublicUrl.data.publicUrl

    // Generate slug from title
    const slugify = (text: string): string => {
      return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[\s\W-]+/g, '-') // Replace spaces and non-word chars with -
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing -
    };
    const slug = slugify(dto.title);


    // Pastikan tags berupa array objek {id, name}
    // Pastikan isPublished bertipe boolean
    // Jika ternyata isPublished masih string, lakukan konversi: 
    //   const isPublished = typeof dto.isPublished === "string" ? dto.isPublished === "true" : dto.isPublished;

    // Kode hasil revisi:
    return await this.prisma.post.create({
      data: {
        path, 
        slug,
        title: dto.title,
        content: dto.content,
        thumbnail: thumbnailUrl,
        // Konversi ke boolean karena kemungkinan dapat string dari FormData
        published: typeof dto.published === "string" ? dto.published === "true" : !!dto.published,
        author: {
          connect: {
            id: userId
          }
        },
        tags: {
          connectOrCreate: dto.tags.map((tag) => ({
            where: {
              name: tag.name
            },
            create: {
              name: tag.name
            }
          }))
        }
      }
    })
  }

  async update({ }) {

  }



  async delete({ postId, userId }: { postId: number, userId: number }) {

  }
}
