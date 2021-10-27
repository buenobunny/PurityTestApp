import {Set} from "typescript";
import {PurityTest} from "./PurityTest";

const crypto = require('crypto');

export class User {

    static arrDelim: string = "%";

    username: string;
    email: string;
    passwordHash: string;
    likes: Set<string>;
    uid: string | null;

    constructor(username: string, email: string, passwordHash: string, likes: Set<string>, uid?: string) {
        this.username = username;
        this.email = email;
        this.passwordHash = passwordHash;
        this.likes = likes;
        if (uid) {
            this.uid = uid;
        } else {
            this.uid = null;
        }
    }

    serialize(): any {
        let arrayLikes: string[] = [];
        for (let like in this.likes.values()) {
            arrayLikes.push(like);
        }
        let serializedLikes = arrayLikes.join(User.arrDelim);
        return {
            _id: this.uid,
            username: this.username,
            email: this.email,
            passwordHash: this.passwordHash,
            likes: serializedLikes
        }
    }

    static deserialize(data: any): User | null {

        if (data._id == undefined || data.username == undefined
            || data.email == undefined || data.passwordHash == undefined || data.likes == undefined) {
            console.log("User:");
            console.log(data);
            return null;
        }


        return null;
    }

    static hashPass(password: string): string {
        return crypto.createHmac("sha256", process.env.PASS_HASH).update(password).digest("hex").toString();
    }

}