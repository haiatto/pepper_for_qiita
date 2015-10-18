//
// ペッパー商人
//


// Cocosのリソース
var res = {
    HelloWorld_png : "cocos_res/HelloWorld.png",
    frame01_png : "cocos_res/frame01.png",
    cmdblock_frame01_png : "cocos_res/cmdblock_frame01.png",
    pepper_icone_png : "cocos_res/pepper-icone.png",
};
var preload_res = [];
for (var i in res) {
    preload_res.push(res[i]);
}

//
var ShouninCore = function(){
    var self = this;
    
    self.curCmdBlk = null;

    var getCurCmdBlkWorldId_ = function(){
        if ( self.curCmdBlk ){
            return self.curCmdBlk.getHeaderTemplate().blockWorldId;
        }
        return null;
    };

    //
    var listenerLst_ = [];
    self.notifyUpdate = function()
    {
        $.each(listenerLst_,function(k,listener){
            if(listener.shouninCoreUpdate)
            {
                listener.shouninCoreUpdate();
            }
        });
    };
    self.addListener = function(instance)
    {
        listenerLst_.push(instance);
    };
    self.removeListener = function(instance)
    {
        var idx = listenerLst_.indexOf(instance);
        if(idx>=0){
            listenerLst_.splice(idx,1);
        }
    };

    //
    self.setCurCmdBlk = function(cmdBlk)
    {
        self.curCmdBlk = cmdBlk;
        var blkWId = getCurCmdBlkWorldId_();
        if("talk@shonin" == blkWId)
        {
            self.notifyUpdate();
        }
        if("pose@shonin" == blkWId)
        {
            self.notifyUpdate();
        }
    };

    //
    self.getTalkText = function(text)
    {
        var blkWId = getCurCmdBlkWorldId_();
        if("talk@shonin" == blkWId) {
            return self.curCmdBlk.getValueInData("talkLabel0").string;
        }
        return "";
    };
    self.updateTalkText = function(text)
    {
        var blkWId = getCurCmdBlkWorldId_();
        if("talk@shonin" == blkWId) {
            return self.curCmdBlk.setValueInData("talkLabel0",{string:text});
        }
        self.notifyUpdate();
    };

    // 
    self.isPoseEdit = function()
    {
        var blkWId = getCurCmdBlkWorldId_();
        if("pose@shonin" == blkWId) {
            return true;
        }
        return false;
    };
    self.getPoseEditData = function()
    {//TODO:参照先はそのうちリソースボックス的な所からのデータの編集に書き換わる予定
        var blkWId = getCurCmdBlkWorldId_();
        if("pose@shonin" == blkWId) {
            return self.curCmdBlk.getValueInData("poseData0");
        }
        return null;
    };
    self.setPoseEditData = function(poseEditData)
    {
        var blkWId = getCurCmdBlkWorldId_();
        if("pose@shonin" == blkWId) {
            return self.curCmdBlk.setValueInData("poseData0",poseEditData);
        }
        return null;
    };

};
var ShouninCoreIns = new ShouninCore();


// ブロックの生成とかを管理します
// (表示は一切扱いません。それはブロック単体の管理とそれを扱う側が管理してます)
// (ブロック間のリンクも管理しません。それはBlockManagerがやってます。)
var CommandBlockManager = function()
{
    var self = this;

    // ブロックマネージャーの生成をします    
    self.blockManager = new BlockManager({});
    self.materialWsLst = [];
    self.cmdBlockTbl = {};

    // ブロック定義を登録します
    pepperBlock.runRegisterBlock(
        self.blockManager, 
        self.materialWsLst
    );

    // ブロックを生成します(生成するだけ。表示等はどこかに登録された後、そこがやります)
    self.createCommandBlock = function(blockWorldId)
    {
        var blkIns  = self.blockManager.createBlockIns(blockWorldId);
        var cmdBlk  = new CommandBlock(blkIns);
        self.cmdBlockTbl[blkIns] = cmdBlk;
        return cmdBlk;
    };
    // 
    self.createCommandBlockByBlockIns = function(blkIns)
    {
    };
    //
    self.lookupCommandBlock = function(blkIns)
    {
        return  self.cmdBlockTbl[blkIns];
    };
};

// ブロック単体を管理します。扱うのは主に表示やUI操作などです。
// (ブロック間のリンクやスコープの接続先などの管理は一切やりません。それは外の管理がやります)
var CommandBlock = function(blkIns)
{
    var self = this;
    var visualTempl = blkIns.blockTemplate.blockVisual;

    self.blkIns = blkIns;
    
    // 余り構造を隠しすぎる隠蔽は好きじゃないけど、不便なのでアクセサ系を定義します
    self.getHeaderTemplate = function(){
        return self.blkIns.getTemplate().blockHeader;
    };
    self.getVisibleTemplate = function(){
        return self.blkIns.getTemplate().blockVisual;
    };

    self.deferred = function(){
        return self.blkIns.deferred();
    };

    self.setValueInData = function(key,value){
        self.blkIns.setValueInData(key,value);
    };
    self.getValueInData = function(key){
        return self.blkIns.getValueInData(key);
    };

    self.bg       = cc.Scale9Sprite.create(res.cmdblock_frame01_png);
    self.label    = cc.LabelTTF.create("", "Arial", 20);
    self.parentUI = null;

    // イベントリスナー
    var click = function()
    {
        //エディタ開くとかカレントにする
        ShouninCoreIns.setCurCmdBlk(self); 
        //self.blkIns.deferred();
    }
    cc.eventManager.addListener({
        event: cc.EventListener.TOUCH_ONE_BY_ONE,
        onTouchBegan: function(touch, event) {
            if (cc.rectContainsPoint(self.bg.getBoundingBoxToWorld(), touch.getLocation())) {
                click();
                return true;
            }
            return false;
        },
        onTouchMoved: function(touch, event) {
        }
    }, self.bg);

    //
    self.setParentUI = function(parentUI)
    {
        if(self.parentUI == parentUI){
            return;
        }
        if(self.parentUI){
            self.parentUI.removeChild(self.bg);
            self.parentUI.removeChild(self.label, 1);
        }
        self.parentUI = parentUI;
        self.parentUI.addChild(self.bg);
        self.parentUI.addChild(self.label, 1);
    }


    self.setPosition = function(x,y)
    {
        self.bg   .setPosition   (x,y);
        self.label.setPosition   (x,y);
    };

    self.setSize = function(w,h)
    {
        self.bg.setContentSize(w,h);
    };

    self.getSize = function(){
        return self.bg.getContentSize();
    };

    self.setLabel = function(text){
        self.label.setString(text);
        var lblSize = self.label.getContentSize();
        self.setSize(Math.max(lblSize.width,64),
                     Math.max(lblSize.height,32));
    };

    self.setLabel( visualTempl.disp_name );
    self.setPosition(0,0);
    self.setSize(64,32);
};


// 複数のブロックを管理します。
// レイアウトを整えたりするお仕事をやります。
// また、実行の起点を扱ったりもします。
var CommandBlockWorkSpace = function(layer, commandBlockManager)
{
    var self = this;

    self.cmdBlkMan = commandBlockManager;
    self.cmdBlockLumpList = [];

    var layout = ccui.Layout.create();
    layout.setBackGroundImage(res.frame01_png);
    layout.setBackGroundImageScale9Enabled(true);
    layout.setClippingEnabled(true);
    layer.addChild(layout);

    self.setPosition = function(x,y)
    {
        layout.setPosition(x,y);
    };
    self.setSize = function(w,h)
    {
        layout.setContentSize(w,h);    
    };

    self.updateLayout = function()
    {
        var size = layout.getContentSize();
        var x = 0;
        var y = size.height;
        $.each(self.cmdBlockLumpList,function(idx, cmdBlkLump)
        {
            var recv = function(cmdBlk)
            {
                cmdBlk.setParentUI(layout);
                
                var blkSize = cmdBlk.getSize();
                cmdBlk.setPosition( 
                    x + blkSize.width /2, 
                    y - blkSize.height/2 
                );
                y -= blkSize.height;

                $.each(cmdBlk.blkIns.scopeOutTbl,function(idx2,scopeOut)
                {
                    if(scopeOut.block)
                    {
                        recv( self.cmdBlkMan.lookupCommandBlock( scopeOut.block ) );
                    }
                });
                if(cmdBlk.blkIns.out)
                { 
                    if(cmdBlk.blkIns.out.block)
                    {
                        recv( self.cmdBlkMan.lookupCommandBlock( cmdBlk.blkIns.out.block ) );
                    }
                }
            };
            recv(cmdBlkLump);
            y -= 10;
        });
    };

    self.addCommandLumpBlock = function(blkLumpTop)
    {
        self.cmdBlockLumpList.push(blkLumpTop);
    };
};

// -- --

//
var MainLayer = cc.Layer.extend({
    ctor:function () {
        this._super();
        var self = this;
        var size = cc.director.getWinSize();
/*
        var sprite = cc.Sprite.create(res.HelloWorld_png);
        sprite.setPosition(size.width / 2, size.height / 2);
        sprite.setScale(0.8);
        //self.addChild(sprite, 0);

        var label = cc.LabelTTF.create("Hello World", "Arial", 40);
        label.setPosition(size.width / 2, size.height / 2);
        self.addChild(label, 1);
*/
        var widgetSize = size;
/*
        var textButton = ccui.Button.create()
        textButton.setTouchEnabled(true)
    //  textButton.loadTextures("cocosui/backtotopnormal.png", "cocosui/backtotoppressed.png", "")
        textButton.setTitleText("Text Button")
        textButton.setPosition(cc.p(widgetSize.width / 2.0, widgetSize.height / 2.0))
        textButton.addTouchEventListener(function(){
        })        
        self.addChild(textButton);

        var bg = cc.Scale9Sprite.create(res.HelloWorld_png);
        var editBox = cc.EditBox.create(cc.size(size.width, 80), bg);
        editBox.setPosition(cc.p(size.width/2, 80/2));
        editBox.setDelegate(this);
        this.addChild(editBox);
*/
        function TalkTextBox(layer){
            var self = this;
            var bg = cc.Scale9Sprite.create(res.frame01_png);
            var editBox = cc.EditBox.create(cc.size(size.width, 80), bg);
            editBox.fontColor = new cc.Color(0,0,0,255);
            editBox.setPosition(cc.p(size.width/2, 80/2));
            editBox.setDelegate(self);
            layer.addChild(editBox);
            //
            self.setTalkText = function(text)
            {
                editBox.string = text;
            },
            self.getTalkText = function()
            {
                return editBox.string;
            };
            //
            self.shouninCoreUpdate = function()
            {
                self.setTalkText( ShouninCoreIns.getTalkText() );
            };
            self.editBoxTextChanged = function(sender,text)
            {
                ShouninCoreIns.updateTalkText(sender.string);
            };
            self.editBoxReturn = function(sender)
            {
                ShouninCoreIns.updateTalkText(sender.string);
            };
            // 
            ShouninCoreIns.addListener(self);
        };
        self.talkTextBox = new TalkTextBox(self);


        //bg.setScale(2.8);
//        bg.setAnchorPoint(0.0,0.0);
//        bg.setPosition(160, 0);
//        bg.setContentSize(size.width-320, 128);
//        this.addChild(bg);


        var widget = ccui.Widget.create();
        var layout = ccui.Layout.create();
        
        //layout.setAnchorPoint(0.0,0.0);
        layout.setPosition(160, 200);
        layout.setContentSize(128, 150);
        layout.setBackGroundImage(res.frame01_png);
        layout.setBackGroundImageScale9Enabled(true);
        layout.setClippingEnabled(true);
        this.addChild(layout);

        var sprite = cc.Sprite.create(res.HelloWorld_png);
        sprite.setPosition(size.width / 2, size.height / 2);
        sprite.setScale(0.8);
        layout.addChild(sprite, 0);


/*
        {name: "Panel", object: ccui.Layout, handle: parser.LayoutAttributes},
        {name: "Button", object: ccui.Button, handle: parser.ButtonAttributes},
        {name: "CheckBox", object: ccui.CheckBox, handle: parser.CheckBoxAttributes},
        {name: "ImageView", object: ccui.ImageView, handle: parser.ImageViewAttributes},
        {name: "LabelAtlas", object: ccui.TextAtlas, handle: parser.TextAtlasAttributes},
        {name: "LabelBMFont", object: ccui.TextBMFont, handle: parser.TextBMFontAttributes},
        {name: "Label", object: ccui.Text, handle: parser.TextAttributes},
        {name: "ListView", object: ccui.ListView, handle: parser.ListViewAttributes},
        {name: "LoadingBar", object: ccui.LoadingBar, handle: parser.LoadingBarAttributes},
        {name: "PageView", object: ccui.PageView, handle: parser.PageViewAttributes},
        {name: "ScrollView", object: ccui.ScrollView, handle: parser.ScrollViewAttributes},
        {name: "Slider", object: ccui.Slider, handle: parser.SliderAttributes},
        {name: "TextField", object: ccui.TextField, handle: parser.TextFieldAttributes}
*/
        return true;
    },
});

var BlockLayer = cc.Layer.extend({
    ctor:function () {
        this._super();
        var self = this;

        var cmdBlkMan = new CommandBlockManager();

        var workSpace = new CommandBlockWorkSpace(self,cmdBlkMan);
        
        var size = cc.director.getWinSize();

        var frameX = 0;
        var frameY = size.height/4;
        var frameW = 160;
        var frameH = size.height/2;
        
        workSpace.setPosition(frameX,frameY);
        workSpace.setSize    (frameW,frameH);

        /*
        var layout = ccui.Layout.create();
        layout.setPosition   (frameX,frameY);
        layout.setContentSize(frameW,frameH);
        //layout.setAnchorPoint(0.0,0.0);
        layout.setBackGroundImage(res.frame01_png);
        layout.setBackGroundImageScale9Enabled(true);
        layout.setClippingEnabled(true);
        this.addChild(layout);
        */

        var makeAddCommandBlockBtn = function(x,y,text,cb)
        {
            var btn = ccui.Button.create();
            btn.setTouchEnabled(true);
            btn.setScale9Enabled(true);
            btn.loadTextures(res.cmdblock_frame01_png, null, null);
            btn.setTitleText(text);
            btn.setPosition(cc.p(x,y));
            btn.setSize(cc.size(64, 32));
            btn.addTouchEventListener(cb);        
            self.addChild(btn);
        };

        makeAddCommandBlockBtn(128,size.height-32,"会話",function(button,type){
            if(type==0)
            {
                var cmdBlk = cmdBlkMan.createCommandBlock("talk@shonin");
                workSpace.addCommandLumpBlock( cmdBlk );
                workSpace.updateLayout();
            }
        });
        makeAddCommandBlockBtn(128,size.height-64,"ポーズ",function(button,type){
            if(type==0)
            {
                var cmdBlk = cmdBlkMan.createCommandBlock("pose@shonin");

                var cmdBlk2 = cmdBlkMan.createCommandBlock("pose@shonin");

                cmdBlk.blkIns.connectOut(cmdBlk2.blkIns);

                workSpace.addCommandLumpBlock(cmdBlk);
                workSpace.updateLayout();
            }
        });
/*
        makeAddCommandBlockBtn(128,size.height-96,"振り向き",function(button,type){
            if(type==0)
            {
                var blk = new CommandBlock();
                blk.setLabel("振り向き");            
                workSpace.addCommandBlock(blk);
                workSpace.updateLayout();
            }
        });
        makeAddCommandBlockBtn(128,size.height-128,"Gotoラベル",function(button,type){
            if(type==0)
            {
                var blk = new CommandBlock();
                blk.setLabel("Gotoラベル");            
                workSpace.addCommandBlock(blk);
                workSpace.updateLayout();
            }
        });
*/
        return true;
    },
});

var PepperLayer = cc.Layer.extend({
    pepperModel:null,
    ctor:function () {
        this._super();
        var self = this;        
        var size = cc.director.getWinSize();

        var sprite = cc.Sprite.create(res.pepper_icone_png);
        sprite.setPosition(size.width / 2, size.height / 2);
        var qq = sprite.getQuad();
        self.addChild(sprite, 0);

        //Threejsによるペッパー君描画
        if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

        var PepperModel = function(){
            //
            var self = this;
            
            //self.joints = joints;
            //self.links  = links;
            //self.daeTbl = daeTbl;
            //self.jointObjTbl = {};
            //self.linkObjTbl  = {};

            self.setJointAngle = function(jointName,angleDeg)
            {
                var jointObj = self.jointObjTbl[jointName];
                if(jointObj){
                    var angleRad = THREE.Math.degToRad(angleDeg);
                    var obj3d = jointObj.obj3d;
                    var q = new THREE.Quaternion();
                    angleRad = THREE.Math.clamp(angleRad, jointObj.src.limit.lower, jointObj.src.limit.upper);
                    q.setFromAxisAngle( jointObj.src.axis.xyz, -angleRad );
                    obj3d.quaternion.copy(q);
                    obj3d.updateMatrix();
                }
            };
            self.getJointAngle = function(jointName)
            {
                if(self.jointObjTbl[jointName]){
                }
                return null;
            };
            self.loadDfd = function()
            {
                var dfdTop = $.Deferred();

                var loader = new THREE.ColladaLoader();
                loader.options.convertUpAxis = true;

                var daeFileLst=[
                "HeadPitch.dae","HeadYaw.dae",
                "HipPitch.dae","HipRoll.dae",
                "KneePitch.dae",
                "LElbowRoll.dae","LElbowYaw.dae",
                "LShoulderPitch.dae","LShoulderRoll.dae","LWristYaw.dae",
                "RElbowRoll.dae","RElbowYaw.dae",
                "RShoulderPitch.dae","RShoulderRoll.dae","RWristYaw.dae",
                "Torso.dae",
                "WheelB.dae","WheelFL.dae","WheelFR.dae",
                "LFinger11.dae","LFinger12.dae","LFinger13.dae","LFinger21.dae",
                "LFinger22.dae","LFinger23.dae","LFinger31.dae","LFinger32.dae",
                "LFinger33.dae","LFinger41.dae","LFinger42.dae","LFinger43.dae",
                "LThumb1.dae","LThumb2.dae",
                "RFinger11.dae","RFinger12.dae","RFinger13.dae","RFinger21.dae",
                "RFinger22.dae","RFinger23.dae","RFinger31.dae","RFinger32.dae",
                "RFinger33.dae","RFinger41.dae","RFinger42.dae","RFinger43.dae",
                "RThumb1.dae","RThumb2.dae",
                ];

                var daeTbl = {};
                var loadFunc = function(name){
                    return function(){
                        var dfd = $.Deferred();
                        loader.load( './PepperResource/pepper_meshes/meshes/1.0/'+name, function ( collada ) {
                            dae = collada.scene;
                            dae.traverse( function ( child ) {
                                if ( child instanceof THREE.SkinnedMesh ) {
                                    var animation = new THREE.Animation( child, child.geometry.animation );
                                    animation.play();
                                }
                            } );
                            dae.scale.x = dae.scale.y = dae.scale.z = 1.000;
                            dae.updateMatrix();
                            daeTbl[name] = dae;
                            dfd.resolve();
                        } );
                        return dfd;
                    };
                };

                var dfd = dfdTop;

                // colladaモデルのロード
                $.each(daeFileLst,function(k,v){
                    dfd = dfd.then(loadFunc(v));
                });
                // urdf(Rosから頂いたPepperロボモデル定義ファイル)のロード
                dfd = 
                dfd.then(function(){return $.ajax({
                      type: 'GET',
                      url: "./PepperResource/pepper_description/urdf/pepper1.0_generated_urdf/pepper.xml",
                      dataType: 'xml',
                      success: function(data) {
                      }
                    });
                })
                // urdfをもとに構築
                .then(function(xml){
                    var joints={};
                    var links={};
                    var str2Vec3 = function(str){
                        var v = str.split(" ");
                        return new THREE.Vector3(
                            parseFloat(v[0]),
                            parseFloat(v[2]),
                            parseFloat(v[1])
                        );
                    };
                    $("joint",xml).each(function(k,elm_){
                        var elm = $(elm_);
                        var data = {
                        };
                        if(elm.children("parent").length>0){
                            var tmp = $(elm.children("parent")[0]);
                            data["parent"] = {link: tmp.attr("link"),};
                        }
                        if(elm.children("child").length>0){
                            var tmp = $(elm.children("child")[0]);
                            data["child"] = {link: tmp.attr("link"),};
                        }
                        if(elm.children("origin").length>0){
                            var tmp = $(elm.children("origin")[0]);
                            data["origin"] = {
                                rpy: str2Vec3(tmp.attr("rpy")),
                                xyz: str2Vec3(tmp.attr("xyz")),
                            };
                        }
                        if(elm.children("axis").length>0){
                            var tmp = $(elm.children("axis")[0]);
                            data["axis"] = {
                                xyz: str2Vec3(tmp.attr("xyz")),
                            };
                        }
                        if(elm.children("limit").length>0){
                            var tmp = $(elm.children("limit")[0]);
                            data["limit"] = {
                                effort:   parseFloat(tmp.attr("effort")),
                                lower:    parseFloat(tmp.attr("lower")),
                                upper:    parseFloat(tmp.attr("upper")),
                                velocity: parseFloat(tmp.attr("velocity")),
                            };
                        }
                        joints[elm.attr("name")] = data;
                    });
                    $("link",xml).each(function(k,elm_){	
                        var elm = $(elm_);
                        var data = {
                        };
                        if(elm.children("visual").length>0){
                            var vis = $(elm.children("visual")[0]);
                            var geom = $(vis.children("geometry")[0]);
                            var mesh = $(geom.children("mesh")[0]);
                            data["visible"] = {
                                geometry:{
                                    mesh: {
                                        filename:mesh.attr("filename").replace("package://pepper_meshes/meshes/1.0/",""),
                                        scale:   str2Vec3( mesh.attr("scale") ),
                                    },
                                },
                            };
                            if(vis.children("origin").length>0){
                                var tmp = $(vis.children("origin")[0]);
                                data["origin"] = {
                                    rpy: str2Vec3(tmp.attr("rpy")),
                                    xyz: str2Vec3(tmp.attr("xyz")),
                                };
                            }
                        }
                        links[elm.attr("name")] = data;
                    });
                    //dae組み立て
                    self.joints = joints;
                    self.links  = links;
                    self.daeTbl = daeTbl;
                    self.jointObjTbl = {};
                    self.linkObjTbl  = {};

                    $.each(self.links,function(name,link){
                        var linkObj = {};

                        linkObj.src = link;
                        linkObj.obj3d = new THREE.Object3D();
                        if(link.origin){
                            linkObj.obj3d.position.copy(link.origin.xyz);
                            linkObj.obj3d.rotation.setFromVector3(
                                link.origin.rpy
                            );
                            linkObj.obj3d.updateMatrix();
                        }
                        if(link.visible){
                            linkObj.daeObj3d = daeTbl[link.visible.geometry.mesh.filename];
                            linkObj.obj3d.add(linkObj.daeObj3d);
                            if(link.visible.geometry.mesh.scale){
                                linkObj.daeObj3d.scale.copy(link.visible.geometry.mesh.scale);
                            }
                        }
                        self.linkObjTbl[name] = linkObj;
                    });
                    $.each(self.joints,function(name,joint){
                        var jointObj = {};

                        jointObj.src = joint;
                        jointObj.obj3d = new THREE.Object3D();
                        jointObj.obj3d.position.copy(joint.origin.xyz);
                        jointObj.obj3d.rotation.setFromVector3(
                            joint.origin.rpy
                            //new THREE.Vector3(-joint.origin.rpy.x, -joint.origin.rpy.y, -joint.origin.rpy.z)
                        );
                        jointObj.parentLinkObj = self.linkObjTbl[joint.parent.link];
                        jointObj.childLinkObj  = self.linkObjTbl[joint.child.link];
                        jointObj.parentLinkObj.obj3d.add(jointObj.obj3d);
                        jointObj.obj3d.add(jointObj.childLinkObj.obj3d);

                        self.jointObjTbl[name] = jointObj;
                    });
                    self.topLinkObj  = self.linkObjTbl["base_link"];
                    self.topLinkObj.obj3d.updateMatrix();
                    self.topLinkObj.obj3d.traverse(function(obj3d){
                        obj3d.updateMatrix();
                        obj3d.matrixAutoUpdate = false;
                    }) ;
                });
                dfdTop.resolve()
                return dfd;
            };
        };
        self.pepperModel = new PepperModel();
        self.pepperModel.loadDfd()
        .then(function(){
            init();
            animate();
        });

        var container, stats;
        var camera, scene, renderer, objects;
        var particleLight;
        var dae;
        function init() {
            var containerElm = $("#threejsCanvas");
            containerElm.css("position","absolute");
            containerElm.css("zIndex","998");
            containerElm.css("marginLeft","250px");
            containerElm.css("marginTop", "50px");
            container = containerElm[0];

            var width=300, height=320;

            camera = new THREE.PerspectiveCamera( 25, width / height, 0.1, 2000 );
            camera.position.set( 2, 0.0, 0 );

            scene = new THREE.Scene();

            // Add the COLLADA
            scene.add( self.pepperModel.linkObjTbl["base_link"].obj3d );

            particleLight = new THREE.Mesh( new THREE.SphereGeometry( 4, 8, 8 ), new THREE.MeshBasicMaterial( { color: 0xffffff } ) );
            scene.add( particleLight );

            // Lights

            scene.add( new THREE.AmbientLight( 0x101010 ) );

            var directionalLight = new THREE.DirectionalLight( 0x404040 );
            directionalLight.position.x = 0.0;
            directionalLight.position.y = -0.5;
            directionalLight.position.z = -0.5;
            directionalLight.position.normalize();
            scene.add( directionalLight );

            //var pointLight = new THREE.PointLight( 0xffffff, 4 );
            //particleLight.add( pointLight );

            //renderer = new THREE.CanvasRenderer();
            renderer = new THREE.WebGLRenderer({ alpha: true });
            renderer.setSize(width, height);
            renderer.setClearColor( 0x0000FF, 1 );
//			renderer.setClearColor( 0xFFFF00, 0.5  ); // the default
            renderer.setPixelRatio( window.devicePixelRatio );
            container.appendChild( renderer.domElement );

            stats = new Stats();
            stats.domElement.style.position = 'absolute';
            stats.domElement.style.top = '0px';
            container.appendChild( stats.domElement );

            camera.aspect = renderer.getSize().width / renderer.getSize().height;
            camera.updateProjectionMatrix();
        }
        function animate() {
            requestAnimationFrame( animate );
            render();
            stats.update();
        }
        var clock = new THREE.Clock();
        function render() {
            var timer = Date.now() * 0.0005;

            //camera.position.x = Math.cos( timer ) * 1.5;
            //camera.position.y = 0.5;
            //camera.position.z = Math.sin( timer ) * 1.5;

            self.pepperModel.topLinkObj.obj3d.rotation.setFromVector3(
                new THREE.Vector3(0,Math.sin( timer ),0)
            );
            self.pepperModel.topLinkObj.obj3d.updateMatrix();

            //self.pepperModel.setJointAngle("LShoulderPitch",Math.sin( timer )*200);
            self.pepperModel.setJointAngle("LShoulderRoll",Math.sin( timer )*200);
            //self.pepperModel.setJointAngle("LElbowYaw",Math.sin( timer )*100);
            //self.pepperModel.setJointAngle("LElbowRoll",Math.sin( timer )*100);
            //self.pepperModel.setJointAngle("LWristYaw",Math.sin( timer )*100);

            camera.lookAt( scene.position );

            particleLight.position.x = Math.sin( timer * 4 ) * 3009;
            particleLight.position.y = Math.cos( timer * 5 ) * 4000;
            particleLight.position.z = Math.cos( timer * 4 ) * 3009;

            THREE.AnimationHandler.update( clock.getDelta() );

            renderer.render( scene, camera );
        }

        // ShouninCoreと連動するエディター
        var PoseBox = function(pepperLayer)
        {
            var self = this;

            var widget = ccui.Widget.create();
            var layout = ccui.Layout.create();

            layout.setPosition(560, 100);
            layout.setContentSize(200, 320);
            layout.setBackGroundImage(res.frame01_png);
            layout.setBackGroundImageScale9Enabled(true);
            layout.setClippingEnabled(true);
            pepperLayer.addChild(layout);

            var sprite = cc.Sprite.create(res.HelloWorld_png);
            sprite.setPosition(200/2, 320/2);
            sprite.setScale(0.2);
            layout.addChild(sprite, 0);
            
            layout.setVisible(false);

            self.shouninCoreUpdate = function()
            {
                if(ShouninCoreIns.isPoseEdit())
                {
                    layout.setVisible(true);
                    //pepperLayer.pepperModel.setJointAngle();
                }else{
                    layout.setVisible(false);
                }
            };
            ShouninCoreIns.addListener(self);
        };
        self.poseBox = new PoseBox(self);

        return true;
    },
});


//

var MainScene = cc.Scene.extend({
  mainLayer:null,
  blockLayer:null,
  onEnter:function () {
      this._super();
      var self = this;
      
      self.mainLayer = new MainLayer();
      this.addChild(self.mainLayer);

      self.pepperLayer = new PepperLayer();
      this.addChild(self.pepperLayer);

      self.blockLayer = new BlockLayer();
      this.addChild(self.blockLayer);
  }
});


//
$(function(){

//ブロック管理
// スプライトとブロックを扱うクラス？
// ブロックを包含？ とりあえず包含で。
// ブロック生成ボタン？ひとまずはそれ。そのうちドラッグ型に
// 生成ボタン押すと、ワークスペースに追加orどこかのテーブルに追加
// その後、それが表示される。
// 表示されたモノを接続などは別管理？ひとまず別管理でよさそう。
// 選択時のエディタの表示
// 選択解除時のエディタのOFF

  cc.game.onStart = function(){
      //load resources
      cc.LoaderScene.preload(preload_res, function () {
          cc.director.runScene(new MainScene());
      }, this);
  };
  cc.game.run("gameCanvas");
});


//■ ブロックの実装 ■

pepperBlock.registBlockDef(function(blockManager,materialBoxWsList){
    // 会話ブロック
    blockManager.registBlockDef(
      {
          blockHeader:{
              blockWorldId:"talk@shonin",
              head:'in',
              tail:'out',
          },
          blockContents:[
              {expressions:[
                  {input_text:{default:{string:""}},dataName:'talkLabel0'},
              ]},
          ],
          blockVisual:{
              disp_name:'会話',
          },
      },
      function(ctx,valueDataTbl){
          var onFail = function(e) {console.error('fail:' + e);};
          var dfd = $.Deferred();
          
          console.log(valueDataTbl['talkLabel0'].string);

          dfd.resolve();
          return dfd.promise();
      }
    );
    // ポーズブロック
    blockManager.registBlockDef(
      {
          blockHeader:{
              blockWorldId:"pose@shonin",
              head:'in',
              tail:'out',
          },
          blockContents:[
              {expressions:[
                  //{input_text:{default:{string:""}},dataName:'poseLabel'},
                  {input_dropOnly:{default:{poseData:{}}},dataName:'poseData0',acceptTypes:["poseData"]},
              ]},
          ],
          blockVisual:{
              disp_name:'ポーズ',
          },
      },
      function(ctx,valueDataTbl){
          var onFail = function(e) {console.error('fail:' + e);};
          var dfd = $.Deferred();
          
          console.log(valueDataTbl['poseLabel'].string);

          dfd.resolve();
          return dfd.promise();
      }
    );
});












































var userAgent  = window.navigator.userAgent.toLowerCase();
var appVersion = window.navigator.appVersion.toLowerCase();

if (userAgent.indexOf('safari') != -1) {
    window.onerror = function (msg, file, line, column, err) {
        /*
        msg: error message
        file: file path
        line: row number
        column: column number
        err: error object
        */ 
        alert(msg + file + ':' + line);
    };
}

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

//ドラッグ時にフォーカス外れない対策いるか？(現状はChrome対策)
function checkAgent_NeedDragUnselect()
{
    if (userAgent.indexOf('msie') != -1) {
        //IE全般
        if (appVersion.indexOf("msie 6.") != -1) {
            //IE6
        }else if (appVersion.indexOf("msie 7.") != -1) {
            //IE7
        }else if (appVersion.indexOf("msie 8.") != -1) {
            //IE8
        }else if (appVersion.indexOf("msie 9.") != -1) {
            //IE9
        }else if (appVersion.indexOf("msie 10.") != -1) {
            //IE10
        }
    }else if (userAgent.indexOf('chrome') != -1) {
        //Chrome
        return true;
    }else if (userAgent.indexOf('safari') != -1) {
        //Safari
    }else if (userAgent.indexOf('firefox') != -1) {
        //Firefox
    }else if (userAgent.indexOf('opera') != -1) {
        //Opera
    }
    return false;
}


// 良いものが有るかわからなかったので自作…
function Vector3(x,y,z){
    if (x instanceof Vector3){
        var v=x;
        return new Vector3(v.x,v.y,v.z);
    }
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
};
Vector3.prototype = {
    add:function(v){
        return new Vector3(this.x+v.x,this.y+v.y,this.z+v.z);
    },
    sub:function(v){            
        return new Vector3(this.x-v.x,this.y-v.y,this.z-v.z);
    },
    mul:function(v){
        if(!v instanceof Vector3) return new Vector3(this.x*v,this.y*v,this.z*v);
        return new Vector3(this.x*v.x,this.y*v.y,this.z*v.z);
    },
    div:function(v){            
        if(!v instanceof Vector3) return new Vector3(this.x/v,this.y/v,this.z/v);
        return new Vector3(this.x/v.x,this.y/v.y,this.z/v.z);
    },
    dot:function(v){            
        return (this.x*v.x + this.y*v.y + this.z*v.z);
    },
    cross:function(v){
        return new Vector3(this.y*v.z - this.z*v.y,
                           this.z*v.x - this.x*v.z,
                           this.x*v.y - this.y*v.x);
    },
    len:function(){
        return Math.sqrt(this.dot(this));
    },
    normalize:function(){
        return this.div(this.len());
    },
    rotXAxis:function(rad){            
      return new Vector3(
        this.x,
        this.y * Math.cos(rad) - this.z * Math.sin(rad),
        this.y * Math.sin(rad) + this.z * Math.cos(rad)
      );
    },
    rotYAxis:function(rad){            
      return new Vector3(
        this.x * Math.cos(rad) - this.z * Math.sin(rad),
        this.y,
        this.x * Math.sin(rad) + this.z * Math.cos(rad)
      );
    },
    rotZAxis:function(rad){            
      return new Vector3(
        this.x * Math.cos(rad) - this.y * Math.sin(rad),
        this.x * Math.sin(rad) + this.y * Math.cos(rad),
        this.z
      );
    },
};

function PepperCamera(alVideoDevice,option) {
    var self = this;
    self.subscribe = function(){
        if(!option){
            option = {};
        }
        option.name  = option.name  || "pepper_block_cam";
        option.cam   = option.cam   || 0;  // nao_top
        option.reso  = option.reso  || 1;  // 320x240
        option.color = option.color || 11; // Rgb
        option.frame_rate = option.frame_rate || 5; // frame_rate
        alVideoDevice.getSubscribers().done(function(list){
            //6個まで制限があるそうなのでゴミ掃除
            $.each(list,function(k,v){
                if(v.indexOf(option.name)==0)//とりあえず前方一致で同じと判断してみる
                {
                    alVideoDevice.unsubscribe(v);
                }
            })
        });
        alVideoDevice.subscribeCamera(
            option.name, 
            option.cam,
            option.reso,
            option.color,
            option.frame_rate
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
              if(data)
              {
                  var buff = _base64ToArrayBuffer(data[6]);
                  callback(data[0],data[1], buff, data[7], data[8], data[9], data[10], data[11]);
              }
            });
        }
    };
    self.subscribe();
}


$(function(){
    if(!getUrlParameter("lunchPepper"))
    {
        $(window).on('beforeunload', function() {
            return 'このまま移動しますか？';
        });
    }
});


// データ(試行中)

function makeNullData_CaptureImage(){
    return {pixels:null, w:0, h:0, camId:0, leftRad:0, topRad:0, rightRad:0, bottomRad:0,};
}
function makeNullData_Image(){
    return {pixels:null, w:0, h:0,};
}

$(function(){
    //■ 実行環境を構築(ブロックのコールバックが使えるグローバル環境です) ■
    var makeExecContext = function()
    {
        var exeContext = {};
        // バージョン
        exeContext.contextVersion = "0.01";

        // 複数人接続用の自分の固有ID
        // (カメラ等で同じIDは6個までしか使えない＆切断処理しないとゴミが残る等、
        //  サンドボックス化されて無いひどい状態なので
        //  自身でサンドボックスを実現するためのID。)
        // TODO: 複数人対応時はキープアライブ等でIDの管理を実装する…（乱数だとゴミ掃除出来ないのでダメ。空きを再利用して必ず初期化して使えスタイルがいいかも)
        exeContext.sandBoxID = "SandBoxA";

        // グローバルな作業用データ(最後に○○系。加工前のデータが入ってる事が殆どです)

        // 最後に認識した単語データ
        exeContext.lastRecoData   = {rawData:null,};

        // 最後に調べた人データ
        exeContext.lastPeopleData   = {rawData:null,};

        // 最後に調べた移動物体データ
        exeContext.lastMovementData   = {rawData:null,};

        // 最後にキャプチャした写真データ
        exeContext.lastCaptureImageData = makeNullData_CaptureImage();//{pixels:null, w:0, h:0, camId:0, leftRad:0, topRad:0, rightRad:0, bottomRad:0,};


        // 汎用データテーブル
        exeContext.generalDataTable = {};


        // qiMessaging経由のインスタンス
        exeContext.setupExecContextFromQim = function(qims)
        {
            // 初期化とsubscribeが必要なモノの起動を行います

            // MEMO:
            // (まだ理解しきれてないけどsubscibeしておけばALEngagementZonesなど
            //  とりあえず色々動くみたいなのでやっておきます
            //  …名前付きでやる割にはグローバルに影響してるのが良く理解できてない部分
            //  …色んなものが再起動を超えてグローバルのようなので値の初期化もなるべく最初にやっておくことに
            //  (これだと多人数で遊ぶと毎回で初期化されかねないけど基本的に変えたい人は直前に変えるブロックを
            //   配置するべきという概念でやるべきっぽい匂いがする…寧ろ積極的に定期的に初期化するべきな予感…
            //   知らないだけでサンドボックスとかあるのだろうか？)
            //  (起動を超えて保存される感じからどこかに初期値一覧がありそう。ALMemoryの機能だろうか…全リセットコマンド作りたい)
            //  (しかしGPUのコマンド生で扱ってる感じでバグの温床っぽくてヤナ感じ。
            //   GPU周りみたいに差分とか全書き出しとかを管理するステートキャッシュみたいなの作るべきかな…)

            exeContext.qims      = qims;
            exeContext.alIns     = {};
            exeContext.cameraIns = null;
            exeContext.qims.service("ALAutonomousLife").done(function(ins){
              exeContext.alIns.alAutonomousLife = ins;
              exeContext.alIns.alAutonomousLife.getState().then(function(state){
                  if(state!="disable"){
                      return exeContext.alIns.alAutonomousLife.setState("disable");
                  }
              });
            });
            exeContext.qims.service("ALMemory").done(function(ins){
              exeContext.alIns.alMemory = ins;
            });
            exeContext.qims.service("ALTextToSpeech").done(function(ins){
              exeContext.alIns.alTextToSpeech = ins;
            });
            exeContext.qims.service("ALAudioDevice").done(function(ins){
              exeContext.alIns.alAudioDevice = ins;
            });
            exeContext.qims.service("ALMotion").done(function(ins){
              exeContext.alIns.alMotion = ins;
            });
            exeContext.qims.service("ALRobotPosture").done(function(ins){
              exeContext.alIns.alRobotPosture = ins;
            });
            exeContext.qims.service("ALVideoDevice").done(function(ins){
              exeContext.alIns.alVideoDevice = ins;
              exeContext.pepperCameraTopIns    = new PepperCamera(ins,{name:"pepper_block_top_cam"   +exeContext.sandBoxID,cam:0});
              exeContext.pepperCameraBottomIns = new PepperCamera(ins,{name:"pepper_block_bottom_cam"+exeContext.sandBoxID,cam:1});
              exeContext.pepperCameraDepthIns  = new PepperCamera(ins,{name:"pepper_block_depth_cam"+exeContext.sandBoxID,cam:2});
            });
            exeContext.qims.service('ALMemory').then(function(ins){
              exeContext.alIns.alMemory = ins;
            });
            exeContext.qims.service('ALPeoplePerception').then(function(ins){
              exeContext.alIns.alPeoplePerception = ins;
              exeContext.alIns.alPeoplePerception.subscribe("PepperBlock");
            });
            exeContext.qims.service('ALMovementDetection').then(function(ins){
              exeContext.alIns.alMovementDetection = ins;
              exeContext.alIns.alMovementDetection.subscribe("PepperBlock");
              //TEST
              exeContext.alIns.alMovementDetection.getColorSensitivity().done(function(v){console.log("getColorSensitivity "+v);});
              exeContext.alIns.alMovementDetection.getDepthSensitivity().done(function(v){console.log("getDepthSensitivity "+v);});
              exeContext.alIns.alMovementDetection.getCurrentPrecision().done(function(v){console.log("getCurrentPrecision "+v);});
              exeContext.alIns.alMovementDetection.getCurrentPeriod().done(function(v){console.log("getCurrentPeriod "+v);});
              
              //exeContext.alIns.alMovementDetection.setColorSensitivity(0.001);
              //exeContext.alIns.alMovementDetection.setDepthSensitivity(0.005);
              exeContext.alIns.alMovementDetection.setColorSensitivity(0.005);
              exeContext.alIns.alMovementDetection.setDepthSensitivity(0.008);
            });
            exeContext.qims.service('ALEngagementZones').then(function(ins){
              exeContext.alIns.alEngagementZones = ins;
              exeContext.alIns.alEngagementZones.subscribe("PepperBlock");

              exeContext.alIns.alEngagementZones.setFirstLimitDistance(3.0);
              exeContext.alIns.alEngagementZones.setSecondLimitDistance(5.5);
              exeContext.alIns.alEngagementZones.setLimitAngle(180);
            });
            exeContext.qims.service('ALVisualSpaceHistory').then(function(ins){
              exeContext.alIns.alVisualSpaceHistory = ins;
              exeContext.alIns.alVisualSpaceHistory.subscribe("PepperBlock");
            });

        };

        //■便利そうな補助関数など
        exeContext.onFail = function(e) {
            //dfd向けエラー関数
            console.error('fail:' + e);
        };
        exeContext.onFailPass = function(e) {
            //dfd向けエラー関数 スルー付
            //MEMO: 
            // チェイン時のおそらくお望みの動作は、
            //  処理A.then(処理B,fail).then(null,onFailPass)
            // かも。thenの仕様は処理Aの結果を分岐するので、処理Bのエラーをスルーする際自分は勘違いしたことあり。
            console.log('fail:' + e); 
            return $.Deferred().resolve();
        };
        exeContext.subscribeAlMemoryEvent = function(eventKey, eventCallback){
            //ALMemoryのイベントキーのコールバックを扱うための関数
            // eventKey      … メモリイベントキー
            // eventCallback … イベント時に呼ばれるコールバック。形式は、
            //   eventCallback(eventDfd, eventKeyValue)
            //   eventDfd … resolveにするとコールバック呼び出し終了
            //   eventKeyValue イベントキーの対する値。ない場合はnull

            // イベント用メモリキーよりイベント監視のためのインスタンスを取得します
            return exeContext.alIns.alMemory.subscriber(eventKey).then(function(subscriber){
                // イベント監視のコールバックを登録します
                var id = null;
                var eventDfd = $.Deferred();
                //@@console.log("subscribe event" + eventKey);
                subscriber.signal.connect(function(eventKeyValue){
                    // ここはALMemoryのイベントキーのハンドラです
                    //  ※deferredのハンドラではないので混乱注意。qimessagingのsingalというあたりで実装されているコールバック機構です
                    //@@console.log("update event" + eventKey + " " + eventKeyValue);
                    eventCallback(eventDfd, eventKeyValue);
                })
                .then(function(id_){
                    id = id_;
                },function(){
                    eventDfd.reject();
                });
                return eventDfd.promise().then(function(){
                    // イベント完了したのでイベントコールバックを解除します
                    console.log("unsubscribe event" + eventKey);
                    if(id){
                        subscriber.signal.disconnect(id);
                        id = null;
                    }
                });
            });
        };

        //■デバッグ用
        exeContext.debugCanvasList ={};
        exeContext.pixelPerMeter = 70;

        return exeContext;
    }

    // -- MVVMのモデル(このアプリの中枢です) --
    function MyModel() {
        var self = this;
/*
        //■ ブロック管理を作成 ■
        var execContext = makeExecContext();
        self.blockManager = new BlockManager( execContext );
*/
        //■ URLパラメータより ■
        if(getUrlParameter("lunchPepper")){
            self.lunchPepper = true;
        }
        else{
            self.lunchPepper = false;
        }
        if(getUrlParameter("loadJsonUrl")){
            // とりあえずな実装…
            var url = getUrlParameter("loadJsonUrl");
            $.ajax({
              type: 'GET',
              url: url,
              dataType: 'json',
              success: function(json){
                  setTimeout(function(){
                    self.fromJSON(json);
                    alert(url+"の読み込み完了です");
                  },2000);
              },
              error: function(XMLHttpRequest, textStatus, errorThrown){
                  alert(url+"の読み込みでエラーです:"+textStatus);
              },
            });
        }

        //■ ＵＩ関連の準備など ■

        self.wakeupPepper = function(){
          if(execContext.qims){
              execContext.qims.service("ALMotion")
              .then(function(alMotion){
                  return alMotion.wakeUp();
              });
          }
        };
        self.restPepper = function(){
          if(execContext.qims){
              execContext.qims.service("ALMotion")
              .then(function(alMotion){
                  return alMotion.rest();
              });
          }
        };
        
        // 起動ボタン
        self.execBlock = function(){
        };
        // 停止
        self.stopBlock = function(){
            
        };

        // セーブとロード
        self.toJSON = function(){
            var saveData = {
                version:"00.01",
                toyBoxWsLst:    [],
                factoryBoxWsLst:[],
            };
            $.each(self.toyBoxWsList(),function(k,wsObsv){
                saveData.toyBoxWsLst.push(wsObsv().toJSON());
            });
            $.each(self.factoryBoxWsList(),function(k,wsObsv){
                saveData.factoryBoxWsLst.push(wsObsv().toJSON());
            });
            return saveData;  
        };
        self.fromJSON = function(data){
            var saveData = data;
            self.toyBoxWsList.removeAll();
            $.each(saveData.toyBoxWsLst,function(k,wsJson){
                var wsIns = self.blockManager.createBlockWorkSpaceIns("droppableScope")
                self.toyBoxWsList.push(ko.observable(wsIns));
                wsIns.fromJSON(wsJson);
            });
            self.factoryBoxWsList.removeAll();
            $.each(saveData.factoryBoxWsLst,function(k,wsJson){
                var wsIns = self.blockManager.createBlockWorkSpaceIns("droppableScope")
                wsIns.fromJSON(wsJson);
                self.factoryBoxWsList.push(ko.observable(wsIns));
            });
        };
        self.saveBlock = function(){
            if(!localStorage)return;
            localStorage.setItem("working_saveData",JSON.stringify(self.toJSON()));
        };
        self.loadBlock = function(){
            if(!localStorage)return;
            var saveData = JSON.parse(localStorage.getItem("working_saveData"));
            self.fromJSON(saveData);
        };

        // ■ 接続処理 ■

        // IP入力部分
        self.ipXXX_000_000_000 = ko.observable(192);
        self.ip000_XXX_000_000 = ko.observable(168);
        self.ip000_000_XXX_000 = ko.observable(1);
        self.ip000_000_000_XXX = ko.observable(2);

        var pepper_ip;
        if(localStorage){
            pepper_ip = JSON.parse(localStorage.getItem("pepper_ip"));
        }
        if(pepper_ip){
            self.ipXXX_000_000_000( pepper_ip.ip[0] );
            self.ip000_XXX_000_000( pepper_ip.ip[1] );
            self.ip000_000_XXX_000( pepper_ip.ip[2] );
            self.ip000_000_000_XXX( pepper_ip.ip[3] );
        }
        else{
            pepper_ip = {
                ip:[self.ipXXX_000_000_000(),
                    self.ip000_XXX_000_000(),
                    self.ip000_000_XXX_000(),
                    self.ip000_000_000_XXX(),],
            };
            if(localStorage){
                localStorage.setItem("pepper_ip",JSON.stringify(pepper_ip));
            }
        }
        var updatePepperIp = function(){
            pepper_ip.ip[0] = self.ipXXX_000_000_000();
            pepper_ip.ip[1] = self.ip000_XXX_000_000();
            pepper_ip.ip[2] = self.ip000_000_XXX_000();
            pepper_ip.ip[3] = self.ip000_000_000_XXX();
            if(!localStorage)return;
            localStorage.setItem("pepper_ip",JSON.stringify(pepper_ip));
        }
        self.ipXXX_000_000_000.subscribe(updatePepperIp);
        self.ip000_XXX_000_000.subscribe(updatePepperIp);
        self.ip000_000_XXX_000.subscribe(updatePepperIp);
        self.ip000_000_000_XXX.subscribe(updatePepperIp);

        // ■ 接続部分
        self.nowState = ko.observable("未接続");
        self.connect = function() 
        {
            var pepper_ip = JSON.parse(localStorage.getItem("pepper_ip"));
            var ip = 
            pepper_ip.ip[0] + "." +
            pepper_ip.ip[1] + "." +
            pepper_ip.ip[2] + "." +
            pepper_ip.ip[3];
            var qims;
            if(execContext.qims){
                //TODO: 接続状態の確認と再接続の方法を考える
                if(self.nowState()=="切断")
                {
                    execContext.qims.socket().socket.connect();
                }
            }
            else{
                if(self.lunchPepper){
                     qims = new QiSession();
                }else{
                     qims = new QiSession(ip);
                }
                qims.socket()
                .on('connect', function (aa) {
                    self.nowState("接続中");
                    qims.service("ALTextToSpeech")
                    .done(function (tts) {
                        tts.say("せつぞく、ぺっぷ");
                    });
                    execContext.setupExecContextFromQim(qims);
                })
                .on('disconnect', function (aa) {
                  self.nowState("切断");
                });
            }
        };
    }
    myModel = new MyModel();
    ko.applyBindings( myModel );
});
