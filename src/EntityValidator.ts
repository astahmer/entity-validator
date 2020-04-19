import { ValidationError, ValidationArguments, ValidationOptions } from "class-validator";
import { ObjectLiteral, isPromise, ObjectType } from "./utils";
import {
    EntityValidatorFunctionOptions,
    getEntityValidatorMetadata,
    EntityValidatorTypeUnion,
    EntityValidatorFunction,
} from "./decorator";

/**
 * Handle validation at the entity level
 * Which could be used for authentication, database unique checks, multi-fields conditions, etc...
 */
export class EntityValidator {
    /** Execute all registered validators on entity */
    async execute<T extends ObjectLiteral>(
        entity: T,
        options: EntityValidatorFunctionOptions = {}
    ): Promise<ValidationError[]> {
        const groups = options.groups || [];

        const metadata = getEntityValidatorMetadata(entity.constructor);
        if (!metadata) return [];

        const promises = [];
        const errors: ValidationError[] = [];

        for (const key in metadata) {
            if (metadata.hasOwnProperty(key)) {
                const config = metadata[key];

                // Only validate if execute validation groups has at least 1 in common with decorator validator's config groups
                // Or if always validating
                const shouldCheckGroups = !config.options?.always && config.options?.groups?.length;
                const shouldValidate =
                    shouldCheckGroups &&
                    config.options.groups.some((configGroup) =>
                        groups.some((validationGroup: string) => configGroup === validationGroup)
                    );
                if (shouldCheckGroups && !shouldValidate) {
                    return;
                }

                const result = this.validate(entity, config, options);
                const onFinished = (result: boolean) => !result && errors.push(this.makeError(entity, config));

                if (isPromise(result)) {
                    const wrappedPromise = new Promise(async (resolve) => {
                        try {
                            const isValid = await result;
                            onFinished(isValid);
                            resolve();
                        } catch (error) {
                            console.error(
                                `Async validation error for validator ${config.name} on entity ${entity.constructor.name}#${entity.id}`
                            );
                            console.error(error);
                            resolve();
                        }
                    });
                    promises.push(wrappedPromise);
                } else if (!result) {
                    onFinished(result);
                }
            }
        }

        if (promises.length) {
            await Promise.all(promises);
        }

        return errors;
    }

    /** Call a validator's validate function with given config on entity */
    validate<T extends ObjectLiteral, Context = any>(
        entity: T,
        config: EntityValidatorConfig<T>,
        options: EntityValidatorFunctionOptions<T>
    ) {
        const args: EntityValidationArguments<T, Context> = {
            value: entity,
            object: entity.constructor,
            targetName: entity.constructor?.name,
            data: config.data,
            property: config.property,
            context: options.context,
        };

        const validateFn = config.validator instanceof Function ? config.validator : config.validator.validate;

        return validateFn(entity, args);
    }

    /** Generates a ValidationError with given config on entity */
    makeError<T extends ObjectLiteral>(entity: T, config: EntityValidatorConfig<T>): ValidationError {
        // TODO Message token + messageFn with args ? (extends interface.message)
        const message = config.options?.message || config.defaultMessage;
        const errorMessage = message
            ? message instanceof Function
                ? message(entity as any) // TODO Fix message/defaultMessage method signature
                : message
            : `Failed validation cause of constraint '${config.name}'`;

        return {
            constraints: { [config.name]: errorMessage },
            children: [],
            property: config.property || "class",
        };
    }
}

/** Validator config to pass to registerEntityDecorator & stored in metadata */
export type EntityValidatorConfig<T extends ObjectLiteral, Data = any, U = EntityValidatorTypeUnion<T>> = {
    /** Key that will be used in constraints */
    name: string;
    /** Default validation error message */
    defaultMessage?: EntityValidatorOptions["message"];
    options?: EntityValidatorOptions;
    validator: U extends EntityValidatorConstraintInterface<T>
        ? EntityValidatorConstraintInterface<T>
        : EntityValidatorFunction<T>;
    /** Custom data to pass as decorator args & to be used by the custom validator */
    data?: Data;
    property?: string;
};
/** Interface to implement for custom EntityValidator */
export interface EntityValidatorConstraintInterface<T extends ObjectLiteral = any> {
    validate(value: T, validationArguments?: EntityValidationArguments<T>): Promise<boolean> | boolean;
}
/** Arguments passed to validate function */
export interface EntityValidationArguments<T extends ObjectLiteral = any, Data = any, Context = any>
    extends Pick<ValidationArguments, "value" | "object" | "targetName" | "property"> {
    /** Entity being validated */
    value: T;
    /** Class of entity being validated */
    object: ObjectType<T>;
    /** Custom data to pass to validator function */
    data?: Data;
    /** Request state if coming from regular entity routes */
    context?: Context;
}

/** EntityValidator decorator options */
export interface EntityValidatorOptions extends ValidationOptions {
    /** Property on which the constraint failed */
    property?: string;
}
