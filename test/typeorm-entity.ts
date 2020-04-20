import { Connection, createConnection } from "typeorm";
import { User, Article, Category } from "$/sample/typeorm-entity/entities";
import { expect } from "chai";
import { EntityValidator } from "@/EntityValidator";

let connection: Connection;
beforeEach(createTestConnection);
afterEach(closeTestConnection);

const validator = new EntityValidator();

describe("Typeorm entities", () => {
    it("@IsUnique as entity decorator with multi-fields check", async () => {
        const manager = connection.manager;

        // User 1 should fail
        const user = new User();
        user.id = 1;
        user.firstName = "Alexandre";
        user.lastName = "Stahmer";

        const errors = await validator.execute(user);
        expect(errors).to.be.an("array").that.is.empty;
        await manager.save(user);

        // User 2 should pass
        const user2 = new User();
        user2.id = 2;
        user2.firstName = "Micheal";
        user2.lastName = "Jackson";

        const errors2 = await validator.execute(user2);
        expect(errors2).to.be.an("array").that.is.empty;
        await manager.save(user2);

        // User 3 should fail
        const user3 = new User();
        user3.id = 3;
        user3.firstName = "Alexandre";
        user3.lastName = "Stahmer";

        const [uniqueError] = await validator.execute(user3);
        expect(uniqueError.constraints).to.have.property("IsUnique");
        expect(uniqueError.property).to.be.equal("firstName, lastName");
    });

    it("@IsUnique as property decorator with multi-fields & relation", async () => {
        const manager = connection.manager;

        const cat = new Category();
        cat.id = 1;
        cat.name = "First category";
        await manager.save(cat);

        // Article 1 should pass
        const article = new Article();
        article.id = 1;
        article.title = "First article";
        article.category = cat;

        const articleErrors = await validator.execute(article);
        expect(articleErrors).to.be.an("array").that.is.empty;
        manager.save(article);

        // Article 2 should pass
        const article2 = new Article();
        article2.id = 2;
        article2.title = "Lorem ipsum";
        article2.category = cat;

        const articleErrors2 = await validator.execute(article2);
        expect(articleErrors2).to.be.an("array").that.is.empty;
        manager.save(article2);

        // Article 3 should pass
        // since validation execution has no group in common with those registered on decorator (["article_create"])
        // and therefore validator will be ignored
        const article3 = new Article();
        article3.id = 3;
        article3.title = "Lorem ipsum";
        article3.category = cat;

        const articleErrors3 = await validator.execute(article3);
        expect(articleErrors3).to.be.an("array").that.is.empty;
        manager.save(article3);

        // Article 3 should fail
        const article4 = new Article();
        article4.id = 4;
        article4.title = "First article";
        article4.category = cat;

        const [uniqueError] = await validator.execute(article4, { context: "dev" });
        expect(uniqueError.constraints).to.have.property("IsUnique");
        expect(uniqueError.property).to.be.equal("title, category");
    });
});

export async function createTestConnection() {
    connection = await createConnection({
        type: "sqljs",
        entities: [User, Article, Category],
        logging: false,
        dropSchema: true, // Isolate each test case
        synchronize: true,
    });
}
export async function closeTestConnection() {
    await connection?.close();
}
