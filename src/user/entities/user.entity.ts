import { ObjectType, Field, Int } from '@nestjs/graphql';
import { CommentEntity } from 'src/comment/entities/comment.entity';
import { Post } from 'src/post/entities/post.entity';

@ObjectType()
export class User {
  @Field(type => Int)
  id: number;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field(type => String, { nullable: true })
  bio?: string | null;

  @Field(type => String, { nullable: true })
  avatar?: string | null;

  @Field(type => [Post], { nullable: true })
  posts?: Post[];

  @Field(type => [CommentEntity], { nullable: true })
  comments?: CommentEntity[];
}