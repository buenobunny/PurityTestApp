import {PurityTest} from "../objects/PurityTest";

const { MongoClient, Db, ObjectId } = require('mongodb');

const uri = process.env.DB_CONNECT;

export class TestFunctions {

    private db: typeof Db;
    private tests: typeof Db.collection;

    constructor(db: typeof Db) {
        this.db = db;
        this.tests = this.db.collection("Tests");
    }

    async getNumTests(): Promise<number | null> {
        try {
            const tests = await this.tests.countDocuments();
            if (tests > -1) {
                return tests;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    async getTestsMadeBy(uid: string, limit?: number): Promise<PurityTest[] | null> {
        try {
            let query = limit != undefined ?
                [
                    {$match: {creatorId: uid}},
                    {$sort: {likes: -1}},
                    {$limit: limit}
                ] : [
                    {$match: {creatorId: uid}},
                    {$sort: {likes: -1}}
                ];

            let cursor = await this.tests.aggregate(query);
            const toReturn: PurityTest[] = [];
            while (!cursor.closed && await cursor.hasNext()) {
                let data = await cursor.next();
                if (data != null) {
                    let p: PurityTest | null = PurityTest.deserialize(data);
                    if (p != null) {
                        toReturn.push(p);
                    }
                }
            }
            return toReturn;
        } catch(e) {
            console.log(e);
            return null;
        }
    }

    async getTests(num: number, start: number, sort?: string): Promise<PurityTest[] | null> {
        try {
            const tests = this.db.collection("Tests");

            let cursor;
            if (sort != null) {
                cursor = await tests.find({ views: { $gt: -1 }},
                    {sort: sort == "likes" ? {likes: -1, views: -1} : {views: -1, likes: -1}});
            } else {
                cursor = await tests.find({}, {sort: {createdAt: "desc"}});
            }

            let i: number = 0;
            const toReturn: PurityTest[] = [];
            while (i < start && !cursor.closed && await cursor.hasNext()) {
                await cursor.next();
                i++;
            }
            i = 0;
            while (i < num && !cursor.closed && await cursor.hasNext()) {
                let data = await cursor.next();
                if (data != null) {
                    let p: PurityTest | null = PurityTest.deserialize(data);
                    if (p != null) {
                        toReturn.push(p);
                    }
                }
                i++;
            }
            return toReturn;
        } catch(e) {
            console.log(e);
            return null;
        }
    }

    async checkAlreadyExists(easyId: string): Promise<boolean> {
        try {
            const tests = this.db.collection("Tests");

            const query = { easyId: easyId };
            const check = await tests.findOne(query);

            return check != null;
        } catch (e) {
            return false;
        }
    }

    async createTest(test: PurityTest): Promise<boolean> {
        try {
            const tests = this.db.collection("Tests");

            const query = {easyId: test.easyId};
            const check = await tests.findOne(query);
            if (check) {
                return false;
            }

            const result = await tests.insertOne(test.serialize());
            return result.acknowledged;
        } catch (e) {
            return false;
        }
    }

    async findTest(easyId: string): Promise<PurityTest | null> {

        try {
            const tests = this.db.collection("Tests");

            const query = {easyId: easyId};
            const result = await tests.findOne(query);

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
            const tests = this.db.collection("Tests");
            const filter = {easyId: pt.easyId};
            const options = {upsert: true};
            const updateDoc = {
                $set: {
                    likes: pt.likes,
                    views: pt.views,
                    preText: pt.preText,
                    postText: pt.postText,
                    createdAt: pt.createdAt
                },
            };
            const result = await tests.updateOne(filter, updateDoc, options);

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
            }
            return null;
        } catch(e) {
            return null;
        }

    }

}