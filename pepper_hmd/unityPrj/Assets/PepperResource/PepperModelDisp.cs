using UnityEngine;
using UnityEditor;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Xml;
using System.Text.RegularExpressions;

public class PepperModelDisp : MonoBehaviour {

    public TextAsset  UrdfXmlAsset;

    public GameObject avatorDebugPointPrefab;
    public RuntimeAnimatorController animController;

    #region LoadUrdf => JointInfo, LinkInfo (情報としてロードします)

    public class OriginInfo
    {
        public Vector3 rpy;
        public Vector3 xyz;
    }
    public class GeometryInfo
    {
        public string filename;
        public Vector3 scale;
    }
    public class JointInfo
    {
        public string Name;
        public string Type;
        public string parentLink;
        public string childLink;
        public OriginInfo origin = new OriginInfo();
        public Vector3 axis;
        public LimitInfo limit;
        public MimicInfo mimic;
        public class LimitInfo
        {
            public float effort;
            public float lower;
            public float upper;
            public float velocity;
        };
        public class MimicInfo
        {
            public string joint;
            public float multiplier;
            public float offset;
        };
    }
    public class LinkInfo
    {
        public string Name;
        public class InertialInfo
        {
            public float mass;
            public OriginInfo origin;
            public float Inertia_ixx;
            public float Inertia_ixy;
            public float Inertia_ixz;
            public float Inertia_iyy;
            public float Inertia_iyz;
            public float Inertia_izz;
        }
        public class VisualInfo
        {
            public GeometryInfo geometry;
            public OriginInfo origin;
        }
        public class CollisionInfo
        {
            public GeometryInfo geometry;
            public OriginInfo origin;
        }
        public InertialInfo Inertial;
        public VisualInfo Visual;
        public CollisionInfo Collision;
    }

    Dictionary<string, JointInfo> jointInfos_ = new Dictionary<string, JointInfo>();
    Dictionary<string, LinkInfo> linkInfos_ = new Dictionary<string, LinkInfo>();

    Vector3 parseAttrVector3_(string value)
    {
        var values = value.Split(new char[] { ' ' }, System.StringSplitOptions.RemoveEmptyEntries);
        if (values.Length == 3)
        {
            return new Vector3(float.Parse(values[0]), float.Parse(values[1]), float.Parse(values[2]));
        }
        return new Vector3();
    }
    float parseAttrFloat_(string value)
    {
        return float.Parse(value);
    }

    void LoadUrdf()
    {
        XmlDocument xmlDoc = new XmlDocument(); // xmlDoc is the new xml document.
        xmlDoc.LoadXml(UrdfXmlAsset.text); // load the file.

        var joints = xmlDoc.GetElementsByTagName("joint");
        var links = xmlDoc.GetElementsByTagName("link");
        foreach (XmlNode joint in joints)
        {
            var info = new JointInfo();
            info.Name = joint.Attributes["name"].Value;
            info.Type = joint.Attributes["type"].Value;
            foreach (XmlNode jointSub in joint.ChildNodes)
            {
                switch (jointSub.Name)
                {
                    case "parent":
                        info.parentLink = jointSub.Attributes["link"].Value;
                        break;
                    case "child":
                        info.childLink = jointSub.Attributes["link"].Value;
                        break;
                    case "origin":
                        info.origin.rpy = parseAttrVector3_(jointSub.Attributes["rpy"].Value);
                        info.origin.xyz = parseAttrVector3_(jointSub.Attributes["xyz"].Value);
                        break;
                    case "axis":
                        info.axis = parseAttrVector3_(jointSub.Attributes["xyz"].Value);
                        break;
                    case "limit":
                        info.limit = new JointInfo.LimitInfo();
                        info.limit.effort = parseAttrFloat_(jointSub.Attributes["effort"].Value);
                        info.limit.lower = parseAttrFloat_(jointSub.Attributes["lower"].Value);
                        info.limit.upper = parseAttrFloat_(jointSub.Attributes["upper"].Value);
                        info.limit.velocity = parseAttrFloat_(jointSub.Attributes["velocity"].Value);
                        break;
                    case "mimic":
                        info.mimic = new JointInfo.MimicInfo();
                        info.mimic.joint = jointSub.Attributes["joint"].Value;
                        info.mimic.multiplier = parseAttrFloat_(jointSub.Attributes["multiplier"].Value); ;
                        info.mimic.offset = parseAttrFloat_(jointSub.Attributes["offset"].Value); ;
                        break;
                }
            }
            jointInfos_[info.Name] = info;
        }
        foreach (XmlNode link in links)
        {
            var info = new LinkInfo();
            info.Name = link.Attributes["name"].Value;
            foreach (XmlNode linkSub in link.ChildNodes)
            {
                switch (linkSub.Name)
                {
                    case "inertial":
                        info.Inertial = new LinkInfo.InertialInfo();
                        foreach (XmlNode inertialSub in linkSub.ChildNodes)
                        {
                            switch (inertialSub.Name)
                            {
                                case "mass":
                                    info.Inertial.mass = parseAttrFloat_(inertialSub.Attributes["value"].Value);
                                    break;
                                case "inertia":
                                    info.Inertial.Inertia_ixx = parseAttrFloat_(inertialSub.Attributes["ixx"].Value);
                                    info.Inertial.Inertia_ixy = parseAttrFloat_(inertialSub.Attributes["ixy"].Value);
                                    info.Inertial.Inertia_ixz = parseAttrFloat_(inertialSub.Attributes["ixz"].Value);
                                    info.Inertial.Inertia_iyy = parseAttrFloat_(inertialSub.Attributes["iyy"].Value);
                                    info.Inertial.Inertia_iyz = parseAttrFloat_(inertialSub.Attributes["iyz"].Value);
                                    info.Inertial.Inertia_izz = parseAttrFloat_(inertialSub.Attributes["izz"].Value);
                                    break;
                                case "origin":
                                    info.Inertial.origin = new OriginInfo();
                                    info.Inertial.origin.rpy = parseAttrVector3_(inertialSub.Attributes["rpy"].Value);
                                    info.Inertial.origin.xyz = parseAttrVector3_(inertialSub.Attributes["xyz"].Value);
                                    break;
                            }
                        }
                        break;
                    case "visual":
                        info.Visual = new LinkInfo.VisualInfo();
                        foreach (XmlNode visualSub in linkSub.ChildNodes)
                        {
                            switch (visualSub.Name)
                            {
                                case "geometry":
                                    info.Visual.geometry = new GeometryInfo();
                                    foreach (XmlNode geometrySub in visualSub.ChildNodes)
                                    {
                                        switch (geometrySub.Name)
                                        {
                                            case "mesh":
                                                info.Visual.geometry.filename = geometrySub.Attributes["filename"].Value;
                                                info.Visual.geometry.scale = parseAttrVector3_(geometrySub.Attributes["scale"].Value);
                                                break;
                                        }
                                    }
                                    break;
                                case "origin":
                                    info.Visual.origin = new OriginInfo();
                                    info.Visual.origin.rpy = parseAttrVector3_(visualSub.Attributes["rpy"].Value);
                                    info.Visual.origin.xyz = parseAttrVector3_(visualSub.Attributes["xyz"].Value);
                                    break;
                            }
                        }
                        break;
                    case "collision":
                        info.Collision = new LinkInfo.CollisionInfo();
                        foreach (XmlNode collisionSub in linkSub.ChildNodes)
                        {
                            switch (collisionSub.Name)
                            {
                                case "geometry":
                                    info.Collision.geometry = new GeometryInfo();
                                    foreach (XmlNode geometrySub in collisionSub.ChildNodes)
                                    {
                                        switch (geometrySub.Name)
                                        {
                                            case "mesh":
                                                info.Collision.geometry.filename = geometrySub.Attributes["filename"].Value;
                                                info.Collision.geometry.scale = parseAttrVector3_(geometrySub.Attributes["scale"].Value);
                                                break;
                                            case "origin":
                                                info.Collision.origin = new OriginInfo();
                                                info.Collision.origin.rpy = parseAttrVector3_(geometrySub.Attributes["rpy"].Value);
                                                info.Collision.origin.xyz = parseAttrVector3_(geometrySub.Attributes["xyz"].Value);
                                                break;
                                        }
                                    }
                                    break;
                            }
                        }
                        break;
                }
            }
            linkInfos_[info.Name] = info;
        }
    }

    #endregion

    #region JointInfo, LinkInfo => Joint, Links (モデルを生成します)

    public class Joint
    {
        internal float angleRad;
        internal JointInfo jointInfo;
        internal GameObject jointObj;

        internal void createIkLimit_()
        {
            if (JointInfo.Type == "revolute")
            {
                var limitHinge = jointObj.AddComponent<RootMotion.FinalIK.RotationLimitHinge>();
                var axis = changeCoordVector3_(jointInfo.axis);
                axis = -axis;//左手座標系の回転なので逆になるので軸を逆にしておきます
                limitHinge.axis = axis;
                limitHinge.min = AngleLimitLower;
                limitHinge.max = AngleLimitUpper;
            }
        }

        public GameObject JointGameObject
        {
            get { return jointObj; }
        }
        public JointInfo JointInfo
        {
            get { return jointInfo; }
        }

        public void ApplyFromTransform()
        {
            if (JointInfo.Type == "revolute")
            {
                var tr = JointGameObject.transform;

                var axis = changeCoordVector3_(jointInfo.axis);
                axis = -axis;

                Vector3 crossV;
                if (Mathf.Abs(Vector3.Dot(axis, Vector3.up)) != 1.0f)
                {
                    crossV = Vector3.Cross(axis, Vector3.up);
                }
                else
                {
                    crossV = Vector3.Cross(axis, Vector3.left);
                }
                var otherV = Vector3.Cross(axis, crossV);
                var tmpV = tr.localRotation * crossV;
                var a = Vector3.Dot(crossV, tmpV);
                var b = Vector3.Dot(otherV, tmpV);
                float value = Mathf.Atan2(b, a) * Mathf.Rad2Deg;
                var angleDeg = Mathf.Clamp(value, AngleLimitLower, AngleLimitUpper);
                angleRad = angleDeg * Mathf.Deg2Rad;
            }
        }

        public float AngleDeg
        {
            set
            {
                var angleDeg = Mathf.Clamp(value, AngleLimitLower, AngleLimitUpper);
                angleRad = angleDeg * Mathf.Deg2Rad;
                var axis = changeCoordVector3_(jointInfo.axis);
                axis = -axis;
                var q = Quaternion.AngleAxis(angleDeg, axis);
                jointObj.transform.localRotation = q;
            }
            get
            {
                return angleRad * Mathf.Rad2Deg;
            }
        }
        public float AngleLimitUpper
        {
            get { if (jointInfo.limit == null)return 0; 
                return jointInfo.limit.upper * Mathf.Rad2Deg; 
            }
        }
        public float AngleLimitLower
        {
            get { if (jointInfo.limit == null)return 0; 
                return jointInfo.limit.lower * Mathf.Rad2Deg; 
            }
        }
    }
    public class Link
    {
        internal LinkInfo linkInfo;
        internal GameObject linkObj;

        public GameObject LinkGameObject
        {
            get { return linkObj; }
        }
    }
    public Dictionary<string, Joint> Joints = new Dictionary<string, Joint>();
    public Dictionary<string, Link> Links = new Dictionary<string, Link>();
    public Vector3    BaseFootprintOffsetPos = new Vector3();
    public Quaternion BaseFootprintOffsetRotate = new Quaternion();

    void createLinkAndJoint_()
    {
        // Link(剛体的なモデル)を生成
        foreach (var linkKv in linkInfos_)
        {
            var obj = new GameObject();
            var info = linkKv.Value;
            obj.name = "link#" + info.Name;
            if (info.Visual != null && info.Visual.geometry != null)
            {
                obj.transform.localPosition = changeCoordVector3_(info.Visual.origin.xyz);
                obj.transform.localRotation = changeAngleQuaternion_(info.Visual.origin.rpy);

                var visibleObj = new GameObject();
                visibleObj.name = "visibleRoot";
                visibleObj.transform.SetParent(obj.transform, false);
                visibleObj.transform.localScale = changeScaleVector3_(info.Visual.geometry.scale);

                var m = Regex.Match(info.Visual.geometry.filename, "package://(.+)\\.dae");
                if (m.Success)
                {
                    var meshObj = Instantiate(Resources.Load(m.Groups[1].Value) as GameObject);
                    meshObj.transform.SetParent(visibleObj.transform, false);
                    meshObj.transform.localRotation = changeCoordModelRotate_();
                }
            }

            Links[linkKv.Key] = new Link(){
                linkObj = obj,
                linkInfo = info,
            };
        }
        // Joint(ヒンジやボールなどの可動する関節)を生成＆Link(剛体的なもの)との接続
        foreach (var jointKv in jointInfos_)
        {
            var obj = new GameObject();
            var info = jointKv.Value;

            obj.name = "joint#" + info.Name;
            obj.transform.localPosition = changeCoordVector3_(info.origin.xyz);
            obj.transform.localRotation = changeAngleQuaternion_(info.origin.rpy);

            var parentObj = Links[info.parentLink].LinkGameObject;
            var childObj = Links[info.childLink].LinkGameObject;
            if (parentObj != null)
            {
                obj.transform.SetParent(parentObj.transform, false);
            }
            if (childObj != null)
            {
                childObj.transform.SetParent(obj.transform, false);
            }

            Joints[jointKv.Key] = new Joint()
            {
                jointObj = obj,
                jointInfo = info,
                angleRad = 0
            };
        }
        // 基準となる値を初期状態のうちに覚えておきます
        {
            var baseLink = Links["base_link"].LinkGameObject;
            var baseFootprint = Links["base_footprint"].LinkGameObject;

            var baseLinkTr = baseLink.transform;
            var baseFootprintTr = baseFootprint.transform;

            BaseFootprintOffsetPos = baseLinkTr.position - baseFootprintTr.position;
            BaseFootprintOffsetRotate = baseLinkTr.rotation * Quaternion.Inverse(baseFootprintTr.rotation);
        }
    }
    static Vector3 changeCoordVector3_(Vector3 v)
    {
        return new Vector3(-v[1], v[2], v[0]);
    }
    static Vector3 changeScaleVector3_(Vector3 v)
    {
        return new Vector3(v[1], v[2], v[0]);
    }
    static Quaternion changeAngleQuaternion_(Vector3 v)
    {
        if (v[1] != 0)
        {
            return Quaternion.Euler(0, 0, 0);
        }
        var q = Quaternion.Euler(
            0,//v[2] * Mathf.Rad2Deg, 
            0,//v[0] * Mathf.Rad2Deg, 
            0//v[1] * Mathf.Rad2Deg
        );
        return q;
    }
    static Quaternion changeCoordModelRotate_()
    {
        return Quaternion.Euler(-90, 90, 0);
    }

    #endregion

    #region Joints <= add IK
    public Transform RHandTarget;
    public Transform LHandTarget;
    RootMotion.FinalIK.CCDIK ikRHand_;
    RootMotion.FinalIK.CCDIK ikLHand_;

    void createIk_()
    {
        // IKの回転の制限を設定します
        foreach(var joint in Joints.Values)
        {
            joint.createIkLimit_();
        }
        // IKを設定します
        {
            ikRHand_ = Joints["RShoulderPitch"].JointGameObject.AddComponent<RootMotion.FinalIK.CCDIK>();
            ikRHand_.solver.SetChain(
                new Transform[]{
                    Joints["RShoulderPitch"].JointGameObject.transform,
                    Joints["RShoulderRoll"].JointGameObject.transform,
                    Joints["RElbowYaw"].JointGameObject.transform,
                    Joints["RElbowRoll"].JointGameObject.transform,
                    Joints["RWristYaw"].JointGameObject.transform,
                },
                Joints["RShoulderPitch"].JointGameObject.transform
                );
            ikLHand_ = Joints["LShoulderPitch"].JointGameObject.AddComponent<RootMotion.FinalIK.CCDIK>();
            ikLHand_.solver.SetChain(
                new Transform[]{
                    Joints["LShoulderPitch"].JointGameObject.transform,
                    Joints["LShoulderRoll"].JointGameObject.transform,
                    Joints["LElbowYaw"].JointGameObject.transform,
                    Joints["LElbowRoll"].JointGameObject.transform,
                    Joints["LWristYaw"].JointGameObject.transform,
                },
                Joints["LShoulderPitch"].JointGameObject.transform
                );
        }
    }
    #endregion

    #region JointObjs => Avatar

#if false
    封印。アバター便利じゃない。

    GameObject avatarObj_;
    Avatar     avatar_;
    Animator   animator_;
    IKControl  ikControl_;
    Dictionary<string, GameObject> avatarObjTbl_ = new Dictionary<string, GameObject>();

    class AvatorJointLink_
    {
        public string jointParent;
        public string joint;
    };

    /// <summary>
    /// ペッパーのモデルとUnityのMecanimeシステムを間接的に関連付ける為の中継用のモデルを作ります
    /// </summary>
    /// <remarks>
    /// ロボは関節が回転方向毎に用意されていたりと実際のロボットとの違いがあるので間接的にしています
    /// </remarks>
    void createAvatar_()
    {
        // Pepperモデルを推奨されているバインドポーズにします(この形にすると勝手に割り当てるらしい)
        Joints["LShoulderRoll"].AngleDeg = 90;
        Joints["RShoulderRoll"].AngleDeg = -90;

        var humanLst = new List<HumanBone>();
        var skeletonLst = new List<SkeletonBone>();

        System.Func<string, GameObject, HumanBone> createHumanBone = (key, obj) =>
        {
            HumanBone human_bone = new HumanBone();
            human_bone.humanName = key;
            human_bone.boneName = obj.name;
            human_bone.limit.useDefaultValues = true;
            return human_bone;
        };
        System.Func<GameObject, SkeletonBone> createSkeletonBone = (obj) =>
        {
            SkeletonBone skeleton_bone = new SkeletonBone();
            skeleton_bone.name = obj.name;
            Transform transform = obj.transform;
            skeleton_bone.position = transform.localPosition;
            skeleton_bone.rotation = transform.localRotation;
            skeleton_bone.scale = transform.localScale;
            return skeleton_bone;
        };

        System.Action<string, string, AvatorJointLink_> addBone = (name, parentName, avatorJointLink) =>
        {
            GameObject gameObj = new GameObject();
            gameObj.name = name;
            gameObj.transform.name = gameObj.name;
            avatarObjTbl_[gameObj.name] = gameObj;
            if (avatorJointLink.joint != null)
            {
                var tr  = Joints[avatorJointLink.joint      ].JointGameObject.transform;
                var trP = Joints[avatorJointLink.jointParent].JointGameObject.transform;
                gameObj.transform.localPosition = tr.position - trP.position;
            }
            else
            {
                //長さゼロにしたら色んな所にInfが混ざって死んだので…仕方なくオフセットしておきます
                //(まあ実際に使われない部分なので問題なし)
                gameObj.transform.localPosition = new Vector3(0, -0.01f, 0);
            }
            if (parentName != null)
            {
                gameObj.transform.SetParent(avatarObjTbl_[parentName].transform, false);
            }
            else
            {
                gameObj.transform.SetParent(avatarObj_.transform, false);
            }
    
            if (avatorDebugPointPrefab != null)
            {
                var debugPoint = Instantiate(avatorDebugPointPrefab);
                debugPoint.transform.SetParent(gameObj.transform, false);
            }
            
            var humanBone = new HumanBone();
            {
                humanBone.humanName = name;
                humanBone.boneName = gameObj.name;
                humanBone.limit.useDefaultValues = false;
                if (avatorJointLink.joint != null)
                {
                    humanBone.limit.useDefaultValues = true;
/*                    if (name == "RightUpperArm")
                    {
                        humanBone.limit.min = new Vector3(-90, -90, -90);
                        humanBone.limit.max = new Vector3(30, 30, 0);
                        humanBone.limit.center = new Vector3(-80, -80, 90);
                        //humanBone.limit.axisLength = 0;
                        humanBone.limit.useDefaultValues = false;
                    }*/
                }
                else
                {
                    humanBone.limit.max = new Vector3(0, 0, 0);
                    humanBone.limit.min = new Vector3(0, 0, 0);
                    humanBone.limit.axisLength = 0;
                }
            }
            var skeltonBone = new SkeletonBone();
            {
                skeltonBone.name = gameObj.name;
                Transform transform = gameObj.transform;
                skeltonBone.position = transform.localPosition;
                skeltonBone.rotation = transform.localRotation;
                skeltonBone.scale = transform.localScale;
            }
            humanLst.Add(humanBone);
            skeletonLst.Add(skeltonBone);
        };
        avatarObj_ = new GameObject();
        avatarObj_.name = "Root";
        skeletonLst.Add(createSkeletonBone(avatarObj_));

        //顔系
        addBone("Hips", null, new AvatorJointLink_() { joint = "HipRoll", jointParent = "base_link_fixedjoint", });//ヒップ◆
        addBone("Spine", "Hips", new AvatorJointLink_() { });//背骨◆
        addBone("Head", "Spine", new AvatorJointLink_() { joint = "HeadYaw", jointParent = "HipRoll", });//頭◆

        //足系
        addBone("LeftUpperLeg", "Hips", new AvatorJointLink_() { joint = "KneePitch", jointParent = "HipRoll", });	//左脚上部◆
        addBone("RightUpperLeg", "Hips", new AvatorJointLink_() { joint = "KneePitch", jointParent = "HipRoll", });	//右脚上部◆

        addBone("LeftLowerLeg", "LeftUpperLeg",   new AvatorJointLink_() { });	//左脚◆
        addBone("RightLowerLeg", "RightUpperLeg", new AvatorJointLink_() { });	//右脚◆

        addBone("LeftFoot", "LeftLowerLeg",   new AvatorJointLink_() { });	//左足◆
        addBone("RightFoot", "RightLowerLeg", new AvatorJointLink_() { });	//右足◆

        //手系
        addBone("LeftUpperArm", "Spine", new AvatorJointLink_() { joint = "LShoulderPitch", jointParent = "HipRoll", });	//左腕上部◆
        addBone("RightUpperArm", "Spine", new AvatorJointLink_() { joint = "RShoulderPitch", jointParent = "HipRoll", });	//右腕上部◆
        addBone("LeftLowerArm", "LeftUpperArm", new AvatorJointLink_() { joint = "LElbowYaw", jointParent = "LShoulderPitch", });	//左腕◆
        addBone("RightLowerArm", "RightUpperArm", new AvatorJointLink_() { joint = "RElbowYaw", jointParent = "RShoulderPitch", });	//右腕◆
        addBone("LeftHand", "LeftLowerArm", new AvatorJointLink_() { joint = "LWristYaw", jointParent = "LElbowYaw", });	//左手◆
        addBone("RightHand", "RightLowerArm", new AvatorJointLink_() { joint = "RWristYaw", jointParent = "RElbowYaw", });	//右手◆

        //アバターを作成します
        var humanDesc = new HumanDescription();
        humanDesc.human = humanLst.ToArray();
        humanDesc.skeleton = skeletonLst.ToArray();
        humanDesc.lowerArmTwist = 0.0f;
        humanDesc.upperArmTwist = 0.0f;
        humanDesc.upperLegTwist = 0.0f;
        humanDesc.lowerLegTwist = 0.0f;
        humanDesc.armStretch = 0.0f;
        humanDesc.legStretch = 0.0f;
        humanDesc.feetSpacing = 0.0f;
        avatar_ = AvatarBuilder.BuildHumanAvatar(avatarObj_, humanDesc);

        //TEST
        //AssetDatabase.CreateAsset(avatar_, "Assets/test.avatar.asset");

        //アバターをアニメーターに設定します
        animator_ = avatarObj_.AddComponent<Animator>();
        animator_.avatar = avatar_;
        animator_.runtimeAnimatorController = animController;
        //        animator_.runtimeAnimatorController = Instantiate<RuntimeAnimatorController>(animController);

#if true
        ikControl_ = avatarObj_.AddComponent<IKControl>();
        ikControl_.ikActive = true;
        ikControl_.rightHandObj = GameObject.Find("IKRHand").transform;
#endif
    }
#endif
    #endregion 

    #region Apply Avator to Pepper

#if false
    封印。Avatorにしても、あんまり便利じゃなかったので…。むしろMMDにネイティブ対応したりした方が便利そう。

    void applyAvatorToPepper_()
    {
        //TODO:多分アバターからの関節位置目標、みたいな変数を別途用意してみた方が良いかも？
        //TODO:実際の空間上でモノにぶつかる等は一時的なコリジョンを更新する形にして、
        //TODO:ここでは考慮しない方がよさそう。
        //TODO:(アバター側が一時的なコリジョンの影響を受けて姿勢を変えるように制御する。IKがいい感じに働くように)

        //アバターの関節を2軸のジョイントにプロットしてみます(球体関節っていうことにして今は中心の位置とか細かい事は気にしない)

        // 肩は自由度が2軸しか無いので、軸(上腕)を向ける方向は決められるけれど
        // 軸周りの回転(上腕のひねり)は決められません(一意に決まってしまいます)
        // なので1軸のベクトルをもとに逆算します(要するにはアバター側がどう捻じれていても反映できない)
        // もし捻じれがあるなら、肘から下(下腕)に対してはねじれが反映できるのでそこは後で考慮こととします
        // (アバター的に肩関節に捻じれがないようになってれば問題ない。要調査)

        //HACK:
        // ミスで、グローバルな回転値をプロットしたら、
        // 本来は入ってる体の捻り等、Pepperの関節で単純には再現出来ない動き分がフェイクだけど
        // 反映されていい感じになった…
        // Pepperは体の腰の左右の捻りが存在しない(移動することで一応再現はできるけど)ので、
        // 捻りは表現できないけれど、捻りから作り出される腕関節の回転値を微妙に反映させてフェイクだけど
        // それっぽく動かすといのはいい考えなのかも…。
        // 体が硬い人が、準備体操やるとき、腰をひねらず腕だけでっぽく運動しているみたいな…
        // 少なくとも、自分には全体的な動きに見えた

        {
            var leftUpperArmTr = avatarObjTbl_["LeftUpperArm"].transform;
            var leftLowerArmTr = avatarObjTbl_["LeftLowerArm"].transform;
            var leftHandTr = avatarObjTbl_["LeftHand"].transform;
            var rightUpperArmTr = avatarObjTbl_["RightUpperArm"].transform;
            var rightLowerArmTr = avatarObjTbl_["RightLowerArm"].transform;
            var rightHandTr = avatarObjTbl_["RightHand"].transform;

            var hipsTr = avatarObjTbl_["Hips"].transform;
            var spineTr = avatarObjTbl_["Spine"].transform;
            var headTr = avatarObjTbl_["Head"].transform;
            var leftUpperLegTr = avatarObjTbl_["LeftUpperLeg"].transform;
            var rightUpperLegTr = avatarObjTbl_["RightUpperLeg"].transform;
            var leftLowerLegTr = avatarObjTbl_["LeftLowerLeg"].transform;
            var rightLowerLegTr = avatarObjTbl_["RightLowerLeg"].transform;
            var leftFootTr = avatarObjTbl_["LeftFoot"].transform;
            var rightFootTr = avatarObjTbl_["RightFoot"].transform;

            // 右腕を反映します
            {
                // Tポーズで腕の方向を向いてる軸ベクトル
                var axisX = new Vector3(1, 0, 0);
                var axisY = new Vector3(0, 1, 0);
                var axisZ = new Vector3(0, 0, 1);
                var uArmRotAngleX = 0.0f;
                {
                    var m = Matrix4x4.TRS(Vector3.zero, rightUpperArmTr.localRotation, Vector3.one);
                    var trUArmAxisX = new Vector3(m.GetColumn(0).x, m.GetColumn(0).y, m.GetColumn(0).z);
                    var trUArmAxisY = new Vector3(m.GetColumn(1).x, m.GetColumn(1).y, m.GetColumn(1).z);
                    var trUArmAxisZ = new Vector3(m.GetColumn(2).x, m.GetColumn(2).y, m.GetColumn(2).z);

                    //アバターのTポーズは腕はX軸に向いている。肘の軸はY軸で曲がる
                    var tmpArmV = trUArmAxisX;
                    var tmpArmVForward = trUArmAxisZ;

                    // 腕の方向のベクトルをY-Z平面に投影してX軸回転を出します。(+Z方向をゼロ度扱いにしておきます)
                    // Pepperの肩のサーボをTポーズ的に見た場合はこの平面です。
                    // ※体への取り付け角度が斜めってたら投影する軸を後で直せばOK。でも多分斜めってないはず)
                    var rotAngleX = 0.0f;
                    {
                        var uArmDotY = Vector3.Dot(axisY, tmpArmV);
                        var uArmDotZ = Vector3.Dot(axisZ, tmpArmV);
                        if (uArmDotY * uArmDotY + uArmDotZ * uArmDotZ > 0.0001f)
                        {
                            //負をかけてるのは右手座標系だから…
                            rotAngleX = -Mathf.Atan2(uArmDotY, uArmDotZ) * Mathf.Rad2Deg;
                        }
                    }
                    // X軸回転成分をキャンセルします
                    tmpArmV = Quaternion.AngleAxis(-rotAngleX, axisX) * tmpArmV;
                    tmpArmVForward = Quaternion.AngleAxis(-rotAngleX, axisX) * tmpArmVForward;

                    // X軸キャンセル後の腕のベクトルをX-Z平面に投影してY軸回転を出します。(+X方向をゼロ度扱いにしておきます)
                    // Pepperの肩の球内のサーボをTポーズ的に見た場合はこの平面です。
                    var rotAngleY = 0.0f;
                    {
                        var uArmDotX = Vector3.Dot(axisX, tmpArmV);
                        var uArmDotZ = Vector3.Dot(axisZ, tmpArmV);
                        if (uArmDotX * uArmDotX + uArmDotZ * uArmDotZ > 0.0001f)
                        {
                            rotAngleY = -Mathf.Atan2(uArmDotZ, uArmDotX) * Mathf.Rad2Deg;
                        }
                    }
                    // Y軸回転成分をキャンセルします(これでX軸方向になった)
                    tmpArmV = Quaternion.AngleAxis(-rotAngleY, axisY) * tmpArmV;
                    tmpArmVForward = Quaternion.AngleAxis(-rotAngleY, axisY) * tmpArmVForward;

                    // XY軸キャンセル後の腕の前方のベクトル(元はZ軸)をY-Z平面に投影してX軸回転を出します。(+Z方向をゼロ度扱いにしておきます)
                    // Pepperの肘の上腕との接続したサーボをTポーズ的に見た場合はこの平面です。
                    // ここは肩では表現できない捻じれの軸なので、肘側の計算に反映させる必要があります。
                    // (アバターのマッスルの設定を見る限り捻じれはなさそうですが実際は2軸で表現できない回転がかかってる雰囲気でした)
                    var rotAngleFX = 0.0f;
                    {
                        var uArmDotY = Vector3.Dot(axisY, tmpArmVForward);
                        var uArmDotZ = Vector3.Dot(axisZ, tmpArmVForward);
                        if (uArmDotY * uArmDotY + uArmDotZ * uArmDotZ > 0.0001f)
                        {
                            rotAngleFX = -Mathf.Atan2(uArmDotY, uArmDotZ) * Mathf.Rad2Deg;
                        }
                    }

                    // ジョイントに反映します(TPoseでの左手座標系の回転角をPepperの角度に合わせて変換します)
                    Joints["RShoulderPitch"].AngleDeg = rotAngleX;//体から肩をに対するサーボ
                    Joints["RShoulderRoll"].AngleDeg = -90 - rotAngleY;//肩の球内のサーボ

                    uArmRotAngleX = rotAngleFX;
                }
                {
                    //上腕のX軸回転成分を反映します
                    var q = Quaternion.AngleAxis(uArmRotAngleX, axisX);
                    var m = Matrix4x4.TRS(Vector3.zero, q * rightLowerArmTr.localRotation, Vector3.one);

                    var trLArmAxisX = new Vector3(m.GetColumn(0).x, m.GetColumn(0).y, m.GetColumn(0).z);
                    var trLArmAxisY = new Vector3(m.GetColumn(1).x, m.GetColumn(1).y, m.GetColumn(1).z);
                    var trLArmAxisZ = new Vector3(m.GetColumn(2).x, m.GetColumn(2).y, m.GetColumn(2).z);

                    var tmpArmV = trLArmAxisX;
                    var tmpArmVForward = trLArmAxisZ;
                    var rotAngleX = 0.0f;
                    {
                        var uArmDotY = Vector3.Dot(axisY, tmpArmV);
                        var uArmDotZ = Vector3.Dot(axisZ, tmpArmV);
                        if (uArmDotY * uArmDotY + uArmDotZ * uArmDotZ > 0.0001f)
                        {
                            rotAngleX = -Mathf.Atan2(uArmDotY, uArmDotZ) * Mathf.Rad2Deg;
                        }
                    }
                    tmpArmV = Quaternion.AngleAxis(-rotAngleX, axisX) * tmpArmV;
                    tmpArmVForward = Quaternion.AngleAxis(-rotAngleX, axisX) * tmpArmVForward;

                    var rotAngleY = 0.0f;
                    {
                        var uArmDotX = Vector3.Dot(axisX, tmpArmV);
                        var uArmDotZ = Vector3.Dot(axisZ, tmpArmV);
                        if (uArmDotX * uArmDotX + uArmDotZ * uArmDotZ > 0.0001f)
                        {
                            rotAngleY = -Mathf.Atan2(uArmDotZ, uArmDotX) * Mathf.Rad2Deg;
                        }
                    }
                    tmpArmV = Quaternion.AngleAxis(-rotAngleY, axisY) * tmpArmV;
                    tmpArmVForward = Quaternion.AngleAxis(-rotAngleY, axisY) * tmpArmVForward;

                    var rotAngleZ = 0.0f;
                    {
                        var uArmDotY = Vector3.Dot(axisY, tmpArmVForward);
                        var uArmDotZ = Vector3.Dot(axisZ, tmpArmVForward);
                        if (uArmDotY * uArmDotY + uArmDotZ * uArmDotZ > 0.0001f)
                        {
                            rotAngleZ = -Mathf.Atan2(uArmDotY, uArmDotZ) * Mathf.Rad2Deg;
                        }
                    }

                    Joints["RElbowYaw"].AngleDeg = -rotAngleX/* - uArmRotAngleZ*/;
                    Joints["RElbowRoll"].AngleDeg = -rotAngleY;

                    uArmRotAngleX = rotAngleZ;
                }
            }
            // 左腕を反映します
            {
                // Tポーズで腕の方向を向いてる軸ベクトル
                var axisX = new Vector3(1, 0, 0);
                var axisY = new Vector3(0, 1, 0);
                var axisZ = new Vector3(0, 0, 1);
                var uArmRotAngleX = 0.0f;
                {
                    var m = Matrix4x4.TRS(Vector3.zero, leftUpperArmTr.localRotation, Vector3.one);
                    var trUArmAxisX = new Vector3(m.GetColumn(0).x, m.GetColumn(0).y, m.GetColumn(0).z);
                    var trUArmAxisY = new Vector3(m.GetColumn(1).x, m.GetColumn(1).y, m.GetColumn(1).z);
                    var trUArmAxisZ = new Vector3(m.GetColumn(2).x, m.GetColumn(2).y, m.GetColumn(2).z);

                    //左腕のアバターのTポーズは腕は-X軸に向いている。肘の軸はY軸で曲がる
                    var tmpArmV = -trUArmAxisX;
                    var tmpArmVForward = trUArmAxisZ;

                    // 腕の方向のベクトルをY-Z平面に投影してX軸回転を出します。(+Z方向をゼロ度扱いにしておきます)
                    // Pepperの肩のサーボをTポーズ的に見た場合はこの平面です。
                    // ※体への取り付け角度が斜めってたら投影する軸を後で直せばOK。でも多分斜めってないはず)
                    var rotAngleX = 0.0f;
                    {
                        var uArmDotY = Vector3.Dot(axisY, tmpArmV);
                        var uArmDotZ = Vector3.Dot(axisZ, tmpArmV);
                        if (uArmDotY * uArmDotY + uArmDotZ * uArmDotZ > 0.0001f)
                        {
                            //負をかけてるのは右手座標系だから…
                            rotAngleX = -Mathf.Atan2(uArmDotY, uArmDotZ) * Mathf.Rad2Deg;
                        }
                    }
                    // X軸回転成分をキャンセルします
                    tmpArmV = Quaternion.AngleAxis(-rotAngleX, axisX) * tmpArmV;
                    tmpArmVForward = Quaternion.AngleAxis(-rotAngleX, axisX) * tmpArmVForward;

                    // X軸キャンセル後の腕のベクトルをX-Z平面に投影してY軸回転を出します。(+X方向をゼロ度扱いにしておきます)
                    // Pepperの肩の球内のサーボをTポーズ的に見た場合はこの平面です。
                    var rotAngleY = 0.0f;
                    {
                        var uArmDotX = Vector3.Dot(-axisX, tmpArmV);
                        var uArmDotZ = Vector3.Dot(axisZ, tmpArmV);
                        if (uArmDotX * uArmDotX + uArmDotZ * uArmDotZ > 0.0001f)
                        {
                            rotAngleY = -Mathf.Atan2(uArmDotZ, uArmDotX) * Mathf.Rad2Deg;
                        }
                    }
                    // Y軸回転成分をキャンセルします(これでX軸方向になった)
                    tmpArmV = Quaternion.AngleAxis(-rotAngleY, -axisY) * tmpArmV;
                    tmpArmVForward = Quaternion.AngleAxis(-rotAngleY, -axisY) * tmpArmVForward;

                    // XY軸キャンセル後の腕の前方のベクトル(元はZ軸)をY-Z平面に投影してX軸回転を出します。(+Z方向をゼロ度扱いにしておきます)
                    // Pepperの肘の上腕との接続したサーボをTポーズ的に見た場合はこの平面です。
                    // ここは肩では表現できない捻じれの軸なので、肘側の計算に反映させる必要があります。
                    // (アバターのマッスルの設定を見る限り捻じれはなさそうですが実際は2軸で表現できない回転がかかってる雰囲気でした)
                    var rotAngleFX = 0.0f;
                    {
                        var uArmDotY = Vector3.Dot(axisY, tmpArmVForward);
                        var uArmDotZ = Vector3.Dot(axisZ, tmpArmVForward);
                        if (uArmDotY * uArmDotY + uArmDotZ * uArmDotZ > 0.0001f)
                        {
                            rotAngleFX = -Mathf.Atan2(uArmDotY, uArmDotZ) * Mathf.Rad2Deg;
                        }
                    }

                    // ジョイントに反映します(TPoseでの左手座標系の回転角をPepperの角度に合わせて変換します)
                    var rotRoll = rotAngleY+90;//-rotAngleY - 90;
                    if (rotRoll > 180) { rotRoll -= 360; }
                    if (rotRoll < -180) { rotRoll += 360; }
                    Joints["LShoulderPitch"].AngleDeg = rotAngleX;//体から肩をに対するサーボ
                    Joints["LShoulderRoll"].AngleDeg = rotRoll;//肩の球内のサーボ
                        
                    uArmRotAngleX = rotAngleFX;
                }
                {
                    //上腕のX軸回転成分を反映します
                    var q = Quaternion.AngleAxis(uArmRotAngleX, axisX);
                    var m = Matrix4x4.TRS(Vector3.zero, q * leftLowerArmTr.localRotation, Vector3.one);

                    var trLArmAxisX = new Vector3(m.GetColumn(0).x, m.GetColumn(0).y, m.GetColumn(0).z);
                    var trLArmAxisY = new Vector3(m.GetColumn(1).x, m.GetColumn(1).y, m.GetColumn(1).z);
                    var trLArmAxisZ = new Vector3(m.GetColumn(2).x, m.GetColumn(2).y, m.GetColumn(2).z);

                    var tmpArmV = -trLArmAxisX;
                    var tmpArmVForward = trLArmAxisZ;
                    var rotAngleX = 0.0f;
                    {
                        var uArmDotY = Vector3.Dot(axisY, tmpArmV);
                        var uArmDotZ = Vector3.Dot(axisZ, tmpArmV);
                        if (uArmDotY * uArmDotY + uArmDotZ * uArmDotZ > 0.0001f)
                        {
                            rotAngleX = -Mathf.Atan2(uArmDotY, uArmDotZ) * Mathf.Rad2Deg;
                        }
                    }
                    tmpArmV = Quaternion.AngleAxis(-rotAngleX, axisX) * tmpArmV;
                    tmpArmVForward = Quaternion.AngleAxis(-rotAngleX, axisX) * tmpArmVForward;

                    var rotAngleY = 0.0f;
                    {
                        var uArmDotX = Vector3.Dot(-axisX, tmpArmV);
                        var uArmDotZ = Vector3.Dot(axisZ, tmpArmV);
                        if (uArmDotX * uArmDotX + uArmDotZ * uArmDotZ > 0.0001f)
                        {
                            rotAngleY = -Mathf.Atan2(uArmDotZ, uArmDotX) * Mathf.Rad2Deg;
                        }
                    }
                    tmpArmV = Quaternion.AngleAxis(-rotAngleY, -axisY) * tmpArmV;
                    tmpArmVForward = Quaternion.AngleAxis(-rotAngleY, -axisY) * tmpArmVForward;

                    var rotAngleZ = 0.0f;
                    {
                        var uArmDotY = Vector3.Dot(axisY, tmpArmVForward);
                        var uArmDotZ = Vector3.Dot(axisZ, tmpArmVForward);
                        if (uArmDotY * uArmDotY + uArmDotZ * uArmDotZ > 0.0001f)
                        {
                            rotAngleZ = -Mathf.Atan2(uArmDotY, uArmDotZ) * Mathf.Rad2Deg;
                        }
                    }

                    Joints["LElbowYaw"].AngleDeg = +rotAngleX/* - uArmRotAngleZ*/;
                    Joints["LElbowRoll"].AngleDeg = +rotAngleY;

                    uArmRotAngleX = rotAngleZ;
                }
            }

            // 腰を反映します
            {
                var m = Matrix4x4.TRS(Vector3.zero, hipsTr.localRotation, Vector3.one);
                var vTpose = new Vector3(m.GetColumn(1).x, m.GetColumn(1).y, m.GetColumn(1).z);

                float aDeg = 0;
                float bDeg = 0;
                if (vTpose.y*vTpose.y + vTpose.x*vTpose.x > 0.0001f)
                {
                    aDeg = Mathf.Atan2(-vTpose.x, vTpose.y) * Mathf.Rad2Deg;
                    vTpose = Quaternion.AngleAxis(-aDeg, new Vector3(0, 0, 1)) * vTpose;
                }
                if (vTpose.z*vTpose.z + vTpose.y*vTpose.y > 0.0001f)
                {
                    bDeg = Mathf.Atan2(-vTpose.z, vTpose.y) * Mathf.Rad2Deg;
                }
                Joints["HipRoll"].AngleDeg = aDeg;//
                Joints["HipPitch"].AngleDeg = bDeg;//
            }
        }
    }
#endif

    #endregion

    // Use this for initialization
	void Start () 
    {
        LoadUrdf();
        createLinkAndJoint_();
        createIk_();
        //createAvatar_();
    }

    void OnGUI()
    {
        GUI.Box(new Rect(Screen.width - 260, 10, 250, 150), "Info");
#if false
        var leftUpperArmTr = avatarObjTbl_["LeftUpperArm"].transform;
        var leftLowerArmTr = avatarObjTbl_["LeftLowerArm"].transform;
        var leftHandTr = avatarObjTbl_["LeftHand"].transform;
        {
            var m = Matrix4x4.TRS(Vector3.zero, leftUpperArmTr.localRotation, Vector3.one);
            GUI.Label(new Rect(Screen.width - 245, 130, 250, 30), m.GetRow(0).ToString());
            GUI.Label(new Rect(Screen.width - 245, 150, 250, 30), m.GetRow(1).ToString());
            GUI.Label(new Rect(Screen.width - 245, 170, 250, 30), m.GetRow(2).ToString());

            GUI.Label(new Rect(Screen.width - 245, 190, 250, 30), m.GetColumn(0).ToString());
            GUI.Label(new Rect(Screen.width - 245, 210, 250, 30), m.GetColumn(1).ToString());
            GUI.Label(new Rect(Screen.width - 245, 230, 250, 30), m.GetColumn(2).ToString());
        }
#endif
    }

    public bool AngleModEnable = false;
    [Range(-180, 180)]public int AngleRUA_X = 0;
    [Range(-180, 180)]public int AngleRUA_Y = 0;
    [Range(-180, 180)]public int AngleRUA_Z = 0;
    [Range(-180, 180)]public int AngleRLA_X = 0;
    [Range(-180, 180)]public int AngleRLA_Y = 0;
    [Range(-180, 180)]public int AngleRLA_Z = 0;
    [Range(-180, 180)]public int AngleLUA_X = 0;
    [Range(-180, 180)]public int AngleLUA_Y = 0;
    [Range(-180, 180)]public int AngleLUA_Z = 0;
    [Range(-180, 180)]public int AngleLLA_X = 0;
    [Range(-180, 180)]public int AngleLLA_Y = 0;
    [Range(-180, 180)]public int AngleLLA_Z = 0;

    // Update is called once per frame
    void Update()
    {
#if false
        if(AngleModEnable)
        {
            animator_.runtimeAnimatorController = null;

            var trRUA = animator_.GetBoneTransform(HumanBodyBones.RightUpperArm);
            var trRLA = animator_.GetBoneTransform(HumanBodyBones.RightLowerArm);
            trRUA.localRotation = Quaternion.AngleAxis(AngleRUA_Z, new Vector3(0, 0, 1))
                * Quaternion.AngleAxis(AngleRUA_Y, new Vector3(0, 1, 0))
                * Quaternion.AngleAxis(AngleRUA_X, new Vector3(1, 0, 0))
                ;
            trRLA.localRotation = Quaternion.AngleAxis(AngleRLA_X, new Vector3(1, 0, 0))
                * Quaternion.AngleAxis(AngleRLA_Y, new Vector3(0, 1, 0))
                * Quaternion.AngleAxis(AngleRLA_Z, new Vector3(0, 0, 1))
                ;

            var trLUA = animator_.GetBoneTransform(HumanBodyBones.LeftUpperArm);
            var trLLA = animator_.GetBoneTransform(HumanBodyBones.LeftLowerArm);
            trLUA.localRotation = Quaternion.AngleAxis(AngleLUA_Z, new Vector3(0, 0, 1))
                * Quaternion.AngleAxis(AngleLUA_Y, new Vector3(0, 1, 0))
                * Quaternion.AngleAxis(AngleLUA_X, new Vector3(1, 0, 0))
                ;
            trLLA.localRotation = Quaternion.AngleAxis(AngleLLA_X, new Vector3(1, 0, 0))
                * Quaternion.AngleAxis(AngleLLA_Y, new Vector3(0, 1, 0))
                * Quaternion.AngleAxis(AngleLLA_Z, new Vector3(0, 0, 1))
                ;
        }
        else
        {
            if (animator_.runtimeAnimatorController == null)
            {
                animator_.runtimeAnimatorController = animController;
            }
        }

        {
            ikRHand_.solver.target = RHandTarget;
            ikLHand_.solver.target = LHandTarget;

            foreach (var joint in Joints.Values)
            {
                joint.ApplyFromTransform();
            }
        }

        //@@applyAvatorToPepper_();

        // 
        {
            var baseLink = Links["base_link"].LinkGameObject;
            var baseFootprint = Links["base_footprint"].LinkGameObject;

            var baseLinkTr = baseLink.transform;
            var baseFootprintTr = baseFootprint.transform;

            var p = baseLinkTr.position - baseFootprintTr.position;
            var r = baseLinkTr.rotation * Quaternion.Inverse(baseFootprintTr.rotation);

            baseLink.transform.position = p - BaseFootprintOffsetPos;
            baseLink.transform.rotation = r * Quaternion.Inverse(BaseFootprintOffsetRotate);
        }

        if (Input.GetButtonDown("Jump"))
        {	// スペースキーを入力したら
            {
                //ステート遷移中でなかったらジャンプできる
                if (!animator_.IsInTransition(0))
                {
                    animator_.SetBool("Rest", true);
                    //animator_.SetFloat("Speed", 0.15f);
                    //animator_.SetBool("Jump", true);
                }
            }
        }
#endif
    }
}
