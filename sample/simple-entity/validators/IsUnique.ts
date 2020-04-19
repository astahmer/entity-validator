import { ValidationOptions } from "class-validator";
import { AbstractEntity, EntityKeys, NonFunctionKeys } from "../entities";
import { EntityValidatorConstraintInterface, EntityValidationArguments, EntityValidatorOptions } from "EntityValidator";
import { registerEntityDecorator } from "decorator";

class IsUniqueValidator<T extends AbstractEntity> implements EntityValidatorConstraintInterface<T> {
    async validate(item: T, args: EntityValidationArguments<T, IsUniqueData<T>>) {
        const fields = args.data.fields;
        const store = args.context?.store as T[];
        if (!store) return;

        const entity = store.find((entity) => fields.every((field) => entity[field] === item[field]));

        return !entity;
    }
}

export type IsUniqueData<T extends AbstractEntity> = { fields: EntityKeys<T>[] };
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
