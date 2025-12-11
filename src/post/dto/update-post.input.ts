import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { TagInput } from './create-post.input';
import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class UpdatePostInput {
  @Field(() => Int)
  id: number;

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

  @Field(() => Boolean)
  published: boolean ;

  @Field(() => String, { nullable: true })
  path?: string;
}
