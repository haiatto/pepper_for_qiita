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
//     'start' 'in'
//   tail
//     'end' 'out'
// blockContents
//   expressions
//     ***下記参照***
//   scope
//     scopeName
//   space
// {
//     blockOpt:{version:'0.01',head:'start',tail:'out'},
//     blockContents:[
//         {expressions:{}},
//         {scope:{}},
//         {expressions:{}},
//         {scope:{}},
//     ],
// },
// -- expressions --
// expContents
//   label
//   string
//   number
//   bool
//   options
// {
//     expContents:[
//        {label:"ここに"}.
//        {string:{dataName:''}},
//        {string:{dataName:''}},
//        {options:{dataName:'',list:{'いち':'1','に':'2',}}},
//     ],
// },

//■■■■■ 多言語対応案 ■■■■■ 
//  blockWorldId と lang で多言語対応
//  expressions の中身は言語によって順番やラベル数まで変わる可能性ありそう
//  
//==============================


function Block(blockTemplate,callback) {
    var self = this;

    // どちらかというとプライベートな部分
    self.callback  = callback;
    self.blockTemplate = JSON.parse(JSON.stringify(blockTemplate));
    self.blockDataTbl = {};
    self.scopeTbl  = {};

    // どちらかというとViewModel的な部分
    self.element     = null;
    self.pix2em      = 1;
    self.blockWidth  = ko.observable(1);
    self.blockHeight = ko.observable(0);
    self.posX        = ko.observable(0);
    self.posY        = ko.observable(0);

    // データテーブル準備
    for(var ii=0; ii < self.blockTemplate.blockContents.length ; ii+=1)
    {
        if(self.blockTemplate.blockContents[ii].expressions)
        {
            $.each(self.blockTemplate.blockContents[ii].expressions.expContents,function(key,data){
                if(data.bool)
                {
                    self.blockDataTbl[data.bool.dataName] = ko.observable(false);
                }
                if(data.string)
                {
                    self.blockDataTbl[data.string.dataName] = ko.observable("");
                    self.blockDataTbl[data.string.dataName].subscribe(function(vv){
                        self.blockWidth(0);
                        self.blockWidth($(self.element).width()/self.pix2em);
                    });
                }
                if(data.number)
                {
                    self.blockDataTbl[data.number.dataName] = ko.observable(0);
                }
                if(data.options)
                {
                    self.blockDataTbl[data.options.dataName] = ko.observable("");
                }
            });
        }
    }
    self.setup = function(element){
        self.element = element;
        self.pix2em  = $('#pix2em').outerHeight();
        
        //TODO:押して少し経ったら編集モード、その間に動かされたらドラッグモードが良いはず
        var draggableDiv =$(self.element).draggable();
        $('.string', draggableDiv).mousedown(function(ev) {
             draggableDiv.draggable('disable');
        }).mouseup(function(ev) {
             draggableDiv.draggable('enable');
        });
    }

    // Deferred の promise作って返します
    self.deferred = function()
    {
        var dfd = $.Deferred();
        self.callback(dfd,data);
        return dfd.promise();
    };

    //ぶら下がってるブロックを挿入します
    self.insertScopeBlock = function(scopeName,index,blockIns){
        if(null==self.scopeTbl[scopeName]){
            self.scopeTbl[scopeName] = [];
        }
        var blockArray = self.scopeTbl[scopeName];

        if(index<0 || index >= blockArray.length){
            blockArray.push(blockIns);
        }
        else{
            blockArray.splice(index,0,blockIns);
        }
    };

    // 複製します(ぶら下がってるブロックは複製されません)
    self.newInstance = function(){
        return new Block(self.blockData,self.callback);
    }
}



$(function(){
    ko.bindingHandlers.editableText = {
        init: function(element, valueAccessor) {
            $(element).on('blur', function() {
            //$(element).on('input', function() {
                var observable = valueAccessor();
                observable( $(this).text() );
            });
        },
        update: function(element, valueAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            $(element).text(value);
        }
    };
    ko.bindingHandlers.autosizeInput = {
        init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            $(element).attr("contenteditable","true");
            /*
            $(element).keypress(function(e) {
              // enter
              if(e.which == 13) {
                document.execCommand('insertImage', false, '#BR#');
                                var elm = $('img[src="#BR#"]', this);
                                elm.before($('<br>'));
                                elm.remove();
                            }
                        });

                 return false;
             }
            var resizeInput = function(){
                var size=$(element).val().length;
                $(element).attr('size', size);
            }
            $(element)
              .keyup(resizeInput)
              .each(resizeInput);
            */
        },
        update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
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

    function MyModel() {

        var self = this;

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
              self.alAudioDevice.getOutputVolume().done(function(val){
                  self.nowVolume(val);
              });
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
        self.materialList = ko.observableArray();
        self.toyList      = ko.observableArray();
        self.factoryList  = ko.observableArray();

        self.materialList.push(ko.observable(new Block(
          {
              blockOpt:{head:'in',tail:'out'},
              blockContents:[
                  {expressions:{
                      expOpt:{dataName:'TEST'},
                      expContents:[
                          {label:'てすと用に'},
                          {bool:{dataName:'flag0'}},
                          {label:'ならば'},
                          {string:{dataName:'talkText0',default:""}},
                          {label:'と'},
                          {options:{dataName:'talkType0', list:{
                              '喋る':'talkNormal',
                              '早く喋る':'talkFast',
                              'ゆっくり喋る':'talkSlow'}}
                          },
                      ],
                  }},
                  {scope:{
                      scopeName:'scope0',
                  }},
                  {space:{
                  }},
              ],
          },
          function(dfd){
            dfd.resolve();
          }
        )));


        self.materialList.push(ko.observable(new Block(
          {
              blockOpt:{head:'start',tail:'end'},
              blockContents:[
                  {expressions:{
                      expOpt:{dataName:'TEST'},
                      expContents:[
                          {label:'てすと用に'},
                          {bool:{dataName:'flag0'}},
                          {label:'ならば'},
                          {string:{dataName:'talkText0',default:""}},
                          {label:'と'},
                          {options:{dataName:'talkType0', list:{
                              '喋る':'talkNormal',
                              '早く喋る':'talkFast',
                              'ゆっくり喋る':'talkSlow'}}
                          },
                      ],
                  }},
                  {scope:{
                      scopeName:'scope0',
                  }},
                  {expressions:{
                      expOpt:{dataName:'TEST1'},
                      expContents:[
                          {bool:{dataName:'flag0'}},
                          {label:'ならば'},
                          {string:{dataName:'talkText0',default:""}},
                          {label:'と'},
                          {options:{dataName:'talkType0', list:{
                              '喋る':'talkNormal',
                              '早く喋る':'talkFast',
                              'ゆっくり喋る':'talkSlow'}}
                          },
                      ],
                  }},
              ],
          },
          function(dfd){
            dfd.resolve();
          }
        )));

        var posX = 0;
        $.each(self.materialList(),function(key,blockInsObsv){
            blockIns = blockInsObsv();
            blockIns.posX(posX);
            posX += 20;//blockIns.blockWidth();
        });
    };

    ko.applyBindings(new MyModel());
});