const Tesseract = require('tesseract.js');
Tesseract.recognize('https://hws.dev/images/receipt.jpg', 'eng').then(result => {
  console.log(result.data.text);
}).catch(err => {
  console.error(err);
});
