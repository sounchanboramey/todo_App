import { Column, Entity, PrimaryColumn } from 'typeorm';
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryColumn('uuid')
  id: string;
  @Column()
  userId: number;
  @Column({ select: false })
  tokenHash: string;
  @Column({ type: 'timestamptz' })
  expiresAt: Date;
}
