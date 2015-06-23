using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using qiMessaging;

namespace hmd_app
{
    public partial class Form1 : Form
    {
        private QiMessaging qim_;
        private PepperCamera pcam_;
        private PepperCamera pcam2_;
        NaoQiUtils qiUt_;

        public Form1()
        {
            InitializeComponent();

            qim_ = new QiMessaging();
            pcam_ = new PepperCamera(qim_);
            pcam2_ = new PepperCamera(qim_);
            qiUt_ = new NaoQiUtils(qim_);
        }

        private void button1_Click(object sender, EventArgs e)
        {
            var url = "http://192.168.11.20/libs/qimessaging/1.0";
            //var url = "http://192.168.11.23:8002";
            //var url = "http://192.168.3.51/libs/qimessaging/1.0";//192,168.3.51

            var dfd = new Deferred<QiMessaging>();

            dfd.Then((qim) =>
            {
                qim.Service("ALTextToSpeech").Then((alTTS) =>
                {
                    var dfd2 = new Deferred<object,JsonData>();

                    alTTS.methods["say"]("ぺっぷ");

                    pcam_.Option = new PepperCamera.OptionT {name="tesX", cam=0,};
                    pcam2_.Option = new PepperCamera.OptionT { name = "tesX2", cam = 1, };

                    pcam_.Subscribe().Then(() => { var test = 0; });
                    pcam2_.Subscribe();

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
                qim_.Connect(url);
            }
        }

        private void button2_Click(object sender, EventArgs e)
        {
            if (!qim_.IsConnected) return;

            Func<string, Func<Deferred<QiServiceJsonData,JsonData>>> MakeGetProxyFunc = (moduleName) =>
            {
                return () => { return qim_.Service(moduleName); };
            };
            
            Func<Deferred<Dictionary<string, float>>> getJointAngleTable = () =>
            {
                var dfd = new Deferred<Dictionary<string,float>>();
                qiUt_.MakeFunc_GetService("ALMotion")().Then((alMotion) =>
                {
                    return 
                    alMotion.methods["getAngles"]("Body",true)
                    .Then((angles)=>{
                        var angleLst = angles.JsonList;
                        dfd.Resolve(new Dictionary<string,float>{
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
            };


            getJointAngleTable()
            .Then((angleTable) =>
            {
                angleTable = angleTable;
            })
            .Then(qiUt_.MakeFunc_GetService("ALMotion"), () => { })
            .Then((alMotion) =>
            {
                var dfd2 = new Deferred<object,JsonData>();

                alMotion.methods["getSummary"]()
                .Then((summaryTxt) =>
                {
                    System.Diagnostics.Debug.WriteLine(summaryTxt.As<string>());

                    return alMotion.methods["getSensorNames"]();
                })
                .Then((names) =>
                {
                    foreach (var name in names.JsonList)
                    {
                        System.Diagnostics.Debug.WriteLine(name.As<string>());
                    }
                    return alMotion.methods["getBodyNames"]("Body");
                })
                .Then((names) =>
                {
                    foreach (var name in names.JsonList)
                    {
                        System.Diagnostics.Debug.WriteLine(name.As<string>());
                    }
                    return alMotion.methods["getAngles"]("Body", true);
                })
                .Then((angles) =>
                {
                    foreach (var angle in angles.JsonList)
                    {
                        System.Diagnostics.Debug.WriteLine(angle.Cast<double>());
                    }
                    return alMotion.methods["openHand"]("RHand");
                },
                (error) =>
                {
                    return new Deferred<JsonData, JsonData>().Reject(error);
                })
                .Then((names) =>
                {
                    foreach (var name in names.JsonList)
                    {
                        System.Diagnostics.Debug.WriteLine(name.As<string>());
                    }
                    return alMotion.methods["closeHand"]("RHand");
                })
                .Then(() =>
                {
                    string names = "HeadYaw";
                    float changes = 0.25f;
                    float fractionMaxSpeed = 0.05f;
                    alMotion.methods["changeAngles"](names, changes, fractionMaxSpeed);
                })
                .Fail((error) =>
                {
                    System.Diagnostics.Debug.WriteLine(error.As<string>());
                })
                ;

                return dfd2;
            });


            return;

            pcam_.CaptureImage((imageData) => {
                Bitmap bmp = new Bitmap(imageData.w, imageData.h);
                //Bitmap bmp = new Bitmap(@"C:\Users\USER\Pictures\imagesFSV35AQP.jpg");

                //1ピクセルあたりのバイト数を取得する
                int pixelSize = 4;
                if (bmp.PixelFormat != System.Drawing.Imaging.PixelFormat.Format32bppArgb &&
                    bmp.PixelFormat != System.Drawing.Imaging.PixelFormat.Format32bppPArgb &&
                    bmp.PixelFormat != System.Drawing.Imaging.PixelFormat.Format32bppRgb){
                    return;
                }

                //Bitmapをロックする
                var bmpDate = bmp.LockBits(
                    new Rectangle(0, 0, bmp.Width, bmp.Height),
                    System.Drawing.Imaging.ImageLockMode.ReadWrite, bmp.PixelFormat 
                );

                IntPtr ptr = bmpDate.Scan0;
                byte[] pixels = new byte[bmpDate.Stride * bmp.Height];
                System.Runtime.InteropServices.Marshal.Copy(ptr, pixels, 0, pixels.Length);

                for (int y = 0; y < bmpDate.Height; y++)
                {
                    for (int x = 0; x < bmpDate.Width; x++)
                    {
                        int src = (y * imageData.w + x) * 3;
                        int dst = y * bmpDate.Stride + x * pixelSize;
                        pixels[dst + 0] = imageData.pixels[src + 0];
                        pixels[dst + 1] = imageData.pixels[src + 1];
                        pixels[dst + 2] = imageData.pixels[src + 2];
                        pixels[dst + 3] = 255;
                    }
                }
                System.Runtime.InteropServices.Marshal.Copy(pixels, 0, ptr, pixels.Length);

                bmp.UnlockBits(bmpDate);
                pictureBox1.BackgroundImage = bmp;
            });
            pcam2_.CaptureImage((imageData) =>
            {
            });
        }

        private void Form1_FormClosed(object sender, FormClosedEventArgs e)
        {
            if (qim_ != null)
            {
                qim_.Disconnect();
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

        public Deferred<QiServiceJsonData, JsonData> Subscribe()
        {
            return qim_.Service("ALVideoDevice")
            .Then((ins) =>
            {
                alVideoDevice_ = ins;
            })
            .Then(() =>
            {
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
        public void CaptureImage(Action<ImageData> callback)
        {
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
                        callback(img);
                    }
                });
            }
        }
    }
}
