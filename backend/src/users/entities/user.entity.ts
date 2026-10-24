import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { Role } from '../../auth/role.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', default: Role.User })
  role: Role;

  @Column({ length: 100, unique: true })
  username: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  passwordHash: string | null;
}
