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
            self.resultJson = JSON.stringify({key:'valueee'});
        }
        else{
            self.isTest = true;
        }
        self.testUrl   = ko.observable("");
        self.result    = ko.observable("");
    };
    ko.applyBindings(new MyModel());
});
