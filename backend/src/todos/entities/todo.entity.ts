import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Todo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', nullable: true })
  ownerId: number | null;

  @Column({ length: 200 })
  title: string;

  @Column({ default: 'TODO' })
  status: string;

  @Column({ default: false })
  priority: boolean;
}
