import {DBHandler} from "../dbHandler";
import {User} from "../objects/User";
import express from 'express';
import {Request, Response} from 'express';
import striptags from "striptags";
import {DBFunctions} from "../dbFunctions/DBFunctions";
import {TestResult} from "../objects/TestResult";
import {getErrorPage, getView} from "../devFunctions/standards";
const emailValidator = require('email-validator');
let ejs = require('ejs');

const cookieOptions = {
    maxAge: 10000,
    secure: true,
    httpOnly: true
};

export class UserRouter {

    private dbHandler: DBFunctions;
    constructor(dbHandler: DBFunctions) {
        this.dbHandler = dbHandler;
    }

    loginLogic = async (req: Request, res: Response) => {

        if (req.cookies != undefined && req.cookies.uid != undefined) {
            res.redirect('/');
            return;
        }

        if (req.body == undefined || req.body.user == undefined || req.body.password == undefined) {
            res.redirect('/login?msg=oopsError');
            return;
        }

        let user = await this.dbHandler.userFunctions.getByUsername(striptags(req.body.user));
        if (user != null) {
            let hashedPass = User.hashPass(striptags(req.body.password));
            if (hashedPass === user.passwordHash) {
                res.cookie("uid", user.uid?.toHexString()).redirect('/');
                return;
            }
        }
        res.redirect('/login?msg=oopsError');
    }

    signupLogic = async (req: Request, res: Response) => {
        if (req.cookies != undefined && req.cookies.uid != undefined) {
            res.redirect('/');
            return;
        }

        if (req.body == undefined || req.body.user == undefined
            || req.body.email == undefined || req.body.password == undefined
            || !emailValidator.validate(req.body.email)) {
            res.redirect('/signup?msg=oopsError');
            return;
        }
        let alreadyExists = await this.dbHandler.userFunctions.checkUserExists(striptags(req.body.user), striptags(req.body.email));
        if (alreadyExists) {
            res.redirect('/signup?msg=oopsError');
            return;
        }

        let hashedPass = User.hashPass(striptags(req.body.password));
        let user: User = new User(striptags(req.body.user), striptags(req.body.email), hashedPass);

        let createdUser = await this.dbHandler.userFunctions.createUser(user);

        if (createdUser) {
            res.cookie("uid", createdUser.uid);
        } else {
            console.log("couldnt create");
            res.redirect('/signup?msg=oopsError');
            return;
        }

        res.redirect('/');

    }

    /**
     * take testId, testTitle and percentage in body, uid in cookies
     * @param req
     * @param res
     */
    saveResult = async (req: Request, res: Response) => {
        if (req.cookies.uid && req.body.testId && req.body.testTitle && req.body.percentage) {
            let result: TestResult = new TestResult(req.body.testId, req.body.testTitle, req.cookies.uid, req.body.percentage);
            let saved = await this.dbHandler.userFunctions.saveResult(result);
            if (saved) {
                res.redirect('/myResults/' + req.body.testId);
            } else {
                res.send(await getErrorPage(500, "Something went wrong when processing your request.", true));
            }
        } else {
            res.send(await getErrorPage(400, "Something was missing from your request!", req.cookies.uid != undefined));
        }
    }

    myStuff = async(req: Request, res: Response) => {
        if (req.cookies.uid) {
            let results = await this.dbHandler.userFunctions.getResultsForUser(req.cookies.uid);
            let tests = await this.dbHandler.testFunctions.getTestsMadeBy(req.cookies.uid, 4);
            ejs.renderFile(getView('user/mystuff'), {
                title: "My Stuff",
                results: results,
                tests: tests,
                loggedIn: true
            }, {}, (err: Error, str: string) => {
                if (err) {
                    console.log(err.name + ": " + err.message);
                    res.send(err);
                    return;
                }
                res.send(str);
            });
        } else {
            res.send(await getErrorPage(403, "You need to login to access this page!", false));
        }
    }

    myTests = async(req: Request, res: Response) => {
        if (req.cookies.uid) {
            let tests = await this.dbHandler.testFunctions.getTestsMadeBy(req.cookies.uid);
            ejs.renderFile(getView('user/mytests'), {
                title: "My Tests",
                tests: tests,
                loggedIn: true
            }, {}, (err: Error, str: string) => {
                if (err) {
                    console.log(err.name + ": " + err.message);
                    res.send(err);
                    return;
                }
                res.send(str);
            });
        } else {
            res.send(await getErrorPage(403, "You need to login to access this page!", false));
        }
    }

    myResults = async(req: Request, res: Response) => {
        if (req.cookies.uid && req.params.id) {
            let results = await this.dbHandler.userFunctions.getResultsForUserTest(req.cookies.uid, req.params.id);
            ejs.renderFile(getView('user/myresults'), {
                title: "Result History",
                results: results,
                loggedIn: true,
                testId: req.params.id
            }, {}, (err: Error, str: string) => {
                if (err) {
                    console.log(err.name + ": " + err.message);
                    res.send(err);
                    return;
                }
                res.send(str);
            });
        } else {
            res.send(await getErrorPage(403, "You need to login to access this page!", false));
        }
    }
}