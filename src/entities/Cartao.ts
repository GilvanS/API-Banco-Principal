// src/entities/Cartao.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { UsuarioConta } from "./UsuarioConta";

export enum TipoCartao {
    DEBITO = "debito",
    CREDITO = "credito",
}

export enum StatusCartao {
    ATIVO = "ativo",
    BLOQUEADO = "bloqueado",
}

export enum TitularidadeCartao {
    TITULAR = "titular",
    ADICIONAL = "adicional",
}

export enum BandeiraCartao {
    MASTER = "master",
    MASTERCARD = "mastercard",
    VISA = "visa",
    ELO = "elo",
    AMEX = "amex",
}

@Entity("cartoes")
export class Cartao {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => UsuarioConta, (conta) => conta.cartoes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "usuario_conta_id" })
    usuarioConta!: UsuarioConta;

    @Column({ type: "simple-enum", enum: TipoCartao })
    tipo!: TipoCartao;

    @Column({ type: "simple-enum", enum: TitularidadeCartao, default: TitularidadeCartao.TITULAR })
    titularidade!: TitularidadeCartao;

    @Column({ type: "simple-enum", enum: BandeiraCartao })
    bandeira!: BandeiraCartao;

    @Column("varchar", { length: 19 }) // Formato: 5XXX XXXX XXXX XXXX
    numero!: string;

    @Column("varchar", { length: 3 })
    cvv!: string;

    @Column("varchar", { length: 4, nullable: true, select: false }) // PIN para débito, não selecionado por padrão
    pin!: string | null;

    @Column("varchar")
    dataValidade!: string; // Formato: MM/YY

    @Column({ type: "simple-enum", enum: StatusCartao, default: StatusCartao.ATIVO })
    status!: StatusCartao;

    @Column("float", { nullable: true }) // Limite é aplicável apenas a cartões de crédito
    limite!: number | null;

    @Column({
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0
    })
    faturaAtual!: number;

    @Column({
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0
    })
    limiteDisponivel!: number;

    @Column({
        type: 'date',
        nullable: true
    })
    dataVencimentoFatura?: Date;

    @Column({
        type: 'date',
        nullable: true
    })
    dataFechamentoFatura?: Date;

    @Column({
        type: 'boolean',
        default: true
    })
    ativo!: boolean;

    @Column({
        type: 'varchar',
        length: 100,
        nullable: true
    })
    motivoBloqueio?: string;

    @Column({
        type: 'boolean',
        default: false
    })
    isVirtual!: boolean;

    @Column({
        type: 'boolean',
        default: true
    })
    permiteCompraOnline!: boolean;

    @Column({
        type: 'boolean',
        default: true
    })
    permiteCompraExterior!: boolean;

    @Column({
        type: 'boolean',
        default: true
    })
    permiteSaque!: boolean;

    @CreateDateColumn()
    dataCriacao!: Date;
}