import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DEFAULT_PAGE_SIZE } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePostInput } from './dto/create-post.input';
import { SupabaseService } from 'src/supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';
import { UpdatePostInput } from './dto/update-post.input';

@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async findAll({
    skip = 0,
    take = DEFAULT_PAGE_SIZE,
  }: {
    skip?: number;
    take?: number;
  }) {
    return await this.prisma.post.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    });
  }

  async count() {
    return await this.prisma.post.count();
  }

  async findOne(id: number) {
    return await this.prisma.post.findFirst({
      where: {
        id,
      },
      include: {
        author: true,
        tags: true,
      },
    });
  }

  async findByUser({
    userId,
    take,
    skip,
  }: {
    userId: number;
    take: number;
    skip: number;
  }) {
    return await this.prisma.post.findMany({
      where: {
        author: {
          id: userId,
        },
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
      skip,
    });
  }

  async userPostCount(userId: number) {
    try {
      const postCount = await this.prisma.post.count({
        where: {
          authorId: userId,
        },
      });

      return postCount;
    } catch (error) {
      throw new Error('Error counting post datas');
    }
  }

  async createPost({
    dto,
    userId,
    file,
  }: {
    userId: number;
    dto: CreatePostInput;
    file: Express.Multer.File;
  }) {
    if (!file) throw new BadRequestException('No file provided');

    const supabase = this.supabaseService.getClient();
    const fileName = `${Date.now()}-${uuidv4()}-${file.originalname.replace(/\s+/g, '-')}`;
    const bucket = 'kira-blog';

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(`images/${fileName}`, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new BadRequestException(error.message || 'Upload failed');
    }

    const path = data.path;

    const objectPublicUrl = supabase.storage.from(bucket).getPublicUrl(path);
    const thumbnailUrl = objectPublicUrl.data.publicUrl;

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
        published:
          typeof dto.published === 'string'
            ? dto.published === 'true'
            : !!dto.published,
        author: {
          connect: {
            id: userId,
          },
        },
        tags: {
          connectOrCreate: dto.tags.map((tag) => ({
            where: {
              name: tag.name,
            },
            create: {
              name: tag.name,
            },
          })),
        },
      },
    });
  }

  /**
   * Bagaimana sebaiknya menangani update post dengan thumbnail/file yang opsional?
   *
   * Jawaban:
   * - Kalau file (thumbnail baru) ADA:
   *   - Upload file baru ke storage (Supabase).
   *   - Hapus file lama kalau ada path-nya (dto.path).
   *   - Dapatkan path & publicUrl dari file baru.
   *   - Update field thumbnail & path di database pakai file baru.
   * - Kalau file TIDAK ADA:
   *   - Jangan update field thumbnail dan path, supaya tetap menggunakan nilai lama di database.
   *
   * Implementasinya:
   * - Gunakan variabel lokal untuk menampung thumbnailUrl & path baru (jika ada file), else tetap undefined.
   * - Saat update Prisma, hanya masukkan field thumbnail/path jika memang nilainya ada (pakai spread operator JS).
   * - Field lain seperti title, content, tags, slug, dan published bisa diupdate seperti biasa.
   */

  async updatePost({
    userId,
    dto,
    file,
  }: {
    userId: number;
    dto: UpdatePostInput;
    file: Express.Multer.File | undefined;
  }) {
    const supabase = this.supabaseService.getClient();
    let newThumbnailUrl: string | undefined = undefined;
    let newPath: string | undefined = undefined;

    if (file) {
      const fileName = `${Date.now()}-${uuidv4()}-${file.originalname.replace(/\s+/g, '-')}`;
      const bucket = 'kira-blog';

      // Hapus file lama jika ada path lama
      if (dto.path) {
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove([dto.path]);
        if (deleteError) {
          // Tidak gagal jika hapus gagal, lanjut update
          console.log('Failed to delete old file:', deleteError.message);
        }
      }

      // Upload file baru
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(`images/${fileName}`, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        throw new BadRequestException(error.message || 'Upload failed');
      }

      newPath = data.path;
      const objectPublicUrl = supabase.storage
        .from(bucket)
        .getPublicUrl(newPath);
      newThumbnailUrl = objectPublicUrl.data.publicUrl;
    }

    // Generate slug dari title (bisa re-generate tiap update judul)
    const slugify = (text: string): string => {
      return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[\s\W-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    };
    const slug = slugify(dto.title);

    console.log("ini adalah published :", dto.published);

    // Catatan penting:
    // - Field thumbnail & path hanya ikut di-update jika ada file baru.
    // - Kalau tidak ada file baru: biarkan field tsb tidak diisi/dipass (tidak overwrite jadi undefined/null).
    return await this.prisma.post.update({
      where: {
        id: Number(dto.id), // dto.id harus ada (number)
      },
      data: {
        title: dto.title,
        content: dto.content,
        // hanya update thumbnail/path jika ada yang baru
        ...(newThumbnailUrl && { thumbnail: newThumbnailUrl }),
        ...(newPath && { path: newPath }),
        published:
          typeof dto.published === 'string'
            ? dto.published === 'true'
            : !!dto.published,
        tags: {
          connectOrCreate: dto.tags.map((tag) => ({
            where: {
              name: tag.name,
            },
            create: {
              name: tag.name,
            },
          })),
        },
        slug: slug,
        // field lain jika perlu
      },
    });
  }

  async deletePost({
    postId,
    userId,
    path,
  }: {
    postId: number;
    userId: number;
    path: string;
  }) {
    const supabase = this.supabaseService.getClient();
    const bucket = 'kira-blog';
    if (path) {
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove([path]);
      if (deleteError) {
        // Tidak gagal jika hapus gagal, lanjut update
        console.log('Failed to delete old file:', deleteError.message);
      }
    }

    // Sebenarnya, pengecekan authorIdMatched lewat findUnique di sini tidak benar-benar wajib,
    // karena Prisma delete dengan where: { id, authorId } hanya akan menghapus jika keduanya cocok.
    // Jadi kalau userId bukan author, maka tidak ada row yang dihapus, dan result akan null/undefined.
    // Kita bisa mengandalkan hasil dari delete, sehingga cukup cek !result untuk lempar UnauthorizedException.

    const result = await this.prisma.post
      .delete({
        where: {
          id: postId,
          authorId: userId,
        },
      })
      .catch(() => null); // Prisma akan throw error jika tidak menemukan (bukan return null), jadi kita tangani error jadi null

    if (!result) throw new UnauthorizedException();

    return !!result;
  }
}
