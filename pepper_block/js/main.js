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
//         {space:{}},
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
//   {string:{dataName:'dataA'}},
//   {string:{dataName:'dataB'}},
//   {options:{dataName:'',list:{'いち':'1','に':'2',}}},
// ],

//■■■■■ 多言語対応案 ■■■■■ 
//  blockWorldId と lang で多言語対応
//  expressions の中身は言語によって順番やラベル数まで変わる可能性ありそう
//  
//==============================

function Block(blockManager, blockTemplate, callback) {
    var self = this;

    // どちらかというとプライベートな部分
    self.blockManager  = blockManager;
    self.blockTemplate = JSON.parse(JSON.stringify(blockTemplate));
    self.callback      = callback;

    self.blockDataTbl = {};
    self.scopeTbl = {};

    // どちらかというとViewModel的な部分
    self.element = null;

    self.pix2em      = 1;
    self.blockWidth  = ko.observable(1);
    self.blockHeight = ko.observable(0);
    self.posX        = ko.observable(0);
    self.posY        = ko.observable(0);

    // ブロックテンプレからの準備
    if(self.blockTemplate.blockOpt.head == 'value')
    {
        //値扱いのブロック
        self.value = {block:null, dataName:null, hitArea:null};
    }
    else{
        if(self.blockTemplate.blockOpt.head == 'in')
        {
            self.blockHeight(self.blockHeight()+0.5);
            self.in = {block:null, hitArea:null};
        }
        if(self.blockTemplate.blockOpt.tail == 'out')
        {        
            self.blockHeight(self.blockHeight()+0.5);
            self.out= {block:null, hitArea:null};
        }
    }
    
    self.scopeTbl = {};
    for(var ii=0; ii < self.blockTemplate.blockContents.length ; ii+=1)
    {
        if(self.blockTemplate.blockContents[ii].expressions)
        {
            self.blockHeight(self.blockHeight()+2);
        }
        if(self.blockTemplate.blockContents[ii].scope)
        {
            self.blockHeight(self.blockHeight()+2);
        }
        if(self.blockTemplate.blockContents[ii].space)
        {
            self.blockHeight(self.blockHeight()+2);
        }

        if(self.blockTemplate.blockContents[ii].expressions)
        {
            $.each(self.blockTemplate.blockContents[ii].expressions,function(key,data){
                if(data.bool)
                {
                    self.blockDataTbl[data.bool.dataName] = ko.observable(false);
                }
                if(data.string)
                {
                    self.blockDataTbl[data.string.dataName] = ko.observable(data.string.default||"");
                }
                if(data.number)
                {
                    self.blockDataTbl[data.number.dataName] = ko.observable(0);
                }
                if(data.options)
                {
                    self.blockDataTbl[data.options.dataName] = ko.observable("");
                }
                if(data.scope)
                {
                    self.scopeTbl[data.scope.scopeName] = {
                        block:null, hitArea:null,
                    };
                }
            });
        }
    }
    // 要素関連のセットアップ
    self.setup = function(element){
        self.element = element;
        self.pix2em  = 1.0 / $('#pix2em').outerHeight();
        if(self.in)
        {
            self.in.hitArea = $(".hitAreaIn", element);
        }
        if(self.out)
        {
            self.out.hitArea = $(".hitAreaOut", element);
        }
        $.each(self.scopeTbl, function(k,v){
            v.hitArea = $(".hitAreaScopeOut#"+k, element);
        });
        //self.hitAreaValueList=$(".hitAreaValue",element);


        //TODO:押して少し経ったら編集モード、その間に動かされたらドラッグモードが良いはず
        var draggableDiv =$(self.element)
          .draggable({
              start:function(event, ui){
                  self.blockManager.moveStart(self, ui.position);
              },
              drag:function(event, ui){
                  self.blockManager.move(self, ui.position);
              },
              stop:function(event, ui){
                  self.blockManager.moveStop(self, ui.position);
              },
          })
          .dblclick(function(){
              self.deferred();
          });

        $('.string', draggableDiv).mousedown(function(ev) {
            draggableDiv.draggable('disable');
        }).mouseup(function(ev) {
            draggableDiv.draggable('enable');
        });
    }

    // Deferred の promise作って返します
    self.deferred = function()
    {
        //out部分のみここで繋ぎます(スコープ以下はコールバック内でやります)
        if(self.out && self.out.block){
            return self.callback(self.blockDataTbl, self.scopeTbl).then(
                self.out.block.deferred
            );
        }
        else{
            return self.callback(self.blockDataTbl, self.scopeTbl);
        }
    };

    self.clearOut = function()
    {
        if(self.out && self.out.block)
        {
            self.out.block.in.block = null;
            self.out.block = null;
        }
    }
    self.clearIn = function()
    {    
        if(self.in && self.in.block)
        {
            self.in.block.out.block = null;
            self.in.block = null;
        }
    }

    // 外側のつながるブロックを追加します
    self.connectOut = function(block){
        self.clearOut();
        block.clearIn();
        self.out.block = block;
        self.out.block.in.block = self;
    };

    // 内側のブロックをセットします
    self.connectScopeBlock = function(scopeName, block){
        if(null==self.scopeTbl[scopeName])
        {
            console.log("error:" + scopeName);
            return;
        }
        if(self.scopeTbl[scopeName].block)
        {
            self.scopeTbl[scopeName].block.in.block = null;
        }
        self.scopeTbl[scopeName].block = block;
        block.in.block = self;
    };

    // 複製します(内側のブロックは複製されません)
    self.cloneThisBlock = function(){
        var ins = new Block(self.blockManager, self.blockTemplate, self.callback);
        $.each(self.blockDataTbl,function(key,value){
            ins.blockDataTbl[key](value());
        });
        return ins;
    };

    // 管理に追加
    self.blockManager.addList(self);
}

function BlockManager(){
    var self = this;
    self.blockList = [];

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
        // 入出力ブロックを取り出します
        var inBlock  = null;
        var outBlock = null;
        if(block.in){
            inBlock = block;
        }
        if(block.out){
            outBlock = block;
            while(outBlock.out){
                if(outBlock.out.block){
                    outBlock = outBlock.out.block;
                }
                else{
                    break; 
                }
            }
        }
        // ヒットチェックをします
        $.each(self.blockList,function(k,tgtBlock){
            if(tgtBlock == inBlock) return;
            if(tgtBlock == outBlock) return;
            if(tgtBlock.in && outBlock && outBlock.out){
                var dist = checkHitDist($(tgtBlock.in.hitArea), $(outBlock.out.hitArea));
                if(dist && dist < nearDist){
                    nearDist = dist;
                    hitBlock = tgtBlock;
                    srcBlock = outBlock;
                    isSrcIn  = false;
                }
            }
            if(tgtBlock.out && inBlock && inBlock.in){
                var dist = checkHitDist($(tgtBlock.out.hitArea), $(inBlock.in.hitArea));
                if(dist && dist < nearDist){
                    nearDist = dist;
                    hitBlock = tgtBlock;
                    srcBlock = inBlock;
                    isSrcIn  = true;
                }
            }
            if(tgtBlock.scope){
            }
        });
        if(hitBlock){
            return {hitBlock:hitBlock,
                    srcBlock:srcBlock,isSrcIn:isSrcIn};
        }
    };
    var updateLayout = function(updateBlock){
        // 更新する一番上のブロックを探します
        var topBlock = updateBlock;
        while(topBlock.in && topBlock.in.block)
        {
            topBlock = topBlock.in.block;
        }
        // レイアウトします
        var recv = function(block){
            //block.scopeTbl;
            if(block.out && block.out.block)
            {
                var blockA = block;
                var blockB = block.out.block;
                var elmA = blockA.element;
                var elmB = blockB.element;
                var marginConnector = 0.5;
                blockB.posY(
                    blockA.posY() + blockA.blockHeight() + marginConnector
                );
                blockB.posX(
                    blockA.posX()
                );
                recv(blockB);
            }
        };
        recv(topBlock);
    };

    self.addList = function(newBlock){
        self.blockList.push(newBlock);
    };
    self.moveStart = function(block,position){
        block.clearIn();
    };
    self.move = function(block,position){
        block.posX(position.left * block.pix2em);
        block.posY(position.top  * block.pix2em);
        updateLayout(block);
                   
        var hit = getHitBlock(block);
        if(hit)
        {
        }
    };
    self.moveStop = function(block,position){
        block.posX(position.left * block.pix2em);
        block.posY(position.top  * block.pix2em);
        updateLayout(block);
        
        var hit = getHitBlock(block);
        if(hit)
        {
            if(hit.isSrcIn){
                hit.hitBlock.connectOut(hit.srcBlock);
            }
            else{
                hit.srcBlock.connectOut(hit.hitBlock);
            }
            //TODO:blockのほうをくっつくように移動させる処理を書く
            updateLayout(block);
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
            //$(element).on('input', function() {

//var range = window.getSelection().getRangeAt(0);
//var s = range.startOffset;
//var e = range.endOffset;
//var sc = range.startContainer;

                var observable = valueAccessor();
                observable( $(this).text() );

//var range2 = window.getSelection().getRangeAt(0);
//range2.setStart(sc, s);
//range2.setEnd(sc, e);
//var sel = window.getSelection();
//sel.removeAllRanges();
//sel.addRange(range2);
            });
        },
        update: function(element, valueAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            $(element).text(value);
        }
    };

    ko.bindingHandlers.blockSetup = {
        init: function(element, valueAccessor) {
            var blockIns = ko.unwrap(valueAccessor());
            blockIns.setup(element);
        },
        update: function(element, valueAccessor) {
        }
    };

    ko.bindingHandlers.blockLayout = {
        init: function(element, valueAccessor) {
        },
        update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var block = ko.utils.unwrapObservable(valueAccessor());
            // ブロック内のデータの通知を受けることを伝えます
            $.each(block.blockDataTbl,function(k,v){
                v();
            });
            // レイアウトします
            var posY =0;
            var sizeW=0;
            $(".blockRow",element).each(function(k,elem){
                var sizeH = 0;
                var posX  = 0;
                $(".blockCell",elem).each(function(k,elem){
                    $(elem).css({left:posX});
                    var w = $(elem).outerWidth();
                    var h = $(elem).outerHeight();
                    posX += w;
                    sizeH = Math.max(sizeH,h);
                });
                $(elem).css({top:posY,height:sizeH,width:posX});
                posY += $(elem).outerHeight();
                sizeW = Math.max(sizeW,$(elem).outerWidth());
            });
            $(element).css({height:posY,width:sizeW});
            block.blockHeight(posY  * block.pix2em);
            block.blockWidth (sizeW * block.pix2em);

        }
    };

    ko.bindingHandlers.arrangeElem = {
        init: function(element, valueAccessor) {
        },
        update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            //var value = ko.utils.unwrapObservable(valueAccessor());

            viewModel.textValue();

            var posY =0;
            var sizeW=0;
            $(".testRow",element).each(function(k,elem){
                var sizeH = 0;
                var posX  = 0;
                $(".testElm",elem).each(function(k,elem){

                    $(elem).css({left:posX});
                    var w = $(elem).outerWidth();
                    var h = $(elem).outerHeight();
                    posX += w;
                    sizeH = Math.max(sizeH,h);
                });
                $(elem).css({top:posY,height:sizeH,width:posX});
                posY += $(elem).outerHeight();
                sizeW = Math.max(sizeW,$(elem).outerWidth());
            });
            $(element).css({height:posY,width:sizeW});
        }
    };

    // -- MVVMのモデル(このアプリの中枢です) --
    function MyModel() {

        var self = this;

        self.textValue = ko.observable("");

        // -- --
        self.ipXXX_000_000_000 = ko.observable(192);
        self.ip000_XXX_000_000 = ko.observable(168);
        self.ip000_000_XXX_000 = ko.observable(11);
        self.ip000_000_000_XXX = ko.observable(17);

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
        }
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

        //■  ■
        self.blockManager = new BlockManager();

        self.materialList = ko.observableArray();
        self.toyList      = ko.observableArray();
        self.factoryList  = ko.observableArray();

        // 会話ブロック
        self.materialList.push(ko.observable(new Block(
          self.blockManager,
          {
              blockOpt:{head:'in',tail:'out'},
              blockContents:[
                  {expressions:[
                      {string:{dataName:'talkText0',default:"こんにちわ"}},
                      {label:'と　しゃべる'},
                  ]},
              ],
          },
          function(blockDataTbl){
              if(self.qims){
                  return self.qims.service("ALTextToSpeech").then(function(ins){
                      return ins.say(blockDataTbl['talkText0']());
                  });
              }
              else{
                  var dfd = $.Deferred();
                  dfd.reject();
                  return dfd.promise();
              }
          }
        )));
        // 文字列連結ブロック
        self.materialList.push(ko.observable(new Block(
          self.blockManager,
          {
              blockOpt:{head:'value',tail:'value'},
              blockContents:[
                  {expressions:[
                      {string:{dataName:'text0',default:"A"}},
                      {label:'と'},
                      {string:{dataName:'text1',default:"B"}},
                  ]},
              ],
          },
          function(blockDataTbl){
              var dfd = $.Deferred();
              var output = blockDataTbl['text0']() + blockDataTbl['text1']();
              dfd.resolve(output);
              return dfd.promise();
          }
        )));

        self.materialList.push(ko.observable(
           self.materialList()[0]().cloneThisBlock()
        ));

        var posX = 0;
        $.each(self.materialList(),function(key,blockInsObsv){
            blockIns = blockInsObsv();
            blockIns.posX(posX);
            posX += 20;//blockIns.blockWidth();
        });
    };
    myModel = new MyModel();
    ko.applyBindings( myModel );
});