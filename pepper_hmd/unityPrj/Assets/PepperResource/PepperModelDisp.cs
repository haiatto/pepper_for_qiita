using UnityEngine;
using UnityEditor;
using System.Collections;
using System.Collections.Generic;
using System.Xml;
using System.Text.RegularExpressions;

public class PepperModelDisp : MonoBehaviour {

    public TextAsset  UrdfXmlAsset;

    public GameObject avatorDebugPointPrefab;
    public RuntimeAnimatorController animController;

    #region JointObjs,LinkObjs
    public Dictionary<string, GameObject> JointObjs = new Dictionary<string, GameObject>();
    public Dictionary<string, GameObject> LinkObjs = new Dictionary<string, GameObject>();
    #endregion

    #region JointAngles
    public class JointAngle
    {
        internal float angleRad;
        internal JointInfo jointInfo;
        internal GameObject jointObj;

        public float AngleDeg
        {
            set
            {
                var angleDeg = Mathf.Clamp(value, AngleLimitLower, AngleLimitUpper);
                angleRad = angleDeg * Mathf.Deg2Rad;
                var axis = changeCoordVector3_(jointInfo.axis);
                var q = Quaternion.AngleAxis(angleDeg, -axis);
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
    public Dictionary<string, JointAngle> JointAngles = new Dictionary<string, JointAngle>();
    #endregion

    void createLinkAndJoint_()
    {
        foreach (var linkKv in links_)
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
                }
            }

            LinkObjs[linkKv.Key] = obj;
        }
        foreach (var jointKv in joints_)
        {
            var obj = new GameObject();
            var info = jointKv.Value;

            obj.name = "joint#" + info.Name;
            obj.transform.localPosition = changeCoordVector3_(info.origin.xyz);
            obj.transform.localRotation = changeAngleQuaternion_(info.origin.rpy);

            var parentObj = LinkObjs[info.parentLink];
            var childObj = LinkObjs[info.childLink];
            if (parentObj != null)
            {
                obj.transform.SetParent(parentObj.transform, false);
            }
            if (childObj != null)
            {
                childObj.transform.SetParent(obj.transform, false);
            }

            JointObjs[jointKv.Key] = obj;
            JointAngles[jointKv.Key] = new JointAngle()
            {
                jointObj = obj,
                jointInfo = info,
                angleRad = 0
            };
        }
    }


    #region Avatar

    GameObject avatarObj_;
    Avatar     avatar_;
    Animator   animator_;

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
        var gameObjTbl = new Dictionary<string, GameObject>();
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
            gameObjTbl[gameObj.name] = gameObj;
            if (avatorJointLink.joint != null)
            {
                var tr = JointObjs[avatorJointLink.joint].transform;
                var trP = JointObjs[avatorJointLink.jointParent].transform;
                gameObj.transform.localRotation = tr.rotation * Quaternion.Inverse(trP.rotation);
                gameObj.transform.localPosition = tr.position - trP.position;
                //tr.rotation;
                //trP.rotation;
                //  親子の関係回転のｑをもとに回転のねじれ文をだして、
                //  その分逆回転させて、移動量だすかんじ？
            }
            else
            {
                //長さゼロにしたら色んな所にInfが混ざって死んだので…仕方なくオフセットしておきます
                //(まあ実際に使われない部分なので問題なし)
                gameObj.transform.localPosition = new Vector3(0, -0.01f, 0);
            }
            if (parentName != null)
            {
                gameObj.transform.SetParent(gameObjTbl[parentName].transform, false);
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
                    humanBone.limit.min = new Vector3(-9, -9, -9);
                    humanBone.limit.max = new Vector3(90, 90, 90);
                    humanBone.limit.center = new Vector3(30, 30, 30);
                    humanBone.limit.axisLength = 0;
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
        //        animator_.runtimeAnimatorController = animController;
        animator_.runtimeAnimatorController = Instantiate<RuntimeAnimatorController>(animController);
    }
    #endregion 

    // Use this for initialization
	void Start () 
    {
        LoadUrdf();
        createLinkAndJoint_();

        JointAngles["LShoulderRoll"].AngleDeg = 90;
        JointAngles["RShoulderRoll"].AngleDeg = -90;

        createAvatar_();
    }

    void OnGUI()
    {
        GUI.Box(new Rect(Screen.width - 260, 10, 250, 150), "Info");
        GUI.Label(new Rect(Screen.width - 245, 130, 250, 30), "XXX");

    }
	
	// Update is called once per frame
	void Update () {

        {

        }
        
        
        if (Input.GetButtonDown("Jump"))
        {	// スペースキーを入力したら
            {
                //ステート遷移中でなかったらジャンプできる
                if (!animator_.IsInTransition(0))
                {
                    animator_.SetBool("Rest", true);
                }
            }
        }
    }

    #region JointInfoとLinkInfo

    public class OriginInfo{
        public Vector3 rpy;
        public Vector3 xyz;
    }
    public class GeometryInfo{
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
        public class LimitInfo{
            public float effort;
            public float lower;
            public float upper;
            public float velocity;
        };
        public class MimicInfo{
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

    Dictionary<string, JointInfo> joints_ = new Dictionary<string,JointInfo>();
    Dictionary<string, LinkInfo> links_ = new Dictionary<string,LinkInfo>();

    #endregion

    static Vector3 changeCoordVector3_(Vector3 v)
    {
        return new Vector3(-v[0], v[2], -v[1]);
    }
    static Vector3 changeScaleVector3_(Vector3 v)
    {
        return new Vector3(v[0], v[2], v[1]);
    }
    static Quaternion changeAngleQuaternion_(Vector3 v)
    {
        if (v[1] != 0)
        {
            return Quaternion.Euler(0,0,0);
        }
        var q = Quaternion.Euler(
            0,//v[2] * Mathf.Rad2Deg, 
            0,//v[0] * Mathf.Rad2Deg, 
            0//v[1] * Mathf.Rad2Deg
        );
        return q;
    }

    #region LoadUrdf
    Vector3 parseAttrVector3_(string value)
    {
        var values = value.Split(new char[]{' '},System.StringSplitOptions.RemoveEmptyEntries);
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
        foreach(XmlNode joint in joints)
        {
            var info = new JointInfo();
            info.Name = joint.Attributes["name"].Value;
            info.Type = joint.Attributes["type"].Value;
            foreach(XmlNode jointSub in joint.ChildNodes)
            {
                switch(jointSub.Name){
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
                    info.limit.lower  = parseAttrFloat_(jointSub.Attributes["lower"].Value);
                    info.limit.upper  = parseAttrFloat_(jointSub.Attributes["upper"].Value);
                    info.limit.velocity = parseAttrFloat_(jointSub.Attributes["velocity"].Value);
                    break;
                case "mimic":
                    info.mimic = new JointInfo.MimicInfo();
                    info.mimic.joint = jointSub.Attributes["joint"].Value;
                    info.mimic.multiplier = parseAttrFloat_(jointSub.Attributes["multiplier"].Value);;
                    info.mimic.offset     = parseAttrFloat_(jointSub.Attributes["offset"].Value);;
                    break;
                }
            }
            joints_[info.Name] = info;
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
            links_[info.Name] = info;
        }
    }

    #endregion
}
