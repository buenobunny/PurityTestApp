import {DBHandler} from "../dbHandler";
import {User} from "../objects/User";
import express from 'express';
import {Request, Response} from 'express';
import {PurityTest} from "../objects/PurityTest";
import striptags from "striptags";

export class TestRouter {

    private dbHandler: DBHandler;
    constructor(dbHandler: DBHandler) {
        this.dbHandler = dbHandler;
    }

    createTest = async (req: Request, res: Response) => {

        if (req.cookies == undefined || req.cookies.uid == undefined) {
            res.redirect('/');
            return;
        }

        if (!req.body) {
            res.redirect('/404');
            return;
        }

        if (!req.body.title || !req.body["questions[]"] || !req.body.postText || !req.body.preText || !req.body.easyId) {
            res.status(500);
            res.send("Error. Some fields were not filled out.");
            return;
        }

        let strippedQuestions = req.body["questions[]"].map((old: string) => {
            return striptags(old);
        })

        let result = await this.dbHandler.addTest(
            new PurityTest(striptags(req.body.title), strippedQuestions,
                striptags(req.body.preText), striptags(req.body.postText), striptags(req.body.easyId), striptags(req.cookies.uid)));

        if (result) {
            res.redirect('/show/' + req.body.easyId);
        } else {
            res.status(500);
            res.send("Error in creating the test. Probably an already used ID.");
        }
    }

    likeTest = async (req: Request, res: Response) => {
        if (req.body == undefined || req.body.testId == undefined) {
            res.status(400).send("bruh");
            return;
        }

        if (req.cookies.uid == undefined) {
            res.status(403).send("not logged in 1 ");
            return;
        }

        let user: User | null = await this.dbHandler.getUser(req.cookies.uid);
        let test: PurityTest | null = await this.dbHandler.findTest(req.body.testId);

        if (user != null && test != null) {

            if (req.cookies.uid !== user.uid?.toHexString()) {
                res.status(403).send("not logged in 2");
                return;
            }

            let liked = await this.dbHandler.findLike(user.username, req.body.testId);

            if (liked) {
                test.likes--;
                let success = await this.dbHandler.deleteLike(user.username, req.body.testId);
                if (!success) {
                    res.status(500).send("couldn't delete");
                    return;
                }
            } else {
                test.likes++;
                let success = await this.dbHandler.addLike(user.username, req.body.testId);
                if (!success) {
                    res.status(500).send("couldn't add");
                    return;
                }
            }
            let updatedTest = await this.dbHandler.updateTest(test);
            if (!updatedTest) {
                res.status(500).send("test not updated");
                return;
            }
            res.status(200).send({likes: test.likes, liked: !liked});
        } else {
            res.status(500).send("general break");
        }

    }

}