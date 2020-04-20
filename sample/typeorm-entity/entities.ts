import { IsUnique } from "./validators/IsUnique";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";

export abstract class AbstractEntity {
    @PrimaryGeneratedColumn()
    id: number;
}

@IsUnique<User>(["firstName", "lastName"])
@Entity()
export class User extends AbstractEntity {
    @Column()
    firstName: string;

    @Column()
    lastName: string;
}

@Entity()
export class Category extends AbstractEntity {
    @Column()
    name: string;
}

@IsUnique<Article>(["title", "category"], { message: "Title should be unique among a category" })
@Entity()
export class Article extends AbstractEntity {
    @Column()
    title: string;

    @ManyToOne(() => Category)
    category: Category;
}

export type EntityKeys<T extends AbstractEntity> = {
    [K in keyof T]: T[K] extends AbstractEntity ? K : never;
}[keyof T];
