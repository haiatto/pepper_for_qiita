using UnityEngine;
using UnityEditor;
using System.Collections;
using System.Collections.Generic;
using System.Xml;
using System.Text.RegularExpressions;

public class PepperModelDisp : MonoBehaviour {

    public TextAsset  UrdfXmlAsset;
    
    public GameObject RootObj;
    public Dictionary<string,GameObject> JointObjs = new Dictionary<string,GameObject>();
    public Dictionary<string,GameObject> LinkObjs = new Dictionary<string,GameObject>();

    #region 
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


	// Use this for initialization
	void Start () 
    {
        LoadUrdf();
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
                visibleObj.transform.SetParent(obj.transform,false);
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
            var childObj  = LinkObjs[info.childLink];
            if (parentObj!=null)
            {
                obj.transform.SetParent(parentObj.transform, false);
            }
            if (childObj!= null)
            {
                childObj.transform.SetParent(obj.transform, false);
            }

            JointObjs[jointKv.Key] = obj;
            JointAngles[jointKv.Key] = new JointAngle(){
                jointObj = obj,
                jointInfo = info,
                angleRad = 0
            };
        }
    }
	
	// Update is called once per frame
	void Update () {
        JointAngles["HeadYaw"].AngleDeg = 0;
        JointAngles["HeadPitch"].AngleDeg = 0;
        JointAngles["HipRoll"].AngleDeg = 0;
        JointAngles["HipPitch"].AngleDeg = 0;
        JointAngles["KneePitch"].AngleDeg = 0;

        JointAngles["LShoulderPitch"].AngleDeg = 0;
        JointAngles["LShoulderRoll"].AngleDeg = 0;
        JointAngles["LElbowYaw"].AngleDeg = 0;
        JointAngles["LElbowRoll"].AngleDeg = -88;
        JointAngles["LWristYaw"].AngleDeg = 0;
        JointAngles["LHand"].AngleDeg = 0;
        
        JointAngles["RShoulderPitch"].AngleDeg = 0;
        JointAngles["RShoulderRoll"].AngleDeg = 0;
        JointAngles["RElbowYaw"].AngleDeg = 0;
        JointAngles["RElbowRoll"].AngleDeg = 0;
        JointAngles["RWristYaw"].AngleDeg = 0;
        JointAngles["RHand"].AngleDeg = 0;
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
