import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UsuarioConta } from './UsuarioConta';

export enum TipoInvestimento {
  CDB = 'CDB',
  LCI = 'LCI',
  LCA = 'LCA',
  TESOURO_DIRETO = 'TESOURO_DIRETO',
  FUNDO_RENDA_FIXA = 'FUNDO_RENDA_FIXA',
  FUNDO_MULTIMERCADO = 'FUNDO_MULTIMERCADO',
  POUPANCA = 'POUPANCA'
}

export enum StatusInvestimento {
  ATIVO = 'ATIVO',
  VENCIDO = 'VENCIDO',
  RESGATADO = 'RESGATADO',
  CANCELADO = 'CANCELADO'
}

@Entity('investments')
export class Investment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 50
  })
  tipo!: TipoInvestimento;

  @Column({
    type: 'varchar',
    length: 100
  })
  nome!: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2
  })
  valorInvestido!: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2
  })
  valorAtual!: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2
  })
  rentabilidade!: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2
  })
  taxaRendimento!: number;

  @Column({
    type: 'date'
  })
  dataVencimento!: Date;

  @Column({
    type: 'varchar',
    length: 20
  })
  status!: StatusInvestimento;

  @Column({
    type: 'boolean',
    default: true
  })
  permiteResgate!: boolean;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true
  })
  valorMinimoAplicacao?: number;

  @Column({
    type: 'text',
    nullable: true
  })
  descricao?: string;

  @ManyToOne(() => UsuarioConta, usuarioConta => usuarioConta.investments)
  usuarioConta!: UsuarioConta;

  @CreateDateColumn()
  dataCriacao!: Date;

  @UpdateDateColumn()
  dataAtualizacao!: Date;
}