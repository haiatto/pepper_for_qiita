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
    if(!getUrlParameter("cmd"))
    {
    }

    function MyModel() {
        var self = this;
        self.testUrl   = ko.observable("");
        self.result       = ko.observable("");
        if(window.location.href.indexOf("file://")==0){
            self.testUrl("ws://192.168.11.16:8080");
        }else{
            self.testUrl("ws://"+window.location.host);
        }
    };
    ko.applyBindings(new MyModel());
});
