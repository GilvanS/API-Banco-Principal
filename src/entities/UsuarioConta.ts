// src/entities/UsuarioConta.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from "typeorm";
import { Cartao } from "./Cartao";
import { Movimentacao } from "./Movimentacao";
import { Investment } from "./Investment";
import { Device } from "./Device";

export enum UserRole {
    ADMIN = "admin",
    OPERADOR = "operador"
}

@Entity("usuarios_contas")
export class UsuarioConta {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    nomeCompleto!: string;

    @Column({ unique: true })
    cpf!: string;

    // NOVO: Adicionamos os campos de agência e número da conta.
    @Column({ default: "0001" })
    agencia!: string;

    @Column({ unique: true })
    numeroConta!: string;

    @Column({ select: false })
    senha!: string;

    @Column({
        type: "varchar",
        length: 20,
        default: UserRole.OPERADOR
    })
    role!: UserRole;

    @Column("decimal", { precision: 10, scale: 2, default: 1000 })
    limiteCredito!: number;

    @Column("decimal", { precision: 10, scale: 2, default: 0 })
    creditoUtilizado!: number;

    @Column("decimal", { precision: 10, scale: 2, default: 200 })
    saldo!: number;

    @Column({ default: true })
    ativo!: boolean;

    @Column({ default: false })
    contaBloqueada!: boolean;

    @Column("decimal", { precision: 10, scale: 2, default: 5000 })
    limiteDebitoDiario!: number;

    @OneToMany(() => Cartao, (cartao) => cartao.usuarioConta, { cascade: true }) // Adicionado cascade para facilitar
    cartoes!: Cartao[];

    @OneToMany(() => Movimentacao, movimentacao => movimentacao.usuarioConta)
    movimentacoes!: Movimentacao[];

    @OneToMany(() => Investment, investment => investment.usuarioConta)
    investments!: Investment[];

    @OneToMany(() => Device, device => device.usuarioConta)
    devices!: Device[];

    @Column({
        type: 'varchar',
        length: 15,
        nullable: true
    })
    telefone?: string;

    @Column({
        type: 'varchar',
        length: 100,
        nullable: true
    })
    email?: string;

    @Column({
        type: 'date',
        nullable: true
    })
    dataNascimento?: Date;

    @Column({
        type: 'varchar',
        length: 200,
        nullable: true
    })
    endereco?: string;

    @Column({
        type: 'boolean',
        default: true
    })
    notificacoesPush!: boolean;

    @Column({
        type: 'boolean',
        default: true
    })
    notificacoesEmail!: boolean;

    @Column({
        type: 'boolean',
        default: true
    })
    notificacoesSms!: boolean;

    @CreateDateColumn()
    dataCriacao!: Date;

    @UpdateDateColumn()
    dataAtualizacao!: Date;
}