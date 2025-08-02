// src/entities/Movimentacao.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { UsuarioConta } from "./UsuarioConta";

export enum TipoMovimentacao {
    TRANSFERENCIA_ENVIADA = "transferencia_enviada",
    TRANSFERENCIA_RECEBIDA = "transferencia_recebida",
    COMPRA_CREDITO = "compra_credito",
    PAGAMENTO_FATURA = "pagamento_fatura",
    DEPOSITO = "deposito"
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

    @Column("text", { nullable: true })
    agenciaDestino?: string;

    @Column("text", { nullable: true })
    contaDestino?: string;

    @Column("text", { nullable: true })
    estabelecimento?: string;

    @ManyToOne(() => UsuarioConta, usuarioConta => usuarioConta.movimentacoes)
    usuarioConta!: UsuarioConta;

    @CreateDateColumn()
    data!: Date;

    @UpdateDateColumn()
    dataAtualizacao!: Date;
}
