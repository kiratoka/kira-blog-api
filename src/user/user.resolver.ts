// src/user/user.resolver.ts
import { Resolver, Query, Mutation, Args, ResolveField, Parent } from '@nestjs/graphql';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { CreateUserInput } from './dto/create-user.input';
@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) { }


  @Mutation((returns) => User)
  createUser(
    @Args('createUserInput') createUserInput: CreateUserInput,
  ): Promise<User> {
    // jangan await jika langsung return Promise (lebih optimal)
    return this.userService.create(createUserInput);
  }

  
}
