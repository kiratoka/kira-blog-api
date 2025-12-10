import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    // Cek apakah context untuk GraphQL atau REST
    if (context.getType() === 'http') {
      // Untuk REST API, ambil req dari HTTP context
      return context.switchToHttp().getRequest();
    }
    // Untuk GraphQL, ambil req dari Gql context
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}

// Kenapa masih not found 404? Biasanya 404 berarti endpoint/route memang TIDAK ADA atau tidak terdaftar, bukan karena masalah guard/JWT.
// Jika Authorization/token salah/kurang, biasanya status 401/403, bukan 404. Periksa apakah endpoint dan route sudah terdaftar di module, path dan HTTP method sudah benar, serta tidak ada salah penulisan route/controller-nya.
// Kalau pakai NestJS, pastikan module, controller, dan rutenya sudah benar dan terimport di AppModule.
