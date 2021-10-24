const fs = require('fs-extra');
const childProcess = require('child_process');


try {
    // Remove current build
    fs.removeSync('./dist/');
    // Copy front-end files
    // fs.copySync('./src/credentials', './dist/credentials');
    fs.copySync('./src/views', './dist/views');
} catch (err) {
    console.log(err);
}
