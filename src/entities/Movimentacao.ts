// src/entities/Movimentacao.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { UsuarioConta } from "./UsuarioConta";

export enum TipoMovimentacao {
    DEPOSITO = 'DEPOSITO',
    SAQUE = 'SAQUE',
    TRANSFERENCIA = 'TRANSFERENCIA',
    TRANSFERENCIA_ENVIADA = 'TRANSFERENCIA_ENVIADA',
    TRANSFERENCIA_RECEBIDA = 'TRANSFERENCIA_RECEBIDA',
    PIX = 'PIX',
    PIX_ENVIADO = 'PIX_ENVIADO',
    PIX_RECEBIDO = 'PIX_RECEBIDO',
    PAGAMENTO_DEBITO = 'PAGAMENTO_DEBITO',
    PAGAMENTO_CREDITO = 'PAGAMENTO_CREDITO',
    PAGAMENTO_CARTAO = 'PAGAMENTO_CARTAO',
    PAGAMENTO_FATURA = 'PAGAMENTO_FATURA',
    INVESTIMENTO = 'INVESTIMENTO',
    RESGATE_INVESTIMENTO = 'RESGATE_INVESTIMENTO',
    RENDIMENTO = 'RENDIMENTO',
    TAXA = 'TAXA',
    ESTORNO = 'ESTORNO'
}

@Entity("movimentacoes")
export class Movimentacao {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({
        type: "varchar",
        length: 50
    })
    tipo!: string;

    @Column("decimal", { precision: 10, scale: 2 })
    valor!: number;

    @Column("text")
    descricao!: string;

    @Column("text", { nullable: true })
    agenciaOrigem?: string;

    @Column("text", { nullable: true })
    contaOrigem?: string;

    @Column({
        type: 'varchar',
        length: 10,
        nullable: true
    })
    agenciaDestino?: string;

    @Column({
        type: 'varchar',
        length: 20,
        nullable: true
    })
    contaDestino?: string;

    @Column({
        type: 'varchar',
        length: 100,
        nullable: true
    })
    nomeDestinatario?: string;

    @Column({
        type: 'varchar',
        length: 50,
        nullable: true
    })
    chavePix?: string;

    @Column({
        type: 'varchar',
        length: 20,
        nullable: true
    })
    tipoChavePix?: string;

    @Column({
        type: 'varchar',
        length: 100,
        nullable: true
    })
    codigoTransacao?: string;

    @Column({
        type: 'varchar',
        length: 20,
        default: 'CONCLUIDA'
    })
    status!: string;

    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
        nullable: true
    })
    taxa?: number;

    @Column({
        type: 'varchar',
        length: 50,
        nullable: true
    })
    categoria?: string;

    @Column({
        type: 'text',
        nullable: true
    })
    observacoes?: string;

    @Column("text", { nullable: true })
    estabelecimento?: string;

    @ManyToOne(() => UsuarioConta, usuarioConta => usuarioConta.movimentacoes)
    usuarioConta!: UsuarioConta;

    @CreateDateColumn()
    dataCriacao!: Date;

    @UpdateDateColumn()
    dataAtualizacao!: Date;
}
