require('dotenv').config();
import {DBHandler} from "./dbHandler";
// @ts-ignore
import express from 'express';
import {Request, Response} from 'express';
import {PurityTest} from "./objects/PurityTest";
let ejs = require('ejs');
const path = require('path');
var bodyParser = require('body-parser');

// @ts-ignore
const app = express();
app.use(bodyParser.urlencoded({ extended:false }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/assets'));

let dbHandler: DBHandler = new DBHandler();

function getView(viewName: string): string {
    return path.join(__dirname + '/views/') + viewName + '.ejs';
}

function getStandard(standard: string): string {
    return getView('/standards/' + standard);
}

app.get('/new', (req: Request, res: Response) => {
    ejs.renderFile(getView('new'),{
        title: "New Test"
        }, {},
        (err: Error, str: string) => {
        res.send(str);
    });
});


app.post('/validateId', async (req: Request, res: Response) => {
    let isValid = req.body != undefined && req.body.easyId != undefined &&
        /^[a-zA-Z0-9]+$/.test(req.body.easyId) && await dbHandler.checkAlreadyExists(req.body.easyId);

    res.send(isValid ? "true" : "false");
});

app.post('/create', async (req: Request, res: Response) => {

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

    var totalQuestions = parseInt(req.body.totalQuestions);
    var allAnswers = req.body["questionAnswer[]"];
    var checkedNumber = allAnswers.length - 1;
    var resultPercentage = ((checkedNumber / totalQuestions) * 100);
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
            postText: test.postText
        }, {}, (err: Error, str: string) => {
            if (err) {
                res.send(err);
                return;
            }
            res.send(str);
        });
    } else {
        ejs.renderFile(getStandard('404'), {}, {}, (err: Error, str: string) => {res.send(str);});
    }

});

// app.get('/show', (req: Request, res: Response) => {
//
// });

app.get('/', async (req: Request, res: Response) => {

    let pTests: PurityTest[] | null = await dbHandler.getTests(10, 0);

    if (pTests)
        ejs.renderFile(getView('index'), {test_list: pTests}, {},
            (err: Error, str: string) => {
                if (err) {
                    console.log(err.name + ": " + err.message);
                }
                res.send(str);
            });
    else
        ejs.renderFile(getView('index'), {test_list: undefined}, {},
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

app.listen(process.env.PORT || 3000, () => {
    console.log("Listening on port: " + (process.env.PORT || 3000));
});