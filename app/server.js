var express = require('express');

var app = express();

app.use(express.static('public'));

app.listen(process.env.PORT || process.argv[2] || 3000, function () {
    console.log('Ready to roll!');
});
