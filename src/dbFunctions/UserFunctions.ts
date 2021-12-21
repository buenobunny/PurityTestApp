import {User} from "../objects/User";
import {TestResult} from "../objects/TestResult";

const { MongoClient, Db, ObjectId } = require('mongodb');

const uri = process.env.DB_CONNECT;

export class UserFunctions {

    private readonly db: typeof Db;
    private tr: typeof Db.collection;
    private users: typeof Db.collection;
    private likes: typeof Db.collection;
    constructor(db: typeof Db) {
        this.db = db;
        this.tr = this.db.collection("TestResults");
        this.users = this.db.collection("Users");
        this.likes = this.db.collection("UserLikes");
    }

    async checkUserExists(username: string, email: string): Promise<boolean> {
        try {

            const queryUser = {username: username};
            const checkUser = await this.users.findOne(queryUser);
            if (checkUser == null) {
                const queryEmail = {email: email};
                const checkEmail = await this.users.findOne(queryEmail);
                return !(checkEmail == null);
            } else {
                return true;
            }
        } catch(e) {
            return true;
        }
    }

    async createUser(user: User): Promise<User | null> {
        try {

            if (!await this.checkUserExists(user.username, user.email)) {
                const result = await this.users.insertOne(user.serialize());
                if (result.acknowledged) {
                    user.uid = result.insertedId;
                    return user;
                }
                return null;
            }
            return null;
        } catch(e) {
            return null;
        }
    }

    async getUser(uid: string): Promise<User | null>  {
        try {
            let query = {_id: ObjectId(uid)};
            let result = await this.users.findOne(query);
            if (result) {
                return User.deserialize(result);
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    async getByUsername(name: string): Promise<User | null> {
        try {
            let query = {username: name};
            let result = await this.users.findOne(query);
            if (result) {
                return User.deserialize(result);
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    async updateUser(user: User) : Promise<boolean> {
        try {
            const filter = {_id: user.uid};
            const options = {upsert: true};
            const serializedUser = user.serialize();
            const updateDoc = {
                $set: {
                    likes: serializedUser.likes
                },
            };
            const result = await this.users.updateOne(filter, updateDoc, options);

            return result.matchedCount == 1;
        } catch (e) {
            return false;
        }
    }

    async findLike(username: string, testId: string): Promise<boolean> {
        try {
            const filter = {
                username: username,
                testId: testId
            }
            let result = await this.likes.findOne(filter);
            if (result) {
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    async deleteLike(username: string, testId: string): Promise<boolean> {
        try {
            const filter = {
                username: username,
                testId: testId
            }
            let result = await this.likes.deleteOne(filter);
            if (result.deletedCount == 1) {
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }


    async addLike(username: string, testId: string): Promise<boolean> {
        try {
            const filter = {
                username: username,
                testId: testId
            }
            let result = await this.likes.insertOne(filter);
            if (result.acknowledged) {
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    async saveResult(testResult: TestResult): Promise<boolean> {
        try {
            let result = await this.tr.insertOne(testResult.serialize());
            if (result.acknowledged) {
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    async getResultsForUser(uid: string): Promise<Array<Object> | null> {
        try {
            let cursor = await this.tr.aggregate([
                    { $match: {userId: uid} },
                    { $group: {
                        _id: "$testId",
                        numResults: { $sum: 1 },
                        lastSaved: { $max: "$createdAt" },
                        testTitle: { $first: "$testTitle" }
                    }},
                    { $sort: { lastSaved: -1}}]);
            let results: Array<Object> = [];
            while (!cursor.closed && await cursor.hasNext()) {
                let data = await cursor.next();
                results.push({ testId: data._id,  title: data.testTitle, n: data.numResults });
            }
            return results;
        } catch (e) {
            return null;
        }
        return null;
    }

    async getResultsForUserTest(uid: string, easyId: string): Promise<TestResult[] | null> {
        try {
            let cursor = await this.tr.aggregate([
                { $match: {userId: uid} },
                { $match: {testId: easyId}},
                { $sort: {createdAt: -1}}]);
            let results: TestResult[] = [];
            while (!cursor.closed && await cursor.hasNext()) {
                let data = await cursor.next();
                let obj: TestResult | null = TestResult.deserialize(data);
                if (obj)
                    results.push(obj);
            }
            return results;
        } catch (e) {
            return null;
        }
        return null;
    }

}