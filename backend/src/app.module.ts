import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { TodosController } from './todos/todos.controller.js';
import { TodosService } from './todos/todos.service.js';
import { Todo } from './todos/entities/todo.entity.js';
import { ProfileController } from './profile/profile.controller.js';
import { ProfileService } from './profile/profile.service.js';
import { Profile } from './profile/entities/profile.entity.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5433),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_DATABASE ?? 'todo',
      autoLoadEntities: true,
      // Migrations handle the schema — don't use synchronize in production.
      synchronize: false,
    }),
    TypeOrmModule.forFeature([Todo, Profile]),
  ],
  controllers: [AppController, TodosController, ProfileController],
  providers: [AppService, TodosService, ProfileService],
})
export class AppModule {}
