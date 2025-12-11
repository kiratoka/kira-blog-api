import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CreatePostInput } from './dto/create-post.input';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { PostService } from './post.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FILE_SIZE } from 'src/constants';
import { UpdatePostInput } from './dto/update-post.input';

@Controller('post')
export class PostController {
  constructor(private postService: PostService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('thumbnail', {
      storage: memoryStorage(),
      limits: { fileSize: FILE_SIZE },
    }),
  )
  async create(
    @Body() dto: any,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    const userId = req.user.id;

    if (dto.published !== undefined) {
      dto.isPublished = dto.published === 'true' || dto.published === true;
    }
    // tags: parse jika datang dalam bentuk stringified array
    if (dto.tags && typeof dto.tags === 'string') {
      try {
        dto.tags = JSON.parse(dto.tags);
      } catch {
        dto.tags = [];
      }
    }

    return await this.postService.createPost({
      userId,
      dto: dto as CreatePostInput,
      file,
    });
  }

  // PATCH bisa menerima file yang optional. Jika tidak ada file yang diupload, file akan jadi undefined/null.
  // Tinggal pastikan di service-nya, kalau file undefined maka logika update-nya jangan update thumbnail/path.

  @UseGuards(JwtAuthGuard)
  @Patch()
  @UseInterceptors(
    FileInterceptor('thumbnail', {
      storage: memoryStorage(),
      limits: { fileSize: FILE_SIZE },
    }),
  )
  async update(
    @Body() dto: UpdatePostInput,
    @UploadedFile() file: Express.Multer.File | undefined, // file bisa undefined kalau user tidak upload file baru
    @Req() req,
  ) {
    const userId = req.user.id;


    // Baris ini sebenarnya mirip logika di create(), tujuannya untuk memastikan
    // field published di DTO dikonversi dari string (bila dikirim "true"/"false" dari FormData)
    // menjadi boolean. Tapi, di baris ini terjadi typo dengan memakai "isPublished", padahal
    // di DTO/entitas field-nya "published" (bukan isPublished!). Jadi, assignment ini tidak ada efek,
    // dan seharusnya cukup:
    // Kenapa di create post meskipun pakai @IsBoolean pada field published tidak error, padahal field yang dikirim lewat FormData (dari FE) adalah string ("true"/"false")?
    // Jawabannya: pada create(), parameternya adalah @Body() dto: any (bukan CreatePostInput). Jadi, validasi class-validator (seperti @IsBoolean) TIDAK DIJALANKAN oleh pipe NestJS,
    // sehingga method controller tetap dieksekusi walaupun field published masih string (atau bahkan tidak sesuai tipe).
    // Proses konversi tipe (string->boolean) dilakukan manual di controller sebelum diteruskan ke service.
    // 
    // Sedangkan pada update(), param-nya adalah @Body() dto: UpdatePostInput dan pakai decorator dari class-validator.
    // Untuk request PATCH berisi multipart/form-data (FormData) yang mengirim boolean/array sebagai string, pipe NestJS akan mencoba mem-build DTO/validate,
    // tapi gagal karena published seharusnya boolean, sedangkan data "true"/"false" (string) tidak lolos validasi @IsBoolean.
    // Akibatnya, method handler TIDAK DIPANGGIL dan error langsung dilempar oleh NestJS (misal: Bad Request karena validation failed).
    // 
    // Singkatnya:
    // - create() tidak error karena pakai any → tidak ada validasi pipe DTO di controller
    // - update() error jika tipe data tidak cocok DTO+validator, terutama pada multipart/form-data
    // Solusi: kalau ingin handle parsing custom, pakai @Body() dto: any lalu parsing/konversi/validasi manual di controller sebelum dilempar ke service.

    if (dto.tags && typeof dto.tags === 'string') {
      try {
        dto.tags = JSON.parse(dto.tags);
      } catch {
        dto.tags = [];
      }
    }

    return await this.postService.updatePost({
      userId,
      dto,
      file, // file bisa undefined/null; service harus handle kalau tidak ada file baru
    });
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  async delete(@Body() body: { postId: number; path: string }, @Req() req) {
    const userId = req.user.id;
    const { postId, path } = body;
    // Pastikan postId ada dan bertipe number
    if (!postId || typeof postId !== 'number') {
      throw new BadRequestException('postId is required and must be a number');
    }
    // Panggil service
    return await this.postService.deletePost({ postId, userId, path });
  }
}
