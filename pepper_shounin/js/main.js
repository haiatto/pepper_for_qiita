//
// ペッパー商人
//

// パラメータ解析です
function getUrlParameter(sParam)
{
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) 
    {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) 
        {
            return sParameterName[1];
        }
    }
}
$(function(){
    if(!getUrlParameter("lunchPepper") && !document.shouninConfig.lunchPepper)
    {
        $(window).on('beforeunload', function() {
            return 'このまま移動しますか？';
        });
    }
});


// Cocosのリソース定義
var res = {
    frame01_png : "cocos_res/frame01.png",
    frame02_png : "cocos_res/frame02.png",
    frame03_png : "cocos_res/frame03.png",

    workspace_frame_png : "cocos_res/workspace_frame.png",
    workspace_linehead_png : "cocos_res/workspace_linehead.png",
    workspace_separate_bar_png : "cocos_res/workspace_separate_bar.png",

    slider_frame_png : "cocos_res/slider_frame.png",
    slider_volume_png: "cocos_res/slider_volume.png",

    cmdblock_frame01_png : "cocos_res/cmdblock_frame01.png",
    cmdblock_frame_select01_png : "cocos_res/cmdblock_frame_select01.png",
    cmdblock_frame_execute01_png : "cocos_res/cmdblock_frame_execute01.png",

    ShoukonIn_png: "cocos_res/ShoukonIn.png",

    icon_dustbox_png: "cocos_res/icon_dustbox.png",

    pepper_icone_png : "cocos_res/pepper-icone.png",
};  
var preload_res = [];
for (var i in res) {
    preload_res.push(res[i]);
}



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
var KiiShouninCoreIns = null;

// NaoQi周り
function NaoQiCore()
{
    var self = this;
    self.ipAddr      = "128.0.0.1"
    self.lunchPepper = false;
    self.qim         = null;
    self.nowState    = "未接続";

    if(getUrlParameter("lunchPepper"))
    {
        console.log("lunchPepper mode on!");
        self.lunchPepper = true;
    }
    if(document.shouninConfig.lunchPepper)
    {
        self.lunchPepper = true;
        // ここら辺は後でリファクタリング(NaoQiCoreは分離できた方がいいし)
        if(ShouninCoreIns){
            ShouninCoreIns.lunchPepper = true;
        }
    }

    self.serviceCache = {};
    
    // qimのサービスのラッパ
    // ※サービス取得が猛烈に重いのでキャッシュします
    //   (pythonのクラスをダンプした結果のコメント文も込みで、
    //    うん万文字も送られてくるので頻繁にやると処理に影響出るくらい本当に遅いです。
    //    関節動かす時とかに色々と反応送れる原因がコレでした…。
    //    ホントは文字列を直転送じゃなくてハッシュ値で済ます仕組みだったらモット早くなるはず…
    //    そこは現状がパケットのフレーム内に入る程度か次第？)
    self.service = function(name){
        //TODO:キャッシュ作る
        return self.qim.service(name);
    };

    // ■ ipアドレス設定
    if(localStorage)
    {
        var lastIpAddr = localStorage.getItem("pepper_ip");
        if(lastIpAddr){
            self.ipAddr = lastIpAddr;
        }
    }
    self.setIpAddress = function(ipAddr)
    {
        self.ipAddr = ipAddr;
        localStorage.setItem("pepper_ipAddr",ipAddr);
    };
    self.getIpAddress = function()
    {
        return self.ipAddr;
    };

    // ■ 接続部分

    self.isConnected = function(){
        return "接続中" == self.nowState;
    };

    self.connect = function() 
    {
        var dfd = $.Deferred();
        if(self.qim){
            //TODO: 接続状態の確認と再接続の方法を考える
            if(self.nowState!="接続中"){
                self.qim.socket().socket.connect();
            }else{
                dfd.resolve();
            }
        }
        else{
            console.log("nao qi connect..");
            if(self.lunchPepper){
                 self.qim = new QiSession("198.18.0.1");
            }
            else{
                 self.qim = new QiSession(self.ipAddr);
            }
            self.qim.socket()
            .on('connect', function () {
                console.log("nao qi connect!");

                self.nowState = "接続中";
                self.cleanupReady().then(function(){
                    return self.service("ALTextToSpeech");
                })
                .then(function (tts) {
                    tts.say("せつぞく、しょうにん");
                    dfd.resolve();
                });
            })
            .on('disconnect', function () {
                console.log("nao qi disconnect!");
                self.nowState = "切断";
            })
            .on('error', function (err) {
                console.log("nao qi error!:" + err.result);
                self.nowState = "エラー";
                dfd.reject(err);
            });
        }
        return dfd;
    };
    self.disconnect = function()
    {
    };

    if ( self.lunchPepper ){
        //Pepperから起動の場合は、つながる前提なので繋いでおきます。
        self.connect();
    }
    
    // ■その他便利処理

    // 色々状態持っていそうな処理をリセットして綺麗な体で開始準備します。
    self.cleanupReady = function()
    {
        var alAutonomousLife;
        var alTextToSpeech;
        return self.service("ALAutonomousLife")
        .then(
            function(ins){
                alAutonomousLife = ins;
                return alAutonomousLife.getState();
            }
        ).then(
            function(state){
                if(state!="disabled"){
                    alAutonomousLife.setState("disabled");
                }
                return self.service("ALTextToSpeech");
            }
        ).then(
            function(ins){
                alTextToSpeech = ins;
                alTextToSpeech.setParameter("speed",2.0);
                alTextToSpeech.setParameter("pitch",1.0);
                //emph	[0.0 - 2.0]
                //pauseMiddle	[80.0 and 300.0]
                //pauseLong	[300.0 - 2000.0]
                //pauseSentence	[80.0 and 10000.0]
            }
        );
        /*
            exeContext.qims.service("ALAudioDevice").done(function(ins){
              exeContext.alIns.alAudioDevice = ins;
            });
            exeContext.qims.service("ALMotion").done(function(ins){
              exeContext.alIns.alMotion = ins;
            });
            exeContext.qims.service("ALRobotPosture").done(function(ins){
              exeContext.alIns.alRobotPosture = ins;
            });
            exeContext.qims.service("ALVideoDevice").done(function(ins){
              exeContext.alIns.alVideoDevice = ins;
              exeContext.pepperCameraTopIns    = new PepperCamera(ins,{name:"pepper_block_top_cam"   +exeContext.sandBoxID,cam:0});
              exeContext.pepperCameraBottomIns = new PepperCamera(ins,{name:"pepper_block_bottom_cam"+exeContext.sandBoxID,cam:1});
              exeContext.pepperCameraDepthIns  = new PepperCamera(ins,{name:"pepper_block_depth_cam"+exeContext.sandBoxID,cam:2});
            });
            exeContext.qims.service('ALMemory').then(function(ins){
              exeContext.alIns.alMemory = ins;
            });
            exeContext.qims.service('ALPeoplePerception').then(function(ins){
              exeContext.alIns.alPeoplePerception = ins;
              exeContext.alIns.alPeoplePerception.subscribe("PepperBlock");
            });
            exeContext.qims.service('ALMovementDetection').then(function(ins){
              exeContext.alIns.alMovementDetection = ins;
              exeContext.alIns.alMovementDetection.subscribe("PepperBlock");
              //TEST
              exeContext.alIns.alMovementDetection.getColorSensitivity().done(function(v){console.log("getColorSensitivity "+v);});
              exeContext.alIns.alMovementDetection.getDepthSensitivity().done(function(v){console.log("getDepthSensitivity "+v);});
              exeContext.alIns.alMovementDetection.getCurrentPrecision().done(function(v){console.log("getCurrentPrecision "+v);});
              exeContext.alIns.alMovementDetection.getCurrentPeriod().done(function(v){console.log("getCurrentPeriod "+v);});
              
              //exeContext.alIns.alMovementDetection.setColorSensitivity(0.001);
              //exeContext.alIns.alMovementDetection.setDepthSensitivity(0.005);
              exeContext.alIns.alMovementDetection.setColorSensitivity(0.005);
              exeContext.alIns.alMovementDetection.setDepthSensitivity(0.008);
            });
            exeContext.qims.service('ALEngagementZones').then(function(ins){
              exeContext.alIns.alEngagementZones = ins;
              exeContext.alIns.alEngagementZones.subscribe("PepperBlock");

              exeContext.alIns.alEngagementZones.setFirstLimitDistance(3.0);
              exeContext.alIns.alEngagementZones.setSecondLimitDistance(5.5);
              exeContext.alIns.alEngagementZones.setLimitAngle(180);
            });
            exeContext.qims.service('ALVisualSpaceHistory').then(function(ins){
              exeContext.alIns.alVisualSpaceHistory = ins;
              exeContext.alIns.alVisualSpaceHistory.subscribe("PepperBlock");
            });
        */
    };

    // タブレットをリセットします
    // (2.05だと切断されるので再接続したい…けど現在未完成)
    self.resetTabletSystem = function()
    {
        var dfd = $.Deferred();
        NaoQiCoreIns.service("ALTabletService")
        .then(
            function(alTb)
            {
                //alTb.cleanWebview()
                alTb.resetTablet()
                //alTb.wakeUp()
                .then(
                    function(){
                    },
                    function(err){
                        // Qimの通信が切れて、必ず失敗する(2.05だとエラー出す関数っぽい)
                        console.log("err:"+err);
                        // エラーは織り込み済みなので復帰
                        return $.Deferred().resolve();
                    }
                ).then(
                    function(){
                        // 少し待つ
                        console.log("wait");
                        var dfd = $.Deferred();
                        setTimeout(function(){
                            dfd.resolve();
                        },1000);
                        return dfd;
                    }
                ).then(
                    function(){
                        // 再接続
                        console.log("reconnect");  
                        return NaoQiCoreIns.connect();
                    }
                ).then(
                    function(){
                       console.log("connect");  
                       dfd.resolve();  
                    },
                    function(){
                       console.log("tabletResetFailed");
                       dfd.reject();  
                    }
                ).fail(
                   function(){
                       console.log("tabletResetFailed");
                       dfd.reject();  
                   }
                );
            }
        ).fail(
           function(){
               console.log("tabletResetFailed");
               dfd.reject();  
           }
        );
        return dfd;
    };

    // 未接続時の接続試行処理付タブレットサービスの取得
    var isRegistedEvent = false;
    self.tabletWifiConnect = function()
    {
        var dfdRet = $.Deferred();
        self.service("ALTabletService")
        .then(
            function(alTb)
            {
                var retryCnt = 10;
                var loopFunc = function()
                {
                    //まずステータスチェックします
                    alTb.getWifiStatus()
                    .then(
                        function(state)
                        {
                            console.log(state);
                            //IDLE, SCANNING, DISCONNECTED, or CONNECTED.
                            if("CONNECTED"==state)
                            {
                                // メッセージ受信用にイベント登録します
                                if(isRegistedEvent)
                                {
                                    //完了
                                    dfdRet.resolve(alTb);
                                }
                                else
                                {
                                    isRegistedEvent = true;
                                    self.service("ALMemory")
                                    .then(function(alMemory)
                                        {
                                            alMemory.subscriber("ALTabletService/error")
                                            .then(
                                                function (subscriber) 
                                                {
                                                    subscriber.signal.connect(function (value) {
                                                        console.log(value);
                                                    });
                                                    return alMemory.subscriber("ALTabletService/message");
                                                }
                                            )
                                            .then(
                                                function (subscriber) 
                                                {
                                                    subscriber.signal.connect(function (value) {
                                                        console.log(value);
                                                    });
                                                    return alMemory.subscriber("ALTabletService/onInputText");
                                                }
                                            )
                                            .then(
                                                function (subscriber) 
                                                {
                                                    subscriber.signal.connect(function (value) {
                                                        console.log(value);
                                                    });
                                                    //完了
                                                    dfdRet.resolve(alTb);
                                                }
                                            );
                                        }
                                    );
                                }
                            }
                            else{
                                // 接続中以外なら有効にしてみます
                                alTb.enableWifi()
                                .then(
                                    function()
                                    {
                                        if(retryCnt>0){
                                            retryCnt--;
                                            //二秒おいて再試行してみます
                                            setTimeout(loopFunc,2000);
                                        }
                                        else{
                                            // 失敗にします
                                            dfdRet.reject("retryCnt End");
                                        }
                                    }
                                );
                            }
                        }
                    );
                };
                loopFunc();
            },
            function(err)
            {
                dfdRet.reject(err);
            }
        );
        return dfdRet;
    };

    // 未接続時の接続試行処理などを付けたURLのタブレット表示をします
    self.isShowTablet = false;
    self.showTabletUrl = function(url)
    {
        var dfdRet = new $.Deferred();

        self.tabletWifiConnect()
        .then(function(alTb)
        {
            var dfd = $.Deferred();
            var dfdItr = dfd;
            if(self.isShowTablet)
            {
                dfdItr = dfdItr.then(
                    function(){
                        // 色々安定化に対する噂があるのでとりあえずshowとhideをなるべく対にしておきます。
                        return alTb.hideWebview();
                    }
                ).then(
                    function(){
                        self.isShowTablet = false;
                        // ついでに気になるのを幾つかよんでおきます
                        return alTb.resetToDefaultValue();
                    }
                ).then(
                    function(){
                        return alTb.hide();
                    }
                );
            }
            dfdItr.then(function(){
                return alTb.showWebview();
            })
//            .then(function(){
//                self.isShowTablet = true;
//                return alTb.reloadPage(false);
//            })
//            .then(function(){
//                return alTb.setOnTouchWebviewScaleFactor(1.0);
//            })
            .then(function(){
                self.isShowTablet = true;
                return alTb.loadUrl(url);
            })
            .then(function(){
                dfdRet.resolve();                
            })
            .fail(function(){
               dfdRet.reject();
            });
            dfd.resolve();
        });
        return dfdRet;
    };
}
var NaoQiCoreIns = null;



// ブロックの生成とかを管理します
// (表示は一切扱いません。それはブロック単体の管理とそれを扱う側が管理してます)
// (ブロック間のリンクも管理しません。それはBlockManagerがやってます。)
var CommandBlockManager = function()
{
    var self = this;

    // ブロックマネージャーの生成をします    
    self.blockManager = new BlockManager({});
    self.materialWsLst = [];
    self.cmdBlockTbl = {};

    // ブロック定義を登録します
    pepperBlock.runRegisterBlock(
        self.blockManager, 
        self.materialWsLst
    );

    // ブロックを生成します(生成するだけ。表示等はどこかに登録された後、そこがやります)
    self.createCommandBlock = function(blockWorldId)
    {
        var blkIns  = self.blockManager.createBlockIns(blockWorldId);
        var cmdBlk  = new CommandBlock(blkIns);
        self.cmdBlockTbl[blkIns.getLutKey()] = cmdBlk;
        return cmdBlk;
    };

    // 
    self.cloneCommandBlockByBlockIns = function(cmdBlk)
    {
        alert("未実装。これはクローン向け");
    };

    // ブロック単体を破棄します(破棄するだけ。内部のリンクの再接続何もしません。また、このコマンドブロックを外部で参照している箇所を消すのは呼んだ側の仕事です。)
    self.destryCommandBlock = function(cmdBlk)
    {
        var blkIns  = cmdBlk.blkIns;
        self.cmdBlockTbl[blkIns.getLutKey()] = null;
        cmdBlk.destry();
    };

    // ブロックの塊をJson向けのテーブル化します
    self.saveCommandBlockLumpToJsonTable = function(cmdBlockLumpTop,callback)
    {
        return self.blockManager.toJsonTable_LumpBlocks( cmdBlockLumpTop.blkIns, function(blkIns,jsonTbl)
        {
            //HACK: UI系保存する？

            //情報付加用
            if(callback){
                callback(lookupCommandBlock(blkIns),jsonTbl);
            }
        });
    };
    // ブロックの塊をJson向けのテーブルから作ります
    self.loadCommandBlockLumpFromJsonTable = function(cmdBlkLumpJsonTbl, callback)
    {
        var lumpBlkIns = self.blockManager.fromJsonTable(cmdBlkLumpJsonTbl,function(blkIns,jsonTbl)
        {
            // コマンドブロックの作成
            var cmdBlk  = new CommandBlock(blkIns);
            self.cmdBlockTbl[blkIns.getLutKey()] = cmdBlk;
            //HACK: UI系復元する？

            //付加情報用
            if(callback){
                callback(cmdBlk,jsonTbl);
            }
        });
        return self.lookupCommandBlock(lumpBlkIns);
    };

    //
    self.lookupCommandBlock = function(blkIns)
    {
        return  self.cmdBlockTbl[blkIns.getLutKey()];
    };
};

// ブロック単体を管理します。扱うのは主に表示やUI操作などです。
// (ブロック間のリンクやスコープの接続先などの管理は一切やりません。
//  それは外の人が管理します。UIについても同様に自分自身の見た目のみです。
//  スコープ先の内容によって自身が伸縮する場合でも、外の人が提供する操作を使って調整します。
//  ※今後のリファクタリングの結果次第で基底クラス的になってデフォルトではUIすら提供しない存在になるカモ。)
var CommandBlock = function(blkIns)
{
    var self = this;
    var visualTempl = blkIns.blockTemplate.blockVisual;

    self.blkIns = blkIns;
    
    // 余り構造を隠しすぎる隠蔽は好きじゃないけど、不便なのでアクセサ系を定義します
    self.getHeaderTemplate = function(){
        return self.blkIns.getTemplate().blockHeader;
    };
    self.getVisibleTemplate = function(){
        return self.blkIns.getTemplate().blockVisual;
    };
    self.getBlockWorldId = function(){
        return self.getHeaderTemplate().blockWorldId;
    };

    self.deferred = function(){
        return self.blkIns.deferred();
    };

    self.setValueInData = function(key,value){
        self.blkIns.setValueInData(key,value);
    };
    self.getValueInData = function(key){
        return self.blkIns.getValueInData(key);
    };

    // UIの見た目
    var createSpriteFrameByFilePath_ = function(filePath){    
        var texture = cc.textureCache.addImage(filePath);
        var texSize = texture.getContentSize();
        return new cc.SpriteFrame(texture, cc.rect(0,0,texSize.width,texSize.height));
    };
    var bgFrame     = createSpriteFrameByFilePath_( res.cmdblock_frame01_png );
    var bgFrameSel  = createSpriteFrameByFilePath_( res.cmdblock_frame_select01_png );
    var bgFrameExec = createSpriteFrameByFilePath_( res.cmdblock_frame_execute01_png );

    self.bg       = cc.Scale9Sprite.create(bgFrame);
    self.label    = cc.LabelTTF.create("", "Arial", 20);
    self.parentUI = null;
    self.bg.addChild(self.label);

    self.destry = function()
    {
        self.blkIns   = null;
        self.setParentUI(null);
        //これでいいのか後で調べる…html5版だと破棄要らないとかあるけど…domだから？さらにテクスチャ等リソースは全部キャッシュ式だから？
        self.bg.   removeFromParentAndCleanup(true);
        //self.label.removeFromParentAndCleanup(true);
    };

    var eventListener = null;
    self.setEventListener = function(listenerParam)
    {
        self.clearEventListener();    
        eventListener = cc.eventManager.addListener(listenerParam,self.bg);
    };
    self.clearEventListener = function()
    {
        if(!eventListener){
            eventListener = null;
            cc.eventManager.removeListener(eventListener);
        }
    };
    //※イベント周りは、ワークスペース側で一括管理にしました。ここにはないです。
    self.setParentUI = function(parentUI)
    {
        if(self.parentUI == parentUI){
            return;
        }
        if(self.parentUI){
            self.parentUI.removeChild(self.bg);
            //self.parentUI.removeChild(self.label, 1);
        }
        self.parentUI = parentUI;
        if(self.parentUI){
            self.parentUI.addChild(self.bg);
            //self.parentUI.addChild(self.label, 1);
        }
    }
    self.getParentUI = function(){
        return self.parentUI;  
    };


    self.setPosition = function(x,y)
    {
        var ofsX=0;
        if(self.getBlockWorldId()=="label@shonin"){
            ofsX = -6;
        }
        if(self.getBlockWorldId()=="gotoLabel@shonin"){
            ofsX = +6;
        }
        self.bg.setPosition   (x+ofsX,y);
        self.updateLabel();
    };
    self.getPosition = function()
    {
        var ofsX=0;
        if(self.getBlockWorldId()=="label@shonin"){
            ofsX = -6;
        }
        if(self.getBlockWorldId()=="gotoLabel@shonin"){
            ofsX = +6;
        }
        var p = self.bg.getPosition();
        p.x -= ofsX;
        return p;
    };

    // 外が操作
    self.getSize = function(){
        return self.bg.getContentSize();
    };

    self.setCurrentVisial = function(){
        var size = self.bg.getContentSize();
        self.bg.setSpriteFrame(bgFrameSel);
        self.bg.setContentSize(size);
        self.bg.addChild(self.label);
        self.updateLabel();
    };
    self.setDefaultVisial = function(){
        var size = self.bg.getContentSize();
        self.bg.setSpriteFrame(bgFrame);
        self.bg.setContentSize(size);
        self.bg.addChild(self.label);
        self.updateLabel();
    };
    self.setExecuteVisial = function(){
        var size = self.bg.getContentSize();
        self.bg.setSpriteFrame(bgFrameExec);
        self.bg.setContentSize(size);
        self.bg.addChild(self.label);
        self.updateLabel();
    };    

    // 基本は中で操作
    self.updateLabel = function(){
        // 内容のテキスト
        var text = visualTempl.disp_name;
        if(self.getBlockWorldId()=="label@shonin"){
            var data = self.getValueInData("labelName")||{string:""};
            text = "ラベル:" + data.string;
        }
        if(self.getBlockWorldId()=="gotoLabel@shonin"){
            var data = self.getValueInData("labelName")||{string:""};
            text = "Goto:" + data.string;
        }
        if(self.getBlockWorldId()=="talk@shonin"){
            var data = self.getValueInData("talkLabel0")||{string:""};
            var previewText = data.string;
            text = "会話:" + previewText.substring(0,5)+"…";
        }
        self.label.setString(text);
        // サイズなどのレイアウト
        var lblSize = self.label.getContentSize();
        var minW=90;
        var minH=32;
        if(self.getBlockWorldId()=="label@shonin"){
            minW = 150;
        }
        self.bg.setContentSize(cc.size(
            Math.max(lblSize.width+6, minW),
            Math.max(lblSize.height,minH))
        );
        //
        var bgSize    = self.bg.getContentSize();
        var labelSize = self.label.getContentSize();
        var px = labelSize.width /2 + (bgSize.width-labelSize.width)/2;
        var py = labelSize.height/2 + (bgSize.height-labelSize.height)/2;
        if(self.getBlockWorldId()=="label@shonin"||
           self.getBlockWorldId()=="gotoLabel@shonin"){
            px=labelSize.width /2+6;//左寄せ
        }
        px=labelSize.width /2+6;//左寄せ
        self.label.setPosition(cc.p(px,py));
    };
    self.setPosition(0,0);
    self.updateLabel();
};


// 複数のブロックを管理します。
// レイアウトを整えたりするお仕事をやります。
// また、実行の起点を扱ったりもします。
var CommandBlockWorkSpace = function(layer, commandBlockManager)
{
    var self = this;

    self.cmdBlkMan = commandBlockManager;
    self.cmdBlockLumpList = [];

    //
    var layout = ccui.ScrollView.create();
    layout.setBackGroundImage(res.workspace_frame_png);
    layout.setBackGroundImageScale9Enabled(true);
    layout.setClippingEnabled(true);
    layout.setDirection(ccui.ScrollView.DIR_VERTICAL);
    layout.setTouchEnabled(true);
    layout.setBounceEnabled(true);
    layer.addChild(layout);

    //ワークスペース内を全部走査します
    var traverseAllCmdBlock_ = function(callbackBlk)
    {
        var isProcOk = false;
        $.each(self.cmdBlockLumpList,function(idx, cmdBlkLump){
            //
            var recv = function(cmdBlk){
                //
                if(callbackBlk){
                    if(callbackBlk(cmdBlk)){
                        isProcOk = true;
                        return;
                    }
                }
                $.each(cmdBlk.blkIns.scopeOutTbl,function(idx2,scopeOut){
                    if(scopeOut.block)
                    {
                        recv( self.cmdBlkMan.lookupCommandBlock( scopeOut.block ) );
                        if(isProcOk) return false;//each終了
                    }
                });
                if(isProcOk)return true;
                if(cmdBlk.blkIns.out)
                { 
                    if(cmdBlk.blkIns.out.block)
                    {
                        recv( self.cmdBlkMan.lookupCommandBlock( cmdBlk.blkIns.out.block ) );
                        if(isProcOk) return;
                    }
                }
            };
            recv(cmdBlkLump);
            if(isProcOk)return false;//each終了
        });
        return isProcOk;
    };

    // ロードセーブ
    self.saveToJsonTable = function()
    {
        var jsonTbl={
            lampBlockLst:[],
        };
        $.each(self.cmdBlockLumpList,function(idx,cmdBlockLump)
        {
            var blkInsJson = self.cmdBlkMan.saveCommandBlockLumpToJsonTable(cmdBlockLump);

            jsonTbl.lampBlockLst.push( blkInsJson );
        });
        return jsonTbl;
    };
    self.loadFromJsonTable = function(jsonTbl)
    {
        var collectAllCmdBlks = [];
        traverseAllCmdBlock_(function(cmdBlk){
            collectAllCmdBlks.push(cmdBlk);
        });
        $.each(collectAllCmdBlks,function(k,cmdBlk){
            self.cmdBlkMan.destryCommandBlock(cmdBlk);
        });
        self.cmdBlockLumpList = [];

        $.each(jsonTbl.lampBlockLst,function(idx,lumpBlockJsonTbl)
        {
            var cmdBlockLump = self.cmdBlkMan.loadCommandBlockLumpFromJsonTable(lumpBlockJsonTbl);
            self.cmdBlockLumpList.push( cmdBlockLump );
        });

        return true;
    };

    // 再生制御
    self.playCtx = {};
    self.execStart = function(startCmdBlk,endCb)
    {
        if ( startCmdBlk && startCmdBlk.getParentUI() != layout ){
            console.warn("other workspace command block");
            return;
        }
        self.playCtx = {
            preExecCallback : function(blk){
                var cmdBlk = self.cmdBlkMan.lookupCommandBlock(blk);
                cmdBlk.setExecuteVisial();
            },
            postExecCallback : function(blk){
                var cmdBlk = self.cmdBlkMan.lookupCommandBlock(blk);
                var curCmdBlk = ShouninCoreIns.getCurCmdBlk();
                if(cmdBlk == curCmdBlk){
                    cmdBlk.setCurrentVisial();
                }else{
                    cmdBlk.setDefaultVisial();
                }
                self.playCtx.needStopCmdBlkCb = null;
            },
            errorExecCallback: function(blk){
                var cmdBlk = self.cmdBlkMan.lookupCommandBlock(blk);
                var curCmdBlk = ShouninCoreIns.getCurCmdBlk();
                if(cmdBlk == curCmdBlk){
                    cmdBlk.setCurrentVisial();
                }else{
                    cmdBlk.setDefaultVisial();
                }
            },
        };
        //self.playCtx.needStopCmdBlkCb = null;

        var blkIns = null;
        if(!startCmdBlk)
        {
            startCmdBlk = self.cmdBlockLumpList[0];
        }
        if(!startCmdBlk)
        {
            if(endCb)endCb();
            return;
        }
        else if(startCmdBlk)
        {
            var execFunc = function(nextCmdBlk)
            {
                nextCmdBlk.blkIns
                .deferred(self.playCtx)
                .then(function(){
                    //終了時
                    if(self.playCtx.nextGotoLabel && self.playCtx.nextGotoLabel.length>0)
                    {
                        //Goto指定があるのでそこへ行きます
                        console.log("goto "+self.playCtx.nextGotoLabel);

                        var gotoCmdBlk = self.findGotoLabelCmdBlk( self.playCtx.nextGotoLabel );
                        if(gotoCmdBlk)
                        {
                            self.playCtx.nextGotoLabel = ""; 
                            // スタックをネストしないため＆無限ループ時に停止しない為
                            // setTimeoutでGotoします(リターン後にシステムが呼びます)
                            setTimeout(function(){
                                execFunc(gotoCmdBlk);
                            },0);
                            return;
                        }
                        else
                        {
                            alert("行き先ラベルブロックが無いようです！:" + self.playCtx.nextGotoLabel);
                        }
                    }
                    if(endCb)endCb();
                    console.log("play end");
                });
            };
            execFunc(startCmdBlk);
        }
    };
    self.execStop = function()
    {
        self.playCtx.needStopFlag = true;
        if(self.playCtx.needStopCmdBlkCb){
            self.playCtx.needStopCmdBlkCb();
        }
    };
    self.findGotoLabelCmdBlk = function(checkLabelName)
    {
        var gotoCmdBlk = null;
        traverseAllCmdBlock_(function(cmdBlk){
            if ( "label@shonin" == cmdBlk.getBlockWorldId() )
            {
                var labelName = cmdBlk.getValueInData("labelName").string;
                if(checkLabelName == labelName){
                    gotoCmdBlk = cmdBlk;
                    return true;
                }
            }
        });
        return gotoCmdBlk;
    };


    // イベントリスナー
    var click = function(cmdBlk)
    {
        //エディタ開くとかカレントにする
        ShouninCoreIns.setCurCmdBlk(cmdBlk); 
        //cmdBlk.blkIns.deferred();
    }
    var tgtCmdBlk_ = null;
    var overrapCmdBlk_ = null;
    var overrapDir_    = 0;
    var listenerParam = 
    {
        event: cc.EventListener.TOUCH_ONE_BY_ONE,
        onTouchBegan: function(touch, event) {    
            if (!cc.rectContainsPoint(layout.getBoundingBoxToWorld(), touch.getLocation())){
                //枠外は無視します
                // ShouninCoreIns.setCurCmdBlk(null); 
                return;
            }
            var isOk = traverseAllCmdBlock_(function(cmdBlk){
                if (cc.rectContainsPoint(cmdBlk.bg.getBoundingBoxToWorld(), touch.getLocation())) 
                {
                    tgtCmdBlk_ = cmdBlk;
                    event.stopPropagation();
                    click(tgtCmdBlk_);
                    return true;
                }
            });
            if(!isOk){
                ShouninCoreIns.setCurCmdBlk(null); 
            }
            return isOk;
        },
        onTouchMoved: function(touch, event) {
            if(tgtCmdBlk_)
            {
                //ブロックを移動します
                var delta = touch.getDelta();
                var pos = tgtCmdBlk_.getPosition();
                pos.x += delta.x;
                pos.y += delta.y;
                tgtCmdBlk_.setPosition(pos.x,pos.y);
                event.stopPropagation();
                // 付加的な操作をします
                if(overrapCmdBlk_){
                    var p = overrapCmdBlk_.getPosition();
                    overrapCmdBlk_.setPosition(p.x+5, p.y - 5*overrapDir_);
                    overrapCmdBlk_ = null;
                    overrapDir_    = 0;
                }
                var isOk = traverseAllCmdBlock_(function(cmdBlk){
                    var rc = cmdBlk.bg.getBoundingBoxToWorld();
                    var pt = touch.getLocation();
                    rc.x    = -9999;//横方向は無視します
                    rc.width = 9999*2;
                    if (cc.rectContainsPoint( rc, pt )) 
                    {
                        if(tgtCmdBlk_!=cmdBlk){
                            overrapCmdBlk_ = cmdBlk;
                            var dy = pt.y - rc.y;
                            if(dy > rc.height/2){ 
                                overrapDir_ = -1;
                            }else{
                                overrapDir_ = 1;
                            }
                            return true;
                        }
                    }
                });
                if(overrapCmdBlk_){
                    var p = overrapCmdBlk_.getPosition();
                    overrapCmdBlk_.setPosition(p.x-5, p.y + 5*overrapDir_);
                }
                return true;
            }
            return false;
        },
        onTouchEnded: function(touch, event) 
        {
            // 重なるブロックがあるなら接続を変更します
            if(tgtCmdBlk_ && overrapCmdBlk_)
            {
                // まずは対象のワークスペース内での接続を解除します
                self.cutCommandBlock(tgtCmdBlk_);
                // 
                if(overrapDir_>0){
                    //下(out)に接続します
                    overrapCmdBlk_.blkIns.connectOut(tgtCmdBlk_.blkIns);
                }else{
                    //上(in)に接続します
                    if(overrapCmdBlk_.blkIns.in && overrapCmdBlk_.blkIns.in.block)
                    {
                        overrapCmdBlk_.blkIns.in.block.connectOut( tgtCmdBlk_.blkIns );
                    }
                    else{
                        tgtCmdBlk_.blkIns.connectOut( overrapCmdBlk_.blkIns );
                    }
                    // 先頭リストのブロックだったなら入れ替えます
                    var idx = self.cmdBlockLumpList.indexOf(overrapCmdBlk_);
                    if(idx>=0){
                        self.cmdBlockLumpList[idx] = tgtCmdBlk_;
                    }
                }
            }
            self.updateLayout();
            tgtCmdBlk_ = null;
            overrapCmdBlk_ = null;
            overrapDir_ = 0;
        },
    };

    //
    self.setPosition = function(x,y)
    {
        layout.setPosition(x,y);
    };
    self.setSize = function(w,h)
    {
        layout.setContentSize(cc.size(w,h));    
    };

    self.updateLayout = function()
    {
        var TAG_SPRITE = 100;

        var removeChildrenByTag = function(layout,tag,cleanup)
        {
            var removes=[];
            $.each(layout.getChildren(),function(idx,child){
                if(child.getTag() == TAG_SPRITE){
                    removes.push(child);
                } 
            });
            $.each(removes,function(idx,child){
                layout.removeChild(child,cleanup);
            });
        };
        removeChildrenByTag(layout,TAG_SPRITE,true);

        var size = layout.getContentSize();
        var x = 32;
        var y = size.height;
        $.each(self.cmdBlockLumpList,function(idx, cmdBlkLump)
        {
            y -= 16;
            
            var sepBarSprt = cc.Scale9Sprite.create(res.workspace_separate_bar_png);
            sepBarSprt.setPosition(cc.p(size.width/2, y+8));
            sepBarSprt.setContentSize(cc.size(size.width,16));
            layout.addChild(sepBarSprt, 0, TAG_SPRITE);

            if(idx>0)
            {
                var btn = ccui.Button.create();
                btn.setTouchEnabled(true);
                btn.loadTextures(res.workspace_linehead_png, null, null);
                btn.setPosition(cc.p(16/2, y+8));
                btn.addTouchEventListener(function(button,type)
                {
                    if(0==type){
                        // 結合
                        self.concatCommandBlockLump(cmdBlkLump);
                        self.updateLayout();
                    }
                });
                layout.addChild(btn, 0, TAG_SPRITE);
            }

            var firstFlg = true;
            var recv = function(cmdBlk)
            {
                cmdBlk.setParentUI(layout);
                cmdBlk.setEventListener({
                    event:        listenerParam.event,
                    onTouchBegan: listenerParam.onTouchBegan,
                    onTouchMoved: listenerParam.onTouchMoved,
                    onTouchEnded: listenerParam.onTouchEnded,
                });
                var blkSize = cmdBlk.getSize();
                cmdBlk.setPosition( 
                    x + blkSize.width /2, 
                    y - blkSize.height/2 
                );
/*
                var lineHeadSprt = cc.Sprite.create(res.workspace_linehead_png);
                lineHeadSprt.setPosition(cc.p(32/2, y - 32/2));
                layout.addChild(lineHeadSprt, 0, TAG_SPRITE);
*/
                if(!firstFlg)
                {
                    var btn = ccui.Button.create();
                    btn.setTouchEnabled(true);
                    btn.loadTextures(res.workspace_linehead_png, null, null);
                    btn.setPosition(cc.p(16/2, y));
                    btn.addTouchEventListener(function(button,type)
                    {
                        if(0==type){
                            // 分割
                            self.splitCommandBlockLump(cmdBlk);
                            self.updateLayout();
                        }
                    });
                    layout.addChild(btn, 0, TAG_SPRITE);
                }
                firstFlg = false;

                y -= blkSize.height;

                $.each(cmdBlk.blkIns.scopeOutTbl,function(idx2,scopeOut)
                {
                    if(scopeOut.block)
                    {
                        recv( self.cmdBlkMan.lookupCommandBlock( scopeOut.block ) );
                    }
                });
                if(cmdBlk.blkIns.out)
                { 
                    if(cmdBlk.blkIns.out.block)
                    {
                        recv( self.cmdBlkMan.lookupCommandBlock( cmdBlk.blkIns.out.block ) );
                    }
                }
            };
            recv(cmdBlkLump);
        });
        if(y<0)
        {
            $.each(layout.getChildren(),function(idx,item){
                var p = item.getPosition();
                p.y += -y;
                item.setPosition(p);
            });
            layout.setInnerContainerSize(cc.size(size.width, -y + size.height));
        }
        else
        {
            layout.setInnerContainerSize(cc.size(size.width, size.height));
        }
    };
    //指定ブロックのinの位置でLumpに分割します
    self.splitCommandBlockLump = function(cmdBlk)
    {
        if(cmdBlk.blkIns.in && cmdBlk.blkIns.in.block)
        {
            var ownerLumpIdx = -1;
            $.each(self.cmdBlockLumpList,function(idx,cmdLumpBlk){
                var checkCmdBlk = cmdLumpBlk;
                while(checkCmdBlk)
                {
                    if(checkCmdBlk == cmdBlk){
                        ownerLumpIdx = idx;
                        return false;
                    }
                    if(checkCmdBlk.blkIns.out && checkCmdBlk.blkIns.out.block){
                        checkCmdBlk = self.cmdBlkMan.lookupCommandBlock( checkCmdBlk.blkIns.out.block );
                    }
                    else{
                        checkCmdBlk = null;
                    }
                }
            });
            if(ownerLumpIdx>=0)
            {
                // inの接続解除します
                cmdBlk.blkIns.clearIn();
                self.cmdBlockLumpList.splice(ownerLumpIdx+1,0,1);
                self.cmdBlockLumpList[ownerLumpIdx+1] = cmdBlk;
            }
        }
    };
    //指定Lumpブロックのinの位置で前のLumpと結合します
    self.concatCommandBlockLump = function(cmdBlk)
    {
        if(cmdBlk.blkIns.in && !cmdBlk.blkIns.in.block)
        {
            var idx = self.cmdBlockLumpList.indexOf(cmdBlk);
            if(idx > 0){
                var preCmdBlk = self.cmdBlockLumpList[idx-1];
                while(preCmdBlk.blkIns.out &&
                      preCmdBlk.blkIns.out.block)
                {
                    preCmdBlk = self.cmdBlkMan.lookupCommandBlock( preCmdBlk.blkIns.out.block );
                }
                if ( preCmdBlk.blkIns.out )
                {
                    preCmdBlk.blkIns.connectOut(cmdBlk.blkIns);
                    self.cmdBlockLumpList.splice(idx,1);
                }
            }
        }
    };
    // 指定ブロックのみ抜き出します
    self.cutCommandBlock = function(cmdBlk,isRemoveWorkspace)
    {
        if ( cmdBlk.getParentUI() != layout ){
            console.warn("other workspace command block");
            return;
        }
        var idx = self.cmdBlockLumpList.indexOf(cmdBlk);
        if(idx>=0){
            // 先頭ブロックリストに居たので下のブロックに入れ替えます。なければ項目を除去します。
            if(cmdBlk.blkIns.out && cmdBlk.blkIns.out.block){
                var outCmdBlk = self.cmdBlkMan.lookupCommandBlock(cmdBlk.blkIns.out.block);
                self.cmdBlockLumpList[idx] = outCmdBlk;
            }else{
                self.cmdBlockLumpList.splice(idx,1);            
            }
        }
        // 対象をリンクからカット（前後を再接続して独立させる）します
        cmdBlk.blkIns.cutInOut();
        if(isRemoveWorkspace){
            cmdBlk.setParentUI(null);
        }
    };
    self.addCommandLumpBlock = function(cmdBlkLumpTop)
    {
        var curCmdBlk = ShouninCoreIns.getCurCmdBlk();
        if(curCmdBlk){
            if ( curCmdBlk.getParentUI() == layout ){
                // カレントがワークスペース内ならその後ろにつなぎます
                curCmdBlk.blkIns.connectOut(cmdBlkLumpTop.blkIns);
                return;
            }
        }
        // それ以外は最後に追加します
        self.cmdBlockLumpList.push(cmdBlkLumpTop);
    };
    self.removeCommandLumpBlock = function(cmdBlkLumpTop)
    {
        var idx = self.cmdBlockLumpList.indexOf(cmdBlkLumpTop);
        if(idx>=0){
            self.cmdBlockLumpList.splice(idx,1);
            return true;
        }
        return false;
    };
};

// -- --
// 商人のコア部分
// MVCのVC的な感じも一応担います。
var ShouninCore = function(){
    var self = this;
    
    self.lunchPepper = false;
    self.cmdBlkMan = new CommandBlockManager();
    self.workSpaceMain = null;
    self.mainScene = null;

    self.curCmdBlk = null;

    var getCurCmdBlkWorldId_ = function(){
        if ( self.curCmdBlk ){
            return self.curCmdBlk.getHeaderTemplate().blockWorldId;
        }
        return null;
    };

    // リスナー登録と通知
    // (このコアの主要な機能です。UIなどはリスナーを登録して状態変化に備えます)
    var listenerLst_ = [];
    self.addListener = function(instance)
    {
        listenerLst_.push(instance);
    };
    self.removeListener = function(instance)
    {
        var idx = listenerLst_.indexOf(instance);
        if(idx>=0){
            listenerLst_.splice(idx,1);
        }
    };
    // データの更新などがあった場合の通知。カレントの変更なども含みます
    self.notifyUpdate = function()
    {
        $.each(listenerLst_,function(k,listener){
            if(listener.shouninCoreUpdate)
            {
                listener.shouninCoreUpdate();
            }
        });
    };
    // 再生状態の変更があった場合の通知。
    self.notifyPlayModeUpdate = function()
    {
        $.each(listenerLst_,function(k,listener){
            if(listener.shouninCorePlayModeUpdate)
            {
                listener.shouninCorePlayModeUpdate();
            }
        });
    };

    // セーブ/ロード
    self.saveToJsonTable = function()
    {
        var jsonTbl = {
            version:"shouninCore@ver0.01",
        };
        jsonTbl.wsMainTbl = self.workSpaceMain.saveToJsonTable();

        return jsonTbl;
    };
    self.loadFromJsonTable = function(jsonTbl)
    {
        if(!self.workSpaceMain.loadFromJsonTable(jsonTbl.wsMainTbl))
        {
            return false;
        }  
        self.workSpaceMain.updateLayout();
        return true;
    };

    // 再生
    self.backupCurCmdBlk = null;
    self.isNowPlaying    = false;
    self.execStartCurCmdBlk = function(endCb)
    {
        // カレントブロックをクリアしてから再生します(ブロック関連UI非表示を簡単にするためやっときます)
        self.backupCurCmdBlk = self.curCmdBlk;
        self.setCurCmdBlk(null);
        
        // 再生開始を通知します
        self.isNowPlaying = true;
        self.notifyPlayModeUpdate();

        var innerEndCb = function(){
            if(endCb)endCb();
            
            // 再生終了を通知します
            self.isNowPlaying = false;
            self.notifyPlayModeUpdate();

            // 再生終了したらカレントブロックを元に戻します
            self.setCurCmdBlk(self.backupCurCmdBlk);
            self.backupCurCmdBlk = null;
        };
        // 再生開始です
        self.workSpaceMain.execStart( self.backupCurCmdBlk, innerEndCb );
    };
    self.execStop = function()
    {
        self.workSpaceMain.execStop();
    };
    self.isNowPlay = function()
    {
        return self.isNowPlaying;
    };

    //
    self.setCurCmdBlk = function(cmdBlk)
    {
        if(self.isNowPlay()){
            return;
        }
        if(self.curCmdBlk)
        {
            self.curCmdBlk.setDefaultVisial();
            self.curCmdBlk = null;
        }
        if(!cmdBlk){
            self.notifyUpdate();
            return;
        }
        self.curCmdBlk = cmdBlk;
        self.curCmdBlk.setCurrentVisial();
        var blkWId = getCurCmdBlkWorldId_();
        if("talk@shonin" == blkWId)
        {
        }
        if("pose@shonin" == blkWId)
        {
            var poseEditData = self.curCmdBlk.getValueInData("poseData0");
            if ( Object.keys(poseEditData.poseData.jointAngles).length <= 0)
            {
                //とりあえずここで新規データ生成してみる
                var initPoseJointData = {
                "HeadPitch":0,"HeadYaw":0,
                "LShoulderPitch":0,"LShoulderRoll":0,"LElbowYaw":0,"LElbowRoll":0,"LWristYaw":0,
                "RShoulderPitch":0,"RShoulderRoll":0,"RElbowYaw":0,"RElbowRoll":0,"RWristYaw":0,
                "HipPitch":0,"HipRoll":0,"KneePitch":0,};
                poseEditData.poseData.jointAngles = initPoseJointData;
            }
        }
        if("ask@shonin" == blkWId)
        {
        }
        self.notifyUpdate();
    };
    self.getCurCmdBlk = function(){
        return self.curCmdBlk;  
    };

    self.removeCmdBlk = function(removeCmdBlkTop)
    {
        var removeBlkIns = removeCmdBlkTop.blkIns;        

        //TODO:ここらへんリファクタリング

        // 削除後に塊の先頭リスト再接続が必要ならリンクを保存しておきます
        var nextCmdLumpBlkTop = null;
        if(!removeBlkIns.in || !removeBlkIns.in.block){    
            if(removeBlkIns.out && removeBlkIns.out.block){
                nextCmdLumpBlkTop = self.cmdBlkMan.lookupCommandBlock(removeBlkIns.out.block);
            }
        }
        
        // 対象をリンクからカット（前後を再接続）します
        removeBlkIns.cutInOut();

        // 自身とその接続先を再帰的に破棄してゆきます
        var isClearCurrent = false;
        self.cmdBlkMan.blockManager.traverseUnderBlock(removeBlkIns,{
            blockCb:function(blockIns)
            {
                var cmdBlk = self.cmdBlkMan.lookupCommandBlock(blockIns);
                if(self.curCmdBlk == cmdBlk)
                {
                    self.setCurCmdBlk(null);
                    //isClearCurrent = true;
                }
                self.cmdBlkMan.destryCommandBlock(cmdBlk);
            },
        });
        
        // ワークスペースの塊の先頭リスト内に居た場合はクリアします
        if(self.workSpaceMain.removeCommandLumpBlock(removeCmdBlkTop))
        {
            if(nextCmdLumpBlkTop){
                self.workSpaceMain.addCommandLumpBlock(nextCmdLumpBlkTop);
            }
        }
    };

    //
    self.isTalkTextEdit = function()
    {
        var blkWId = getCurCmdBlkWorldId_();
        if("talk@shonin" == blkWId) {
            return true;
        }
        return false;
    };
    self.getTalkText = function()
    {
        var blkWId = getCurCmdBlkWorldId_();
        if("talk@shonin" == blkWId) {
            return self.curCmdBlk.getValueInData("talkLabel0").string;
        }
        return "";
    };
    self.setTalkText = function(text)
    {
        var blkWId = getCurCmdBlkWorldId_();
        if("talk@shonin" == blkWId) {
            return self.curCmdBlk.setValueInData("talkLabel0",{string:text});
        }
        self.notifyUpdate();
    };

    // 会話のプレビュー用(シミュモードで使用。もしかしたら字幕的に使うかのせいあるかも？)
    self.isTalkPreviewFlag = false;
    self.previewText = "";
    self.isTalkPreview = function()
    {
        return self.isTalkPreviewFlag;
    };
    self.setTalkPreviewFlag = function(flg)
    {
        self.isTalkPreviewFlag = flg;
        self.notifyUpdate();
    };
    self.setTalkPreviewText = function(text)
    {
        self.previewText = text;
        self.notifyUpdate();
    };
    self.getTalkPreviewText = function()
    {
        return self.previewText;
    };

    // 
    self.isPoseEdit = function()
    {
        var blkWId = getCurCmdBlkWorldId_();
        if("pose@shonin" == blkWId) {
            return true;
        }
        return false;
    };
    self.getPoseEditData = function()
    {//TODO:参照先はそのうちリソースボックス的な所からのデータの編集に書き換わる予定
        var blkWId = getCurCmdBlkWorldId_();
        if("pose@shonin" == blkWId) {
            return self.curCmdBlk.getValueInData("poseData0");
        }
        return null;
    };
    self.setPoseEditData = function(poseEditData)
    {
        var blkWId = getCurCmdBlkWorldId_();
        if("pose@shonin" == blkWId) {
            return self.curCmdBlk.setValueInData("poseData0",poseEditData);
        }
        return null;
    };

    // 選択肢エディット
    self.isAskEdit = function()
    {
        var blkWId = getCurCmdBlkWorldId_();
        if("ask@shonin" == blkWId) {
            return true;
        }
        return false;
    };
    self.getAskEditData = function()
    {
        var blkWId = getCurCmdBlkWorldId_();
        if("ask@shonin" == blkWId) {
            return {
                askType:self.curCmdBlk.getValueInData("askType").string,
                ask:self.curCmdBlk.getValueInData("ask").string,
                ans0:self.curCmdBlk.getValueInData("ans0").string,
                ans1:self.curCmdBlk.getValueInData("ans1").string,
                ans2:self.curCmdBlk.getValueInData("ans2").string,
                ans3:self.curCmdBlk.getValueInData("ans3").string,
                ans4:self.curCmdBlk.getValueInData("ans4").string,
                ans0GotoLabel:self.curCmdBlk.getValueInData("ans0GotoLabel").string,
                ans1GotoLabel:self.curCmdBlk.getValueInData("ans1GotoLabel").string,
                ans2GotoLabel:self.curCmdBlk.getValueInData("ans2GotoLabel").string,
                ans3GotoLabel:self.curCmdBlk.getValueInData("ans3GotoLabel").string,
                ans4GotoLabel:self.curCmdBlk.getValueInData("ans4GotoLabel").string,
            };
        }
        return null;
    };
    self.setAskEditData = function(askEditData)
    {
        var blkWId = getCurCmdBlkWorldId_();
        if("ask@shonin" == blkWId) {
            self.curCmdBlk.setValueInData("askType",{string:askEditData.askType});
            self.curCmdBlk.setValueInData("ask",    {string:askEditData.ask });
            self.curCmdBlk.setValueInData("ans0",   {string:askEditData.ans0});
            self.curCmdBlk.setValueInData("ans1",   {string:askEditData.ans1});
            self.curCmdBlk.setValueInData("ans2",   {string:askEditData.ans2});
            self.curCmdBlk.setValueInData("ans3",   {string:askEditData.ans3});
            self.curCmdBlk.setValueInData("ans4",   {string:askEditData.ans4});
            self.curCmdBlk.setValueInData("ans0GotoLabel",   {string:askEditData.ans0GotoLabel});
            self.curCmdBlk.setValueInData("ans1GotoLabel",   {string:askEditData.ans1GotoLabel});
            self.curCmdBlk.setValueInData("ans2GotoLabel",   {string:askEditData.ans2GotoLabel});
            self.curCmdBlk.setValueInData("ans3GotoLabel",   {string:askEditData.ans3GotoLabel});
            self.curCmdBlk.setValueInData("ans4GotoLabel",   {string:askEditData.ans4GotoLabel});
        }
        return null;
    };

    // 行き先ラベルエディット
    self.isLabelEdit = function()
    {
        var blkWId = getCurCmdBlkWorldId_();
        if("label@shonin" == blkWId) {
            return true;
        }
        return false;
    };
    self.getLabelEditData = function()
    {
        var blkWId = getCurCmdBlkWorldId_();
        if("label@shonin" == blkWId) {
            return self.curCmdBlk.getValueInData("labelName").string;
        }
        return null;
    };
    self.setLabelEditData = function(labelName)
    {
        var blkWId = getCurCmdBlkWorldId_();
        if("label@shonin" == blkWId) {
            self.curCmdBlk.setValueInData("labelName",{string:labelName});
        }
        return null;
    };

    // Goto行き先エディット
    self.isGotoLabelEdit = function()
    {
        var blkWId = getCurCmdBlkWorldId_();
        if("gotoLabel@shonin" == blkWId) {
            return true;
        }
        return false;
    };
    self.getGotoLabelEditData = function()
    {
        var blkWId = getCurCmdBlkWorldId_();
        if("gotoLabel@shonin" == blkWId) {
            return self.curCmdBlk.getValueInData("labelName").string;
        }
        return null;
    };
    self.setGotoLabelEditData = function(labelName)
    {
        var blkWId = getCurCmdBlkWorldId_();
        if("gotoLabel@shonin" == blkWId) {
            self.curCmdBlk.setValueInData("labelName",{string:labelName});
        }
        return null;
    };

};
var ShouninCoreIns = null;

/*
        var sprite = cc.Sprite.create(res.HelloWorld_png);
        sprite.setPosition(size.width / 2, size.height / 2);
        sprite.setScale(0.8);
        //self.addChild(sprite, 0);

        var label = cc.LabelTTF.create("Hello World", "Arial", 40);
        label.setPosition(size.width / 2, size.height / 2);
        self.addChild(label, 1);
*/

//
var BtnBarMenu = function(leftX,topY)
{
    var self = this;

    var layout = ccui.Layout.create();
    layout.setPosition(leftX, topY-48);
    layout.setContentSize(64 * 0 + 8*2, 48);
    layout.setBackGroundImage(res.frame02_png);
    layout.setBackGroundImageScale9Enabled(true);
    layout.setClippingEnabled(true);
    self.layout = layout;

    var btnNum=0;
    var posX = 8;
    self.addBtn = function(label,cb){
        btnNum += 1;
        layout.setContentSize(64 * btnNum + 8*2, 48);

        var btn = ccui.Button.create();
        btn.setTouchEnabled(true);
        btn.setScale9Enabled(true);
        btn.loadTextures(res.cmdblock_frame01_png, null, null);
        btn.setTitleText(label);
        btn.setPosition(cc.p(posX+64/2,24));
        btn.setSize(cc.size(64, 32));
        posX += 64;
        btn.addTouchEventListener(function(button,type)
        {
            if(0==type)
            {
                if(cb)cb(button,type);
            }
        });
        layout.addChild(btn);
    };
};

//
var MainLayer = cc.Layer.extend({
    ctor:function () {
        this._super();
        var self = this;
        var size = cc.director.getWinSize();

        var widgetSize = size;

        self.fileMenu = new BtnBarMenu(0, size.height);
        self.addChild(self.fileMenu.layout);
        self.fileMenu.addBtn("Load",function(button,type)
        {
            if($("#input_dummy")[0])
            {
                document.body.removeChild($("#input_dummy")[0]);
            }
            var input = document.createElement( 'input' );
            $(input).attr({id:"input_dummy",type:"file"});
            $(input).css({display:"none"});
            input.addEventListener( 'change', function ( event ) {
                if(event.target.files[ 0 ]){
                    var fr = new FileReader();
                    fr.onload = function(e)
                    {
                        try{
                            var jsonTbl = JSON.parse(e.target.result);
                            var bOk = ShouninCoreIns.loadFromJsonTable(jsonTbl);
                            if(bOk){
                                alert("ロード完了です！");
                            }else{
                                alert("申し訳ありませぬ。ロードできませんでした。データの内容がおかしいようです。");
                            }
                        }
                        catch(e){
                            alert("申し訳ありませぬ。ロードできませんでした。ファイルが違うものかもしれません。:\n"+e.name + "\n" + e.message);
                        }
                    };
                    fr.readAsText(event.target.files[ 0 ]);
                }
            } );
            document.body.appendChild(input);
            $(input).click();
        });
        self.fileMenu.addBtn("Save",function(button,type)
        {
            if(0==type)
            {
                //Three.jsよりコピペ。後で整理する
                var link = document.createElement( 'a' );
                link.style.display = 'none';
                document.body.appendChild( link );
                var exportString = function ( output, filename ) {
                    var blob = new Blob( [ output ], { type: 'text/plain' } );
                    var objectURL = URL.createObjectURL( blob );

                    link.href = objectURL;
                    link.download = filename || 'data.json';
                    link.target = '_blank';

                    var event = document.createEvent("MouseEvents");
                    event.initMouseEvent(
                        "click", true, false, window, 0, 0, 0, 0, 0
                        , false, false, false, false, 0, null
                    );
                    link.dispatchEvent(event);
                };
                var jsonTbl = ShouninCoreIns.saveToJsonTable();
                exportString(JSON.stringify(jsonTbl),"shoukonScript.json");
            }
        });
        self.fileMenu.addBtn("公開",function(button,type)
        {
            if(0==type)
            {
                // 公開情報設定画面
                var PublishBox = function(parentUI)
                {
                    var self = this;
                
                    var layout = ccui.Layout.create();
                    self.layout = layout;
                    var boxW = 400;
                    var boxH = 240;
                    var posX = ((size.width -boxW)/2);
                    var posY = ((size.height-boxH)/2);

                    layout.setPosition(posX, posY);
                    layout.setContentSize(boxW, boxH);
                    layout.setBackGroundImage(res.frame01_png);
                    layout.setBackGroundImageScale9Enabled(true);
                    layout.setClippingEnabled(true);
                    parentUI.addChild(layout,20);

                    var label = cc.LabelTTF.create("商人情報を記入してね！", "Arial", 30);
                    label.setPosition(cc.p(label.getContentSize().width/2+20, boxH-40));
                    label.setColor(new cc.Color(0,0,0,255));
                    layout.addChild(label, 2);

                    var posY = boxH-100;
                    self.makeEditBox = function(labelText,marginY)
                    {
                        var labelW = 120;
                        var label = cc.LabelTTF.create(labelText, "Arial", 12);
                        label.setPosition(cc.p(label.getContentSize().width/2+16, posY));
                        label.setColor(new cc.Color(0,0,0,255));
                        layout.addChild(label, 2);

                        var bg = cc.Scale9Sprite.create(res.workspace_frame_png);
                        var editBox = cc.EditBox.create(cc.size(200, 28), bg);
                        editBox.fontColor = new cc.Color(0,0,0,255);
                        editBox.setPosition(cc.p((boxW-labelW)-8, posY));
                        editBox.setDelegate(self);
                        layout.addChild(editBox);
                        posY -= 28+marginY;
                        return editBox;
                    };
                    //layout.setContentSize(64 + 8*2, 48);
                    var nameEd  = self.makeEditBox("商人の名前",            0);
                    var ownerEd = self.makeEditBox("作った人のニックネーム", 4);
                    var profEd  = self.makeEditBox("商人の自己紹介",        0);
                    nameEd.string = "とおりすがりの商人";
                    ownerEd.string = "ななしさん";
                    profEd.string = "しょうこんちゅうにゅー";

                    var pepperLayer = ShouninCoreIns.mainScene.pepperLayer;
                    var blockLayer  = ShouninCoreIns.mainScene.blockLayer;
                    if(pepperLayer){
                        pepperLayer.setCanvasVisible(false);
                    }
                    if(blockLayer){
                        blockLayer.setVisible(false);
                    }

                    var btn = ccui.Button.create();
                    btn.setTouchEnabled(true);
                    btn.setScale9Enabled(true);
                    btn.loadTextures(res.cmdblock_frame01_png, null, null);
                    btn.setTitleText("やめる");
                    btn.setPosition(cc.p(posX-64/2-8,24));
                    btn.setSize(cc.size(64, 32));
                    btn.addTouchEventListener(function(button,type)
                    {
                        if(0==type)
                        {
                            if(pepperLayer){
                                pepperLayer.setCanvasVisible(true);
                            }
                            if(blockLayer){
                                blockLayer.setVisible(true);
                            }
                            parentUI.removeChild(layout,true);
                        }
                    });
                    layout.addChild(btn);

                    var btn = ccui.Button.create();
                    btn.setTouchEnabled(true);
                    btn.setScale9Enabled(true);
                    btn.loadTextures(res.cmdblock_frame01_png, null, null);
                    btn.setTitleText("公開する");
                    btn.setPosition(cc.p(posX+64/2,24));
                    btn.setSize(cc.size(64, 32));
                    btn.addTouchEventListener(function(button,type)
                    {
                        if(0==type)
                        {
                            var jsonTbl = ShouninCoreIns.saveToJsonTable();
                            var profile = {
                                shouninName:nameEd.string,
                                ownerName:  ownerEd.string,
                                note:       profEd.string,
                            };
                            KiiShouninCoreIns.publishShounin(jsonTbl,profile)
                            .then(function(){
                                alert("公開しました！");
                                if(pepperLayer){
                                    pepperLayer.setCanvasVisible(true);
                                }
                                if(blockLayer){
                                    blockLayer.setVisible(true);
                                }
                                parentUI.removeChild(layout,true);
                            });
                        }
                    });
                    layout.addChild(btn);
                };
                var publishBox = new PublishBox(self);
            }
        });
        // 
        var x = self.fileMenu.layout.getPosition().x + self.fileMenu.layout.getContentSize().width;
        self.playMenu = new BtnBarMenu(x, size.height);
        self.addChild(self.playMenu.layout);
        self.playMenu.addBtn("プレイ",function(){
           ShouninCoreIns.execStartCurCmdBlk();
        });
        self.playMenu.addBtn("停止",function(){
           ShouninCoreIns.execStop();
        });
        // 
        self.sideMenu = new BtnBarMenu(0, size.height);
        self.addChild(self.sideMenu.layout);
        self.sideMenu.addBtn("商人広場",function(button,type)
        {
            ShouninCoreIns.mainScene.shouninCampoLayer.openCampo();
        });
        var p = self.sideMenu.layout.getPosition()
        var s = self.sideMenu.layout.getContentSize();
        self.sideMenu.layout.setPosition(cc.p(size.width-s.width,p.y));

        var x = self.playMenu.layout.getPosition().x + self.playMenu.layout.getContentSize().width;
        //Test
        var ip = "192.168.3.37";
        self.testMenu = new BtnBarMenu(x, size.height);
        self.addChild(self.testMenu.layout);
        self.testMenu.addBtn("Connect",function(){
            NaoQiCoreIns.setIpAddress(ip);
            NaoQiCoreIns.connect();
        });
        self.testMenu.addBtn("Tablet",function(){
            NaoQiCoreIns.setIpAddress(ip);
            NaoQiCoreIns.connect()
            .then(
                function(){
                    NaoQiCoreIns.showTabletUrl(
                        //"http://haiatto.github.io/pepper_for_qiita/pepper_shounin/?lunchPepper=true"
                        //"http://192.168.11.11:8080/pepper_shounin/?lunchPepper=true"
                        "http://192.168.3.127:8080/pepper_shounin/?lunchPepper=true"
                        //"http://google.co.jp/"
                    ).then(function(){
                        //NaoQiCoreIns.showTabletUrl(
                        //    "http://google.co.jp/"
                        //);
                    });
                    //消えなくなるのは抜けられないようにしてあるからかも…要検証…
                    //return alTb.loadUrl("http://haiatto.github.io/pepper_for_qiita/pepper_shounin/");
                    //return alTb.loadUrl("http://www.yahoo.co.jp/");
                    //"http://google.co.jp/"
                    //http://haiatto.github.io/pepper_for_qiita/pepper_shounin/?lunchPepper=true 
                },
                function(err){
                    console.log("err:"+err.result);
                }
            );
        });
        self.testMenu.addBtn("KillTable",function(){
            NaoQiCoreIns.setIpAddress(ip);
            NaoQiCoreIns.connect()
            .then(
                function(){
                    NaoQiCoreIns.resetTabletSystem()
                }
            );
        });

        var ToolBox = function(parentUI,x,y,w,h)
        {
            var self = this;

            var layout = ccui.Layout.create();
            self.layout = layout;

            var boxW = w||240;
            var boxH = h||320;
            var posX = x||560;
            var posY = y||((size.height-boxH)-48);

            layout.setPosition(posX, posY);
            layout.setContentSize(boxW, boxH);
            layout.setBackGroundImage(res.frame02_png);
            layout.setBackGroundImageScale9Enabled(true);
            layout.setClippingEnabled(true);
            parentUI.addChild(layout);

            layout.setVisible(false);

            var posY = boxH-32;
            self.makeEditBox = function(labelText,marginY)
            {
                var labelMinW = 32;
                var label     = cc.LabelTTF.create(labelText, "Arial", 12);
                var labelSize = label.getContentSize();
                label.setPosition(cc.p(labelSize.width/2, posY));
                label.setColor(new cc.Color(0,0,0,255));
                layout.addChild(label, 2);

                var labelNowW = Math.max(labelSize.width,labelMinW);
                var marginW   = 4;
                var editBoxW  = boxW - (labelNowW+marginW);

                var bg = cc.Scale9Sprite.create(res.workspace_frame_png);
                var editBox = cc.EditBox.create(cc.size(editBoxW, 28), bg);
                editBox.fontColor = new cc.Color(0,0,0,255);
                editBox.setPosition(cc.p(labelNowW + editBoxW/2, posY));
                editBox.setDelegate(self);
                layout.addChild(editBox);
                posY -= 28+marginY;
                return editBox;
            };
            ShouninCoreIns.addListener(self);
            self.shouninCoreUpdate = function(){  
            };

            self.setVisible = function(flag){
                layout.setVisible(flag);
            };

            self.isNowEditCb = function(){return false;};
            self.loadFromShouninDataCb = function(){};
            self.storeToShouninDataCb  = function(){};

            self.shouninCoreUpdate = function()
            {
                if(self.isNowEditCb())
                {
                    self.loadFromShouninDataCb();
                    layout.setVisible(true);
                }
                else{
                    layout.setVisible(false);
                }
            };
            self.editBoxTextChanged = function(sender,text)
            {
                if(self.isNowEditCb())
                {
                    self.storeToShouninDataCb();
                    layout.setVisible(true);
                }
            };
            self.editBoxReturn = function(sender)
            {
                if(self.isNowEditCb())
                {
                    self.storeToShouninDataCb();
                    layout.setVisible(true);
                }
            };
        };

        // ShouninCoreと連動するエディター
        function TalkTextBox(layer){
            var self = this;

            var posX = 260;
            var posY = 0;
            var boxW = 540;
            var boxH = 120;
            var layout = ccui.Layout.create();
            layout.setPosition(cc.p(posX, posY));
            layout.setContentSize(boxW, boxH);
            layout.setBackGroundImage(res.frame01_png);
            layout.setBackGroundImageScale9Enabled(true);
            layout.setClippingEnabled(true);
            layout.setVisible(false);
            layer.addChild(layout);

            var bg = cc.Scale9Sprite.create(res.frame02_png);
            var editBox = cc.EditBox.create(cc.size(boxW-18, boxH-18), bg);
            editBox.fontColor = new cc.Color(0,0,0,255);
            editBox.setFontSize(32);
            editBox.setPosition(cc.p(boxW/2, boxH/2));
            editBox.setDelegate(self);
            layout.addChild(editBox);
            //
            self.setTalkText = function(text)
            {
                editBox.string = text;
                editBox.setFontSize(32);
            },
            self.getTalkText = function()
            {
                return editBox.string;
            };
            //
            var isChangeCanvasSize_ = false;
            self.shouninCoreUpdate = function()
            {
                var pepperLayer = ShouninCoreIns.mainScene.pepperLayer;

                if(ShouninCoreIns.isTalkTextEdit()){
                    self.setTalkText( ShouninCoreIns.getTalkText() );
                    layout.setVisible(true);
                    //
                    if(pepperLayer){
                        pepperLayer.setCanvasMiniSize();
                        isChangeCanvasSize_=true;
                    }
                }
                else{
                    layout.setVisible(false);
                    //
                    if(pepperLayer){
                        if(isChangeCanvasSize_){
                            pepperLayer.setCanvasFullSize();
                            isChangeCanvasSize_=false;
                        }
                    }
                }
            };
            self.editBoxTextChanged = function(sender,text)
            {
                if(ShouninCoreIns.isTalkTextEdit()){
                    ShouninCoreIns.setTalkText(sender.string);
                }
            };
            self.editBoxReturn = function(sender)
            {
                if(ShouninCoreIns.isTalkTextEdit()){
                    ShouninCoreIns.setTalkText(sender.string);
                }
            };
            // 
            ShouninCoreIns.addListener(self);
        };
        self.talkTextBox = new TalkTextBox(self);

        function TalkPreviewBox(layer){
            var self = this;

            var posX = 260;
            var posY = 0;
            var boxW = 540;
            var boxH = 120;
            var layout = ccui.Layout.create();
            layout.setPosition(cc.p(posX, posY));
            layout.setContentSize(boxW, boxH);
            layout.setBackGroundImage(res.frame01_png);
            layout.setBackGroundImageScale9Enabled(true);
            layout.setClippingEnabled(true);
            layout.setVisible(false);
            layer.addChild(layout);

            var bg = cc.Scale9Sprite.create(res.frame02_png);
            bg.setPosition(cc.p(boxW/2, boxH/2));
            bg.setContentSize(cc.size(boxW-18, boxH-18));
            layout.addChild(bg);

            var labelText = cc.LabelTTF.create("");
            labelText.setFontFillColor( new cc.Color(0,0,0,255) );
            labelText.setFontSize(32);
            labelText.setPosition(cc.p(boxW/2, boxH/2));
            layout.addChild(labelText,1);
            //
            //
            self.shouninCoreUpdate = function()
            {
                if(ShouninCoreIns.isTalkPreview()){
                    labelText.setString( ShouninCoreIns.getTalkPreviewText() );
                    layout.setVisible(true);
                }
                else{
                    layout.setVisible(false);
                }
            };
            self.shouninCorePlayModeUpdate = function()
            {
                var pepperLayer = ShouninCoreIns.mainScene.pepperLayer;
                if(ShouninCoreIns.isNowPlay()){
                    layout.setVisible(true);
                    if(pepperLayer)pepperLayer.setCanvasMiniSize();
                }
                else{
                    layout.setVisible(false);
                    if(pepperLayer)pepperLayer.setCanvasFullSize();
                }
            };
            ShouninCoreIns.addListener(self);
        };
        self.talkPreviewBox = new TalkPreviewBox(self);

        
        function TalkTextPadBox(parentUI){
            var self = this;
            var toolbox = new ToolBox(parentUI,null,null,null,280);
            toolbox.isNowEditCb = function(){
                return ShouninCoreIns.isTalkTextEdit();
            };
            toolbox.loadFromShouninDataCb = function(){
                // エディット中
                var talkTextData = ShouninCoreIns.getTalkText();
            };
            toolbox.storeToShouninDataCb  = function(){
                //ShouninCoreIns.setTalkText(talkTextData);
            };
        };
        self.talkTextPadBox = new TalkTextPadBox(self);

        var AskBox = function(parentUI)
        {
            var self = this;
            var toolbox = new ToolBox(parentUI);

            var askEd      = toolbox.makeEditBox("質問",4);
            var ans0Ed     = toolbox.makeEditBox("こたえ１",0);
            var ans0GotoEd = toolbox.makeEditBox("進む先",4);
            var ans1Ed     = toolbox.makeEditBox("こたえ２",0);
            var ans1GotoEd = toolbox.makeEditBox("進む先",4);

            toolbox.isNowEditCb = function(){
                return ShouninCoreIns.isAskEdit();
            };
            toolbox.loadFromShouninDataCb = function(){
                // エディット中
                var askEditData = ShouninCoreIns.getAskEditData();
                askEd.string      = askEditData.ask;
                ans0Ed.string     = askEditData.ans0;
                ans1Ed.string     = askEditData.ans1;
                ans0GotoEd.string = askEditData.ans0GotoLabel;
                ans1GotoEd.string = askEditData.ans1GotoLabel;
            };
            toolbox.storeToShouninDataCb  = function(){
                var askEditData = {
                    ask: askEd.string,
                    ans0:ans0Ed.string,
                    ans1:ans1Ed.string,
                    ans0GotoLabel:ans0GotoEd.string,
                    ans1GotoLabel:ans1GotoEd.string,
                };
                ShouninCoreIns.setAskEditData(askEditData);
            };
        };
        self.askBox = new AskBox(self);

        var LabelBox = function(parentUI)
        {
            var self = this;
            var toolbox = new ToolBox(parentUI);

            var labelNameEd  = toolbox.makeEditBox("行き先ラベル名",4);

            toolbox.isNowEditCb = function(){
                return ShouninCoreIns.isLabelEdit();
            };
            toolbox.loadFromShouninDataCb = function(){
                var labelEditData = ShouninCoreIns.getLabelEditData();
                labelNameEd.string = labelEditData;
            };
            toolbox.storeToShouninDataCb  = function(){
                ShouninCoreIns.setLabelEditData(labelNameEd.string);
            };
        };
        self.labelBox = new LabelBox(self);

        var GotoLabelBox = function(parentUI)
        {
            var self = this;
            var toolbox = new ToolBox(parentUI);

            var labelNameEd  = toolbox.makeEditBox("Goto行き先ラベル名",4);

            toolbox.isNowEditCb = function(){
                return ShouninCoreIns.isGotoLabelEdit();
            };
            toolbox.loadFromShouninDataCb = function(){
                var labelEditData = ShouninCoreIns.getGotoLabelEditData();
                labelNameEd.string = labelEditData;
            };
            toolbox.storeToShouninDataCb  = function(){
                ShouninCoreIns.setGotoLabelEditData(labelNameEd.string);
            };
        };
        self.gotoLabelBox = new GotoLabelBox(self);

        //bg.setScale(2.8);
//        bg.setAnchorPoint(0.0,0.0);
//        bg.setPosition(160, 0);
//        bg.setContentSize(size.width-320, 128);
//        this.addChild(bg);


/*
        var widget = ccui.Widget.create();
        var layout = ccui.Layout.create();
        
        //layout.setAnchorPoint(0.0,0.0);
        layout.setPosition(160, 200);
        layout.setContentSize(128, 150);
        layout.setBackGroundImage(res.frame01_png);
        layout.setBackGroundImageScale9Enabled(true);
        layout.setClippingEnabled(true);
        this.addChild(layout);

        var sprite = cc.Sprite.create(res.HelloWorld_png);
        sprite.setPosition(size.width / 2, size.height / 2);
        sprite.setScale(0.8);
        layout.addChild(sprite, 0);


        {name: "Panel", object: ccui.Layout, handle: parser.LayoutAttributes},
        {name: "Button", object: ccui.Button, handle: parser.ButtonAttributes},
        {name: "CheckBox", object: ccui.CheckBox, handle: parser.CheckBoxAttributes},
        {name: "ImageView", object: ccui.ImageView, handle: parser.ImageViewAttributes},
        {name: "LabelAtlas", object: ccui.TextAtlas, handle: parser.TextAtlasAttributes},
        {name: "LabelBMFont", object: ccui.TextBMFont, handle: parser.TextBMFontAttributes},
        {name: "Label", object: ccui.Text, handle: parser.TextAttributes},
        {name: "ListView", object: ccui.ListView, handle: parser.ListViewAttributes},
        {name: "LoadingBar", object: ccui.LoadingBar, handle: parser.LoadingBarAttributes},
        {name: "PageView", object: ccui.PageView, handle: parser.PageViewAttributes},
        {name: "ScrollView", object: ccui.ScrollView, handle: parser.ScrollViewAttributes},
        {name: "Slider", object: ccui.Slider, handle: parser.SliderAttributes},
        {name: "TextField", object: ccui.TextField, handle: parser.TextFieldAttributes}
*/
        return true;
    },
});

var BlockLayer = cc.Layer.extend({
    ctor:function () {
        this._super();
        var self = this;
        var lunchPepper = NaoQiCoreIns.lunchPepper;

        var size = cc.director.getWinSize();

        // メインのワークスペース
        ShouninCoreIns.workSpaceMain = new CommandBlockWorkSpace(self, ShouninCoreIns.cmdBlkMan);
        ShouninCoreIns.workSpaceMain.setPosition(4,120);
        ShouninCoreIns.workSpaceMain.setSize    (200,260);

        ShouninCoreIns.addListener(self);
        self.shouninCorePlayModeUpdate = function(){
            if(ShouninCoreIns.isNowPlay()){
                if(self.dustboxBtn){
                    self.dustboxBtn.setVisible(false);
                }
            }else{                
                if(self.dustboxBtn){
                    self.dustboxBtn.setVisible(true);
                }
            }
        };

        // ゴミ箱ボタン
        self.dustboxBtn = null;
        if(!lunchPepper){
            var dustboxBtn = ccui.Button.create();
            dustboxBtn.setTouchEnabled(true);
            dustboxBtn.loadTextures(res.icon_dustbox_png, null, null);
            dustboxBtn.setPosition(cc.p(220,120+32));
            dustboxBtn.addTouchEventListener(function(button,type)
            {
                var curCmdBlk = ShouninCoreIns.getCurCmdBlk();
                if(curCmdBlk)
                {
                    ShouninCoreIns.removeCmdBlk(curCmdBlk);
                }
                //TODO:商人コア経由でリスナーからアップデートする方がいいかも。
                ShouninCoreIns.workSpaceMain.updateLayout();
            });        
            self.addChild(dustboxBtn,1);
            self.dustboxBtn = dustboxBtn;
        }

        // ブロック追加ボタン
        var BlockBox = function(parentUI,x,y,w,h)
        {
            var self = this;

            var layout = ccui.ScrollView.create();
            layout.setBackGroundImage(res.workspace_frame_png);
            layout.setBackGroundImageScale9Enabled(true);
            layout.setClippingEnabled(true);
            layout.setDirection(ccui.ScrollView.DIR_VERTICAL);
            layout.setTouchEnabled(true);
            layout.setBounceEnabled(true);
            layout.setPosition   (x,y);
            layout.setContentSize(w,h);
            parentUI.addChild(layout);

            var nowY = 0;//layout.getContentSize().height-16;
            var nowH = 0;
            var btnLst=[];
            var blkW = 90;
            var blkH = 32;
            var nowXIdx=0;

            self.makeAddCommandBlockBtn = function(text,worldBlkId)
            {
                var btn = ccui.Button.create();
                btn.setTouchEnabled(true);
                btn.setScale9Enabled(true);
                btn.loadTextures(res.cmdblock_frame01_png, null, null);
                btn.setTitleText(text);
                btn.setPosition(cc.p(8+blkW/2 + nowXIdx*(blkW+4), nowY + blkH/2));
                btn.setSize(cc.size(blkW, blkH));
                btn.addTouchEventListener(function(button,type){
                    if(type==0){
                        var cmdBlk = ShouninCoreIns.cmdBlkMan.createCommandBlock(worldBlkId);
                        ShouninCoreIns.workSpaceMain.addCommandLumpBlock( cmdBlk );
                        ShouninCoreIns.workSpaceMain.updateLayout();
                    }
                });        
                layout.addChild(btn);
                if(nowXIdx % 2==1){
                    nowY += 32+4;
                    nowH += 32+4;
                }
                nowXIdx = (nowXIdx+1) % 2;
                layout.setInnerContainerSize(cc.size(w,nowH));
                $.each(btnLst,function(k,btn){
                    var p = btn.getPosition();
                    //p.y -= 32;
                    btn.setPosition(p);
                });
                btnLst.push(btn);
            };

            self.shouninCorePlayModeUpdate = function()
            {
                if ( ShouninCoreIns.isNowPlay() ){
                    layout.setVisible(false);
                }else{
                    layout.setVisible(true);
                }
            };
            ShouninCoreIns.addListener(self);
        };
        if(!lunchPepper){
            self.blockBox = new BlockBox(self,4, 4, 250, 110);

            self.blockBox.makeAddCommandBlockBtn("Goto行き先","gotoLabel@shonin");
            self.blockBox.makeAddCommandBlockBtn("行き先ラベル","label@shonin");
            self.blockBox.makeAddCommandBlockBtn("質問","ask@shonin");
            self.blockBox.makeAddCommandBlockBtn("ポーズ","pose@shonin");
            self.blockBox.makeAddCommandBlockBtn("会話","talk@shonin");
        }
        return true;
    },
});

var PepperLayer = cc.Layer.extend({
    pepperModel:null,
    ctor:function () {
        this._super();
        var self = this;        
        var size = cc.director.getWinSize();

        /*
        var sprite = cc.Sprite.create(res.pepper_icone_png);
        sprite.setPosition(size.width / 2, size.height / 2);
        var qq = sprite.getQuad();
        self.addChild(sprite, 0);
        */

        // ロードと描画ループ
        self.pepperModel = new PepperModel("#threejsCanvas");
        self.pepperModel.loadAndDrawStart()
        .then(function(){
            layerSetup();
        });

        //外部からのキャンバス操作
        self.setCanvasPos = function(x,y){
            self.pepperModel.setCanvasPos(x,y);
        };
        self.setCanvasSize = function(w,h){
            self.pepperModel.setCanvasSize(w,h);
        };
        self.setCanvasFullSize = function(){
            self.pepperModel.setCanvasFullSize();
        };
        self.setCanvasMiniSize = function(){
            self.pepperModel.setCanvasMiniSize();
        };
        self.setCanvasVisible = function(flag)
        {
            self.pepperModel.setCanvasVisible(flag);
        };

        function layerSetup()
        {
            // ポーズボックス
            var Slider = function(parentUI,sliderBoxW,sliderBoxH,listener)
            {
                var self = this;
                var slider_layout = ccui.Layout.create();
                self.min = 0;
                self.max = 1;
                self.value = 0;
                var sliderUiPixelLen = sliderBoxW-8;

                self.setPosition = function(x,y){
                    slider_layout.setPosition(x,y);
                };
                self.setRange = function(min,max){
                    self.min = min;
                    self.max = max;
                    self.setValue(self.value);
                };
                self.setValue = function(value){
                    self.value = THREE.Math.clamp(value, self.min, self.max);

                    var ratio = (self.value - self.min) / (self.max - self.min);
                    volume.setPosition(4 + sliderUiPixelLen*ratio, sliderBoxH/2);
                };
                self.getValue = function(){
                    return self.value;
                };
                slider_layout.setContentSize(sliderBoxW, sliderBoxH);
                slider_layout.setBackGroundImage(res.slider_frame_png);
                slider_layout.setBackGroundImageScale9Enabled(true);
                parentUI.addChild( slider_layout, 1 );

                var volume = cc.Sprite.create(res.slider_volume_png);
                volume.setPosition(10, sliderBoxH/2);
                slider_layout.addChild(volume, 0);

                // イベントリスナー
                cc.eventManager.addListener({
                    event: cc.EventListener.TOUCH_ONE_BY_ONE,
                    onTouchBegan: function(touch, event) 
                    {
                        var rc = volume.getBoundingBoxToWorld();
                        rc.x     -= 5;
                        rc.width +=10;
                        if (cc.rectContainsPoint(rc, touch.getLocation())) 
                        {
                            return true;
                        }
                        return false;
                    },
                    onTouchMoved: function(touch, event) 
                    {
                        var delta = touch.getDelta();
                        var dltVal = (delta.x / sliderUiPixelLen) * (self.max - self.min);
                        self.setValue( self.getValue() + dltVal );
                        if(listener && listener.updateSlider)
                        {
                            listener.updateSlider( self, self.getValue() );
                        }
                    },
                    onTouchEnded: function(touch, event) 
                    {
                    }
                }, slider_layout);
            };
            // ShouninCoreと連動するエディター
            var PoseBox = function(pepperLayer)
            {
                var self = this;

                var widget = ccui.Widget.create();
                var layout = ccui.Layout.create();

                var boxW = 240;
                var boxH = 320;

                layout.setPosition(560, 80);
                layout.setContentSize(boxW, boxH);
                layout.setBackGroundImage(res.frame02_png);
                layout.setBackGroundImageScale9Enabled(true);
                layout.setClippingEnabled(true);
                pepperLayer.addChild(layout);

                var jointKeyLst={
                "HeadPitch":"首たて","HeadYaw":"首よこ",
                "LShoulderPitch":"左肩回転","LShoulderRoll":"左肩振り","LElbowYaw":"左ひじ回転","LElbowRoll":"左ひじ曲げ","LWristYaw":"左手首",
                "RShoulderPitch":"右肩回転","RShoulderRoll":"右肩振り","RElbowYaw":"右ひじ回転","RElbowRoll":"右ひじ曲げ","RWristYaw":"右手首",
                "HipPitch":"腰左右","HipRoll":"腰前後","KneePitch":"ひざ",
                };

                var fontSize = 20;
                var posY = +8;
                var sliderTbl={};
                $.each(jointKeyLst,function(key,name)
                {
                    var label = cc.LabelTTF.create(name, "Arial", fontSize);
                    var jointObj = pepperLayer.pepperModel.jointObjTbl[key];
                    
                    label.setPosition(label.getContentSize().width/2+boxW/4*2, boxH - posY - fontSize/2);
                    label.setColor(new cc.Color(0,0,0,255));
                    layout.addChild(label, 2);

                    var slider = new Slider(layout, boxW/4*2, fontSize-2,{
                        updateSlider:function(slider,value){
                            jointObj.setJointAngle( value );
                            var poseEditData = ShouninCoreIns.getPoseEditData();
                            if(poseEditData)
                            {
                                poseEditData.poseData.jointAngles[key] = value;
                            }
                        },
                    });
                    slider.setRange( THREE.Math.radToDeg(jointObj.src.limit.lower), THREE.Math.radToDeg(jointObj.src.limit.upper) );
                    slider.setValue( pepperLayer.pepperModel.getJointAngle() );
                    slider.setPosition(0, boxH - posY - fontSize/2 - 8);
                    sliderTbl[key] = slider;
                    posY += fontSize;
                });

                layout.setVisible(false);

                self.shouninCoreUpdate = function()
                {
                    if(ShouninCoreIns.isPoseEdit())
                    {
                        // エディット中
                        layout.setVisible(true);
                        // まず、現在の状態をスライダーに反映します
                        $.each(jointKeyLst,function(jointName,name)
                        {
                            var jointObj = pepperLayer.pepperModel.jointObjTbl[jointName];
                            sliderTbl[jointName].setValue(
                                jointObj.getJointAngle()
                             );
                        });
                        // その後、データの内容をスライダーとモデルに反映します
                        var poseEditData = ShouninCoreIns.getPoseEditData();
                        if(poseEditData)
                        {
                            $.each(poseEditData.poseData.jointAngles,function(jointName,angle){
                                sliderTbl[jointName].setValue( angle );
                                var jointObj = pepperLayer.pepperModel.jointObjTbl[jointName];
                                jointObj.setJointAngle(sliderTbl[jointName].getValue());
                            });
                        }
                    }else{
                        layout.setVisible(false);
                    }
                };
                ShouninCoreIns.addListener(self);
            };
            self.poseBox = new PoseBox(self);

            // 表示の
        }
        return true;
    },
});

// 商人小広場
var ShouninCampoLayer = cc.Layer.extend({
    ctor:function () {
        this._super();
        var self = this;

        console.log("ShouninCampoLayer ctor..");

        var size = cc.director.getWinSize();

        var frameX = size.width /6*0.5;
        var frameY = size.height/6*0.5;
        var frameW = size.width /6*5;
        var frameH = size.height/6*5;

        var baseLayout = ccui.Layout.create();
        
        baseLayout.setPosition(cc.p(frameX,frameY));
        baseLayout.setSize    (cc.size(frameW,frameH+6));
        baseLayout.setBackGroundImage(res.frame03_png);
        baseLayout.setBackGroundImageScale9Enabled(true);
        baseLayout.setClippingEnabled(true);
        self.addChild(baseLayout);

        // 閉じるボタン
        var btn = ccui.Button.create();
        btn.setName("CloseBtn");
        btn.setTouchEnabled(true);
        btn.setScale9Enabled(true);
        btn.loadTextures(res.cmdblock_frame01_png, null, null);
        btn.setTitleText("閉じる");
        btn.setPosition(cc.p(40,frameH-28));
        btn.setSize(cc.size(64,32));
        btn.addTouchEventListener(function(button,type)
        {
            if(0==type)
            {
                self.closeCampo();
            }
        });
        baseLayout.addChild(btn,2);


        var lv = ccui.ListView.create();
        lv.setDirection(ccui.ScrollView.DIR_VERTICAL);
        lv.setTouchEnabled(true);
        lv.setBounceEnabled(true);
        lv.setPosition(cc.p(8, 0));
        lv.setContentSize(cc.size(frameW-16,frameH/6*5));
        lv.setInnerContainerSize(cc.size(frameW-16,frameH/6*5-16));
        lv.setBackGroundImage(res.frame02_png);
        lv.setBackGroundImageScale9Enabled(true);
        lv.setClippingEnabled(true);
        baseLayout.addChild(lv,0);

        var itemLo = ccui.Layout.create();
        itemLo.setPosition(cc.p(0, 0));
        itemLo.setContentSize(cc.size(frameW-16,64));
        itemLo.setBackGroundImage(res.frame02_png);
        itemLo.setBackGroundImageScale9Enabled(true);
        itemLo.setClippingEnabled(true);

        // 呼ぶボタンのテンプレ
        var btn = ccui.Button.create();
        btn.setName("callBtn");
        btn.setTouchEnabled(true);
        btn.setScale9Enabled(true);
        btn.loadTextures(res.cmdblock_frame01_png, null, null);
        btn.setTitleText("呼ぶ");
        btn.setPosition(cc.p(frameW-16-40,32));
        btn.setSize(cc.size(64, 32));
        itemLo.addChild(btn,2);
        lv.setItemModel(itemLo);

        self.updateShouninList = function()
        {
            var no=1;
            lv.removeAllItems();
            KiiShouninCoreIns.queryShouninList()
            .then(
                function(param){
                    $.each(param.shouninList,function(idx,shouninItem){
                        lv.pushBackDefaultItem();
                        var items = lv.getItems();
                        var item  = items[items.length-1];
                        var btn   = item.getChildByName("callBtn");
                        btn.addTouchEventListener(function(button,type)
                        {
                            if(0==type)
                            {
                                // 商魂注入アクション
                                var sprite = cc.Sprite.create(res.ShoukonIn_png);
                                sprite.setPosition(size.width / 2, size.height / 2);
                                sprite.setScale(1.0);
                                self.addChild(sprite, 10);

                                sprite.setColor(cc.color(0,0,0));
                                sprite.setScale(1.0);
                                sprite.runAction(
                                  cc.Sequence.create(
                                    cc.TintTo.create(0.5, 255,255,255),
                                    cc.EaseElasticOut.create(
                                      cc.ScaleTo.create(2, 1.05), 0.2),
                                    cc.EaseElasticOut.create(
                                      cc.ScaleTo.create(2, 1.00), 0.2),
                                    cc.EaseElasticOut.create(
                                      cc.ScaleTo.create(2, 1.05), 0.2)
                                  )
                                );
                                var dfd = $.Deferred();
                                if(NaoQiCoreIns.isConnected())
                                {
                                    var alRobotPosture;
                                    NaoQiCoreIns.service("ALRobotPosture").then(function(ins){
                                        alRobotPosture = ins;
                                        return alRobotPosture.goToPosture("Crouch",1.0);
                                    }).then(function(){
                                        return NaoQiCoreIns.service("ALTextToSpeech");
                                    }).then(function(tts){
                                        tts.say("しょうーーーー　こんーーーー　ちゅうーーーーー　にゅー ー ーーーーーー　！");
                                        return alRobotPosture.goToPosture("Stand",1.0);
                                    }).then(function(){
                                        dfd.resolve();
                                    })
                                    .fail(function(){
                                        dfd.resolve();
                                    })
                                }else{
                                    dfd.resolve();
                                }
                                setTimeout(function(){
                                    dfd.then(function(){
                                        self.removeChild(sprite, true);
                                        // 閉じて再生開始します
                                        self.closeCampo();
                                        ShouninCoreIns.loadFromJsonTable(shouninItem.jsonTbl)
                                        ShouninCoreIns.setCurCmdBlk(null);
                                        ShouninCoreIns.execStartCurCmdBlk(function(){
                                            //再生終了
                                            if(NaoQiCoreIns.lunchPepper){
                                                self.openCampo();
                                            }
                                        });
                                    });
                                },7000);

                            }
                        });
                        var title = "" + no + ". ";
                        no++;
                        if(shouninItem.shouninProfile)
                        {
                            title = title + shouninItem.shouninProfile.shouninName + "。";
                            title = title + "作者、" + shouninItem.shouninProfile.ownerName;
                            title = title + "　" + shouninItem.shouninProfile.note;
                        }else{
                            title += "oldData";
                        }
                        var label = cc.LabelTTF.create(title, "Arial", 16);
                        label.setPosition(label.getContentSize().width/2+8, 32);
                        label.setColor(new cc.Color(0,0,0,255));
                        item.addChild(label);
                    });
                }
            );
        };
        self.setVisible(false);
        console.log("ShouninCampoLayer ctor..finish!");

        self.openCampo = function(){
            if(!NaoQiCoreIns.lunchPepper){
                ShouninCoreIns.mainScene.pepperLayer.setCanvasVisible(false);
            }
            ShouninCoreIns.execStop();
            ShouninCoreIns.setCurCmdBlk(null);
            self.updateShouninList();
            self.setVisible(true);
        };
        self.closeCampo = function(){
            self.setVisible(false);
            if(!NaoQiCoreIns.lunchPepper){
                ShouninCoreIns.mainScene.pepperLayer.setCanvasVisible(true);
            }
        };

        return true;
    },
});


// タブレット表示用のレイヤ(ペッパー起動では再生中はこのレイヤだけになる)
var TabletLayer = cc.Layer.extend({
    ctor:function () {
        this._super();
        var self = this;

        console.log("ShouninCampoLayer ctor..");

        var size = cc.director.getWinSize();

        var frameX = size.width /10*0.5;
        var frameY = size.height/10*0.5;
        var frameW = size.width /10*9;
        var frameH = size.height/10*9;

        var baseLayout = ccui.Layout.create();
        
        baseLayout.setPosition(cc.p(frameX,frameY));
        baseLayout.setSize    (cc.size(frameW,frameH));
        baseLayout.setBackGroundImage(res.frame01_png);
        baseLayout.setBackGroundImageScale9Enabled(true);
        baseLayout.setClippingEnabled(true);
        self.addChild(baseLayout);

        self.setVisible(false);

        //
        self.getBaseLayout = function(){
            return baseLayout;
        };
        self.clearBaseLayout = function(){
            baseLayout.removeAllChildren(true);
        };

        self.showTablet = function(){
            self.setVisible(true);
        };
        self.hideTablet = function(){
            self.setVisible(false);
        };

        ShouninCoreIns.addListener(self);
        self.shouninCorePlayModeUpdate = function(){
            if(ShouninCoreIns.isNowPlay()){
                if(!ShouninCoreIns.lunchPepper){
                    self.setScale(0.35);
                    self.setPosition(cc.p(250,0));
                    ShouninCoreIns.mainScene.pepperLayer.setCanvasPos(-50,0);
                }
            }
            else{
                if(!ShouninCoreIns.lunchPepper){
                    self.setScale(1.9);
                    self.setPosition(cc.p(0,0));
                    ShouninCoreIns.mainScene.pepperLayer.setCanvasPos(0,0);
                }
            }
        };
        return true;
    },
});

var MainScene = cc.Scene.extend({
  mainLayer:null,
  blockLayer:null,
  pepperLayer:null,
  shouninCampoLayer:null,
  tabletLayer:null,
  onEnter:function () {
      this._super();
      var self = this;      
      var lunchPepper = NaoQiCoreIns.lunchPepper;

      console.log("mainScene onEnter!");
      
      if(!lunchPepper){
          self.mainLayer = new MainLayer();
          this.addChild(self.mainLayer);

          self.pepperLayer = new PepperLayer();
          this.addChild(self.pepperLayer);

          self.blockLayer = new BlockLayer();
          this.addChild(self.blockLayer);

          self.tabletLayer = new TabletLayer();
          this.addChild(self.tabletLayer);

          self.shouninCampoLayer = new ShouninCampoLayer();
          this.addChild(self.shouninCampoLayer);
      }
      else {
          self.blockLayer = new BlockLayer();
          self.addChild(self.blockLayer);

          self.tabletLayer = new TabletLayer();
          self.addChild(self.tabletLayer);

          self.shouninCampoLayer = new ShouninCampoLayer();
          self.addChild(self.shouninCampoLayer);

          ShouninCoreIns.mainScene.shouninCampoLayer.openCampo();

        　// 
        　var makeShouinCampoBtn = function()
        　{
              var size = cc.director.getWinSize();
              self.sideMenu = new BtnBarMenu(0, size.height);
              self.addChild(self.sideMenu.layout);
              self.sideMenu.addBtn("商人広場",function(button,type)
              {
                  ShouninCoreIns.mainScene.shouninCampoLayer.openCampo();
              });
              var p = self.sideMenu.layout.getPosition()
              var s = self.sideMenu.layout.getContentSize();
              self.sideMenu.layout.setPosition(cc.p(size.width-s.width,p.y));
        　};
        　makeShouinCampoBtn();
      }
  }
});


//
$(function(){

    console.log("shounin start! v4");

    ShouninCoreIns = new ShouninCore();
    KiiShouninCoreIns = new KiiShouninCore();
    NaoQiCoreIns   = new NaoQiCore();

//ブロック管理
// スプライトとブロックを扱うクラス？
// ブロックを包含？ とりあえず包含で。
// ブロック生成ボタン？ひとまずはそれ。そのうちドラッグ型に
// 生成ボタン押すと、ワークスペースに追加orどこかのテーブルに追加
// その後、それが表示される。
// 表示されたモノを接続などは別管理？ひとまず別管理でよさそう。
// 選択時のエディタの表示
// 選択解除時のエディタのOFF

  cc.game.onStart = function(){
      //load resources
      cc.LoaderScene.preload(preload_res, function () 
      {
          ShouninCoreIns.mainScene = new MainScene();
          cc.director.runScene(ShouninCoreIns.mainScene);
      }, this);

      if(NaoQiCoreIns.lunchPepper)
      {
          cc.view.resizeWithBrowserSize(true);
          cc.view.setDesignResolutionSize(800, 450, cc.ResolutionPolicy.SHOW_ALL);
      }
  };
  cc.game.run("gameCanvas");
});


//■ ブロックの実装 ■

pepperBlock.registBlockDef(function(blockManager,materialBoxWsList){
    // 会話ブロック
    blockManager.registBlockDef(
      {
          blockHeader:{
              blockWorldId:"talk@shonin",
              head:'in',
              tail:'out',
          },
          blockContents:[
              {expressions:[
                  {input_text:{default:{string:"ここににゅうりょく"}},dataName:'talkLabel0'},
              ]},
          ],
          blockVisual:{
              disp_name:'会話',
          },
      },
      function(ctx,valueDataTbl){
          var onFail = function(e) {console.error('fail:' + e);};
          var dfd = $.Deferred();
          
          if(NaoQiCoreIns.isConnected())
          {
              NaoQiCoreIns.service("ALTextToSpeech").then(function(tss){
//                  return 
//                  NaoQiCoreIns.service("ALMemory").subscriber("ALTextToSpeech/TextDone")
//                  .then(
//                     function()
                     {
                         tss.say(valueDataTbl['talkLabel0'].string)
                         .done(function()
                         {
                             dfd.resolve();
                         });
                     }
//                  );
              },
              function(err){
                  dfd.reject(err);
              });
          }
          else
          {
              console.log("会話");
              console.log(valueDataTbl['talkLabel0'].string);
              
              ShouninCoreIns.setTalkPreviewFlag(true);
              ShouninCoreIns.setTalkPreviewText(valueDataTbl['talkLabel0'].string);
              setTimeout(function(){

                  ShouninCoreIns.setTalkPreviewFlag(false);
                  dfd.resolve();
              },2000);
          }

          return dfd.promise();
      }
    );
    // ポーズブロック
    blockManager.registBlockDef(
      {
          blockHeader:{
              blockWorldId:"pose@shonin",
              head:'in',
              tail:'out',
          },
          blockContents:[
              {expressions:[
                  //{input_text:{default:{string:""}},dataName:'poseLabel'},
                  {input_dropOnly:{default:{poseData:{jointAngles:{}}}},dataName:'poseData0',acceptTypes:["poseData"]},
              ]},
          ],
          blockVisual:{
              disp_name:'ポーズ',
          },
      },
      function(ctx,valueDataTbl){
          var onFail = function(e) {console.error('fail:' + e);};
          var dfd = $.Deferred();
          
          if(NaoQiCoreIns.isConnected())
          {
              var names =[];
              var angles=[];
              var stiffness1=[];
              var stiffness0=[];
              $.each(valueDataTbl['poseData0'].poseData.jointAngles, function(name,angle){
                  names. push(name);
                  angles.push(THREE.Math.degToRad(angle));
                  stiffness1.push(1.0);
                  stiffness0.push(0.0);
              });
              var fractionMaxSpeed = 0.4;
              var alMotion=null;
              NaoQiCoreIns.service("ALMotion").then(function(ins){
                  alMotion = ins;
                  return alMotion.setStiffnesses(name, stiffness1);
              }).then(function(){
                  return alMotion.setAngles(names, angles, fractionMaxSpeed);
              }).then(function(){
                  var dfd = $.Deferred();
                  setTimeout(function(){
                      return  dfd.resolve();
                  },1000);
                  return dfd;
              }).then(function(){
                  return alMotion.setStiffnesses(name, stiffness0);
              }).then(function(){
                  dfd.resolve();
              }).fail(function(err){
                  console.log(err);
                  dfd.reject();
              });
          }
          else
          {
              console.log("ポーズ");
              console.log(valueDataTbl['poseData0'].poseData);
              setTimeout(function(){
                  dfd.resolve();
              },500);
          }
          return dfd.promise();
      }
    );
    // 選択肢ブロック
    blockManager.registBlockDef(
      {
          blockHeader:{
              blockWorldId:"ask@shonin",
              head:'in',
              tail:'out',
          },
          blockContents:[
              {expressions:[
                  {input_text:{default:{string:"2taku"}},dataName:'askType'},
                  {input_text:{default:{string:"しつもん文"}},dataName:'ask'},
                  {input_text:{default:{string:"こたえ１"}},dataName:'ans0'},
                  {input_text:{default:{string:"こたえ２"}},dataName:'ans1'},
                  {input_text:{default:{string:"こたえ３"}},dataName:'ans2'},
                  {input_text:{default:{string:"こたえ４"}},dataName:'ans3'},
                  {input_text:{default:{string:"こたえ５"}},dataName:'ans4'},
                  {input_text:{default:{string:""}},dataName:'ans0GotoLabel'},
                  {input_text:{default:{string:""}},dataName:'ans1GotoLabel'},
                  {input_text:{default:{string:""}},dataName:'ans2GotoLabel'},
                  {input_text:{default:{string:""}},dataName:'ans3GotoLabel'},
                  {input_text:{default:{string:""}},dataName:'ans4GotoLabel'},
              ]},
          ],
          blockVisual:{
              disp_name:'質問',
          },
      },
      function(ctx,valueDataTbl){
          var onFail = function(e) {console.error('fail:' + e);};
          var dfd = $.Deferred();

          // タブレットレイヤーに何かするコードかくかんじ
          var tabletLayer = ShouninCoreIns.mainScene.tabletLayer;

          var lo = tabletLayer.getBaseLayout();
          tabletLayer.clearBaseLayout();
          
          //中断時に呼ばれるコールバックを登録(再生終ったら自動的に解除されます)
          ctx.playCtx.needStopCmdBlkCb = function(){
              tabletLayer.hideTablet();
              tabletLayer.clearBaseLayout();
              dfd.resolve();
          };

          var addBtn_ = function(text,x,y,w,h,cb){
                var btn = ccui.Button.create();
                btn.setTouchEnabled(true);
                btn.setScale9Enabled(true);
                btn.loadTextures(res.cmdblock_frame01_png, null, null);
                btn.setTitleText(text);
                btn.setPosition(cc.p(x,y));
                btn.setSize(cc.size(w,h));
                btn.addTouchEventListener(function(button,type)
                {
                    if(0==type)
                    {
                        if(cb)cb(button,type);
                    }
                });
                lo.addChild(btn);
          };
          var makeSelectEndCb_ = function(ansName){
              return function(){
                  var gotoLabel = valueDataTbl[ansName+'GotoLabel'].string;
                  if(gotoLabel && gotoLabel.length>0){
                      ctx.playCtx.nextGotoLabel = gotoLabel;
                      ctx.playCtx.needStopFlag  = true;
                  }
                  tabletLayer.hideTablet();
                  tabletLayer.clearBaseLayout();
                  dfd.resolve();
              };
          };
          if("2taku" == valueDataTbl['askType'].string)
          {
              var label = cc.LabelTTF.create(valueDataTbl['ask'].string, "Arial", 40);
              label.setPosition(300, 300);
              label.setColor(new cc.Color(0,0,0,255));
              lo.addChild(label, 2);
              addBtn_(valueDataTbl['ans0'].string,90+    256/2,128,256,128,makeSelectEndCb_("ans0"));
              addBtn_(valueDataTbl['ans1'].string,90+300+256/2,128,256,128,makeSelectEndCb_("ans1"));
          }

          tabletLayer.showTablet();
          return dfd.promise();
      }
    );
    // ジャンプ用ラベルブロック
    blockManager.registBlockDef(
      {
          blockHeader:{
              blockWorldId:"label@shonin",
              head:'in',
              tail:'out',
          },
          blockContents:[
              {expressions:[
                  {input_text:{default:{string:""}},dataName:'labelName'},
              ]},
          ],
          blockVisual:{
              disp_name:'行き先ラベル',
          },
      },
      function(ctx,valueDataTbl){
          var dfd = $.Deferred();
          dfd.resolve();
          return dfd.promise();
      }
    );
    // Gotoブロック
    blockManager.registBlockDef(
      {
          blockHeader:{
              blockWorldId:"gotoLabel@shonin",
              head:'in',
              tail:'out',
          },
          blockContents:[
              {expressions:[
                  {input_text:{default:{string:""}},dataName:'labelName'},
              ]},
          ],
          blockVisual:{
              disp_name:'Goto行き先',
          },
      },
      function(ctx,valueDataTbl){
          var dfd = $.Deferred();
          ctx.playCtx.nextGotoLabel = valueDataTbl['labelName'].string;
          ctx.playCtx.needStopFlag  = true;
          dfd.resolve();
          return dfd.promise();
      }
    );

});








































var userAgent  = window.navigator.userAgent.toLowerCase();
var appVersion = window.navigator.appVersion.toLowerCase();

if (userAgent.indexOf('safari') != -1) {
    window.onerror = function (msg, file, line, column, err) {
        /*
        msg: error message
        file: file path
        line: row number
        column: column number
        err: error object
        */ 
        alert(msg + file + ':' + line);
    };
}

function _base64ToArrayBuffer(base64) {
    var binary_string =  window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array( len );
    for (var i = 0; i < len; i++)        {
        bytes[i] = binary_string.charCodeAt(i);
    }
    //return bytes.buffer;
    return bytes;
}
function _arrayBufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}
function getUrlParameter(sParam)
{
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) 
    {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) 
        {
            return sParameterName[1];
        }
    }
}

//ドラッグ時にフォーカス外れない対策いるか？(現状はChrome対策)
function checkAgent_NeedDragUnselect()
{
    if (userAgent.indexOf('msie') != -1) {
        //IE全般
        if (appVersion.indexOf("msie 6.") != -1) {
            //IE6
        }else if (appVersion.indexOf("msie 7.") != -1) {
            //IE7
        }else if (appVersion.indexOf("msie 8.") != -1) {
            //IE8
        }else if (appVersion.indexOf("msie 9.") != -1) {
            //IE9
        }else if (appVersion.indexOf("msie 10.") != -1) {
            //IE10
        }
    }else if (userAgent.indexOf('chrome') != -1) {
        //Chrome
        return true;
    }else if (userAgent.indexOf('safari') != -1) {
        //Safari
    }else if (userAgent.indexOf('firefox') != -1) {
        //Firefox
    }else if (userAgent.indexOf('opera') != -1) {
        //Opera
    }
    return false;
}


// 良いものが有るかわからなかったので自作…
function Vector3(x,y,z){
    if (x instanceof Vector3){
        var v=x;
        return new Vector3(v.x,v.y,v.z);
    }
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
};
Vector3.prototype = {
    add:function(v){
        return new Vector3(this.x+v.x,this.y+v.y,this.z+v.z);
    },
    sub:function(v){            
        return new Vector3(this.x-v.x,this.y-v.y,this.z-v.z);
    },
    mul:function(v){
        if(!v instanceof Vector3) return new Vector3(this.x*v,this.y*v,this.z*v);
        return new Vector3(this.x*v.x,this.y*v.y,this.z*v.z);
    },
    div:function(v){            
        if(!v instanceof Vector3) return new Vector3(this.x/v,this.y/v,this.z/v);
        return new Vector3(this.x/v.x,this.y/v.y,this.z/v.z);
    },
    dot:function(v){            
        return (this.x*v.x + this.y*v.y + this.z*v.z);
    },
    cross:function(v){
        return new Vector3(this.y*v.z - this.z*v.y,
                           this.z*v.x - this.x*v.z,
                           this.x*v.y - this.y*v.x);
    },
    len:function(){
        return Math.sqrt(this.dot(this));
    },
    normalize:function(){
        return this.div(this.len());
    },
    rotXAxis:function(rad){            
      return new Vector3(
        this.x,
        this.y * Math.cos(rad) - this.z * Math.sin(rad),
        this.y * Math.sin(rad) + this.z * Math.cos(rad)
      );
    },
    rotYAxis:function(rad){            
      return new Vector3(
        this.x * Math.cos(rad) - this.z * Math.sin(rad),
        this.y,
        this.x * Math.sin(rad) + this.z * Math.cos(rad)
      );
    },
    rotZAxis:function(rad){            
      return new Vector3(
        this.x * Math.cos(rad) - this.y * Math.sin(rad),
        this.x * Math.sin(rad) + this.y * Math.cos(rad),
        this.z
      );
    },
};

function PepperCamera(alVideoDevice,option) {
    var self = this;
    self.subscribe = function(){
        if(!option){
            option = {};
        }
        option.name  = option.name  || "pepper_block_cam";
        option.cam   = option.cam   || 0;  // nao_top
        option.reso  = option.reso  || 1;  // 320x240
        option.color = option.color || 11; // Rgb
        option.frame_rate = option.frame_rate || 5; // frame_rate
        alVideoDevice.getSubscribers().done(function(list){
            //6個まで制限があるそうなのでゴミ掃除
            $.each(list,function(k,v){
                if(v.indexOf(option.name)==0)//とりあえず前方一致で同じと判断してみる
                {
                    alVideoDevice.unsubscribe(v);
                }
            })
        });
        alVideoDevice.subscribeCamera(
            option.name, 
            option.cam,
            option.reso,
            option.color,
            option.frame_rate
        ).done(function(nameId){
            self.nameId=nameId;
        });
    };
    self.unsubscribe = function()
    {
        alVideoDevice.unsubscribe(self.nameId);
        self.nameId = None;
    };
    self.captureImage = function(callback)
    {
        if(self.nameId.length>0)
        {
            alVideoDevice.getImageRemote(self.nameId).done(function(data){
              if(data)
              {
                  var buff = _base64ToArrayBuffer(data[6]);
                  callback(data[0],data[1], buff, data[7], data[8], data[9], data[10], data[11]);
              }
            });
        }
    };
    self.subscribe();
}



// データ(試行中)

function makeNullData_CaptureImage(){
    return {pixels:null, w:0, h:0, camId:0, leftRad:0, topRad:0, rightRad:0, bottomRad:0,};
}
function makeNullData_Image(){
    return {pixels:null, w:0, h:0,};
}

//$(
var dummy=function(){
    //■ 実行環境を構築(ブロックのコールバックが使えるグローバル環境です) ■
    var makeExecContext = function()
    {
        var exeContext = {};
        // バージョン
        exeContext.contextVersion = "0.01";

        // 複数人接続用の自分の固有ID
        // (カメラ等で同じIDは6個までしか使えない＆切断処理しないとゴミが残る等、
        //  サンドボックス化されて無いひどい状態なので
        //  自身でサンドボックスを実現するためのID。)
        // TODO: 複数人対応時はキープアライブ等でIDの管理を実装する…（乱数だとゴミ掃除出来ないのでダメ。空きを再利用して必ず初期化して使えスタイルがいいかも)
        exeContext.sandBoxID = "SandBoxA";

        // グローバルな作業用データ(最後に○○系。加工前のデータが入ってる事が殆どです)

        // 最後に認識した単語データ
        exeContext.lastRecoData   = {rawData:null,};

        // 最後に調べた人データ
        exeContext.lastPeopleData   = {rawData:null,};

        // 最後に調べた移動物体データ
        exeContext.lastMovementData   = {rawData:null,};

        // 最後にキャプチャした写真データ
        exeContext.lastCaptureImageData = makeNullData_CaptureImage();//{pixels:null, w:0, h:0, camId:0, leftRad:0, topRad:0, rightRad:0, bottomRad:0,};


        // 汎用データテーブル
        exeContext.generalDataTable = {};


        // qiMessaging経由のインスタンス
        exeContext.setupExecContextFromQim = function(qims)
        {
            // 初期化とsubscribeが必要なモノの起動を行います

            // MEMO:
            // (まだ理解しきれてないけどsubscibeしておけばALEngagementZonesなど
            //  とりあえず色々動くみたいなのでやっておきます
            //  …名前付きでやる割にはグローバルに影響してるのが良く理解できてない部分
            //  …色んなものが再起動を超えてグローバルのようなので値の初期化もなるべく最初にやっておくことに
            //  (これだと多人数で遊ぶと毎回で初期化されかねないけど基本的に変えたい人は直前に変えるブロックを
            //   配置するべきという概念でやるべきっぽい匂いがする…寧ろ積極的に定期的に初期化するべきな予感…
            //   知らないだけでサンドボックスとかあるのだろうか？)
            //  (起動を超えて保存される感じからどこかに初期値一覧がありそう。ALMemoryの機能だろうか…全リセットコマンド作りたい)
            //  (しかしGPUのコマンド生で扱ってる感じでバグの温床っぽくてヤナ感じ。
            //   GPU周りみたいに差分とか全書き出しとかを管理するステートキャッシュみたいなの作るべきかな…)

            exeContext.qims      = qims;
            exeContext.alIns     = {};
            exeContext.cameraIns = null;
            exeContext.qims.service("ALAutonomousLife").done(function(ins){
              exeContext.alIns.alAutonomousLife = ins;
              exeContext.alIns.alAutonomousLife.getState().then(function(state){
                  if(state!="disable"){
                      return exeContext.alIns.alAutonomousLife.setState("disable");
                  }
              });
            });
            exeContext.qims.service("ALMemory").done(function(ins){
              exeContext.alIns.alMemory = ins;
            });
            exeContext.qims.service("ALTextToSpeech").done(function(ins){
              exeContext.alIns.alTextToSpeech = ins;
            });
            exeContext.qims.service("ALAudioDevice").done(function(ins){
              exeContext.alIns.alAudioDevice = ins;
            });
            exeContext.qims.service("ALMotion").done(function(ins){
              exeContext.alIns.alMotion = ins;
            });
            exeContext.qims.service("ALRobotPosture").done(function(ins){
              exeContext.alIns.alRobotPosture = ins;
            });
            exeContext.qims.service("ALVideoDevice").done(function(ins){
              exeContext.alIns.alVideoDevice = ins;
              exeContext.pepperCameraTopIns    = new PepperCamera(ins,{name:"pepper_block_top_cam"   +exeContext.sandBoxID,cam:0});
              exeContext.pepperCameraBottomIns = new PepperCamera(ins,{name:"pepper_block_bottom_cam"+exeContext.sandBoxID,cam:1});
              exeContext.pepperCameraDepthIns  = new PepperCamera(ins,{name:"pepper_block_depth_cam"+exeContext.sandBoxID,cam:2});
            });
            exeContext.qims.service('ALMemory').then(function(ins){
              exeContext.alIns.alMemory = ins;
            });
            exeContext.qims.service('ALPeoplePerception').then(function(ins){
              exeContext.alIns.alPeoplePerception = ins;
              exeContext.alIns.alPeoplePerception.subscribe("PepperBlock");
            });
            exeContext.qims.service('ALMovementDetection').then(function(ins){
              exeContext.alIns.alMovementDetection = ins;
              exeContext.alIns.alMovementDetection.subscribe("PepperBlock");
              //TEST
              exeContext.alIns.alMovementDetection.getColorSensitivity().done(function(v){console.log("getColorSensitivity "+v);});
              exeContext.alIns.alMovementDetection.getDepthSensitivity().done(function(v){console.log("getDepthSensitivity "+v);});
              exeContext.alIns.alMovementDetection.getCurrentPrecision().done(function(v){console.log("getCurrentPrecision "+v);});
              exeContext.alIns.alMovementDetection.getCurrentPeriod().done(function(v){console.log("getCurrentPeriod "+v);});
              
              //exeContext.alIns.alMovementDetection.setColorSensitivity(0.001);
              //exeContext.alIns.alMovementDetection.setDepthSensitivity(0.005);
              exeContext.alIns.alMovementDetection.setColorSensitivity(0.005);
              exeContext.alIns.alMovementDetection.setDepthSensitivity(0.008);
            });
            exeContext.qims.service('ALEngagementZones').then(function(ins){
              exeContext.alIns.alEngagementZones = ins;
              exeContext.alIns.alEngagementZones.subscribe("PepperBlock");

              exeContext.alIns.alEngagementZones.setFirstLimitDistance(3.0);
              exeContext.alIns.alEngagementZones.setSecondLimitDistance(5.5);
              exeContext.alIns.alEngagementZones.setLimitAngle(180);
            });
            exeContext.qims.service('ALVisualSpaceHistory').then(function(ins){
              exeContext.alIns.alVisualSpaceHistory = ins;
              exeContext.alIns.alVisualSpaceHistory.subscribe("PepperBlock");
            });

        };

        //■便利そうな補助関数など
        exeContext.onFail = function(e) {
            //dfd向けエラー関数
            console.error('fail:' + e);
        };
        exeContext.onFailPass = function(e) {
            //dfd向けエラー関数 スルー付
            //MEMO: 
            // チェイン時のおそらくお望みの動作は、
            //  処理A.then(処理B,fail).then(null,onFailPass)
            // かも。thenの仕様は処理Aの結果を分岐するので、処理Bのエラーをスルーする際自分は勘違いしたことあり。
            console.log('fail:' + e); 
            return $.Deferred().resolve();
        };
        exeContext.subscribeAlMemoryEvent = function(eventKey, eventCallback){
            //ALMemoryのイベントキーのコールバックを扱うための関数
            // eventKey      … メモリイベントキー
            // eventCallback … イベント時に呼ばれるコールバック。形式は、
            //   eventCallback(eventDfd, eventKeyValue)
            //   eventDfd … resolveにするとコールバック呼び出し終了
            //   eventKeyValue イベントキーの対する値。ない場合はnull

            // イベント用メモリキーよりイベント監視のためのインスタンスを取得します
            return exeContext.alIns.alMemory.subscriber(eventKey).then(function(subscriber){
                // イベント監視のコールバックを登録します
                var id = null;
                var eventDfd = $.Deferred();
                //@@console.log("subscribe event" + eventKey);
                subscriber.signal.connect(function(eventKeyValue){
                    // ここはALMemoryのイベントキーのハンドラです
                    //  ※deferredのハンドラではないので混乱注意。qimessagingのsingalというあたりで実装されているコールバック機構です
                    //@@console.log("update event" + eventKey + " " + eventKeyValue);
                    eventCallback(eventDfd, eventKeyValue);
                })
                .then(function(id_){
                    id = id_;
                },function(){
                    eventDfd.reject();
                });
                return eventDfd.promise().then(function(){
                    // イベント完了したのでイベントコールバックを解除します
                    console.log("unsubscribe event" + eventKey);
                    if(id){
                        subscriber.signal.disconnect(id);
                        id = null;
                    }
                });
            });
        };

        //■デバッグ用
        exeContext.debugCanvasList ={};
        exeContext.pixelPerMeter = 70;

        return exeContext;
    }

    // -- MVVMのモデル(このアプリの中枢です) --
    function MyModel() {
        var self = this;
/*
        //■ ブロック管理を作成 ■
        var execContext = makeExecContext();
        self.blockManager = new BlockManager( execContext );
*/
        //■ URLパラメータより ■
        if(getUrlParameter("lunchPepper")){
            self.lunchPepper = true;
        }
        else{
            self.lunchPepper = false;
        }
        if(getUrlParameter("loadJsonUrl")){
            // とりあえずな実装…
            var url = getUrlParameter("loadJsonUrl");
            $.ajax({
              type: 'GET',
              url: url,
              dataType: 'json',
              success: function(json){
                  setTimeout(function(){
                    self.fromJSON(json);
                    alert(url+"の読み込み完了です");
                  },2000);
              },
              error: function(XMLHttpRequest, textStatus, errorThrown){
                  alert(url+"の読み込みでエラーです:"+textStatus);
              },
            });
        }

        //■ ＵＩ関連の準備など ■

        self.wakeupPepper = function(){
          if(execContext.qims){
              execContext.qims.service("ALMotion")
              .then(function(alMotion){
                  return alMotion.wakeUp();
              });
          }
        };
        self.restPepper = function(){
          if(execContext.qims){
              execContext.qims.service("ALMotion")
              .then(function(alMotion){
                  return alMotion.rest();
              });
          }
        };
        
        // 起動ボタン
        self.execBlock = function(){
        };
        // 停止
        self.stopBlock = function(){
            
        };

        // セーブとロード
        self.toJSON = function(){
            var saveData = {
                version:"00.01",
                toyBoxWsLst:    [],
                factoryBoxWsLst:[],
            };
            $.each(self.toyBoxWsList(),function(k,wsObsv){
                saveData.toyBoxWsLst.push(wsObsv().toJSON());
            });
            $.each(self.factoryBoxWsList(),function(k,wsObsv){
                saveData.factoryBoxWsLst.push(wsObsv().toJSON());
            });
            return saveData;  
        };
        self.fromJSON = function(data){
            var saveData = data;
            self.toyBoxWsList.removeAll();
            $.each(saveData.toyBoxWsLst,function(k,wsJson){
                var wsIns = self.blockManager.createBlockWorkSpaceIns("droppableScope")
                self.toyBoxWsList.push(ko.observable(wsIns));
                wsIns.fromJSON(wsJson);
            });
            self.factoryBoxWsList.removeAll();
            $.each(saveData.factoryBoxWsLst,function(k,wsJson){
                var wsIns = self.blockManager.createBlockWorkSpaceIns("droppableScope")
                wsIns.fromJSON(wsJson);
                self.factoryBoxWsList.push(ko.observable(wsIns));
            });
        };
        self.saveBlock = function(){
            if(!localStorage)return;
            localStorage.setItem("working_saveData",JSON.stringify(self.toJSON()));
        };
        self.loadBlock = function(){
            if(!localStorage)return;
            var saveData = JSON.parse(localStorage.getItem("working_saveData"));
            self.fromJSON(saveData);
        };

        // ■ 接続処理 ■

        // IP入力部分
        self.ipXXX_000_000_000 = ko.observable(192);
        self.ip000_XXX_000_000 = ko.observable(168);
        self.ip000_000_XXX_000 = ko.observable(1);
        self.ip000_000_000_XXX = ko.observable(2);

        var pepper_ip;
        if(localStorage){
            pepper_ip = JSON.parse(localStorage.getItem("pepper_ip"));
        }
        if(pepper_ip){
            self.ipXXX_000_000_000( pepper_ip.ip[0] );
            self.ip000_XXX_000_000( pepper_ip.ip[1] );
            self.ip000_000_XXX_000( pepper_ip.ip[2] );
            self.ip000_000_000_XXX( pepper_ip.ip[3] );
        }
        else{
            pepper_ip = {
                ip:[self.ipXXX_000_000_000(),
                    self.ip000_XXX_000_000(),
                    self.ip000_000_XXX_000(),
                    self.ip000_000_000_XXX(),],
            };
            if(localStorage){
                localStorage.setItem("pepper_ip",JSON.stringify(pepper_ip));
            }
        }
        var updatePepperIp = function(){
            pepper_ip.ip[0] = self.ipXXX_000_000_000();
            pepper_ip.ip[1] = self.ip000_XXX_000_000();
            pepper_ip.ip[2] = self.ip000_000_XXX_000();
            pepper_ip.ip[3] = self.ip000_000_000_XXX();
            if(!localStorage)return;
            localStorage.setItem("pepper_ip",JSON.stringify(pepper_ip));
        }
        self.ipXXX_000_000_000.subscribe(updatePepperIp);
        self.ip000_XXX_000_000.subscribe(updatePepperIp);
        self.ip000_000_XXX_000.subscribe(updatePepperIp);
        self.ip000_000_000_XXX.subscribe(updatePepperIp);

        // ■ 接続部分
        self.nowState = ko.observable("未接続");
        self.connect = function() 
        {
            var pepper_ip = JSON.parse(localStorage.getItem("pepper_ip"));
            var ip = 
            pepper_ip.ip[0] + "." +
            pepper_ip.ip[1] + "." +
            pepper_ip.ip[2] + "." +
            pepper_ip.ip[3];
            var qims;
            if(execContext.qims){
                //TODO: 接続状態の確認と再接続の方法を考える
                if(self.nowState()=="切断")
                {
                    execContext.qims.socket().socket.connect();
                }
            }
            else{
                if(self.lunchPepper){
                     qims = new QiSession();
                }else{
                     qims = new QiSession(ip);
                }
                qims.socket()
                .on('connect', function (aa) {
                    self.nowState("接続中");
                    qims.service("ALTextToSpeech")
                    .done(function (tts) {
                        tts.say("せつぞく、ぺっぷ");
                    });
                    execContext.setupExecContextFromQim(qims);
                })
                .on('disconnect', function (aa) {
                  self.nowState("切断");
                });
            }
        };
    }
    myModel = new MyModel();
    ko.applyBindings( myModel );
};
