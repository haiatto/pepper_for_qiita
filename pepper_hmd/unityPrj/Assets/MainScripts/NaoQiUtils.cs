using System;
using System.Collections.Generic;
using qiMessaging;

namespace NaoQiUtils
{
    public class QiUt
    {
        protected QiMessaging qim_;

        /// <summary>
        /// QiMessagingを使ったNaoQi関連の補助クラス
        /// </summary>
        /// <remarks>
        /// 便利クラスを追加してゆくところ
        /// </remarks>
        public QiUt(QiMessaging qim)
        {
            qim_ = qim;
        }

        /// <summary>
        /// APIアクセスのためのサービス取得の為のDeferred関数を生成します
        /// </summary>
        /// <param name="moduleName">モジュール名</param>
        /// <returns>チェイン可能なDfd関数</returns>
        public Func<Deferred<QiServiceJsonData, JsonData>> MakeFunc_GetService(string moduleName)
        {
            return () => { return qim_.Service(moduleName); };
        }

        #region ResetAndWakeup

        public Deferred<object,object> ResetAndWakeup()
        {
            var dfd = new Deferred<object,object>();
            MakeFunc_GetService("ALMotion")().Then((alMotion) =>
            {
                alMotion.methods["rest"]()
                .Then(() => { return alMotion.methods["wakeUp"](); })
                .Then(() => { dfd.Resolve(); });
            });
            return dfd;
        }

        #endregion

        #region GetJointAngleTable

        /// <summary>
        /// 関節の角度のテーブルを取得します
        /// HeadYaw, HeadPitch, HipRoll, HipPitch, KneePitch , 
        /// LShoulderPitch, LShoulderRoll , LElbowYaw , LElbowRoll, LWristYaw , LHand     , 
        /// RShoulderPitch, RShoulderRoll , RElbowYaw , RElbowRoll, RWristYaw , RHand     , 
        /// WheelFL, WheelFR, WheelB    
        /// </summary>
        public Deferred<Dictionary<string, float>> GetJointAngleTable()
        {
            var dfd = new Deferred<Dictionary<string, float>>();
            MakeFunc_GetService("ALMotion")().Then((alMotion) =>
            {
                return
                alMotion.methods["getAngles"]("Body", true)
                .Then((angles) =>
                {
                    var angleLst = angles.JsonList;
                    dfd.Resolve(new Dictionary<string, float>{
                            {"HeadYaw",  (float)angleLst[0].Cast<double>()},
                            {"HeadPitch",(float)angleLst[1].Cast<double>()},
                            {"LShoulderPitch",(float)angleLst[2].Cast<double>()},
                            {"LShoulderRoll", (float)angleLst[3].Cast<double>()},
                            {"LElbowYaw", (float)angleLst[4].Cast<double>()},
                            {"LElbowRoll",(float)angleLst[5].Cast<double>()},
                            {"LWristYaw", (float)angleLst[6].Cast<double>()},
                            {"LHand",     (float)angleLst[7].Cast<double>()},
                            {"HipRoll",   (float)angleLst[8].Cast<double>()},
                            {"HipPitch",  (float)angleLst[9].Cast<double>()},
                            {"KneePitch", (float)angleLst[10].Cast<double>()},
                            {"RShoulderPitch",(float)angleLst[11].Cast<double>()},
                            {"RShoulderRoll", (float)angleLst[12].Cast<double>()},
                            {"RElbowYaw", (float)angleLst[13].Cast<double>()},
                            {"RElbowRoll",(float)angleLst[14].Cast<double>()},
                            {"RWristYaw", (float)angleLst[15].Cast<double>()},
                            {"RHand",     (float)angleLst[16].Cast<double>()},
                            {"WheelFL",   (float)angleLst[17].Cast<double>()},
                            {"WheelFR",   (float)angleLst[18].Cast<double>()},
                            {"WheelB",    (float)angleLst[19].Cast<double>()},
                        });
                });
            });
            return dfd;
        }

        #endregion

        #region GetLaserSensorValues

        public class LaserKeyInfo{
            public string key;
            public int    segNum;
            public int    deg;
            public class Value{
                public float sensorX;
                public float sensorY;
                public float rotatedX;
                public float rotatedY;
            };
            public List<Value> valueList = new List<Value>();
        }
        public Deferred<Dictionary<string, LaserKeyInfo>> GetLaserSensorValues()
        {
            var dfd = new Deferred<Dictionary<string, LaserKeyInfo>>();
            Action<JsonData> onFail = (error)=>{
                dfd.Reject(error);
            };

            var keys = new List<string>();
            var keyBase = "Device/SubDeviceList/Platform/LaserSensor/";
            var infoTbl = new LaserKeyInfo[]
            {new LaserKeyInfo(){key="Front/Shovel/",        segNum=3, deg=0,  },
             new LaserKeyInfo(){key="Front/Vertical/Left/", segNum=1, deg=0,  },
             new LaserKeyInfo(){key="Front/Vertical/Right/",segNum=1, deg=0,  },
             new LaserKeyInfo(){key="Front/Horizontal/",    segNum=15,deg=0,  },
             new LaserKeyInfo(){key="Left/Horizontal/",     segNum=15,deg= 90,},
             new LaserKeyInfo(){key="Right/Horizontal/",    segNum=15,deg=-90,},
            };
            foreach(var info in infoTbl){
              for(var ii=1; ii <= info.segNum; ii++){
                  var segNumber = string.Format("Seg{0:d02}",ii);
                  keys.Add(keyBase + info.key + segNumber + "/X/Sensor/Value");
                  keys.Add(keyBase + info.key + segNumber + "/Y/Sensor/Value");
              }
            }
            if(qim_!=null){
              qim_.Service("ALMemory").Then((alMemory)=>{
                  alMemory.methods["getListData"](keys).Then((values)=>{
                      var valIdx = 0;
                      foreach(var info in infoTbl){
                          for(var ii=0; ii < info.segNum; ii++){
                              info.valueList.Add(
                                  new LaserKeyInfo.Value(){
                                      sensorX=(float)values.JsonList[valIdx+0].Cast<double>(),
                                      sensorY=(float)values.JsonList[valIdx+1].Cast<double>()
                                  });
                              valIdx+=2;
                          }
                      }
                      foreach(var info in infoTbl){
                          var r = info.deg / 180.0f * Math.PI;
                          var rOffs = Math.PI/2;
                          foreach(var value in info.valueList){
                              var x = value.sensorX;
                              var y = value.sensorY;
                              var rx = x * Math.Cos(r+rOffs) + -y * Math.Sin(r+rOffs);
                              var ry = x * Math.Sin(r+rOffs) +  y * Math.Cos(r+rOffs);
                              value.rotatedX = (float)rx;
                              value.rotatedY = (float)ry;
                          }
                      }
                      var ret = new Dictionary<string, LaserKeyInfo>();
                      foreach(var info in infoTbl){
                          ret[info.key] = info;
                      }
                      dfd.Resolve(ret);
                  }, onFail);
              }, onFail);
          } 
            else {
              dfd.Reject();
          }
          return dfd;
        }
        #endregion
    }

    public class PepperCamera
    {
        QiMessaging qim_;
        QiServiceJsonData alVideoDevice_;
        string nameId_;

        public class OptionT
        {
            public string name = "pepper_cs_cam";
            public int cam = 0;  // nao_top
            public int reso = 1;  // 320x240
            public int color = 11; // Rgb
            public int frame_rate = 30; // frame_rate
        }

        public class ImageData
        {
            public int w;
            public int h;
            public int camId;
            public double camLRad;
            public double camTRad;
            public double camRRad;
            public double camBRad;
            public byte[] pixels;
        }

        public OptionT Option = new OptionT();

        public PepperCamera(QiMessaging qim)
        {
            qim_ = qim;
        }

        public Deferred<object, JsonData> Subscribe()
        {
            return qim_.Service("ALVideoDevice")
            .Then((ins) =>
            {
                alVideoDevice_ = ins;

                return alVideoDevice_.methods["getSubscribers"]().Then((list) =>
                {
                    // 6個まで制限があるそうなのでゴミ掃除
                    foreach (var v in list.JsonList)
                    {
                        if (v.As<string>().IndexOf(Option.name) == 0)//とりあえず前方一致で同じと判断してみる
                        {
                            alVideoDevice_.methods["unsubscribe"](v.JsonDataRaw);
                        }
                    }
                })
                .Then(() =>
                {
                    return alVideoDevice_.methods["subscribeCamera"](
                        Option.name,
                        Option.cam,
                        Option.reso,
                        Option.color,
                        Option.frame_rate
                    );
                })
                .Then((nameId) =>
                {
                    nameId_ = nameId.As<string>();
                });
            });
        }
        public void Unsubscribe()
        {
            alVideoDevice_.methods["Unsubscribe"](nameId_);
            nameId_ = null;
        }
        public Deferred<ImageData, string> CaptureImage()
        {
            var dfd = new Deferred<ImageData, string>();
            if (nameId_ != null && nameId_.Length > 0)
            {
                alVideoDevice_.methods["getImageRemote"](nameId_).Then((data) =>
                {
                    if (data != null)
                    {
                        /*
                        [0]: width.
                        [1]: height.
                        [2]: number of layers.
                        [3]: ColorSpace.
                        [4]: time stamp (seconds).
                        [5]: time stamp (micro-seconds).
                        [6]: binary array of size height * width * nblayers containing image data.
                        [7]: camera ID (kTop=0, kBottom=1).
                        [8]: left angle (radian).
                        [9]: topAngle (radian).
                        [10]: rightAngle (radian).
                        [11]: bottomAngle (radian).
                        */
                        var img = new ImageData();
                        img.w = (int)data.JsonList[0].Cast<long>();
                        img.h = (int)data.JsonList[1].Cast<long>();
                        img.pixels = System.Convert.FromBase64String(data.JsonList[6].As<string>());
                        img.camId = (int)data.JsonList[7].Cast<long>();
                        img.camLRad = data.JsonList[8].Cast<double>();
                        img.camTRad = data.JsonList[9].Cast<double>();
                        img.camRRad = data.JsonList[10].Cast<double>();
                        img.camBRad = data.JsonList[11].Cast<double>();
                        dfd.Resolve(img);
                    }
                },
                (error) => {
                    dfd.Reject(error.As<string>());
                });
            }
            else
            {
                dfd.Reject("error not ready");
            }
            return dfd;
        }
    }
}