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
const { Console } = require('console');
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

CreateHTML();
f.log("HTML was created!");

bot.start();

/*----- Commen commands -----*/
bot.on(/^\/help/i, (msg) => {
	if (msg.text.split(' ')[0].endsWith(process.env.Botname) || msg.chat.type === "private") {
		msg.reply.text(`Befehle:\n/alive: Zeigt Bot Statistiken\n/help: Zeigt diese Nachricht\n/lizenz: Zeigt Informationen zum Projekt\n\nFür Admins:\n/updateHTTP: Aktuallisiert die Webseite\n/listAdmin: Zeigt eine Liste aller Admins\n/addAdmin: {Antwort} Fügt den Nutzer als Admin Hinzu\n/remAdmin: {Antwort} Löscht den Nutzer aus der Adminliste\n\nInline Suche für Events:\n@VWeventsBot <Eventname>: Sucht ein Event nach Name\n\nDie Webseite wird alle 10 Minuten automatisch aktualisiert!`)
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

/*----- Modify Events Commands -----*/

  /*----- Rebuild HTML -----*/
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

/*----- Admin Managment -----*/
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

/*----- All Callback Query Handlers -----*/

bot.on('callbackQuery', (msg) => {
	//console.log(msg)
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
								let UpdateVerifiziert = SqlString.format("UPDATE events SET Verifiziert = ? WHERE AccesKey = ?;", ["true", data[2]]); //Set Verifiziert to true
								connection.query(UpdateVerifiziert, function(err, rows, fields) {
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
									//Edit message for verification
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
	}else if(data[0] === 'u'){
		if(fs.existsSync(`./data/Admins.json`)) {
			var AdminJson = JSON.parse(fs.readFileSync(`./data/Admins.json`));
		}else{
			bot.answerCallbackQuery(msg.id,{
				text: `Das können nur Admins nutzen!`,
				showAlert: true
			});
		}
		if(AdminJson["Admins"].includes(msg.from.id)){
			//Chance Icon OR Abgesagt
			if(data[1] === "s"){
				let Flipper = "false", notFlipper = "true"; //Used to create true/false out of AbgesagtShort
				if(data[3] === "f"){
					Flipper = "true", notFlipper = "false"
				}
				var UpdateSQL = SqlString.format("UPDATE `events` SET `Abgesagt`=? WHERE (`Abgesagt`=?) AND (`AccesKey`=?);", [Flipper,notFlipper, data[2]]);
			}else{
				var UpdateSQL = SqlString.format("UPDATE `events` SET `Icon`=? WHERE (`Icon`=?) AND (`AccesKey`=?);", [Icons[data[1]], Icons[data[3]], data[2]]);
			}
			db.getConnection(function(err, connection){
				connection.query(UpdateSQL, function(err, rows){
					if(err){console.log(err)}else{
						if(rows.affectedRows === 1){
							var GetSQL = SqlString.format('SELECT EventName,EventArt,AccesKey,Zeit,ZeitUnix,Adresse,URI,Beschreibung,Icon,Abgesagt FROM events where AccesKey = ?;', [data[2]]);
							db.getConnection(function(err, connection){
								connection.query(GetSQL, function(err, rows){
									if(Object.entries(rows).length === 0){
										//Error Endeling wenn acces Key nicht gefunden wurde
										bot.answerCallbackQuery(msg.id,{
											text: `Da ist etwas schiefgelaufen...`,
											showAlert: true
										});
										let Message = `--- ERROR ---\n\nDer verwendede AccesKey war ungültig. Das Event existiert nicht!`
										if ('inline_message_id' in msg) {
											bot.editMessageText(
												{inlineMsgId: inlineId}, Message,
												{parseMode: 'markdown'}
											).catch(error => console.log('Error:', error));
										}else{
											bot.editMessageText(
												{chatId: chatId, messageId: messageId}, Message,
												{parseMode: 'markdown'}
											).catch(error => console.log('Error:', error));
										}
									}else{
										let Abgesagt = "", AbgesagtShort = ""
										if(rows[0].Abgesagt === "true"){
											var FindetStatt = "Findet nicht statt"
											Abgesagt = "Widerruf der Absage", AbgesagtShort = "t"

										}else{
											var FindetStatt = "Findet statt"
											Abgesagt = "Absagen", AbgesagtShort = "f"
										}
										if(rows[0].ZeitUnix <= Date.now()){
											var Vergangenheitswarnung = "--- Event in Vergangenheit ---"
										}else{
											var Vergangenheitswarnung = "--- Kommendes Event ---"
										}

										let Auto = `Auto`
										let Camping = `Camping`
										let Bier =  `Bier`
										if(rows[0].Icon === Icons[0]){
											Auto = `• Auto •`
										}else if(rows[0].Icon === Icons[1]){
											Camping = `• Camping •`
										}else{
											Bier = `• Bier •`
										}
										var replyMarkup = bot.inlineKeyboard([
											[
											  bot.inlineButton(Auto, { callback: `u_0_${data[2]}_${Icons.indexOf(rows[0].Icon)}` }),
											  bot.inlineButton(Camping, { callback: `u_1_${data[2]}_${Icons.indexOf(rows[0].Icon)}` }),
											  bot.inlineButton(Bier, { callback: `u_2_${data[2]}_${Icons.indexOf(rows[0].Icon)}` })
											],
											[
											  bot.inlineButton(Abgesagt, { callback: `u_s_${data[2]}_${AbgesagtShort}` })
											]
										]);
			
										let Nachricht = `${Vergangenheitswarnung}\n${FindetStatt}\n\n<b>Event Name:</b> <i>${rows[0].EventName}</i>\n<b>Event Art:</b> <i>${rows[0].EventArt}</i>\n<b>Startzeit:</b> <i>${rows[0].Zeit}</i>\n<b>Ort:</b> <i>${rows[0].Adresse}</i>\n<b>Webseite:</b> <i>${rows[0].URI}</i>\n\n<pre language="c++">${rows[0].Beschreibung}</pre>`;
										if ('inline_message_id' in msg) {
											bot.editMessageText(
												{inlineMsgId: inlineId}, Nachricht,
												{parseMode: 'html', replyMarkup}
											).catch(error => console.log('Error:', error));
										}else{
											bot.editMessageText(
												{chatId: chatId, messageId: messageId}, Nachricht,
												{parseMode: 'html', replyMarkup}
											).catch(error => console.log('Error:', error));
										}
										bot.answerCallbackQuery(msg.id,{
											text: "Datenbank wurde aktualisiert...",
											showAlert: false
										});
									}
								});
							});
						}else{
							//Errorhandeling wenn der Knopf veraltete Daten hatte
							bot.answerCallbackQuery(msg.id,{
								text: `Da ist etwas schiefgelaufen...`,
								showAlert: true
							});
							let Message = `--- ERROR ---\n\nEventuell war dieser Knopf veraltet oder es ist ein anderer Fehler aufgetreten...\n\nVersuche es erneut, sollte dies weiterhin passieren wende dich an den Hoster.`
							if ('inline_message_id' in msg) {
								bot.editMessageText(
									{inlineMsgId: inlineId}, Message,
									{parseMode: 'markdown'}
								).catch(error => console.log('Error:', error));
							}else{
								bot.editMessageText(
									{chatId: chatId, messageId: messageId}, Message,
									{parseMode: 'markdown'}
								).catch(error => console.log('Error:', error));
							}
						}
					}
				});
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

/*----------------------Inline Handler--------------------------*/
bot.on('inlineQuery', msg => {
	let query = msg.query;
	let queryarr = query.split('');
	const answers = bot.answerList(msg.id, {cacheTime: 1});
	if(fs.existsSync(`./data/Admins.json`)) {
		var AdminJson = JSON.parse(fs.readFileSync(`./data/Admins.json`));
	}else{
		answers.addArticle({
			id: 'Not Admin',
			title: 'Du bist Admin sein!',
			description: query,
			message_text: ("Diese Fuhktion steht nur Admins zur verfügung, leider konnte kein Admin File gefunden werden :(")
		});
		return bot.answerQuery(answers);
	}
	if(AdminJson["Admins"].includes(msg.from.id)){
		if(queryarr.length === 0){
			answers.addArticle({
				id: 'Not found',
				title: 'Bitte gib den Event Namen an',
				description: query,
				message_text: ("Bitte schreibe den Eventnamen bevor du auf die Nachricht klickst...")
			});
			return bot.answerQuery(answers);
		}else{
			//var GetSQL = `SELECT EventName,EventArt,Zeit,ZeitUnix,Adresse,URI,Beschreibung,Abgesagt FROM events where LOWER(EventName) LIKE LOWER('%${cleanString(query)}%') AND Verifiziert = "true" LIMIT 5;`
			var GetSQL = SqlString.format('SELECT EventName,EventArt,AccesKey,Zeit,ZeitUnix,Adresse,URI,Beschreibung,Icon,Abgesagt FROM events where LOWER(EventName) LIKE LOWER(?) AND Verifiziert = "true" LIMIT 5;', [`%${query}%`]);
			db.getConnection(function(err, connection){
				connection.query(GetSQL, function(err, rows){
					if(Object.entries(rows).length === 0){
						answers.addArticle({
							id: 'Not found',
							title: 'Leider konnte ich kein Event mit diesem Namen finden:',
							description: query,
							message_text: ("Leider konnte ich kein Event mit diesem Namen finden können: " + query)
						});
						return bot.answerQuery(answers);
					}else{
						idCount = 0;
						for (i = 0; i < rows.length; i++) {
							let Abgesagt = "", AbgesagtShort = ""
							if(rows[i].Abgesagt === "true"){
								var FindetStatt = "Findet nicht statt"
								Abgesagt = "Widerruf der Absage", AbgesagtShort = "t"

							}else{
								var FindetStatt = "Findet statt"
								Abgesagt = "Absagen", AbgesagtShort = "f"
							}
							if(rows[i].ZeitUnix <= Date.now()){
								var Vergangenheitswarnung = "--- Event in Vergangenheit ---"
							}else{
								var Vergangenheitswarnung = "--- Kommendes Event ---"
							}
							let EventName = rows[i].EventName
							let EventArt = rows[i].EventArt
							let Zeit = rows[i].Zeit
							let Adresse = rows[i].Adresse
							let URI = rows[i].URI
							let Beschreibung = rows[i].Beschreibung

							let Auto = `Auto`
							let Camping = `Camping`
							let Bier =  `Bier`
							if(rows[i].Icon === Icons[0]){
								Auto = `• Auto •`
							}else if(rows[i].Icon === Icons[1]){
								Camping = `• Camping •`
							}else{
								Bier = `• Bier •`
							}
							var replyMarkup = bot.inlineKeyboard([
								[
								  bot.inlineButton(Auto, { callback: `u_0_${rows[i].AccesKey}_${Icons.indexOf(rows[i].Icon)}` }),
								  bot.inlineButton(Camping, { callback: `u_1_${rows[i].AccesKey}_${Icons.indexOf(rows[i].Icon)}` }),
								  bot.inlineButton(Bier, { callback: `u_2_${rows[i].AccesKey}_${Icons.indexOf(rows[i].Icon)}` })
								],
								[
								  bot.inlineButton(Abgesagt, { callback: `u_s_${rows[i].AccesKey}_${AbgesagtShort}` })
								]
							]);

							let Nachricht = `${Vergangenheitswarnung}\n${FindetStatt}\n\n<b>Event Name:</b> <i>${EventName}</i>\n<b>Event Art:</b> <i>${EventArt}</i>\n<b>Startzeit:</b> <i>${Zeit}</i>\n<b>Ort:</b> <i>${Adresse}</i>\n<b>Webseite:</b> <i>${URI}</i>\n\n<pre language="c++">${Beschreibung}</pre>`;
								answers.addArticle({
									id: idCount,
									title: EventName,
									description: `${EventArt} | ${FindetStatt} | ${Zeit}`,
									message_text: Nachricht,
									reply_markup: replyMarkup,
									parse_mode: 'html'
								});
								idCount++
						}
						return bot.answerQuery(answers).catch(error => console.log(error))
					}
				});
				connection.release();
			});
		}
	}else{
		answers.addArticle({
			id: 'Not Admin',
			title: 'Du bist Admin sein!',
			description: query,
			message_text: ("Diese Fuhktion steht nur Admins zur verfügung, leider stehst du nicht auf der Liste.")
		});
		return bot.answerQuery(answers);
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
			body.rows.map((Event, index) => {
				let DatumZeit = Event.Zeit.split(" ");
				if(Event.URI !== ""){
					var URLHTML = `<a href="${Event.URI}">Eventseite</a>`
				}else{
					var URLHTML = ``
				}
				Sections = Sections + `<section> <span class="icon solid major fas ${Event.Icon}"></span> <h3>${Event.EventName}</h3><p>Was: <i>${Event.EventArt}</i><br>Wann: <i>${DatumZeit[0]}</i> um <i>${DatumZeit[1]}</i> Uhr<br>Wo: <i>${Event.Adresse}</i></br>${addDotDotDotafternumberofwords(Event.Beschreibung, index, 28)}<br><b>${URLHTML}</b></p> </section>`
			});
		}
		var FertigHTML = Vorlage.split('REPLACE_THIS_WITH_SECTIONEVENTS_INFO').join(Sections)
		FertigHTML = FertigHTML.split('REPLACE_THIS_WITH_SECTIONEVENTS_COUNT').join(Count)
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

function cleanString(input) {
	var output = "";
    for (var i=0; i<input.length; i++) {
        if(input.charCodeAt(i) <= 127 || input.charCodeAt(i) === 223 || input.charCodeAt(i) === 252 || input.charCodeAt(i) === 228 || input.charCodeAt(i) === 246 || input.charCodeAt(i) === 196 || input.charCodeAt(i) === 214 || input.charCodeAt(i) === 220) {
			if(input.charCodeAt(i) != 39){
				output += input.charAt(i);
			}
        }
    }
    return output;
}

function addDotDotDotafternumberofwords(input, ind, words) {
	index = input.split(" ");
	let flag = false
	for (var i=0; i<index.length; i++) {
		if(i === words){
			flag = true
			index.splice(i, 0, `<span id='dots${ind}'><b>...</b></span><span id='more${ind}'>`);
		}
	}
	if(flag){
		index.push(`</span>`);
		index.push(`<br><button2 onclick='showMoreFunc(${ind})' id='moreBut${ind}'><i>Zeig mehr</i></button2>`)
	}
	return index.join(" ").replace(/\s{2,}/g, " ");
}