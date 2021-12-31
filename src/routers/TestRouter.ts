
import {User} from "../objects/User";
import express from 'express';
import {Request, Response} from 'express';
import {PurityTest} from "../objects/PurityTest";
import striptags from "striptags";
import {TestResult} from "../objects/TestResult";
import {DBFunctions} from "../dbFunctions/DBFunctions";
import {getErrorPage} from "../devFunctions/standards";

export class TestRouter {

    private dbHandler: DBFunctions;
    constructor(dbHandler: DBFunctions) {
        this.dbHandler = dbHandler;
    }

    createTest = async (req: Request, res: Response) => {

        if (req.signedCookies == undefined || req.signedCookies.uid == undefined) {
            res.redirect('/');
            return;
        }

        if (!req.body) {
            res.redirect('/404');
            return;
        }

        if (!req.body.title || !req.body["questions[]"] || !req.body.postText || !req.body.preText || !req.body.easyId ||
            /^[a-zA-Z0-9]+$/.test(req.body.easyId)) {
            res.status(500);
            res.send("Error. Some fields were not filled out correctly.");
            return;
        }

        let strippedQuestions = req.body["questions[]"].map((old: string) => {
            // @ts-ignore
            return striptags(old).replaceAll("%", "").trim();
        });

        let result = null;
        let pt = null;

        if (req.body.easyId.length < 40 && !(await this.dbHandler.testFunctions.checkAlreadyExists(req.body.easyId))) {
            pt = new PurityTest(striptags(req.body.title), strippedQuestions,
                    striptags(req.body.preText), striptags(req.body.postText),
                    striptags(req.body.easyId).replace(/\s/g, ""),
                    striptags(req.signedCookies.uid));
            if (pt)
                result = await this.dbHandler.testFunctions.createTest(pt);
        }

        if (pt && result) {
            res.redirect('/test/' + pt.easyId);
        } else {
            res.status(500);
            res.send("Error in creating the test. Probably an already used ID.");
        }
    }

    likeTest = async (req: Request, res: Response) => {
        if (req.body == undefined || req.body.testId == undefined) {
            res.status(400).send("Something went wrong!");
            return;
        }

        if (req.signedCookies.uid == undefined) {
            res.status(403).send("Access unauthorized.");
            return;
        }

        let user: User | null = await this.dbHandler.userFunctions.getUser(req.signedCookies.uid);
        let test: PurityTest | null = await this.dbHandler.testFunctions.findTest(req.body.testId);

        if (user != null && test != null) {

            if (req.signedCookies.uid !== user.uid?.toHexString()) {
                res.status(403).send("Access unauthorized.");
                return;
            }

            let liked = await this.dbHandler.userFunctions.findLike(user.username, req.body.testId);

            if (liked) {
                test.likes--;
                let success = await this.dbHandler.userFunctions.deleteLike(user.username, req.body.testId);
                if (!success) {
                    res.status(500).send("Internal server error processing unlike.");
                    return;
                }
            } else {
                test.likes++;
                let success = await this.dbHandler.userFunctions.addLike(user.username, req.body.testId);
                if (!success) {
                    res.status(500).send("Internal server error processing like.");
                    return;
                }
            }
            let updatedTest = await this.dbHandler.testFunctions.updateTest(test);
            if (!updatedTest) {
                res.status(500).send("Database was not updated.");
                return;
            }
            res.status(200).send({likes: test.likes, liked: !liked});
        } else {
            res.status(500).send("Internal server error.");
        }

    }

}