import { ValidationOptions } from "class-validator";
import { AbstractEntity } from "../entities";
import {
    EntityValidatorConstraintInterface,
    EntityValidationArguments,
    EntityValidatorOptions,
} from "@/EntityValidator";
import { registerEntityDecorator } from "@/decorator";
import { NonFunctionKeys } from "$/sample/common";
import { getConnection } from "typeorm";

class IsUniqueValidator<T extends AbstractEntity> implements EntityValidatorConstraintInterface<T> {
    async validate(item: T, args: EntityValidationArguments<T, IsUniqueData<T>>) {
        const fields = args.data.fields;
        const repository = getConnection().getRepository(args.object);
        const metadata = repository.metadata;
        const query = repository.createQueryBuilder(args.targetName).select(args.targetName + ".id");

        let usedFields = 0;
        let i = 0;
        for (i; i < fields.length; i++) {
            const prop = fields[i];
            const isRelation = metadata.findRelationWithPropertyPath(prop as string);

            const paramName = isRelation ? prop + "Id" : prop;
            const value = typeof item[prop] === "object" ? ((item[prop] as any) as AbstractEntity).id : item[prop];
            if (!value) continue;
            usedFields++;

            query.andWhere(`${args.targetName}.${prop} = :${paramName}`, { [paramName]: value });
        }

        // If not all fields were used for a where condition, then there is no need to check for unicity
        if (usedFields !== fields.length) {
            return true;
        }

        const result = await query.getOne();

        return !result;
    }
}

export type IsUniqueData<T extends AbstractEntity> = { fields: NonFunctionKeys<T>[] };
/**
 * Checks that an entity doesn't already exist with same fields values
 *
 * @example
 * [at]IsUnique(["image", "owner"]) as ClassDecorator
 * [at]IsUnique({ groups: ["meme_create", "update"]}) as PropertyDecorator
 */
export function IsUnique<T extends AbstractEntity>(options?: ValidationOptions): PropertyDecorator;
export function IsUnique<T extends AbstractEntity>(
    fields: NonFunctionKeys<T>[],
    options?: EntityValidatorOptions
): ClassDecorator;
export function IsUnique<T extends AbstractEntity>(
    fieldsOrOptions: NonFunctionKeys<T>[] | EntityValidatorOptions,
    options?: EntityValidatorOptions
): PropertyDecorator | ClassDecorator {
    return (target, propName: string) => {
        // If propName is defined => PropertyDecorator, else it's a ClassDecorator
        const isPropDecorator = !!propName;
        target = isPropDecorator ? target.constructor : target;
        options = isPropDecorator ? (fieldsOrOptions as EntityValidatorOptions) : options;

        const fields = isPropDecorator ? [propName] : fieldsOrOptions;
        const className = (target as any)?.name;

        const defaultProperty = isPropDecorator ? propName : (fields as string[]).join(", ");
        const defaultMessage = `Another <${className}> entity already exists with unique constraints on : <${defaultProperty}>`;

        const property = options?.property || defaultProperty;

        registerEntityDecorator({
            name: "IsUnique",
            target,
            options,
            validator: new IsUniqueValidator(),
            data: { fields } as IsUniqueData<T>,
            defaultMessage,
            property,
        });
    };
}
