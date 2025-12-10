import { InputType, Int, Field } from '@nestjs/graphql';
import { IsEmail } from 'class-validator';

@InputType()
export class CreateUserInput {
  @Field((type) => String)
  name: string;

  @Field((type) => String)
  password: string;

  @Field()
  @IsEmail()
  email: string;

  @Field({ nullable: true })
  bio?: string;
  @Field({ nullable: true })
  avatar?: string;
}
