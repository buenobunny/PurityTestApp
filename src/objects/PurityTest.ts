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
    creatorId: string;
    createdAt: Date;

    constructor(title: string, questions: string[], preText: string, postText: string, easyId: string, creatorId: string,
                views?: number, likes?: number, createdAt?: Date) {
        this.title = title;
        this.questions = questions;
        this.preText = preText;
        this.postText = postText;
        this.easyId = easyId;
        this.creatorId = creatorId;
        if (views)
            this.views = views;
        else
            this.views = 0;
        if (likes)
            this.likes = likes;
        else
            this.likes = 0;
        this.createdAt = (createdAt != undefined) ? createdAt : new Date();
    }

    serialize(): any {
        return {
            easyId: this.easyId,
            title: this.title,
            questions: this.questions.join(PurityTest.arrDelimiter),
            preText: this.preText,
            postText: this.postText,
            likes: this.likes,
            views: this.likes,
            creatorId: this.creatorId,
            createdAt: this.createdAt
        }
    }

    static deserialize = function(data: any): PurityTest | null {

        if (!data.title || !data.questions || !data.easyId || !data.preText || !data.postText
            || data.likes == undefined || data.views == undefined) {
            return null;
        }

        return new PurityTest(data.title, data.questions.split(PurityTest.arrDelimiter),
            data.preText, data.postText, data.easyId, (data.creatorId == null) ? "" : data.creatorId, data.views, data.likes,
            data.createdAt);

    }
}