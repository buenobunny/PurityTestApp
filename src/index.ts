
// @ts-ignore
import express from 'express';
import {Request, Response} from 'express';
let ejs = require('ejs');
const path = require('path');
var bodyParser = require('body-parser');

// @ts-ignore
const app = express();
app.use(bodyParser.urlencoded({ extended:false }));
app.use(bodyParser.json());

function getView(viewName: string): string {
    return path.join(__dirname + '/views/') + viewName + '.ejs';
}

app.get('/new', (req: Request, res: Response) => {
    ejs.renderFile(getView('new'),{}, {},
        (err: Error, str: string) => {
        res.send(str);
    });
});

app.post('/create', (req: Request, res: Response) => {

    if (!req.body) {
        res.status(404);
        res.send("<h1>Error 404!</h1>");
    }

    for (let question in req.body["questions[]"]) {
        console.log(req.body["questions[]"][question]);
    }
    // This following line is how we use a .ejs file to render dynamic data we pass in.
    ejs.renderFile(getView('show'), {
        questions: req.body["questions[]"],
        feedbackText: req.body["feedbackText"],
        title: req.body.title
    }, {}, (err: Error, str: string) => {
        res.send(str);
    });
});

app.post('/results', (req: Request, res: Response) => {

    var totalQuestions = parseInt(req.body.totalQuestions);
    var allAnswers = req.body["questionAnswer[]"];
    var checkedNumber = allAnswers.length;
    var resultPercentage = ((checkedNumber / totalQuestions) * 100);
    ejs.renderFile(getView('results'), {
        percentage: resultPercentage,
        finalText: "You are 100% airbender."
    }, {}, (err: Error, str: string) => {
        res.send(str);
    });
});

app.get('/show/:id', (req: Request, res: Response) => {
    let id: string = req.params["id"];
    //TODO: get form from DB
});

app.post('/show', (req: Request, res: Response) => {

});

app.get('/*', (req: Request, res: Response) => {
    ejs.renderFile(getView('index'), {}, {},
        (err: Error, str: string) => {
            if (err) {
                console.log(err.name + ": " + err.message);
            }
            res.send(str);
        });
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Listening on port: " + (process.env.PORT || 3000));
});