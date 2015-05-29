

//■ ブロックの実装 ■

pepperBlock.registBlockDef(function(blockManager,materialBoxWsList){

    // 猫を識別ブロック
    blockManager.registBlockDef(
      {
          blockOpt:{
              blockWorldId:"catClassifier@caffeBlk",
              color:'orange',
              head:'value',
              tail:'value',
              types:["bool","number"],
              supportPolling:true,
          },
          blockContents:[
              {expressions:[
                  {label:'この'},
                  {dropOnly:{default:{},label:"画像",},
                   dataName:'image0',
                   acceptTypes:['image'],
                  },
                  {label:'は猫？'},
              ]}
          ],
      },
      function(ctx,valueDataTbl,scopeBlkObsvTbl,pollingValueEndCheckCallback){
          var dfd = $.Deferred();
          var image0 = valueDataTbl["image0"];
          if(!image0 || !image0.pixels){
              dfd.resolve(false);
              return dfd.promise();
          }

          var catServerUrl = "ws://192.168.11.23:8080";

          var ws = new WebSocket(catServerUrl+"/ws_raw");
          ws.binaryType = 'arraybuffer';
          ws.onopen = function() {
              var headArray = new Uint8Array(5);
              headArray[0] = image0.w & 0xFF;
              headArray[1] = (image0.w>>8) & 0xFF;
              headArray[2] = image0.h & 0xFF;
              headArray[3] = (image0.h>>8) & 0xFF;
              headArray[4] = 4;
              var byteArray = new Uint8Array(image0.pixels);
              var sendData = new Uint8Array(headArray.byteLength + byteArray.byteLength);
              sendData.set(headArray, 0);
              sendData.set(byteArray, headArray.byteLength);
              ws.send(sendData.buffer);
          };
          ws.onmessage = function (evt) {
              var data = JSON.parse(evt.data);
              var catCount = 0;
              $.each(data,function(k,v){
                  if ( /cat/.exec(v.class))
                  {
                      catCount++;
                  }
              });
              console.log("-------");
              console.log(data[0].class + data[0].score);
              console.log(data[1].class + data[1].score);
              console.log(data[2].class + data[2].score);

              var result = {bool:false,number:0};
              result.number = catCount;
              if(catCount>3){
                  resTxt = "きっと猫";
                  result.bool = true;
              }else if(catCount>1){
                  resTxt = "たぶん猫";
                  result.bool = true;
              }else{
                  resTxt = "猫じゃない！";
                  result.bool = false;
              }
              ws.close();
              ws = null;
              dfd.resolve(result);
          };
          ws.onerror = function(err) {
              dfd.reject();
              ws.close();
              ws = null;
          };
          return dfd.promise();
      }
    );

    // 素材リスト生成をします
    var materialBoxWs;
    materialBoxWs = blockManager.createBlockWorkSpaceIns("noDroppable","Caffe");
    materialBoxWs.addBlock_CloneDragMode(blockManager.createBlockIns("catClassifier@caffeBlk"));
    materialBoxWsList.push(ko.observable(materialBoxWs));
});
