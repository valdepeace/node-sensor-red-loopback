var LoopBackContext = require('loopback-context');
//var MongoClient=require('mongodb');
var MongoClient=require('mongodb').MongoClient;
var  bcrypt = require('bcryptjs');
var request = require('request');
module.exports = function (Customer) {
    Customer.beforeRemote('login',function(context,accesToken,next){
        var req=context.req;
        var res=context.res;
        if(req.accessToken===null){
            next()
        }else{
            req.accessToken.validate(function(err,isValid){
                if(err)
                    res.send(err);
                if(isValid){
                    //res.send(accesToken)
                    next()
                }else{
                    //error
                    next()
                }
            })
        }
    });

    Customer.afterRemote('login',function(context,accesToken,next){
        if(!accesToken.errors){
            var expired=new Date(accesToken.__data.created.getTime()+accesToken.__data.ttl);
            //var expired=new Date(accesToken.__data.created.getTime()+10)

            accesToken.updateAttribute("expired",expired,function(err,obj){
                if(err){
                    //error
                }else{
                    //res.send(accesToken)
                    next()
                }
            })
        }else{
            next()
        }
    });

    // Set the username to the users email address by default.
    Customer.observe('before save', function setDefaultUsername(ctx, next) {
    if (ctx.instance) {
      if(ctx.isNewInstance) {
        ctx.instance.username = ctx.instance.email;
      }
      ctx.instance.status = 'created';
      ctx.instance.created = Date.now();
    }
    next();
  });
    Customer.current = function(ctx,cb) {
        var accessToken=ctx.req.accessToken && ctx.req.accessToken.__data
        if(accessToken){
            Customer.app.models.Customer.findById(accessToken.customerId.toJSON(), function(err, user) {
                delete user.password
                var currentUser={
                    created:user.__data.created,
                    email:user.__data.email,
                    id:user.__data.id.toJSON(),
                    passwordConfirm:user.__data.passwordConfirm,
                    roles:user.__data.roles,
                    status:user.__data.status,
                    username:user.__data.username
                }
                err ? cb(err) : cb(null, currentUser);
            });


        }else{
            cb('Invalid or missing accessToken');
        }
        return

    }

    Customer.usersNodeRed = function(ctx,credential,cb) {
            //loggin (info,error)
        if (ctx){
            Customer.app.models.Customer.find({where:{email:credential.email}}, function(err, user) {
                if(err){
                    ctx.status(500).send(err);
                }else{
                    if(user.length>0){
                        if(credential.password===user[0].__data.password){
                            ctx.res.json(user[0])
                        }else{
                            bcrypt.compare(credential.password,user[0].__data.password,function(err,isMatch){
                                (isMatch)?ctx.res.json(user[0]):ctx.res.status(404).json({error:"password failed"});
                            })
                        }
                    }else{
                        ctx.res.status(404).json({error:"not found user"})
                    }
                }
            });
        }else{
            Customer.app.models.Customer.find({where:{email:credential.email}}, function(err, user) {
                if(err){
                    cb(err);
                }else{
                    if(user.length>0){
                        if(credential.password===user[0].__data.password){
                            cb(user[0])
                        }else{
                            bcrypt.compare(credential.password,user[0].__data.password,function(err,isMatch){
                                (isMatch)?cb(user[0]):cb({error:"password failed"});
                            })
                        }
                    }else{
                        cb({error:"not found user"})
                    }
                }
            });
        }
    }

    Customer.getProjectsCustomers = function(ctx,token,cb) {
        //loggin (info,error)
        // find  email in Sessions with token
        MongoClient.connect("mongodb://localhost:27017/nodesensor",function(err,db){
            if(err)
                ctx.status(500).json(err) //loggin
            db.collection('Sessions').find({accessToken:token.token}).toArray(function(err,cursor){

                if(err)
                    ctx.status(500).json(err) // loggin
                if(cursor.length>0){
                    Customer.app.models.Customer.find({
                        where:{email:cursor[0].user},
                        include:"projects"}, function(err, user) {
                            if(err)
                                ctx.res.status(500).json(err)
                        // user root or superadmin all projects
                        if (user.length>0 && user[0].__data.roles.length > 0 && user[0].__data.roles[0].__data.name === "root") {
                            Customer.app.models.Project.find({},function (err, projects) {
                                (err) ? ctx.res.status(500).json(err) :
                                    ctx.res.json({projects:projects})
                            })
                        } else {
                            // customer also projects
                            (user.length == 0) ? ctx.res.status(404).json({error: "not found user"}) :
                                ctx.res.json({projects: user[0].__data.projects});
                        }
                    });
                }else{
                    ctx.res.status(404).json({error:"not session found"})
                }
                db.close();
            })

        })
        /*
        Customer.getDataSource().connect(function(err,db){
            db.collection('Sessions').find({accessToken:token.token}).toArray(function(err,cursor){

            })
        })
        */
        /*
        Customer.getDataSource().connector.collection("Sessions").find({accessToken:token.token}).toArray(function(err,cursor){
            if(err)
                console.log(err)
            Customer.app.models.Customer.find({where:{email:credential.email}}, function(err, user) {
                err ? ctx.res.json({error:err}) :
                    (user.length==0)? ctx.res.json({error:"not found user"}):
                        (credential.password===user[0].passwordConfirm)?ctx.res.json(user[0]):ctx.res.json({error:"password failed"});
            });
            return
        })
        */

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
        /*
         Customer.getDataSource().connect(function(err,db){
         db.collection('Sessions').find({accessToken:token.token}).toArray(function(err,cursor){

         })
         })
         */
        /*
         Customer.getDataSource().connector.collection("Sessions").find({accessToken:token.token}).toArray(function(err,cursor){
         if(err)
         console.log(err)
         Customer.app.models.Customer.find({where:{email:credential.email}}, function(err, user) {
         err ? ctx.res.json({error:err}) :
         (user.length==0)? ctx.res.json({error:"not found user"}):
         (credential.password===user[0].passwordConfirm)?ctx.res.json(user[0]):ctx.res.json({error:"password failed"});
         });
         return
         })
         */

    }

    Customer.remoteMethod('current', {
        description:'Get current users login in system',
        accepts:[
            {arg:'ctx',type:'object',http:{ source: 'context'}},
        ],
        returns: {arg: 'user', type: 'object', root: true},
        http: {path:'/current', verb: 'get'}
    });
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
