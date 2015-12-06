//
// ペッパー商人
//

// KiiCound周り
var KiiShouninCore = function()
{
    var self = this;

    // 仮ユーザー作成
    self.createKariUserDfd = function()
    {
        var dfd = $.Deferred();        
        var userFields = {"age":20};
        KiiUser.registerAsPseudoUser({
          success: function(user) {
            var access_token = user.getAccessToken();
            if(localStorage){
                localStorage.access_token = access_token;
            }else{
                Cookies.set('access_token', access_token);
            }
            dfd.resolve();
          },
          failure: function(user, errorString) {
            dfd.reject(errorString);
          }
        }, userFields);
        return dfd.promise();
    };
    // 最後の情報でログイン
    self.lastLoginUserDfd = function()
    {
        var dfd = $.Deferred();
        var access_token;
        if(localStorage){
            access_token = localStorage.access_token;
        }else{
            access_token = Cookies.get('access_token');
        }
        KiiUser.authenticateWithToken(access_token, {
          // Called on successful registration
          success: function(theUser) {
            console.log("login Ok! ");
            dfd.resolve();
          },
          // Called on a failed authentication
          failure: function(theUser, errorString) {
            // handle error
            console.log("login Err! "+ errorString);
            dfd.reject(errorString);
          }
        });
        return dfd.promise();
    };
    
    // 商人を公開
    self.publishShounin = function( shouninJsonTbl, shouninProfile )
    {
        var dfd = $.Deferred();
        var pubCampoBucket = Kii.bucketWithName("pubShouninCampo");//公開する商人の広場バケット
        var obj = pubCampoBucket.createObject();
        obj.set("shouninProfile", shouninProfile)
        obj.set("shoukonData",    shouninJsonTbl);
        obj.save()
        .then(
            function(theObject){
                dfd.resolve();
            }
        ).catch(
            function(error){
                alert("すみませぬ。公開に失敗しました！:" + error);
                dfd.reject(error);
            }
        );
        return dfd.promise();
    };

    // 商人一覧を取得
    // 成功時の引数 {shouninList:[{jsonTbl:,owner:,id:,},], nextQuery:}
    self.queryShouninList = function( query )
    {
        var dfd = $.Deferred();

        var bucket = Kii.bucketWithName("pubShouninCampo");
        var query  = query || KiiQuery.queryWithClause();//無指定の場合は最大数
        query.sortByDesc("_modified");
        bucket.executeQuery(query)
        .then(
            function(param) 
            {
                var queryPerformed = param[0];
                var resultSet      = param[1];
                var nextQuery      = param[2];
                var retParam = {
                    shouninList:[],
                    nextQuery:nextQuery,
                };
                for(var ii=0; ii<resultSet.length; ii++) 
                {
                    var shouninJsonTbl = resultSet[ii].get("shoukonData");
                    var shouninProfile = resultSet[ii].get("shouninProfile");
                    var id    = resultSet[ii].getUUID();                    
                    retParam.shouninList.push({
                        jsonTbl:shouninJsonTbl,
                        shouninProfile:shouninProfile,
                        id:id,
                    });
                }
                dfd.resolve(retParam);
            }
        ).catch(
            function(error)
            {
                alert("すみませぬ。商人一覧の取得に失敗しました！" + error);
                dfd.reject(error);
            }
        );

        return dfd.promise();
    };

    // ■開始処理

    console.log("kii start..");

    // KiiCloud初期化します
    Kii.initializeWithSite("1a730270", "bff0e36d33abbef33bedec08e366f60f", KiiSite.JP);

    console.log("kii login start..");
    if(!localStorage){
        console.log("localStorage..not suppert!!");
    }

    // 仮ユーザーでログインします
    var dfd = $.Deferred();
    var dfdItr = dfd;
    if(localStorage){
        if(!localStorage.access_token)
        {
            dfdItr = dfdItr.then(self.createKariUserDfd);
        }
    }
    else{
        if(!Cookies.get('access_token'))
        {
            dfdItr = dfdItr.then(self.createKariUserDfd);
        }
    }

    dfdItr = dfdItr.then(self.lastLoginUserDfd);
    dfdItr = dfdItr.then(null,function(errString){
        return self.createKariUserDfd()
        .then(self.lastLoginUserDfd)
    })
    .fail(function(errString){
        console.log("failed auto login! "+ errString);
        //alert("自動ログイン失敗です！" + errString);
    });
    dfd.resolve();
};
