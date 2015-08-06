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
        if (PepperModelDispRef == null || PepperModelDispRef.JointAngles["HeadYaw"]==null)
        {
            return;
        }
        foreach(var srcJointKv in Main.Instance.JointAngleTbl)
        {
            var modelJointAngle = PepperModelDispRef.JointAngles[srcJointKv.Key];
            if(modelJointAngle!=null)
            {
                modelJointAngle.AngleDeg = srcJointKv.Value * Mathf.Rad2Deg;
            }

        }
	}
}
