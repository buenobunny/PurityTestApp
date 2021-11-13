import {DBHandler} from "../dbHandler";
import {User} from "../objects/User";
import express from 'express';
import {Request, Response} from 'express';
const emailValidator = require('email-validator');

const cookieOptions = {
    maxAge: 10000,
    secure: true,
    httpOnly: true
};

export class UserRouter {

    private dbHandler: DBHandler;
    constructor(dbHandler: DBHandler) {
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

        let user = await this.dbHandler.getUser(req.body.user);
        if (user != null) {
            let hashedPass = User.hashPass(req.body.password);
            if (hashedPass == user.passwordHash) {
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
        let alreadyExists = await this.dbHandler.checkUserExists(req.body.user, req.body.email);
        if (alreadyExists) {
            res.redirect('/signup?msg=oopsError');
            return;
        }

        let hashedPass = User.hashPass(req.body.password);
        let user: User = new User(req.body.user, req.body.email, hashedPass);

        let createdUser = await this.dbHandler.createUser(user);

        if (createdUser) {
            res.cookie("uid", createdUser.uid);
        } else {
            console.log("couldnt create");
            res.redirect('/signup?msg=oopsError');
            return;
        }

        res.redirect('/');

    }
}