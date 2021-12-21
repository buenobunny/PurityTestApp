export class TestResult {

    static delimiter: string = "%%";
    static arrDelimiter = "%";

    testId: string;
    testTitle: string;
    userId: string;
    percentage: number;
    createdAt: Date;

    constructor(testId: string, testTitle: string, userId: string, percentage: number, createdAt?: Date) {

        this.testId = testId;
        this.userId = userId;
        this.percentage = percentage;
        this.createdAt = createdAt == undefined ? new Date() : createdAt;
        this.testTitle = testTitle;

    }

    serialize(): Object {
        return {
            testId: this.testId,
            testTitle: this.testTitle,
            userId: this.userId,
            percentage: this.percentage,
            createdAt: this.createdAt
        }
    }

    static deserialize = function(data: any): TestResult | null {

        if (!data.testId || !data.testTitle || !data.userId || data.percentage == undefined || data.createdAt == undefined) {
            return null;
        }

        return new TestResult(data.testId, data.testTitle, data.userId, data.percentage, data.createdAt);

    }

}