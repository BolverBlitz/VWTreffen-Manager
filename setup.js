require('dotenv').config()
var mysql = require('mysql');
const SqlString = require('sqlstring');

var db = mysql.createPool({
	connectionLimit : 100,
	host: process.env.MySQL_Login_Host,
	user: process.env.MySQL_Login_Name,
	password: process.env.MySQL_Login_Passwort,
	charset : 'utf8mb4'
});

let sqlcmd = "CREATE DATABASE IF NOT EXISTS vwtreffen;";
let sqlcmdtableMorgenpost = "CREATE TABLE IF NOT EXISTS `events` (`NameErsteller` varchar(255) ,`MailErsteller` varchar(255), `AccesKey` varchar(64), `EventName` varchar(255), `EventArt` varchar(255), `Zeit` varchar(255),`ZeitUnix` varchar(255), `Adresse` varchar(255), `URI` varchar(255), `Beschreibung` varchar(1024), `Verifiziert` varchar(255), `Icon` varchar(64), `Angemeldet` varchar(255), `time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (`EventName`, `Zeit`));"
let alterTable2 = "ALTER TABLE `events` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;"

db.getConnection(function(err, connection){
	if (err) throw err;
		console.log("Connected to " + process.env.MySQL_Login_Host);
		connection.query(sqlcmd, function(err, result){
        if(err) throw err;
			console.log("Database vwtreffen created");
        });
		connection.release();
		db.getConnection(function(err, connection){
			connection.query(`USE vwtreffen;`, function(err, result){
				console.log(`DB switched vwtreffen`);
				connection.query(sqlcmdtableMorgenpost, function(err, result){
					if(err) throw err;
					console.log("Table events created");
					connection.query(alterTable2, function(err, result){
						if(err) throw err;
						console.log("Table events set to other character set");
					});
				});
				connection.release();
			});
		});
				
});