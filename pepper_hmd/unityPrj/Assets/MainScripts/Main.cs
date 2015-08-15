using UnityEngine;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Threading;
using qiMessaging;
using NaoQiUtils;

public class Main : SingletonMonoBehaviour<Main>
{
    public string Url = "http://192.168.11.20/libs/qimessaging/1.0";

    Thread thread_;

    QiMessaging qim_;
    QiUt        qiUt_;
    PepperCamera pcamTop_;
    PepperCamera pcamBottom_;

    Texture2D cameraTextureTop_;
    Texture2D cameraTextureBottom_;

    public Texture2D CameraTextureTop
    {
        get { return cameraTextureTop_; }
    }
    public Texture2D CameraTextureBottom
    {
        get { return cameraTextureBottom_; }
    }

    bool isUpdateImageDataTop_;
    bool isUpdateImageDataBottom_;
    PepperCamera.ImageData imageDataTop_;
    PepperCamera.ImageData imageDataBottom_;

    #region LaserPointList 
    List<Vector2> laserPointList_FrontShovel_;
    List<Vector2> laserPointList_FrontVerticalLeft_;
    List<Vector2> laserPointList_FrontVerticalRight_;
    List<Vector2> laserPointList_FrontHorizontal_;
    List<Vector2> laserPointList_LeftHorizontal_;
    List<Vector2> laserPointList_RightHorizontal_;

    public List<Vector2> LaserPointList_FrontShovel
    {
        get { return laserPointList_FrontShovel_; }
    }
    public List<Vector2> LaserPointList_FrontVerticalLeft
    {
        get { return laserPointList_FrontVerticalLeft_; }
    }
    public List<Vector2> LaserPointList_FrontVerticalRight
    {
        get { return laserPointList_FrontVerticalRight_; }
    }
    public List<Vector2> LaserPointList_FrontHorizontal
    {
        get { return laserPointList_FrontHorizontal_; }
    }
    public List<Vector2> LaserPointList_LeftHorizontal
    {
        get { return laserPointList_LeftHorizontal_; }
    }
    public List<Vector2> LaserPointList_RightHorizontal
    {
        get { return laserPointList_RightHorizontal_; }
    }
    #endregion

    #region 基礎部分

    void Awake()
    {
        SetInstance(this);
    }
    void OnApplicationQuit()
    {
        thread_.Abort();
        qim_.Disconnect();
        qim_ = null;
        pcamTop_ = null;
        pcamBottom_ = null;
        print("Thread quit...");

        ClearInstance();
    }    
	void Start () {
        print("start...");
        ThreadStart ts = new ThreadStart(MainLoop);
        thread_ = new Thread(ts);
        thread_.Start();
        print("Thread done...");
    }
    #endregion


    #region 関節部分

    Dictionary<string, float> jointAngleTbl_;
    Dictionary<string, float> targetJointAngleTbl_ = new Dictionary<string,float>();

    /// <summary>
    /// 関節の角度のテーブル(ラジアン)
    /// </summary>
    public Dictionary<string, float> JointAngleTbl
    {
        get { return jointAngleTbl_; }
    }

    /// <summary>
    /// 関節の角度の目標値のテーブル(ラジアン)
    /// </summary>
    public Dictionary<string, float> TargetJointAngleTbl
    {
        get { return targetJointAngleTbl_; }
    }
 
    public float TargetHeadYaw{
        get { return targetJointAngleTbl_["HeadYaw"]; }
        set { targetJointAngleTbl_["HeadYaw"] = value; }
    }
    public float TargetHeadPitch{
        get { return targetJointAngleTbl_["HeadPitch"]; }
        set { targetJointAngleTbl_["HeadPitch"] = value; }
    }
    public float TargetLShoulderPitch{
        get { return targetJointAngleTbl_["LShoulderPitch"]; }
        set { targetJointAngleTbl_["LShoulderPitch"] = value; }
    }
    public float TargetLShoulderRoll{
        get { return targetJointAngleTbl_["LShoulderRoll"]; }
        set { targetJointAngleTbl_["LShoulderRoll"] = value; }
    }
    public float TargetLElbowYaw{
        get { return targetJointAngleTbl_["LElbowYaw"]; }
        set { targetJointAngleTbl_["LElbowYaw"] = value; }
    }
    public float TargetLElbowRoll{
        get { return targetJointAngleTbl_["LElbowRoll"]; }
        set { targetJointAngleTbl_["LElbowRoll"] = value; }
    }
    public float TargetLWristYaw{
        get { return targetJointAngleTbl_["LWristYaw"]; }
        set { targetJointAngleTbl_["LWristYaw"] = value; }
    }
    public float TargetLHand{
        get { return targetJointAngleTbl_["LHand"]; }
        set { targetJointAngleTbl_["LHand"] = value; }
    }
    public float TargetRShoulderPitch{
        get { return targetJointAngleTbl_["RShoulderPitch"]; }
        set { targetJointAngleTbl_["RShoulderPitch"] = value; }
    }
    public float TargetRShoulderRoll
    {
        get { return targetJointAngleTbl_["RShoulderRoll"]; }
        set { targetJointAngleTbl_["RShoulderRoll"] = value; }
    }
    public float TargetRElbowYaw
    {
        get { return targetJointAngleTbl_["RElbowYaw"]; }
        set { targetJointAngleTbl_["RElbowYaw"] = value; }
    }
    public float TargetRElbowRoll{
        get { return targetJointAngleTbl_["RElbowRoll"]; }
        set { targetJointAngleTbl_["RElbowRoll"] = value; }
    }
    public float TargetRWristYaw{
        get { return targetJointAngleTbl_["RWristYaw"]; }
        set { targetJointAngleTbl_["RWristYaw"] = value; }
    }
    public float TargetRHand{
        get { return targetJointAngleTbl_["RHand"]; }
        set { targetJointAngleTbl_["RHand"] = value; }
    }

    #endregion


    void OnGUI()
    {
    }

    void Update()
    {
        if (imageDataTop_ != null && isUpdateImageDataTop_)
        {
            cameraTextureTop_ = createTexImage_(imageDataTop_);
            isUpdateImageDataTop_ = false;
        }
        if (imageDataBottom_ != null && isUpdateImageDataBottom_)
        {
            cameraTextureBottom_ = createTexImage_(imageDataBottom_);
            isUpdateImageDataBottom_ = false;
        }
        if (jointAngleTbl_ != null)
        {
            var yaw = jointAngleTbl_["HeadYaw"] * Mathf.Rad2Deg;
            var pitch = jointAngleTbl_["HeadPitch"] * Mathf.Rad2Deg;
            this.transform.eulerAngles = new Vector3(pitch,yaw,0);
        }
    }

    #region createTexImage_
    Texture2D createTexImage_(PepperCamera.ImageData imageData)
    {
        if (imageData == null) return null;

        Texture2D texture;
        lock (imageData)
        {
            texture = new Texture2D(imageData.w, imageData.h);

            for (var y = 0; y < texture.height; y++)
            {
                var lineSrc = ((texture.height - y - 1) * imageData.w);
                for (var x = 0; x < texture.width; x++)
                {
                    var color = new Color();
                    color.r = imageData.pixels[(lineSrc + x) * 3 + 0] / 255.0f;
                    color.g = imageData.pixels[(lineSrc + x) * 3 + 1] / 255.0f;
                    color.b = imageData.pixels[(lineSrc + x) * 3 + 2] / 255.0f;
                    color.a = 1.0f;
                    texture.SetPixel(x, y, color);
                }
            }
            texture.Apply();
        }
        return texture;
    }
    #endregion

    #region Connect()
    void Connect()
    {
        var dfd = new Deferred<QiMessaging, string>();

        dfd.Then((qim) =>
        {
            qim.Service("ALTextToSpeech").Then((alTTS) =>
            {
                alTTS.methods["say"]("ぺっぷオー");
            });
        });

        if (qim_.IsConnected)
        {
            dfd.Resolve(qim_);
        }
        else
        {
            qim_.Connected += (qim) =>
            {
                dfd.Resolve(qim);
            };
            qim_.Connect(Url);
        }
        while (true)
        {
            if (qim_.IsConnected)
            {
                break;
            }
            Thread.Sleep(10);
        }
        print("connected...");
    }
    #endregion


    
    void MainLoop()
    {
        print("MainLoop...");

        qim_ = new QiMessaging();
        qiUt_ = new QiUt(qim_);
        pcamTop_ = new PepperCamera(qim_);
        pcamBottom_ = new PepperCamera(qim_);
        pcamTop_.Option = new PepperCamera.OptionT { name = "uniA", cam = 0, };
        pcamBottom_.Option = new PepperCamera.OptionT { name = "uniB", cam = 1, };

        //接続
        Connect();

        // 初期化
        {
            var bOk = false;
            qiUt_.ResetAndWakeup()
            .Then(() => { return qiUt_.DisalbeArmExternalCollisionProtection();})
            .Then(() => { return qiUt_.GetJointAngleTable(); })
            .Then((angles) =>
            {
                jointAngleTbl_ = angles;
                foreach (var kv in jointAngleTbl_)
                {
                    targetJointAngleTbl_[kv.Key] = kv.Value;
                }
            })
            .Then(() =>
            {
                bOk = true;
            });
            while(!bOk){
                Thread.Sleep(10);
            }
        }
        pcamBottom_.Subscribe();
        pcamTop_.Subscribe();

        // カメラ画像を取り出します
        Func<Deferred> cameraUpdateDfdFunc = () =>
        {
            var dfd = new Deferred();

            var syncA = false;
            var syncB = false;
            var errorA = false;
            var errorB = false;
            pcamTop_.CaptureImage().Then((imageData) =>
            {
                if (imageDataTop_ == null)
                {
                    imageDataTop_ = imageData;
                    isUpdateImageDataTop_ = true;
                }
                else
                {
                    lock (imageDataTop_)
                    {
                        imageDataTop_ = imageData;
                        isUpdateImageDataTop_ = true;
                    }
                }
                syncA = true;
                if (syncB || errorB)
                {
                    dfd.Resolve();
                }
            },
            (error) =>
            {
                errorA = true;
                if (syncB || errorB)
                {
                    var timer = new System.Threading.Timer(
                        (a) => { dfd.Resolve(); }, null, 300, Timeout.Infinite
                        );
                }
            }
            );
            pcamBottom_.CaptureImage().Then((imageData) =>
            {
                if (imageDataBottom_ == null)
                {
                    imageDataBottom_ = imageData;
                }
                else
                {
                    lock (imageDataBottom_)
                    {
                        imageDataBottom_ = imageData;
                    }
                }
                syncB = true;
                if(syncA||errorA)
                {
                    var timer = new System.Threading.Timer(
                        (a)=>{dfd.Resolve();}, null, 300, Timeout.Infinite
                        );
                }
            },
            (error) =>
            {
                dfd.Resolve();
                errorB = true;
                if (syncA || errorA)
                {
                    dfd.Resolve();
                }
            }
            );
            return dfd;
        };

        //ループ
        Deferred cameraUpdateDfd = null;

        while (true)
        {
            if (!qim_.IsConnected) continue;

            //Debug.Log("loop");

            if(cameraUpdateDfd!=null)
            {
                if (cameraUpdateDfd.NowState != Deferred.State.Pending)
                {
                    cameraUpdateDfd = cameraUpdateDfdFunc();
                }
            }
            else
            {
                cameraUpdateDfd = cameraUpdateDfdFunc();
            }
            

            //ここらへんに色々角度などの取得を
            Func <Deferred<object,object>> moveTargetAngle = () =>
            {
                var dfd = new Deferred<object, object>();
                var keyLst = new List<string>();
                var valueLst = new List<float>();
                foreach(var jointAngleKv in jointAngleTbl_)
                {
                    var tgtVal = targetJointAngleTbl_[jointAngleKv.Key];
                    if(Mathf.Abs(tgtVal-jointAngleKv.Value)>0.05f)
                    {
                        //Debug.Log(string.Format("{0} {1}=>{2}", jointAngleKv.Key, jointAngleKv.Value,tgtVal));
                        keyLst.Add(jointAngleKv.Key);
                        valueLst.Add(tgtVal);
                    }
                }
                if (keyLst.Count > 0)
                {
                    qim_.Service("ALMotion").Then((alMotion) =>
                    {
                        alMotion.methods["setAngles"](keyLst.ToArray(), valueLst.ToArray(), 0.3f)
                        .Then(()=>{
                            dfd.Resolve();
                        });
                    });
                }
                else
                {
                    dfd.Resolve();
                }
                return dfd;
            };

            // いろいろな情報の更新をします
            bool bUpdateEnd = false;

            var updateDfd = new Deferred();
            updateDfd
                .Then(() =>
                {
                    return qiUt_.GetJointAngleTable()
                    .Then((angles) =>
                    {
                        jointAngleTbl_ = angles;
                    });
                })
                .Then(() =>
                {
                    return qiUt_.GetLaserSensorValues()
                    .Then((laserInfoTbl) =>
                    {
                        foreach (var info in laserInfoTbl.Values)
                        {
                            var laserPoints = new List<Vector2>();
                            foreach (var value in info.valueList)
                            {
                                laserPoints.Add(new Vector2(value.rotatedX, value.rotatedY));
                            }
                            if (info.key == "Front/Shovel/")
                            {
                                laserPointList_FrontShovel_ = laserPoints;
                            }
                            if (info.key == "Front/VerticalLeft/")
                            {
                                laserPointList_FrontVerticalLeft_ = laserPoints;
                            }
                            if (info.key == "Front/VerticalRight/")
                            {
                                laserPointList_FrontVerticalRight_ = laserPoints;
                            }
                            if (info.key == "Front/Horizontal/")
                            {
                                laserPointList_FrontHorizontal_ = laserPoints;
                            }
                            if (info.key == "Left/Horizontal/")
                            {
                                laserPointList_LeftHorizontal_ = laserPoints;
                            }
                            if (info.key == "Right/Horizontal/")
                            {
                                laserPointList_RightHorizontal_ = laserPoints;
                            }
                        }
                    });
                })
                .Then(() =>
                {
                    //カメラ画像を更新
                    if (imageDataBottom_ != null)
                    {
                        isUpdateImageDataBottom_ = true;
                    }
                    if (imageDataTop_ != null)
                    {
                        isUpdateImageDataTop_ = true;
                    }
                })
                .Then(moveTargetAngle)
                .Then(() =>
                {
                    bUpdateEnd = true;
                })
                ;
            // 更新開始！
            updateDfd.Resolve();

            while (!bUpdateEnd)
            {
                Thread.Sleep(10);
            }
        }
    }
}