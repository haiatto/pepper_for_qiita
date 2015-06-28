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

    Dictionary<string, float> jointAngleTbl_;

    public Dictionary<string, float> JointAngleTbl
    {
        get { return jointAngleTbl_; }
    }

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


    [Range(-1.5f, 1.5f)]
    public float TargetHeadYaw;
    [Range(-1.5f, 1.5f)]
    public float TargetHeadPitch;

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

        pcamTop_.Subscribe();
        pcamBottom_.Subscribe();

        //ループ
        while (true)
        {
            if (!qim_.IsConnected) continue;

            Debug.Log("loop");

            // カメラ画像を取り出します
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
            },
            (error)=>{
                errorA=true;
            }
            );
            pcamBottom_.CaptureImage().Then((imageData) =>
            {
                if (imageDataBottom_ == null)
                {
                    imageDataBottom_  = imageData;
                }
                else
                {
                    lock (imageDataBottom_)
                    {
                        imageDataBottom_ = imageData;
                    }
                }
                syncB = true;
            },
            (error) =>
            {
                errorB = true;
            }
            );

            while (!syncA && !syncB)
            {
                if (errorA || errorB)
                {
                    Thread.Sleep(1000);
                    break;
                }
                Thread.Sleep(10);
            }

            //ここらへんに色々角度などの取得を
            Func <Deferred<object,object>> moveTargetAngle = () =>
            {
                var dfd = new Deferred<object, object>();
                if (jointAngleTbl_ != null)
                {
                    if ((TargetHeadYaw != jointAngleTbl_["HeadYaw"]) ||
                        (TargetHeadPitch != jointAngleTbl_["HeadPitch"]))
                    {
                        qim_.Service("ALMotion").Then((alMotion) =>
                        {
                            Debug.Log(string.Format("yaw{0} {1}", jointAngleTbl_["HeadYaw"], TargetHeadYaw));
                            alMotion.methods["setAngles"](
                                new string[] { "HeadYaw", "HeadPitch" },
                                new float[] { TargetHeadYaw, TargetHeadPitch },
                                0.3f);
                            dfd.Resolve();
                        });
                    }
                }
                return dfd;
            };

            // いろいろな情報の更新をします

            var updateDfd = new Deferred();
            updateDfd
#if false
                .Then(()=>
                    {
                        return qiUt_.GetJointAngleTable()
                        .Then((angles) =>
                        {
                            jointAngleTbl_ = angles;
                        });
                    })
#endif
                .Then(() =>
                {
                    //カメラ画像を更新
                    if (imageDataBottom_!=null)
                    {
                        isUpdateImageDataBottom_ = true;
                    }
                    if (imageDataTop_ != null)
                    {
                        isUpdateImageDataTop_ = true;
                    }
                })
#if false
                .Then(moveTargetAngle)
#endif
                ;
            // 更新開始！
            updateDfd.Resolve();

            Thread.Sleep(100);
        }
    }
}