// src/entities/UsuarioConta.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from "typeorm";
import { Cartao } from "./Cartao";

export enum UserRole {
    ADMIN = "admin",
}

@Entity("usuarios_contas")
export class UsuarioConta {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column("varchar", { length: 100 })
    nomeCompleto: string;

    @Column("varchar", { unique: true })
    @Index({ unique: true })
    cpf: string;

    // NOVO: Adicionamos os campos de agência e número da conta.
    @Column("varchar", { length: 4, default: "0001" })
    agencia: string;

    @Column("varchar", { length: 8, unique: true })
    numeroConta: string;

    @Column("varchar", { select: false })
    senha: string;

    @Column({
        type: "simple-enum",
        enum: UserRole,
        default: UserRole.ADMIN
    })
    role: UserRole;

    @Column("float", { default: 1000.00 })
    limiteCredito: number;

    @Column("boolean", { default: true })
    ativo: boolean;

    @Column("boolean", { default: false })
    contaBloqueada: boolean;

    @Column("float", { default: 5000.00 })
    limiteDebitoDiario: number;

    @OneToMany(() => Cartao, (cartao) => cartao.usuarioConta, { cascade: true }) // Adicionado cascade para facilitar
    cartoes: Cartao[];

    @CreateDateColumn()
    dataCriacao: Date;

    @UpdateDateColumn()
    dataAtualizacao: Date;
}