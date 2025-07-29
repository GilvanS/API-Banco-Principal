// src/entities/UsuarioConta.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

// NOVO: Enum para os papéis (roles) de usuário
export enum UserRole {
    ADMIN = "admin",
    OPERADOR = "operador",
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

    @Column("varchar", { select: false })
    senha: string;

    // NOVO: Coluna para armazenar o papel do usuário
    @Column({
        type: "simple-enum",
        enum: UserRole,
        default: UserRole.OPERADOR
    })
    role: UserRole;

    @Column("float", { default: 1000.00 })
    limiteCredito: number;

    @Column("boolean", { default: false })
    contaBloqueada: boolean;

    @CreateDateColumn()
    dataCriacao: Date;

    @UpdateDateColumn()
    dataAtualizacao: Date;
}