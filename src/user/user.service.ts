import { Injectable } from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';

import { PrismaService } from 'src/prisma/prisma.service';
import { hash } from 'argon2';
import { Prisma, User } from 'generated/prisma';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

  async create(createUserInput: CreateUserInput): Promise<User> {
    const { password, ...userData } = createUserInput as any;
    let hashedPassword: string | null = null;


    if (typeof password === 'string' && password.length > 0) {
      hashedPassword = await hash(password);
    }


    // Cast to Prisma.UserCreateInput to satisfy types. Make sure input fields match your Prisma schema.
    return this.prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      } as Prisma.UserCreateInput,
    });
  }
}