// Penjelasan error:
// Error ts-nya: "A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled."
// Artinya, jika kita menggunakan type dari package eksternal (seperti 'Response' dari 'express') pada parameter di method controller yang didekorasi oleh NestJS (@Get, dsb),
// kita harus melakukan import-nya dengan 'import type', bukan hanya 'import' biasa. Ini diperlukan agar NestJS & Typescript dapat memproses metadata tipe dengan benar pada mode isolatedModules.
//
// Cara mengatasinya:
// Ganti `import { Response } from 'express'` menjadi `import type { Response } from 'express'`

import { Controller, Get, Request, Res, UseGuards } from '@nestjs/common';
import { GoogleAuthGuard } from './guards/google-auth/google-auth.guard';
import { AuthService } from './auth.service';
// Perbaikan: gunakan import type untuk Response agar error hilang pada mode Typescript strict module
import type { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(GoogleAuthGuard)
  @Get('google/login')
  googleLogin() {}

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Request() req, @Res() res: Response) {
    // console.log("user", req.user);

    const userData = await this.authService.login(req.user);

    const frontEndUrl = this.configService.get<string>('FRONTEND_URL');

    res.redirect(
      `${frontEndUrl}/api/auth/google/callback?userId=${userData.id}&name=${userData.name}&avatar=${userData.avatar}&accessToken=${userData.accessToken}`,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify-token')
  verify() {
    return 'ok';
  }
}
