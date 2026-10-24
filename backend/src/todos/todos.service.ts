import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTodoDto } from './dto/create-todo.dto.js';
import { UpdateTodoDto } from './dto/update-todo.dto.js';
import { Todo } from './entities/todo.entity.js';

@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(Todo)
    private readonly todosRepository: Repository<Todo>,
  ) {}

  findAll(ownerId: number): Promise<Todo[]> {
    return this.todosRepository.find({ where: { ownerId } });
  }

  async findOne(id: number, ownerId: number): Promise<Todo> {
    const todo = await this.todosRepository.findOneBy({ id, ownerId });
    if (!todo) throw new NotFoundException(`Todo #${id} not found`);
    return todo;
  }

  async create(createTodoDto: CreateTodoDto, ownerId: number): Promise<Todo> {
    const todo = this.todosRepository.create({
      ...createTodoDto,
      ownerId,
      title: createTodoDto.title.trim(),
    });
    return this.todosRepository.save(todo);
  }

  async update(
    id: number,
    updateTodoDto: UpdateTodoDto,
    ownerId: number,
  ): Promise<Todo> {
    const todo = await this.findOne(id, ownerId);
    if (updateTodoDto.status !== undefined) todo.status = updateTodoDto.status;
    if (updateTodoDto.priority !== undefined)
      todo.priority = updateTodoDto.priority;
    if (updateTodoDto.title !== undefined) {
      todo.title = updateTodoDto.title.trim();
    }
    return this.todosRepository.save(todo);
  }

  async remove(id: number, ownerId: number): Promise<void> {
    const todo = await this.findOne(id, ownerId);
    await this.todosRepository.remove(todo);
  }
}
