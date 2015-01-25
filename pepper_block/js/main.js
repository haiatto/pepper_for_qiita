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
//   {options:{default:'',list:{'いち':'1','に':'2',}},dataName:'dataC'},
// ],

//■■■■■ 多言語対応案 ■■■■■ 
//  blockWorldId と lang で多言語対応
//  expressions の中身は言語によって順番やラベル数まで変わる可能性ありそう
//  
//==============================

function Block(blockManager, blockTemplate, callback) {
    var self = this;

    // ■どちらかというとプライベートな部分(プライベートに出来そう)
    self.blockManager  = blockManager;
    self.blockTemplate = JSON.parse(JSON.stringify(blockTemplate));
    self.callback      = callback;

    // ■どちらかというとViewModel的な部分
    self.element = null;

    self.pix2em           = 1.0;//ピクセル単位をフォント単位に変換する値
    self.minimumRowHeight = 1.0;
    self.indentWidth      = 1.0;
    self.blockWidth  = ko.observable(0);
    self.blockHeight = ko.observable(0);
    self.posX        = ko.observable(0);
    self.posY        = ko.observable(0);

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
                block:null,
                srcScopeName:null, 
                hitArea:null
            };
        }
        if(self.blockTemplate.blockOpt.tail == 'out') {
            self.out = {
                block:null, 
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
    
    // 要素関連のセットアップ
    self.setup = function(element){
        self.element = element;
        self.pix2em  = 1.0 / $('#pix2em').outerHeight();
        self.minimumRowHeight = self.minimumRowHeight / self.pix2em;
        self.indentWidth      = self.indentWidth / self.pix2em;
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
    };

    // Deferred の promise作って返します
    self.deferred = function()
    {
        // 値の受け取りを行います
        // HACK: この形が良いかは要検討。コールバック内に委ねる方がいいかも？
        $.each(self.valueInTbl,function(k,valueIn){
            if(valueIn.blockObsv()){
                //TODO: deferredの使い方に慣れたら並列化しるべし
                var df   = valueIn.blockObsv().deferred;
                var obsv = self.valueDataTbl[valueIn.dataTemplate.dataName];
                obsv(df());
            } 
        });
        //out部分のみここで繋ぎます(スコープ以下はコールバック内でやります)
        if(self.out && self.out.block){
            return self.callback(self.valueDataTbl, self.scopeTbl).then(
                self.out.block.deferred
            );
        }
        else{
            return self.callback(self.valueDataTbl, self.scopeTbl);
        }
    };

    self.clearOut = function()
    {
        if(self.out && self.out.block)
        {
            self.out.block.in.block = null;
            self.out.block = null;
        }
    };
    self.clearIn = function()
    {    
        if(self.in && self.in.block)
        {
            if(self.in.srcScopeName){
                self.in.block.clearScopeOut(self.in.srcScopeName);
            }else{
                self.in.block.clearOut();
            }
        }
    };
    self.clearScopeOut = function(scopeName){
        if(self.scopeTbl[scopeName])
        {
            if(self.scopeTbl[scopeName].scopeOut.blockObsv())
            {
                self.scopeTbl[scopeName].scopeOut.blockObsv().in.block = null;
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
        self.clearOut();
        block.clearIn();
        self.out.block = block;
        self.out.block.in.block = self;
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
            self.scopeTbl[scopeName].scopeOut.blockObsv().in.block = null;
        }
        self.scopeTbl[scopeName].scopeOut.blockObsv(block);
        block.in.block = self;
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
                if(outBlock.out.block){
                    outBlock = outBlock.out.block;
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
        $.each(self.blockList,function(k,tgtBlock){
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
    var updatePositionLayout = function(updateBlock){
        // 更新する一番上のブロックを探します
        var topBlock = updateBlock;
        //値用ブロックの場合は接続先を辿ります
        while(topBlock.valueOut && topBlock.valueOut.block)
        {
            topBlock = topBlock.valueOut.block;
        }
        //通常用ブロックの場合は接続元を辿ります
        while(topBlock.in && topBlock.in.block)
        {
            topBlock = topBlock.in.block;
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
                    var marginConnector = 0.5 / blockB.pix2em;
                    blockB.posY(
                        blockA.posY() + scope.rowBlockLocalY() + marginConnector
                    );
                    blockB.posX(
                        blockA.posX() + blockA.indentWidth
                    );
                    recv(blockB);
                }
            });
            if(block.out && block.out.block)
            {
                var blockA = block;
                var blockB = block.out.block;
                var elmA = blockA.element;
                var elmB = blockB.element;
                var marginConnector = 0.5 / blockB.pix2em;
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
            if(block.out && block.out.block){
                self.blockList.splice( self.blockList.indexOf(block.out.block), 1 );
                self.blockList.push( block.out.block );
                recv(block.out.block);
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
        updatePositionLayout(block);
                   
        var hit = getHitBlock(block);
        if(hit)
        {
        }
    };
    self.moveStop = function(block,position){
        block.posX(position.left);
        block.posY(position.top );
        updatePositionLayout(block);
        
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
            //TODO:blockのほうをくっつくように移動させる処理を書く
            updatePositionLayout(block);
        }
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

    ko.bindingHandlers.blockLayout = {
        init: function(element, valueAccessor) {
        },
        update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var block = ko.utils.unwrapObservable(valueAccessor());
            // ブロック内のデータの通知を受けることを伝えます
            $.each(block.valueDataTbl,function(k,v){
                v();
            });
            $.each(block.valueInTbl,function(k,v){
                v.blockObsv();
            });
            // レイアウトします
            var blkLocalPosY = 0;
            var blkSizeW     = 0;
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
                            $(".hitAreaValueIn#"+dataName,elemR).css(
                                 {left:blkLocalPosX,
                                  top :0,}
                            );
                        }
                        $(elemCell).css({left:blkLocalPosX});
                        var cellW = $(elemCell).outerWidth();
                        var cellH = $(elemCell).outerHeight();
                        if(dataName)
                        {
                            valueIn = block.valueInTbl[dataName];
                            var nestMargin = 0.2 / block.pix2em;
                            if(valueIn.blockObsv())
                            {
                                cellW = Math.max(cellW, valueIn.blockObsv().blockWidth()  + nestMargin);
                                cellH = Math.max(cellH, valueIn.blockObsv().blockHeight() + nestMargin);
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
                        if(tmpOutBlock.out && tmpOutBlock.out.block){
                            tmpOutBlock = tmpOutBlock.out.block;
                        }else{
                            tmpOutBlock = null;
                        }
                    }
                    rowSizeH = Math.max( rowSizeH, scopeBlocksH );
                }
                else if(rowContent.space){
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
            $(element).css({height:blkLocalPosY,width:blkSizeW});
            block.blockHeight(blkLocalPosY);
            block.blockWidth (blkSizeW    );

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

    // -- MVVMのモデル(このアプリの中枢です) --
    function MyModel() {

        var self = this;

        self.textValue = ko.observable("");

        // -- --
        self.ipXXX_000_000_000 = ko.observable(192);
        self.ip000_XXX_000_000 = ko.observable(168);
        self.ip000_000_XXX_000 = ko.observable(3);
        self.ip000_000_000_XXX = ko.observable(34);

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
        )));
        // 文字列連結ブロック
        self.materialList.push(ko.observable(new Block(
          self.blockManager,
          {
              blockOpt:{head:'value',tail:'value'},
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
        )));
        // 分岐ブロック
        self.materialList.push(ko.observable(new Block(
          self.blockManager,
          {
              blockOpt:{head:'in',tail:'out'},
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
              var dfd = $.Deferred();
              if(valueDataTbl.checkFlag0()){
                  //HACK: scopeOutが微妙なのでなんとかしたい。
                  if(scopeTbl.scope0.scopeOut.blockObsv())
                  {
                      //TODO:deferredの使い方に慣れたら使い方を検証するべし(たぶん本来の使い方じゃないよかん)
                      scopeTbl.scope0.scopeOut.blockObsv().deferred();
                  }
                  dfd.resolve();
              }
              return dfd.promise();
          }
        )));
        // モーションブロック
        self.materialList.push(ko.observable(new Block(
          self.blockManager,
          {
              blockOpt:{head:'in',tail:'out'},
              blockContents:[
                  {expressions:[
                      {string:{default:'正面'}, dataName:'angle',},
                      {label:'を向く'},
                  ]}
              ],
          },
          function(valueDataTbl,scopeTbl){
              var onFail = function(e) {console.error('fail:' + e);};
              var ratio_x;
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
              default:
                  ratio_x = 0.5;
                  break;
              }

              var angYaw = (2.0857 + 2.0857) * ratio_x + -2.0857;
              var angPitch = (0.6371 + 0.7068) * ratio_y + -0.7068;
              var angle = [angYaw, angPitch];
              var alMotion;

              if(self.qims){
                  return self.qims.service('ALMotion')
                      .then(function(s){
                          alMotion = s;
                          return alMotion.wakeUp();
                      }, onFail).then(function(){
                          return alMotion.angleInterpolationWithSpeed(name, angle, DELAY).fail(onFail);
                      }, onFail).promise();
              }
              return $.Deferred().reject().promise();
          }
        )));
        // センサーブロック
        self.materialList.push(ko.observable(new Block(
          self.blockManager,
          {
              blockOpt:{head:'in',tail:'out'},
              blockContents:[
                  {expressions:[
                      {string:{default:'左'}, dataName:'side',},
                      {label:'に物があるか'}
                  ]}
              ],
          },
          function(valueDataTbl,scopeTbl){
              var dfd = $.Deferred();
              var onFail = function(e) {console.error('fail:' + e);};
              var FRONT_KEY = 'Device/SubDeviceList/Platform/Front/Sonar/Sensor/Value';
              var LIMIT = 0.5;
              if(self.qims){
                  return self.qims.service('ALMemory').then(function(s){
                      return s.getData(FRONT_KEY).then(function(v){
                          return v < LIMIT;
                      }, onFail).promise();
                  }, onFail);
              }
              return $.Deferred().reject().promise();
          }
        )));


        self.materialList.push(ko.observable(
           self.materialList()[0]().cloneThisBlock()
        ));
        self.materialList.push(ko.observable(
           self.materialList()[1]().cloneThisBlock()
        ));

        var posX = 0;
        $.each(self.materialList(),function(key,blockInsObsv){
            blockIns = blockInsObsv();
            blockIns.posX(posX);
            posX += 200;//blockIns.blockWidth();
        });
    }
    myModel = new MyModel();
    ko.applyBindings( myModel );
});
