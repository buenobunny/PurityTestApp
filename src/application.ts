import {User} from "./objects/User";

require('dotenv').config();
import {DBHandler} from "./dbHandler";
// @ts-ignore
import express from 'express';
import {Request, Response} from 'express';
let ejs = require('ejs');
const path = require('path');
let bodyParser = require('body-parser');
let cookieParser = require('cookie-parser');
import {PurityTest} from "./objects/PurityTest";
import {UserRouter} from "./routers/UserRoutes";
import {TestRouter} from "./routers/TestRouter";
import {TestResult} from "./objects/TestResult";
import {DBFunctions} from "./dbFunctions/DBFunctions";
import {getErrorPage} from "./devFunctions/standards";

export async function runApp() {

// @ts-ignore
    const app = express();
    app.use(bodyParser.urlencoded({ extended:false }));
    app.use(bodyParser.json());
    app.use(express.static(__dirname + '/assets'));
    app.use(cookieParser(process.env.COOKIE_SECRET));

    let emailValidator = require('email-validator');

    const cookieOptions = {
        maxAge: 604800,
        secure: !(process.env.dev === "TRUE"),
        httpOnly: true,
        sameSite: 'strict',
        signed: true
    };

    let dbHandler: DBHandler = new DBHandler();
// @ts-ignore
    let connectRes = await dbHandler.connect();
    if (connectRes == null) {
        console.log("Couldn't connect to db");
        process.exit();
    }
    let dbFuncs: DBFunctions = connectRes as DBFunctions;
    let userRoutes: UserRouter = new UserRouter(dbFuncs, cookieOptions);
    let testRoutes: TestRouter = new TestRouter(dbFuncs);


    function getView(viewName: string): string {
        return path.join(__dirname + '/views/') + viewName + '.ejs';
    }

    function getStandard(standard: string): string {
        return getView('/standards/' + standard);
    }

    function checkLoggedIn(req: Request) {
        return !(req.signedCookies == undefined || req.signedCookies.uid == undefined);
    }

    app.use((req: Request, res: Response, next) => {

        if (req.signedCookies != undefined && req.signedCookies.uid === 'undefined') {
            res.clearCookie('uid');
        }

        next();
    });

    app.get('/new', (req: Request, res: Response) => {

        if (req.signedCookies == undefined || req.signedCookies.uid == undefined) {
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

    app.post('/login', userRoutes.loginLogic);

    app.get('/signup', (req: Request, res: Response) => {

        if (req.signedCookies != undefined && req.signedCookies.uid != undefined) {
            res.redirect('/');
            return;
        }

        ejs.renderFile(getView('signup'),
            {msg: req.query != undefined && req.query.msg != undefined ? true : undefined}, {},
            (err: Error, str: string) => {
                res.send(str);
            });

    });

    app.post('/signup', userRoutes.signupLogic);

    app.get('/logout', (req: Request, res: Response) => {
        res.clearCookie('uid').redirect('/');
    })

    app.post('/validateId', async (req: Request, res: Response) => {
        let isValid = req.body != undefined && req.body.easyId != undefined && req.body.easyId.length < 40 &&
            /^[a-zA-Z0-9]+$/.test(req.body.easyId) && await dbFuncs.testFunctions.checkAlreadyExists(req.body.easyId);

        res.send(isValid ? "true" : "false");
    });

    app.post('/create', testRoutes.createTest);

    app.post('/likeTest', testRoutes.likeTest);

    app.post('/results', (req: Request, res: Response) => {

        if (!req.body || !req.body.totalQuestions || !req.body["questionAnswer[]"] || req.body.postText == undefined) {
            ejs.renderFile(getStandard("404"), {}, {}, (err: Error, str: string) => {
                res.send(str);
            });
            return;
        }

        let totalQuestions = parseInt(req.body.totalQuestions);
        let allAnswers = req.body["questionAnswer[]"];
        let checkedNumber = allAnswers.length - 1;
        let resultPercentage = (100 - ((checkedNumber / totalQuestions) * 100)).toFixed(2);
        ejs.renderFile(getView('results'), {
            title: "Results",
            percentage: resultPercentage,
            postText: req.body.postText,
            loggedIn: checkLoggedIn(req),
            testId: req.body.testId,
            testTitle: req.body.testTitle
        }, {}, (err: Error, str: string) => {
            if (err) {
                console.log(err.name + ": " + err.message);
                res.send(err);
                return;
            }
            res.send(str);
        });
    });

    app.post('/saveResult', userRoutes.saveResult);

    app.get('/myStuff', userRoutes.myStuff);
    app.get('/myTests', userRoutes.myTests);
    app.get('/myResults/:id', userRoutes.myResults);

    app.get('/test/:id', async (req: Request, res: Response) => {
        let id: string = req.params["id"];
        let test = await dbFuncs.testFunctions.findAndViewTest(id);

        if (test == null) {
            ejs.renderFile(getStandard('404'), {}, {}, (err: Error, str: string) => {res.send(str);});
            return;
        }

        let loggedIn: boolean = req.signedCookies != undefined && req.signedCookies.uid != undefined;
        let user: User | null = null;
        if (loggedIn) {
            user = await dbFuncs.userFunctions.getUser(req.signedCookies.uid);
        }
        let liked: boolean = (user != null) ? await dbFuncs.userFunctions.findLike(user.username, id) : false;

        if (test) {
            ejs.renderFile(getView('show'), {
                test: test,
                loggedIn: loggedIn,
                userLiked: liked,
                username: user && user.uid != null ? user.uid : undefined
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
        if (req.query != undefined && req.query.sort != undefined) {
            sort = req.query.sort as string;
        }
        let start: number = parseInt(req.params["page"]) * 25;
        let tests = await dbFuncs.testFunctions.getTests(25, start, sort);
        let numTests: number | null = await dbFuncs.testFunctions.getNumTests();

        if (tests)
            ejs.renderFile(getView('all'), {
                    test_list: tests,
                    loggedIn: req.signedCookies != undefined && req.signedCookies.uid != undefined,
                    page: {next: numTests && numTests > start + 25, prev: start > 0, curr: parseInt(req.params["page"]), sort: sort}
                },
                (err: Error, str: string) => {
                    res.send(str);
                });
        else
            ejs.renderFile(getStandard('404'), {}, {}, (err: Error, str: string) => {res.send(str);});
    });

    app.get('/all', async (req: Request, res: Response) => {
        let sort: string | undefined = undefined;
        if (req.query != undefined && req.query.sort != undefined) {
            sort = req.query.sort as string;
        }
        let tests = await dbFuncs.testFunctions.getTests(25, 0, sort);
        let numTests: number | null = await dbFuncs.testFunctions.getNumTests();
        if (tests)
            ejs.renderFile(getView('all'), {
                    test_list: tests,
                    loggedIn: req.signedCookies != undefined && req.signedCookies.uid != undefined,
                    page: {next: numTests && numTests > 25, prev: false, curr: 0, sort: sort}
                },
                (err: Error, str: string) => {
                    res.send(str);
                });
        else
            ejs.renderFile(getStandard('404'), {}, {}, (err: Error, str: string) => {res.send(str);});
    });

    app.get('/', async (req: Request, res: Response) => {

        let loggedIn: boolean = req.signedCookies != undefined && req.signedCookies.uid != undefined;

        let pTests: PurityTest[] | null = await dbFuncs.testFunctions.getTests(10, 0);
        ejs.renderFile(getView('index'), {test_list: pTests != null ? pTests : undefined, loggedIn: loggedIn}, {},
            (err: Error, str: string) => {
                if (err) {
                    console.log(err.name + ": " + err.message);
                }
                res.send(str);
            });
    });

    app.get('/*', async (req: Request, res: Response) => {
        let str = await getErrorPage(404, "The page you're looking for doesn't exist!", req.signedCookies.uid != undefined);
        res.send(str);
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
        console.log("Listening on port: " + (process.env.PORT || 3000));
    });
}
