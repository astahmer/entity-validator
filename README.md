# entity-validator

Entity(Class) level validator based on [class-validator](https://github.com/typestack/class-validator) interfaces

# Installation

```bash
npm install @astahmer/entity-validator --save
```

# Usage

> This library doesn't provide any validator, decorator or entities.
> It only provides an easy way to make custom validators/decorators that will fit your needs.

#### EntityValidator API

```typescript
const validator = new EntityValidator();
const errors = validator.execute(entity, options);
```

The `execute` function always returns an array of errors, can be empty.
The **options** parameter is an object that accepts a **groups** to pass custom validation groups & a **context** key that can be literally anything.
The context key should be used to pass dynamic data at the moment of validation.

### registerEntityDecorator API

> Learn about typescript decorators [here](https://www.typescriptlang.org/docs/handbook/decorators.html).

Registering an entity-validator decorator is done by passing a config to `registerEntityDecorator(args: RegisterEntityDecoratorArgs)`.
`RegisterEntityDecoratorArgs` shares most keys as `EntityValidatorConfig`.

You can make both Class & Property decorators using function overloads.

```typescript
registerEntityDecorator({
    name: "IsUnique",
    target,
    options,
    validator: new IsUniqueValidator(),
    data: { fields },
    defaultMessage: "Entity is not unique",
});
```

-   The option `data` can be anything and is meant to be used to pass decorator arguments to validator.
-   The option`always` is set to true when no `groups` (undefined | groups.length === 0) are passed & `always` is not explicitly false.
    That is mostly useful for validation with default groups per request. (ex: groups: ["user", "user_create"] on POST /api/users/)

-   If you need to retrieve all metadata attached to an entity, you can use the `getEntityValidatorMetadata(entity)` function.
-   Metadatas are stored using the [reflect-metadata](https://github.com/rbuckton/reflect-metadata) library under an unique (using a Symbol) key `VALIDATION_METAKEY`.

## Example Entities

Create your class and put some validation decorators on the properties you want to validate:

### Simple class entities

_Complete code example available [here](https://github.com/astahmer/entity-validator/tree/master/sample/simple-entity)_

```typescript
import { EntityValidator, EntityValidatorFunctionOptions } from "@astahmer/entity-validator";
import { IsUnique } from "./validators/IsUnique";

@IsUnique<User>(["firstName", "lastName"])
export class User {
    id: number;
    firstName: string;
    lastName: string;
}

const validator = new EntityValidator();
const store: User[] = [];

// User 1 should pass
const user = new User();
user.id = 1;
user.firstName = "Alexandre";
user.lastName = "Stahmer";
store.push(user);
const emptyErrors = await validator.execute(user, { context: { store } });
console.log(emptyErrors); // []

// User 2 should fail
const user2 = new User();
user.id = 2;
user2.firstName = "Alexandre";
user2.lastName = "Stahmer";
const errors = await validator.execute(user2, { context: { store } });
console.log(errors);
/* errors = [
	{
	  constraints: {
	    IsUnique: 'Another <User> entity already exists with unique constraints on : <firstName, lastName>'
	  },
	  children: [],
	  property: 'firstName, lastName'
	}
];
*/
```

### [TypeORM](https://typeorm.io/) Entities

_Complete code example available [here](https://github.com/astahmer/entity-validator/tree/master/sample/typeorm-entity) or with [typeorm](https://github.com/astahmer/entity-validator/tree/master/sample/typeorm-entity)_

```typescript
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
```

## Creating a validator

### Making the validator itself

_Complete code example available [here](https://github.com/astahmer/entity-validator/tree/master/sample/simple-entity) or with [typeorm](https://github.com/astahmer/entity-validator/tree/master/sample/typeorm-entity)_
A simple implementation of a`IsUniqueValidator` could look like this :

```typescript
class IsUniqueValidator<T extends AbstractEntity> implements EntityValidatorConstraintInterface<T> {
    async validate(item: T, args: EntityValidationArguments<T, IsUniqueData<T>>) {
        const fields = args.data.fields;
        const store = args.context?.store as T[];
        if (!store) return;

        const entity = store.find((entity) => fields.every((field) => entity[field] === item[field]));

        return !entity;
    }
}
```

### Registering the validator using a custom decorator

That new validator would then be registered by passing a config to `registerEntityDecorator`

```typescript
export function IsUnique(
    fieldsOrOptions: string[] | EntityValidatorOptions,
    options?: EntityValidatorOptions
): PropertyDecorator | ClassDecorator {
    return (target, propName: string) => {
        // If propName is defined => PropertyDecorator, else it's a ClassDecorator
        const isPropDecorator = !!propName;
        target = isPropDecorator ? target.constructor : target;
        options = isPropDecorator ? (fieldsOrOptions as EntityValidatorOptions) : options;

        const fields = isPropDecorator ? [propName] : fieldsOrOptions;
        const className = (target as any)?.name;

        const defaultProperty = isPropDecorator ? propName : fields.join(", ");
        const defaultMessage = `Another <${className}> entity already exists with unique constraints on : <${defaultProperty}>`;

        const property = options?.property || defaultProperty;

        registerEntityDecorator({
            name: "IsUnique",
            target,
            options,
            validator: new IsUniqueValidator(),
            data: { fields },
            defaultMessage,
            property,
        });
    };
}
```

## As container service [(with type-di)](https://github.com/typestack/typedi)

```typescript
import Container from "typedi";
import { EntityValidator, EntityValidatorFunctionOptions } from "@astahmer/entity-validator";
import { AbstractEntity } from "@/entity/AbstractEntity";

/** Call EntityValidator.execute on entity with given options  */
export async function validateEntity<T extends AbstractEntity>(entity: T, options?: EntityValidatorFunctionOptions) {
    const validator = Container.get(EntityValidator);
    return validator.execute(entity, options);
}
```
