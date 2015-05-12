

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
                  //deferred不慣れで勘違いした結果のコード。
                  //ここ場面では不要だったけど価値がありそうなので参考のため残してきます
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
                         tss.say(valueDataTbl.talkText0).done(function()
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
                  {string:{default:"あい"},dataName:'text0'},
                  {label:'と'},
                  {string:{default:"うえお"},dataName:'text1'},
              ]},
          ],
      },
      function(ctx,valueDataTbl){
          var dfd = $.Deferred();
          var output = valueDataTbl.text0 + valueDataTbl.text1;
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
          var txtLst=[valueDataTbl.text0, valueDataTbl.text1];
          for(var ii=0; ii < txtLst.length; ii++){
              if(!txtLst[ii]){
                  continue;
              }
              if(txtLst[ii].string_list){
                  output.string_list =
                   output.string_list.concat(txtLst[ii].string_list);
              }
              else{
                  output.string_list.push(txtLst[ii].string);
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
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
          if(valueDataTbl.checkFlag0){
              if(scopeBlkObsvTbl.scope0())
              {
                  // スコープの先頭ブロックのdeferredを呼び出します
                  // (ブロックの返すdeferredは、そのブロックとoutから繋がるブロックが全部resolveしたときresolveになります)
                  return scopeBlkObsvTbl.scope0().deferred();
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
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
          if(valueDataTbl.checkFlag0){
              if(scopeBlkObsvTbl.scope0())
              {
                  // スコープの先頭ブロックのdeferredを呼び出します
                  // (ブロックの返すdeferredは、そのブロックとoutから繋がるブロックが全部resolveしたときresolveになります)
                  return scopeBlkObsvTbl.scope0().deferred();
              }
          }else
          {
              if(scopeBlkObsvTbl.scope1())
              {
                  // スコープの先頭ブロックのdeferredを呼び出します
                  // (ブロックの返すdeferredは、そのブロックとoutから繋がるブロックが全部resolveしたときresolveになります)
                  return scopeBlkObsvTbl.scope1().deferred();
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
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
          // スコープの先頭ブロックからpromiseを返します
          // (ブロックの返すpromissは自身と繋がるフローが全部進めるときにresolveになります)
          var dfd = $.Deferred();

          //無限ループ停止がまだ実装できてないのでひとまずこれで対処
          var cnt = 99;
          var loopFunc = function(){
              //console.log("loop " + cnt);
              if(--cnt<0 || !scopeBlkObsvTbl.scope0()){
                  // ブロックがつながってない場合は即おしまいです
                  // (実行中にブロックが外される場合もあるので毎回をチェックします)
                  dfd.resolve();
              }
              else{
                  var scopeDfd = scopeBlkObsvTbl.scope0().deferred();
                  //↓これだけだと scopeDfd が非同期でない場合、スタックを食い尽くします
                  // scopeDfd.then(
                  //     loopFunc
                  // );
                  if(scopeDfd.state()=="pending"){
                      // ペンディング中なら非同期待ちなのでthenで連結です
                      scopeDfd.then(
                        loopFunc,
                        function(){
                            dfd.reject();
                        }
                      );
                  }
                  else if(scopeDfd.state()=="rejected"){
                      dfd.reject();
                  }
                  else{
                      // ペンディング以外なら
                      setTimeout(loopFunc,0);                       
                  }
              }
          }
          loopFunc();          
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
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
          var dfd = $.Deferred();
          var a = valueDataTbl["valueA"].string || valueDataTbl["valueA"].number;
          var b = valueDataTbl["valueB"].string || valueDataTbl["valueB"].number;
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
                  {string:{default:'1.0'}, dataName:'waitSec',acceptTypes:['string','number'],},
                  {label:'秒 まつ'},
              ]}
          ],
      },
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
          var time = valueDataTbl["waitSec"].string || valueDataTbl["waitSec"].number;
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
                  {options:{default:'正面',
                            list:[{text:"正面",value:"正面"},
                                  {text:"右",value:"右"},
                                  {text:"左",value:"左"},
                                  {text:"上",value:"上"},
                                  {text:"下",value:"下"},
                                 ]}, 
                   dataName:'angle',
                   acceptTypes:['string'],
                  },
                  {label:'に顔を向ける'},
              ]}
          ],
      },
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
          var onFail = function(e) {console.error('fail:' + e);};
          var ratio_x = 0.5;
          var ratio_y = 0.5;
          var name = ['HeadYaw', 'HeadPitch'];
          var DELAY = 0.5;

          switch(valueDataTbl.angle) {
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

    // 障害物避け移動させるブロック
    blockManager.registBlockDef(
      {
          blockOpt:{
              blockWorldId:"navigateTo@basicBlk",
              color:'red',
              head:'in',
              tail:'out'
          },
          blockContents:[
              {expressions:[
                  {label:'前後'},
                  {string:{default:'0.1'}, dataName:'x',acceptTypes:["number"]},
                  {label:'左右'},
                  {string:{default:'0.0'}, dataName:'y',acceptTypes:["number"]},
                  {label:'に物をよけながら進む'},
              ]}
          ],
      },
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
          var x = parseFloat(valueDataTbl.x);
          var y = parseFloat(valueDataTbl.y);
          var dfd = $.Deferred();
          if(ctx.qims){
              ctx.qims.service('ALNavigation').then(
                function(alNavigation){
                  alNavigation.navigateTo(x,y).then(function(){    
                    dfd.resolve();
                  },
                  function(e){
                      ctx.onFail(e);
                      dfd.reject();
                  });
                },
                function(e){
                  ctx.onFail(e);
                  dfd.reject();
                }
              );
          }
          else{
              dfd.reject();
          }
          return dfd.promise();
      }
    );

    // 移動させるブロック
    blockManager.registBlockDef(
      {
          blockOpt:{
              blockWorldId:"moveTo@basicBlk",
              color:'red',
              head:'in',
              tail:'out'
          },
          blockContents:[
              {expressions:[
                  {label:'前後に'},
                  {string:{default:'0.1'}, dataName:'x',acceptTypes:["number"]},
                  {label:'m左右に'},
                  {string:{default:'0.0'}, dataName:'y',acceptTypes:["number"]},
                  {label:'m進みながら'},
                  {string:{default:'0.0'}, dataName:'rot',acceptTypes:["number"]},
                  {label:'度回る'},
              ]}
          ],
      },
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
          var x = parseFloat(valueDataTbl.x);
          var y = parseFloat(valueDataTbl.y);
          var rot = parseFloat(valueDataTbl.rot) / 180 * Math.PI;
          var dfd = $.Deferred();
          if(ctx.qims){
              ctx.qims.service('ALMotion').then(
                function(alMotion){
                  alMotion.moveTo(x,y,rot).then(function(){    
                    dfd.resolve();
                  },
                  function(e){
                      ctx.onFail(e);
                      dfd.reject();
                  });
                },
                function(e){
                  ctx.onFail(e);
                  dfd.reject();
                }
              );
          }
          else{
              dfd.reject();
          }
          return dfd.promise();
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
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
          var dfd = $.Deferred();
          var onFail = function(e) {console.error('fail:' + e);};
          var FRONT_KEY = 'Device/SubDeviceList/Platform/Front/Sonar/Sensor/Value';
          var LIMIT = valueDataTbl["dist"];
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

    // レーザーセンサーブロック
    blockManager.registBlockDef(
      {
          blockOpt:{
              blockWorldId:"laserSensor@basicBlk",
              color:'orange',
              head:'value',
              tail:'value',
              types:["bool"],
          },
          blockContents:[
              {expressions:[
                  {label:'レーザーが正面'},
                  {string:{default:'0.5'}, dataName:'dist',acceptTypes:["number"]},
                  {label:'ｍ内にある'},
              ]}
          ],
      },
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
          var dfd = $.Deferred();
          var onFail = function(e) {console.error('fail:' + e);};
          var keys = [];
          var keyBase = 'Device/SubDeviceList/Platform/LaserSensor/';
          var infoTbl = 
          [{key:'Front/Shovel/',        segNum:3, deg:   0,value:[]},
           {key:'Front/Vertical/Left/', segNum:1, deg:   0,value:[]},
           {key:'Front/Vertical/Right/',segNum:1, deg:   0,value:[]},
           {key:'Front/Horizontal/',    segNum:15,deg:   0,value:[]},
           {key:'Left/Horizontal/',     segNum:15,deg:-90,value:[]},
           {key:'Right/Horizontal/',    segNum:15,deg: 90,value:[]},
          ];
          for(var kbIdx=0; kbIdx < infoTbl.length; kbIdx++){
              for(var ii=1; ii <= infoTbl[kbIdx].segNum; ii++){
                  var segNumber = 'Seg' + ("0" + ii).substr(-2);
                  keys.push(keyBase + infoTbl[kbIdx].key + segNumber + '/X/Sensor/Value');
                  keys.push(keyBase + infoTbl[kbIdx].key + segNumber + '/Y/Sensor/Value');
              }
          }
          if(ctx.qims){
              ctx.qims.service('ALMemory').then(function(alMemory){
                  alMemory.getListData(keys).then(function(values){
                      console.log('value:' + values);
                      var valIdx = 0;
                      for(var kbIdx=0; kbIdx < infoTbl.length; kbIdx++){
                          for(var ii=0; ii < infoTbl[kbIdx].segNum; ii++){
                              infoTbl[kbIdx].value.push({x:values[valIdx],
                                                         y:values[valIdx+1]});
                              valIdx+=2;
                          }
                      }

                      if(ctx.debugCanvasList[0])
                      {
                        var tgtCanvas = ctx.debugCanvasList[0][1];
                        var c = tgtCanvas.getContext('2d')
                        var cw = tgtCanvas.width;
                        var ch = tgtCanvas.height;
                        var centerX=cw/2;
                        var centerY=ch/3;
                        var pixPerMeter = 70;
                        c.clearRect(0, 0, cw, ch);
                        for(var kbIdx=0; kbIdx < infoTbl.length; kbIdx++){
                            var r = infoTbl[kbIdx].deg / 180 * Math.PI;
                            var rOffs = Math.PI/2;
                            $.each([pixPerMeter,pixPerMeter*2,pixPerMeter*3],function(k,v){
                                c.beginPath();
                                c.moveTo(centerX, centerY);
                                c.arc(centerX, centerY, v, r+rOffs-Math.PI/6, r+rOffs+Math.PI/6, false);
                                c.lineTo(centerX, centerY);
                                c.stroke();
                            });
                            for(var ii=0; ii < infoTbl[kbIdx].value.length; ii++){
                                var x = infoTbl[kbIdx].value[ii].x;
                                var y = infoTbl[kbIdx].value[ii].y;
                                var rx = x * Math.cos(r+rOffs) + -y * Math.sin(r+rOffs);
                                var ry = x * Math.sin(r+rOffs) +  y * Math.cos(r+rOffs);
                                c.beginPath();
                                c.arc((rx)*pixPerMeter+centerX, (ry)*pixPerMeter+centerY, 3, 0, Math.PI*2, false);
                                c.stroke();
                            }
                        }
                      }
                      dfd.resolve(true);
                  }, onFail);
              }, onFail);
          } else {
              dfd.reject();
          }
          return dfd.promise();
      }
    );

    //レーザーセンサー可視化ブロック(デバッグ用)
    blockManager.registBlockDef(
      {
          blockOpt:{
              blockWorldId:"laserSensorDebugView@basicBlk",
              color:'orange',
              head:'in',
              tail:'out',
          },
          blockContents:[
              {expressions:[
                  {label:'レーザーセンサーを'},
                  {options:{default:'キャンバス0',
                            list:[{text:"キャンバス0",value:"0"},
                                  {text:"キャンバス1",value:"1"},
                                  {text:"キャンバス2",value:"2"},
                                  {text:"キャンバス3",value:"3"},
                                  {text:"キャンバス4",value:"4"},
                                 ]}, 
                   dataName:'targetCanvas',
                   acceptTypes:['string'],
                  },
                  {options:{default:'レイヤー0',
                            list:[{text:"レイヤー0",value:"0"},
                                  {text:"レイヤー1",value:"1"},
                                  {text:"レイヤー2",value:"2"},
                                  {text:"レイヤー3",value:"3"},
                                  {text:"レイヤー4",value:"4"},
                                 ]}, 
                   dataName:'targetLayer',
                   acceptTypes:['string'],
                  },
                  {label:'に描く'},
              ]}
          ],
      },
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
          var dfd = $.Deferred();
          var targetCanvasIdx = parseInt(valueDataTbl["targetCanvas"]);
          var targetLayerIdx  = parseInt(valueDataTbl["targetLayer"]);
          var tgtCanvas = ctx.debugCanvasList[targetCanvasIdx] && ctx.debugCanvasList[targetCanvasIdx][targetLayerIdx];
          if(!tgtCanvas) 
          {
              dfd.resolve();
              return dfd.promise();
          }
          var onFail = function(e) {console.error('fail:' + e);};
          var keys = [];
          var keyBase = 'Device/SubDeviceList/Platform/LaserSensor/';
          var infoTbl = 
          [{key:'Front/Shovel/',        segNum:3, deg:   0,value:[]},
           {key:'Front/Vertical/Left/', segNum:1, deg:   0,value:[]},
           {key:'Front/Vertical/Right/',segNum:1, deg:   0,value:[]},
           {key:'Front/Horizontal/',    segNum:15,deg:   0,value:[]},
           {key:'Left/Horizontal/',     segNum:15,deg:-90,value:[]},
           {key:'Right/Horizontal/',    segNum:15,deg: 90,value:[]},
          ];
          for(var kbIdx=0; kbIdx < infoTbl.length; kbIdx++){
              for(var ii=1; ii <= infoTbl[kbIdx].segNum; ii++){
                  var segNumber = 'Seg' + ("0" + ii).substr(-2);
                  keys.push(keyBase + infoTbl[kbIdx].key + segNumber + '/X/Sensor/Value');
                  keys.push(keyBase + infoTbl[kbIdx].key + segNumber + '/Y/Sensor/Value');
              }
          }
          if(ctx.qims){
              ctx.qims.service('ALMemory').then(function(alMemory){
                  alMemory.getListData(keys).then(function(values){
                      var valIdx = 0;
                      for(var kbIdx=0; kbIdx < infoTbl.length; kbIdx++){
                          for(var ii=0; ii < infoTbl[kbIdx].segNum; ii++){
                              infoTbl[kbIdx].value.push({x:values[valIdx],
                                                         y:values[valIdx+1]});
                              valIdx+=2;
                          }
                      }
                      
                      var c = tgtCanvas.getContext('2d')
                      var cw = tgtCanvas.width;
                      var ch = tgtCanvas.height;
                      var centerX=cw/2;
                      var centerY=ch/3;
                      var pixPerMeter = 70;
                      //c.clearRect(0, 0, cw, ch);
                      for(var kbIdx=0; kbIdx < infoTbl.length; kbIdx++){
                          var r = infoTbl[kbIdx].deg / 180 * Math.PI;
                          var rOffs = Math.PI/2;
                          $.each([pixPerMeter,pixPerMeter*2,pixPerMeter*3],function(k,v){
                              c.beginPath();
                              c.moveTo(centerX, centerY);
                              c.arc(centerX, centerY, v, r+rOffs-Math.PI/6, r+rOffs+Math.PI/6, false);
                              c.lineTo(centerX, centerY);
                              c.stroke();
                          });
                          for(var ii=0; ii < infoTbl[kbIdx].value.length; ii++){
                              var x = infoTbl[kbIdx].value[ii].x;
                              var y = infoTbl[kbIdx].value[ii].y;
                              var rx = x * Math.cos(r+rOffs) + -y * Math.sin(r+rOffs);
                              var ry = x * Math.sin(r+rOffs) +  y * Math.cos(r+rOffs);
                              c.beginPath();
                              c.arc((rx)*pixPerMeter+centerX, (ry)*pixPerMeter+centerY, 3, 0, Math.PI*2, false);
                              c.stroke();
                          }
                      }
                      dfd.resolve();
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
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
          var dfd = $.Deferred();
          var onFail = function(e) {
              console.error('fail:' + e);};
          var onFailPass = function(e) {
              console.log('fail:' + e); 
              return $.Deferred().resolve();};
          var recoTextVal = valueDataTbl["recoText"];
          var recoTextLst = [];
          if(recoTextVal.string_list){
              recoTextLst = recoTextVal.string_list;
          }
          else{
              recoTextLst.push(recoTextVal.string);
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
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
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
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
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
              supportPolling:true,
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
                   acceptTypes:['string'],
                  },
                  {label:'に'},
                  {options:{default:'うごくもの',
                            list:[{text:"うごくもの",value:"movement"},
                                  {text:"ひと",value:"person"},
                                 ]}, 
                   dataName:'target',
                   acceptTypes:['string'],
                  },
                  {label:'が　いたら'},
              ]}
          ],
      },
      function(ctx,valueDataTbl,scopeBlkObsvTbl,pollingValueEndCheckCallback){
          var dfd = $.Deferred();

          var onFail = function(e) {
              console.error('fail:' + e);};
          var onFailPass = function(e) {
              console.log('fail:' + e); 
              return $.Deferred().resolve();};

          var zone   = valueDataTbl["zone"];
          var target = valueDataTbl["target"];

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
                  var eventKeyTbl={
                      "person":  "EngagementZones/PeopleInZonesUpdated",
                      "movement":"EngagementZones/MovementsInZonesUpdated",
                  };
                  if(pollingValueEndCheckCallback)
                  {
                      ctx.subscribeAlMemoryEvent(eventKeyTbl[target], function(eventDfd, eventKeyValue){
                          console.log("get " + keyTbl[target][zone]);
                          alMemory.getData(keyTbl[target][zone]).then(function(v){
                              var isEnd = false;
                              if(target=="person")
                              {
                                  if(v.length>0)
                                  {
                                      ctx.lastPeopleData.rawData = v[0];
                                  }
                                  if(pollingValueEndCheckCallback(v.length>0))
                                  {
                                      eventDfd.resolve();
                                      dfd.resolve(v.length>0);
                                      return true;
                                  }
                              }
                              if(target == "movement")
                              {
                                  if(v.length>0)
                                  {
                                      ctx.lastMovementData.rawData = v;
                                  }
                                  //console.log("result movement num " + v.length);
                                  if(pollingValueEndCheckCallback(v.length>0))
                                  {
                                      eventDfd.resolve();
                                      dfd.resolve(v.length>0);
                                      return true;
                                  }
                              }
                              return false;
                          }, onFail);
                      })
                      .fail(onFail);
                  }
                  else{
                      //
                      alMemory.getData(keyTbl[target][zone]).then(function(v){
                          if(target=="person")
                          {
                              if(v.length>0)
                              {
                                  ctx.lastPeopleData.rawData = v[0];
                              }
                              dfd.resolve(v.length>0);
                          }
                          if(target == "movement")
                          {
                              if(v.length>0)
                              {
                                  ctx.lastMovementData.rawData = v;
                              }
                              dfd.resolve(v.length>0);
                          }
                      }, onFail);
                  }
              }, onFail);
          }
          else{
              dfd.reject();
          }
          return dfd.promise();
      }
    );

    // 最後に調べた人を返すブロック
    blockManager.registBlockDef(
      {
          blockOpt:{
              blockWorldId:"lastPeopleData@basicBlk",
              color:'orange',
              head:'value',
              tail:'value',
              types:["people"],
          },
          blockContents:[
              {expressions:[
                  {label:'最後に調べた人'}
              ]}
          ],
      },
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
          var dfd = $.Deferred();
          dfd.resolve(ctx.lastPeopleData);
          return dfd.promise();
      }
    );

    // 最後に調べた移動物を返すブロック
    blockManager.registBlockDef(
      {
          blockOpt:{
              blockWorldId:"lastMovementData@basicBlk",
              color:'orange',
              head:'value',
              tail:'value',
              types:["movement"],
          },
          blockContents:[
              {expressions:[
                  {label:'最後に調べたうごくもの'}
              ]}
          ],
      },
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
          var dfd = $.Deferred();
          dfd.resolve(ctx.lastMovementData);
          return dfd.promise();
      }
    );

/*
    //  [ぼくの[領域(ゾーン)]に [うごくもの] がいたら] を待ってすすむ
    //  [頭のタッチが検知された] を待ってすすむ
    //  [頭を触られた]　を待ってすすむ
    //  [頭を触られる]　を待ってすすむ
    // 
    //  [腕をタッチされた] なら
    //   さわりました？としゃべる
    //  [頭をタッチされた]　なら
    //   はわわわわーとしゃべる
    //  [音が鳴った] なら
    //   きこえる？としゃべる
    //  のどれか１つが起こり終るまで待ってすすむ or のどれか１つが起こり終るか[10秒]待ってすすむ

    // ポーリングする為の入力枠の設定を作る
    // この枠はある意味遅延評価的な存在、
    // ブロックのコールバック呼び出し時には値ブロックは評価(deferedの実行)されてない(普通は評価済み)
    // コールバック内で評価(deferedの実行)する
    // 評価(deferedの実行)は、
    //  valueTbl['遅延する入力枠データ名１'].startPolling(pollingValueEndCheckCallback)
    // とする。
    // pollingValueEndCheckCallback には値ブロックの評価結果の値が引数に渡される
    // pollingValueEndCheckCallback は true を返すとポーリング終了。
    // ポーリングをサポートしている値ブロックならば変化時に pollingValueEndCheckCallback が呼ばれる
    // ポーリングをサポートしてない値ブロックならばsetTimeOut(0)で pollingValueEndCheckCallback が呼ばれる

    // 変化検知用値の式(見た目を変えるEVENTと薄ら表示とか雷マークを表示とか…リサイクルっぽいまーく(ポーリングの意味で)？)
    // 受け付けるのは型…boolが多そう
    //  boolなら    [○○] になるのを待って…とか
    //  数値とかなら [10m]以下になるのをまって…とか


    // 集中する？概念？　集中レベル１をセットする　集中レベルを解除する
    // 集中レベルは割り込み概念、集中レベルが低いなら後回しorスルー
    // そんな優先度管理ってわかりやすい？　ある意味ミューテックスとプライオリティ制御の愛の子？ 
*/

    // イベント系ブロックテスト中 ブロック
    blockManager.registBlockDef(
      {
          blockOpt:{
              blockWorldId:"eventWaitForward@basicBlk",
              color:'orange',
              head:'in',
              tail:'out',
          },
          blockContents:[
              {expressions:[
                  {bool:{default:false}, dataName:"waitFlag0", forPolling:true },
                  {label: 'を待ってすすむ'},
              ]}
          ],
      },
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
          var dfd = $.Deferred();          
          valueDataTbl["waitFlag0"].startPolling(function(value){
              if(value){
                  return true;
              }
              return false;
          })
          .then(
              function(){
                  dfd.resolve();
              },
              function(){
                  dfd.reject();
              }
          );
          return dfd.promise();
      }
    );


    // カメラ可視化ブロック(デバッグ用)
    blockManager.registBlockDef({
          blockOpt:{
              blockWorldId:"clearDebugView@basicBlk",
              color:'orange',
              head:'in',
              tail:'out',
          },
          blockContents:[
              {expressions:[
                  {options:{default:'キャンバス0',
                            list:[{text:"キャンバス0",value:"0"},{text:"キャンバス1",value:"1"},{text:"キャンバス2",value:"2"},{text:"キャンバス3",value:"3"},{text:"キャンバス4",value:"4"},]}, 
                   dataName:'targetCanvas',
                   acceptTypes:['string'],
                  },
                  {options:{default:'レイヤー全部',
                            list:[{text:"レイヤー全部",value:"-1"},{text:"レイヤー0",value:"0"},{text:"レイヤー1",value:"1"},{text:"レイヤー2",value:"2"},{text:"レイヤー3",value:"3"},{text:"レイヤー4",value:"4"},]}, 
                   dataName:'targetLayer',
                   acceptTypes:['string'],
                  },
                  {label:'をクリアする'},
              ]}
          ],
      },
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
          var dfd = $.Deferred();
          var targetCanvasIdx = parseInt(valueDataTbl["targetCanvas"]);
          var targetLayerIdx  = parseInt(valueDataTbl["targetLayer"]);
          var tgtCanvasLayers = ctx.debugCanvasList[targetCanvasIdx];
          if(tgtCanvasLayers)
          {
              if(targetLayerIdx<0){
                  $.each(tgtCanvasLayers,function(k,tgtCanvas)
                  {
                      if(tgtCanvas) {
                          var c = tgtCanvas.getContext('2d');
                          var cw = tgtCanvas.width;
                          var ch = tgtCanvas.height;
                          c.clearRect(0, 0, cw, ch);
                      }
                  });
              }
              else{
                  var tgtCanvas = tgtCanvasLayers[targetLayerIdx];
                  if(tgtCanvas) {
                      var c = tgtCanvas.getContext('2d');
                      var cw = tgtCanvas.width;
                      var ch = tgtCanvas.height;
                      c.clearRect(0, 0, cw, ch);
                  }
              }
          }
          dfd.resolve();
          return dfd.promise();
      }
    );

    // カメラ可視化ブロック(デバッグ用)
    blockManager.registBlockDef(
      {
          blockOpt:{
              blockWorldId:"cameraDebugView@basicBlk",
              color:'orange',
              head:'in',
              tail:'out',
          },
          blockContents:[
              {expressions:[
                  {options:{default:'上のカメラ',
                            list:[{text:"上のカメラ",value:"top"},
                                  {text:"下のカメラ",value:"bottom"},
                                  {text:"奥行カメラ",value:"depth"},
                                  ]}, 
                   dataName:'srcCamera',
                   acceptTypes:['string'],
                  },
                  {label:'でキャプチャして'},
                  {options:{default:'キャンバス0',
                            list:[{text:"キャンバス0",value:"0"},{text:"キャンバス1",value:"1"},{text:"キャンバス2",value:"2"},{text:"キャンバス3",value:"3"},{text:"キャンバス4",value:"4"},]}, 
                   dataName:'targetCanvas',
                   acceptTypes:['string'],
                  },
                  {options:{default:'レイヤー0',
                            list:[{text:"レイヤー0",value:"0"},{text:"レイヤー1",value:"1"},{text:"レイヤー2",value:"2"},{text:"レイヤー3",value:"3"},{text:"レイヤー4",value:"4"},]}, 
                   dataName:'targetLayer',
                   acceptTypes:['string'],
                  },
                  {label:'に描く'},
              ]}
          ],
      },
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
          var dfd = $.Deferred();
          var targetCanvasIdx = parseInt(valueDataTbl["targetCanvas"]);
          var targetLayerIdx  = parseInt(valueDataTbl["targetLayer"]);
          var tgtCanvas = ctx.debugCanvasList[targetCanvasIdx] && ctx.debugCanvasList[targetCanvasIdx][targetLayerIdx];
          if(!tgtCanvas) 
          {
              dfd.resolve();
              return dfd.promise();
          }
          var onFail = function(e) {console.error('fail:' + e);};
          if(ctx.qims){
              var cbCamDraw = function(w,h,data){
                // 受信したRAWデータをcanvasに
                var cw = tgtCanvas.width;
                var ch = tgtCanvas.height;
                var c = tgtCanvas.getContext('2d');
                var imageData = c.createImageData(w, h);
                var pixels = imageData.data;
                for (var i=0; i < pixels.length/4; i++) {
                    pixels[i*4+0] = data[i*3+0];
                    pixels[i*4+1] = data[i*3+1];
                    pixels[i*4+2] = data[i*3+2];
                    pixels[i*4+3] = 255;
                }
                c.putImageData(imageData, 0, 0);
                dfd.resolve();
              };
              if(valueDataTbl["srcCamera"]=="top")
              {
                ctx.pepperCameraTopIns.captureImage( cbCamDraw );
              }
              if(valueDataTbl["srcCamera"]=="bottom")
              {
                ctx.pepperCameraBottomIns.captureImage( cbCamDraw );
              }
              if(valueDataTbl["srcCamera"]=="depth")
              {
                ctx.pepperCameraDepthIns.captureImage( cbCamDraw );
              }
          } else {
              dfd.reject();
          }
          return dfd.promise();
      }
    );

    // 移動物のカメラ内矩形の可視化ブロック(デバッグ用)
    blockManager.registBlockDef(
      {
          blockOpt:{
              blockWorldId:"movementObjCameraDebugView@basicBlk",
              color:'orange',
              head:'in',
              tail:'out',
          },
          blockContents:[
              {expressions:[
                  {label:'最後に調べたうごくものを'},
                  {options:{default:'キャンバス0',
                            list:[{text:"キャンバス0",value:"0"},{text:"キャンバス1",value:"1"},{text:"キャンバス2",value:"2"},{text:"キャンバス3",value:"3"},{text:"キャンバス4",value:"4"},]}, 
                   dataName:'targetCanvas',
                   acceptTypes:['string'],
                  },
                  {options:{default:'レイヤー0',
                            list:[{text:"レイヤー0",value:"0"},{text:"レイヤー1",value:"1"},{text:"レイヤー2",value:"2"},{text:"レイヤー3",value:"3"},{text:"レイヤー4",value:"4"},]}, 
                   dataName:'targetLayer',
                   acceptTypes:['string'],
                  },
                  {label:'にカメラの視界で描く'},
              ]}
          ],
      },
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
          var dfd = $.Deferred();
          var targetCanvasIdx = parseInt(valueDataTbl["targetCanvas"]);
          var targetLayerIdx  = parseInt(valueDataTbl["targetLayer"]);
          var tgtCanvas = ctx.debugCanvasList[targetCanvasIdx] && ctx.debugCanvasList[targetCanvasIdx][targetLayerIdx];
          if(!tgtCanvas) 
          {
              dfd.resolve();
              return dfd.promise();
          }
          var onFail = function(e) {console.error('fail:' + e);};
          if(ctx.qims){
              if(ctx.lastMovementData.rawData)
              {
                  var c = tgtCanvas.getContext('2d');
                  //MovementInfo =
                  //[
                  //  TimeStamp,
                  //  [ClusterInfo_1, ClusterInfo_2, ... ClusterInfo_n],
                  //  CameraPose_InTorsoFrame,
                  //  CameraPose_InRobotFrame,
                  //  Camera_Id
                  //]
                  var CamImageW = 320;
                  var CamImageH = 240;
                  var timeStamp    = ctx.lastMovementData.rawData[0];
                  var ClusterInfos = ctx.lastMovementData.rawData[1];
                  var CameraPose_InTorsoFrame = ctx.lastMovementData.rawData[2];
                  var CameraPose_InRobotFrame = ctx.lastMovementData.rawData[3];
                  var Camera_Id = ctx.lastMovementData.rawData[4];
                  if(Camera_Id==2)
                  {
                      // depthカメラが使用されている場合はここに来ます
                      $.each(ClusterInfos,function(k,clusterInfo){
                          var PositionOfCog             = clusterInfo[0];
                          var AngularRoi                = clusterInfo[1];
                          var ProportionMovingPixels    = clusterInfo[2];
                          var MeanDistance              = clusterInfo[3];
                          var RealSizeRoi               = clusterInfo[4];
                          var PositionOfAssociatedPoint = clusterInfo[5];                          
                          $.when( ctx.qims.service("ALVideoDevice")
                          ).then(function(alVideoDevice){
                              alVideoDevice.getImageInfoFromAngularInfo(
                                  Camera_Id,
                                  AngularRoi
                              ).then(function(info){
                                  var x = info[0] * CamImageW;
                                  var y = info[1] * CamImageH;
                                  var w = info[2] * CamImageW;
                                  var h = info[3] * CamImageH;
                                  c.beginPath();
                                  c.moveTo(x, y);
                                  c.lineTo(x+w, y);
                                  c.lineTo(x+w, y+h);
                                  c.lineTo(x, y+h);
                                  c.lineTo(x, y);
                                  c.stroke();
                              })
                          });
                          /*
                          var x = CamImageW/2 - AngularRoi[0] * CamImageW;
                          var y = CamImageH/2 - AngularRoi[1] * CamImageH;
                          var w = AngularRoi[2] * CamImageW;
                          var h = AngularRoi[3] * CamImageH;
                          c.beginPath();
                          c.moveTo(x, y);
                          c.lineTo(x+w, y);
                          c.lineTo(x+w, y+h);
                          c.lineTo(x, y+h);
                          c.lineTo(x, y);
                          c.stroke();
                          */
                      });
                  }
              }
              dfd.resolve();
          } else {
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
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("navigateTo@basicBlk"));    
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("moveTo@basicBlk"));    
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
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("eventWaitForward@basicBlk"));
    materialBoxWsList.push(ko.observable(materialBoxWs));

    materialBoxWs = blockManager.createBlockWorkSpaceIns("noDroppable","調べる");
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("eq@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("sonarSimple@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("laserSensor@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("nowTime@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("engagentZone@basicBlk"));
    materialBoxWsList.push(ko.observable(materialBoxWs));

    materialBoxWs = blockManager.createBlockWorkSpaceIns("noDroppable","ひと・もの");
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("lastPeopleData@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("lastMovementData@basicBlk"));
    materialBoxWsList.push(ko.observable(materialBoxWs));

    materialBoxWs = blockManager.createBlockWorkSpaceIns("noDroppable","みえる化");
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("clearDebugView@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("laserSensorDebugView@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("cameraDebugView@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("movementObjCameraDebugView@basicBlk"));
    materialBoxWsList.push(ko.observable(materialBoxWs));
});
