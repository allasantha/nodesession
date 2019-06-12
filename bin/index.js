var express         =	  require("express");
var redis           =	  require("redis");
var mysql           =	  require("mssql");
var session         =	  require('express-session');
var redisStore      =	  require('connect-redis')(session);
var bodyParser      =	  require('body-parser');
var cookieParser    =	  require('cookie-parser');
var path            =	  require("path");
var async           =	  require("async");
var client          =   redis.createClient();
var app             =	  express();
var router          =	  express.Router();

var pool	= new mysql.ConnectionPool({
    connectionLimit : 100,
    user     : 'sa',
	password : 'lasMadu@0307',
	server:'LASANTHA-PC',
    database : 'redis_demo',
    
});

app.set('views', path.join(__dirname,'../','views'));
app.engine('html', require('ejs').renderFile);

app.use(session({
		secret: 'secret',
		store: new redisStore({ host: 'localhost', port: 6379, client: client,ttl :  260}),
		saveUninitialized: false,
		resave: false
}));
app.use(cookieParser("secretSign#143_!223"));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

function handle_database(req,type,callback) {
	async.waterfall([
		function(callback) {
			pool.connect(function(err,connection){
				if(err) {
					callback(true);
				} else {
					callback(null,connection);
				}
			});
		},
		function(connection,callback) {
			var SQLquery;
			switch(type) {
				case "login" :
				SQLquery = "SELECT * from user_login WHERE user_email='"+req.body.user_email+"' AND `user_password`='"+req.body.user_password+"'";
				break;
        
				default :
				break;
			}
			callback(null,connection,SQLquery);
		},
		function(connection,SQLquery,callback) {
			connection.query(SQLquery,function(err,rows){
        connection.release();
                if(!err) {
                    if(type === "login") {
                        callback(rows.length === 0 ? false : rows[0]);
                    }  
                } else {
            callback(true);
        }
            });
        }
	],function(result){
    // This function gets call after every async task finished.
		if(typeof(result) === "boolean" && result === true) {
			callback(null);
		} else {
			callback(result);
		}
	});
}

router.get('/',function(req,res){
	res.render('index.html');
});

router.post('/login',function(req,res){
	handle_database(req,"login",function(response){
		if(response === null) {
			res.json({"error" : "true","message" : "Database error occured"});
		} else {
			if(!response) {
				res.json({"error" : "true","message" : "Login failed ! Please register"});
			} else {
				req.session.key = response;
				res.json({"error" : false,"message" : "Login success."});
			}
		}
	});
});

router.get('/home',function(req,res){
	if(req.session.key) {
		res.render("home.html",{ email : req.session.key["user_name"]});
	} else {
		res.redirect("/");
	}
});



router.get('/logout',function(req,res){
	if(req.session.key) {
    req.session.destroy(function(){
      res.redirect('/');
    });
	} else {
		res.redirect('/');
	}
});

app.use('/',router);

app.listen(3000,function(){
	console.log("Server is running at 3000");
});