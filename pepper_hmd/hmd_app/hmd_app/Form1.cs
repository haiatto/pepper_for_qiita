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

        public Form1()
        {
            InitializeComponent();

            qim_ = new QiMessaging();
        }

        private void button1_Click(object sender, EventArgs e)
        {
            var url = "http://192.168.11.20/libs/qimessaging/1.0";
            //var url = "http://192.168.11.23:8002"

            qim_.Connected += (qim) =>
            {
                qim.Service("ALTextToSpeech").Then((alTTS) =>
                {
                    var dfd = new Deferred();

                    (alTTS as QiInstance).methods["say"]("ぺっぷ");

                    return dfd;
                });
            };

            qim_.Connect(url);
        }

    }
}
