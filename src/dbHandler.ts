import {PurityTest} from "./objects/PurityTest";
import {User} from "./objects/User";

const { MongoClient, Db, ObjectId } = require('mongodb');

const uri = process.env.DB_CONNECT;

export class DBHandler {

    private client: typeof MongoClient;
    private connection: typeof MongoClient;
    private db: typeof Db | null;
    constructor() {
        this.client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        this.db = null;
    }

    async connect(): Promise<boolean> {
        try {
            this.connection = await this.client.connect();
            if (this.connection) {
                this.db = this.connection.db(process.env.DB_NAME);
                return (this.db != null);
            } else {
                return false;
            }
        } catch(e) {
            console.log(e);
            return false;
        }
    }

    async disconnect(): Promise<boolean> {
        try {
            return await this.client.close();
        } catch(e) {
            console.log(e);
            return false;
        }
    }

    async getTests(num: number, start: number, sort?: string): Promise<PurityTest[] | null> {
        try {
            if (this.db != null) {
                const tests = this.db.collection("Tests");

                let cursor = null;
                if (sort != null) {
                    cursor = await tests.find({ views: { $gt: 0 }},
                        {sort: {likes: -1, views: -1}});
                } else {
                    cursor = await tests.find();
                }

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
                return toReturn;
            } else {
                return null;
            }
        } catch(e) {
            console.log(e);
            return null;
        }
    }

    async checkAlreadyExists(easyId: string): Promise<boolean> {
        try {
            if (this.db != null) {
                const tests = this.db.collection("Tests");

                const query = { easyId: easyId };
                const check = await tests.findOne(query);

                return check != null;
            } else {
                return false;
            }
        } catch (e) {
            return false;
        }
    }

    async addTest(test: PurityTest): Promise<boolean> {
        try {
            if (this.db != null) {
                const tests = this.db.collection("Tests");

                const query = {easyId: test.easyId};
                const check = await tests.findOne(query);
                if (check) {
                    return false;
                }

                const result = await tests.insertOne(test.serialize());
                return result.acknowledged;
            } else {
                return false;
            }
        } catch (e) {
            return false;
        }
    }

    async findTest(easyId: string): Promise<PurityTest | null> {

        try {
            if (this.db != null) {
                const tests = this.db.collection("Tests");

                const query = {easyId: easyId};
                const result = await tests.findOne(query);

                if (result) {
                    return PurityTest.deserialize(result);
                }
            }
            return null;
        } catch (e) {
            return null;
        }

    }

    async updateTest(pt: PurityTest): Promise<boolean> {
        try {
            if (this.db != null) {
                const tests = this.db.collection("Tests");
                const filter = {easyId: pt.easyId};
                const options = {upsert: true};
                const updateDoc = {
                    $set: {
                        likes: pt.likes,
                        views: pt.views,
                        preText: pt.preText,
                        postText: pt.postText
                    },
                };
                const result = await tests.updateOne(filter, updateDoc, options);

                return result.matchedCount == 1;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    async findAndViewTest(easyId: string): Promise<PurityTest | null> {

        try {
            if (this.db != null) {
                let pt = await this.findTest(easyId);

                if (pt) {
                    pt.views++;
                    let updated = await this.updateTest(pt);
                    return pt;
                }
            }
            return null;
        } catch(e) {
            return null;
        }

    }

    async checkUserExists(username: string, email: string): Promise<boolean> {
        try {
            if (this.db != null) {
                const users = this.db.collection("Users");

                const queryUser = {username: username};
                const checkUser = await users.findOne(queryUser);
                if (checkUser == null) {
                    const queryEmail = {email: email};
                    const checkEmail = await users.findOne(queryEmail);
                    return !(checkEmail == null);
                } else {
                    return true;
                }
            }

            return true;
        } catch(e) {
            return true;
        }
    }

    async createUser(user: User): Promise<User | null> {
        try {
            if (this.db != null) {

                const users = this.db.collection("Users");

                if (!await this.checkUserExists(user.username, user.email)) {
                    const result = await users.insertOne(user.serialize());
                    if (result.acknowledged) {
                        user.uid = result.insertedId;
                        return user;
                    }
                    return null;
                }

            }

            return null;
        } catch(e) {
            return null;
        }
    }

    async getUser(uid: string): Promise<User | null>  {
        console.log(uid);
        try {
            if (this.db != null) {
                const users = this.db.collection("Users");
                let query = {_id: ObjectId(uid)};
                let result = await users.findOne(query);
                if (result) {
                    return User.deserialize(result);
                }
                return null;
            } else {
                return null;
            }
        } catch (e) {
            return null;
        }
    }

    async updateUser(user: User) : Promise<boolean> {
        try {
            if (this.db != null) {
                const users = this.db.collection("Users");
                const filter = {_id: user.uid};
                const options = {upsert: true};
                const serializedUser = user.serialize();
                const updateDoc = {
                    $set: {
                        likes: serializedUser.likes
                    },
                };
                const result = await users.updateOne(filter, updateDoc, options);

                return result.matchedCount == 1;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    async findLike(username: string, testId: string): Promise<boolean> {
        try {
            if (this.db != null) {
                const likes = this.db.collection("UserLikes");
                const filter = {
                    username: username,
                    testId: testId
                }
                let result = await likes.findOne(filter);
                if (result) {
                    return true;
                }
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    async deleteLike(username: string, testId: string): Promise<boolean> {
        try {
            if (this.db != null) {
                const likes = this.db.collection("UserLikes");
                const filter = {
                    username: username,
                    testId: testId
                }
                let result = await likes.deleteOne(filter);
                if (result.deletedCount == 1) {
                    return true;
                }
            }
            return false;
        } catch (e) {
            return false;
        }
    }


    async addLike(username: string, testId: string): Promise<boolean> {
        try {
            if (this.db != null) {
                const likes = this.db.collection("UserLikes");
                const filter = {
                    username: username,
                    testId: testId
                }
                let result = await likes.insertOne(filter);
                if (result.acknowledged) {
                    return true;
                }
            }
            return false;
        } catch (e) {
            return false;
        }
    }

}