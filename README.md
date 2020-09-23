# EBG-API
 Plugin based API for all EBG services

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
please edit  the POST API call there in line 63 to your domain!
