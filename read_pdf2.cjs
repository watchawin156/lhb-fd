const fs = require('fs');
const pdf = require('pdf-parse');

const arg = process.argv[2];
const dataBuffer = fs.readFileSync(arg);
pdf(dataBuffer).then(function (data) {
    console.log(data.text);
}).catch(console.error);
