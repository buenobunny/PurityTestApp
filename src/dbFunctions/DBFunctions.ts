import {TestFunctions} from "./TestFunctions";
import {UserFunctions} from "./UserFunctions";

const { MongoClient, Db, ObjectId } = require('mongodb');

export class DBFunctions {

    private readonly db: typeof Db;
    testFunctions: TestFunctions;
    userFunctions: UserFunctions;

    constructor(db: typeof Db) {
        this.db = db;
        this.testFunctions = new TestFunctions(this.db);
        this.userFunctions = new UserFunctions(this.db);
    }

}