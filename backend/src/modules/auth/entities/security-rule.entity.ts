import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('security_rules')
export class SecurityRule {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ type: 'varchar', length: 120, name: 'rule_name' })
  ruleName: string

  @Column({ type: 'varchar', length: 50, name: 'rule_type' })
  ruleType: string

  @Column({ type: 'json', name: 'conditions' })
  conditions: Record<string, unknown>

  @Column({ type: 'json', name: 'actions' })
  actions: Record<string, unknown>

  @Column({ default: true, name: 'is_active' })
  isActive: boolean

  @Column({ type: 'integer', default: 0, name: 'priority' })
  priority: number

  @Column({ type: 'text', nullable: true, name: 'description' })
  description: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
