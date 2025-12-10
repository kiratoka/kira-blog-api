import { InputType, Field } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

@InputType()
export class TagInput {
  @IsString()
  id: string;

  @IsString()
  name: string;
}

export class CreatePostInput {
  @IsString()
  @Field()
  title: string;
  @IsString()
  @Field()
  content: string;
  @IsString()
  @IsOptional()
  @Field({ nullable: true })
  thumbnail?: string;

  @IsString({ each: true })
  @Field(() => [String])
  @Field(() => [TagInput])
  tags: TagInput[];

  @IsBoolean()
  @Field(() => Boolean)
  published: boolean;
}
