//
// ペッパー商人
//

// TODO:ファイル多いし容量でかいのでバイナリ化されたjson化に変換してシリアライズとデシリアライズするの書いて、dae弄るくとき以外はそっち読むように変える
// TODO:three_jsの軽量フォーマットとかあるならさらにその先も…

//
// Threejsによるペッパー君描画
//
//   self.joints = joints;
//   self.links  = links;
//   self.daeTbl = daeTbl;
//   self.jointObjTbl = {};
//   self.linkObjTbl  = {};
//   self.setJointAngle = function(jointName,angleDeg)
//   self.getJointAngle = function(jointName)
//   self.loadDfd = function()
//
var PepperModel = function(canvasElement){

    if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
    
    //
    var self = this;    

    //
    self.setJointAngle = function(jointName,angleDeg)
    {
        var jointObj = self.jointObjTbl[jointName];
        if(jointObj){
            jointObj.setJointAngle(angleDeg);
        }
    };

    //
    self.getJointAngle = function(jointName)
    {
        var jointObj = self.jointObjTbl[jointName];
        if(jointObj){
            return jointObj.getJointAngle();
        }
        return null;
    };

    // ロードと描画ループ開始します
    self.loadAndDrawStart = function()
    {
        var dfd = $.Deferred();
        
        self.loadDfd()
        .then(function(){
            self.drawLoopStart();
            dfd.resolve();
        });
        
        return dfd;
    };

    // データロードします
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
                        if ( child instanceof THREE.Mesh ) {
                            if(child.material instanceof THREE.MultiMaterial) {
                                $.each(child.material.materials,function(k,mate){
                                    //自己発光をカットします
                                    if(mate.emissive){
                                        mate.emissive.r=0;
                                        mate.emissive.g=0;
                                        mate.emissive.b=0;
                                    }
                                    if(mate.reflectivity){
                                        mate.reflectivity = 0;
                                        mate.refractionRatio = 0;
                                    }
                                });
                            }
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

                jointObj.nowAngleDeg = 0;
                jointObj.setJointAngle = function(angleDeg){
                    var angleRad = THREE.Math.degToRad(angleDeg);
                    angleRad = THREE.Math.clamp(angleRad, jointObj.src.limit.lower, jointObj.src.limit.upper);
                    var q = new THREE.Quaternion();
                    q.setFromAxisAngle( jointObj.src.axis.xyz, -angleRad );
                    jointObj.obj3d.quaternion.copy(q);
                    jointObj.obj3d.updateMatrix();
                    jointObj.nowAngleDeg = THREE.Math.radToDeg( angleRad );
                };
                jointObj.getJointAngle = function (){
                    return jointObj.nowAngleDeg;
                };
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
    
    self.containerElm = $(canvasElement);
    self.canvasW = 300;
    self.canvasH = 320;

    var container, stats;
    var camera, scene, renderer, objects;
    var particleLight;
    
    // 描画ループを開始します
    self.drawLoopStart = function()
    {
        // キャンバス周り
        function init() {
            self.containerElm.css("position","absolute");
            self.containerElm.css("zIndex","998");
            container = self.containerElm[0];
            
            camera = new THREE.PerspectiveCamera( 25, self.canvasW / self.canvasH, 0.1, 2000 );
            camera.position.set( 2, 0.0, 0 );

            scene = new THREE.Scene();

            // Add the COLLADA
            scene.add( self.linkObjTbl["base_link"].obj3d );

            particleLight = new THREE.Mesh( new THREE.SphereGeometry( 4, 8, 8 ), new THREE.MeshBasicMaterial( { color: 0xffffff } ) );
            scene.add( particleLight );

            // Lights

            scene.add( new THREE.AmbientLight( 0xa0a0a0 ) );

            var directionalLight = new THREE.DirectionalLight( 0xa0a0a0 );
            directionalLight.position.x =  0.5;
            directionalLight.position.y =  0.0;
            directionalLight.position.z =  -0.5;
            directionalLight.position.normalize();
            scene.add( directionalLight );

            //var pointLight = new THREE.PointLight( 0xffffff, 4 );
            //particleLight.add( pointLight );

            //renderer = new THREE.CanvasRenderer();
            renderer = new THREE.WebGLRenderer({ alpha: true });
            renderer.setClearColor( 0x401010, 1 );
//			renderer.setClearColor( 0xFFFF00, 0.5  ); // the default
            renderer.setPixelRatio( window.devicePixelRatio );
            renderer.setSize(self.canvasW, self.canvasH);
            container.appendChild( renderer.domElement );

            //
            stats = new Stats();
            stats.domElement.style.position = 'absolute';
            stats.domElement.style.top = '0px';
            container.appendChild( stats.domElement );

            //camera.aspect = renderer.getSize().width / renderer.getSize().height;
            //camera.updateProjectionMatrix();

            self.setCanvasFullSize();
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

            //self.pepperModel.topLinkObj.obj3d.rotation.setFromVector3(
            //    new THREE.Vector3(0,Math.sin( timer ),0)
            //);
            //self.pepperModel.topLinkObj.obj3d.updateMatrix();

            //self.pepperModel.setJointAngle("LShoulderPitch",Math.sin( timer )*200);
            //self.pepperModel.setJointAngle("LShoulderRoll",Math.sin( timer )*200);
            //self.pepperModel.setJointAngle("LElbowYaw",Math.sin( timer )*100);
            //self.pepperModel.setJointAngle("LElbowRoll",Math.sin( timer )*100);
            //self.pepperModel.setJointAngle("LWristYaw",Math.sin( timer )*100);

            particleLight.position.x = Math.sin( timer * 4 ) * 3009;
            particleLight.position.y = Math.cos( timer * 5 ) * 4000;
            particleLight.position.z = Math.cos( timer * 4 ) * 3009;

            THREE.AnimationHandler.update( clock.getDelta() );

            renderer.render( scene, camera );
        }
        // 開始
        init();
        animate();
    };
        

    //外部からのキャンバス操作
    self.setCanvasPos = function(x,y){
        self.containerElm.css("marginLeft",""+(x)+"px");
        self.containerElm.css("marginTop", ""+(y)+"px");
    };
    self.setCanvasSize = function(w,h){
        self.canvasW = w;
        self.canvasH = h;            
        if(!renderer)return;
        renderer.setSize(self.canvasW, self.canvasH);
        camera.aspect = renderer.getSize().width / renderer.getSize().height;
        camera.updateProjectionMatrix();
    };
    self.setCanvasFullSize = function(){
        self.setCanvasSize(300,400);
        if(!renderer)return;
        camera.position.set( 2.5, -0.109, 0 );
        camera.lookAt( new THREE.Vector3(0,-0.109,0) );
    };
    self.setCanvasMiniSize = function(){
        self.setCanvasSize(300,280);
        if(!renderer)return;
        camera.position.set( 2, 0.0, 0 );
        camera.lookAt( new THREE.Vector3(0,0,0) );
    };
    self.setCanvasVisible = function(flag)
    {
        if(!renderer)return;
        self.containerElm.css("visibility",flag?"visible":"hidden");
    };

};

