//
// ペッパー商人
//

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
        var lastIpAddr = localStorage.getItem("pepper_ipAddr");
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
                 self.qim = new QiSession();
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
                console.log("nao qi error!:" + err.result||err);
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
        self.service("ALTabletService")
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
                        return self.connect();
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

