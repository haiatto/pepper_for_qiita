//
// 深窓のペッパー
//

$(function(){
    function MyModel() {
        var self = this;
        self.catServerUrl = ko.observable("ws://192.168.11.16:8080/ws");
        self.imageUrl     = ko.observable("http://www.widewallpapers.ru/mod/cats/1280x800/wide-wallpaper-1280x800-007.jpg");
        self.result       = ko.observable("");
        self.resultData   = ko.observable({});
        self.drawImage = function()
        {
            var image = new Image();
            image.crossOrigin="anonymous";
            image.src = self.imageUrl();
            image.onload = function() {
                var canvas = $("#canvas")[0];
                $(canvas).attr({width:image.width,height:image.height});
                var ctx = canvas.getContext('2d');                
                ctx.drawImage(image, 0, 0);
            };
        };
        self.drawImage();
        self.imageUrl.subscribe(function(){
            self.drawImage();
        });
        self.classifier   = function()
        {
            var ws = new WebSocket(self.catServerUrl());
            ws.binaryType = 'arraybuffer';
            ws.onopen = function() {
                var canvas = $("#canvas")[0];
                var ctx = canvas.getContext('2d');
                var data = ctx.getImageData(0, 0, canvas.width,canvas.height).data;
                var byteArray = new Uint8Array(data);
                ws.send(byteArray.buffer);
                //ws.send(self.imageUrl()); 
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
                var resTxt = "";
                if(catCount>3){
                    resTxt = "きっと猫";
                }else if(catCount>1){
                    resTxt = "たぶん猫";
                }else{
                    resTxt = "猫じゃない！";
                }
                self.result(resTxt);
                self.resultData(data);
            };
        };
    };
    ko.applyBindings(new MyModel());
});