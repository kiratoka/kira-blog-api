import { Body, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { CreatePostInput } from './dto/create-post.input';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { PostService } from './post.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FILE_SIZE } from 'src/constants';

@Controller('post')
export class PostController {
    constructor(private postService: PostService) { }

    /**
     * Untuk tes endpoint ini di Postman:
     * 1. Pilih method POST dan endpoint /post.
     * 2. Di tab "Body", pilih "form-data".
     * 3. Tambahkan kolom berikut:
     *    - title (Text)
     *    - content (Text)
     *    - published (Text, isikan "true" atau "false")
     *    - tags (Text, contoh: ["tag1","tag2"] atau ["tutorial"])
     *    - thumbnail (File, jika ingin upload gambar)
     * 4. Pastikan menambahkan token (akses) di Header:
     *    - Key: Authorization
     *    - Value: Bearer <your_token>
     * 
     * Jangan lupa published harus "true"/"false" string, tags dalam bentuk string array (bisa JSON.stringify array).
     */
    @UseGuards(JwtAuthGuard)
    @Post()
    @UseInterceptors(
        FileInterceptor("thumbnail", {
            storage: memoryStorage(),
            limits: { fileSize: FILE_SIZE }
        })
    )
    async create(
        @Body() dto: any, // Pakai any agar Postman (form-data) tidak error parsing
        @UploadedFile() file: Express.Multer.File,
        @Req() req
    ) {
        const userId = req.user.id;

        // Coerce/convert fields jika diperlukan (karena Postman form-data semua string)
        // published: string -> boolean
        if (dto.published !== undefined) {
            dto.isPublished = dto.published === "true" || dto.published === true;
        }
        // tags: parse jika datang dalam bentuk stringified array
        if (dto.tags && typeof dto.tags === "string") {
            try {
                dto.tags = JSON.parse(dto.tags);
            } catch {
                dto.tags = [];
            }
        }

        return await this.postService.createPost({
            userId,
            dto: dto as CreatePostInput,
            file
        });
    }
}
