const app = require('./app');
const f = require('./bot/Funktions');
const OS = require('./bot/Hardware');
const ping = require('ping');
const request = require("request")
const package = require('../package')
const fs = require("fs");
const mysql = require('mysql');
const SqlString = require('sqlstring');
var Time_started = new Date().getTime();

const Icons = ["fa-car-side", "fa-campground", "fa-beer"];

const Telebot = require('telebot');
const bot = new Telebot({
	token: process.env.VWTreffen_TG_Bot_Token,
	limit: 1000,
        usePlugins: ['commandButton']
});

var db = mysql.createPool({
	connectionLimit : 100,
	host: process.env.MySQL_Login_Host,
	user: process.env.MySQL_Login_Name,
	password: process.env.MySQL_Login_Passwort,
	database: 'vwtreffen',
	charset : 'utf8mb4_bin'
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  /* eslint-disable no-console */
  console.log(`Listening: ${process.env.IP}:${port}`);
  /* eslint-enable no-console */
});

CreateHTML();
f.log("HTML was created!");

bot.start();

bot.on(/^\/help/i, (msg) => {
	if (msg.text.split(' ')[0].endsWith(process.env.Botname) || msg.chat.type === "private") {
		msg.reply.text(`Befehle:\n/alive: Zeigt Bot Statistiken\n/help: Zeigt diese Nachricht\n/lizenz: Zeigt Informationen zum Projekt\n\nFür Admins:\n/updateHTTP: Aktuallisiert die Webseite\n/listAdmin: Zeigt eine Liste aller Admins\n/addAdmin: {Antwort} Fügt den Nutzer als Admin Hinzu\n/remAdmin: {Antwort} Löscht den Nutzer aus der Adminliste\n\nDie Webseite wird alle 10 Minuten automatisch aktualisiert!`)
	}
});

bot.on(/^\/lizenz/i, (msg) => {
	bot.sendMessage(msg.chat.id, `Projekt von @BolverBlitz\nLizenz: AGPL-3.0 License \nLizenz Webtemplate: <a href='https://github.com/BolverBlitz/VWTreffen-Manager/tree/master/src/Web'>CCA 3.0</a>\n\n<a href='https://github.com/BolverBlitz/VWTreffen-Manager'>Github</a>`, {parseMode: 'html', webPreview: true})
});

bot.on(/^\/alive/i, (msg) => {
	OS.Hardware.then(function(Hardware) {
		let Output = "";
		Output = Output + '\n- CPU: ' + Hardware.cpubrand + ' ' + Hardware.cpucores + 'x' + Hardware.cpuspeed + ' Ghz';
		Output = Output + '\n- Load: ' + f.Round2Dec(Hardware.load);
		Output = Output + '%\n- Memory Total: ' + f.Round2Dec(Hardware.memorytotal/1073741824) + ' GB'
		Output = Output + '\n- Memory Free: ' + f.Round2Dec(Hardware.memoryfree/1073741824) + ' GB'
		ping.promise.probe('api.telegram.org').then(function (ping) {
			msg.reply.text(`Botname: ${package.name}\nVersion: ${package.version}\nPing: ${ping.avg}ms\n\nUptime: ${f.uptime(Time_started)}\n\nSystem: ${Output}`).then(function(msg)
			{
				setTimeout(function(){
				bot.deleteMessage(msg.chat.id,msg.message_id).catch(error => f.Elog('Error (deleteMessage):' + error.description));
				}, 25000);
            });
            bot.deleteMessage(msg.chat.id, msg.message_id).catch(error => f.Elog('Error (deleteMessage):' + error.description));
		});
	});
});

bot.on(/^\/updateHTTP/i, (msg) => {
	if(fs.existsSync(`./data/Admins.json`)) {
		var AdminJson = JSON.parse(fs.readFileSync(`./data/Admins.json`));
	}else{
		msg.reply.text(`Du musst Admin sein um dies zu nutzen!`);
	}
	if(AdminJson["Admins"].includes(msg.from.id)){
		CreateHTML()
		f.log("HTML was manually updated!");
		msg.reply.text(`Die Webseiten Updatefunktion wurde aufgerufen.`);
	}else{
		msg.reply.text(`Du musst Admin sein um dies zu nutzen!`);
	}
});

bot.on(/^\/listAdmin/i, (msg) => {
	bot.deleteMessage(msg.chat.id, msg.message_id).catch(error => f.Elog('Error: (delMessage)', error.description));
	var keyID = 'Admins';
	var keyName = 'AdminsName';
	if(fs.existsSync(`./data/Admins.json`)) {
		var AdminJson = JSON.parse(fs.readFileSync(`./data/Admins.json`));
	}else{
		msg.reply.text(`Es gibt noch keine Admins...`);
	}
	if(AdminJson[keyID].includes(msg.from.id)){
		let MessageAdmins = "Liste der Admins:\n\n";
		for (i = 0; i < AdminJson[keyID].length; i++) {
			MessageAdmins = MessageAdmins + `${AdminJson[keyName][i]}(${AdminJson[keyID][i]})\n`
		}
		msg.reply.text(`${MessageAdmins}`)
	}else{
		msg.reply.text(`Du musst Admin sein um dies zu nutzen!`);
	}
});

bot.on(/^\/addAdmin/i, (msg) => {
		bot.deleteMessage(msg.chat.id, msg.message_id).catch(error => f.Elog('Error: (delMessage)', error.description));
		if ('reply_to_message' in msg) {
			var UserID = msg.reply_to_message.from.id
			if ('username' in msg.reply_to_message.from) {
				var username = msg.reply_to_message.from.username.toString();
			}else{
				var username = msg.reply_to_message.from.first_name.toString();
			}

			var keyID = 'Admins';
			var keyName = 'AdminsName';
			if(fs.existsSync(`./data/Admins.json`)) {
				var AdminJson = JSON.parse(fs.readFileSync(`./data/Admins.json`));
			}else{
				var AdminJson = {}
				AdminJson[keyID] = [];
				AdminJson[keyName] = [];
			}
			if(AdminJson[keyID].includes(msg.from.id)){
				if(UserID === 777000 || UserID === 1087968824){
					msg.reply.text(`${username}(${UserID}) dieser Nutzer darf kein Admin sein!`);
				}else{
					if(AdminJson[keyID].includes(UserID)){
						msg.reply.text(`${username}(${UserID}) ist bereits Admin!`);
					}else{
						AdminJson[keyID].push(UserID);
						AdminJson[keyName].push(username);

						let NewJson = JSON.stringify(AdminJson);
						msg.reply.text(`${username}(${UserID}) ist nun Admin!`);
						fs.writeFile("./data/Admins.json", NewJson, (err) => {if (err) console.log(err);});
					}
				}
			}else{
				msg.reply.text(`Du musst Admin sein um dies zu nutzen!`);
			}
	}else{
		msg.reply.text(`Fehler: Das kann nur als Antwort auf einen anderen Benutzer verwendet werden!`);
	}
});

bot.on(/^\/remAdmin/i, (msg) => {
	bot.deleteMessage(msg.chat.id, msg.message_id).catch(error => f.Elog('Error: (delMessage)', error.description));
	if ('reply_to_message' in msg) {
		var UserID = msg.reply_to_message.from.id
		if ('username' in msg.reply_to_message.from) {
			var username = msg.reply_to_message.from.username.toString();
		}else{
			var username = msg.reply_to_message.from.first_name.toString();
		}
		var keyID = 'Admins';
		var keyName = 'AdminsName';
		if(fs.existsSync(`./data/Admins.json`)) {
			var AdminJson = JSON.parse(fs.readFileSync(`./data/Admins.json`));
		}else{
			msg.reply.text(`Es gibt noch keine Admins...`);
		}
		if(AdminJson[keyID].includes(msg.from.id)){
			removeItemFromArrayByName(AdminJson[keyID], UserID)
			removeItemFromArrayByName(AdminJson[keyName], username)

			let NewJson = JSON.stringify(AdminJson);
					msg.reply.text(`${username}(${UserID}) ist nun KEIN Admin mehr!`);
					fs.writeFile("./data/Admins.json", NewJson, (err) => {if (err) console.log(err);});
		}else{
			msg.reply.text(`Du musst Admin sein um dies zu nutzen!`);
		}
	}else{
		msg.reply.text(`Fehler: Das kann nur als Antwort auf einen anderen Benutzer verwendet werden!`);
	}
});

bot.on('callbackQuery', (msg) => {
	//console.log(msg.data)
	if ('inline_message_id' in msg) {
		var inlineId = msg.inline_message_id;
	}else{
		var chatId = msg.message.chat.id;
		var messageId = msg.message.message_id;
	}
	var userID = msg.from.id.toString();
	UserIDArray = userID.split('');
	var data = msg.data.split("_")
	
	if(data[0] === 'act')
	{
		if(fs.existsSync(`./data/Admins.json`)) {
			var AdminJson = JSON.parse(fs.readFileSync(`./data/Admins.json`));
		}else{
			bot.answerCallbackQuery(msg.id,{
				text: `Das können nur Admins nutzen!`,
				showAlert: true
			});
		}
		if(AdminJson["Admins"].includes(msg.from.id)){
			bot.answerCallbackQuery(msg.id)
			if(data[3] === 'fr')
			{
				db.getConnection(function(err, connection){
					var GetSQL = SqlString.format('SELECT EventName,EventArt,Zeit,Adresse,URI,Beschreibung FROM events where AccesKey = ?;', [data[2]])
					connection.query(GetSQL, function(err, GetSQLRows, fields) {
						if(!err) {
							if(Object.entries(GetSQLRows).length === 0){
								console.log("DB Error! Looked up a Event that didn´t exist... that should never happen lol");
							}else{
								let UpdateIcon = SqlString.format("UPDATE events SET Verifiziert = ? WHERE AccesKey = ?;", ["true", data[2]]); //Set Icon
								connection.query(UpdateIcon, function(err, rows, fields) {
									if(!err) {
										let replyMarkup = bot.inlineKeyboard([
											[
												bot.inlineButton('Erneute Bewertung...', {callback: `get_${data[1]}_${data[2]}`})
											]
										]);
										let value = GetSQLRows[0]; //Convert SQL first restult into Message to send!
										let Message = `<b>Event wurde Freigegeben!</b>\n\n<b>Event Name:</b> <i>${value.EventName}</i>\n<b>Event Art:</b> <i>${value.EventArt}</i>\n<b>Startzeit:</b> <i>${value.Zeit}</i>\n<b>Ort:</b> <i>${value.Adresse}</i>\n<b>Webseite:</b> <i>${value.URI}</i>\n\n<pre language="c++">${value.Beschreibung}</pre>`
										bot.answerCallbackQuery(msg.id)
										bot.editMessageText(
											{chatId: chatId, messageId: messageId}, `${Message}`,
											{parseMode: 'html', replyMarkup}
										).catch(error => console.log('Error (editMSG.callbackQuery):', error));
									}else{
										console.log("DB Error! Check password, tabels and Data...");
									}
								});
							}
						}else{
							console.log("DB Error! Check password, tabels and Data...");
						}
					});
					connection.release();
				});
			}else if(data[3] === 'ab')
			{
				let replyMarkup = bot.inlineKeyboard([
					[
						bot.inlineButton('Erneute Bewertung...', {callback: `get_${data[1]}_${data[2]}`})
					]
				]);
				bot.editMessageText(
					{chatId: chatId, messageId: messageId}, `Event wurde Abgelehnt!\n\nDas Event kann nur manuell bestätigt werden.`,
					{parseMode: 'html', replyMarkup}
				).catch(error => console.log('Error (editMSG.callbackQuery):', error));
			}else{
				bot.answerCallbackQuery(msg.id,{
					text: "Internal Error!",
					showAlert: true
				});
			}
		}else{
			bot.answerCallbackQuery(msg.id,{
				text: `Das können nur Admins nutzen!`,
				showAlert: true
			});
		}
	}else if(data[0] === 'ico'){
		if(fs.existsSync(`./data/Admins.json`)) {
			var AdminJson = JSON.parse(fs.readFileSync(`./data/Admins.json`));
		}else{
			bot.answerCallbackQuery(msg.id,{
				text: `Das können nur Admins nutzen!`,
				showAlert: true
			});
		}
		if(AdminJson["Admins"].includes(msg.from.id)){
			bot.answerCallbackQuery(msg.id)
			db.getConnection(function(err, connection){
				var GetSQL = SqlString.format('SELECT EventName,EventArt,Zeit,Adresse,URI,Beschreibung FROM events where AccesKey = ?;', [data[2]])
				connection.query(GetSQL, function(err, GetSQLRows, fields) {
					if(!err) {
						if(Object.entries(GetSQLRows).length === 0){
							console.log("DB Error! Looked up a Event that didn´t exist... that should never happen lol");
						}else{
							let UpdateIcon = SqlString.format("UPDATE events SET Icon = ? WHERE AccesKey = ?;", [Icons[data[1]], data[2]]); //Set Icon
							connection.query(UpdateIcon, function(err, rows, fields) {
								if(!err) {
									let replyMarkup = bot.inlineKeyboard([
										[
											bot.inlineButton('Freigeben', {callback: `act_${data[1]}_${data[2]}_fr`}),
											bot.inlineButton('Ablehnen', {callback: `act_${data[1]}_${data[2]}_ab`})
										]
									]);
									let value = GetSQLRows[0]; //Convert SQL first restult into Message to send!
									let Message = `Neues Event\n\n<b>Event Name:</b> <i>${value.EventName}</i>\n<b>Event Art:</b> <i>${value.EventArt}</i>\n<b>Startzeit:</b> <i>${value.Zeit}</i>\n<b>Ort:</b> <i>${value.Adresse}</i>\n<b>Webseite:</b> <i>${value.URI}</i>\n\n<pre language="c++">${value.Beschreibung}</pre>`
									bot.answerCallbackQuery(msg.id)
									bot.editMessageText(
										{chatId: chatId, messageId: messageId}, `${Message}\n\nBitte alle Angaben auf Fehler oder andere Probleme prüfen! Bitte Aktion wählen:`,
										{parseMode: 'html', replyMarkup}
									).catch(error => console.log('Error (editMSG.callbackQuery):', error));
								}else{
									console.log("DB Error! Check password, tabels and Data...");
								}
							});
						}
					}else{
						console.log("DB Error! Check password, tabels and Data...");
					}
				});
				connection.release();
			});
		}else{
			bot.answerCallbackQuery(msg.id,{
				text: `Das können nur Admins nutzen!`,
				showAlert: true
			});
		}
	}else if(data[0] === 'get'){
		if(fs.existsSync(`./data/Admins.json`)) {
			var AdminJson = JSON.parse(fs.readFileSync(`./data/Admins.json`));
		}else{
			bot.answerCallbackQuery(msg.id,{
				text: `Das können nur Admins nutzen!`,
				showAlert: true
			});
		}
		if(AdminJson["Admins"].includes(msg.from.id)){
			bot.answerCallbackQuery(msg.id,{
				text: `AccesKey ist ${data[2]}. ACHTUNG, diese Funktion gibt nur den Key!`,
				showAlert: true
			});
		}else{
			bot.answerCallbackQuery(msg.id,{
				text: `Das können nur Admins nutzen!`,
				showAlert: true
			});
		}
	}else{
		console.log("Unknown CallbackQuery")
	}
});

setInterval(function(){
	CreateHTML()
}, 600000);


function CreateHTML(){
	const Vorlage = fs.readFileSync('./data/Vorlage.html').toString();
	request(`http://localhost:7600/api/v1/VWTreffen?limit=6`, { json: true }, (err, res, body) => {
		if(body.error === "No data was found"){
			var Sections = `<section> <span class="icon solid major fas fa-exclamation-triangle"></span> <h3>Keine Events</h3> </br>Es konnten keine Events für die Zukunft geunden werden :(<b><br><a href="#TreffenErstellen">Erstelle jetzt ein neues Event</a></b></p> </section>`;
			var Count = "0"
		}else{
			var Sections = "";
			var Count = body.rows.length;
			body.rows.map(Event => {
				let DatumZeit = Event.Zeit.split(" ");
				if(Event.URI !== ""){
					var URLHTML = `<a href="${Event.URI}">Eventseite</a>`
				}else{
					var URLHTML = ``
				}
				Sections = Sections + `<section> <span class="icon solid major fas ${Event.Icon}"></span> <h3>${Event.EventName}</h3><p>Was: <i>${Event.EventArt}</i><br>Wann: <i>${DatumZeit[0]}</i> um <i>${DatumZeit[1]}</i> Uhr<br>Wo: <i>${Event.Adresse}</i></br>${Event.Beschreibung}<br><b>${URLHTML}</b></p> </section>`
			});
		}
		var FertigHTML = Vorlage.replace('REPLACE_THIS_WITH_SECTIONEVENTS_INFO', Sections)
		FertigHTML = FertigHTML.replace('REPLACE_THIS_WITH_SECTIONEVENTS_COUNT', Count)
		fs.writeFile("./src/Web/index.html", FertigHTML, (err) => {if (err) console.log(err);
		});
	});
}
function removeItemFromArrayByName(arr) {
    var what, a = arguments, L = a.length, ax;
    while (L > 1 && arr.length) {
        what = a[--L];
        while ((ax= arr.indexOf(what)) !== -1) {
            arr.splice(ax, 1);
        }
    }
    return arr;
}