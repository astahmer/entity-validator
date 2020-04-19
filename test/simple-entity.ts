import "reflect-metadata";
import { expect } from "chai";
import { User, Article } from "../sample/simple-entity/entities";
import { EntityValidator } from "index";

const validator = new EntityValidator();

describe("Simple entity", () => {
    it("@IsUnique as entity decorator with multi-fields check", async () => {
        const store: User[] = [];

        // User 1 should pass
        const user = new User();
        user.id = 1;
        user.firstName = "Alexandre";
        user.lastName = "Stahmer";

        const errors = await validator.execute(user, { context: { store } });
        expect(errors).to.be.an("array").that.is.empty;
        store.push(user);

        // User 2 should pass
        const user2 = new User();
        user.id = 2;
        user2.firstName = "Micheal";
        user2.lastName = "Jackson";

        const errors2 = await validator.execute(user2, { context: { store } });
        expect(errors2).to.be.an("array").that.is.empty;
        store.push(user2);

        // User 3 should fail
        const user3 = new User();
        user.id = 3;
        user3.firstName = "Alexandre";
        user3.lastName = "Stahmer";

        const [uniqueError] = await validator.execute(user3, { context: { store } });
        expect(uniqueError.constraints).to.have.property("IsUnique");
        expect(uniqueError.property).to.be.equal("firstName, lastName");
    });

    it("@IsUnique as property decorator with groups", async () => {
        const store: Article[] = [];
        const groups = ["article_create"];

        // Article 1 should pass
        const article = new Article();
        article.id = 1;
        article.title = "First article";

        const articleErrors = await validator.execute(article, { context: { store }, groups });
        expect(articleErrors).to.be.an("array").that.is.empty;
        store.push(article);

        // Article 2 should pass
        const article2 = new Article();
        article2.id = 2;
        article2.title = "Lorem ipsum";

        const articleErrors2 = await validator.execute(article2, { context: { store }, groups });
        expect(articleErrors2).to.be.an("array").that.is.empty;
        store.push(article2);

        // Article 3 should pass
        // since validation execution has no group in common with those registered on decorator (["article_create"])
        // and therefore validator will be ignored
        const article3 = new Article();
        article3.id = 3;
        article3.title = "Lorem ipsum";

        const articleErrors3 = await validator.execute(article3, { context: { store }, groups: ["failing_group"] });
        expect(articleErrors3).to.be.an("array").that.is.empty;
        store.push(article3);

        // Article 3 should fail
        const article4 = new Article();
        article4.id = 4;
        article4.title = "First article";

        const [uniqueError] = await validator.execute(article4, { context: { store }, groups });
        expect(uniqueError.constraints).to.have.property("IsUnique");
        expect(uniqueError.property).to.be.equal("title");
    });
});
