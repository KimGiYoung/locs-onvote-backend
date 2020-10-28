var cron = require('./config/corn')  // 스케줄러 
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser')
let cors = require('cors')
var indexRouter = require('./routes/index');


var app = express();

// // view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'build')));
// app.use((request, response, next) => {
//   response.header("Access-Control-Allow-Origin", "*");
//   response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//   response.header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE");


//   next();
// });
app.use('/api', indexRouter);
app.use('/uploads', express.static("uploads"));
app.use('/', express.static("build"))

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  res.status(404).send('ssss');
  //next(createError(404));

});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  console.log(res.locals.error)
  res.status(err.status || 500);
  res.json('error');
});

module.exports = app;
