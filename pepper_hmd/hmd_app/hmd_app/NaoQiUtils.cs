using System;
using System.Collections.Generic;
using qiMessaging;

public class NaoQiUtils
{
    protected QiMessaging qim_;

    /// <summary>
    /// QiMessagingを使ったNaoQi関連の補助クラス
    /// </summary>
    /// <remarks>
    /// 便利クラスを追加してゆくところ
    /// </remarks>
    public NaoQiUtils(QiMessaging qim)
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


}