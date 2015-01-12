//
// ペッパーリモコン
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
            3, // Rgb
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

$(function(){
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

        // --  --
        self.textTalkValue = ko.observable();
        self.talk = function(text) 
        {
            if(self.alTextToSpeech)
            {
                self.alTextToSpeech.say(text);
            }
        }

        // --  --
        self.cap = function(text) 
        {
            if(self.cameraIns)
            {
                self.cameraIns.captureImage(function(w,h,data){
                    // 受信したRAWデータをcanvasに
                    var c = resultCanvas = document.getElementById('capImg');
                    var ctx = c.getContext('2d');
                    var imageData = ctx.createImageData(w, h);
                    var pixels = imageData.data;
                    for (var i=0; i < pixels.length/4; i++) {
                        pixels[i*4+0] = data[i*3+0];
                        pixels[i*4+1] = data[i*3+1];
                        pixels[i*4+2] = data[i*3+2];
                        pixels[i*4+3] = 255;
                    }
                    ctx.putImageData(imageData, 0, 0);                    
                });
            }
        }

        //-- -- 
        self.clickHeadCtrlPad = function(data, event)
        {
            var padElm = $('#headCtrlPad');
            if(event.target == padElm[0])
            {
                if(self.alMotion)
                {
                    $('#headCtrlPadPoint').css({
                        top: event.offsetY-5,
                        left:event.offsetX-5
                    });
                    var ratio_x = event.offsetX/padElm.width();
                    var ratio_y = event.offsetY/padElm.height();
                    var name  = ['HeadYaw','HeadPitch'];
                    var angle = [(ratio_x-0.5)*3.14*2,(ratio_y-0.5)*3.14*2];
                    self.alMotion.angleInterpolationWithSpeed(name, angle, 0.4)
                      .fail(function(err){
                          console.log(err);
                      });
                }
            }
        }

    };

    ko.applyBindings(new MyModel());


/*

    function error(err)
    {
      console.error(err);
    }

    var session = new QiSession("192.168.11.17");

    session.socket()
     .on('connect', function () {
      console.log('QiSession connected!');
      // now you can start using your QiSession
    })
     .on('disconnect', function () {
      console.log('QiSession disconnected!');
    });

    session.service("ALTextToSpeech")
    .done(function (tts) {
      // tts is a proxy to the ALTextToSpeech service

      tts.say("あうーあうーあう")
        .done(function (lang) {
           console.log("I speak " + lang);
        })
        .fail(function (error) {
           console.log("An error occurred: " + error);
        });
    })
    .fail(function (error) {
      console.log("An error occurred:", error);
    });

*/


});