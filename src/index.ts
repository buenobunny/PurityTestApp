import {User} from "./objects/User";

require('dotenv').config();
import {DBHandler} from "./dbHandler";
// @ts-ignore
import express from 'express';
import {Request, Response} from 'express';
import {PurityTest} from "./objects/PurityTest";
let ejs = require('ejs');
const path = require('path');
let bodyParser = require('body-parser');
let cookieParser = require('cookie-parser');

// @ts-ignore
const app = express();
app.use(bodyParser.urlencoded({ extended:false }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/assets'));
app.use(cookieParser());

let emailValidator = require('email-validator');

const cookieOptions = {
    maxAge: 10000,
    secure: true,
    httpOnly: true
};

let dbHandler: DBHandler = new DBHandler();


function getView(viewName: string): string {
    return path.join(__dirname + '/views/') + viewName + '.ejs';
}

function getStandard(standard: string): string {
    return getView('/standards/' + standard);
}

app.get('/new', (req: Request, res: Response) => {

    if (req.cookies == undefined || req.cookies.uid == undefined) {
        res.redirect('/');
        return;
    }

    ejs.renderFile(getView('new'),{
        title: "New Test", loggedIn: true
        }, {},
        (err: Error, str: string) => {
        res.send(str);
    });
});

app.get('/login', (req: Request, res: Response) => {

    if (req.query != undefined && req.query.msg != undefined) {
        ejs.renderFile(getView('login'), {msg: true}, {},
            (err: Error, str: string) => {
                res.send(str);
            });
    } else {
        ejs.renderFile(getView('login'), {msg: undefined}, {},
            (err: Error, str: string) => {
               res.send(str);
            });
    }

});

app.post('/login', async (req: Request, res: Response) => {

    if (req.cookies != undefined && req.cookies.uid != undefined) {
        res.redirect('/');
        return;
    }

    if (req.body == undefined || req.body.user == undefined || req.body.password == undefined) {
        res.redirect('/login?msg=oopsError');
        return;
    }

    let user = await dbHandler.getUser(req.body.user);
    if (user != null) {
        let hashedPass = User.hashPass(req.body.password);
        if (hashedPass == user.passwordHash) {
            res.cookie("uid", user.uid).redirect('/');
            return;
        }
    }
    res.redirect('/login?msg=oopsError');
});

app.get('/signup', (req: Request, res: Response) => {

    if (req.cookies != undefined && req.cookies.uid != undefined) {
        res.redirect('/');
        return;
    }

    ejs.renderFile(getView('signup'),
        {msg: req.query != undefined && req.query.msg != undefined ? true : undefined}, {},
        (err: Error, str: string) => {
            res.send(str);
        });

});

app.post('/signup', async (req: Request, res: Response) => {
    if (req.cookies != undefined && req.cookies.uid != undefined) {
        res.redirect('/');
        return;
    }

    //TODO: logic hashing the pass and then sending to check in db
    if (req.body == undefined || req.body.user == undefined
        || req.body.email == undefined || req.body.password == undefined
        || !emailValidator.validate(req.body.email)) {
        console.log("validation");
        res.redirect('/signup?msg=oopsError');
        return;
    }
    let alreadyExists = await dbHandler.checkUserExists(req.body.user, req.body.email);
    if (alreadyExists) {
        res.redirect('/signup?msg=oopsError');
        return;
    }

    let hashedPass = User.hashPass(req.body.password);
    let user: User = new User(req.body.user, req.body.email, hashedPass, new Set<string>());

    let createdUser = await dbHandler.createUser(user);

    if (createdUser) {
        res.cookie("uid", createdUser.uid);
    } else {
        console.log("couldnt create");
        res.redirect('/signup?msg=oopsError');
        return;
    }

    res.redirect('/');

})

app.get('/logout', (req: Request, res: Response) => {
    res.clearCookie('uid').redirect('/');
})

app.post('/validateId', async (req: Request, res: Response) => {
    let isValid = req.body != undefined && req.body.easyId != undefined &&
        /^[a-zA-Z0-9]+$/.test(req.body.easyId) && await dbHandler.checkAlreadyExists(req.body.easyId);

    res.send(isValid ? "true" : "false");
});

app.post('/create', async (req: Request, res: Response) => {

    //TODO: validate loggedIn
    if (req.cookies == undefined || req.cookies.uid == undefined) {
        res.redirect('/');
        return;
    }

    if (!req.body) {
        ejs.renderFile(getStandard('404'), {}, {},
            (err: Error, str: string) => {
                res.status(404);
                res.send(str);
            });
        return;
    }

    if (!req.body.title || !req.body["questions[]"] || !req.body.postText || !req.body.preText || !req.body.easyId) {
        res.status(500);
        res.send("Error. Some fields were not filled out.");
        return;
    }

    let result = await dbHandler.addTest(
        new PurityTest(req.body.title, req.body["questions[]"],
            req.body.preText, req.body.postText, req.body.easyId));

    if (result) {
        res.redirect('/show/' + req.body.easyId);
    } else {
        res.status(500);
        res.send("Error in creating the test. Probably an already used ID.");
    }
});

app.post('/results', (req: Request, res: Response) => {

    if (!req.body || !req.body.totalQuestions || !req.body["questionAnswer[]"] || !req.body.postText) {
        ejs.renderFile(getStandard("404"), {}, {}, (err: Error, str: string) => {
            res.status(404);
            res.send(str);
        });
        return;
    }

    let totalQuestions = parseInt(req.body.totalQuestions);
    let allAnswers = req.body["questionAnswer[]"];
    let checkedNumber = allAnswers.length - 1;
    let resultPercentage = 100 - ((checkedNumber / totalQuestions) * 100);
    ejs.renderFile(getView('results'), {
        title: "Results",
        percentage: resultPercentage,
        postText: req.body.postText
    }, {}, (err: Error, str: string) => {
        res.send(str);
    });
});

app.get('/show/:id', async (req: Request, res: Response) => {
    let id: string = req.params["id"];
    let test = await dbHandler.findAndViewTest(id);

    if (test) {
        ejs.renderFile(getView('show'), {
            title: test.title,
            questions: test.questions,
            views: test.views,
            preText: test.preText,
            postText: test.postText,
            loggedIn: req.cookies != undefined && req.cookies.uid != undefined
        }, {}, (err: Error, str: string) => {
            if (err) {
                res.send(err.name + ": " + err.message);
                return;
            }
            res.send(str);
        });
    } else {
        ejs.renderFile(getStandard('404'), {}, {}, (err: Error, str: string) => {res.send(str);});
    }

});

app.get('/all/:page', async (req: Request, res: Response) => {
    let sort: string | undefined = undefined;
    // if (req.query != undefined && req.query.sort != undefined) {
    //     sort = req.query.sort;
    // }
    let start: number = parseInt(req.params["page"]) * 25;
    let tests = await dbHandler.getTests(25, start, sort);

    if (tests)
        ejs.renderFile(getView('all'), {test_list: tests,
            loggedIn: req.cookies != undefined && req.cookies.uid != undefined},
            (err: Error, str: string) => {
                res.send(str);
            });
    else
        ejs.renderFile(getStandard('404'), {}, {}, (err: Error, str: string) => {res.send(str);});
});

app.get('/all', async (req: Request, res: Response) => {
    let tests = await dbHandler.getTests(25, 0);
    if (tests)
        ejs.renderFile(getView('all'), {test_list: tests,
                loggedIn: req.cookies != undefined && req.cookies.uid != undefined},
            (err: Error, str: string) => {
                res.send(str);
            });
    else
        ejs.renderFile(getStandard('404'), {}, {}, (err: Error, str: string) => {res.send(str);});
});

app.get('/', async (req: Request, res: Response) => {

    let loggedIn: boolean = req.cookies != undefined && req.cookies.uid != undefined;

    let pTests: PurityTest[] | null = await dbHandler.getTests(10, 0);

    if (pTests)
        ejs.renderFile(getView('index'), {test_list: pTests, loggedIn: loggedIn}, {},
            (err: Error, str: string) => {
                if (err) {
                    console.log(err.name + ": " + err.message);
                }
                res.send(str);
            });
    else
        ejs.renderFile(getView('index'), {test_list: undefined, loggedIn: loggedIn}, {},
            (err: Error, str: string) => {
                if (err) {
                    console.log(err.name + ": " + err.message);
                }
                res.send(str);
            });
});

app.get('/*', (req: Request, res: Response) => {
    ejs.renderFile(getStandard('404'), {}, {},
        (err: Error, str: string) => {
            res.send(str);
            res.status(404);
        });
})

// @ts-ignore
let attemptClose = async (options, exitCode) => {
    let success = dbHandler.disconnect().then((result) => {
        console.log(result ? "closed connection" : "couldn't close");
    }).catch((err: Error) => {
        console.log("couldn't close connection");
        console.log(err.name + ": " + err.message);
    }).finally(() => {
        if (options.exit) process.exit();
    });
};

process.on("exit", attemptClose.bind(null, {exit: true}));

process.on("SIGINT", attemptClose.bind(null, {exit: true}));

process.on("SIGUSR1", attemptClose.bind(null, {exit: true}));
process.on("SIGUSR2", attemptClose.bind(null, {exit: true}));

app.listen(process.env.PORT || 3000, async () => {
    if (await dbHandler.connect()) {
        console.log("Listening on port: " + (process.env.PORT || 3000));
    } else {
        console.log("DB BROKE;");
        process.exit();
    }
});