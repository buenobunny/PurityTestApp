import {DBHandler} from "../dbHandler";
import {User} from "../objects/User";
import express from 'express';
import {Request, Response} from 'express';
import {PurityTest} from "../objects/PurityTest";

export class TestRouter {

    private dbHandler: DBHandler;
    constructor(dbHandler: DBHandler) {
        this.dbHandler = dbHandler;
    }

    createTest = async (req: Request, res: Response) => {

        //TODO: validate loggedIn
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

        let result = await this.dbHandler.addTest(
            new PurityTest(req.body.title, req.body["questions[]"],
                req.body.preText, req.body.postText, req.body.easyId));

        if (result) {
            res.redirect('/show/' + req.body.easyId);
        } else {
            res.status(500);
            res.send("Error in creating the test. Probably an already used ID.");
        }
    }

}