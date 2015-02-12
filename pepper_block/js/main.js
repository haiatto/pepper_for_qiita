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

function PepperCamera(alVideoDevice) {
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
//     'シリアライズで使う世界共通(各言語共通)の重複しない識別子' 
//      たとえば 'talkBlock' 'haiatto.talkBlock' '0x00AABBCCDDEEFF99' とか自由
//   lang
//     'jp' 'en'
//   color
//     'red' '#F88'
//   head
//     'start' 'in' ’value’
//   tail
//     'end' 'out' ’value’
//   types:
//      ["","",...]

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
//   {string:{default:"",},dataName:'dataA', acceptTypes:["string"]},
//   {string:{default:"",},dataName:'dataB', acceptTypes:["*"]},
//   {string:{default:"",},dataName:'dataC'},
//   {options:{default:'',list:[{text:'いち',value:'1'},{text:'に',value:'2'},]},dataName:'dataC'},
// ],
//
//-- データフォーマット --
// {string:""},
// {bool:true},
// {number:123},
// {string_list:["A","B"]},
// {miscABC:{version:,dataA:,dataB:,}},


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
    self.textColor   = ko.observable(self.blockTemplate.blockOpt.textColor||"white");

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
            hitArea:null,
            types: self.blockTemplate.blockOpt.types,
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
                    blockLocalX:ko.observable(0),
                    blockLocalY:ko.observable(0),
                };
                if(dataTemplate.dataName){
                    expression.acceptTypes = dataTemplate.acceptTypes;
                    expression.blockObsv   = ko.observable();
                    expression.hitArea     = null;
                    expression.valueObsv   = ko.observable();
                    self.valueInTbl[dataTemplate.dataName] = expression;
                    self.valueDataTbl[dataTemplate.dataName] = expression.valueObsv;
                    if(dataTemplate.bool)
                    {
                        if(!expression.acceptTypes){
                            //受け入れ型指定が無い場合はデフォルトをセットします
                            expression.acceptTypes = ["bool"];
                        }
                        expression.valueObsv(dataTemplate.bool.default||false);
                    }
                    if(dataTemplate.string)
                    {
                        if(!expression.acceptTypes){
                            //受け入れ型指定が無い場合はデフォルトをセットします
                            expression.acceptTypes = ["string"];//HACK: 何でもありにするかも？
                        }
                        expression.valueObsv(dataTemplate.string.default||"");
                    }
                    if(dataTemplate.number)
                    {
                        if(!expression.acceptTypes){
                            //受け入れ型指定が無い場合はデフォルトをセットします
                            expression.acceptTypes = ["number"];//HACK: 何でもありにするかも？
                        }
                        expression.valueObsv(dataTemplate.number.default||0);
                    }
                    if(dataTemplate.options)
                    {
                        //ここはデフォルトの受け入れ型指定は 無し です
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

    // ■

    // 値用ブロックが指定のデータにつなげられる場合、型名を返します
    self.getTypeAccept = function(tgtDataName,valueBlock){
        if(valueBlock.valueOut && self.valueInTbl[tgtDataName])
        {
            if(!self.valueInTbl[tgtDataName].acceptTypes)
            {
                //受け側の無指定は受け入れ無しという扱いにします
                return null;
            }
            if(!valueBlock.valueOut.types)
            {
               // 渡す側の無指定は、受け側が何でもありの場合のみ受け入れます
               if(self.valueInTbl[tgtDataName].acceptTypes[0]=='*')
               {
                   return '*';
               }
               return null
            }
            var acceptType = null;
            $.each(self.valueInTbl[tgtDataName].acceptTypes,function(k,v){
                if(valueBlock.valueOut.types.indexOf(v)>=0)
                {
                    acceptType = v;
                }
            });
            return acceptType;
        }
    };

    // ■UI関連の処理
    
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
            // http://stackoverflow.com/questions/1125292/how-to-move-cursor-to-end-of-contenteditable-entity/3866442#3866442
            function setEndOfContenteditable_(contentEditableElement)
            {
                var range,selection;
                if(document.createRange)//Firefox, Chrome, Opera, Safari, IE 9+
                {
                    range = document.createRange();//Create a range (a range is a like the selection but invisible)
                    range.selectNodeContents(contentEditableElement);//Select the entire contents of the element with the range
                    range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
                    selection = window.getSelection();//get the selection object (allows you to change selection)
                    selection.removeAllRanges();//remove any selections already made
                    selection.addRange(range);//make the range you have just created the visible selection
                }
                else if(document.selection)//IE 8 and lower
                { 
                    range = document.body.createTextRange();//Create a range (a range is a like the selection but invisible)
                    range.moveToElementText(contentEditableElement);//Select the entire contents of the element with the range
                    range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
                    range.select();//Select the range (make it the visible selection
                }
            }
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
                        setEndOfContenteditable_(editableElm[0]);
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
                  // ドラッグ先のガイド表示をします
                  if(self.in){
                      $(".hitAreaOut").addClass("hitAreaDragging");
                      $(".hitAreaScopeOut").addClass("hitAreaDragging");
                  }
                  if(self.out){
                      $(".hitAreaIn").addClass("hitAreaDragging");
                  }
                  if(self.valueOut)
                  {
                      $(".hitAreaValueIn").each(function(k,elm){
                          var tgtElm = $(elm).parents(".block");
                          var tgtBlock = self.blockManager.elementBlockLookupTbl[$(tgtElm).data("blockId")];
                          var tgtDataName = $(elm).attr("id");
                          if(tgtBlock)
                          {
                              if(tgtBlock.getTypeAccept(tgtDataName,self))
                              {
                                  $(elm).addClass("hitAreaDragging");
                              }
                          }
                      });
                      //$(".hitAreaValueIn").addClass("hitAreaDragging");
                      $(".hitAreaValueOut",ui.helper).addClass("hitAreaDragging");
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

    // ■実行関連の処理
    
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
                    self.callback(self.blockManager.execContext, self.valueDataTbl, self.scopeTbl)
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
                return self.callback(self.blockManager.execContext, self.valueDataTbl, self.scopeTbl)
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

    //■ 接続関連の処理

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
            if(self.valueOut && 
               self.valueOut.block == valueBlock)
            {
                //自身が値タイプで繋いだ先にこれから繋ぐブロックが居る場合クリアします
                self.clearValueOut();
            }

            self.clearValueIn(dataName);
            valueBlock.clearValueOut();

            valueBlock.valueOut.block       = self;
            valueBlock.valueOut.tgtDataName = dataName;
            valueIn.blockObsv(valueBlock);
        }
    };

    // 内側につながるブロックをセットします
    self.connectScopeOut = function(scopeName, block){
        if(!self.scopeTbl[scopeName])
        {
            console.log("error:" + scopeName);
            return;
        }
        var oldConnectOut = self.scopeTbl[scopeName].scopeOut.blockObsv();
        self.clearScopeOut();

        self.scopeTbl[scopeName].scopeOut.blockObsv(block);
        block.in.blockObsv(self);
        block.in.srcScopeName = scopeName;
        
        if(oldConnectOut)
        {
            var bottomBlock = block;
            while(bottomBlock.out && bottomBlock.out.blockObsv()){
                bottomBlock = bottomBlock.out.blockObsv();
            }
            if(bottomBlock.out){
                bottomBlock.connectOut(oldConnectOut);
            }
        }
    };

    // 複製します(内側のブロックは複製されません)
    self.cloneThisBlock = function(){
        var ins = self.blockManager.createBlockIns(self.blockTemplate.blockOpt.blockWorldId);
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

// リファクタリングメモ
// ドロップ先とリストをセットで管理


function BlockManager(){
    var self = this;
    self.blockList = [];
    self.elementBlockLookupTbl = {};
    self.floatDraggingList = ko.observableArray();
    self.materialList = ko.observableArray();
    self.toyList      = ko.observableArray();
    self.factoryList  = ko.observableArray();
    self.execContext  = {};//実行環境(各種グローバルな要素を入れるテーブル)

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
    // 指定のブロックがブロックの塊の中に含まれているかチェックします
    var checkContainLumpBlock = function(checkBlock,lumbBlock)
    {
        // 一番上のブロックを探します
        var topBlock = lumbBlock;
        while(topBlock.valueOut && topBlock.valueOut.block)
        {
            topBlock = topBlock.valueOut.block;
        }
        //通常用ブロックの場合は接続元を辿ります
        while(topBlock.in && topBlock.in.blockObsv())
        {
            topBlock = topBlock.in.blockObsv();
        }
        var bFind = false;
        var recv = function(block){
            if(block == checkBlock){
                bFind = true;
                return;
            }
            if(block.valueInTbl){
               $.each(block.valueInTbl,function(k,valueIn){
                   if(valueIn.blockObsv()){
                       recv(valueIn.blockObsv());
                   }
               });
            }
            if(block.out && block.out.blockObsv()){
                recv(block.out.blockObsv());
            }
        };
        recv(topBlock);
        return bFind;
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
                        if(tgtBlock.valueInTbl[name].blockObsv())
                        {
                            //値ブロックの場合接続済みな場合は無視します
                            //(上に乗っかったものでUIが塞がっているので)
                            return;
                        }
                        if(checkContainLumpBlock(valueBlock, tgtBlock))
                        {
                            //自身が接続しているブロックの塊内は無視します
                            return;
                        }
                        if(tgtBlock.getTypeAccept(name,valueBlock))
                        {
                            nearDist = dist;
                            hitBlock = tgtBlock;
                            srcBlock = valueBlock;
                            isSrcIn  = false;
                            valueName = name;
                            scopeName = null;
                        }
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
                        blockA.posX() + valueIn.blockLocalX()
                    );
                    blockB.posY(
                        blockA.posY() + valueIn.blockLocalY()
                    );
                    recv(valueIn.blockObsv());
                }
            });
            $.each(block.scopeTbl,function(k,scope){
                if(scope.scopeOut.blockObsv()){
                    var blockA = block;
                    var blockB = scope.scopeOut.blockObsv();
                    var blkConnectorHalfMargin = 0.25 / block.pix2em;
                    blockB.posY(
                        blockA.posY() + scope.rowBlockLocalY() + blkConnectorHalfMargin
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
    var blockIdSeed_ = 1;
    ko.bindingHandlers.blockSetup = {
        init: function(element, valueAccessor) {
            // ユーザーデータにIDを付加します
            $(element).data("blockId",blockIdSeed_++);
            // ブロックの要素生成時の初期化を行います
            var blockIns = ko.unwrap(valueAccessor());
            blockIns.setup(element);
            // ブロックを要素から引くためにテーブルに追加します
            self.elementBlockLookupTbl[$(element).data("blockId")] = blockIns;
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
                var cellXMargin = 0.10 / block.pix2em;
                var blkLocalPosX = 0;
                if(rowContent.expressions)
                {
                    $(".blockCell",elemR).each(function(k,elemCell){
                        
                        if(k!=0){
                            blkLocalPosX += cellXMargin;
                        }
                        var valueln;
                        var dataName = $(elemCell).attr("id");
                        if(dataName)
                        {
                            valueIn = block.valueInTbl[dataName];
                            valueIn.blockLocalX( blkLocalPosX );
                            valueIn.blockLocalY( blkLocalPosY );
                            $(".hitAreaValueIn#"+dataName,block.element).
                            css(
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
                            var nestValueMargin = 0.20 / block.pix2em;
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
                    //上辺の出力コネクタ用のマージンを加えます
                    scopeBlocksH += blkConnectorHalfMargin;
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

    // ■ブロック生成元登録など
    self.blockDefTbl = {};

    // ブロック定義の登録をしますテンプレートとコールバックの登録
    self.registBlockDef = function(blockTemplate, callback){
        if(!blockTemplate.blockOpt.blockWorldId){
            alert("テンプレートにblockWorldIdがありません。"+JSON.stringify(blockTemplate));
            return;
        }
        if(self.blockDefTbl[blockTemplate.blockOpt.blockWorldId]){
            //TODO:多言語対応時には重なる事あり
            alert("定義登録でblockWorldIdが重なりました。id:"+blockTemplate.blockOpt.blockWorldId);
            return;
        }
        self.blockDefTbl[blockTemplate.blockOpt.blockWorldId] = {
            blockTemplate:blockTemplate, 
            callback:     callback,
        };
    };

    // ブロックの世界対応IDからブロックのインスタンスを作ります
    self.createBlockIns = function(blockWorldId){
        var blockDef = self.blockDefTbl[blockWorldId];
        if(!blockDef){
            alert("blockWorldIdに一致する定義がありません。id:"+blockWorldId);
            return;
        }
        var newBlockIns = new Block(self, blockDef.blockTemplate, blockDef.callback);
        self.blockList.push(newBlockIns);
        return newBlockIns;
    };

    // ■ブロックリスト管理など

    // ブロックを破棄
    self.removeBlock = function(removeBlock){

    };

    // 素材リストに追加 TODO: 後でリスト汎用化
    self.addMaterialBlock = function(newBlock){
        // 素材リスト内はクローンドラッグモード＆接続禁止モードに設定します
        //self.blockList.push(newBlock);
        self.materialList.push(ko.observable(newBlock));
        newBlock.setCloneDragMode(true);
        newBlock.setNoConnectMode(true);
    };    
    // オモチャリストに追加
    self.addToyBlock = function(newBlock){
        //self.blockList.push(newBlock);
        self.toyList.push(ko.observable(newBlock));
        newBlock.setCloneDragMode(false);
        newBlock.setNoConnectMode(false);
    };
    // 工場リストに追加
    self.addFactoryBlock = function(newBlock){
        //self.blockList.push(newBlock);
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
        //self.blockList.push(newBlock);
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
                //描画順入れ替えは別でやることにしました
                //self.blockList.splice( self.blockList.indexOf(block), 1 );
                //self.blockList.push(block);
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

        //■ 各作業場の作成(TODO:あとでブロック管理にうつす) ■
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

        //■ 実行環境を構築(ブロックのコールバックが使えるグローバル環境です) ■
        var makeExecContext = function()
        {
            var exeContext = {};
            // バージョン
            exeContext.contextVersion = "0.01";

            // 最後に認識した単語データ
            exeContext.lastRecoData   = {rawData:null,};

            // qiMessaging経由のインスタンス   
            exeContext.setupExecContextFromQim = function(qims)
            {
                exeContext.qims      = qims;
                exeContext.alIns     = {};
                exeContext.cameraIns = null;
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
                  exeContext.pepperCameraIns = new PepperCamera(ins);
                });
                exeContext.qims.service('ALMemory').then(function(ins){
                  exeContext.alIns.alMemory = ins;
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

            return exeContext;
        }
        self.blockManager.execContext = makeExecContext();


        // ■ 接続処理 ■

        // IP入力部分
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

        // 接続部分
        self.nowState = ko.observable("未接続");
        self.connect = function() 
        {
            var pepper_ip = JSON.parse(localStorage.getItem("pepper_ip"));
            var ip = 
            pepper_ip.ip[0] + "." +
            pepper_ip.ip[1] + "." +
            pepper_ip.ip[2] + "." +
            pepper_ip.ip[3];
            var qims = new QiSession(ip);
            qims.socket()
            .on('connect', function () {
              self.nowState("接続中");              
              qims.service("ALTextToSpeech")
              .done(function (tts) {
                  tts.say("せつぞく、ぺっぷ");
              });
              self.blockManager.execContext.setupExecContextFromQim(qims);
            })
            .on('disconnect', function () {
              self.nowState("切断");
            });
        };







        //■ ブロックの実装(後でソース自体を適度に分離予定) ■

        // 会話ブロック
        self.blockManager.registBlockDef(
          {
              blockOpt:{
                  blockWorldId:"talkBlock@basicBlk",
                  color:'red',
                  head:'in',
                  tail:'out'
              },
              blockContents:[
                  {expressions:[
                      {string:{default:"こんにちわ"},dataName:'talkText0'},
                      {label:'と　しゃべる'},
                  ]},
              ],
          },
          function(ctx,valueDataTbl){
              var onFail = function(e) {console.error('fail:' + e);};
              if(ctx.qims){
                  var dfd = $.Deferred();
                  ctx.qims.service("ALTextToSpeech").then(function(tss){
                      ctx.alIns.alMemory.subscriber("ALTextToSpeech/TextDone")
                      //deferred不慣れで勘違いした結果のコード。ここでは不要だったけど参考のため残してきます
                      //.then(
                      //    function (subscriber) {
                      //        var id = null;
                      //        return subscriber.signal.connect(
                      //            function (value) 
                      //            {
                      //                //ALMemoryのイベントハンドラです(deferredのハンドラではないので混乱注意)
                      //                subscriber.signal.disconnect(id);
                      //                id = null;
                      //                dfd.resolve();
                      //            }
                      //        )
                      //        .then(function(id_){
                      //            id = id_;
                      //        });
                      //    }
                      //)
                      .then(
                         function(){
                             tss.say(valueDataTbl.talkText0()).done(function()
                             {
                                 dfd.resolve();
                             });
                         }
                      );
                  },onFail);
                  return dfd.promise();
              }
              else{
                  var dfd = $.Deferred();
                  dfd.reject();
                  return dfd.promise();
              }
          }
        );
        // 文字列連結ブロック
        self.blockManager.registBlockDef(
          {
              blockOpt:{
                  blockWorldId:"stringCat@basicBlk",
                  color:'orange',
                  head:'value',
                  tail:'value',
                  types:["string"]
              },
              blockContents:[
                  {expressions:[
                      {string:{default:"あい"},dataName:'text0',acceptTypes:["string"]},
                      {label:'と'},
                      {string:{default:"うえお"},dataName:'text1',acceptTypes:["string"]},
                  ]},
              ],
          },
          function(ctx,valueDataTbl){
              var dfd = $.Deferred();
              var output = valueDataTbl.text0() + valueDataTbl.text1();
              dfd.resolve(output);
              return dfd.promise();
          }
        );
        // 文字列リストブロック
        self.blockManager.registBlockDef(
          {
              blockOpt:{
                  blockWorldId:"stringLst@basicBlk",
                  color:'orange',
                  head:'value',
                  tail:'value',
                  types:["string_list"]
              },
              blockContents:[
                  {expressions:[
                      {string:{default:"ひとつ"},dataName:'text0',acceptTypes:["string","string_list"]},
                      {label:'とか'},
                      {string:{default:"ふたつ"},dataName:'text1',acceptTypes:["string","string_list"]},
                  ]},
              ],
          },
          function(ctx,valueDataTbl){
              var dfd = $.Deferred();
              var output = {
                  string_list:[],
              };
              var txtLst=[valueDataTbl.text0(), valueDataTbl.text1()];
              for(var ii=0; ii < txtLst.length; ii++){
                  if(!txtLst[ii]){
                      continue;
                  }
                  if(txtLst[ii].string_list){
                      output.string_list =
                       output.string_list.concat(txtLst[ii].string_list);
                  }
                  else{
                      output.string_list.push(txtLst[ii]);
                  }
              }
              dfd.resolve(output);
              return dfd.promise();
          }
        );
        // 分岐ブロックIF
        self.blockManager.registBlockDef(
          {
              blockOpt:{
                  blockWorldId:"if@basicBlk",
                  color:'red',
                  head:'in',
                  tail:'out'
              },
              blockContents:[
                  {expressions:[
                      {label:'もし'},
                      {bool:{default:false},dataName:'checkFlag0'},
                      {label:'なら'},
                  ]},
                  {scope:{scopeName:"scope0"}},
                  {space:{}},
              ],
          },
          function(ctx,valueDataTbl,scopeTbl){
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
        );
        // 分岐ブロックIF ELSE
        self.blockManager.registBlockDef(
          {
              blockOpt:{
                  blockWorldId:"if_else@basicBlk",
                  color:'red',
                  head:'in',
                  tail:'out'
              },
              blockContents:[
                  {expressions:[
                      {label:'もし'},
                      {bool:{default:false},dataName:'checkFlag0'},
                      {label:'なら'},
                  ]},
                  {scope:{scopeName:"scope0"}},
                  {expressions:[
                      {label:'でなければ'},
                  ]},
                  {scope:{scopeName:"scope1"}},
                  {space:{}},
              ],
          },
          function(ctx,valueDataTbl,scopeTbl){
              if(valueDataTbl.checkFlag0()){
                  //HACK: scopeOutが微妙なのでなんとかしたい。
                  if(scopeTbl.scope0.scopeOut.blockObsv())
                  {
                      // スコープの先頭ブロックからpromiseを返します
                      // (ブロックの返すpromissは自身と繋がるフローが全部進めるときにresolveになります)
                      return scopeTbl.scope0.scopeOut.blockObsv().deferred();
                  }
              }else
              {
                  if(scopeTbl.scope1.scopeOut.blockObsv())
                  {
                      // スコープの先頭ブロックからpromiseを返します
                      // (ブロックの返すpromissは自身と繋がるフローが全部進めるときにresolveになります)
                      return scopeTbl.scope1.scopeOut.blockObsv().deferred();
                  }
              }
              //分岐先なかったので即resolveするpromiseを返します
              return $.Deferred(function(dfd){
                  dfd.resolve();
              });
          }
        );
        // ループブロック
        self.blockManager.registBlockDef(
          {
              blockOpt:{
                  blockWorldId:"loop@basicBlk",
                  color:'red',
                  head:'in',
                  tail:'out'
              },
              blockContents:[
                  {expressions:[
                      //{label:'ずっと繰り返す'}
                      {label:'しばらく繰り返す'}
                  ]},
                  {scope:{scopeName:"scope0"}},
                  {space:{}},
              ],
          },
          function(ctx,valueDataTbl,scopeTbl){
              // スコープの先頭ブロックからpromiseを返します
              // (ブロックの返すpromissは自身と繋がるフローが全部進めるときにresolveになります)
              var dfd = $.Deferred();
              if(scopeTbl.scope0.scopeOut.blockObsv())
              {
                  //無限ループ停止がまだ実装できてないのでひとまずこれで対処
                  var cnt = 99;
                  var loopFunc = function(){
                      console.log("loop " + cnt);
                      // 実行中にブロック外された場合もあるので毎回接続をチェックします
                      if(cnt-->0 && scopeTbl.scope0.scopeOut.blockObsv()){
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
        );

        // 等しいか判定
        self.blockManager.registBlockDef(
          {
              blockOpt:{
                  blockWorldId:"eq@basicBlk",
                  color:'orange',
                  head:'value',
                  tail:'value',
                  types:["bool"],
              },
              blockContents:[
                  {expressions:[
                      {string:{default:'A'}, dataName:'valueA',acceptTypes:["string","number"]},
                      {label:'と'},
                      {string:{default:'B'}, dataName:'valueB',acceptTypes:["string","number"]},
                      {label:'が同じ'},
                  ]}
              ],
          },
          function(ctx,valueDataTbl,scopeTbl){
              var dfd = $.Deferred();
              var a = valueDataTbl["valueA"]();
              var b = valueDataTbl["valueB"]();
              dfd.resolve(a==b);
              return dfd.promise();
          }
        );

        // Ｎ秒まつブロック
        self.blockManager.registBlockDef(
          {
              blockOpt:{
                  blockWorldId:"waitNSec@basicBlk",
                  color:'red',
                  head:'in',
                  tail:'out'
              },
              blockContents:[
                  {expressions:[
                      {string:{default:'1.0'}, dataName:'waitSec',},
                      {label:'秒 まつ'},
                  ]}
              ],
          },
          function(ctx,valueDataTbl,scopeTbl){
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
        );
        
        // 顔を動かすモーションブロック
        self.blockManager.registBlockDef(
          {
              blockOpt:{
                  blockWorldId:"faceMotion@basicBlk",
                  color:'red',
                  head:'in',
                  tail:'out'
              },
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
          function(ctx,valueDataTbl,scopeTbl){
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
              if(ctx.qims){
                  return ctx.qims.service('ALMotion')
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
        );

        // ソナーセンサーブロック
        self.blockManager.registBlockDef(
          {
              blockOpt:{
                  blockWorldId:"sonarSimple@basicBlk",
                  color:'orange',
                  head:'value',
                  tail:'value',
                  types:["bool"],
              },
              blockContents:[
                  {expressions:[
                      {label:'物が正面にある'}
                  ]}
              ],
          },
          function(ctx,valueDataTbl,scopeTbl){
              var dfd = $.Deferred();
              var onFail = function(e) {console.error('fail:' + e);};
              var FRONT_KEY = 'Device/SubDeviceList/Platform/Front/Sonar/Sensor/Value';
              var LIMIT = 0.5;
              if(ctx.qims){
                  ctx.qims.service('ALMemory').then(function(s){
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
        );

        // 音声認識ブロック
        self.blockManager.registBlockDef(
          {
              blockOpt:{
                  blockWorldId:"recoTalk@basicBlk",
                  color:'orange',
                  head:'value',
                  tail:'value',
                  types:["bool"],
              },
              blockContents:[
                  {expressions:[
                      {label:'５秒内に'},
                      {string:{default:"はい"},
                       dataName:'recoText',
                       acceptTypes:["string","string_list"]
                      },
                      {label:'と聞こえたら'},
                  ]}
              ],
          },
          function(ctx,valueDataTbl,scopeTbl){
              var dfd = $.Deferred();
              var onFail = function(e) {
                  console.error('fail:' + e);};
              var onFailPass = function(e) {
                  console.log('fail:' + e); 
                  return $.Deferred().resolve();};
              var recoTextVal = valueDataTbl["recoText"]();
              var recoTextLst = [];
              if(recoTextVal.string_list){
                  recoTextLst = recoTextVal.string_list;
              }
              else{
                  recoTextLst.push(recoTextVal);
              }
              if(ctx.qims){
                  $.when( ctx.qims.service("ALMemory"),
                          ctx.qims.service('ALSpeechRecognition')
                  ).then(function(alMemory, asr){
                      var vocabulary = recoTextLst;
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
                          if(resultValue)
                          {
                              ctx.lastRecoData.rawData = resultValue;
                          }
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
        );

        // 最後に聞こえた言葉
        self.blockManager.registBlockDef(
          {
              blockOpt:{
                  blockWorldId:"lastRecoWord@basicBlk",
                  color:'orange',
                  head:'value',
                  tail:'value',
                  types:["string"],
              },
              blockContents:[
                  {expressions:[
                      {label:'さいごに聞こえた言葉'}
                  ]}
              ],
          },
          function(ctx,valueDataTbl,scopeTbl){
              var dfd = $.Deferred();
              if(ctx.lastRecoData.rawData)
              {
                  //<...> ろん <...>などの文字列できたので対処
                  var text = ctx.lastRecoData.rawData[0];
                  text = text.replace("<...> ","");
                  text = text.replace(" <...>","");
                  dfd.resolve(text);
              }
              else
              {
                  dfd.resolve("");
              }
              return dfd.promise();
          }
        );

        // 時刻を返すブロック
        self.blockManager.registBlockDef(
          {
              blockOpt:{
                  blockWorldId:"nowTime@basicBlk",
                  color:'orange',
                  head:'value',
                  tail:'value',
                  types:["string"],
              },
              blockContents:[
                  {expressions:[
                      {label:'いまの時間'}
                  ]}
              ],
          },
          function(ctx,valueDataTbl,scopeTbl){
              var dfd = $.Deferred();
              var date = new Date();
              var h = date.getHours();
              var m = date.getMinutes();
              dfd.resolve(h+"時"+m+"分");
              return dfd.promise();
          }
        );

        // 素材リスト生成をします
        self.blockManager.addMaterialBlock(self.blockManager.createBlockIns("talkBlock@basicBlk"));
        self.blockManager.addMaterialBlock(self.blockManager.createBlockIns("stringCat@basicBlk"));
        self.blockManager.addMaterialBlock(self.blockManager.createBlockIns("stringLst@basicBlk"));
        self.blockManager.addMaterialBlock(self.blockManager.createBlockIns("if@basicBlk"));
        self.blockManager.addMaterialBlock(self.blockManager.createBlockIns("if_else@basicBlk"));
        self.blockManager.addMaterialBlock(self.blockManager.createBlockIns("loop@basicBlk"));
        self.blockManager.addMaterialBlock(self.blockManager.createBlockIns("eq@basicBlk"));
        self.blockManager.addMaterialBlock(self.blockManager.createBlockIns("waitNSec@basicBlk"));
        self.blockManager.addMaterialBlock(self.blockManager.createBlockIns("faceMotion@basicBlk"));
        self.blockManager.addMaterialBlock(self.blockManager.createBlockIns("sonarSimple@basicBlk"));
        self.blockManager.addMaterialBlock(self.blockManager.createBlockIns("recoTalk@basicBlk"));
        self.blockManager.addMaterialBlock(self.blockManager.createBlockIns("lastRecoWord@basicBlk"));
        self.blockManager.addMaterialBlock(self.blockManager.createBlockIns("nowTime@basicBlk"));

        // 素材リストの配置を更新します
        self.blockManager.materialBlockLayoutUpdate();
    }
    myModel = new MyModel();
    ko.applyBindings( myModel );
});
