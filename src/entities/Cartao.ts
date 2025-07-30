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
    MASTERCARD = "mastercard",
    VISA = "visa",
    ELO = "elo",
    AMEX = "amex",
}

@Entity("cartoes")
export class Cartao {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => UsuarioConta, (conta) => conta.cartoes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "usuario_conta_id" })
    usuarioConta: UsuarioConta;

    @Column({ type: "simple-enum", enum: TipoCartao })
    tipo: TipoCartao;

    @Column({ type: "simple-enum", enum: TitularidadeCartao, default: TitularidadeCartao.TITULAR })
    titularidade: TitularidadeCartao;

    @Column({ type: "simple-enum", enum: BandeiraCartao })
    bandeira: BandeiraCartao;

    @Column("varchar", { length: 19 }) // Formato: 5XXX XXXX XXXX XXXX
    numero: string;

    @Column("varchar", { length: 3 })
    cvv: string;

    @Column("varchar")
    dataValidade: string; // Formato: MM/YY

    @Column({ type: "simple-enum", enum: StatusCartao, default: StatusCartao.ATIVO })
    status: StatusCartao;

    @Column("float", { nullable: true }) // Limite é aplicável apenas a cartões de crédito
    limite: number | null;

    @CreateDateColumn()
    dataCriacao: Date;
}