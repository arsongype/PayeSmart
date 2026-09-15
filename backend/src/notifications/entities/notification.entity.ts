import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ name: 'user_id' })
  userId: number

  @Column()
  title: string

  @Column({ type: 'text' })
  message: string

  @Column({ default: false, name: 'is_read' })
  isRead: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}