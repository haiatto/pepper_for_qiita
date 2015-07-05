using UnityEngine;
using System.Collections;

public class HandViewDisp : MonoBehaviour {


    protected HandController handController_ = null;

	// Use this for initialization
	void Start () {
        var obj = GameObject.Find("HeadMountedHandController");
        if (obj != null)
        {
            handController_ = obj.GetComponent<HandController>();
        }
	}
	
	// Update is called once per frame
	void Update () {
        if (handController_==null) return;
        /*
        Main.Instance.JointAngleTbl["LShoulderPitch"];
        Main.Instance.JointAngleTbl["LShoulderRoll"];
        Main.Instance.JointAngleTbl["LElbowYaw"];
        Main.Instance.JointAngleTbl["LElbowRoll"];
        Main.Instance.JointAngleTbl["LWristYaw"];
        Main.Instance.JointAngleTbl["LHand"];
        */
        /// LShoulderPitch, LShoulderRoll , LElbowYaw , LElbowRoll, LWristYaw , LHand     , 
        /// RShoulderPitch, RShoulderRoll , RElbowYaw , RElbowRoll, RWristYaw , RHand     , 

    }
}
