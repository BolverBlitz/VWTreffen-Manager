require('dotenv').config();
const express = require('express');
const rateLimit = require("express-rate-limit");
const Joi = require('joi');
const mysql = require('mysql');
const SqlString = require('sqlstring');
var randomstring = require("randomstring");

var db = mysql.createPool({
	connectionLimit : 100,
	host: process.env.MySQL_Login_Host,
	user: process.env.MySQL_Login_Name,
	password: process.env.MySQL_Login_Passwort,
	database: 'vwtreffen',
	charset : 'utf8mb4_bin'
});

const InsertTreffen = "INSERT INTO events (NameErsteller, MailErsteller, AccesKey, EventName, EventArt, Zeit, ZeitUnix, Adresse, URI, Beschreibung, Icon, Verifiziert) VALUES ?";

const Telebot = require('telebot');
const bot = new Telebot({
	token: process.env.VWTreffen_TG_Bot_Token,
	limit: 1000
});

const PluginConfig = {
	Eventart: ["Treffen","Ausfahrt","Stammtisch","Sonstiges"]
}

/* Plugin info*/
const PluginName = "EBG-VWTreffen";
const PluginRequirements = [];
const PluginVersion = "0.0.2";
const PluginAuthor = "BolverBlitz";
const PluginDocs = "";

const POSTlimiter = rateLimit({
	windowMs: 15 * 60 * 1000, 
	max: 5
  });
  const GETlimiter = rateLimit({
	windowMs: 15 * 60 * 1000, 
	max: 50
  });

const router = express.Router();

const schemaPost = Joi.object({
	PersonName: Joi.string().max(256).trim().required().regex(/^[a-z\d\s\-\.\,\ä\ü\ö\ß]*$/i),
	PersonEmail: Joi.string().max(256).email().required(),
	Eventname: Joi.string().max(256).required().regex(/^[a-z\d\s\-\.\,\ä\ü\ö\ß]*$/i),
	Eventart: Joi.number().max(3).required(), 
	Date: Joi.string().trim().required().regex(/^(?:(?:31(\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\.)(?:0?[13-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(\.)(?:(?:0?[1-9])|(?:1[0-2]))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/),
	Time: Joi.string().trim().required().regex(/([01]?[0-9]|2[0-3]):[0-5][0-9]/),
	Adresse: Joi.string().trim().max(256).required().regex(/^[a-z\d\s\-\.\,\ä\ü\ö\ß]*$/i),
	URL: Joi.string().max(256).uri().allow(''),
	Beschreibung: Joi.string().trim().max(1024).required().regex(/^[a-z\d\s\-\.\,\ä\ü\ö\ß]*$/i),
});

const schemaGet = Joi.object({
	limit: Joi.number().max(50),
	timestamp: Joi.number(),
	evnetname: Joi.string().max(256).allow('')
});

router.post('/', POSTlimiter, async (reg, res, next) => {
	try{
		const value = await schemaPost.validateAsync(reg.body);
		let RString = randomstring.generate({
			length: 24,
			charset: 'hex'
		  });
		let DateTime = `${value.Date} ${value.Time}`
		let ZeitTemp = value.Time.split(":");
		let TimeSplit = value.Date.split(".");
		var newDate = TimeSplit[1] + "/" + TimeSplit[0] + "/" + TimeSplit[2];
		let TimeUnix = new Date(newDate).getTime() + ZeitTemp[0] * 60 * 60 * 1000 + ZeitTemp[1] * 60 * 1000;
		var values = [
			[value.PersonName, value.PersonEmail, RString, value.Eventname, PluginConfig.Eventart[value.Eventart], DateTime, TimeUnix, value.Adresse, value.URL, value.Beschreibung, "undefined", "false"]
		];
		db.getConnection(function(err, connection){
			if(err) {
				let Message = `Critital Error in POST/\n\nError: ${err.code}\nMessage: ${err.sqlMessage}\nData: ${err.sql}`
				bot.sendMessage(`${process.env.Telegram_Admin_Chat_ID}`, Message, { parseMode: 'html' , webPreview: false}).catch(error => console.log('Error: (Telegram Send Message)', error.description));
				res.status(503);
				res.json({
					message: "Database error!"
				});
			}else{
				connection.query(InsertTreffen, [values], function(err, result){
					if(err) {
						if(err.code === "ER_DUP_ENTRY"){
							res.status(400);
							res.json({
								message: "Duplicated Entry"
							});
						}else{
							let Message = `Critital Error in POST/\n\nError: ${err.code}\nMessage: ${err.sqlMessage}\nData: ${err.sql}`
							bot.sendMessage(`${process.env.Telegram_Admin_Chat_ID}`, Message, { parseMode: 'html' , webPreview: false}).catch(error => console.log('Error: (Telegram Send Message)', error.description));
							res.status(503);
							res.json({
								message: "Database error!"
							});
						}
					}else{
						//DB Write ok
						if(value.URL !== ""){
							var URIExit = value.URL
						}else{
							var URIExit = `Wurde nicht angegeben!`
						}
						let replyMarkup = bot.inlineKeyboard([
							[
								bot.inlineButton('Auto', {callback: `ico_0_${RString}`}),
								bot.inlineButton('Camping', {callback: `ico_1_${RString}`}),
								bot.inlineButton('Bier', {callback: `ico_2_${RString}`})
							]
						]);
						let Message = `Neues Event von <b>${value.PersonName}</b> (${value.PersonEmail})\n\n<b>Event Name:</b> <i>${value.Eventname}</i>\n<b>Event Art:</b> <i>${PluginConfig.Eventart[value.Eventart]}</i>\n<b>Startzeit:</b> <i>${value.DateTime}</i>\n<b>Ort:</b> <i>${value.Adresse}</i>\n<b>Webseite:</b> <i>${URIExit}</i>\n\n<pre language="c++">${value.Beschreibung}</pre>`
						bot.sendMessage(`${process.env.Telegram_Admin_Chat_ID}`, `${Message}\n\nWähle ein passendes Icon:`, { parseMode: 'html' , webPreview: false, replyMarkup}).catch(error => console.log('Error: (Telegram Send Message)', error.description));
						res.json(value);
					}
				});
				connection.release();
			}
		});
	}catch (error) {
		console.log(error)
		next(error);
	}
});

router.get('/', GETlimiter, async (reg, res, next) => {
	try{
		const value = await schemaGet.validateAsync(reg.query);
		var TimeNow = new Date().getTime();

		if(!reg.query.limit){
			if(reg.query.timestamp){
				var GetSQL = SqlString.format(`SELECT EventName,EventArt,Zeit,Adresse,URI,Beschreibung,Icon FROM events where Verifiziert = "true" AND ZeitUnix > ? ORDER BY ZeitUnix ASC;`, [value.timestamp]);
			}else{
				var GetSQL = SqlString.format(`SELECT EventName,EventArt,Zeit,Adresse,URI,Beschreibung,Icon FROM events where Verifiziert = "true" AND ZeitUnix > ? ORDER BY ZeitUnix ASC;`, [TimeNow]);
			}
		}else{
			if(reg.query.timestamp){
				var GetSQL = SqlString.format('SELECT EventName,EventArt,Zeit,Adresse,URI,Beschreibung,Icon FROM events where Verifiziert = "true" AND ZeitUnix > ? ORDER BY ZeitUnix ASC LIMIT ?;', [value.timestamp, value.limit]);
			}else{
				var GetSQL = SqlString.format('SELECT EventName,EventArt,Zeit,Adresse,URI,Beschreibung,Icon FROM events where Verifiziert = "true" AND ZeitUnix > ? ORDER BY ZeitUnix ASC LIMIT ?;', [TimeNow, value.limit]);
			}
		}

		db.getConnection(function(err, connection){
			connection.query(GetSQL, function(err, rows, fields) {
				if(!err) {
					if(Object.entries(rows).length === 0){
						res.status(500);
						res.json({
							error: "No data was found"
						});
					}else{
						res.json({
							rows: rows
						});
					}
				}else{
					res.status(503);
					res.json({
						error: "Database error!"
					});
				}
			});
			connection.release();
		});
	}catch (error) {
		console.log(error)
		next(error);
	}
});

module.exports = {
	router: router,
	PluginName: PluginName,
	PluginRequirements: PluginRequirements,
	PluginVersion: PluginVersion,
	PluginAuthor: PluginAuthor,
	PluginDocs: PluginDocs
  };