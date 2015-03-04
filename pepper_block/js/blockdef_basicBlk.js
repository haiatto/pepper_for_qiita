

//■ ブロックの実装 ■

pepperBlock.registBlockDef(function(blockManager,materialBoxWsList){
    // 会話ブロック
    blockManager.registBlockDef(
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
    blockManager.registBlockDef(
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
    blockManager.registBlockDef(
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
    blockManager.registBlockDef(
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
    blockManager.registBlockDef(
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
    blockManager.registBlockDef(
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
    blockManager.registBlockDef(
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
    blockManager.registBlockDef(
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
    blockManager.registBlockDef(
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
    blockManager.registBlockDef(
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
                  {label:'物が正面'},
                  {string:{default:'0.5'}, dataName:'dist',acceptTypes:["number"]},
                  {label:'ｍ内にある'},
              ]}
          ],
      },
      function(ctx,valueDataTbl,scopeTbl){
          var dfd = $.Deferred();
          var onFail = function(e) {console.error('fail:' + e);};
          var FRONT_KEY = 'Device/SubDeviceList/Platform/Front/Sonar/Sensor/Value';
          var LIMIT = valueDataTbl["dist"]();
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
    blockManager.registBlockDef(
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
    blockManager.registBlockDef(
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
    blockManager.registBlockDef(
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


    // ぼくの領域(ゾーン)に何か居る（エンゲージメントゾーン）ブロック
    blockManager.registBlockDef(
      {
          blockOpt:{
              blockWorldId:"engagentZone@basicBlk",
              color:'orange',
              head:'value',
              tail:'value',
              types:["bool"],
          },
          blockContents:[
              {expressions:[
                  {label:'ぼくの'},
                  {options:{default:'ゾーン全体',
                            list:[{text:"ゾーン１",value:"1"},
                                  {text:"ゾーン２",value:"2"},
                                  {text:"ゾーン３",value:"3"},
                                 ]}, 
                   dataName:'zone',
                  },
                  {label:'に'},
                  {options:{default:'うごくもの',
                            list:[{text:"うごくもの",value:"movement"},
                                  {text:"ひと",value:"person"},
                                 ]}, 
                   dataName:'target',
                  },
                  {label:'が　いたら'},
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
          var zone   = valueDataTbl["zone"]();
          var target = valueDataTbl["target"]();
          if(ctx.qims){
              $.when( ctx.qims.service("ALMemory")
              )
              .then(function(alMemory){
                  var keyTbl={
                      "person":{
                          "1":"EngagementZones/PeopleInZone1",
                          "2":"EngagementZones/PeopleInZone2",
                          "3":"EngagementZones/PeopleInZone3",
                      },
                      "movement":{
                          "1":"EngagementZones/LastMovementsInZone1",
                          "2":"EngagementZones/LastMovementsInZone2",
                          "3":"EngagementZones/LastMovementsInZone3",
                      },
                  };
                  alMemory.getData(keyTbl[target][zone]).then(function(v){
                      if(target=="person")
                      {
                          if(v.length>0)
                          {
                              ctx.lastPeopleData.rawData = v[0];
                          }
                      }
                      dfd.resolve(v.length>0);
                  }, onFail);
              }, onFail);
          }
          else{
              dfd.reject();
          }
          return dfd.promise();
      }
    );



    // 素材リスト生成をします
    var materialBoxWs;
    materialBoxWs = blockManager.createBlockWorkSpaceIns("noDroppable","かいわ");
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("talkBlock@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("recoTalk@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("lastRecoWord@basicBlk"));
    materialBoxWsList.push(ko.observable(materialBoxWs));

    materialBoxWs = blockManager.createBlockWorkSpaceIns("noDroppable","うごき");
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("faceMotion@basicBlk"));
    materialBoxWsList.push(ko.observable(materialBoxWs));

    materialBoxWs = blockManager.createBlockWorkSpaceIns("noDroppable","あたい");
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("stringCat@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("stringLst@basicBlk"));
    materialBoxWsList.push(ko.observable(materialBoxWs));

    materialBoxWs = blockManager.createBlockWorkSpaceIns("noDroppable","ながれ");
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("if@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("if_else@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("loop@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("waitNSec@basicBlk"));
    materialBoxWsList.push(ko.observable(materialBoxWs));

    materialBoxWs = blockManager.createBlockWorkSpaceIns("noDroppable","調べる");
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("eq@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("sonarSimple@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("nowTime@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("engagentZone@basicBlk"));
    materialBoxWsList.push(ko.observable(materialBoxWs));
});
