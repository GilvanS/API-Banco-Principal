import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UsuarioConta } from './UsuarioConta';

export enum TipoCriptomoeda {
  BITCOIN = 'BITCOIN',
  ETHEREUM = 'ETHEREUM'
}

export enum StatusCriptoInvestimento {
  ATIVO = 'ATIVO',
  VENDIDO = 'VENDIDO'
}

@Entity('crypto_investments')
export class CryptoInvestment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 20
  })
  tipoCriptomoeda!: TipoCriptomoeda;

  @Column({
    type: 'decimal',
    precision: 20,
    scale: 8
  })
  quantidade!: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2
  })
  valorCompra!: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 8
  })
  precoUnitarioCompra!: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 8,
    nullable: true
  })
  precoUnitarioVenda?: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true
  })
  valorVenda?: number;

  @Column({
    type: 'varchar',
    length: 20
  })
  status!: StatusCriptoInvestimento;

  @Column({
    type: 'datetime',
    nullable: true
  })
  dataVenda?: Date;

  @ManyToOne(() => UsuarioConta, usuarioConta => usuarioConta.investments)
  usuarioConta!: UsuarioConta;

  @CreateDateColumn({ type: 'datetime' })
  dataCriacao!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  dataAtualizacao!: Date;
}