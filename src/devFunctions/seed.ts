require('dotenv').config();
import {PurityTest} from "../objects/PurityTest";
process.env.DB_CONNECT = ""
process.env.DB_NAME = ""
import {DBHandler} from "../dbHandler";

let db: DBHandler = new DBHandler();
db.connect().then((res) => {
    if (res) {
        for (let i = 0; i < 100; i++) {
            let questions: string[] = [""];
            let limit: number = Math.random() * 100;
            for (let i = 0; i < limit; i++) {
                questions.push(Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 10));
            }
            let easyId: string = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
            let preText: string = "This is some pretext";
            let postText: string = "This is some postext";
            let creatorId: string = "aaa";
            let test: PurityTest = new PurityTest("Test", questions, preText, postText, easyId, creatorId);
            db.addTest(test).then(result => {
                console.log(result);
            });
        }
    }
})