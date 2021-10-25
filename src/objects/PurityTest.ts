import {DBHandler} from "../dbHandler";

export class PurityTest {

    static delimiter: string = "%%";
    static arrDelimiter = "%";

    title: string;
    questions: string[];
    preText: string;
    postText: string;
    easyId: string;
    views: number;
    likes: number;

    constructor(title: string, questions: string[], preText: string, postText: string, easyId: string, views?: number, likes?: number) {
        this.title = title;
        this.questions = questions;
        this.preText = preText;
        this.postText = postText;
        this.easyId = easyId;
        if (views)
            this.views = views;
        else
            this.views = 0;
        if (likes)
            this.likes = likes;
        else
            this.likes = 0;
    }

    serialize(): any {
        return {
            easyId: this.easyId,
            title: this.title,
            questions: this.questions.join(PurityTest.arrDelimiter),
            preText: this.preText,
            postText: this.postText,
            likes: 0,
            views: 0
        }
        //return this.title + PurityTest.delimiter + this.questions.join(PurityTest.arrDelimiter) + PurityTest.delimiter + this.preText + PurityTest.delimiter + this.postText;
    }

    static deserialize = function(data: any): PurityTest | null {

        if (!data.title || !data.questions || !data.easyId || !data.preText || !data.postText
            || data.likes == undefined || data.views == undefined) {
            console.log(data);
            return null;
        }

        return new PurityTest(data.title, data.questions.split(PurityTest.arrDelimiter),
            data.preText, data.postText, data.easyId, data.views, data.likes);

    }
}