//
// ペッパーブロック
//

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

var userAgent = window.navigator.userAgent.toLowerCase();
var appVersion = window.navigator.appVersion.toLowerCase();

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

function Camera(alVideoDevice) {
    var self = this;
    self.subscribe = function(){
        self.nameId = alVideoDevice.subscribeCamera(
            "pepper_remocon_cam", 
            0, // nao_top
            1, // 320x240 
            11,// Rgb
            5  // frame_rate
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
              var buff = _base64ToArrayBuffer(data[6]);
              callback(data[0],data[1], buff);
            });
        }
    };
    self.subscribe();
}

//作成中メモ
// スクラッチの概念
//  丸いブロックは変数
//  丸い入力枠は数字しか入れられない入力枠。変数とは関係ないみたい。
//  四角い入力枠は文字なら何でもあり
//  四角いリストボックス枠は、2種類くらいあるみたい。変数が入るのと入らないの。
//  変数が入るのは、スプライトとか背景名(所謂シンボル)が入るものが多数みたい
//  変数が入らないのは機能が固定のものが多いみたい。
//  リストボックスで指定される名前は変数でも行けるものと、変数では設定できないものがあるみた。混合もある。どこへボックスとか
//  変数は文字列。数字変換できるなら数字っぽい。ブロックの入力は何でも受け付けるけど、扱いが
//  入力ボックスは、どうも
//    四角(自由に入力可)と丸(数値入力可)、
//    リストから選択機能と、
//    直接入力可・不可、
//    変数ドロップあり・なし
//  などの条件から作られるっぽい？ただし四角とリスト機能と自由入力を組み合わせたものはないみたい。

//■■■■■ データフォーマット案 ■■■■■ 
// -- root --
// blockOpt
//   sys_version
//     'システムバージョン'
//   blockWorldId
//     '世界共通の重複しない識別子'
//   lang
//     'jp' 'en'
//   color
//     'red' '#F88'
//   head
//     'start' 'in' ’value’
//   tail
//     'end' 'out' ’value’
// blockContents
//   expressions
//     ***下記参照***
//   scope
//     scopeName
//   space
// {
//     blockOpt:{version:'0.01',head:'start',tail:'out'},
//     blockContents:[
//         {expressions:[]},
//         {scope:{scopeName:'scopeA',}},
//         {expressions:[]},
//         {scope:{scopeName:'scopeB',}},
//         {space:{spaceName:'spaceA',}},
//     ],
// },
// -- expressions --
// expressions
//   label
//   string
//   number
//   bool
//   options
// [
//   {label:"ここに"}.
//   {string:{default:"",},dataName:'dataA'},
//   {string:{default:"",},dataName:'dataB'},
//   {options:{default:'',list:[{text:'いち',value:'1'},{text:'に',value:'2'},]},dataName:'dataC'},
// ],

//■■■■■ 多言語対応案 ■■■■■ 
//  blockWorldId と lang で多言語対応
//  expressions の中身は言語によって順番やラベル数まで変わる可能性ありそう
//  
//==============================

//deferredの参考リンク
// http://s3pw.com/qrefy/collectdeferred/
// http://tokkono.cute.coocan.jp/blog/slow/index.php/programming/jquery-deferred-for-responsive-applications-basic/
//

$(function(){
    $(window).on('beforeunload', function() {
        return 'このまま移動しますか？';
    });
});

function Block(blockManager, blockTemplate, callback) {
    var self = this;

    // ■どちらかというとプライベートな部分(プライベートに出来そう)
    self.blockManager  = blockManager;
    self.blockTemplate = JSON.parse(JSON.stringify(blockTemplate));
    self.callback      = callback;

    // ■どちらかというとViewModel的な部分
    self.element = null;

    self.pix2em           = 1.0;//ピクセル単位をフォント単位に変換する値
    self.minimumRowHeightEm = 1.0;
    self.indentWidthEm      = 1.0;
    self.minimumRowHeight   = 0.0;//pix2em確定時に確定
    self.indentWidth        = 0.0;//pix2em確定時に確定
    self.blockWidth  = ko.observable(0);
    self.blockHeight = ko.observable(0);
    self.posX        = ko.observable(0);
    self.posY        = ko.observable(0);
    self.blockColor  = ko.observable(self.blockTemplate.blockOpt.color||"red");

    //レイアウトにかかわるパラメータが更新されたら更新をかけます
    self.blockHeight.subscribe(function(){
        self.blockManager.updatePositionLayout(self);
    });

    // SVG要素作成のための補助
    self.makeSvgPath = function(templ,offs)
    {
        templ = templ.replace(/([0-9]+(\.[0-9]+)?)em/g, function(s,a){
            return (parseFloat(a) / self.pix2em);
        } );
        
        templ = templ.replace(/%([tlbr])(\(([+-]?[0-9]+(\.[0-9]+)?)\))?/g, function(s,a,x,b){
            var pix = 0;
            if(a=='t') pix = (-offs.top /self.pix2em);
            if(a=='l') pix = (-offs.left/self.pix2em);
            if(a=='b') pix = (-offs.top /self.pix2em + self.blockHeight());
            if(a=='r') pix = (-offs.left/self.pix2em + self.blockWidth() );
            return "" + (pix + (b?parseFloat(b):0) );
        } );
        return templ;
    };

    // ■ブロックテンプレからの準備

    // 入出力部分を準備します
    if(self.blockTemplate.blockOpt.head == 'value') {
        // 値用のブロックの連結(出力)部分
        // ※フローブロックと比べると、ある面でラムダ式っぽいかも。
        self.valueOut = {
            block:null, 
            tgtDataName:null, 
            hitArea:null
        };
    }
    else{
        // フロー用のブロックの連結(入出)部分
        if(self.blockTemplate.blockOpt.head == 'in') {
            self.in = {
                blockObsv:ko.observable(),
                srcScopeName:null, 
                hitArea:null
            };
        }
        if(self.blockTemplate.blockOpt.tail == 'out') {
            self.out = {
                blockObsv:ko.observable(), 
                hitArea:null
            };
        }
    }

    // 行のような部分の中身を作ります
    self.valueDataTbl = {};
    self.valueInTbl = {};
    self.scopeTbl = {};
    self.rowContents = [];
    $.each(self.blockTemplate.blockContents,function(rowIndex,contentTemplate){
        // 行のような部分を構築
        var rowContent = {
            contentTemplate:contentTemplate,
            rowBlockLocalY:ko.observable(),
            rowHeight:ko.observable(),
        };
        if(contentTemplate.expressions) {
            // 式(ラベルと値で構成される)の構築をします
            rowContent.expressions = [];
            $.each(contentTemplate.expressions,function(key,dataTemplate){
                var expression = {
                    dataTemplate:dataTemplate,
                    blockLocalX:0,
                    blockLocalY:0,
                };
                if(dataTemplate.dataName){
                    expression.blockObsv = ko.observable();
                    expression.hitArea   = null;
                    expression.valueObsv = ko.observable();
                    self.valueInTbl[dataTemplate.dataName] = expression;
                    self.valueDataTbl[dataTemplate.dataName] = expression.valueObsv;
                    if(dataTemplate.bool)
                    {
                        expression.valueObsv(dataTemplate.bool.default||false);
                    }
                    if(dataTemplate.string)
                    {
                        expression.valueObsv(dataTemplate.string.default||"");
                    }
                    if(dataTemplate.number)
                    {
                        expression.valueObsv(dataTemplate.number.default||0);
                    }
                    if(dataTemplate.options)
                    {
                        expression.valueObsv(dataTemplate.options.default||"");
                    }
                }
                rowContent.expressions.push(expression);
            });
        }
        if(contentTemplate.scope)
        {
            // スコープがつながる先のためのデータを作ります。
            rowContent.scopeOut = {
                blockObsv:ko.observable(), 
                hitArea:null,
            };
            self.scopeTbl[contentTemplate.scope.scopeName] = rowContent;
        }
        if(contentTemplate.space)
        {
            // スペース用のデータを作ります。現状は空テーブル
            rowContent.space = {
            };
        }
        self.rowContents.push(rowContent);
    });

    
    // クローンするドラッグモード
    self.isCloneDragMode = false;
    self.setCloneDragMode = function(enable)
    {
        self.isCloneDragMode = enable;
        if(self.element) {
            $(self.element).draggable( 
                "option", "scope", 
                enable?"toCloneBlock":"toOriginalBlock" 
            );
            $(self.element).draggable( 
                "option", "containment", 
                enable?$(".blockBox"):null 
            );
        }
    };

    // 接続禁止にするモード
    self.isNoConnectMode = false;
    self.setNoConnectMode = function(enable)
    {
        self.isNoConnectMode = enable;
    };


    // 要素関連のセットアップ
    self.setup = function(element){
        if(self.element){
            // 対象となる要素の再セットアップの場合…なにかやるべき？
            self.element = null;
        }
        self.element = element;
        self.pix2em  = 1.0 / ($('#pix2em').outerHeight()/100.0);
        self.minimumRowHeight = self.minimumRowHeightEm / self.pix2em;
        self.indentWidth      = self.indentWidthEm      / self.pix2em;
        if(self.in)
        {
            self.in.hitArea = $(".hitAreaIn", element);
        }
        if(self.out)
        {
            self.out.hitArea = $(".hitAreaOut", element);
        }
        if(self.valueOut)
        {
            self.valueOut.hitArea = $(".hitAreaValueOut", element);
        }
        $.each(self.valueInTbl, function(dataName,valueIn){
            valueIn.hitArea = $(".hitAreaValueIn#"+dataName, element);
        });
        $.each(self.scopeTbl, function(scopeName,scope){
            scope.scopeOut.hitArea = $(".hitAreaScopeOut#"+scopeName, element);
        });

        //TODO:押して少し経ったら編集モード、その間に動かされたらドラッグモードが良いはず
        var cloneBlock = null;
        var draggableDiv =$(self.element);

        // 編集モード
        function EditMode(){
            var self = this;
            var editModeTimeId;
            var draggableElem;
            var tgtElem;
            var setEditMode_ = function(draggableElem, editableElm){
                // curEditMode を割り当てます
                $(editableElm).addClass("curEditMode");
                $(draggableElem).addClass("curEditModeForDraggable");
                // 対象ブロックのドラッグを無効化します
                $(draggableElem).draggable('disable');
            };
            var clearAllEditMode_ = function(){
                // curEditMode を外します
                var nowEditableElm = $(".curEditMode");
                var nowEditableDraggableElm = $(".curEditModeForDraggable");
                nowEditableElm.removeClass("curEditMode");
                nowEditableDraggableElm.removeClass("curEditModeForDraggable");
                // 外れた要素のドラッグを有効化します
                nowEditableDraggableElm.draggable('enable');
            };
            var clearEditableFocus_ = function(){
                if(checkAgent_NeedDragUnselect())
                {
                    // 外れた要素の編集状態を無効にします
                    // (他の要素をドラッグしたりする際にフォーカスが外れないらしいChromeの仕様かcontentEdiableの仕様)
                    // (荒わざっぽいけど働いてる事は働いてる)
                    var editableFix = jQuery('<div style="position:absolute"><input style="width:1px;height:1px;border:none;margin:0;padding:0;" tabIndex="-1"></div>').appendTo( element );
                    editableFix.focus();
                    editableFix.children()[0].setSelectionRange(0, 0);
                    editableFix.blur();
                    editableFix.remove();
                }
            }
            var nowWait_ = false;
            self.isNowLazyEditModeStartWait = function()
            {
                return nowWait_;
            }
            self.lazyEditModeStart = function(draggableElem_,tgtElem_){
                nowWait_ = true;
                draggableElem = draggableElem_;
                tgtElem       = tgtElem_;
                //console.log("edit mode ready");
                // 編集モードへの移行を開始します
                // (押したりりタップ後、一定時間でキャンセルされなければ開始となります)
                if(editModeTimeId){
                    clearTimeout(editModeTimeId);
                    editModeTimeId = null;   
                }
                editModeTimeId = setTimeout(function(){
                    nowWait_ = false;
                    //console.log("edit mode start");
                    // 編集対象を探します
                    var editableElm;
                    if($(tgtElem).attr("contentEditable")=='true'){
                        editableElm = $(tgtElem);
                    }
                    if(!editableElm||editableElm.length==0){
                        editableElm = $("[contentEditable='true']", tgtElem);
                    }
                    if(!editableElm||editableElm.length==0){
                        editableElm = $("[contentEditable='true']", draggableElem);
                    }
                    if(editableElm.length>0){
                        editableElm = $(editableElm[0]);
                    }
                    // 編集対象があれば選択します
                    if(editableElm.length>0){
                        //console.log("edit mode start2");
                        // 現在編集モードの対象をクリアします
                        clearAllEditMode_();
                        // 編集対象をセットします
                        setEditMode_(draggableElem, editableElm);
                        // 編集対象へフォーカスをあてます
                        editableElm[0].focus();
                        $(editableElm[0]).blur(function(){
                            //console.log("edit mode blur");
                            clearAllEditMode_();
                        });
                    }
                },300);
            };
            self.lazyEditModeCancel = function(){
                //console.log("edit mode cancel");
                nowWait_ = false;
                clearTimeout(editModeTimeId);
                clearAllEditMode_();
                clearEditableFocus_();
                editModeTimeId = null;
            };
        };
        var editMode = new EditMode();

        draggableDiv
          .mousedown(function(ev) {
              if(editMode.isNowLazyEditModeStartWait()){
                  //遅延開始待ち中に再度ダウンを検知したら解除します(ダブルタップなどだと思われるので)
                  editMode.lazyEditModeCancel();                  
              }
              else{
                  editMode.lazyEditModeStart(this,ev.target);
              }
          })
          .draggable({
              //containment:$(".blockBox"),
              //scope:'toOriginalBlock',
              scroll:false,
              cancel:".noDrag,input,textarea,button,select,option",
              helper:function(e){
                  if(self.isCloneDragMode){
                      cloneBlock = self.cloneThisBlock();
                      self.blockManager.addFloatDraggingList(cloneBlock);
                      return cloneBlock.element;
                  }
                  else{
                      return this;
                  }
              },
              start:function(event, ui){
                  editMode.lazyEditModeCancel();

                  if(self.isCloneDragMode){
                      self.blockManager.moveStart(cloneBlock, ui.position);
                  }
                  else{
                      self.blockManager.moveStart(self, ui.position);
                  }
                  if(self.in){
                      $(".hitAreaOut").addClass("hitAreaDragging");
                      $(".hitAreaScopeOut").addClass("hitAreaDragging");
                  }
                  if(self.out){
                      $(".hitAreaIn").addClass("hitAreaDragging");
                  }
                  if(self.valueOut)
                  {
                      $(".hitAreaValueIn").addClass("hitAreaDragging");
                      $(".hitAreaValueOut").addClass("hitAreaDragging");
                  }
              },
              drag:function(event, ui){
                  //console.log("drag ");
                  if(self.isCloneDragMode){
                      self.blockManager.move(cloneBlock, ui.position);
                  }
                  else{
                      self.blockManager.move(self, ui.position);
                  }
              },
              stop:function(event, ui){
                  $(".hitAreaDragging").removeClass("hitAreaDragging");
                  //console.log("drag stop");
                  if(self.isCloneDragMode){
                      self.blockManager.moveStop(cloneBlock, ui.position);
                      self.blockManager.removeBlock(cloneBlock);
                      cloneBlock = null;
                  }
                  else{
                      self.blockManager.moveStop(self, ui.position);
                  }
              },
          })
          //.dblclick(function(){
          //    self.deferred();
          //})
          .doubletap(function(){
              editMode.lazyEditModeCancel();
              self.deferred();
          });

        // 要素が出来たので再度設定します(内部でdraggableなどをいじります)
        self.setCloneDragMode(self.isCloneDragMode);
    };
    
    // Deferred の promise作って返します
    self.deferred = function()
    {
        // 値の受け取りを行います
        // HACK: この形が良いかは要検討。コールバック内に委ねる方がいいかも？
        var valuePromiseList = [];
        $.each(self.valueInTbl,function(k,valueIn){
            if(valueIn.blockObsv()){
                // 値ブロックのpromiseを実行してその結果をvalueDataTblにセットするpromiseを作成
                valuePromiseList.push(
                    $.Deferred(function(dfd) {
                        var valuePromise = valueIn.blockObsv().deferred();
                        valuePromise.then(function(value){
                            var valueObsv = self.valueDataTbl[valueIn.dataTemplate.dataName];
                            valueObsv(value);
                            dfd.resolve();
                        });
                    }).promise()
                );
            } 
        });
        // 入力する値ブロックが全部完了したら自身のコールバックを実行します
        return $.when.apply($,valuePromiseList).then(function(){
            //out部分のみここで繋ぎます(スコープ以下はコールバック内でやります)
            if(self.out && self.out.blockObsv()){
                return $.Deferred(function(dfd){
                    // 自身の処理を実行します
                    $(self.element).removeClass("executeError"); 
                    $(self.element).addClass("executeNow");
                    self.callback(self.valueDataTbl, self.scopeTbl)
                    .then(
                      function(){
                        // outに繋がるブロックを実行(先がoutにつながってるならば連鎖していき終るまで帰りません)
                        $(self.element).removeClass("executeNow"); 
                        self.out.blockObsv().deferred().then(function(){
                            // 繋がるブロック移行が完了したら自身も完了させます
                            dfd.resolve();
                        });
                      },
                      function(){
                        //失敗時
                        $(self.element).removeClass("executeNow"); 
                        $(self.element).addClass("executeError");                        
                      }
                    );
                }).promise();
            }
            else{
                $(self.element).removeClass("executeError"); 
                $(self.element).addClass("executeNow");
                return self.callback(self.valueDataTbl, self.scopeTbl)
                    .then(function(v){
                        $(self.element).removeClass("executeNow"); 
                        return v;
                     },
                     function(){
                         //失敗時
                         $(self.element).removeClass("executeNow"); 
                         $(self.element).addClass("executeError");
                     });
            }
        });
    };

    self.clearOut = function()
    {
        if(self.out && self.out.blockObsv())
        {
            self.out.blockObsv().in.blockObsv(null);
            self.out.blockObsv(null);
        }
    };
    self.clearIn = function()
    {    
        if(self.in && self.in.blockObsv())
        {
            if(self.in.srcScopeName){
                self.in.blockObsv().clearScopeOut(self.in.srcScopeName);
            }else{
                self.in.blockObsv().clearOut();
            }
        }
    };
    self.clearScopeOut = function(scopeName){
        if(self.scopeTbl[scopeName])
        {
            if(self.scopeTbl[scopeName].scopeOut.blockObsv())
            {
                self.scopeTbl[scopeName].scopeOut.blockObsv().in.blockObsv(null);
                self.scopeTbl[scopeName].scopeOut.blockObsv().in.srcScopeName = null;
                self.scopeTbl[scopeName].scopeOut.blockObsv(null);
            }
        }
    };
    self.clearValueIn = function(dataName)
    {
        var valueIn = self.valueInTbl[dataName];
        if(valueIn && valueIn.blockObsv())
        {
            valueIn.blockObsv().valueOut.block       = null;
            valueIn.blockObsv().valueOut.tgtDataName = null;
            valueIn.blockObsv(null);
        }
    };
    self.clearValueOut = function()
    {
        if(self.valueOut && self.valueOut.block)
        {
            self.valueOut.block.clearValueIn( self.valueOut.tgtDataName );
        }
    };

    // 外側につながるブロックをセットします
    self.connectOut = function(block){
        var oldConnect = self.out.blockObsv()
        self.clearOut();
        block.clearIn();
        self.out.blockObsv(block);
        self.out.blockObsv().in.blockObsv(self);
        if(oldConnect)
        {
            var bottomBlock = self.out.blockObsv();
            while(bottomBlock.out && bottomBlock.out.blockObsv()){
                bottomBlock = bottomBlock.out.blockObsv();
            }
            if(bottomBlock.out){
                bottomBlock.connectOut(oldConnect);
            }
        }
    };

    // 値の入力のブロックをセットします
    self.connectValueIn = function(dataName, valueBlock){
        var valueIn = self.valueInTbl[dataName];
        if(valueIn)
        {
            self.clearValueIn(dataName);
            valueBlock.clearValueOut();

            valueIn.blockObsv(valueBlock);
            valueBlock.valueOut.block       = self;
            valueBlock.valueOut.tgtDataName = dataName;
        }
    };

    // 内側につながるブロックをセットします
    self.connectScopeOut = function(scopeName, block){
        if(!self.scopeTbl[scopeName])
        {
            console.log("error:" + scopeName);
            return;
        }
        if(self.scopeTbl[scopeName].scopeOut.blockObsv())
        {
            self.scopeTbl[scopeName].scopeOut.blockObsv().in.blockObsv(null);
        }
        self.scopeTbl[scopeName].scopeOut.blockObsv(block);
        block.in.blockObsv(self);
        block.in.srcScopeName = scopeName;
    };

    // 複製します(内側のブロックは複製されません)
    self.cloneThisBlock = function(){
        var ins = new Block(self.blockManager, self.blockTemplate, self.callback);
        $.each(self.valueDataTbl,function(key,value){
            ins.valueDataTbl[key](value());
        });
        return ins;
    };
}


// 設計メモ
// 管理リスト＋グローバルなブロックという形で実装
// ブロック間はグローバルにつなぎ、相互に接続も自由。
// 管理エリア毎にリストを作ってそこに格納するだけ。

//TODO:
// 今はリストは固定名だけど、動的に作れるようにする。
// 動的になれば、タブ実装とかが簡単にできるはず

function BlockManager(){
    var self = this;
    self.blockList = [];
    self.floatDraggingList = ko.observableArray();
    self.materialList = ko.observableArray();
    self.toyList      = ko.observableArray();
    self.factoryList  = ko.observableArray();

    // コリジョン判定
    var checkHitDist = function(area0, area1){
        var offs0 = area0.offset();
        var offs1 = area1.offset();
        var w0    = area0.width();
        var h0    = area0.height();
        var w1    = area1.width();
        var h1    = area1.height();
        if(offs0.top < offs1.top + h1&&
           offs1.top < offs0.top + h0&&
           offs0.left < offs1.left + w1&&
           offs1.left < offs0.left + w0)
        {
            var vx = (offs0.left + w0/2) - (offs1.left + w1/2);
            var vy = (offs0.top  + h0/2) - (offs1.top  + h1/2);
            return Math.sqrt(vx*vx + vy*vy);
        }
    };
    var getHitBlock = function(block){
        var nearDist = 99999999;
        var hitBlock = null;
        var srcBlock = null;
        var isIn     = false;
        var valueName= null;
        // 入出力ブロックを取り出します
        var inBlock  = null;
        var outBlock = null;
        var valueBlock = null;
        if(block.in){
            inBlock = block;
        }
        if(block.out){
            outBlock = block;
            while(outBlock.out){
                if(outBlock.out.blockObsv()){
                    outBlock = outBlock.out.blockObsv();
                }
                else{
                    break; 
                }
            }
        }
        if(block.valueOut){
            valueBlock = block;
        }
        // ヒットチェックをします
        // TODO:所属リストのチェックをするべき
        $.each(self.blockList,function(k,tgtBlock){
            if(tgtBlock.isNoConnectMode){
                return;
            }
            var dist;
            if(tgtBlock == inBlock) return;
            if(tgtBlock == outBlock) return;
            if(tgtBlock == valueBlock) return;
            if(tgtBlock.in && outBlock && outBlock.out){
                dist = checkHitDist($(tgtBlock.in.hitArea), $(outBlock.out.hitArea));
                if(dist && dist < nearDist){
                    nearDist = dist;
                    hitBlock = tgtBlock;
                    srcBlock = outBlock;
                    isSrcIn  = false;
                    valueName = null;
                    scopeName = null;
                }
            }
            if(tgtBlock.out && inBlock){
                dist = checkHitDist($(tgtBlock.out.hitArea), $(inBlock.in.hitArea));
                if(dist && dist < nearDist){
                    nearDist = dist;
                    hitBlock = tgtBlock;
                    srcBlock = inBlock;
                    isSrcIn  = true;
                    valueName = null;
                    scopeName = null;
                }
            }
            if(inBlock){
                $.each(tgtBlock.scopeTbl,function(name,scope){
                    dist = checkHitDist($(scope.scopeOut.hitArea), $(inBlock.in.hitArea));
                    if(dist && dist < nearDist){
                        nearDist = dist;
                        hitBlock = tgtBlock;
                        srcBlock = inBlock;
                        isSrcIn  = true;
                        valueName = null;
                        scopeName = name;
                    }
                });
            }
            if(valueBlock){
                $.each(tgtBlock.valueInTbl,function(name,valueIn){
                    dist = checkHitDist($(valueIn.hitArea), $(valueBlock.valueOut.hitArea));
                    if(dist && dist < nearDist){
                        nearDist = dist;
                        hitBlock = tgtBlock;
                        srcBlock = valueBlock;
                        isSrcIn  = false;
                        valueName = name;
                        scopeName = null;
                    }
                });
            }
        });
        if(hitBlock){
            return {hitBlock:hitBlock,
                    srcBlock:srcBlock,
                    isSrcIn:isSrcIn,
                    valueName:valueName,
                    scopeName:scopeName,};
        }
    };
    // 位置のレイアウト処理です(サイズはカスタムバインドで処理します)
    self.updatePositionLayout = function(updateBlock){
        //console.log("updatePositionLayout");

        // 更新する一番上のブロックを探します
        var topBlock = updateBlock;
        //値用ブロックの場合は接続先を辿ります
        while(topBlock.valueOut && topBlock.valueOut.block)
        {
            topBlock = topBlock.valueOut.block;
        }
        //通常用ブロックの場合は接続元を辿ります
        while(topBlock.in && topBlock.in.blockObsv())
        {
            topBlock = topBlock.in.blockObsv();
        }        
        // レイアウトします
        var recv = function(block){
            // 位置のみなのでブロック内の処理順は自由にやれます
            $.each(block.valueInTbl,function(k,valueIn){
                if(valueIn.blockObsv()){
                    var blockA = block;
                    var blockB = valueIn.blockObsv();
                    blockB.posX(
                        blockA.posX() + valueIn.blockLocalX
                    );
                    blockB.posY(
                        blockA.posY() + valueIn.blockLocalY
                    );
                    recv(valueIn.blockObsv());
                }
            });
            $.each(block.scopeTbl,function(k,scope){
                if(scope.scopeOut.blockObsv()){
                    var blockA = block;
                    var blockB = scope.scopeOut.blockObsv();
                    //var marginConnector = 0.5 / blockB.pix2em;
                    blockB.posY(
                        blockA.posY() + scope.rowBlockLocalY()// + marginConnector
                    );
                    blockB.posX(
                        blockA.posX() + blockA.indentWidth
                    );
                    recv(blockB);
                }
            });
            if(block.out && block.out.blockObsv())
            {
                var blockA = block;
                var blockB = block.out.blockObsv();
                var elmA = blockA.element;
                var elmB = blockB.element;
                //var marginConnector = 0.5 / blockB.pix2em;
                blockB.posY(
                    blockA.posY() + blockA.blockHeight()// + marginConnector
                );
                blockB.posX(
                    blockA.posX()
                );
                recv(blockB);
            }
        };
        recv(topBlock);
    };

    self.moveStart = function(block,position){
        block.clearIn();
        block.clearValueOut();
        // 動かすモノをかつながっている順に後ろに付け替えます
        self.blockList.splice( self.blockList.indexOf(block), 1 );
        self.blockList.push(block);
        var recv = function(block){
            $.each(block.valueInTbl,function(k,valueIn){
                if(valueIn.blockObsv())
                {
                    self.blockList.splice( self.blockList.indexOf(valueIn.blockObsv()), 1 );                
                    self.blockList.push( valueIn.blockObsv() );
                    recv(valueIn.blockObsv());
                }
            });
            $.each(block.scopeTbl,function(k,scope){
                if(scope.scopeOut.blockObsv())
                {
                    self.blockList.splice( self.blockList.indexOf(scope.scopeOut.blockObsv()), 1 );                
                    self.blockList.push( scope.scopeOut.blockObsv() );
                    recv(scope.scopeOut.blockObsv());
                }
            });
            if(block.out && block.out.blockObsv()){
                self.blockList.splice( self.blockList.indexOf(block.out.blockObsv()), 1 );
                self.blockList.push( block.out.blockObsv() );
                recv(block.out.blockObsv());
            }
        };
        recv(block);
        // zIndexを振りなおします
        var zIndex = 100;
        $.each(self.blockList,function(k,block){
            $(block.element).css({zIndex:zIndex});
            zIndex+=1;
        });
    };
    self.move = function(block,position){
        block.posX(position.left);
        block.posY(position.top );
        self.updatePositionLayout(block);
                   
        self.dropGuideUpdate(block);
    };
    self.moveStop = function(block,position){
        block.posX(position.left);
        block.posY(position.top );
        self.updatePositionLayout(block);
                
        self.dropConnectUpdate(block);
    };

    // ドロップする場所のガイドを更新します
    self.dropGuideUpdate = function(block){

    };
    // ドロップした際の接続の更新を行います
    self.dropConnectUpdate = function(block)
    {        
        var hit = getHitBlock(block);
        if(hit)
        {
            if(hit.valueName){
                hit.hitBlock.connectValueIn(hit.valueName, hit.srcBlock);
            }
            else if(hit.scopeName){
                hit.hitBlock.connectScopeOut(hit.scopeName, hit.srcBlock);
            }
            else if(hit.isSrcIn){
                hit.hitBlock.connectOut(hit.srcBlock);
            }
            else{
                hit.srcBlock.connectOut(hit.hitBlock);
            }
            self.updatePositionLayout(block);
        }
        // zIndexを振りなおします
        var zIndex = 100;
        $.each(self.blockList,function(k,block){
            $(block.element).css({zIndex:zIndex});
            zIndex+=1;
        });
    };


    // ブロック用のカスタムバインド
    ko.bindingHandlers.blockSetup = {
        init: function(element, valueAccessor) {
            var blockIns = ko.unwrap(valueAccessor());
            blockIns.setup(element);
        },
        update: function(element, valueAccessor) {
        }
    };

    ko.bindingHandlers.updateBlockSizeLayout = {
        init: function(element, valueAccessor) {
        },
        update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            //console.log("updateBlockSizeLayout");
             
            var block = ko.utils.unwrapObservable(valueAccessor());
            // ブロック内のデータの通知を受けることを伝えます
            $.each(block.valueDataTbl,function(k,v){
                v();
            });
            $.each(block.valueInTbl,function(k,v){
                v.blockObsv();
            });
            //
            if(block.in){
                block.in.blockObsv();
            }
            // レイアウトします
            var blkConnectorHalfMargin = 0.25 / block.pix2em;
            var blkLocalPosY  = 0;
            var blkSizeW      = 0;
            if(block.in){
                //コネクタの半分のマージンを足します(繋がると一つ分になる想定)
                blkLocalPosY += blkConnectorHalfMargin;
            }
            $(".blockRow",element).each(function(rowIndex,elemR){
                var rowContent = block.rowContents[rowIndex];
                var rowSizeH   = block.minimumRowHeight;
                var blkLocalPosX = 0;
                if(rowContent.expressions)
                {
                    $(".blockCell",elemR).each(function(k,elemCell){
                        var valueln;
                        var dataName = $(elemCell).attr("id");
                        if(dataName)
                        {
                            valueIn = block.valueInTbl[dataName];
                            valueIn.blockLocalX = blkLocalPosX ;
                            valueIn.blockLocalY = blkLocalPosY ;
                            $(".hitAreaValueIn#"+dataName,block.element).css(
                                 {left:blkLocalPosX,
                                  top :blkLocalPosY,}
                            );
                        }
                        $(elemCell).css({left:blkLocalPosX});
                        var cellW = $(elemCell).outerWidth();
                        var cellH = $(elemCell).outerHeight();
                        if(dataName)
                        {
                            valueIn = block.valueInTbl[dataName];
                            var nestValueMargin = 0.2 / block.pix2em;
                            if(valueIn.blockObsv())
                            {
                                cellW = Math.max(cellW, valueIn.blockObsv().blockWidth()  + nestValueMargin);
                                cellH = Math.max(cellH, valueIn.blockObsv().blockHeight() + nestValueMargin);
                            }
                            //cellH += 0.2 / block.pix2em;
                        }
                        blkLocalPosX += cellW;
                        rowSizeH = Math.max(rowSizeH,cellH);
                    });
                    rowContent.rowHeight(rowSizeH);
                }
                else if(rowContent.scopeOut){
                    var scopeBlocksH = 0;
                    var tmpOutBlock = rowContent.scopeOut.blockObsv();
                    while(tmpOutBlock)
                    {
                        scopeBlocksH = scopeBlocksH + tmpOutBlock.blockHeight();
                        if(tmpOutBlock.out && tmpOutBlock.out.blockObsv()){
                            tmpOutBlock = tmpOutBlock.out.blockObsv();
                        }else{
                            tmpOutBlock = null;
                        }
                    }
                    rowSizeH = Math.max( rowSizeH, scopeBlocksH );
                }
                else if(rowContent.space){
                    rowSizeH = Math.max( rowSizeH, 1.0 / block.pix2em );
                }
                rowContent.rowHeight(rowSizeH);
                rowContent.rowBlockLocalY(blkLocalPosY);
                $(elemR).css({
                    top:    blkLocalPosY,
                    height: rowSizeH,
                    width:  blkLocalPosX});
                blkLocalPosY += $(elemR).outerHeight();

                blkSizeW = Math.max(blkSizeW,$(elemR).outerWidth());
            });
            if(block.out){
                blkLocalPosY += blkConnectorHalfMargin;
            }
            $(element).css({height:blkLocalPosY,width:blkSizeW});
            var blkSizeH = blkLocalPosY;
            block.blockHeight(blkSizeH);
            block.blockWidth (blkSizeW);
        }
    };

    // ブロックリスト管理など

    // ブロックを破棄
    self.removeBlock = function(removeBlock){

    };

    // 素材リストに追加
    self.addMaterialBlock = function(newBlock){
        // 素材リスト内はクローンドラッグモード＆接続禁止モードに設定します
        self.blockList.push(newBlock);
        self.materialList.push(ko.observable(newBlock));
        newBlock.setCloneDragMode(true);
        newBlock.setNoConnectMode(true);
    };    
    // オモチャリストに追加
    self.addToyBlock = function(newBlock){
        self.blockList.push(newBlock);
        self.toyList.push(ko.observable(newBlock));
        newBlock.setCloneDragMode(false);
        newBlock.setNoConnectMode(false);
    };
    // 工場リストに追加
    self.addFactoryBlock = function(newBlock){
        self.blockList.push(newBlock);
        self.factoryList.push(ko.observable(newBlock));
        newBlock.setCloneDragMode(false);
        newBlock.setNoConnectMode(false);
    };

    // マテリアルブロックの配置を更新します
    self.materialBlockLayoutUpdate = function(){
        var posX = 10;
        var posY = 20;
        $.each(self.materialList(),function(key,blockInsObsv){
            blockIns = blockInsObsv();
            blockIns.posX(posX);
            blockIns.posY(posY);
            posX += 130;
        });
    };

    // 別ボックスへ移動するためのドラッグ向けのリストに追加
    self.addFloatDraggingList = function(newBlock){
        newBlock.setCloneDragMode(false);
        newBlock.setNoConnectMode(false);
        self.blockList.push(newBlock);
        self.floatDraggingList.push(ko.observable(newBlock));

    };
    self.popFloatDraggingListByElem = function(elem){
        for(var ii=0; ii < self.floatDraggingList().length ; ii+=1)
        {
            var blockObsv = self.floatDraggingList()[ii];
            if($(blockObsv().element).get(0) == $(elem).get(0))
            {
                self.floatDraggingList.splice(ii,1);

                var block = blockObsv();
                self.blockList.splice( self.blockList.indexOf(block), 1 );
                self.blockList.push(block);
                return block;
            }
        }
    };
}

$(function(){
    // -- カスタムバインド --

    function getCharacterOffsetWithin(range, node) {
        var treeWalker = document.createTreeWalker(
            node,
            NodeFilter.SHOW_TEXT,
            function(node) {
                var nodeRange = document.createRange();
                nodeRange.selectNode(node);
                return nodeRange.compareBoundaryPoints(Range.END_TO_END, range) < 1 ?
                    NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            },
            false
        );

        var charCount = 0;
        while (treeWalker.nextNode()) {
            charCount += treeWalker.currentNode.length;
        }
        if (range.startContainer.nodeType == 3) {
            charCount += range.startOffset;
        }
        return charCount;
    }
        
    ko.bindingHandlers.editableText = {
        init: function(element, valueAccessor) {
            $(element).attr("contenteditable","true");
            $(element).on('blur', function() {
                var observable = valueAccessor();
                observable( $(this).text() );
            });
            //TODO:ここらへんのキャレット復帰方法がちゃんとできれば
            //     リアルタイムに伸縮するテキストエリアが実現できる
            //$(element).on('input', function() {
            //var range = window.getSelection().getRangeAt(0);
            //var s = range.startOffset;
            //var e = range.endOffset;
            //var sc = range.startContainer;
            //})
            //var range2 = window.getSelection().getRangeAt(0);
            //range2.setStart(sc, s);
            //range2.setEnd(sc, e);
            //var sel = window.getSelection();
            //sel.removeAllRanges();
            //sel.addRange(range2);
            //});
        },
        update: function(element, valueAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            $(element).text(value);
        }
    };

    // -- MVVMのモデル(このアプリの中枢です) --
    function MyModel() {
        var self = this;

        // ■ 接続処理 ■
        self.ipXXX_000_000_000 = ko.observable(192);
        self.ip000_XXX_000_000 = ko.observable(168);
        self.ip000_000_XXX_000 = ko.observable(1);
        self.ip000_000_000_XXX = ko.observable(2);

        var pepper_ip = JSON.parse(localStorage.getItem("pepper_ip"));
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
            localStorage.setItem("pepper_ip",JSON.stringify(pepper_ip));
        }
        var updatePepperIp = function(){
            pepper_ip.ip[0] = self.ipXXX_000_000_000();
            pepper_ip.ip[1] = self.ip000_XXX_000_000();
            pepper_ip.ip[2] = self.ip000_000_XXX_000();
            pepper_ip.ip[3] = self.ip000_000_000_XXX();
            localStorage.setItem("pepper_ip",JSON.stringify(pepper_ip));
        }
        self.ipXXX_000_000_000.subscribe(updatePepperIp);
        self.ip000_XXX_000_000.subscribe(updatePepperIp);
        self.ip000_000_XXX_000.subscribe(updatePepperIp);
        self.ip000_000_000_XXX.subscribe(updatePepperIp);

        self.nowState = ko.observable("未接続");

        var setupIns_ = function(){
            self.qims.service("ALTextToSpeech").done(function(ins){
              self.alTextToSpeech = ins;
            });
            self.qims.service("ALAudioDevice").done(function(ins){
              self.alAudioDevice = ins;
            });
            self.qims.service("ALMotion").done(function(ins){
              self.alMotion = ins;
            });
            self.qims.service("ALRobotPosture").done(function(ins){
              self.alRobotPosture = ins;
            });
            self.qims.service("ALVideoDevice").done(function(ins){
              self.alVideoDevice = ins;
              self.cameraIns = new Camera(self.alVideoDevice);
            });  
        };
        self.qims = null;
        self.connect = function() 
        {
            var ip = 
            self.ipXXX_000_000_000() + "." +
            self.ip000_XXX_000_000() + "." +
            self.ip000_000_XXX_000() + "." +
            self.ip000_000_000_XXX();
            self.qims = new QiSession(ip);
            self.qims.socket()
            .on('connect', function () {
              self.nowState("接続中");
              self.qims.service("ALTextToSpeech")
              .done(function (tts) {
                  tts.say("せつぞく、ぺっぷ");
              });
              setupIns_();
            })
            .on('disconnect', function () {
              self.nowState("切断");
            });
        };

        //■ ＵＩ関連の準備など ■

        self.wakeupPepper = function(){
          if(self.qims){
              self.qims.service("ALMotion")
              .then(function(alMotion){
                  return alMotion.wakeUp();
              });
          }
        };
        self.restPepper = function(){
          if(self.qims){
              self.qims.service("ALMotion")
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

        //■ 各作業場の作成 ■
        var dropAction_ = function(ui, targetArea, addFunc){
            var findBlock = self.blockManager.popFloatDraggingListByElem( ui.helper.get(0) );
            var dropBlock = findBlock.cloneThisBlock();
            addFunc(dropBlock);//TODO:リストを汎用化する
            var areaOffset = $(targetArea).offset();
            var scrollTop  = $(targetArea).scrollTop();
            var scrollLeft = $(targetArea).scrollLeft();
            dropBlock.posX(ui.offset.left - areaOffset.left + scrollLeft);
            dropBlock.posY(ui.offset.top  - areaOffset.top  + scrollTop);
            self.blockManager.dropConnectUpdate( dropBlock );
        };
        $(".materialBox").droppable({
            scope: 'toMaterialBlock',
        });
        $(".toyBox").droppable({
            scope: 'toCloneBlock',
            drop: function(e, ui) {
                dropAction_(ui,$(".toyBox"),self.blockManager.addToyBlock);
            },
        });
        $(".factoryBox").droppable({
            scope: 'toCloneBlock',
            drop: function(e, ui) {
                dropAction_(ui,$(".factoryBox"),self.blockManager.addFactoryBlock);
            },
        });


        //■ ブロック管理を作成 ■
        self.blockManager = new BlockManager();

        //■ ブロックの実装(後でソース自体を適度に分離予定) ■

        // 会話ブロック
        self.blockManager.addMaterialBlock(new Block(
          self.blockManager,
          {
              blockOpt:{color:'red',head:'in',tail:'out'},
              blockContents:[
                  {expressions:[
                      {string:{default:"こんにちわ"},dataName:'talkText0',},
                      {label:'と　しゃべる'},
                  ]},
              ],
          },
          function(valueDataTbl){
              if(self.qims){
                  return self.qims.service("ALTextToSpeech").then(function(ins){
                      return ins.say(valueDataTbl.talkText0());
                  });
              }
              else{
                  var dfd = $.Deferred();
                  dfd.reject();
                  return dfd.promise();
              }
          }
        ));
        // 文字列連結ブロック
        self.blockManager.addMaterialBlock(new Block(
          self.blockManager,
          {
              blockOpt:{color:'orange',head:'value',tail:'value'},
              blockContents:[
                  {expressions:[
                      {string:{default:"AAAA"},dataName:'text0',},
                      {label:'と'},
                      {string:{default:"BBBB"},dataName:'text1',},
                  ]},
              ],
          },
          function(valueDataTbl){
              var dfd = $.Deferred();
              var output = valueDataTbl.text0() + valueDataTbl.text1();
              dfd.resolve(output);
              return dfd.promise();
          }
        ));
        // 分岐ブロック
        self.blockManager.addMaterialBlock(new Block(
          self.blockManager,
          {
              blockOpt:{color:'red',head:'in',tail:'out'},
              blockContents:[
                  {expressions:[
                      {label:'もし'},
                      {bool:{default:false},dataName:'checkFlag0',},
                      {label:'なら'},
                  ]},
                  {scope:{scopeName:"scope0"}},
                  {space:{}},
              ],
          },
          function(valueDataTbl,scopeTbl){
              if(valueDataTbl.checkFlag0()){
                  //HACK: scopeOutが微妙なのでなんとかしたい。
                  if(scopeTbl.scope0.scopeOut.blockObsv())
                  {
                      // スコープの先頭ブロックからpromiseを返します
                      // (ブロックの返すpromissは自身と繋がるフローが全部進めるときにresolveになります)
                      return scopeTbl.scope0.scopeOut.blockObsv().deferred();
                  }
              }
              //分岐なかったので即resolveするpromiseを返します
              return $.Deferred(function(dfd){
                  dfd.resolve();
              });
          }
        ));
        // ループブロック
        self.blockManager.addMaterialBlock(new Block(
          self.blockManager,
          {
              blockOpt:{color:'red',head:'in',tail:'out'},
              blockContents:[
                  {expressions:[
                      //{label:'ずっと繰り返す'}
                      {label:'しばらく繰り返す'}
                  ]},
                  {scope:{scopeName:"scope0"}},
                  {space:{}},
              ],
          },
          function(valueDataTbl,scopeTbl){
              // スコープの先頭ブロックからpromiseを返します
              // (ブロックの返すpromissは自身と繋がるフローが全部進めるときにresolveになります)
              var dfd = $.Deferred();
              if(scopeTbl.scope0.scopeOut.blockObsv())
              {
                  //無限ループ停止がまだ実装できてないのでひとまずこれで対処
                  var cnt = 99;
                  var loopFunc = function(){
                      console.log("loop " + cnt);
                      if(cnt-->0){
                         dfd
                         .then(scopeTbl.scope0.scopeOut.blockObsv().deferred)
                         .then(loopFunc);
                         return dfd.promise();
                      }
                  }
                  dfd.then(loopFunc);
              }
              dfd.resolve();
              return dfd.promise();
          }
        ));

        // Ｎ秒まつブロック
        self.blockManager.addMaterialBlock(new Block(
          self.blockManager,
          {
              blockOpt:{color:'red',head:'in',tail:'out'},
              blockContents:[
                  {expressions:[
                      {string:{default:'1.0'}, dataName:'waitSec',},
                      {label:'秒 まつ'},
                  ]}
              ],
          },
          function(valueDataTbl,scopeTbl){
              var time = valueDataTbl["waitSec"]();
              var wait_time =  function(time){
                  return (function(){
                      var dfd = $.Deferred()
                      setTimeout(function(){  console.log("resolve#wait_time("+time+") ");dfd.resolve(); }, time*1000);
                      return dfd.promise()
                  })
              };              
              return wait_time(parseFloat(time))();
          }
        ));
        
        // モーションブロック
        self.blockManager.addMaterialBlock(new Block(
          self.blockManager,
          {
              blockOpt:{color:'red',head:'in',tail:'out'},
              blockContents:[
                  {expressions:[
                      //{string:{default:'正面'}, dataName:'angle',},
                      {options:{default:'正面',
                                list:[{text:"正面",value:"正面"},
                                      {text:"右",value:"右"},
                                      {text:"左",value:"左"},
                                      {text:"上",value:"上"},
                                      {text:"下",value:"下"},
                                     ]}, 
                       dataName:'angle',
                      },
                      {label:'に顔を向ける'},
                  ]}
              ],
          },
          function(valueDataTbl,scopeTbl){
              var onFail = function(e) {console.error('fail:' + e);};
              var ratio_x = 0.5;
              var ratio_y = 0.5;
              var name = ['HeadYaw', 'HeadPitch'];
              var DELAY = 0.5;

              switch(valueDataTbl.angle()) {
              case '右':
                  ratio_x = 0.25;
                  break;
              case '左':
                  ratio_x = 0.75;
                  break;
              case '正面':
                  ratio_x = 0.5;
                  break;
              case '上':
                  ratio_y = 0.25;
                  break;
              case '下':
                  ratio_y = 0.75;
                  break;
              default:
                  ratio_x = 0.5;
                  break;
              }

              var angYaw   = (2.0857 + 2.0857) * ratio_x + -2.0857;
              var angPitch = (0.6371 + 0.7068) * ratio_y + -0.7068;
              var angle = [angYaw, angPitch];
              var alMotion;
              if(self.qims){
                  return self.qims.service('ALMotion')
//                       .then(function(s){
//                           alMotion = s;
//                           return alMotion.wakeUp();
//                       }, onFail)
                      .then(function(s){
                          alMotion = s;
                          return alMotion.angleInterpolationWithSpeed(name, angle, DELAY).fail(onFail);
                      }, onFail).promise();
              }
              return $.Deferred().reject().promise();
          }
        ));
        // センサーブロック
        self.blockManager.addMaterialBlock(new Block(
          self.blockManager,
          {
              blockOpt:{color:'orange',head:'value',tail:'value'},
              blockContents:[
                  {expressions:[
                      {label:'物が正面にある'}
                  ]}
              ],
          },
          function(valueDataTbl,scopeTbl){
              var dfd = $.Deferred();
              var onFail = function(e) {console.error('fail:' + e);};
              var FRONT_KEY = 'Device/SubDeviceList/Platform/Front/Sonar/Sensor/Value';
              var LIMIT = 0.5;
              if(self.qims){
                  self.qims.service('ALMemory').then(function(s){
                      s.getData(FRONT_KEY).then(function(v){
                          console.log('value:' + v);
                          dfd.resolve(v < LIMIT);
                      }, onFail);
                  }, onFail);
              } else {
                  dfd.reject();
              }
              return dfd.promise();
          }
        ));

        // 音声認識ブロック
        self.blockManager.addMaterialBlock(new Block(
          self.blockManager,
          {
              blockOpt:{color:'orange',head:'value',tail:'value'},
              blockContents:[
                  {expressions:[
                      {string:{default:"はい"},dataName:'recoText',},
                      {label:'と聞こえたら'},
                  ]}
              ],
          },
          function(valueDataTbl,scopeTbl){
              var dfd = $.Deferred();
              var onFail = function(e) {
                  console.error('fail:' + e);};
              var onFailPass = function(e) {
                  console.log('fail:' + e); 
                  return $.Deferred().resolve();};
              if(self.qims){
                  $.when( self.qims.service("ALMemory"),
                          self.qims.service('ALSpeechRecognition')
                  ).then(function(alMemory, asr){
                      var vocabulary = [valueDataTbl["recoText"]()];
                      var resultValue = null;
                      var dfd2 = $.Deferred();
                      dfd2
                      .then( asr.pause.bind(null), onFailPass )
                      .then( asr.setLanguage.bind(null,"Japanese"), onFailPass )
                      .then( asr.unsubscribe.bind(null,"PepperBLockASR"), onFailPass )
                      .then( 
                          function(){},
                          onFailPass
                      )
                      .then( function(){
                          return asr.setVocabulary(vocabulary, true);} ,
                          onFailPass )
                      .then( function(){
                          return asr.subscribe("PepperBLockASR");} ,
                          onFail )
                      .then( function(){
                          console.log('Speech recognition engine started');
                          return $.Deferred(function(newDfd){
                             //タイムアウトを設定します
                             var timeoutID  = setTimeout(function(){
                                console.log("reco->Timeout"); newDfd.resolve(); }, 
                                5.0*1000
                             );
                             alMemory.subscriber("WordRecognized").done(function (subscriber) {
                                  // subscriber.signal is a signal associated to "FrontTactilTouched"
                                  subscriber.signal.connect(function (value) {
                                      if(value[0].length>0)
                                      {
                                          clearTimeout(timeoutID);
                                          console.log("reco->" + value[0] + ":" +value[1]*100 + "%");
                                          newDfd.resolve(value);
                                      }
                                  });
                             })
                             .fail(newDfd.reject);
                          }).promise();
                      })
                      .then(function(value){
                          resultValue = value;
                          return asr.unsubscribe("PepperBLockASR");},
                          onFail )
                      .then(function(){
                          dfd.resolve(resultValue?true:false);
                       });
                      dfd2.resolve();
                      return dfd2.promise();
                  }, onFail);
              } else {
                  dfd.reject();
              }
              return dfd.promise();
          }
        ));
        // 配置を更新します
        self.blockManager.materialBlockLayoutUpdate();
    }
    myModel = new MyModel();
    ko.applyBindings( myModel );
});
