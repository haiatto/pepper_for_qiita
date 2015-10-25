//★ここはPepperBlockのコアとなるソースです★

// 2015.9.12 現在、ペッパー商人スクリプトのコアとして使えるように再構成中（元々整理予定だったものをついでだからと育成中。）


var pepperBlock = {};

pepperBlock.blockDefCallbaks = [];

// ■ブロック定義の登録とそざいBOX追加用コールバックを登録します
pepperBlock.registBlockDef = function(callbackFunc)
{
    pepperBlock.blockDefCallbaks.push(callbackFunc);
};

// ■ブロック定義の登録とそざいBOXの追加のコールバックを実行します
pepperBlock.runRegisterBlock = function(blockManager, materialBoxWsList)
{
    $.each(pepperBlock.blockDefCallbaks,function(k,callback){
        callback(blockManager, materialBoxWsList);
    });
};


//作成中メモ兼仕様メモ
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
//
//■■■■■ データフォーマット案 ■■■■■ 
//
// javascriptのテーブルで、
//   キーが タイプ名
//   値が   データ
// という形
// タイプは誰でも自由に追加可能。
// ROSのメッセージを意識したけど今のところバージョン管理などはしない
// 大規模な環境に耐えられる冗長性を作る気は今は無いので、
// 必要なら各フォーマット側で用意してシリアライザにチェッカー加えられるようにするとかにするかも
// でも、json化を考えると、一時的なデータは分けないと駄目かも…シリアライズ不要とか属性欲しいかも(画像データとか)
//
// -- データ例 --
//  {string:"",}
//  {bool:true,}
//  {number:123,}
//  {string_list:["A","B"],}
//  {miscABC:{version:,dataA:,dataB:,},}
//
// MEMO:受け渡されたり保存されたりするデータは全部 {型:データ} の形で流れていくので、
//      値をセットするときなどにも、この形で渡します。
//
//■■■■■ ブロックテンプレフォーマット案 ■■■■■ 
// -- root --
// blockHeader
//   ★ブロックの基本情報★
//   sys_version
//     'システムバージョン'
//   blockWorldId
//     'シリアライズで使う世界共通(各言語共通)の重複しない識別子' 
//      たとえば 'talkBlock' 'haiatto.talkBlock' '0x00AABBCCDDEEFF99' とか自由
//   lang
//     'jp' 'en'
//   head
//     'start' 'in' ’value’
//   tail
//     'end' 'out' ’value’
//   types:
//      ["","",...]
//   supportPolling
//      true/false trueの時は、ポーリング用入力枠に入っているときにコールバックにポーリング用の引数が渡される
//
// blockContents
//   ★ブロックの内容★
//   expressions
//     ***下記参照***
//   scope
//     scopeName
//   space
//
// blockVisual
//   ★見た目の設定。表示するシステムが使うので実行するエンジン自体には不要な情報。なので内容は表示側の自由。★
//   color
//     'red' '#F88'
//
// 例:
// {
//     blockHeader:{version:'0.01',head:'start',tail:'out'},
//     blockContents:[
//         {expressions:[]},
//         {scope:{scopeName:'scopeA',}},
//         {expressions:[]},
//         {scope:{scopeName:'scopeB',}},
//         {space:{spaceName:'spaceA',}},
//     ],
//     blockVisual:{
//         color:'red'    
//     }
// },
// -- expressions --
// expressions
//   ■ UIの見た目設定(必須)
//    - label
//      - 例 {label:"ここに"}.
//
//    ★acceptTypes省略可
//    - input_text    
//      - 例 {input_text:{default:{string:""},},dataName:'dataA', acceptTypes:["string"]},
//    - input_number    
//      - 例 {input_number:{default:{number:0}}.
//    - input_bool      
//      - 例 {input_bool:{default:{bool:0}}}.
//
//    ★acceptTypes必須
//    - input_options
//      - {options:{default:{string:'いち'},list:[{text:'いち',value:'1'},{text:'に',value:'2'},]},dataName:'dataC', acceptTypes:["string"]},
//    - input_dropOnly  
//      - 例 {dropOnly:{default:{}, label:"しゃしん１", dataName:'photo1', acceptTypes:["image"]},
//    - input_dropOnlyNoSerialize  
//
//   ■ データ
//    - dataName    データ名 ※省略不可
//    - acceptTypes 受け入れる型
//   ■ 挙動
//    - forPolling ※省略可。trueでポーリング用(イベント的な)の入力枠になります 
//
// -- 例 --
// [
//   {label:"ここに"}.
//   {string:{default:"",},dataName:'dataA', acceptTypes:["string"]},
//   {string:{default:"",},dataName:'dataB', acceptTypes:["*"]},
//   {string:{default:"",},dataName:'dataC'},
//   {options:{default:'',list:[{text:'いち',value:'1'},{text:'に',value:'2'},]},dataName:'dataC', acceptTypes:["string"]},
//   {dropOnly:{default:{},list:[{text:'いち',value:'1'},{text:'に',value:'2'},]},dataName:'dataC', acceptTypes:["string"]},
// ],
//
// -- MEMO --
// シリアライズ上の問題で今のところ dropOnly に乗ってるデータはシリアライズしない回避策をとりました
// 後でデータ周りを再考しないと…プリミティブ型以外にはメタ定義データを作るべきか悩む…初心者でも直感で理解できる構造…
//
//
//■■■■■ コールバック ■■■■■ 
//
// deferredの関数。promise返す
//
// MEMO:
//   凄く為になったdeferredの解説
//   http://techblog.yahoo.co.jp/programming/jquery-deferred/
//   ★注意★ 他の解説読む場合、JQueryのバージョン古いものの説明を読むと混乱するので注意。thenの仕様が結構何度も変わってます
//
// 簡単な例:
//  function blcokCallback(execContext, valueDataTbl, scopeOutTbl){
//      var dfd = $.Deferred();
//      dfd.resolve(v < LIMIT);
//      return dfd.promise();
//   }
// 引数の説明:
//   execContext    グローバル環境なテーブル(汎用なのでシステムによって中身は自由)
//   valueDataTbl   値入りテーブル
//       valueDataTbl["でーためい"].タイプ名
//       複数受け入れの際の初期値は最初に書かれたタイプ名のものになります
//   scopeOutTbl    スコープに接続しているブロックのテーブル
//     scopeOutTbl.scope0.block.deferred() 
//     でdfdを実行できます。(ifとかwhile文とかそういうの作る時に必要です)


//■■■■■ 多言語対応案 ■■■■■ 
//  blockWorldId と lang で多言語対応
//  expressions の中身は言語によって順番やラベル数まで変わる可能性ありそう
//  
//==============================

//deferredの参考リンク
// http://s3pw.com/qrefy/collectdeferred/
// http://tokkono.cute.coocan.jp/blog/slow/index.php/programming/jquery-deferred-for-responsive-applications-basic/
//


// ブロック
//
// ■ アクセサ
//    getTemplate()
//    getLutKey()
// ■ 接続関連の処理
//    clearOut()
//    clearIn()
//    clearScopeOut(scopeName)
//    clearValueIn(dataName)
//    clearValueOut()
//    // 外側につながるブロックをセットします(現在の接続は繋げたブロックの終端に再接続されます。挿入的動作)
//    connectOut(block)
//    // 値の入力のブロックをセットします
//    connectValueIn(dataName, valueBlock)
//    // 内側につながるブロックをセットします
//    connectScopeOut(scopeName, block)
//    // 前後のブロックを繋ぎなおして指定ブロックを外します
//    cutInOut()
//
//    // 複製します(内側のブロックは複製されません)
//    cloneThisBlock(){
//    // 複製します(内側のブロックも辿って複製します)
//    cloneThisBlockAndConnectBlock()
// ■ その他
//
//    // データをセットします(ブロックが繋がっていれば外します)
//    setValueInData(dataName,data)
//    // データを取得します(デフォルト値または最後のキャッシュから取得します。)
//    getValueInData(dataName)
//    // 値入力ブロックを明示的に実行(評価)します(デフォルト値または最後のキャッシュから取得します。)
//    updateValueInData(dataName)
//
//    //値用ブロックが指定のデータにつなげられる場合、型名を返します
//    getTypeAccept(tgtDataName,valueBlock)
//
//    //Deferred の promise作って返します
//    deferred(option)
//    deferredForPolling(pollingValueEndCheckCallback)
//
var blockKeySeed_ = 1;

function Block(blockManager, blockTemplate, callback) {
    var self = this;

    // ■どちらかというとプライベートな部分(プライベートに出来そう)
    self.blockManager  = blockManager;
    self.blockTemplate = JSON.parse(JSON.stringify(blockTemplate));
    self.callback      = callback;
    self.lutKey        = blockKeySeed_++;
    
    self.getTemplate = function()
    {
        return self.blockTemplate;
    };
    // テーブルで参照用する為に使える識別用のキー向けの値。
    // シリアライズ対象外で、ロード時に書き換わる値なのでこれを宛にしてシリアライズしないように注意してください。
    self.getLutKey = function()
    {
        return self.lutKey;
    };

    // ■ブロックテンプレからの準備

    // 入出力部分を準備します
    if(self.blockTemplate.blockHeader.head == 'value') {
        // 値用のブロックの連結(出力)部分
        // ※フローブロックと比べると、ある面でラムダ式っぽいかも。
        self.valueOut = {
            block:null, 
            tgtDataName:null, 
            types: self.blockTemplate.blockHeader.types,
        };
    }
    else{
        // フロー用のブロックの連結(入出)部分
        if(self.blockTemplate.blockHeader.head == 'in') {
            self.in = {
                block:null,
                srcScopeName:null, 
            };
        }
        if(self.blockTemplate.blockHeader.tail == 'out') {
            self.out = {
                block:null, 
            };
        }
    }
    if(self.blockTemplate.blockHeader.supportPolling){
        self.supportPolling = true;
    }

    // ■

    // 値用ブロックが指定のデータ入力につなげられる場合、型名を返します
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

    // データが、指定の名前のデータ入力に受け入れられるか判定します
    self.checkDataAccept = function(tgtDataName,data)
    {
        var valueIn = self.valueInTbl[tgtDataName];
        if(data && valueIn)
        {
            if(!valueIn.acceptTypes)
            {
                // 受け側の無指定は受け入れ無しという扱いにします(options等)
                return false;
            }
            if(valueIn.acceptTypes[0]=='*')
            {
                // 受け側が何でもありでした
                return true;
            }
            var acceptOk = false;
            $.each(valueIn.acceptTypes,function(k,v){
                if(data[v]!=null)//NULLなデータは無いという事にしてみる。(駄目ならundefinedあたりで判定するかも？)
                {
                    acceptOk = true;
                }
            });
            return acceptOk;
        }
        return false;
    };

    // 行のような部分の中身を作ります
    self.valueInTbl  = {};
    self.scopeOutTbl = {};
    self.rowContents = [];
    $.each(self.blockTemplate.blockContents,function(rowIndex,contentTemplate){
        // 行のような部分を構築
        var rowContent = {
            contentTemplate:contentTemplate,
        };
        if(contentTemplate.expressions) {
            // 式(ラベルと値で構成される)の構築をします
            rowContent.expressionInsTbl = [];
            $.each(contentTemplate.expressions, function(key,expTmpl){
                var expressionIns = {
                    expTmpl:expTmpl,
                };
                if(expTmpl.dataName){
                    //データ名あり(値の入力用の式の要素)です
                    expressionIns.acceptTypes = expTmpl.acceptTypes;
                    expressionIns.block       = null;
                    expressionIns.value       = null;
                    self.valueInTbl[expTmpl.dataName] = expressionIns;
                    if(expTmpl.input_bool)
                    {
                        if(!expressionIns.acceptTypes){//受け入れ型指定が無い場合はデフォルトをセットします
                            expressionIns.acceptTypes = ["bool"];
                        }
                        expressionIns.value = expTmpl.input_bool.default || {bool:false};
                    }
                    if(expTmpl.input_text)
                    {
                        if(!expressionIns.acceptTypes){// 受け入れ型指定が無い場合はデフォルトをセットします
                            expressionIns.acceptTypes = ["string"];//HACK: 何でもありにするかも？
                        }
                        expressionIns.value = expTmpl.input_text.default||{string:""};
                    }
                    if(expTmpl.input_number)
                    {
                        if(!expressionIns.acceptTypes){//受け入れ型指定が無い場合はデフォルトをセットします
                            expressionIns.acceptTypes = ["number"];//HACK: 何でもありにするかも？
                        }
                        expressionIns.value = expTmpl.input_number.default||{number:0};
                    }
                    if(expTmpl.input_options)
                    {
                        //ここはデフォルトの受け入れ型指定は 無し です
                        expressionIns.value = expTmpl.input_options.default||{};
                    }
                    if(expTmpl.input_dropOnly)
                    {
                        //ここはデフォルトの受け入れ型指定は 無し です
                        expressionIns.value = expTmpl.input_dropOnly.default||{};
                    }
                    if(expTmpl.input_dropOnlyNoSerialize)
                    {
                        //ここはデフォルトの受け入れ型指定は 無し です
                        expressionIns.value = expTmpl.input_dropOnlyNoSerialize.default||{};
                    }
                    // データフォーマットの受け入れチェックをしておきます
                    if(!self.checkDataAccept(expTmpl.dataName,expressionIns.value))
                    {
                        // 受け入れられないデフォルトが設定されていたので空にします(TODO:あとでアサートに)
                        console.warn("default value error."+expTmpl.dataName);
                        expressionIns.value = {};
                    }
                }
                rowContent.expressionInsTbl.push(expressionIns);
            });
        }
        if(contentTemplate.scope)
        {
            // スコープがつながる先のためのデータを作ります。
            rowContent.scopeOut = {
                block:null, 
            };
            self.scopeOutTbl[contentTemplate.scope.scopeName] = rowContent.scopeOut;
        }
        if(contentTemplate.space)
        {
            // スペース用のデータを作ります。現状は空テーブル
            rowContent.space = {
            };
        }
        self.rowContents.push(rowContent);
    });


    //■ 接続関連の処理

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
        if(self.scopeOutTbl[scopeName])
        {
            if(self.scopeOutTbl[scopeName].block)
            {
                self.scopeOutTbl[scopeName].block.in.block        = null;
                self.scopeOutTbl[scopeName].block.in.srcScopeName = null;
                self.scopeOutTbl[scopeName].block = null;
            }
        }
    };
    self.clearValueIn = function(dataName)
    {
        var valueIn = self.valueInTbl[dataName];
        if(valueIn && valueIn.block)
        {
            valueIn.block.valueOut.block       = null;
            valueIn.block.valueOut.tgtDataName = null;
            valueIn.block = null;
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
        var oldConnect = self.out.block;
        self.clearOut();
        block.clearIn();
        self.out.block = block;
        self.out.block.in.block = self;
        if(oldConnect)
        {
            var bottomBlock = self.out.block;
            while(bottomBlock.out && bottomBlock.out.block){
                bottomBlock = bottomBlock.out.block;
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
            valueIn.block = valueBlock;
        }
    };

    // 内側につながるブロックをセットします
    self.connectScopeOut = function(scopeName, block){
        if(!self.scopeOutTbl[scopeName])
        {
            console.log("error:" + scopeName);
            return;
        }
        var oldConnectOut = self.scopeOutTbl[scopeName].block;
        self.clearScopeOut(scopeName);

        self.scopeOutTbl[scopeName].block = block;
        block.in.block        = self;
        block.in.srcScopeName = scopeName;
        
        if(oldConnectOut)
        {
            var bottomBlock = block;
            while(bottomBlock.out && bottomBlock.out.block){
                bottomBlock = bottomBlock.out.block;
            }
            if(bottomBlock.out){
                bottomBlock.connectOut(oldConnectOut);
            }
        }
    };

    // 前後のブロックを繋ぎなおして指定ブロックを外します
    self.cutInOut = function(){
        if(self.in && self.in.block)
        {
            if(self.out && self.out.block)
            {
                // inのブロックをoutにつなぎなおします
                if(self.in.srcScopeName)
                {
                    //in側のリンクをoutに再接続
                    self.in.block.scopeOutTbl[self.in.srcScopeName].block = self.out.block;
                    //out側のリンクをinに再接続
                    self.out.block.in.block     = self.in.block;
                    self.out.block.srcScopeName = self.in.srcScopeName;
                }
                else
                {
                    //in側のリンクをoutに再接続
                    self.in.block.out.block = self.out.block;
                    //out側のリンクをinに再接続
                    self.out.block.in.block = self.in.block;
                }
                self.in.srcScopeName = null;
                self.in.block = null;
                self.out.block = null;
            }
            else{
                self.clearIn();
            }
        }
        self.clearOut();
    };

    // データをセットします(ブロックが繋がっていれば外します)
    self.setValueInData = function(dataName,data){
        var valueIn = self.valueInTbl[dataName];
        if(valueIn)
        {
            if(self.checkDataAccept(dataName,data))
            {
                self.clearValueIn(dataName);
                valueIn.value = data;
            }
        }
    };
    // データを取得します(デフォルト値または最後のキャッシュから取得します。)
    self.getValueInData = function(dataName){
        var valueIn = self.valueInTbl[dataName];
        if(valueIn)
        {
            return valueIn.value;
        }
        return null;
    };
    // 値入力ブロックを明示的に実行(評価)します(デフォルト値または最後のキャッシュから取得します。)
    self.updateValueInData = function(dataName){
        var valueIn = self.valueInTbl[dataName];
        if(valueIn && valueIn.block && !valueIn.forPolling){
            // ポーリング用以外でブロックがある時のみ評価
            valueIn.block.deferred().then(function(valueData){
                // 値入力枠に代入しておきます(値ブロックを枠から外した時に最後の評価結果が残る挙動になります)
                valueIn.value = valueData;
            },function(){
            });
            // ついでに利便性の為、値も返しておきます
            return valueIn.value;
        }
        return null;
    };

    // 複製します(内側のブロックは複製されません)
    self.cloneThisBlock = function(){
        var ins = self.blockManager.createBlockIns(self.blockTemplate.blockHeader.blockWorldId);
        $.each(self.valueInTbl,function(key,valueIn){
            ins.valueInTbl[key].value = valueIn.value;
        });
        return ins;
    };
    // 複製します(内側のブロックも辿って複製します)
    self.cloneThisBlockAndConnectBlock = function(){
        var recv = function(block){
            var cloneBlock = block.cloneThisBlock();
            if(block.valueInTbl){
               $.each(block.valueInTbl,function(k,valueIn){
                   if(valueIn.block){
                       cloneBlock.connectValueIn(
                           k, recv(valueIn.block)
                       );
                   }
               });
            }
            if(block.scopeOutTbl){
               $.each(block.scopeOutTbl,function(k,scopeOut){
                   if(scopeOut.block){
                       cloneBlock.connectScopeOut(
                           k, recv(scopeOut.block)
                       );
                   }
               });
            }
            if(block.out && block.out.block){
                cloneBlock.connectOut(
                    recv(block.out.block)
                );
            }
            return cloneBlock;
        };
        return recv(self);
    };

    // ■実行関連の処理
    
    // Deferred の promise作って返します
    self.deferred = function(option)
    {
        option = option || {};
        var makeScopeBlockTbl_ = function(){
            var scopeBlkTbl = {};
            $.each(self.scopeOutTbl,function(k,scopeOut){
                scopeBlkTbl[k] = scopeOut.block;
            });
            return scopeBlkTbl;
        };
        
        //$(self.element).removeClass("executeError"); 
        //$(self.element).removeClass("executeNow");

        // 入力枠の値の評価を行います(deferredはリストにして纏めます)
        var argValueDataTbl      = {};
        var valueEvalPromiseList = [];
        $.each(self.valueInTbl,function(k,valueIn){
            if(valueIn.forPolling){
                // 入力枠がポーリング用なので評価関数を渡します(遅延評価的な雰囲気)
                if(valueIn.block){
                    argValueDataTbl[k] = {
                        // Deferredとして実装します。ポーリングが終わるとresolveします
                        //(Deferredはエラーチェック用に必須ですが、それ以外の用途では利用しなくても別にOKです。そちらはあくまで利便性のため)
                        startPolling:function(pollingValueEndCheckCallback)
                        {
                            return valueIn.block.deferredForPolling(pollingValueEndCheckCallback);
                        },
                    };
                }else{
                    //値ブロックが無い場合はポーリング不可という事で空にします
                    argValueDataTbl[k] = {};
                }
            }
            else if(valueIn.block){
                // 値ブロックの結果をargValueDataTblにセットします(deferredで実行)
                // HACK: この形が良いかは要検討。コールバック内に委ねる方がいいかも？
                // HACK: 委ねない形で、要求するデータを記述しておけば最小限でいけていいかも？
                //       たとえばマッチングした型の最初のモノを要求するみたいな形で…
                valueEvalPromiseList.push(
                    $.Deferred(function(dfd) {
                        valueIn.block.deferred().then(function(valueData){
                            // 値入力枠に代入しておきます(値ブロックを枠から外した時に最後の評価結果が残る挙動になります)
                            valueIn.value = valueData;
                            // 受け渡し用のテーブルを構築します
                            argValueDataTbl[k] = {};
                            $.each(valueIn.acceptTypes,function(k, acceptType){
                                if(valueData[acceptType]){
                                    argValueDataTbl[k][acceptType] = valueData[acceptType];
                                }
                            });
                            dfd.resolve();
                        },function(){
                            dfd.reject();
                        });
                    }).promise()
                );
            }
            else{
                // 値入力枠の値を使用します
                var valueData = valueIn.value;
                // 受け渡し用のテーブルにセットします
                argValueDataTbl[k] = {};
                $.each(valueIn.acceptTypes,function(idx, acceptType){
                    if(valueData[acceptType]!=null){
                        argValueDataTbl[k][acceptType] = valueData[acceptType];
                    }
                });
            }
        });

        // 入力する値ブロックを評価するpromiseが全部完了したら自身のコールバックを実行します
        return $.when.apply($,valueEvalPromiseList).then(function(){
            // 自身の処理の前の処理
            $(self.element).removeClass("executeError"); 
            $(self.element).addClass("executeNow");

            // 自身の処理を実行します
            var scopeBlkTbl = makeScopeBlockTbl_();            
            var dfdMain = self.callback(
                self.blockManager.execContext, 
                argValueDataTbl, 
                scopeBlkTbl,
                option.pollingValueEndCheckCallback
            );
            if(!dfdMain){
                var dfd = $.Deferred();
                alert("コールバックがバグってます");
                dfd.reject();
                return dfd;
            }

            //MEMO: deferredの学習用メモ
            //      dfdMainは内部で非同期処理が一つもなければここで結果が出ています
            //      非同期処理があればペンティング状態で結果が出るのを待っている状態です
            //      同期処理だった場合は以降の処理の登録の瞬間にその場で実行されます
            
            // 自身の処理の後の処理を登録(実行)します
            return dfdMain.then(
                function(value){
                    // 自身の処理が成功時
                    $(self.element).removeClass("executeNow"); 
                    if(self.out && self.out.block)
                    {
                        // out部分のみここで繋ぎます(スコープ以下はコールバック内で処理するルールです)
                        return self.out.block.deferred();
                    }
                    return $.Deferred().resolve(value);
                },
                function(){
                    // 自身の処理が失敗時
                    $(self.element).removeClass("executeNow"); 
                    $(self.element).addClass("executeError");
                }
            );
        });
    };
    self.deferredForPolling = function(pollingValueEndCheckCallback)
    {
        $(self.element).removeClass("executeError"); 
        $(self.element).addClass("executeNow");

        var dfd = $.Deferred();
        if(self.supportPolling){
            //値ブロックが値更新ポーリング処理を提供している場合は
            //オプション付きでdeferredを呼びます
            dfd = self.deferred({
                pollingValueEndCheckCallback : pollingValueEndCheckCallback,
            });
        }
        else{
            //値更新ポーリング処理を提供してない場合は
            //setTimeoutで繰り返します
            var pooling = function(){
                self.deferred().then(
                  function(value){                                    
                    if(!pollingValueEndCheckCallback(value)){
                        setTimeout(pooling,0);
                    }else{
                        dfd.resolve(value);
                    }
                  },
                  function(){dfd.resolve(value);}
                );
            };
            setTimeout(pooling,0);
        }
        return dfd;
    };
}

// ■ブロック作業場

// ワークスペースというかリスト的な…

var BlockWorkSpace = function (blockManager, workspaceName){
    var self = this;

    self.blockManager      = blockManager;
    self.workspaceName     = workspaceName||"あたらしいエリア";
    self.blockList         = [];
    self.id                = blockManager.blockWsIdSeed_++;

    // シリアライズ関連です
    self.toJsonTable = function()
    {
        var topBlockList = [];
        $.each(self.blockList,function(k,block){
            var topBlock = self.blockManager.getLumpTopBlock(block);
            if(topBlockList.indexOf(topBlock)<0){
                topBlockList.push( topBlock );
            }
        });
        var blocks = [];
        $.each(topBlockList,function(k,topBlock){
            blocks.push(self.blockManager.toJsonTable_LumpBlocks(topBlock));
        });
        return {
            name:  self.workspaceName,
            blocks:blocks,
        };
    };
    self.fromJsonTalbe = function(jsonTbl)
    {
        self.clearAllBlocks();
        self.workspaceName = jsonTbl.name;
        $.each(jsonTbl.blocks,function(k,topBlockJson){
            var block = self.blockManager.fromJsonTable(topBlockJson);
            self.addBlock( block );
        });
    };

    // 作業場のリスト操作関連です
    self.addBlock = function(newBlock)
    {
        blockManager.traverseUnderBlock(newBlock,{
            blockCb:function(block){
                self.blockList.push(block);
            },
        });
    };
    self.removeBlock = function(removeBlock)
    {
        removeBlock.clearIn();
        blockManager.traverseUnderBlock(removeBlock,{
            blockCb:function(block){
                self.blockList.remove(function(block){
                    return block==block;
                });
            },
        });
    };
    self.clearAllBlocks = function()
    {
        self.blockList.removeAll();
    };
    self.isContainsBlock = function(block){
        var bFind=false;
        $.each(self.blockList,function(key,blockIns){
            if(blockIns==block){
                bFind = true;
                return false;
            }
        });
        return bFind;
    };
};


// 設計メモ
// 管理リスト＋グローバルなブロックという形で実装
// ブロック間はグローバルにつなぎ、相互に接続も自由。
// 管理エリア毎にリストを作ってそこに格納するだけ。

// ■ブロック管理
function BlockManager(execContext){
    var self = this;

    // 
    self.execContext  = execContext;//実行環境(各種グローバルな要素を入れるテーブル)

    // ブロックのリストなど
    self.blockList = [];
    self.elementBlockLookupTbl = {};

    // ブロック作業場リストなど
    self.floatDraggingList = ko.observableArray();
    self.floatDraggingInfo = {
        fromWs:null,
        droppedWs:null,
    };
    self.blockWorkSpaceList = [];
    self.elementBlockWsLookupTbl = {};
    self.blockWsIdSeed_ = 1;

    //■ ブロック周りの便利系な処理

    // 指定のブロックの繋がっているブロックの塊の一番最上流のブロックを取得します
    self.getLumpTopBlock = function(block)
    {
        // 一番上のブロックを探します
        var topBlock = block;
        // まずは値ブロックの場合は接続先をたどります
        while(topBlock.valueOut && topBlock.valueOut.block)
        {
            topBlock = topBlock.valueOut.block;
        }
        // つぎに通常用ブロックの場合は接続元を辿ります
        while(topBlock.in && topBlock.in.block)
        {
            topBlock = topBlock.in.block;
        }
        return topBlock;
    }

    // 指定のブロックがブロックの塊の中に含まれているかチェックします
    self.checkContainLumpBlock = function(checkBlock,lumbBlock)
    {
        // 一番上のブロックを探します
        var topBlock = self.getLumpTopBlock(lumbBlock);
        var bFind = false;
        self.traverseUnderBlock( topBlock,{
            blockCb:function(block){
                if(block == checkBlock){
                    bFind = true;
                    return false;
                }
            },
        });
        return bFind;
    };
    // 指定ブロック以下を再帰的に辿ります
    // (※値ブロックは入力が辿られます)
    self.traverseUnderBlock = function(block,callbacks)
    {
        var recv = function(block){
            if(callbacks.blockCb){
                if(false===callbacks.blockCb(block)){
                    return false;
                }
            }
            var isExit = false;
            $.each(block.valueInTbl,function(k,valueIn){
                if(valueIn.block)
                {
                    if(callbacks.valueInCb){
                        if(false===callbacks.valueInCb(block, k, valueIn.block, valueIn)){
                            isExit = true;
                            return false;
                        }
                    }
                    if(false===recv(valueIn.block)){
                        isExit = true;
                        return false;
                    }
                }
            });
            if(isExit){
                return false;
            }
            $.each(block.scopeOutTbl,function(k,scopeOut){
                if(scopeOut.block)
                {
                    if(callbacks.scopeOutCb){
                        if(false===callbacks.scopeOutCb(block, k, scopeOut.block, scope)){
                            isExit = true;
                            return false;
                        }
                    }
                    if(false===recv(scopeOut.block)){
                        isExit = true;
                        return false;
                    }
                }
            });
            if(isExit){
                return false;
            }
            if(block.out && block.out.block){
                if(callbacks.outCb){
                    if(false===callbacks.outCb(block, block.out.block, block.out)){
                        isExit = true;
                        return false;
                    }
                }
                if(false===recv(block.out.block)){
                    isExit = true;
                    return false;
                }
            }
            if(isExit){
                return false;
            }
        };
        recv(block);
    };

    //■ シリアライズ回り

    // ブロックの塊(指定ブロック以下全て)をJSON用データに変換します
    self.toJsonTable_LumpBlocks = function(block,callback){
        var recv = function(block){
            var jsonTbl={
                blkWId:block.blockTemplate.blockHeader.blockWorldId,
                valTbl:{},
                scpTbl:{},
            };
            $.each(block.valueInTbl,function(k,valueIn){
                jsonTbl.valTbl[k]={};
                if(valueIn.block){
                    jsonTbl.valTbl[k].block=recv(valueIn.block);
                }
                if(!valueIn.expTmpl.input_dropOnlyNoSerialize)//input_dropOnlyNoSerializeは除外します(保存しなくても動くのと画像データとか入れてるので保存すると落ちる場合が…)
                {
                    jsonTbl.valTbl[k].value = valueIn.value;
                }
            });
            $.each(block.scopeOutTbl,function(k,scopeOut){
                if(scopeOut.block)
                {
                    jsonTbl.scpTbl[k] = recv(scopeOut.block);
                }
            });
            if(block.out && block.out.block){
                jsonTbl.out = recv(block.out.block);
            }
            if(callback){
                callback(block,jsonTbl);
            }
            return jsonTbl;
        };
        var json = recv(block);
        return json;
    };

    // JSON用データからブロックの塊を復元します(塊でなくてもフォーマットは変わりません)
    self.fromJsonTable = function(jsonTbl,callback){
        var recv = function(jsonTbl){
            var block = self.createBlockIns( jsonTbl.blkWId );
            $.each(jsonTbl.valTbl,function(k,valJson){
                if(block.valueInTbl[k]){
                    if(valJson.value){
                        block.valueInTbl[k].value = valJson.value;
                    }
                    if(valJson.block){
                        block.connectValueIn(k,recv(valJson.block));
                    }
                }
            });
            $.each(jsonTbl.scpTbl,function(k,scpJson){
                if(block.scopeOutTbl[k]){
                    block.connectScopeOut(k,recv(scpJson));
                }
            });
            if(block.out && jsonTbl.out){
                block.connectOut(recv(jsonTbl.out));
            }
            if(callback){
                callback(block,jsonTbl);
            }
            return block;
        };
        var block = recv(jsonTbl);
        return block;
    };

    // ■ブロック定義の登録とインスタンス生成など

    self.blockDefTbl = {};

    // ブロック定義の登録をしますテンプレートとコールバックの登録
    self.registBlockDef = function(blockTemplate, callback){
        if(!blockTemplate.blockHeader.blockWorldId){
            alert("テンプレートにblockWorldIdがありません。"+JSON.stringify(blockTemplate));
            return;
        }
        if(self.blockDefTbl[blockTemplate.blockHeader.blockWorldId]){
            //TODO:多言語対応時には重なる事あり
            alert("定義登録でblockWorldIdが重なりました。id:"+blockTemplate.blockHeader.blockWorldId);
            return;
        }
        self.blockDefTbl[blockTemplate.blockHeader.blockWorldId] = {
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

    // ■ブロック作業場のインスタンス生成など

    // ブロックの作業場のインスタンスを生成します
    self.createBlockWorkSpaceIns = function(workspaceName){
        var blkWsIns = new BlockWorkSpace(self, workspaceName);
        self.blockWorkSpaceList.push(blkWsIns);
        return blkWsIns;
    };

    // ブロックからブロックの作業場を探します
    self.findBlockWorkSpaceByBlock = function(block){
        for(var ii=0; ii < self.blockWorkSpaceList.length ; ii++){
            if(self.blockWorkSpaceList[ii].isContainsBlock(block)){
                return self.blockWorkSpaceList[ii];
            }
        }
    };
}