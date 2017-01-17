/**
 * Created by Andres Carmona Gil on 17/01/2017.
 */
var path=require("path");
var settings_File=path.resolve(__dirname,'../../../datasources.js');
var settings_nodered=require(settings_File);


module.exports = {
    "db": {
        "name": "db",
        "connector": "memory"
    },
    "nodesensor": {
        "host": settings_File.host,
        "port": settings_File.port,
        "database": settings_File.db,
        "name": "nodesensor",
        "connector": "mongodb",
        "username": settings_File.user,
        "password": settings_File.password
    }
};
/*
config node-sensor-red for datasource.js and setting.js property mongodbMultiproject:
 {
 port: 10708,
 host: url,
 bd:"",
 user:"",
 password:""

 }
 */