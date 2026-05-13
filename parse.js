import fs from 'fs';
import * as pdfParseModule from 'pdf-parse';

let dataBuffer = fs.readFileSync('/Volumes/T7 90998167/comments for carbon emission portal.pdf');

const pdf = pdfParseModule.default || pdfParseModule;

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
}).catch(err => {
    console.error(err);
});
