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

var KiiShouninCoreIns = null;
var NaoQiCoreIns      = null;
var ShouninCoreIns = null;

//
$(function(){
    console.log("shounin start!");

    ShouninCoreIns    = new ShouninCore();
    KiiShouninCoreIns = new KiiShouninCore();
    NaoQiCoreIns      = new NaoQiCore();

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
        self.curCmdBlk       = null;
        self.backupCurCmdBlk = null;
        self.isNowPlaying    = false;

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
        self.curCmdBlk = null;
        if(!cmdBlk){
            self.notifyUpdate();
            return;
        }
        self.curCmdBlk = cmdBlk;
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
        self.workSpaceMain.removeCmdBlk(removeCmdBlkTop);        
    };
    
    // ブロック編集モード
    self.isBlockEditModeFlag = false;
    self.isBlockEditMode = function() {
        return self.isBlockEditModeFlag;
    };
    self.setBlockEditMode = function (flg) {
        if(self.isNowPlay()){
            return;
        }
        if(self.curCmdBlk){
            self.curCmdBlk.setDefaultVisial();
            self.curCmdBlk = null;
        }
    	self.isBlockEditModeFlag = flg;
    	self.notifyUpdate();
    };
    
    // テキスト編集
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

//
var BtnBarMenu = function(leftX,topY)
{
    var self = this;

    var layout = ccui.Layout.create();
    var layer  = cc.Layer.create();

    layout.setPosition(cc.p(leftX, topY-48));
    layout.setContentSize(cc.size(64 * 0 + 8*2, 48));
    layout.setBackGroundImage(res.frame02_png);
    layout.setBackGroundImageScale9Enabled(true);
    layout.setClippingEnabled(true);

    self.layout = layout;
    self.layer  = layer;

    self.setParentUI = function(parentUI)
    {
        parentUI.addChild(self.layout);
        parentUI.addChild(self.layer);
    };

    var posX = 8;
    var boxW = 16;
    var boxH = 48;
    self.addBtn = function(label,btnW,cb){
        //var btnW = 64;
        boxW   += btnW;
        layout.setContentSize(cc.size(boxW, boxH));

        var btn = ccui.Button.create();
        btn.setTouchEnabled(true);
        btn.setScale9Enabled(true);
        btn.loadTextures(res.btn_frame01_png, null, null);
        btn.setTitleText(label);
        btn.setPosition(cc.p(posX+btnW/2,24));
        btn.setSize(cc.size(btnW, 32));
        layout.addChild(btn);
        posX += btnW;
        btn.addTouchEventListener(function(button,type)
        {
            if(0==type)
            {
                if(cb)cb(button,type);
            }
        });
    };
    self.addWidget = function(widget){
        var widgetSize = widget.getContentSize();
        boxW += widgetSize.width;
        layout.setContentSize(cc.size(boxW, boxH));

        layer.addChild(widget);

        var layoutPos = layout.getPosition();
        
        widget.setPosition(cc.p(
           layoutPos.x + widgetSize.width/2 + posX, 
           layoutPos.y + widgetSize.height/2 + (boxH - widgetSize.height)/2 ));
        posX += widgetSize.width;
    };
};

//
var MainLayer = cc.Layer.extend({
    ctor:function () {
        this._super();
        var self = this;
        var size = cc.director.getWinSize();

        var widgetSize = size;

        // ファイルメニュー
        self.fileMenu = new BtnBarMenu(0, size.height);
        self.fileMenu.setParentUI(self);
        self.fileMenu.addBtn("Load",48,function(button,type)
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
        self.fileMenu.addBtn("Save",48,function(button,type)
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
        self.fileMenu.addBtn("公開",48,function(button,type)
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
                    nameEd.setPlaceHolder ("とおりすがりの商人");
                    ownerEd.setPlaceHolder("ななしさん");
                    profEd.setPlaceHolder ("しょうこんちゅうにゅー");

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
                    btn.loadTextures(res.btn_frame01_png, null, null);
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
                    btn.loadTextures(res.btn_frame01_png, null, null);
                    btn.setTitleText("公開する");
                    btn.setPosition(cc.p(posX+64/2,24));
                    btn.setSize(cc.size(64, 32));
                    btn.addTouchEventListener(function(button,type)
                    {
                        if(0==type)
                        {
                            if(nameEd.string.length==0)
                            {
                                alert("名前が無いです！");
                                return;
                            }
                            if(ownerName.string.length==0)
                            {
                                alert("作った人が無いです！");
                                return;
                            }
                            if(note.string.length==0)
                            {
                                alert("説明がないです！");
                                return;
                            }
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

        // プレイメニュー
        var x = self.fileMenu.layout.getPosition().x + self.fileMenu.layout.getContentSize().width;
        self.playMenu = new BtnBarMenu(x, size.height);
        self.playMenu.setParentUI(self);
        self.playMenu.addBtn("プレイ",64,function(){
           ShouninCoreIns.execStartCurCmdBlk();
        });
        self.playMenu.addBtn("停止",64,function(){
           ShouninCoreIns.execStop();
        });

        // 商人プロフィールメニュー
        var x = self.playMenu.layout.getPosition().x + self.playMenu.layout.getContentSize().width;
        self.profMenu = new BtnBarMenu(x, size.height);
        self.profMenu.setParentUI(self);

        var nameEditBox = cc.EditBox.create(cc.size(26*4, 32), cc.Scale9Sprite.create(res.workspace_frame_png));
        nameEditBox.fontColor = new cc.Color(0,0,0,255);
        nameEditBox.setPosition(cc.p(0, 0));
        nameEditBox.setPlaceHolder("商人名");
        nameEditBox.string = "";
        self.profMenu.addWidget(nameEditBox);
        self.profMenu.addBtn("プロフィール",96,function(){
        });

        // サイドメニュー
        self.sideMenu = new BtnBarMenu(0, size.height);
        self.sideMenu.setParentUI(self);
        self.sideMenu.addBtn("商人広場",64,function(button,type)
        {
            ShouninCoreIns.mainScene.shouninCampoLayer.openCampo();
        });
        var p = self.sideMenu.layout.getPosition()
        var s = self.sideMenu.layout.getContentSize();
        self.sideMenu.layout.setPosition(cc.p(size.width-s.width,p.y));

        ShouninCoreIns.addListener(self);
        self.shouninCorePlayModeUpdate = function(){
            if(ShouninCoreIns.isNowPlay()){
                self.fileMenu.layout.setVisible(false);
                self.sideMenu.layout.setVisible(false);
            }else{
                self.fileMenu.layout.setVisible(true);
                self.sideMenu.layout.setVisible(true);
            }
        };

        // NaoQiメニュー
        var openNaoQiMenu = function(x,y){
            self.naoQiMenu = new BtnBarMenu(x,y);
            self.naoQiMenu.setParentUI(self);

            var ipEditBox = cc.EditBox.create(cc.size(26*4, 32), cc.Scale9Sprite.create(res.workspace_frame_png));
            ipEditBox.fontColor = new cc.Color(0,0,0,255);
            ipEditBox.setPosition(cc.p(0, 0));
            ipEditBox.setPlaceHolder("pepper ip addr");
            ipEditBox.string = NaoQiCoreIns.getIpAddress();
            self.naoQiMenu.addWidget(ipEditBox);
            self.naoQiMenu.addBtn("接続",48,function(){
                NaoQiCoreIns.setIpAddress(ipEditBox.string);
                NaoQiCoreIns.connect();
            });
            self.naoQiMenu.addBtn("ResetTablet",90,function(){
                NaoQiCoreIns.resetTabletSystem();
            });
        };
        //TODO: ツールボックス＋開くボタンとステータスををメニューに出すだけにする感じで。
        //openNaoQiMenu(560, size.height-48);

        //
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
        ShouninCoreIns.workSpaceMain.setPosition(4,4);
        ShouninCoreIns.workSpaceMain.setSize    (200,360);
        ShouninCoreIns.workSpaceMain.addListener(self);
        self.workspaceCurCmdBlkUpdate = function(workspace,cmdBlk){
            if(!ShouninCoreIns.isBlockEditMode()){
                ShouninCoreIns.setCurCmdBlk(cmdBlk);
            }
        };
        if(lunchPepper){
            return;
        }

        self.dustboxBtn   = null;
        self.buttonBoxBtn = null;
        self.blockBox     = null;

        // 商人コアのリスナー登録
        ShouninCoreIns.addListener(self);
        self.shouninCoreUpdate = function()
        {
            if(ShouninCoreIns.isBlockEditMode()){
                ShouninCoreIns.mainScene.pepperLayer.setCanvasVisible(false);
                ShouninCoreIns.workSpaceMain.setEditMode(true);
                self.dustboxBtn.setVisible(true);
            }else{
                ShouninCoreIns.mainScene.pepperLayer.setCanvasVisible(true);
                ShouninCoreIns.workSpaceMain.setEditMode(false);
                self.dustboxBtn.setVisible(false);
            }
        };
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
        {
            var dustboxBtn = ccui.Button.create();
            dustboxBtn.setTouchEnabled(true);
            dustboxBtn.loadTextures(res.icon_dustbox_png, null, null);
            dustboxBtn.setPosition(cc.p(4+32+64,0+32));
            dustboxBtn.addTouchEventListener(function(button,type)
            {
                if (type!=0) {
                    return;
                }
                var curCmdBlk = ShouninCoreIns.workSpaceMain.getCurCmdBlk();
                if(curCmdBlk)
                {
                    ShouninCoreIns.workSpaceMain.removeCmdBlk(curCmdBlk);
                }

                //TODO:商人コア経由でリスナーからアップデートする方がいいかも。
                ShouninCoreIns.workSpaceMain.updateLayout();
            });        
            self.addChild(dustboxBtn,1);
            self.dustboxBtn = dustboxBtn;
            self.dustboxBtn.setVisible(false);
        }
        
        // ボタンパネルボタン
        {
            var btnPanekBtn = ccui.Button.create();
            btnPanekBtn.setTouchEnabled(true);
            btnPanekBtn.loadTextures(res.icon_blockpanel_png, null, null);
            btnPanekBtn.setPosition(cc.p(4+32,0+32));
            btnPanekBtn.addTouchEventListener(function(button,type)
            {
                if (type!=0) {
                    return;
                }
                ShouninCoreIns.setBlockEditMode(!ShouninCoreIns.isBlockEditMode());
                
                //TODO:商人コア経由でリスナーからアップデートする方がいいかも。
                ShouninCoreIns.workSpaceMain.updateLayout();
            });        
            self.addChild(btnPanekBtn,1);
            self.buttonBoxBtn = btnPanekBtn;
        }

        // ブロック追加ボタンボックス
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
            layout.setVisible(false);
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
                btn.loadTextures(res.btn_frame01_png, null, null);
                btn.setTitleText(text);
                btn.setPosition(cc.p(8+blkW/2 + nowXIdx*(blkW+4), nowY + blkH/2));
                btn.setSize(cc.size(blkW, blkH));
                btn.addTouchEventListener(function(button,type){
                    if(type==0){
                        var cmdBlk = ShouninCoreIns.cmdBlkMan.createCommandBlock(worldBlkId);
                        ShouninCoreIns.workSpaceMain.addCommandLumpBlock( cmdBlk );
                        ShouninCoreIns.workSpaceMain.updateLayout();
                        ShouninCoreIns.workSpaceMain.setCurCmdBlk(cmdBlk);
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
            
            self.shouninCoreUpdate = function()
            {
            	if ( ShouninCoreIns.isBlockEditMode() ){           	    
                    layout.setVisible(true);
                }else{
                    layout.setVisible(false);
                }
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
        {
            self.blockBox = new BlockBox(self,220, 4, 250, 380);

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

        var posX = 260;
        var posY = 50;
        var updatePos = function(){
            var leftOfs = parseFloat($("#Cocos2dGameContainer").css("margin-left"));
            self.pepperModel.setCanvasPos(leftOfs+posX,posY);
        };
        $(window).on('load resize', updatePos);
        updatePos();

        //外部からのキャンバス操作
        self.setCanvasPos = function(x,y){
            posX = x; posY = y;
            updatePos();
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
        self.setCanvasVisible = function(flag){
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
        btn.loadTextures(res.btn_frame01_png, null, null);
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
        btn.loadTextures(res.btn_frame01_png, null, null);
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
              var pepperLayer = ShouninCoreIns.mainScene.pepperLayer;

              console.log("ポーズ");
              console.log(valueDataTbl['poseData0'].poseData);

              if(pepperLayer.pepperModel)
              {
                  // その後、データの内容をスライダーとモデルに反映します
                  var poseData = valueDataTbl['poseData0'].poseData;
                  if(poseData)
                  {
                      $.each(poseData.jointAngles,function(jointName,angle)
                      {
                          var jointObj = pepperLayer.pepperModel.jointObjTbl[jointName];
                          jointObj.setJointAngle(angle);
                      });
                  }
              }
              setTimeout(function(){
                  dfd.resolve();
              },1000);
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
                btn.loadTextures(res.btn_frame01_png, null, null);
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

