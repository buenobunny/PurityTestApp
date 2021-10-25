import {PurityTest} from "./objects/PurityTest";

const { MongoClient } = require('mongodb');

const uri = process.env.DB_CONNECT;

export class DBHandler {

    private client: typeof MongoClient;
    constructor() {
        this.client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    }

    async getTests(num: number, start: number): Promise<PurityTest[] | null> {
        try {
            await this.client.connect();

            const db = this.client.db("PurityTests");
            const tests = db.collection("Tests");

            const cursor = await tests.find({ views: { $gt: 0 }},
                {sort: {likes: -1, views: -1}});

            let i: number = 0;
            const toReturn: PurityTest[] = [];
            while (i < start && !cursor.closed && cursor.hasNext) {
                await cursor.next();
                i++;
            }
            i = 0;
            while (i < num && !cursor.closed && cursor.hasNext) {
                let data = await cursor.next();
                if (data != null) {
                    let p: PurityTest | null = PurityTest.deserialize(data);
                    if (p != null) {
                        toReturn.push(p);
                    }
                }
                i++;
            }
            await this.client.close();
            return toReturn;
        } catch(e) {
            console.log(e);
            return null;
        }
    }

    async checkAlreadyExists(easyId: string): Promise<boolean> {
        try {
            await this.client.connect();

            const db = this.client.db("PurityTests");
            const tests = db.collection("Tests");

            const query = { easyId: easyId };
            const check = await tests.findOne(query);
            await this.client.close();

            return check != null;
        } catch (e) {
            return false;
        }
    }

    async addTest(test: PurityTest): Promise<boolean> {
        try {
            await this.client.connect();

            const db = this.client.db("PurityTests");
            const tests = db.collection("Tests");

            const query = { easyId: test.easyId };
            const check = await tests.findOne(query);
            if (check) {
                return false;
            }

            const result = await tests.insertOne(test.serialize());

            await this.client.close();
            return result.acknowledged;
        } catch (e) {
            return false;
        }
    }

    async findTest(easyId: string): Promise<PurityTest | null> {

        try {
            await this.client.connect();

            const db = this.client.db("PurityTests");
            const tests = db.collection("Tests");

            const query = {easyId: easyId};
            const result = await tests.findOne(query);

            await this.client.close();

            if (result) {
                return PurityTest.deserialize(result);
            }
            return null;
        } catch (e) {
            return null;
        }

    }

    async updateTest(pt: PurityTest): Promise<boolean> {
        try {
            await this.client.connect();
            const database = this.client.db("PurityTests");
            const tests = database.collection("Tests");
            const filter = { easyId: pt.easyId };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    likes: pt.likes,
                    views: pt.views
                },
            };
            const result = await tests.updateOne(filter, updateDoc, options);

            await this.client.close();
            return result.matchedCount == 1;
        } catch (e) {
            return false;
        }
    }

    async findAndViewTest(easyId: string): Promise<PurityTest | null> {

        try {
            let pt = await this.findTest(easyId);

            if (pt) {
                pt.views++;
                let updated = await this.updateTest(pt);
                return pt;
            } else {
                return null;
            }

        } catch(e) {
            return null;
        }

    }

}