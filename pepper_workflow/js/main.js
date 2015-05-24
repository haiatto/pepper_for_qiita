//
// Pepperワークフロー
//

var userAgent  = window.navigator.userAgent.toLowerCase();
var appVersion = window.navigator.appVersion.toLowerCase();
function getUrlParameter(sParam)
{
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) 
    {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) 
        {
            return sParameterName[1];
        }
    }
}

$(function(){
    function MyModel() {
        var self = this;
        if(getUrlParameter("cmd")){
            self.isData = true;
            if(cmd="talk"){
               var txt  = decodeURIComponent(getUrlParameter("txt"));
               var ip   = decodeURIComponent(getUrlParameter("ip"));
               /*
               var qims = new QiSession(ip);
               qims.socket()
               .on('connect', function (aa) {
                    qims.service("ALTextToSpeech")
                    .done(function (tts) {
                        tts.say(txt).done(function(){
                           qims.socket().disconnect();
                        });
                    });
                })
               .on('error', function (aa) {
                });
                */
                var old = window.onload;
                window.onload = function(){

                };
                self.resultJson = ko.observable({});
                var xx=false;
                setTimeout(function(){
                  xx = true;
                  self.resultJson(JSON.stringify({res:'OK '+txt}));
                  if(old)old();
                },1000);
            }else{
               self.resultJson = JSON.stringify({res:'Unknown Cmd'});
            }
        }
        else{
            self.isTest = true;
        }
        self.testUrl   = ko.observable("");
        self.result    = ko.observable("");
    };
    ko.applyBindings(new MyModel());
});
