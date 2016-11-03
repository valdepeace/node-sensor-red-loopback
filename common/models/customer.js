var LoopBackContext = require('loopback-context');
//var MongoClient=require('mongodb');
var MongoClient=require('mongodb').MongoClient;
var  bcrypt = require('bcryptjs');
var request = require('request');
module.exports = function (Customer) {

    Customer.usersNodeRed = function (ctx, credential, cb) {
        Customer.app.models.Customer.find({where: {email: credential.email}}, function (err, user) {
            if (err) {
                cb(err);
            } else {
                if (user.length > 0) {
                    if (credential.password === user[0].__data.password) {
                        cb(null, user[0])
                    } else {
                        bcrypt.compare(credential.password, user[0].__data.password, function (err, isMatch) {
                            (isMatch) ? cb(null, user[0]) : cb({error: "password failed"});
                        })
                    }
                } else {
                    cb({error: "not found user"})
                }
            }
        });
    }

    Customer.getProjectsCustomers = function(ctx,token,cb) {
        //loggin (info,error)
        // find  email in Sessions with token
        MongoClient.connect("mongodb://localhost:27017/nodesensor",function(err,db){
            if(err)
                cb(err) //loggin
            db.collection('Sessions').find({accessToken:token.token}).toArray(function(err,cursor){

                if(err)
                    cb(err) // loggin
                if(cursor.length>0){
                    Customer.app.models.Customer.find({
                        where:{email:cursor[0].user},
                        include:"projects"}, function(err, user) {
                            if(err)
                                cb(err)
                        // user root or superadmin all projects
                        if (user.length>0 && user[0].__data.roles.length > 0 && user[0].__data.roles[0].__data.name === "root") {
                            Customer.app.models.Project.find({},function (err, projects) {
                                (err) ? cb(err) :
                                    cb(null,{projects:projects})
                            })
                        } else {
                            // customer also projects
                            (user.length == 0) ? ctx.res.status(404).json({error: "not found user"}) :
                                cb(null,{projects: user[0].__data.projects});
                        }
                    });
                }else{
                    cb({error:"not session found"})
                }
                db.close();
            })

        })
    }

    Customer.getTokenEditor = function(ctx,user,cb) {
        //loggin (info,error)
        // find  email in Sessions with token
        Customer.findById(user.id,function(err,user_instan){
            if(err)
                console.log()
            MongoClient.connect("mongodb://localhost:27017/nodesensor",function(err,db){
                if(err)
                    ctx.status(500).json(err) //loggin
                db.collection('Sessions').find({email:user.email}).toArray(function(err,cursor){
                    if(err)
                        ctx.res.status(500).json(err) // loggin
                    if(cursor.length>0){
                        ctx.res.json({token:cursor[0].accessToken})
                    }else{
                        request.post("http://localhost:1880/auth/token",{form: {
                            client_id: "node-red-editor",
                            grant_type: "password",
                            scope: "",
                            username: user.email,
                            password: user_instan.__data.password
                        }},function(err,httpResponse,body){
                            if(err){
                                ctx.res.status(404).json({error:body})
                            }else{
                                if(httpResponse.statusCode!== 200){
                                    ctx.res.status(httpResponse.statusCode).json({error:httpResponse})
                                }else{
                                    ctx.res.send(body)
                                }
                            }
                        })
                    }
                    db.close();
                })

        })


        })
    }

    Customer.remoteMethod('usersNodeRed', {
        description:'Get login users node-red editor',
        accepts:[
            {arg:'ctx',type:'object',http:{ source: 'context'}},
            {arg: 'credentials', type: 'object', http: {source: 'body'}},

        ],
        returns: {arg: 'user', type: 'object', root: true},
        http: {path:'/usersNodeRed', verb: 'post'}
    });
    Customer.remoteMethod('getProjectsCustomers', {
        description:'Get projects customers',
        accepts:[
            {arg:'ctx',type:'object',http:{ source: 'context'}},
            {arg: 'token', type: 'object', http: {source: 'body'}},
        ],
        returns: {arg: 'user', type: 'object', root: true},
        http: {path:'/getProjectsCustomers', verb: 'post'}
    });
    Customer.remoteMethod('getTokenEditor', {
        description:'Get token editor node red',
        accepts:[
            {arg:'ctx',type:'object',http:{ source: 'context'}},
            {arg: 'user', type: 'object', http: {source: 'body'}}
        ],
        returns: {arg: 'token', type: 'object', root: true},
        http: {path:'/getTokenEditor', verb: 'post'}
    });
};
