import { ValidatorOptions } from "class-validator";
import {
    EntityValidatorConfig,
    EntityValidationArguments,
    EntityValidatorConstraintInterface,
} from "./EntityValidator";
import { ObjectLiteral } from "./utils";

export const VALIDATION_METAKEY = Symbol("validation");
export const getEntityValidatorMetadata = <T extends ObjectLiteral>(entity: Object): EntityValidatorMetadata<T> =>
    Reflect.getOwnMetadata(VALIDATION_METAKEY, entity);

/** Register custom EntityValidator decorator by passing a ValidatorConfig */
export function registerEntityDecorator<T extends ObjectLiteral>({
    name,
    target,
    ...args
}: RegisterEntityDecoratorArgs<T>) {
    const metadata = getEntityValidatorMetadata(target) || {};

    // Always validate when no groups are passed & always not explicitly false
    if ((!args.options?.groups || !args.options?.groups?.length) && !(args.options?.always === false)) {
        args.options = { ...args.options, always: true };
    }

    const config: EntityValidatorConfig<any> = { name, ...args };

    // Handle the case where there is multiple decorator of same kind on same entity
    if (metadata[name]) {
        const keys = Object.keys(metadata);
        const count = keys.reduce((acc, value) => acc + (value.startsWith(name) ? 1 : 0), 0);
        metadata[name + "." + count] = config;
    } else {
        metadata[name] = config;
    }

    Reflect.defineMetadata(VALIDATION_METAKEY, metadata, target);
}

export type RegisterEntityDecoratorArgs<T extends ObjectLiteral> = Pick<
    EntityValidatorConfig<T>,
    "name" | "defaultMessage" | "options" | "validator" | "data" | "property"
> & {
    /** Entity class constructor */
    target: Object;
};

/** Store every EntityValidatorConfig for a given entity */
export type EntityValidatorMetadata<T extends ObjectLiteral> = Record<string, EntityValidatorConfig<T>>;

/** Validator.validate function */
export type EntityValidatorFunction<T extends ObjectLiteral> = (
    value: T,
    validationArguments?: EntityValidationArguments<T>
) => Promise<boolean> | boolean;

/** EntityValidator validate function options */
export type EntityValidatorFunctionOptions<Context = any> = Pick<ValidatorOptions, "groups"> & {
    context?: Context;
};

/** Can either be a custom class implementing EntityValidatorConstraintInterface or a function with EntityValidatorFunction signature */
export type EntityValidatorTypeUnion<T extends ObjectLiteral> =
    | EntityValidatorConstraintInterface<T>
    | EntityValidatorFunction<T>;
