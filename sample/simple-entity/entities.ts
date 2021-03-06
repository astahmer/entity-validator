import { IsUnique } from "./validators/IsUnique";

export abstract class AbstractEntity {
    id: number;
}

@IsUnique<User>(["firstName", "lastName"])
export class User extends AbstractEntity {
    firstName: string;
    lastName: string;
    roles: Role[];
}

export class Role extends AbstractEntity {
    name: string;
}

export class Article extends AbstractEntity {
    @IsUnique<Article>({ message: "Title should be unique", groups: ["article_create"] })
    title: string;
    owner: User;
}

export type EntityKeys<T extends AbstractEntity> = {
    [K in keyof T]: T[K] extends AbstractEntity ? K : never;
}[keyof T];
