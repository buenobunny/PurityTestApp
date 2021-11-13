import {Set} from "typescript";
import {PurityTest} from "./PurityTest";
import {ObjectId} from 'mongodb';

const crypto = require('crypto');

export class User {

    static arrDelim: string = "%";

    readonly username: string;
    readonly email: string;
    readonly passwordHash: string;
    public uid: ObjectId | null;

    constructor(username: string, email: string, passwordHash: string, uid?: ObjectId) {
        this.username = username;
        this.email = email;
        this.passwordHash = passwordHash;
        if (uid) {
            this.uid = uid;
        } else {
            this.uid = null;
        }
    }

    serialize(): any {
        return {
            _id: this.uid,
            username: this.username,
            email: this.email,
            passwordHash: this.passwordHash
        }
    }

    static deserialize(data: any): User | null {

        if (data._id == undefined || data.username == undefined
            || data.email == undefined || data.passwordHash == undefined || data.likes == undefined) {
            return null;
        }

        return new User(data.username, data.email, data.passwordHash, data._id);
    }

    static hashPass(password: string): string {
        return crypto.createHmac("sha256", process.env.PASS_HASH).update(password).digest("hex").toString();
    }

}