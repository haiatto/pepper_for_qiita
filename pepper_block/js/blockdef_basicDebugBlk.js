
// ★★★★★★★★★★★★★★★★
// デバッグ用の可視化の関連ブロックなど
// ★★★★★★★★★★★★★★★★

//■ ブロックの実装 ■

pepperBlock.registBlockDef(function(blockManager,materialBoxWsList){

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
                      var pixPerMeter = ctx.pixelPerMeter;
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

    // エンゲージメントゾーン可視化ブロック(デバッグ用)
    blockManager.registBlockDef({
          blockOpt:{
              blockWorldId:"engagentZoneDebugView@basicBlk",
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
                            list:[{text:"レイヤー0",value:"0"},{text:"レイヤー1",value:"1"},{text:"レイヤー2",value:"2"},{text:"レイヤー3",value:"3"},{text:"レイヤー4",value:"4"},]}, 
                   dataName:'targetLayer',
                   acceptTypes:['string'],
                  },
                  {label:'にエンゲージメントゾーンを描く'},
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
              var tgtCanvas = tgtCanvasLayers[targetLayerIdx];
              if(tgtCanvas) {
                  var c = tgtCanvas.getContext('2d');
                  var cw = tgtCanvas.width;
                  var ch = tgtCanvas.height;
                  var centerX=cw/2;
                  var centerY=ch/3;
                  var pixPerMeter = 70;
                  var alEngagementZones = ctx.alIns.alEngagementZones;
                  return $.when( alEngagementZones.getFirstLimitDistance(),
                          alEngagementZones.getSecondLimitDistance(),
                          alEngagementZones.getLimitAngle()
                  )
                  .then(function(firstD,secondD,angle){
                      var angleRad = angle/180 * Math.PI;
                      var rOffs = Math.PI/2;
                      $.each([firstD*pixPerMeter,secondD*pixPerMeter],function(k,v){
                          c.beginPath();
                          c.moveTo(centerX, centerY);
                          c.arc(centerX, centerY, v, rOffs-angleRad/2, rOffs+angleRad/2, false);
                          c.lineTo(centerX, centerY);
                          c.stroke();
                      });
                  },function(){
                      console.log("f");
                  }
                  ).then(function()
                  {
                      var keyTbl={
                          "person":[
                              "EngagementZones/PeopleInZone1",
                              "EngagementZones/PeopleInZone2",
                              "EngagementZones/PeopleInZone3",
                          ],
                          "movement":[
                              "EngagementZones/LastMovementsInZone1",
                              "EngagementZones/LastMovementsInZone2",
                              "EngagementZones/LastMovementsInZone3",
                          ],
                      };
                      $.when( 
                          ctx.alIns.alMemory.getData(keyTbl["person"][0]),
                          ctx.alIns.alMemory.getData(keyTbl["person"][1]),
                          ctx.alIns.alMemory.getData(keyTbl["person"][2]),
                          ctx.alIns.alMemory.getData(keyTbl["movement"][0]),
                          ctx.alIns.alMemory.getData(keyTbl["movement"][1]),
                          ctx.alIns.alMemory.getData(keyTbl["movement"][2])
                      )
                      .then(function(p0,p1,p2,m0,m1,m2){
                          var plst = [p0,p1,p2];
                          var mlst = [m0,m1,m2];
                          $.each(mlst,function(k,v)
                          {
                              for(var ii=0; ii < v.length; ii++){
                                  var clusterInfos = v[1];
                                  var cameraPose_InTorsoFrame = v[2];
                                  var cameraPose_InRobotFrame = v[3];
                                  $.each(clusterInfos,function(k,clusterInfo){
                                      var positionOfCog             = clusterInfo[0];
                                      var angularRoi                = clusterInfo[1];
                                      var proportionMovingPixels    = clusterInfo[2];
                                      var meanDistance              = clusterInfo[3];
                                      var realSizeRoi               = clusterInfo[4];
                                      var positionOfAssociatedPoint = clusterInfo[5];
                                      var x = meanDistance * Math.sin(angularRoi[0]);
                                      var y = meanDistance * Math.cos(angularRoi[0]);
                                      c.beginPath();
                                      c.arc((x)*pixPerMeter+centerX, (y)*pixPerMeter+centerY, 3, 0, Math.PI*2, false);
                                      c.stroke();
                                  });
                              }
                          });
                      });
                  }).fail(function(){
                      console.log("f");
                  });
              }
          }
          dfd.resolve();
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

    // 写真可視化ブロック(デバッグ用)
    blockManager.registBlockDef(
      {
          blockOpt:{
              blockWorldId:"imageDebugView@basicBlk",
              color:'orange',
              head:'in',
              tail:'out',
          },
          blockContents:[
              {expressions:[
                  {dropOnly:{default:null,label:"写真"}, 
                   dataName:'srcImage0',
                   acceptTypes:['image'],
                  },
                  {label:'を'},
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
                  {label:'とうめい度'},
                  {string:{default:'255'}, dataName:'alpha',acceptTypes:["number"]},
                  {label:'でX'},
                  {string:{default:'0'}, dataName:'x',acceptTypes:["number"]},
                  {label:'Y'},
                  {string:{default:'0'}, dataName:'y',acceptTypes:["number"]},
                  {label:'に描く'},
              ]}
          ],
      },
      function(ctx,valueDataTbl,scopeBlkObsvTbl){
          var dfd = $.Deferred();
          var targetCanvasIdx = parseInt(valueDataTbl["targetCanvas"]);
          var targetLayerIdx  = parseInt(valueDataTbl["targetLayer"]);
          var tgtCanvas = ctx.debugCanvasList[targetCanvasIdx] && ctx.debugCanvasList[targetCanvasIdx][targetLayerIdx];
          var srcImage0 = valueDataTbl["srcImage0"];
          var x = parseFloat(valueDataTbl["x"]);
          var y = parseFloat(valueDataTbl["y"]);
          var alpha = parseInt(valueDataTbl["alpha"]);
          alpha = Math.min(Math.max(alpha,0),255);
          if(!tgtCanvas) 
          {
              dfd.resolve();
              return dfd.promise();
          }
          if(!srcImage0) 
          {
              dfd.resolve();
              return dfd.promise();
          }
          // 画像をcanvasに
          var c = tgtCanvas.getContext('2d');
          var imageData = c.createImageData(srcImage0.w, srcImage0.h);
          var pixels = imageData.data;
          for (var i=0; i < pixels.length/4; i++) {
                pixels[i*4+0] = srcImage0.pixels[i*4+0];
                pixels[i*4+1] = srcImage0.pixels[i*4+1];
                pixels[i*4+2] = srcImage0.pixels[i*4+2];
                pixels[i*4+3] = alpha;//srcImage0.pixels[i*4+3];
          }
          c.putImageData(imageData, x, y);
/*
var x = x;
var y = y;
var w = srcImage0.w;
var h = srcImage0.h;
c.beginPath();
c.moveTo(x, y);
c.lineTo(x+w, y);
c.lineTo(x+w, y+h);
c.lineTo(x, y+h);
c.lineTo(x, y);
c.stroke();
*/
          dfd.resolve();
          return dfd.promise();
      }
    );

    // 素材リスト生成をします
    var materialBoxWs;
    materialBoxWs = blockManager.createBlockWorkSpaceIns("noDroppable","みえる化");
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("imageDebugView@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("clearDebugView@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("laserSensorDebugView@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("cameraDebugView@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("movementObjCameraDebugView@basicBlk"));
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("engagentZoneDebugView@basicBlk"));
    materialBoxWsList.push(ko.observable(materialBoxWs));
});
