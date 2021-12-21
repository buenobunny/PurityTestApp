import * as path from "path";

let ejs = require('ejs');

export async function getErrorPage(code: number, msg: string, loggedIn?: boolean): Promise<string> {
    return new Promise<string>((resolve) => {
        ejs.renderFile(
            path.join(__dirname + '/../views/standards/') + 'error.ejs', {
                title: "Error",
                loggedIn: loggedIn != undefined ? loggedIn : false,
                msg: msg,
                code: code
            }, {},
            (err: Error, str: string) => {
                console.log(err);
                resolve(str);
            });
    });
}

export function getView(viewName: string): string {
    return path.join(__dirname + '/../views/') + viewName + '.ejs';
}