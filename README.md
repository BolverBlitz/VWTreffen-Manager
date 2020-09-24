# VW-Events Manager
 Any user can create Events via a simple form on the webpage, you and others can verify the events in a telegram chat  
 all Events will be listet on the webpage.
 You can also request events via the buildin API by a simple http request

 ### Installation
 clone this repo  
 setup a MYSQL Server  
 npm i  
 edit .env with your information
 node setup  
 create ./data/Admins.json and wirte:  
 ```json
 {"Admins":[Your Telegram ID],"AdminsName":["Your Telegram Username"]}
  ```
 node ./src/index.js


### Webserver
please use apache2, nginx or any other webserver
The API uses express as webserver but it needs to be proxyed!  
  
The API should be api.your-domain.tld on port 443 and proxyed to localhost:(The Port you set in .env)  
  
The main webfolder is ./src/Web, on first startup it will create index.html based on ./data/Vorlage.html  
please edit the POST API call there in line 63 (./data/Vorlage.html) to your domain!  
please edit the GET API call there in line 34 (./src/Web/suche.html)to your domain!  

### Build-in-API
The API is avaible at api.your-domain.tld/api/v1/VWTreffen it has 2 functions:  
POST to create a new event, it needs to be verifyed by an admin!  
Parameter:
```
PersonName: Name of the event creator, will remain privat to admins (STRING,REQUIRED)
PersonEmail: Email of the event creator, will remain privat to admins (E-MAIL,REQUIRED)
Eventname: Event name (STRING,REQUIRED)
Eventart: Event type, those are preset in VWTreffen Plugin config! (NUMBER,REQUIRED)
DateTime: Date and Time (24h clock) when the event will start (STRING,REQUIRED)
Adresse: Event location (STRING,REQUIRED)
URL: Event webpage (URI,OPTIONAL)
Beschreibung: Short event discription max 1024 chars (STRING,REQUIRED)
```
  
GET to get all events  
Parameter:
```
limit: to limit the results  (NUMBER,OPTIONAL)
timestamp: UNIX Timestamp to get results after that  (NUMBER,OPTIONAL)
```
example: api.your-domain.tld/api/v1/VWTreffen?limit=5 will return 5 events (If there are 5 or more events in the database!)  

The API has buildin error handeling and will return wrong information.  
Error codes used:
```
400: Something in your request was wrong, it will have a message or error string with more information
429: You are rate limited, default is 5 requests evers 15 minutes per IP
500: No data to send back
503: Internal Server error, maybe the database isn´t available
```


### Licence of the HTML5 template used
Hyperspace by HTML5 UP
html5up.net | @ajlkn
Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)


So I've had the wireframe for this particular design kicking around for some time, but with all
the other interesting (and in some cases, semi-secret) projects I've been working on it took me
a little while to get to actually designing and coding it. Fortunately, things have eased up
enough for me to finaly get around to it, so I'm happy to introduce Hyperspace: a fun, blocky,
one-page design with a lot of color, a bit of animation, and an additional "generic" page template
(because hey, even one-page sites usually need an interior page or two). Hope you dig it :)

Demo images* courtesy of Unsplash, a radtastic collection of CC0 (public domain) images
you can use for pretty much whatever.

(* = not included)

AJ
aj@lkn.io | @ajlkn


Credits:

	Demo Images:
		Unsplash (unsplash.com)

	Icons:
		Font Awesome (fontawesome.io)

	Other:
		jQuery (jquery.com)
		Scrollex (github.com/ajlkn/jquery.scrollex)
		Responsive Tools (github.com/ajlkn/responsive-tools)
