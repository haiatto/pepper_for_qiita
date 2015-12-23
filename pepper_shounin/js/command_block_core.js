//
// ペッパー商人
//

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
    self.parentWorkspaceId = -1;
    
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

    self.destry = function()
    {
        self.blkIns   = null;
        $.each(self.lutViewTbl,function(k,v) {
            v.destry();
        });
        self.lutViewTbl = {};
    };
    
    // view1のラッパ
    次ここ実装
    self.setCurrentVisial = function(){
    };
    self.setDefaultVisial = function(){
    };
    self.setExecuteVisial = function(){
    };    
    
    // UIの見た目
    self.lutViewTbl = {};
    self.createOrGetView = function(workSpaceViewId) {
        var View = function (cmdBkl) {
            var self = this;
                        
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
                if(eventListener){
                    cc.eventManager.removeListener(eventListener);
                    eventListener = null;
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
                if(cmdBkl.getBlockWorldId()=="label@shonin"){
                    ofsX = -6;
                }
                if(cmdBkl.getBlockWorldId()=="gotoLabel@shonin"){
                    ofsX = +6;
                }
                self.bg.setPosition   (x+ofsX,y);
                self.updateLabel();
            };
            self.getPosition = function()
            {
                var ofsX=0;
                if(cmdBkl.getBlockWorldId()=="label@shonin"){
                    ofsX = -6;
                }
                if(cmdBkl.getBlockWorldId()=="gotoLabel@shonin"){
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
                if(cmdBkl.getBlockWorldId()=="label@shonin"){
                    var data = cmdBkl.getValueInData("labelName")||{string:""};
                    text = "ラベル:" + data.string;
                }
                if(cmdBkl.getBlockWorldId()=="gotoLabel@shonin"){
                    var data = cmdBkl.getValueInData("labelName")||{string:""};
                    text = "Goto:" + data.string;
                }
                if(cmdBkl.getBlockWorldId()=="talk@shonin"){
                    var data = cmdBkl.getValueInData("talkLabel0")||{string:""};
                    var previewText = data.string;
                    text = "会話:" + previewText.substring(0,5)+"…";
                }
                self.label.setString(text);
                // サイズなどのレイアウト
                var lblSize = self.label.getContentSize();
                var minW=90;
                var minH=26;
                if(cmdBkl.getBlockWorldId()=="label@shonin"){
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
                if(cmdBkl.getBlockWorldId()=="label@shonin"||
                   cmdBkl.getBlockWorldId()=="gotoLabel@shonin"){
                    px=labelSize.width /2+6;//左寄せ
                }
                px=labelSize.width /2+6;//左寄せ
                self.label.setPosition(cc.p(px,py));
            };
            self.setPosition(0,0);
            self.updateLabel();
        };
        if (!self.lutViewTbl[workSpaceViewId])
        {
            self.lutViewTbl[workSpaceViewId] = new View(self);
        }
        return self.lutViewTbl[workSpaceViewId];
    };
    

};


// 複数のブロックを管理します。
// レイアウトを整えたりするお仕事をやります。
// また、実行の起点を扱ったりもします。
//  self.getCurCmdBlk
//  self.setCurCmdBlk
//
//  self.addListener
//  self.removeListener
//
//  self.saveToJsonTable
//  self.loadFromJsonTable
//
//  self.execStart
//  self.execStop
//
//  self.findGotoLabelCmdBlk
//  self.isContainCommandBlock
//  self.splitCommandBlockLump
//  self.concatCommandBlockLump
//  self.cutCommandBlock
//  self.addCommandLumpBlock
//  self.removeCommandLumpBlock
//  self.removeCmdBlk
//todo;kokorahen viewに
//  self.setPosition
//  self.setSize
//  self.updateLayout
// 
var workspaceIdSeed = 1;
var workspaceViewIdSeed = 1;
var CommandBlockWorkSpace = function(layer, commandBlockManager)
{
    var self = this;

    self.cmdBlkMan = commandBlockManager;
    self.cmdBlockLumpList = [];
    self.curCmdBlk = null;
    self.workSpaceId = workspaceIdSeed++;//not serialize

    /*
    // レイアウト
    var layout = ccui.ScrollView.create();
    layout.setBackGroundImage(res.workspace_frame_png);
    layout.setBackGroundImageScale9Enabled(true);
    layout.setClippingEnabled(true);
    layout.setDirection(ccui.ScrollView.DIR_VERTICAL);
    layout.setTouchEnabled(true);
    layout.setBounceEnabled(true);
    layer.addChild(layout);
    */

    //
    self.getCurCmdBlk = function()
    {
        return self.curCmdBlk;  
    };
    self.setCurCmdBlk = function(curCmdBlk)
    {   
        if(self.curCmdBlk){
            self.curCmdBlk.setDefaultVisial();
            self.curCmdBlk = null;
        }
        if(curCmdBlk){
        console.log("cmd blk gg");
            self.curCmdBlk = curCmdBlk;
            self.curCmdBlk.setCurrentVisial();
        }
    };

    // イベント通知周りです
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
    self.notify_workspaceCurCmdBlkUpdate = function()
    {
        $.each(listenerLst_,function(k,listener){
            if(listener.workspaceCurCmdBlkUpdate){
                listener.workspaceCurCmdBlkUpdate(self,self.curCmdBlk);
            }
        });
    };


    // 補助関数。ワークスペース内を全部走査します
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

    // ロードとセーブです
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

    // 再生制御です
    self.playCtx = {};
    self.execStart = function(startCmdBlk,endCb)
    {
        if ( startCmdBlk && !self.isContainCommandBlock(startCmdBlk) ){
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
                if(cmdBlk == self.curCmdBlk){
                    cmdBlk.setCurrentVisial();
                }else{
                    cmdBlk.setDefaultVisial();
                }
                self.playCtx.needStopCmdBlkCb = null;
            },
            errorExecCallback: function(blk){
                var cmdBlk = self.cmdBlkMan.lookupCommandBlock(blk);
                if(cmdBlk == self.curCmdBlk){
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

    // 指定のコマンドブロックがこのワークスペースのものか調べます
    self.isContainCommandBlock = function(cmdBlk)
    {
        return cmdBlk.parentWorkspaceId == self.workspaceId;
    };

    // 指定ブロックのinの位置でLumpに分割します
    self.splitCommandBlockLump = function(cmdBlk)
    {
        if ( !self.isContainCommandBlock(cmdBlk) ){
            console.warn("other workspace command block");
            return;
        }
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
    // 指定Lumpブロックのinの位置で前のLumpと結合します
    self.concatCommandBlockLump = function(cmdBlk)
    {
        if ( !self.isContainCommandBlock(cmdBlk) ){
            console.warn("other workspace command block");
            return;
        }
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
        if ( !self.isContainCommandBlock(cmdBlk) ){
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
    // ブロックの塊の先頭を渡して追加します
    self.addCommandLumpBlock = function(cmdBlkLumpTop)
    {
        if(self.curCmdBlk){
            if ( self.isContainCommandBlock(self.curCmdBlk) ){
                // カレントがワークスペース内ならその後ろにつなぎます
                self.curCmdBlk.blkIns.connectOut(cmdBlkLumpTop.blkIns);
                return;
            }
        }
        // それ以外は最後に追加します
        self.cmdBlockLumpList.push(cmdBlkLumpTop);
    };
    // ブロックの塊の先頭を渡して削除します
    self.removeCommandLumpBlock = function(cmdBlkLumpTop)
    {
        var idx = self.cmdBlockLumpList.indexOf(cmdBlkLumpTop);
        if(idx>=0){
            self.cmdBlockLumpList.splice(idx,1);
            return true;
        }
        return false;
    };

    // ブロックを指定して削除します(スコープ以下のものが接続されていれば合わせて削除されます)
    self.removeCmdBlk = function(removeCmdBlkTop)
    {
        if ( !self.isContainCommandBlock(removeCmdBlkTop) ){
            console.warn("other workspace command block");
            return;
        }
        var removeBlkIns = removeCmdBlkTop.blkIns;        

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
                    isClearCurrent = true;
                }
                self.cmdBlkMan.destryCommandBlock(cmdBlk);
            },
        });
        
        // ワークスペースの塊の先頭リスト内に居た場合はクリアします
        if(self.removeCommandLumpBlock(removeCmdBlkTop))
        {
            if(nextCmdLumpBlkTop){
                self.addCommandLumpBlock(nextCmdLumpBlkTop);
            }
        }
        // カレントがクリアされたら通知します
        if(isClearCurrent){
            self.notify_workspaceCurCmdBlkUpdate();
        }
    };


    // エディットモードの設定です
    // (エディットモードはアプリケーション的な部分にのみ影響します。
    //  ローレベルな処理は関係なく動きます)
    var editModeFlag_ = false;
    self.setEditMode = function(flg){
        editModeFlag_ = flg;
    };



    // ワークスペースのアプリケーション的な部分です
    // (イベントリスナーとそれに対応するアクション群)
    var click = function(cmdBlk)
    {
        //エディタ開くとかカレントにする
        self.setCurCmdBlk(cmdBlk);
        self.notify_workspaceCurCmdBlkUpdate();
    }
    var tgtCmdBlk_ = null;
    var tgtCmdBlkMoveOkTimer_ = 0;
    var overrapCmdBlk_ = null;
    var overrapDir_    = 0;
    var listenerParam = 
    {
        event: cc.EventListener.TOUCH_ONE_BY_ONE,
        onTouchBegan: function(touch, event) {    
            if (!cc.rectContainsPoint(layout.getBoundingBoxToWorld(), touch.getLocation())){
                //枠外は無視します
                // self.curCmdBlk = null; 
                // self.notify_workspaceCurCmdBlkUpdate();
                return;
            }
            var isOk = traverseAllCmdBlock_(function(cmdBlk){
                if (cc.rectContainsPoint(cmdBlk.bg.getBoundingBoxToWorld(), touch.getLocation())) 
                {
                    tgtCmdBlk_ = cmdBlk;
                    tgtCmdBlkMoveOkTimer_ = Date.now();
                    click(tgtCmdBlk_);
                    //event.stopPropagation();
                    return true;
                }
            });
            if(!isOk){
                self.setCurCmdBlk(null); 
                self.notify_workspaceCurCmdBlkUpdate();
            }
            if(!editModeFlag_){
                tgtCmdBlk_ = null;
            }
            return isOk;
        },
        onTouchMoved: function(touch, event) {
            var deltaTime = Date.now() - tgtCmdBlkMoveOkTimer_;
            if(tgtCmdBlk_)
            {
                //event.stopPropagation();
                
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
            tgtCmdBlk_ = null;
            overrapCmdBlk_ = null;
            overrapDir_ = 0;
            //コールバック内でレイアウト変更は危険なのでシステムから呼び出しにします
            setTimeout(function(){
                self.updateLayout();
            },0);
        },
    };

    // UI構築と描画部分です
    self.lutViewLst = [];
    
    self.updateLayout = function () {
        $.each(self.lutViewLst,function (k,v) {
            v.updateLayout();
        });
    };
    
    self.addView = function() {
        // レイアウト
        var View = function(workspace) {
            var self = this;
            self.workspaceViewId = workspace.workspaceViewIdSeed++;

            var layout = ccui.ScrollView.create();
            layout.setBackGroundImage(res.workspace_frame_png);
            layout.setBackGroundImageScale9Enabled(true);
            layout.setClippingEnabled(true);
            layout.setDirection(ccui.ScrollView.DIR_VERTICAL);
            layout.setTouchEnabled(true);
            layout.setBounceEnabled(true);
            layer.addChild(layout);

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
                        if(child.addTouchEventListener){
                            child.addTouchEventListener(null);
                        }
                        layout.removeChild(child,cleanup);
                    });
                };
                removeChildrenByTag(layout,TAG_SPRITE,true);
        
                var size = layout.getContentSize();
                var x = 32;
                var y = size.height;
                $.each(workspace.cmdBlockLumpList,function(idx, cmdBlkLump)
                {
                    y -= 16;
                    
                    var sepBarSprt = cc.Scale9Sprite.create(res.workspace_separate_bar_png);
                    sepBarSprt.setPosition(cc.p(size.width/2, y+8));
                    sepBarSprt.setContentSize(cc.size(size.width,16));
                    layout.addChild(sepBarSprt, 0, TAG_SPRITE);
        
                    if(idx>0)
                    {
                        if(editModeFlag_)
                        {
                            var btn = ccui.Button.create();
                            btn.setTouchEnabled(true);
                            btn.loadTextures(res.workspace_linehead_png, null, null);
                            btn.setPosition(cc.p(16/2, y+8));
                            btn.addTouchEventListener(function(button,type)
                            {
                                if(0==type){
                                    // 結合
                                    workspace.concatCommandBlockLump(cmdBlkLump);
                                    workspace.updateLayout();
                                }
                            });
                            layout.addChild(btn, 0, TAG_SPRITE);
                        }
                    }

                    var firstFlg = true;
                    var recv = function(cmdBlk)
                    {
                        var cmdBlkView = cmdBlk.createOrGetView(self.workspaceViewId);
                        
                        cmdBlkView.setParentUI(layout);
                        cmdBlkView.setEventListener({
                            event:        listenerParam.event,
                            onTouchBegan: listenerParam.onTouchBegan,
                            onTouchMoved: listenerParam.onTouchMoved,
                            onTouchEnded: listenerParam.onTouchEnded,
                        });
        
                        var blkSize = cmdBlkView.getSize();
                        cmdBlkView.setPosition( 
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
                            if(editModeFlag_)
                            {
                                var btn = ccui.Button.create();
                                btn.setTouchEnabled(true);
                                btn.loadTextures(res.workspace_linehead_png, null, null);
                                btn.setPosition(cc.p(16/2, y));
        
                                btn.addTouchEventListener(function(button,type)
                                {
                                    if(0==type){
                                        // 分割
                                        workspace.splitCommandBlockLump(cmdBlk);
                                        workspace.updateLayout();
                                    }
                                });
        
                                layout.addChild(btn, 0, TAG_SPRITE);
                            }
                        }
                        firstFlg = false;
        
                        y -= blkSize.height;
        
                        $.each(cmdBlk.blkIns.scopeOutTbl,function(idx2,scopeOut)
                        {
                            if(scopeOut.block)
                            {
                                recv( workspace.cmdBlkMan.lookupCommandBlock( scopeOut.block ) );
                            }
                        });
                        if(cmdBlk.blkIns.out)
                        { 
                            if(cmdBlk.blkIns.out.block)
                            {
                                recv( workspace.cmdBlkMan.lookupCommandBlock( cmdBlk.blkIns.out.block ) );
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
            
        };
        var view = new View(self);
        self.lutViewLst.push(view);
        return view;
    };
    self.removeView = function (view) {        
        var idx = self.lutViewLst.indexOf(view);
        if(idx>=0){
            self.lutViewLst.splice(idx,1);
        };
    };

};
