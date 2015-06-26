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
using NaoQiUtils;


namespace hmd_app
{
    public partial class Form1 : Form
    {
        private QiMessaging qim_;
        private PepperCamera pcam_;
        private PepperCamera pcam2_;
        QiUt qiUt_;

        public Form1()
        {
            InitializeComponent();

            qim_ = new QiMessaging();
            pcam_ = new PepperCamera(qim_);
            pcam2_ = new PepperCamera(qim_);
            qiUt_ = new QiUt(qim_);
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

            qiUt_.GetJointAngleTable()
            .Then((angleTable) =>
            {
                var angleYaw = angleTable["HeadYaw"];
                var anglePitch = angleTable["HeadPitch"];

                qim_.Service("ALMotion").Then((almotion) =>
                {
                    almotion.methods["setAngles"](
                        new string[] { "HeadYaw", "HeadPitch" },
                        new float[] { angleYaw - 0.1f, anglePitch + 0.1f },
                        0.1f);
                });
            });

            return;

            qiUt_.GetJointAngleTable()
            .Then((angleTable) =>
            {
                var angleYaw   = angleTable["HeadYaw"];
                var anglePitch = angleTable["HeadPitch"];

                qim_.Service("ALMotion").Then((almotion)=>{
                    almotion.methods["setAngles"](
                        new string[] { "HeadYaw", "HeadPitch" },
                        new float[] { angleYaw + 0.1f, anglePitch + 0.1f },
                        0.1f);
                });
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

            pcam_.CaptureImage().Then((imageData) =>
            {
                Bitmap bmp = new Bitmap(imageData.w, imageData.h);
                //Bitmap bmp = new Bitmap(@"C:\Users\USER\Pictures\imagesFSV35AQP.jpg");

                //1ピクセルあたりのバイト数を取得する
                int pixelSize = 4;
                if (bmp.PixelFormat != System.Drawing.Imaging.PixelFormat.Format32bppArgb &&
                    bmp.PixelFormat != System.Drawing.Imaging.PixelFormat.Format32bppPArgb &&
                    bmp.PixelFormat != System.Drawing.Imaging.PixelFormat.Format32bppRgb)
                {
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
            })
            .ThenF(pcam2_.CaptureImage)
            .Then((imageData) =>
            {
            });
        }
        void TES<T>(Func<T> tt)
        {
        }
        void TES(Action tt)
        {
        }

        private void Form1_FormClosed(object sender, FormClosedEventArgs e)
        {
            if (qim_ != null)
            {
                qim_.Disconnect();
            }
        }
    }

}
