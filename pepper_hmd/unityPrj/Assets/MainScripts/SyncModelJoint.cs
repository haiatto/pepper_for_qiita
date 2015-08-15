using UnityEngine;
using System.Collections;

public class SyncModelJoint : MonoBehaviour {

    public PepperModelDisp PepperModelDispRef;

	// Use this for initialization
	void Start () {
	}
	
	// Update is called once per frame
	void Update () {
        if (Main.Instance == null || Main.Instance.JointAngleTbl==null)
        {
            return;
        }
        if (PepperModelDispRef == null || PepperModelDispRef.Joints["HeadYaw"] == null)
        {
            return;
        }
        var keys = Main.Instance.JointAngleTbl.Keys;
        foreach (var pepprJointKey in keys)
        {
            var modelJointAngle = PepperModelDispRef.Joints[pepprJointKey];
            if(modelJointAngle!=null)
            {
                //modelJointAngle.AngleDeg =
                //    pepprJointKv.Value * Mathf.Rad2Deg;
                Main.Instance.TargetJointAngleTbl[pepprJointKey]
                    = modelJointAngle.AngleDeg * Mathf.Deg2Rad;
            }
        }
	}
}
