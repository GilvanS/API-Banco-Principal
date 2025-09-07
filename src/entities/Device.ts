import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UsuarioConta } from './UsuarioConta';

export enum TipoDispositivo {
  MOBILE = 'MOBILE',
  WEB = 'WEB',
  TABLET = 'TABLET'
}

export enum StatusDispositivo {
  ATIVO = 'ATIVO',
  BLOQUEADO = 'BLOQUEADO',
  INATIVO = 'INATIVO'
}

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 100
  })
  nome: string;

  @Column({
    type: 'varchar',
    length: 20
  })
  tipo: TipoDispositivo;

  @Column({
    type: 'varchar',
    length: 200,
    unique: true
  })
  deviceId: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true
  })
  modelo?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true
  })
  sistemaOperacional?: string;

  @Column({
    type: 'varchar',
    length: 20
  })
  status: StatusDispositivo;

  @Column({
    type: 'boolean',
    default: false
  })
  isConfiavel: boolean;

  @Column({
    type: 'datetime',
    nullable: true
  })
  ultimoAcesso?: Date;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true
  })
  ultimoIp?: string;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true
  })
  userAgent?: string;

  @ManyToOne(() => UsuarioConta, usuarioConta => usuarioConta.devices)
  usuarioConta: UsuarioConta;

  @CreateDateColumn()
  dataCriacao: Date;

  @UpdateDateColumn()
  dataAtualizacao: Date;
}