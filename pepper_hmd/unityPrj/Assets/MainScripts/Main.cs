using UnityEngine;
using System;
using System.Collections;
using System.Threading;
using qiMessaging;

public class Main : MonoBehaviour {

    public string Url = "http://192.168.11.20/libs/qimessaging/1.0";

    Thread thread_;

    QiMessaging qim_;
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

    PepperCamera.ImageData imageDataTop_;
    PepperCamera.ImageData imageDataBottom_;

    void Awake()
    {
    }
    void OnApplicationQuit()
    {
        thread_.Abort();
        qim_.Disconnect();
        qim_ = null;
        pcamTop_ = null;
        pcamBottom_ = null;
        print("Thread quit...");
    }    
	void Start () {
        print("start...");
        ThreadStart ts = new ThreadStart(MainLoop);
        thread_ = new Thread(ts);
        thread_.Start();
        print("Thread done...");
    }
    void Update()
    {
        if (imageDataTop_!=null)
        {
            cameraTextureTop_ = createTexImage_(imageDataTop_);
            GetComponent<Renderer>().material.mainTexture = cameraTextureTop_;
        }
        if (imageDataBottom_ != null)
        {
            cameraTextureBottom_ = createTexImage_(imageDataBottom_);
        }
    }

    void OnGUI()
    {
    }

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

    void MainLoop()
    {
        print("MainLoop...");

        qim_ = new QiMessaging();
        pcamTop_ = new PepperCamera(qim_);
        pcamBottom_ = new PepperCamera(qim_);
        pcamTop_.Option = new PepperCamera.OptionT {name="uniA", cam=0, };
        pcamBottom_.Option = new PepperCamera.OptionT { name = "uniB", cam = 1, };

        var dfd = new Deferred();

        dfd.Then<QiMessaging>((qim) =>
        {
            qim.Service("ALTextToSpeech").Then<QiServiceJsonData>((alTTS) =>
            {
                var dfd2 = new Deferred();

                alTTS.methods["say"]("ぺっぷオー");

                pcamTop_.Subscribe();
                pcamBottom_.Subscribe();

                return dfd2;
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

        //ループ
        while (true)
        {
            if (!qim_.IsConnected) continue;
#if false
            //ここらへんに色々角度などの取得を
            # Example showing how to get the position of the top camera
    name            = "CameraTop"
    frame           = motion.FRAME_WORLD
    useSensorValues = True
    result          = motionProxy.getPosition(name, frame, useSensorValues)
    print "Position of", name, " in World is:"
    print result

        getSensorNames

        
    # Example showing how to get the end of the right arm as a transform
    # represented in torso space. The result is a 4 by 4 matrix composed
    # of a 3*3 rotation matrix and a column vector of positions.
    name  = 'RArm'
    frame  = motion.FRAME_TORSO
    useSensorValues  = True
    result = motionProxy.getTransform(name, frame, useSensorValues)
    for i in range(0, 4):
        for j in range(0, 4):
            print result[4*i + j],
        print ''
#endif

            qim_.Service("ALMotion").Then<QiServiceJsonData>((alMotion) =>
            {
                var dfd2 = new Deferred();

                alMotion.methods["getPosition"](name,WaitForEndOfFrame,);

                return dfd2;
            });


            // カメラ画像を取り出します
            var syncA = false;
            var syncB = false;
            var bOkA = pcamTop_.CaptureImage((imageData) =>
            {
                if (imageDataTop_ == null)
                {
                    imageDataTop_ = imageData;
                }
                else
                {
                    lock (imageDataTop_)
                    {
                        imageDataTop_ = imageData;
                    }
                }
                syncA = true;
            });
            var bOkB = pcamBottom_.CaptureImage((imageData) =>
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
            });
            if (!bOkA || !bOkB)
            {
                Thread.Sleep(1000);
            }
            else
            {
                while (!syncA && !syncB)
                {
                    Thread.Sleep(10);
                }
            }
        }
    }
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
        public int frame_rate = 5; // frame_rate
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

    public Deferred Subscribe()
    {
        return qim_.Service("ALVideoDevice")
        .Then<QiServiceJsonData>((ins) =>
        {
            alVideoDevice_ = ins;
        })
        .Then(() =>
        {
            return alVideoDevice_.methods["getSubscribers"]().Then<JsonData>((list) =>
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
            .Then<JsonData>((nameId) =>
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
    public bool CaptureImage(Action<ImageData> callback)
    {
        if (nameId_ != null && nameId_.Length > 0)
        {
            alVideoDevice_.methods["getImageRemote"](nameId_).Then<JsonData>((data) =>
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
                    callback(img);
                }
            });
            return true;
        }
        return false;
    }
}