import {PurityTest} from "./objects/PurityTest";
import {User} from "./objects/User";
import {TestFunctions} from "./dbFunctions/TestFunctions";
import {UserFunctions} from "./dbFunctions/UserFunctions";
import {DBFunctions} from "./dbFunctions/DBFunctions";

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

    async connect(): Promise<DBFunctions | null> {
        try {
            this.connection = await this.client.connect();
            if (this.connection) {
                this.db = this.connection.db(process.env.DB_NAME);
                if (this.db != null) {
                    return new DBFunctions(this.db);
                }
            }
            return null;
        } catch(e) {
            console.log(e);
            return null;
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

}