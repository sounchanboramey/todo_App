import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTodoDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsIn(['TODO', 'IN_PROGRESS', 'DONE'])
  @IsOptional()
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' = 'TODO';

  @IsBoolean()
  @IsOptional()
  priority?: boolean = false;
}
